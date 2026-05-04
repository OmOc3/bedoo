"use client";

import { LocalizedInlineError } from "@/components/i18n/localized-inline-error";

export default function ManagerAttendanceError() {
  return <LocalizedInlineError messageKey="attendanceRecords" />;
}
