const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹42,000 (Indian digit grouping: ₹1,20,000) */
export function inr(amount: number): string {
  return `₹${inrFormatter.format(Math.round(amount))}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** 0 → "ground floor", 3 → "3rd floor" */
export function formatFloor(floor: number): string {
  return floor === 0 ? "ground floor" : `${ordinal(floor)} floor`;
}
