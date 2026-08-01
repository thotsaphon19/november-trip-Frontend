// Default used only if the admin hasn't set one in Settings > แจ้งเตือน yet
// (matches the backend's AppSettings.contractWarningDays @default(7)).
export const DEFAULT_CONTRACT_WARNING_DAYS = 7;

// Returns null when there's nothing to flag, otherwise
// { level: "expired" | "warning", daysLeft, text } for a banner/badge.
// level "expired" (red) = contractEnd is today or already passed;
// level "warning" (amber) = within the next `warningDays` days.
export function contractAlert(hotel, warningDays = DEFAULT_CONTRACT_WARNING_DAYS) {
  if (!hotel?.contractEnd) return null;
  const end = new Date(hotel.contractEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((end - today) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return daysLeft === 0
      ? { level: "expired", daysLeft, text: "สัญญาหมดอายุวันนี้" }
      : { level: "expired", daysLeft, text: `สัญญาหมดอายุแล้ว (${Math.abs(daysLeft)} วันก่อน)` };
  }
  if (daysLeft <= warningDays) {
    return { level: "warning", daysLeft, text: `ใกล้หมดอายุสัญญา — เหลืออีก ${daysLeft} วัน` };
  }
  return null;
}
