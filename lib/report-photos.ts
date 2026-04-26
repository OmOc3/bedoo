import "server-only";

import type { ReportPhotoPaths } from "@/types";

export interface ReportPhotoUrls {
  after?: string;
  before?: string;
}

export async function getSignedReportPhotoUrls(_photoPaths?: ReportPhotoPaths): Promise<ReportPhotoUrls> {
  return {};
}
