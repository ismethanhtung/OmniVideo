import {
  getStatusTone,
  normalizeStatusLabel,
  STATUS_TONE_CLASSES,
} from "./status-badge-style";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const tone = getStatusTone(status);
  const classes = STATUS_TONE_CLASSES[tone];

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${classes} ${className}`.trim()}
    >
      {normalizeStatusLabel(status)}
    </span>
  );
}
