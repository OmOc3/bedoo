import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/server-session";
import { REPORTS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { getSignedReportPhotoUrls } from "@/lib/report-photos";
import type { Report } from "@/types";

interface ReportPhotosRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: ReportPhotosRouteProps,
): Promise<NextResponse> {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ message: "يلزم تسجيل الدخول.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { id } = await params;
  const snapshot = await adminDb().collection(REPORTS_COL).doc(id).get();

  if (!snapshot.exists) {
    return NextResponse.json({ message: "التقرير غير موجود.", code: "REPORT_NOT_FOUND" }, { status: 404 });
  }

  const report = snapshot.data() as Partial<Report>;
  const canAccess =
    session.role === "manager" || session.role === "supervisor" || report.technicianUid === session.uid;

  if (!canAccess) {
    return NextResponse.json({ message: "غير مصرح بالوصول للصور.", code: "REPORT_FORBIDDEN" }, { status: 403 });
  }

  const photos = await getSignedReportPhotoUrls(report.photoPaths);

  return NextResponse.json({ photos });
}
