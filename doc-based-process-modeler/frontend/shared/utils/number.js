export function formatNumber(value) {
  if (value == null || isNaN(value)) return "";
  return Number(value).toLocaleString("en-US");
}
