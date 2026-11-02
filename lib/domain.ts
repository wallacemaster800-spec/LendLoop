export const categories = [
  "Power tools",
  "Garden",
  "Kitchen",
  "Camping",
  "Hand tools",
  "Other",
] as const;
export const conditions = ["Like new", "Good", "Well used"] as const;
export type Category = (typeof categories)[number];
export type Condition = (typeof conditions)[number];
export type LoanStatus = "pending" | "approved" | "declined" | "cancelled" | "returned";
export const day = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export function validDay(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateDates(start: string, end: string, today = day()) {
  if (!validDay(start) || !validDay(end)) throw new Error("Choose valid dates.");
  if (start < today) throw new Error("The start date cannot be in the past.");
  if (end < start) throw new Error("Return date must be on or after the start date.");
  if (Date.parse(end) - Date.parse(start) > 30 * 86400000)
    throw new Error("Loans can last up to 31 days.");
  if (Date.parse(start) - Date.parse(today) > 180 * 86400000)
    throw new Error("Book within the next six months.");
}
export const overlaps = (a: string, b: string, c: string, d: string) => a <= d && c <= b;
export function cleanText(value: string, label: string, min: number, max: number) {
  const text = value.trim();
  if (text.length < min || text.length > max || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text))
    throw new Error(label + " must contain " + min + "–" + max + " readable characters.");
  return text;
}
