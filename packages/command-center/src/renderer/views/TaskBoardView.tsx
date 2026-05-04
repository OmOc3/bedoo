import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getDomainColor, type Priority, type Subtask, type TaskStatus } from "../../shared/schema";
import { addUiLog, transitionTaskFromUi } from "../mutations";
import { useCommandCenterStore } from "../store";
import { EmptyState, StatusPill } from "../components/ui";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "قيد الانتظار" },
  { id: "in_progress", label: "قيد التنفيذ" },
  { id: "review", label: "للمراجعة" },
  { id: "done", label: "منجز" },
  { id: "blocked", label: "متوقف" },
];

type FilterType = "all" | "my_tasks" | "agent_tasks" | "blocked";

export default function TaskBoardView(): ReactNode {
  const tracker = useCommandCenterStore((state) => state.tracker);
  const selectedMilestoneId = useCommandCenterStore((state) => state.selectedMilestoneId);
  const setSelectedMilestoneId = useCommandCenterStore((state) => state.setSelectedMilestoneId);
  const updateTracker = useCommandCenterStore((state) => state.updateTracker);
  const [filter, setFilter] = useState<FilterType>("all");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const activeMilestone = useMemo(() => {
    if (!tracker) return null;
    return tracker.milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? tracker.milestones[0] ?? null;
  }, [selectedMilestoneId, tracker]);

  if (!tracker) return null;

  const tasks = activeMilestone?.subtasks ?? [];
  const filteredTasks = tasks.filter((task) => {
    if (filter === "blocked") return task.status === "blocked";
    if (filter === "my_tasks") return task.assignee === "operator";
    if (filter === "agent_tasks") return task.assignee !== null && task.assignee !== "operator";
    return true;
  });
  const detailTask = tasks.find((task) => task.id === detailTaskId) ?? null;

  function dropTask(status: TaskStatus): void {
    if (!draggedTaskId) return;
    updateTracker((state) => {
      transitionTaskFromUi(state, draggedTaskId, status);
    });
    setDraggedTaskId(null);
  }

  return (
    <section className="view-shell">
      <div className="board-toolbar">
        <div>
          <h1>لوحة المهام</h1>
          <p>تدفق العمل يحافظ على مرحلة المراجعة قبل الاعتماد النهائي.</p>
        </div>
        <select
          value={activeMilestone?.id ?? ""}
          onChange={(event) => setSelectedMilestoneId(event.target.value)}
        >
          {tracker.milestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.title}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        {[
          ["all", "الكل"],
          ["my_tasks", "مهامي"],
          ["agent_tasks", "مهام الوكلاء"],
          ["blocked", "المتوقفة"],
        ].map(([id, label]) => (
          <button
            className={filter === id ? "filter-button active" : "filter-button"}
            key={id}
            onClick={() => setFilter(id as FilterType)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeMilestone ? (
        <div className="kanban-grid">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter((task) => task.status === column.id);
            return (
              <section
                className="kanban-column"
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropTask(column.id)}
              >
                <header>
                  <span className={`status-dot status-${column.id}`} />
                  <strong>{column.label}</strong>
                  <span>{columnTasks.length}</span>
                </header>
                <div className="kanban-list">
                  {columnTasks.length === 0 ? <div className="drop-empty">إفلات هنا</div> : null}
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      domainColor={getDomainColor(tracker, activeMilestone.domain)}
                      onOpen={() => setDetailTaskId(task.id)}
                      onDragStart={() => setDraggedTaskId(task.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="board-empty-grid">
          {columns.map((column) => (
            <section className="kanban-column" key={column.id}>
              <header>
                <span className={`status-dot status-${column.id}`} />
                <strong>{column.label}</strong>
                <span>0</span>
              </header>
              <EmptyState title="لا توجد مهام">ستظهر المهام بعد الترطيب.</EmptyState>
            </section>
          ))}
        </div>
      )}

      {detailTask && activeMilestone ? (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTaskId(null)}
          onSave={(patch) =>
            updateTracker((state) => {
              const milestone = state.milestones.find((item) => item.id === activeMilestone.id);
              const task = milestone?.subtasks.find((item) => item.id === detailTask.id);
              if (!task) return;
              if (patch.status !== task.status) transitionTaskFromUi(state, task.id, patch.status);
              task.priority = patch.priority;
              task.assignee = patch.assignee.trim() === "" ? null : patch.assignee;
              task.execution_mode = patch.executionMode;
              task.notes = patch.notes.trim() === "" ? null : patch.notes;
              addUiLog(state, {
                action: "task_updated",
                target_type: "subtask",
                target_id: task.id,
                description: "Updated task metadata from board modal",
                tags: ["write"],
              });
            })
          }
        />
      ) : null}
    </section>
  );
}

function TaskCard({
  task,
  domainColor,
  onOpen,
  onDragStart,
}: {
  task: Subtask;
  domainColor: string;
  onOpen: () => void;
  onDragStart: () => void;
}): ReactNode {
  return (
    <button
      className="task-card"
      draggable
      style={{ borderColor: domainColor }}
      onClick={onOpen}
      onDragStart={onDragStart}
    >
      <div className="task-card-top">
        <span className="priority-chip">{task.priority}</span>
        <StatusPill status={task.status} />
      </div>
      <strong>{task.label}</strong>
      <span>{task.id}</span>
      {task.blocked_reason ? <em>{task.blocked_reason}</em> : null}
      <small>{task.assignee ?? "غير مسند"}</small>
    </button>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onSave,
}: {
  task: Subtask;
  onClose: () => void;
  onSave: (patch: {
    status: TaskStatus;
    priority: Priority;
    assignee: string;
    executionMode: "human" | "agent" | "pair";
    notes: string;
  }) => void;
}): ReactNode {
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      status: String(form.get("status")) as TaskStatus,
      priority: String(form.get("priority")) as Priority,
      assignee: String(form.get("assignee") ?? ""),
      executionMode: String(form.get("execution_mode")) as "human" | "agent" | "pair",
      notes: String(form.get("notes") ?? ""),
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="task-modal" onSubmit={submit}>
        <header>
          <div>
            <span className="meta-chip">{task.id}</span>
            <h2>{task.label}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </header>
        <div className="modal-grid">
          <label>
            الحالة
            <select name="status" defaultValue={task.status}>
              {columns.map((column) => (
                <option value={column.id} key={column.id}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            الأولوية
            <select name="priority" defaultValue={task.priority}>
              {["P1", "P2", "P3", "P4"].map((priority) => (
                <option value={priority} key={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            المسند إليه
            <input name="assignee" defaultValue={task.assignee ?? ""} />
          </label>
          <label>
            نمط التنفيذ
            <select name="execution_mode" defaultValue={task.execution_mode}>
              <option value="agent">وكيل</option>
              <option value="human">بشري</option>
              <option value="pair">مشترك</option>
            </select>
          </label>
        </div>
        <label>
          ملاحظات
          <textarea name="notes" defaultValue={task.notes ?? ""} />
        </label>
        <footer>
          <button className="secondary-button" type="button" onClick={onClose}>
            إلغاء
          </button>
          <button className="primary-button" type="submit">
            حفظ
          </button>
        </footer>
      </form>
    </div>
  );
}
