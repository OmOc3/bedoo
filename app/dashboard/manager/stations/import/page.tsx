import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { StationImportForm } from "@/components/stations/station-import-form";
import { requireRole } from "@/lib/auth/server-session";
import { listAppUsers, listClientAnalysisDocumentsForAdmin } from "@/lib/db/repositories";

interface StationImportPageProps {
  searchParams: Promise<{
    clientUid?: string;
  }>;
}

export const metadata: Metadata = {
  title: "استيراد محطات العملاء",
};

export default async function StationImportPage({ searchParams }: StationImportPageProps) {
  await requireRole(["manager"]);
  const params = await searchParams;
  const users = await listAppUsers();
  const clients = users
    .filter((user) => user.role === "client")
    .map((client) => ({
      displayName: client.displayName,
      uid: client.uid,
    }));
  const documentsByClient = await Promise.all(
    clients.map(async (client) => {
      const documents = await listClientAnalysisDocumentsForAdmin(client.uid);
      return documents.map((document) => ({
        clientUid: document.clientUid,
        documentCategory: document.documentCategory,
        documentId: document.documentId,
        fileName: document.fileName,
        title: document.title,
      }));
    }),
  );
  const documents = documentsByClient.flat();

  return (
    <DashboardShell contentClassName="max-w-6xl" role="manager">
      <PageHeader
        backHref="/dashboard/manager/stations"
        description="استورد محطات العملاء من CSV بعد مراجعة الخرائط والمستندات. الصفوف غير المعتمدة ميدانيًا تدخل غير نشطة."
        title="استيراد محطات العملاء"
      />

      {clients.length === 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-6 text-[var(--muted)] shadow-card">
          أنشئ حساب عميل أولًا من صفحة العملاء ثم ارجع لاستيراد محطاته.
        </section>
      ) : (
        <StationImportForm clients={clients} documents={documents} initialClientUid={params.clientUid} />
      )}
    </DashboardShell>
  );
}
