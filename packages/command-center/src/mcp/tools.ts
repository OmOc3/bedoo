import { z } from "zod";
import {
  AGENT_TYPES,
  EXECUTION_MODES,
  PRIORITIES,
  TASK_STATUSES,
  createMilestone,
  createSubtask,
  daysBetween,
  findTask,
  formatStatus,
  isMilestoneComplete,
  makeLogEntry,
  nowIso,
  todayDateOnly,
  type Agent,
  type AgentLogEntry,
  type Milestone,
  type Priority,
  type TaskStatus,
  type TrackerState,
} from "../shared/schema.js";
import { mutateTracker, readTracker } from "../shared/tracker-file.js";
import {
  buildMilestoneOverview,
  buildProjectStatus,
  buildTaskContext,
  buildTaskSummary,
  getTaskOrThrow,
} from "./context.js";

export interface ToolContent {
  type: "text";
  text: string;
}

export interface ToolResponse {
  [key: string]: unknown;
  content: ToolContent[];
  isError?: boolean;
}

type ToolHandler<TInput> = (input: TInput) => ToolResponse | Promise<ToolResponse>;

interface ToolRegistration {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  run: (input: unknown) => Promise<ToolResponse>;
}

const emptyShape = {};
const agentIdField = z.string().min(1).default("orchestrator");
const operatorIdField = z.string().min(1).default("operator");
const operatorConfirmField = z.boolean().optional();

function text(text: string): ToolResponse {
  return { content: [{ type: "text", text }] };
}

function toolError(error: unknown): ToolResponse {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: message }], isError: true };
}

function defineTool<TShape extends z.ZodRawShape>(config: {
  name: string;
  title: string;
  description: string;
  inputSchema: TShape;
  handler: ToolHandler<z.output<z.ZodObject<TShape>>>;
}): ToolRegistration {
  const schema = z.object(config.inputSchema);
  return {
    name: config.name,
    title: config.title,
    description: config.description,
    inputSchema: config.inputSchema,
    run: async (input: unknown) => config.handler(schema.parse(input ?? {})),
  };
}

function assertOperatorConfirmed(input: { operator_confirm?: boolean }): void {
  if (input.operator_confirm !== true) {
    throw new Error("This operator-only action requires operator_confirm: true.");
  }
}

function touchAgent(state: TrackerState, agentId: string): void {
  const agent = state.agents.find((item) => item.id === agentId);
  if (agent) {
    agent.status = "active";
    agent.last_action_at = nowIso();
    agent.session_action_count += 1;
    return;
  }

  const fallbackAgent: Agent = {
    id: agentId,
    name: agentId,
    type: agentId === "operator" ? "human" : "external",
    color: agentId === "operator" ? "#0f766e" : "#57606a",
    status: "active",
    permissions: ["read", "write"],
    last_action_at: nowIso(),
    session_action_count: 1,
  };
  state.agents.push(fallbackAgent);
}

function log(
  state: TrackerState,
  input: {
    agent_id: string;
    action: string;
    target_type: AgentLogEntry["target_type"];
    target_id: string;
    description: string;
    tags?: string[];
  },
): void {
  state.agent_log.push(makeLogEntry({ ...input, tags: Array.from(new Set([...(input.tags ?? []), "mcp"])) }));
}

function isTaskDone(state: TrackerState, taskId: string): boolean {
  return findTask(state, taskId)?.subtask.status === "done";
}

function incompleteTaskDependencies(state: TrackerState, task: { depends_on: string[] }): string[] {
  return task.depends_on.filter((dependencyId) => !isTaskDone(state, dependencyId));
}

function incompleteMilestoneDependencies(state: TrackerState, milestone: Milestone): string[] {
  return milestone.dependencies.filter((dependencyId) => {
    const dependency = state.milestones.find((item) => item.id === dependencyId);
    return !dependency || !isMilestoneComplete(dependency);
  });
}

function autoUnblockDependents(state: TrackerState, completedTaskId: string, completedMilestoneId: string): string[] {
  const unblocked: string[] = [];
  for (const milestone of state.milestones) {
    for (const task of milestone.subtasks) {
      if (task.status !== "blocked") continue;
      const taskReady =
        task.depends_on.includes(completedTaskId) &&
        incompleteTaskDependencies(state, task).length === 0;
      const milestoneReady =
        milestone.dependencies.includes(completedMilestoneId) &&
        incompleteMilestoneDependencies(state, milestone).length === 0;
      if (taskReady || milestoneReady) {
        const previousReason = task.blocked_reason ?? "dependency cleared";
        task.status = "todo";
        task.blocked_by = null;
        task.blocked_reason = null;
        const description = `Auto-unblocked ${task.id}: ${previousReason}`;
        unblocked.push(description);
        log(state, {
          agent_id: "system",
          action: "task_auto_unblocked",
          target_type: "subtask",
          target_id: task.id,
          description,
          tags: ["system", "unblock"],
        });
      }
    }
  }
  return unblocked;
}

function nextTaskId(milestone: Milestone): string {
  const number = String(milestone.subtasks.length + 1).padStart(3, "0");
  return `${milestone.id}_${number}`;
}

function listTaskMarkdown(state: TrackerState, filters: { milestone_id?: string; status?: TaskStatus; domain?: string }): string {
  const lines: string[] = [];
  for (const milestone of state.milestones) {
    if (filters.milestone_id && milestone.id !== filters.milestone_id) continue;
    if (filters.domain && milestone.domain !== filters.domain) continue;
    const tasks = milestone.subtasks.filter((task) => !filters.status || task.status === filters.status);
    if (tasks.length === 0) continue;
    lines.push(`## ${milestone.title} (${milestone.id})`);
    for (const task of tasks) {
      lines.push(`- ${task.id} [${formatStatus(task.status)}] ${task.priority}: ${task.label}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim() || "No tasks found.";
}

function activityFeedMarkdown(state: TrackerState, input: { agent_id?: string; limit?: number }): string {
  const limit = input.limit ?? 30;
  const entries = state.agent_log
    .filter((entry) => !input.agent_id || entry.agent_id === input.agent_id)
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
  if (entries.length === 0) return "No activity recorded.";
  return entries
    .map(
      (entry) =>
        `- ${entry.timestamp} ${entry.agent_id} ${entry.action} ${entry.target_type}:${entry.target_id} ${entry.description} [${entry.tags.join(", ")}]`,
    )
    .join("\n");
}

export const commandCenterTools: ToolRegistration[] = [
  defineTool({
    name: "get_task_context",
    title: "Get Task Context",
    description: "Return full markdown context for one task.",
    inputSchema: { task_id: z.string().min(1) },
    handler: ({ task_id }) => {
      const state = readTracker();
      const { subtask, milestone } = getTaskOrThrow(state, task_id);
      return text(buildTaskContext(state, subtask, milestone));
    },
  }),
  defineTool({
    name: "get_task_summary",
    title: "Get Task Summary",
    description: "Return compact markdown context for one task.",
    inputSchema: { task_id: z.string().min(1) },
    handler: ({ task_id }) => {
      const state = readTracker();
      const { subtask, milestone } = getTaskOrThrow(state, task_id);
      return text(buildTaskSummary(state, subtask, milestone));
    },
  }),
  defineTool({
    name: "get_project_status",
    title: "Get Project Status",
    description: "Return command center project status.",
    inputSchema: emptyShape,
    handler: () => text(buildProjectStatus(readTracker())),
  }),
  defineTool({
    name: "get_milestone_overview",
    title: "Get Milestone Overview",
    description: "Return markdown overview for one milestone.",
    inputSchema: { milestone_id: z.string().min(1) },
    handler: ({ milestone_id }) => {
      const state = readTracker();
      const milestone = state.milestones.find((item) => item.id === milestone_id);
      if (!milestone) throw new Error(`Milestone '${milestone_id}' not found`);
      return text(buildMilestoneOverview(milestone, state));
    },
  }),
  defineTool({
    name: "list_tasks",
    title: "List Tasks",
    description: "List tasks with optional milestone, status, and domain filters.",
    inputSchema: {
      milestone_id: z.string().optional(),
      status: z.enum(TASK_STATUSES).optional(),
      domain: z.string().optional(),
    },
    handler: (input) => text(listTaskMarkdown(readTracker(), input)),
  }),
  defineTool({
    name: "get_task_history",
    title: "Get Task History",
    description: "Return chronological log history for one task.",
    inputSchema: { task_id: z.string().min(1) },
    handler: ({ task_id }) => {
      const entries = readTracker().agent_log.filter((entry) => entry.target_id === task_id);
      if (entries.length === 0) return text("No history found.");
      return text(entries.map((entry) => `- ${entry.timestamp}: ${entry.action} - ${entry.description}`).join("\n"));
    },
  }),
  defineTool({
    name: "list_agents",
    title: "List Agents",
    description: "Return connected agent roster and action counts.",
    inputSchema: emptyShape,
    handler: () => {
      const state = readTracker();
      if (state.agents.length === 0) return text("No agents registered.");
      return text(
        state.agents
          .map(
            (agent) =>
              `- ${agent.id} (${agent.name}) ${agent.type} ${agent.status}, actions=${agent.session_action_count}, permissions=${agent.permissions.join(",")}`,
          )
          .join("\n"),
      );
    },
  }),
  defineTool({
    name: "get_activity_feed",
    title: "Get Activity Feed",
    description: "Return recent activity log entries.",
    inputSchema: {
      agent_id: z.string().optional(),
      limit: z.number().int().positive().max(200).optional(),
    },
    handler: (input) => text(activityFeedMarkdown(readTracker(), input)),
  }),
  defineTool({
    name: "start_task",
    title: "Start Task",
    description: "Move a task into in_progress after dependency checks.",
    inputSchema: { task_id: z.string().min(1), agent_id: agentIdField },
    handler: ({ task_id, agent_id }) => {
      const result = mutateTracker((state) => {
        const { subtask, milestone } = getTaskOrThrow(state, task_id);
        if (subtask.status === "done" || subtask.status === "review") {
          throw new Error(`Task '${task_id}' is in status '${subtask.status}' and cannot be started.`);
        }
        const blockers = [
          ...incompleteTaskDependencies(state, subtask),
          ...incompleteMilestoneDependencies(state, milestone),
        ];
        if (blockers.length > 0) {
          subtask.status = "blocked";
          subtask.blocked_by = "dependency";
          subtask.blocked_reason = `Waiting on dependencies: ${blockers.join(", ")}`;
          log(state, {
            agent_id,
            action: "task_blocked",
            target_type: "subtask",
            target_id: task_id,
            description: subtask.blocked_reason,
            tags: ["block", "dependency"],
          });
          throw new Error(subtask.blocked_reason);
        }
        subtask.status = "in_progress";
        subtask.assignee ??= agent_id;
        subtask.last_run_id = `run_${Date.now()}`;
        if (!milestone.actual_start) {
          milestone.actual_start = todayDateOnly();
          if (milestone.planned_start) milestone.drift_days = daysBetween(milestone.planned_start, milestone.actual_start);
        }
        log(state, {
          agent_id,
          action: "task_started",
          target_type: "subtask",
          target_id: task_id,
          description: `Started ${subtask.label}`,
          tags: ["start"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Started task '${task_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "complete_task",
    title: "Complete Task",
    description: "Submit a task for operator review. This never marks the task done.",
    inputSchema: {
      task_id: z.string().min(1),
      summary: z.string().min(1),
      agent_id: agentIdField,
    },
    handler: ({ task_id, summary, agent_id }) => {
      const result = mutateTracker((state) => {
        const { subtask } = getTaskOrThrow(state, task_id);
        if (subtask.status !== "in_progress") {
          throw new Error(`Task '${task_id}' is in status '${subtask.status}', expected 'in_progress'.`);
        }
        subtask.status = "review";
        subtask.done = false;
        subtask.blocked_by = null;
        subtask.blocked_reason = null;
        log(state, {
          agent_id,
          action: "task_submitted_for_review",
          target_type: "subtask",
          target_id: task_id,
          description: summary,
          tags: ["review", "write"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Submitted '${task_id}' for review. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "approve_task",
    title: "Approve Task",
    description: "Operator-only: move a review task to done and auto-unblock dependents.",
    inputSchema: {
      task_id: z.string().min(1),
      feedback: z.string().optional(),
      operator_id: operatorIdField,
      operator_confirm: operatorConfirmField,
    },
    handler: ({ task_id, feedback, operator_id, operator_confirm }) => {
      assertOperatorConfirmed({ operator_confirm });
      let unblocked: string[] = [];
      const result = mutateTracker((state) => {
        const { subtask, milestone } = getTaskOrThrow(state, task_id);
        if (subtask.status !== "review") {
          throw new Error(`Task '${task_id}' is in status '${subtask.status}', expected 'review'.`);
        }
        subtask.status = "done";
        subtask.done = true;
        subtask.completed_at = nowIso();
        subtask.completed_by = operator_id;
        if (milestone.subtasks.every((task) => task.status === "done")) {
          milestone.actual_end = todayDateOnly();
        }
        unblocked = autoUnblockDependents(state, task_id, milestone.id);
        log(state, {
          agent_id: operator_id,
          action: "task_approved",
          target_type: "subtask",
          target_id: task_id,
          description: feedback ?? `Approved ${subtask.label}`,
          tags: ["approve", "operator"],
        });
        touchAgent(state, operator_id);
      });
      return text(`Approved '${task_id}'. Auto-unblocked: ${unblocked.length}. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "reject_task",
    title: "Reject Task",
    description: "Operator-only: return a review task to in_progress with feedback.",
    inputSchema: {
      task_id: z.string().min(1),
      feedback: z.string().min(1),
      operator_id: operatorIdField,
      operator_confirm: operatorConfirmField,
    },
    handler: ({ task_id, feedback, operator_id, operator_confirm }) => {
      assertOperatorConfirmed({ operator_confirm });
      const result = mutateTracker((state) => {
        const { subtask } = getTaskOrThrow(state, task_id);
        if (subtask.status !== "review") {
          throw new Error(`Task '${task_id}' is in status '${subtask.status}', expected 'review'.`);
        }
        subtask.status = "in_progress";
        const revisionCount =
          state.agent_log.filter((entry) => entry.target_id === task_id && entry.action === "revision_requested").length + 1;
        log(state, {
          agent_id: operator_id,
          action: "revision_requested",
          target_type: "subtask",
          target_id: task_id,
          description: `Revision ${revisionCount}: ${feedback}`,
          tags: ["review", "operator"],
        });
        touchAgent(state, operator_id);
      });
      return text(`Rejected '${task_id}' with feedback. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "reset_task",
    title: "Reset Task",
    description: "Operator-only: reset a task to todo.",
    inputSchema: {
      task_id: z.string().min(1),
      operator_id: operatorIdField,
      operator_confirm: operatorConfirmField,
    },
    handler: ({ task_id, operator_id, operator_confirm }) => {
      assertOperatorConfirmed({ operator_confirm });
      const result = mutateTracker((state) => {
        const { subtask } = getTaskOrThrow(state, task_id);
        const previousStatus = subtask.status;
        subtask.status = "todo";
        subtask.done = false;
        subtask.assignee = null;
        subtask.blocked_by = null;
        subtask.blocked_reason = null;
        subtask.completed_at = null;
        subtask.completed_by = null;
        subtask.last_run_id = null;
        log(state, {
          agent_id: operator_id,
          action: "task_reset",
          target_type: "subtask",
          target_id: task_id,
          description: `Reset from ${previousStatus} to todo`,
          tags: ["operator"],
        });
        touchAgent(state, operator_id);
      });
      return text(`Reset '${task_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "block_task",
    title: "Block Task",
    description: "Move a task to blocked with a reason.",
    inputSchema: {
      task_id: z.string().min(1),
      reason: z.string().min(1),
      agent_id: agentIdField,
    },
    handler: ({ task_id, reason, agent_id }) => {
      const result = mutateTracker((state) => {
        const { subtask } = getTaskOrThrow(state, task_id);
        subtask.status = "blocked";
        subtask.blocked_reason = reason;
        subtask.blocked_by = agent_id;
        log(state, {
          agent_id,
          action: "task_blocked",
          target_type: "subtask",
          target_id: task_id,
          description: reason,
          tags: ["block"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Blocked '${task_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "unblock_task",
    title: "Unblock Task",
    description: "Move a blocked task back to todo or in_progress.",
    inputSchema: {
      task_id: z.string().min(1),
      resolution: z.string().optional(),
      agent_id: agentIdField,
    },
    handler: ({ task_id, resolution, agent_id }) => {
      const result = mutateTracker((state) => {
        const { subtask } = getTaskOrThrow(state, task_id);
        if (subtask.status !== "blocked") {
          throw new Error(`Task '${task_id}' is in status '${subtask.status}', expected 'blocked'.`);
        }
        const previousReason = subtask.blocked_reason ?? "none";
        subtask.status = subtask.last_run_id ? "in_progress" : "todo";
        subtask.blocked_by = null;
        subtask.blocked_reason = null;
        log(state, {
          agent_id,
          action: "task_unblocked",
          target_type: "subtask",
          target_id: task_id,
          description: resolution ?? `Resolved blocker: ${previousReason}`,
          tags: ["unblock"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Unblocked '${task_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "update_task",
    title: "Update Task",
    description: "Update task metadata without changing lifecycle status.",
    inputSchema: {
      task_id: z.string().min(1),
      priority: z.enum(PRIORITIES).optional(),
      assignee: z.string().optional(),
      execution_mode: z.enum(EXECUTION_MODES).optional(),
      notes: z.string().optional(),
      agent_id: agentIdField,
    },
    handler: ({ task_id, priority, assignee, execution_mode, notes, agent_id }) => {
      const changes: string[] = [];
      const result = mutateTracker((state) => {
        const { subtask } = getTaskOrThrow(state, task_id);
        if (priority) {
          subtask.priority = priority;
          changes.push(`priority=${priority}`);
        }
        if (assignee !== undefined) {
          subtask.assignee = assignee.trim() === "" ? null : assignee;
          changes.push(`assignee=${subtask.assignee ?? "unassigned"}`);
        }
        if (execution_mode) {
          subtask.execution_mode = execution_mode;
          changes.push(`execution_mode=${execution_mode}`);
        }
        if (notes !== undefined) {
          subtask.notes = notes.trim() === "" ? null : notes;
          changes.push("notes");
        }
        log(state, {
          agent_id,
          action: "task_updated",
          target_type: "subtask",
          target_id: task_id,
          description: changes.join(", ") || "No changes",
          tags: ["write"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Updated '${task_id}': ${changes.join(", ") || "no changes"}. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "log_action",
    title: "Log Action",
    description: "Append an activity log entry.",
    inputSchema: {
      task_id: z.string().min(1),
      action: z.string().min(1),
      description: z.string(),
      tags: z.array(z.string()).optional(),
      agent_id: agentIdField,
    },
    handler: ({ task_id, action, description, tags, agent_id }) => {
      const result = mutateTracker((state) => {
        log(state, {
          agent_id,
          action,
          target_type: "subtask",
          target_id: task_id,
          description,
          tags: tags ?? ["note"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Logged action for '${task_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "enrich_task",
    title: "Enrich Task",
    description: "Replace task prompt, context files, docs, criteria, and constraints.",
    inputSchema: {
      task_id: z.string().min(1),
      prompt: z.string().optional(),
      builder_prompt: z.string().optional(),
      acceptance_criteria: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      context_files: z.array(z.string()).optional(),
      reference_docs: z.array(z.string()).optional(),
      agent_id: agentIdField,
    },
    handler: (input) => {
      const changes: string[] = [];
      const result = mutateTracker((state) => {
        const { subtask } = getTaskOrThrow(state, input.task_id);
        if (input.prompt !== undefined) {
          subtask.prompt = input.prompt;
          changes.push("prompt");
        }
        if (input.builder_prompt !== undefined) {
          subtask.builder_prompt = input.builder_prompt;
          changes.push("builder_prompt");
        }
        if (input.acceptance_criteria !== undefined) {
          subtask.acceptance_criteria = input.acceptance_criteria;
          changes.push("acceptance_criteria");
        }
        if (input.constraints !== undefined) {
          subtask.constraints = input.constraints;
          changes.push("constraints");
        }
        if (input.context_files !== undefined) {
          subtask.context_files = input.context_files;
          changes.push("context_files");
        }
        if (input.reference_docs !== undefined) {
          subtask.reference_docs = input.reference_docs;
          changes.push("reference_docs");
        }
        log(state, {
          agent_id: input.agent_id,
          action: "task_enriched",
          target_type: "subtask",
          target_id: input.task_id,
          description: changes.join(", ") || "No changes",
          tags: ["write", "context"],
        });
        touchAgent(state, input.agent_id);
      });
      return text(`Enriched '${input.task_id}': ${changes.join(", ") || "no changes"}. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "add_milestone_note",
    title: "Add Milestone Note",
    description: "Append a note or exit criterion to a milestone.",
    inputSchema: {
      milestone_id: z.string().min(1),
      note: z.string().min(1),
      agent_id: agentIdField,
    },
    handler: ({ milestone_id, note, agent_id }) => {
      const result = mutateTracker((state) => {
        const milestone = state.milestones.find((item) => item.id === milestone_id);
        if (!milestone) throw new Error(`Milestone '${milestone_id}' not found`);
        milestone.notes.push(note);
        log(state, {
          agent_id,
          action: "milestone_note_added",
          target_type: "milestone",
          target_id: milestone_id,
          description: note,
          tags: ["write"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Added note to '${milestone_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "set_milestone_dates",
    title: "Set Milestone Dates",
    description: "Set planned or actual milestone dates and recalculate drift.",
    inputSchema: {
      milestone_id: z.string().min(1),
      planned_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      planned_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      actual_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      actual_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      agent_id: agentIdField,
    },
    handler: (input) => {
      const result = mutateTracker((state) => {
        const milestone = state.milestones.find((item) => item.id === input.milestone_id);
        if (!milestone) throw new Error(`Milestone '${input.milestone_id}' not found`);
        if (input.planned_start !== undefined) milestone.planned_start = input.planned_start;
        if (input.planned_end !== undefined) milestone.planned_end = input.planned_end;
        if (input.actual_start !== undefined) milestone.actual_start = input.actual_start;
        if (input.actual_end !== undefined) milestone.actual_end = input.actual_end;
        if (milestone.planned_start && milestone.actual_start) {
          milestone.drift_days = daysBetween(milestone.planned_start, milestone.actual_start);
        }
        log(state, {
          agent_id: input.agent_id,
          action: "milestone_dates_set",
          target_type: "milestone",
          target_id: input.milestone_id,
          description: "Milestone dates updated",
          tags: ["write", "schedule"],
        });
        touchAgent(state, input.agent_id);
      });
      return text(`Updated dates for '${input.milestone_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "update_drift",
    title: "Update Drift",
    description: "Set milestone drift days.",
    inputSchema: {
      milestone_id: z.string().min(1),
      drift_days: z.number().int(),
      agent_id: agentIdField,
    },
    handler: ({ milestone_id, drift_days, agent_id }) => {
      const result = mutateTracker((state) => {
        const milestone = state.milestones.find((item) => item.id === milestone_id);
        if (!milestone) throw new Error(`Milestone '${milestone_id}' not found`);
        const previous = milestone.drift_days;
        milestone.drift_days = drift_days;
        log(state, {
          agent_id,
          action: "drift_updated",
          target_type: "milestone",
          target_id: milestone_id,
          description: `${previous} -> ${drift_days}`,
          tags: ["write", "schedule"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Updated drift for '${milestone_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "create_milestone",
    title: "Create Milestone",
    description: "Create a milestone with hydration-ready metadata.",
    inputSchema: {
      id: z.string().min(1),
      title: z.string().min(1),
      domain: z.string().optional(),
      week: z.number().int().min(1).optional(),
      phase: z.string().optional(),
      planned_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      planned_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      dependencies: z.array(z.string()).optional(),
      is_key_milestone: z.boolean().optional(),
      key_milestone_label: z.string().nullable().optional(),
      agent_id: agentIdField,
    },
    handler: (input) => {
      const result = mutateTracker((state) => {
        if (state.milestones.some((item) => item.id === input.id)) {
          throw new Error(`Milestone '${input.id}' already exists`);
        }
        state.milestones.push(createMilestone(input));
        log(state, {
          agent_id: input.agent_id,
          action: "milestone_created",
          target_type: "milestone",
          target_id: input.id,
          description: input.title,
          tags: ["write", "hydrate"],
        });
        touchAgent(state, input.agent_id);
      });
      return text(`Created milestone '${input.id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "add_milestone_task",
    title: "Add Milestone Task",
    description: "Add a subtask to a milestone.",
    inputSchema: {
      milestone_id: z.string().min(1),
      label: z.string().min(1),
      priority: z.enum(PRIORITIES).optional(),
      acceptance_criteria: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      depends_on: z.array(z.string()).optional(),
      execution_mode: z.enum(EXECUTION_MODES).optional(),
      agent_target: z.string().nullable().optional(),
      agent_id: agentIdField,
    },
    handler: (input) => {
      let taskId = "";
      const result = mutateTracker((state) => {
        const milestone = state.milestones.find((item) => item.id === input.milestone_id);
        if (!milestone) throw new Error(`Milestone '${input.milestone_id}' not found`);
        taskId = nextTaskId(milestone);
        milestone.subtasks.push(createSubtask({ ...input, id: taskId }));
        log(state, {
          agent_id: input.agent_id,
          action: "task_created",
          target_type: "subtask",
          target_id: taskId,
          description: input.label,
          tags: ["write", "hydrate"],
        });
        touchAgent(state, input.agent_id);
      });
      return text(`Created task '${taskId}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "register_agent",
    title: "Register Agent",
    description: "Register or update an agent in the command center.",
    inputSchema: {
      agent_id: z.string().min(1),
      name: z.string().min(1),
      type: z.enum(AGENT_TYPES),
      permissions: z.array(z.string()),
      color: z.string().optional(),
      parent_id: z.string().optional(),
    },
    handler: ({ agent_id, name, type, permissions, color, parent_id }) => {
      const result = mutateTracker((state) => {
        const existing = state.agents.find((agent) => agent.id === agent_id);
        if (existing) {
          existing.name = name;
          existing.type = type;
          existing.permissions = permissions;
          existing.color = color ?? existing.color;
          existing.parent_id = parent_id;
          existing.status = "active";
          existing.last_action_at = nowIso();
        } else {
          state.agents.push({
            id: agent_id,
            name,
            type,
            parent_id,
            color: color ?? "#57606a",
            status: "active",
            permissions,
            last_action_at: nowIso(),
            session_action_count: 0,
          });
        }
        log(state, {
          agent_id,
          action: existing ? "agent_updated" : "agent_registered",
          target_type: "agent",
          target_id: agent_id,
          description: name,
          tags: ["agent"],
        });
      });
      return text(`Registered agent '${agent_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "update_project",
    title: "Update Project",
    description: "Update project metadata used by hydration.",
    inputSchema: {
      name: z.string().optional(),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      agent_id: agentIdField,
    },
    handler: ({ name, start_date, target_date, agent_id }) => {
      const result = mutateTracker((state) => {
        if (name !== undefined) state.project.name = name;
        if (start_date !== undefined) state.project.start_date = start_date;
        if (target_date !== undefined) state.project.target_date = target_date;
        log(state, {
          agent_id,
          action: "project_updated",
          target_type: "project",
          target_id: "project",
          description: "Project metadata updated",
          tags: ["write", "hydrate"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Updated project. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "create_phase",
    title: "Create Phase",
    description: "Create or update a schedule phase.",
    inputSchema: {
      id: z.string().min(1),
      title: z.string().min(1),
      start_week: z.number().int().min(1),
      end_week: z.number().int().min(1),
      color: z.string().optional(),
      agent_id: agentIdField,
    },
    handler: ({ id, title, start_week, end_week, color, agent_id }) => {
      const result = mutateTracker((state) => {
        if (end_week < start_week) throw new Error("end_week must be greater than or equal to start_week");
        const existing = state.schedule.phases.find((phase) => phase.id === id);
        if (existing) {
          existing.title = title;
          existing.start_week = start_week;
          existing.end_week = end_week;
          existing.color = color;
        } else {
          state.schedule.phases.push({ id, title, start_week, end_week, color });
        }
        state.schedule.phases.sort((a, b) => a.start_week - b.start_week);
        log(state, {
          agent_id,
          action: existing ? "phase_updated" : "phase_created",
          target_type: "project",
          target_id: id,
          description: title,
          tags: ["write", "schedule"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Saved phase '${id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "set_milestone_dependencies",
    title: "Set Milestone Dependencies",
    description: "Replace a milestone dependency list.",
    inputSchema: {
      milestone_id: z.string().min(1),
      dependencies: z.array(z.string()),
      agent_id: agentIdField,
    },
    handler: ({ milestone_id, dependencies, agent_id }) => {
      const result = mutateTracker((state) => {
        const milestone = state.milestones.find((item) => item.id === milestone_id);
        if (!milestone) throw new Error(`Milestone '${milestone_id}' not found`);
        milestone.dependencies = dependencies;
        log(state, {
          agent_id,
          action: "milestone_dependencies_set",
          target_type: "milestone",
          target_id: milestone_id,
          description: dependencies.join(", ") || "none",
          tags: ["write", "dependency"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Updated dependencies for '${milestone_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "set_milestone_key",
    title: "Set Key Milestone",
    description: "Mark or unmark a milestone as a key milestone.",
    inputSchema: {
      milestone_id: z.string().min(1),
      is_key_milestone: z.boolean(),
      key_milestone_label: z.string().nullable().optional(),
      agent_id: agentIdField,
    },
    handler: ({ milestone_id, is_key_milestone, key_milestone_label, agent_id }) => {
      const result = mutateTracker((state) => {
        const milestone = state.milestones.find((item) => item.id === milestone_id);
        if (!milestone) throw new Error(`Milestone '${milestone_id}' not found`);
        milestone.is_key_milestone = is_key_milestone;
        milestone.key_milestone_label = key_milestone_label ?? null;
        log(state, {
          agent_id,
          action: "milestone_key_set",
          target_type: "milestone",
          target_id: milestone_id,
          description: is_key_milestone ? milestone.key_milestone_label ?? "key milestone" : "not key",
          tags: ["write", "schedule"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Updated key milestone flag for '${milestone_id}'. Tracker revision ${result.revision}.`);
    },
  }),
  defineTool({
    name: "set_domain_color",
    title: "Set Domain Color",
    description: "Set a stable color for a domain.",
    inputSchema: {
      domain: z.string().min(1),
      color: z.string().min(1),
      agent_id: agentIdField,
    },
    handler: ({ domain, color, agent_id }) => {
      const result = mutateTracker((state) => {
        state.settings.domain_colors[domain] = color;
        log(state, {
          agent_id,
          action: "domain_color_set",
          target_type: "project",
          target_id: domain,
          description: color,
          tags: ["write", "design"],
        });
        touchAgent(state, agent_id);
      });
      return text(`Set color for domain '${domain}'. Tracker revision ${result.revision}.`);
    },
  }),
];

export async function handleTool(name: string, args: unknown): Promise<ToolResponse> {
  const tool = commandCenterTools.find((item) => item.name === name);
  if (!tool) return toolError(new Error(`Unknown tool '${name}'`));
  try {
    return await tool.run(args);
  } catch (error) {
    return toolError(error);
  }
}

export function coerceCliValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
    return JSON.parse(value);
  }
  return value;
}

export function validatePriority(value: string | undefined): Priority | undefined {
  if (!value) return undefined;
  if ((PRIORITIES as readonly string[]).includes(value)) return value as Priority;
  throw new Error(`Invalid priority '${value}'`);
}

export function validateStatus(value: string | undefined): TaskStatus | undefined {
  if (!value) return undefined;
  if ((TASK_STATUSES as readonly string[]).includes(value)) return value as TaskStatus;
  throw new Error(`Invalid status '${value}'`);
}
