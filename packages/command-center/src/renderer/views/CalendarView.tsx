import { useMemo, useState, type ReactNode } from "react";
import {
  addDays,
  allTasks,
  getWeekStartDate,
  selectCurrentWeek,
  toDateOnly,
} from "../../shared/schema";
import { useCommandCenterStore } from "../store";
import { EmptyState, Icon } from "../components/ui";

export default function CalendarView(): ReactNode {
  const tracker = useCommandCenterStore((state) => state.tracker);
  const [week, setWeek] = useState(() => (tracker ? selectCurrentWeek(tracker) : 1));

  const days = useMemo(() => {
    if (!tracker) return [];
    const start = getWeekStartDate(tracker, week);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [tracker, week]);

  if (!tracker) return null;

  const completed = allTasks(tracker).filter(
    ({ subtask }) => subtask.status === "done" && subtask.completed_at,
  );
  const dayKeys = new Set(days.map((day) => toDateOnly(day)));
  const visibleCompleted = completed.filter(({ subtask }) => dayKeys.has(String(subtask.completed_at).slice(0, 10)));

  return (
    <section className="view-shell">
      <div className="calendar-toolbar">
        <button className="secondary-button" onClick={() => setWeek((value) => Math.max(1, value - 1))}>
          السابق
        </button>
        <div>
          <h1>الأسبوع {week}</h1>
          <p>
            {toDateOnly(days[0])} إلى {toDateOnly(days[6])} · {visibleCompleted.length} منجز
          </p>
        </div>
        <button className="secondary-button" onClick={() => setWeek(selectCurrentWeek(tracker))}>
          اليوم
        </button>
        <button className="secondary-button" onClick={() => setWeek((value) => value + 1)}>
          التالي
        </button>
      </div>

      <div className="calendar-grid">
        {days.map((day) => {
          const key = toDateOnly(day);
          const tasks = visibleCompleted.filter(({ subtask }) => String(subtask.completed_at).slice(0, 10) === key);
          const isToday = key === toDateOnly(new Date());
          return (
            <section className="calendar-day" key={key}>
              <header className={isToday ? "today" : ""}>
                <strong>{new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(day)}</strong>
                <span>{new Intl.DateTimeFormat("ar-EG", { month: "short", day: "numeric" }).format(day)}</span>
              </header>
              <div className="calendar-items">
                {tasks.map(({ subtask, milestone }) => (
                  <article className="calendar-chip" key={subtask.id}>
                    <span style={{ background: tracker.settings.domain_colors[milestone.domain] }} />
                    <div>
                      <strong>{subtask.label}</strong>
                      <em>{milestone.domain}</em>
                    </div>
                    {Icon({ name: "check", size: 16 })}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {visibleCompleted.length === 0 ? (
        <EmptyState title="لا توجد مهام منجزة في هذا الأسبوع">
          ستظهر المهام هنا بعد اعتمادها من مرحلة المراجعة.
        </EmptyState>
      ) : null}
    </section>
  );
}
