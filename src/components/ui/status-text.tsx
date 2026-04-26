import {
  getStatusTone,
  normalizeStatusLabel,
  STATUS_TONE_TEXT_CLASSES,
} from "@/lib/ui/status-tone";

type StatusTextProps = {
  status: string;
  className?: string;
};

export function StatusText({ status, className = "" }: StatusTextProps) {
  const tone = getStatusTone(status);
  const toneClass = STATUS_TONE_TEXT_CLASSES[tone];

  return (
    <span className={`${toneClass} ${className}`.trim()}>
      {normalizeStatusLabel(status)}
    </span>
  );
}
