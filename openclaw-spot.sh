#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# OpenClaw on AWS EC2 Spot + separate EBS volume
# One-file launcher. Run from your local terminal with AWS CLI configured.
# =========================================================

# ====== CONFIG ======
REGION="ap-southeast-1"
AZ="ap-southeast-1a"

INSTANCE_TYPE="t4g.small"   # ARM64. If unlocked, you can use r7g.medium.
KEY_NAME="openclaw-key"
SG_NAME="openclaw-sg"
VOLUME_NAME="openclaw-data"
VOLUME_SIZE_GB="30"

OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
OPENCLAW_PORT="18789"

ROOT_VOLUME_SIZE_GB="20"
# ====================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    exit 1
  fi
}

require_cmd aws
require_cmd curl

aws configure set region "$REGION"

MY_IP="$(curl -fsS https://checkip.amazonaws.com | tr -d '\n')/32"

log "Using region: $REGION"
log "Using AZ: $AZ"
log "Your IP: $MY_IP"

log "Checking AWS identity..."
aws sts get-caller-identity >/dev/null

log "Finding default VPC..."
VPC_ID="$(aws ec2 describe-vpcs \
  --region "$REGION" \
  --filters Name=is-default,Values=true \
  --query 'Vpcs[0].VpcId' \
  --output text)"

if [[ "$VPC_ID" == "None" || -z "$VPC_ID" ]]; then
  echo "No default VPC found in $REGION."
  exit 1
fi
log "VPC: $VPC_ID"

log "Finding subnet in $AZ..."
SUBNET_ID="$(aws ec2 describe-subnets \
  --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=availability-zone,Values=$AZ" \
  --query 'Subnets[0].SubnetId' \
  --output text)"

if [[ "$SUBNET_ID" == "None" || -z "$SUBNET_ID" ]]; then
  echo "No subnet found in $AZ. Try another AZ, for example ap-southeast-1b."
  exit 1
fi
log "Subnet: $SUBNET_ID"

log "Creating key pair if needed..."
if ! aws ec2 describe-key-pairs --region "$REGION" --key-names "$KEY_NAME" >/dev/null 2>&1; then
  aws ec2 create-key-pair \
    --region "$REGION" \
    --key-name "$KEY_NAME" \
    --query 'KeyMaterial' \
    --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  log "Created local key file: ${KEY_NAME}.pem"
else
  log "Key pair already exists in AWS: $KEY_NAME"
  if [[ ! -f "${KEY_NAME}.pem" ]]; then
    log "WARNING: ${KEY_NAME}.pem is not in this folder. SSH will fail unless you still have the original pem file."
  fi
fi

log "Creating/reusing security group..."
SG_ID="$(aws ec2 describe-security-groups \
  --region "$REGION" \
  --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || true)"

if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  SG_ID="$(aws ec2 create-security-group \
    --region "$REGION" \
    --group-name "$SG_NAME" \
    --description "OpenClaw security group" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' \
    --output text)"
  log "Created security group: $SG_ID"
else
  log "Security group: $SG_ID"
fi

log "Ensuring inbound rules for SSH and OpenClaw only from your IP..."
aws ec2 authorize-security-group-ingress \
  --region "$REGION" \
  --group-id "$SG_ID" \
  --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$MY_IP,Description=SSH from current IP}]" \
  >/dev/null 2>&1 || true

aws ec2 authorize-security-group-ingress \
  --region "$REGION" \
  --group-id "$SG_ID" \
  --ip-permissions "IpProtocol=tcp,FromPort=$OPENCLAW_PORT,ToPort=$OPENCLAW_PORT,IpRanges=[{CidrIp=$MY_IP,Description=OpenClaw from current IP}]" \
  >/dev/null 2>&1 || true

log "Finding existing available EBS data volume..."
VOLUME_ID="$(aws ec2 describe-volumes \
  --region "$REGION" \
  --filters \
    "Name=tag:Name,Values=$VOLUME_NAME" \
    "Name=availability-zone,Values=$AZ" \
    "Name=status,Values=available" \
  --query 'sort_by(Volumes, &CreateTime)[-1].VolumeId' \
  --output text 2>/dev/null || true)"

if [[ "$VOLUME_ID" == "None" || -z "$VOLUME_ID" ]]; then
  log "Creating new EBS data volume: ${VOLUME_SIZE_GB}GB gp3..."
  VOLUME_ID="$(aws ec2 create-volume \
    --region "$REGION" \
    --availability-zone "$AZ" \
    --size "$VOLUME_SIZE_GB" \
    --volume-type gp3 \
    --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=$VOLUME_NAME},{Key=Project,Value=openclaw}]" \
    --query 'VolumeId' \
    --output text)"
  aws ec2 wait volume-available --region "$REGION" --volume-ids "$VOLUME_ID"
else
  log "Reusing available EBS data volume: $VOLUME_ID"
fi

log "Finding latest Ubuntu 24.04 ARM64 AMI..."
AMI_ID="$(aws ec2 describe-images \
  --region "$REGION" \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*" \
    "Name=architecture,Values=arm64" \
    "Name=virtualization-type,Values=hvm" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)"

if [[ "$AMI_ID" == "None" || -z "$AMI_ID" ]]; then
  echo "Could not find Ubuntu ARM64 AMI."
  exit 1
fi
log "AMI: $AMI_ID"

USER_DATA_FILE="$(mktemp)"
cat > "$USER_DATA_FILE" <<EOF_USERDATA
#!/bin/bash
set -euxo pipefail

OPENCLAW_IMAGE="$OPENCLAW_IMAGE"
OPENCLAW_PORT="$OPENCLAW_PORT"

exec > >(tee -a /var/log/openclaw-user-data.log) 2>&1

echo "Waiting for apt lock..."
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 3; done

apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release util-linux

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu || true

echo "Waiting for attached EBS data device..."
DEVICE=""
for i in {1..60}; do
  for d in /dev/nvme1n1 /dev/xvdf /dev/sdf; do
    if [ -b "\$d" ]; then
      DEVICE="\$d"
      break
    fi
  done
  if [ -n "\$DEVICE" ]; then
    break
  fi
  sleep 5
done

if [ -z "\$DEVICE" ]; then
  echo "ERROR: No data volume device found after waiting."
  lsblk
  exit 1
fi

echo "Using data device: \$DEVICE"

if ! blkid "\$DEVICE" >/dev/null 2>&1; then
  mkfs.ext4 -F "\$DEVICE"
fi

mkdir -p /data
mount "\$DEVICE" /data || true

if ! grep -q " /data " /etc/fstab; then
  UUID=\$(blkid -s UUID -o value "\$DEVICE")
  echo "UUID=\$UUID /data ext4 defaults,nofail 0 2" >> /etc/fstab
fi

mkdir -p /data/openclaw/data
chown -R ubuntu:ubuntu /data/openclaw
cd /data/openclaw

cat > docker-compose.yml <<COMPOSE
services:
  openclaw:
    image: \$OPENCLAW_IMAGE
    container_name: openclaw
    restart: unless-stopped
    command: ["openclaw", "gateway", "--bind", "lan", "--port", "\$OPENCLAW_PORT", "--allow-unconfigured"]
    ports:
      - "\$OPENCLAW_PORT:\$OPENCLAW_PORT"
    volumes:
      - ./data:/home/node/.openclaw
COMPOSE

chown -R ubuntu:ubuntu /data/openclaw

docker compose pull || true
docker compose down || true
docker compose up -d

echo "OpenClaw setup finished."
docker ps -a
EOF_USERDATA

log "Launching EC2 Spot instance..."
INSTANCE_ID="$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --subnet-id "$SUBNET_ID" \
  --associate-public-ip-address \
  --instance-market-options 'MarketType=spot,SpotOptions={SpotInstanceType=one-time,InstanceInterruptionBehavior=terminate}' \
  --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":$ROOT_VOLUME_SIZE_GB,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
  --user-data "file://$USER_DATA_FILE" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=openclaw-spot},{Key=Project,Value=openclaw}]" \
  --query 'Instances[0].InstanceId' \
  --output text)"

rm -f "$USER_DATA_FILE"

log "Instance: $INSTANCE_ID"
log "Waiting for instance to enter running state..."
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

log "Attaching EBS data volume from outside the instance..."
aws ec2 attach-volume \
  --region "$REGION" \
  --volume-id "$VOLUME_ID" \
  --instance-id "$INSTANCE_ID" \
  --device /dev/sdf >/dev/null

aws ec2 wait volume-in-use --region "$REGION" --volume-ids "$VOLUME_ID"

log "Waiting for public IP..."
sleep 10
PUBLIC_IP="$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)"

cat <<EOF_DONE

DONE
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Data volume: $VOLUME_ID

SSH:
ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP

OpenClaw:
http://$PUBLIC_IP:$OPENCLAW_PORT

Useful checks after SSH:
sudo cloud-init status --wait
sudo tail -n 200 /var/log/openclaw-user-data.log
docker ps -a
docker logs openclaw --tail=100
lsblk
df -h
EOF_DONE
