import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  getDomainColor,
  getTotalWeeks,
  getWeekStartDate,
  selectCurrentWeekFractional,
  selectMilestoneProgress,
  toDateOnly,
  type Milestone,
  type TaskStatus,
} from "../../shared/schema";
import { updateMilestoneDatesFromUi, transitionTaskFromUi } from "../mutations";
import { useCommandCenterStore } from "../store";
import { EmptyState, Icon, ProgressRing, StatusPill } from "../components/ui";

const WEEK_W = 104;
const LANE_H = 164;

function nextAction(status: TaskStatus): { label: string; status: TaskStatus } | null {
  if (status === "todo") return { label: "بدء", status: "in_progress" };
  if (status === "in_progress") return { label: "إرسال للمراجعة", status: "review" };
  if (status === "review") return { label: "اعتماد", status: "done" };
  if (status === "blocked") return { label: "إلغاء الإيقاف", status: "todo" };
  return null;
}

export default function SwimLaneView(): ReactNode {
  const tracker = useCommandCenterStore((state) => state.tracker);
  const updateTracker = useCommandCenterStore((state) => state.updateTracker);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const selectedMilestone = tracker?.milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? null;

  const domains = useMemo(() => {
    if (!tracker) return [];
    return Array.from(new Set(tracker.milestones.map((milestone) => milestone.domain)));
  }, [tracker]);

  if (!tracker) return null;

  const totalWeeks = getTotalWeeks(tracker);
  const canvasWidth = totalWeeks * WEEK_W;
  const nowX = (selectCurrentWeekFractional(tracker) - 1) * WEEK_W;

  return (
    <section className="view-shell">
      <div className="view-header">
        <div>
          <h1>المسار الزمني</h1>
          <p>تخطيط المراحل والمحطات الرئيسية مع مؤشر الأسبوع الحالي والانحراف.</p>
        </div>
        <span className="meta-chip">Revision {tracker._meta.revision}</span>
      </div>

      <div className="timeline-wrap">
        <aside className="timeline-labels" style={{ paddingTop: 64 }}>
          {domains.length === 0 ? <div className="lane-label muted">لا توجد مجالات</div> : null}
          {domains.map((domain) => (
            <div className="lane-label" key={domain} style={{ height: LANE_H }}>
              <span className="domain-dot" style={{ background: getDomainColor(tracker, domain) }} />
              <strong>{domain}</strong>
            </div>
          ))}
        </aside>

        <div className="timeline-scroll">
          <div className="timeline-canvas" style={{ width: canvasWidth }}>
            <div className="week-header">
              {Array.from({ length: totalWeeks }, (_, index) => {
                const week = index + 1;
                return (
                  <div className="week-cell" key={week} style={{ width: WEEK_W }}>
                    <strong>W{week}</strong>
                    <span>{toDateOnly(getWeekStartDate(tracker, week)).slice(5)}</span>
                  </div>
                );
              })}
            </div>

            {tracker.schedule.phases.map((phase) => (
              <div
                className="phase-band"
                key={phase.id}
                style={{
                  left: (phase.start_week - 1) * WEEK_W,
                  width: (phase.end_week - phase.start_week + 1) * WEEK_W,
                  top: 62,
                  height: Math.max(1, domains.length) * LANE_H,
                }}
              >
                <span>{phase.title}</span>
              </div>
            ))}

            <div className="now-marker" style={{ left: nowX }}>
              <span>NOW</span>
            </div>

            {domains.length === 0 ? (
              <div className="timeline-empty" style={{ top: 120, width: canvasWidth }}>
                <EmptyState title="ستظهر المحطات بعد الترطيب">
                  أضف manifesto وroadmap لاحقا ليتم إنشاء المجالات والمراحل والمهام.
                </EmptyState>
              </div>
            ) : null}

            {domains.map((domain, laneIndex) => {
              const milestones = tracker.milestones.filter((milestone) => milestone.domain === domain);
              return (
                <div
                  className="timeline-lane"
                  key={domain}
                  style={{ top: 64 + laneIndex * LANE_H, width: canvasWidth, height: LANE_H }}
                >
                  {milestones.map((milestone, index) => {
                    const progress = selectMilestoneProgress(milestone);
                    const color = getDomainColor(tracker, milestone.domain);
                    return (
                      <button
                        className={`milestone-node ${milestone.is_key_milestone ? "key" : ""}`}
                        key={milestone.id}
                        style={{
                          left: (milestone.week - 1) * WEEK_W + 28,
                          top: 44 + (index % 2) * 46,
                        }}
                        onClick={() => setSelectedMilestoneId(milestone.id)}
                      >
                        <ProgressRing done={progress.done} total={progress.total} color={color} size={44} />
                        <span>{milestone.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedMilestone ? (
        <MilestonePanel
          milestone={selectedMilestone}
          onClose={() => setSelectedMilestoneId(null)}
          onSaveDates={(plannedStart, plannedEnd) =>
            updateTracker((state) =>
              updateMilestoneDatesFromUi(state, selectedMilestone.id, {
                planned_start: plannedStart,
                planned_end: plannedEnd,
              }),
            )
          }
          onTaskAction={(taskId, status) =>
            updateTracker((state) => {
              transitionTaskFromUi(state, taskId, status);
            })
          }
        />
      ) : null}
    </section>
  );
}

function MilestonePanel({
  milestone,
  onClose,
  onSaveDates,
  onTaskAction,
}: {
  milestone: Milestone;
  onClose: () => void;
  onSaveDates: (plannedStart: string | null, plannedEnd: string | null) => void;
  onTaskAction: (taskId: string, status: TaskStatus) => void;
}): ReactNode {
  const progress = selectMilestoneProgress(milestone);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const plannedStart = String(form.get("planned_start") ?? "").trim() || null;
    const plannedEnd = String(form.get("planned_end") ?? "").trim() || null;
    onSaveDates(plannedStart, plannedEnd);
  }

  return (
    <aside className="detail-panel">
      <div className="panel-header">
        <div>
          <span className="meta-chip">{milestone.domain}</span>
          <h2>{milestone.title}</h2>
          <p>{milestone.notes[0] ?? "لا توجد ملاحظات لهذه المحطة بعد."}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="إغلاق">
          {Icon({ name: "close" })}
        </button>
      </div>

      <div className="panel-progress">
        <ProgressRing done={progress.done} total={progress.total} size={52} />
        <div>
          <strong>{progress.pct}%</strong>
          <span>
            {progress.done}/{progress.total} مهام
          </span>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <label>
          بداية مخططة
          <input name="planned_start" type="date" defaultValue={milestone.planned_start ?? ""} />
        </label>
        <label>
          نهاية مخططة
          <input name="planned_end" type="date" defaultValue={milestone.planned_end ?? ""} />
        </label>
        <label>
          بداية فعلية
          <input type="text" value={milestone.actual_start ?? "غير محدد"} readOnly />
        </label>
        <label>
          نهاية فعلية
          <input type="text" value={milestone.actual_end ?? "غير محدد"} readOnly />
        </label>
        <button className="primary-button" type="submit">
          حفظ التواريخ
        </button>
      </form>

      <div className="panel-section">
        <h3>المهام</h3>
        <div className="task-list">
          {milestone.subtasks.length === 0 ? (
            <EmptyState title="لا توجد مهام">ستظهر المهام بعد ترطيب خارطة الطريق.</EmptyState>
          ) : null}
          {milestone.subtasks.map((task) => {
            const action = nextAction(task.status);
            return (
              <div className="task-row" key={task.id}>
                <div>
                  <strong>{task.label}</strong>
                  <span>{task.id}</span>
                </div>
                <StatusPill status={task.status} />
                {action ? (
                  <button className="secondary-button" onClick={() => onTaskAction(task.id, action.status)}>
                    {action.label}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
