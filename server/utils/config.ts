/** Parse MAX_FILE_SIZE ("10mb", "5MB", or raw bytes). Default 10MB. */
export function maxFileSizeBytes(): number {
  const raw = (process.env.MAX_FILE_SIZE || "").trim().toLowerCase();
  if (!raw) return 10 * 1024 * 1024;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(mb|kb|b)?$/);
  if (!match) return 10 * 1024 * 1024;
  const value = parseFloat(match[1]);
  const unit = match[2] || "b";
  const multiplier = unit === "mb" ? 1024 * 1024 : unit === "kb" ? 1024 : 1;
  return Math.round(value * multiplier);
}
