"use client";

import { LocalizedInlineError } from "@/components/i18n/localized-inline-error";

export default function SupervisorAttendanceError() {
  return <LocalizedInlineError messageKey="attendanceRecords" />;
}
