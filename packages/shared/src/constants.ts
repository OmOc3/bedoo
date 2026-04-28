export const userRoles = ["technician", "supervisor", "manager"] as const;
export type SharedUserRole = (typeof userRoles)[number];

export const reportStatusOptions = [
  "station_ok",
  "station_replaced",
  "bait_changed",
  "bait_ok",
  "station_excluded",
  "station_substituted",
] as const;
export type SharedStatusOption = (typeof reportStatusOptions)[number];

export const reviewStatuses = ["pending", "reviewed", "rejected"] as const;
export type SharedReviewStatus = (typeof reviewStatuses)[number];

export interface StatusOptionEntry {
  labelArabic: string;
  labelEnglish: string;
  value: SharedStatusOption;
}

export const statusOptionLabels: Record<SharedStatusOption, string> = {
  station_ok: "المحطة سليمة",
  station_replaced: "تم تغيير المحطة",
  bait_changed: "تم تغيير الطعم",
  bait_ok: "الطعم سليم",
  station_excluded: "استبعاد المحطة",
  station_substituted: "استبدال المحطة",
};

export const statusOptionLabelsEnglish: Record<SharedStatusOption, string> = {
  station_ok: "Station is clear",
  station_replaced: "Station was changed",
  bait_changed: "Bait was changed",
  bait_ok: "Bait is clear",
  station_excluded: "Station excluded",
  station_substituted: "Station substituted",
};

export const statusOptionEntries: readonly StatusOptionEntry[] = reportStatusOptions.map((value) => ({
  labelArabic: statusOptionLabels[value],
  labelEnglish: statusOptionLabelsEnglish[value],
  value,
}));

export const roleLabels: Record<SharedUserRole, string> = {
  technician: "فني",
  supervisor: "مشرف",
  manager: "مدير",
};

export const roleLabelsEnglish: Record<SharedUserRole, string> = {
  technician: "Technician",
  supervisor: "Supervisor",
  manager: "Manager",
};
