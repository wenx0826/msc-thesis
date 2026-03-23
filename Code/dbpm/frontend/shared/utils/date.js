export function formatDateTimeToSeconds(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  // Keep a fixed-width YYYY-MM-DD HH:mm:ss shape for readable output.
  return date.toISOString().slice(0, 19).replace("T", " ");
}
