export function formatFullDateTime(value) {
  if (value === null || value === undefined || value === "") return "Time unavailable";
  const raw = String(value).trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
