/**
 * "21 Sep 2026".
 *
 * Not Intl: en-GB's short month for September is "Sept", the only four-letter
 * abbreviation of the twelve, and it is exactly long enough to push the
 * masthead onto a second line on a phone. Three letters, every month.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
