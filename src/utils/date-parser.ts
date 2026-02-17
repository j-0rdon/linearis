/**
 * Parse a relative duration string into an ISO 8601 date string.
 *
 * Supports: d (days), w (weeks), m (months), y (years)
 * Examples: "3d" → 3 days ago, "1w" → 7 days ago, "2m" → 2 months ago
 *
 * @param since - Duration string (e.g. "3d", "1w", "2m")
 * @returns ISO 8601 date string
 */
export function parseSince(since: string): string {
  const match = since.match(/^(\d+)([dwmy])$/);
  if (!match) {
    throw new Error(
      `Invalid --since format "${since}". Use a number followed by d (days), w (weeks), m (months), or y (years). Examples: 3d, 1w, 2m`,
    );
  }

  const amount = parseInt(match[1]);
  const unit = match[2];
  const date = new Date();

  switch (unit) {
    case "d":
      date.setDate(date.getDate() - amount);
      break;
    case "w":
      date.setDate(date.getDate() - amount * 7);
      break;
    case "m":
      date.setMonth(date.getMonth() - amount);
      break;
    case "y":
      date.setFullYear(date.getFullYear() - amount);
      break;
  }

  return date.toISOString();
}
