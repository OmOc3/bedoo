export const StatusOptions = [
  { label: 'المحطة سليمة', value: 'station_ok' },
  { label: 'تم تغيير المحطة', value: 'station_replaced' },
  { label: 'تم تغيير الطعم', value: 'bait_changed' },
  { label: 'الطعم سليم', value: 'bait_ok' },
  { label: 'استبعاد المحطة', value: 'station_excluded' },
  { label: 'استبدال المحطة', value: 'station_substituted' },
] as const;
