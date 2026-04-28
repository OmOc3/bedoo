// Synced status option labels shared by mobile and web-facing contracts.
import type { StatusOption } from '@/lib/sync/types';

export interface StatusOptionEntry {
  labelArabic: string;
  labelEnglish: string;
  value: StatusOption;
}

export const statusOptionLabels: Record<StatusOption, string> = {
  station_ok: 'المحطة سليمة',
  station_replaced: 'تم تغيير المحطة',
  bait_changed: 'تم تغيير الطعم',
  bait_ok: 'الطعم سليم',
  station_excluded: 'استبعاد المحطة',
  station_substituted: 'استبدال المحطة',
};

export const statusOptionLabelsEnglish: Record<StatusOption, string> = {
  station_ok: 'Station is clear',
  station_replaced: 'Station was changed',
  bait_changed: 'Bait was changed',
  bait_ok: 'Bait is clear',
  station_excluded: 'Station excluded',
  station_substituted: 'Station substituted',
};

export const StatusOptions: readonly StatusOptionEntry[] = [
  { labelArabic: statusOptionLabels.station_ok, labelEnglish: statusOptionLabelsEnglish.station_ok, value: 'station_ok' },
  { labelArabic: statusOptionLabels.station_replaced, labelEnglish: statusOptionLabelsEnglish.station_replaced, value: 'station_replaced' },
  { labelArabic: statusOptionLabels.bait_changed, labelEnglish: statusOptionLabelsEnglish.bait_changed, value: 'bait_changed' },
  { labelArabic: statusOptionLabels.bait_ok, labelEnglish: statusOptionLabelsEnglish.bait_ok, value: 'bait_ok' },
  { labelArabic: statusOptionLabels.station_excluded, labelEnglish: statusOptionLabelsEnglish.station_excluded, value: 'station_excluded' },
  { labelArabic: statusOptionLabels.station_substituted, labelEnglish: statusOptionLabelsEnglish.station_substituted, value: 'station_substituted' },
] as const;
