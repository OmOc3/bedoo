import { useEffect, useMemo, useState, type ReactNode } from "react";
import { allTasks, selectCurrentPhase, selectTaskCounts } from "../shared/schema";
import { Icon, SchedulePill } from "./components/ui";
import { useCommandCenterStore, type TabId } from "./store";
import AgentHubView from "./views/AgentHubView";
import CalendarView from "./views/CalendarView";
import SwimLaneView from "./views/SwimLaneView";
import TaskBoardView from "./views/TaskBoardView";
import logoUrl from "./assets/logo.png";

const tabs: { id: TabId; label: string; icon: "timeline" | "board" | "agent" | "calendar" }[] = [
  { id: "swim-lane", label: "المسار", icon: "timeline" },
  { id: "task-board", label: "المهام", icon: "board" },
  { id: "agent-hub", label: "الوكلاء", icon: "agent" },
  { id: "calendar", label: "التقويم", icon: "calendar" },
];

export default function App(): ReactNode {
  const tracker = useCommandCenterStore((state) => state.tracker);
  const loading = useCommandCenterStore((state) => state.loading);
  const error = useCommandCenterStore((state) => state.error);
  const synced = useCommandCenterStore((state) => state.synced);
  const activeTab = useCommandCenterStore((state) => state.activeTab);
  const setActiveTab = useCommandCenterStore((state) => state.setActiveTab);
  const loadTracker = useCommandCenterStore((state) => state.loadTracker);
  const setTrackerFromJson = useCommandCenterStore((state) => state.setTrackerFromJson);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("command-center-theme");
    return stored === "dark" || stored === "light" ? stored : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("command-center-theme", theme);
  }, [theme]);

  useEffect(() => {
    void loadTracker();
    return window.commandCenter.tracker.onUpdated((json) => setTrackerFromJson(json));
  }, [loadTracker, setTrackerFromJson]);

  const hasRecentActivity = useMemo(() => {
    if (!tracker) return false;
    return tracker.agent_log.some((entry) => Date.now() - new Date(entry.timestamp).getTime() < 30 * 60 * 1000);
  }, [tracker]);

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loading-mark" />
        <p>جار تحميل ملف مركز القيادة...</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-brand">
          <img className="app-brand-logo" src={logoUrl} alt="" />
          <div className="app-brand-copy">
            <strong>Command Center</strong>
            <span>EcoPest</span>
          </div>
        </div>
        <nav className="tab-bar" aria-label="أقسام مركز القيادة">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "tab active" : "tab"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {Icon({ name: tab.icon })}
              {tab.label}
              {tab.id === "agent-hub" && hasRecentActivity ? <span className="activity-pulse" /> : null}
            </button>
          ))}
        </nav>
        <StatusBar synced={synced} />
        <button
          className="icon-button"
          onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
          aria-label="تبديل المظهر"
        >
          {Icon({ name: theme === "light" ? "moon" : "sun" })}
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <main className="app-content">
        {activeTab === "swim-lane" ? <SwimLaneView /> : null}
        {activeTab === "task-board" ? <TaskBoardView /> : null}
        {activeTab === "agent-hub" ? <AgentHubView /> : null}
        {activeTab === "calendar" ? <CalendarView /> : null}
      </main>
    </div>
  );
}

function StatusBar({ synced }: { synced: boolean }): ReactNode {
  const tracker = useCommandCenterStore((state) => state.tracker);
  if (!tracker) return null;
  const counts = selectTaskCounts(tracker);
  const total = allTasks(tracker).length;
  const pct = Math.round(tracker.project.overall_progress * 100);
  return (
    <div className="status-bar">
      <span>
        W{tracker.project.current_week} · {selectCurrentPhase(tracker) || "لا توجد مرحلة"}
      </span>
      <div className="mini-progress" aria-label={`progress ${pct}%`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="mono">
        {counts.done}/{total} ({pct}%)
      </span>
      <SchedulePill status={tracker.project.schedule_status} />
      <span className={synced ? "sync ok" : "sync pending"}>{synced ? "متزامن" : "قيد الحفظ"}</span>
    </div>
  );
}
