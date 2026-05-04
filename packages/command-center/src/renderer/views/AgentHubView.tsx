import { useMemo, useState, type ReactNode } from "react";
import { allTasks, selectCurrentPhase, selectTaskCounts } from "../../shared/schema";
import { useCommandCenterStore } from "../store";
import { EmptyState, Icon, timeAgo } from "../components/ui";

export default function AgentHubView(): ReactNode {
  const tracker = useCommandCenterStore((state) => state.tracker);
  const fileInfo = useCommandCenterStore((state) => state.fileInfo);
  const [copied, setCopied] = useState(false);

  const contextLine = useMemo(() => {
    if (!tracker) return "";
    const counts = selectTaskCounts(tracker);
    const tasks = allTasks(tracker);
    return `WEEK ${tracker.project.current_week}, Phase: ${selectCurrentPhase(tracker) || "none"}, Progress: ${Math.round(
      tracker.project.overall_progress * 100,
    )}% (${counts.done}/${tasks.length}), Schedule: ${tracker.project.schedule_status}, Blocked: ${counts.blocked}`;
  }, [tracker]);

  if (!tracker) return null;

  const counts = selectTaskCounts(tracker);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayLogs = tracker.agent_log.filter((entry) => entry.timestamp.slice(0, 10) === todayKey);
  const agentContributions = Array.from(
    todayLogs.reduce((map, entry) => map.set(entry.agent_id, (map.get(entry.agent_id) ?? 0) + 1), new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);

  async function copyContext(): Promise<void> {
    await navigator.clipboard.writeText(contextLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="agent-hub">
      <aside className="agent-sidebar">
        <Panel title="الوكلاء المتصلون">
          {tracker.agents.length === 0 ? (
            <EmptyState title="لا يوجد وكلاء">يسجل الوكلاء أنفسهم عبر أداة register_agent.</EmptyState>
          ) : (
            <div className="agent-list">
              {tracker.agents.map((agent) => (
                <div className="agent-row" key={agent.id}>
                  <span className="agent-color" style={{ background: agent.color }} />
                  <div>
                    <strong>{agent.name}</strong>
                    <span>
                      {agent.type} · {timeAgo(agent.last_action_at)}
                    </span>
                  </div>
                  <em>{agent.session_action_count}</em>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="ملف الحالة المشترك">
          <dl className="info-list">
            <div>
              <dt>المسار</dt>
              <dd>{fileInfo?.path ?? "غير معروف"}</dd>
            </div>
            <div>
              <dt>المراقبة</dt>
              <dd>{fileInfo?.watcherActive ? "نشطة" : "غير نشطة"}</dd>
            </div>
            <div>
              <dt>المحطات</dt>
              <dd>{tracker.milestones.length}</dd>
            </div>
            <div>
              <dt>السجل</dt>
              <dd>{tracker.agent_log.length}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="حقن السياق">
          <p className="context-preview">{contextLine}</p>
          <button className="secondary-button" onClick={copyContext}>
            {Icon({ name: copied ? "check" : "copy", size: 16 })}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
        </Panel>

        <Panel title="ملخص اليوم">
          <div className="summary-grid">
            <Stat label="منجز" value={counts.done} />
            <Stat label="قيد التنفيذ" value={counts.in_progress} />
            <Stat label="متوقف" value={counts.blocked} />
          </div>
          <div className="contributions">
            {agentContributions.length === 0 ? <span>لا توجد مساهمات اليوم.</span> : null}
            {agentContributions.map(([agentId, count]) => (
              <span key={agentId}>
                {agentId}: {count}
              </span>
            ))}
          </div>
        </Panel>
      </aside>

      <main className="activity-panel">
        <div className="view-header">
          <div>
            <h1>مركز الوكلاء</h1>
            <p>نشاط الوكلاء، ملف الحالة، وسياق التشغيل المشترك.</p>
          </div>
        </div>

        <section className="activity-feed">
          <h2>سجل النشاط</h2>
          {tracker.agent_log.length === 0 ? <EmptyState title="لا يوجد نشاط مسجل" /> : null}
          {tracker.agent_log
            .slice()
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, 60)
            .map((entry) => (
              <article className="feed-entry" key={entry.id}>
                <span className="feed-dot" />
                <div>
                  <strong>
                    {entry.agent_id} · {entry.action}
                  </strong>
                  <p>{entry.description}</p>
                  <small>
                    {entry.target_type}:{entry.target_id} · {new Date(entry.timestamp).toLocaleString("ar-EG")}
                  </small>
                </div>
                <div className="tag-row">
                  {entry.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
        </section>

        <section className="performance-strip">
          <h2>أداء هذا الأسبوع</h2>
          <div>
            {tracker.agents.map((agent) => {
              const actionCount = tracker.agent_log.filter((entry) => entry.agent_id === agent.id).length;
              return (
                <article key={agent.id}>
                  <span className="agent-color" style={{ background: agent.color }} />
                  <strong>{agent.name}</strong>
                  <em>{actionCount} إجراء</em>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="side-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }): ReactNode {
  return (
    <div className="stat-box">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
