import { getCurrentSession } from "@/lib/auth/server-session";
import { getPendingReviewNotificationSnapshot } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PendingReportNotificationPayload {
  latestReport?: {
    reportId: string;
    stationLabel: string;
    submittedAt: string;
    technicianName: string;
  };
  pendingCount: number;
}

function streamEvent(eventName: string, payload: PendingReportNotificationPayload): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
}

async function notificationPayload(): Promise<PendingReportNotificationPayload> {
  const snapshot = await getPendingReviewNotificationSnapshot();

  return {
    pendingCount: snapshot.pendingCount,
    latestReport: snapshot.latestReport
      ? {
          reportId: snapshot.latestReport.reportId,
          stationLabel: snapshot.latestReport.stationLabel,
          submittedAt: snapshot.latestReport.submittedAt.toISOString(),
          technicianName: snapshot.latestReport.technicianName,
        }
      : undefined,
  };
}

export async function GET(request: Request): Promise<Response> {
  const session = await getCurrentSession();

  if (!session || (session.role !== "manager" && session.role !== "supervisor")) {
    return Response.json({ code: "AUTH_REQUIRED", message: "يلزم تسجيل الدخول." }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false;

      async function sendSnapshot(): Promise<void> {
        if (isClosed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(streamEvent("pending-report", await notificationPayload())));
        } catch {
          isClosed = true;
        }
      }

      controller.enqueue(encoder.encode(": connected\n\n"));
      void sendSnapshot();

      const timer = setInterval(() => {
        void sendSnapshot();
      }, 5_000);

      request.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(timer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
