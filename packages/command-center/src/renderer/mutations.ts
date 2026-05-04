import {
  findTask,
  makeLogEntry,
  nowIso,
  todayDateOnly,
  type Agent,
  type AgentLogEntry,
  type Milestone,
  type TaskStatus,
  type TrackerState,
} from "../shared/schema";

export const OPERATOR_ID = "operator";

export function touchOperator(state: TrackerState): void {
  const existing = state.agents.find((agent) => agent.id === OPERATOR_ID);
  if (existing) {
    existing.status = "active";
    existing.last_action_at = nowIso();
    existing.session_action_count += 1;
    return;
  }

  const operator: Agent = {
    id: OPERATOR_ID,
    name: "المشغل",
    type: "human",
    color: "#0f766e",
    status: "active",
    permissions: ["read", "write", "approve"],
    last_action_at: nowIso(),
    session_action_count: 1,
  };
  state.agents.push(operator);
}

export function addUiLog(
  state: TrackerState,
  input: {
    action: string;
    target_type: AgentLogEntry["target_type"];
    target_id: string;
    description: string;
    tags?: string[];
  },
): void {
  state.agent_log.push(
    makeLogEntry({
      agent_id: OPERATOR_ID,
      action: input.action,
      target_type: input.target_type,
      target_id: input.target_id,
      description: input.description,
      tags: Array.from(new Set([...(input.tags ?? []), "ui"])),
    }),
  );
  touchOperator(state);
}

export function transitionTaskFromUi(
  state: TrackerState,
  taskId: string,
  requestedStatus: TaskStatus,
): { status: TaskStatus; message: string } {
  const result = findTask(state, taskId);
  if (!result) throw new Error(`Task '${taskId}' not found`);
  const { subtask, milestone } = result;
  const previous = subtask.status;
  let nextStatus = requestedStatus;
  let message = `Moved ${taskId} from ${previous} to ${requestedStatus}`;

  if (requestedStatus === "done" && previous !== "review") {
    nextStatus = "review";
    message = `Moved ${taskId} to review because approval is required before done`;
  }

  subtask.status = nextStatus;
  subtask.done = nextStatus === "done";

  if (nextStatus === "done") {
    subtask.completed_at = nowIso();
    subtask.completed_by = OPERATOR_ID;
    subtask.blocked_by = null;
    subtask.blocked_reason = null;
    if (milestone.subtasks.every((task) => task.status === "done")) {
      milestone.actual_end = todayDateOnly();
    }
  } else {
    subtask.completed_at = null;
    subtask.completed_by = null;
  }

  if (nextStatus === "blocked") {
    subtask.blocked_by = OPERATOR_ID;
    subtask.blocked_reason ??= "تم إيقافها من لوحة المهام";
  } else if (previous === "blocked") {
    subtask.blocked_by = null;
    subtask.blocked_reason = null;
  }

  if (nextStatus === "in_progress" && !milestone.actual_start) {
    milestone.actual_start = todayDateOnly();
  }

  addUiLog(state, {
    action: nextStatus === "done" ? "task_approved" : "task_status_changed",
    target_type: "subtask",
    target_id: taskId,
    description: message,
    tags: [nextStatus],
  });
  return { status: nextStatus, message };
}

export function updateMilestoneDatesFromUi(
  state: TrackerState,
  milestoneId: string,
  dates: Pick<Milestone, "planned_start" | "planned_end">,
): void {
  const milestone = state.milestones.find((item) => item.id === milestoneId);
  if (!milestone) throw new Error(`Milestone '${milestoneId}' not found`);
  milestone.planned_start = dates.planned_start;
  milestone.planned_end = dates.planned_end;
  addUiLog(state, {
    action: "milestone_dates_set",
    target_type: "milestone",
    target_id: milestoneId,
    description: "Updated planned dates from desktop app",
    tags: ["schedule"],
  });
}
