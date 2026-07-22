// Shared with the backend's `daysOfWeek` numbering on HolidaySeasonPrice:
// JS Date.getDay() order, 0=Sun..6=Sat. An empty array means "every day".
export const DOW_LABELS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// Short label for a season price row - "" (nothing extra) when it applies
// every day, otherwise the selected day abbreviations in week order
// (e.g. "ศ, ส" for a Friday/Saturday-only rate).
export function daysOfWeekLabel(daysOfWeek) {
  if (!daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.length === 7) return "";
  return [...daysOfWeek]
    .sort((a, b) => a - b)
    .map((d) => DOW_LABELS_TH[d])
    .join(", ");
}
