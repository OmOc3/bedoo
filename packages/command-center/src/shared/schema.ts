import { z } from "zod";

export const TASK_STATUSES = ["todo", "in_progress", "review", "done", "blocked"] as const;
export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export const EXECUTION_MODES = ["human", "agent", "pair"] as const;
export const AGENT_TYPES = ["orchestrator", "sub-agent", "human", "external"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ExecutionMode = (typeof EXECUTION_MODES)[number];
export type AgentType = (typeof AGENT_TYPES)[number];
export type ScheduleStatus = "on_track" | "behind" | "ahead";

export interface TrackerMeta {
  schema_version: number;
  revision: number;
  updated_at: string;
}

export interface TrackerState {
  _meta: TrackerMeta;
  project: ProjectMeta;
  milestones: Milestone[];
  agents: Agent[];
  agent_log: AgentLogEntry[];
  schedule: { phases: Phase[] };
  settings: CommandCenterSettings;
}

export interface ProjectMeta {
  name: string;
  start_date: string;
  target_date: string;
  current_week: number;
  schedule_status: ScheduleStatus;
  overall_progress: number;
}

export interface CommandCenterSettings {
  domain_colors: Record<string, string>;
}

export interface Milestone {
  id: string;
  title: string;
  domain: string;
  week: number;
  phase: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  drift_days: number;
  is_key_milestone: boolean;
  key_milestone_label: string | null;
  subtasks: Subtask[];
  dependencies: string[];
  notes: string[];
}

export interface Subtask {
  id: string;
  label: string;
  status: TaskStatus;
  done: boolean;
  assignee: string | null;
  blocked_by: string | null;
  blocked_reason: string | null;
  completed_at: string | null;
  completed_by: string | null;
  priority: Priority;
  notes: string | null;
  prompt: string | null;
  context_files: string[];
  reference_docs: string[];
  acceptance_criteria: string[];
  constraints: string[];
  agent_target: string | null;
  execution_mode: ExecutionMode;
  depends_on: string[];
  last_run_id: string | null;
  builder_prompt: string | null;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  parent_id?: string;
  color: string;
  status: "active" | "idle";
  permissions: string[];
  last_action_at: string | null;
  session_action_count: number;
}

export interface AgentLogEntry {
  id: string;
  agent_id: string;
  action: string;
  target_type: "subtask" | "milestone" | "agent" | "project" | "system";
  target_id: string;
  description: string;
  timestamp: string;
  tags: string[];
}

export interface Phase {
  id: string;
  title: string;
  start_week: number;
  end_week: number;
  color?: string;
}

export interface TaskWithMilestone {
  subtask: Subtask;
  milestone: Milestone;
}

export const DOMAIN_COLOR_PALETTE = [
  "#0f766e",
  "#1d4ed8",
  "#9a6700",
  "#1a7f37",
  "#cf222e",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#4d7c0f",
  "#57606a",
] as const;

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const DateOnlySchema = z.string().regex(dateOnlyPattern);
const NullableDateOnlySchema = DateOnlySchema.nullable();
const NullableIsoStringSchema = z.string().datetime().nullable();

export const ProjectMetaSchema = z.object({
  name: z.string().min(1),
  start_date: DateOnlySchema,
  target_date: DateOnlySchema,
  current_week: z.number().int().min(1),
  schedule_status: z.enum(["on_track", "behind", "ahead"]),
  overall_progress: z.number().min(0).max(1),
});

export const SubtaskSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(TASK_STATUSES),
  done: z.boolean(),
  assignee: z.string().nullable(),
  blocked_by: z.string().nullable(),
  blocked_reason: z.string().nullable(),
  completed_at: NullableIsoStringSchema,
  completed_by: z.string().nullable(),
  priority: z.enum(PRIORITIES),
  notes: z.string().nullable(),
  prompt: z.string().nullable(),
  context_files: z.array(z.string()),
  reference_docs: z.array(z.string()),
  acceptance_criteria: z.array(z.string()),
  constraints: z.array(z.string()),
  agent_target: z.string().nullable(),
  execution_mode: z.enum(EXECUTION_MODES),
  depends_on: z.array(z.string()),
  last_run_id: z.string().nullable(),
  builder_prompt: z.string().nullable(),
});

export const MilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  domain: z.string().min(1),
  week: z.number().int().min(1),
  phase: z.string().min(1),
  planned_start: NullableDateOnlySchema,
  planned_end: NullableDateOnlySchema,
  actual_start: NullableDateOnlySchema,
  actual_end: NullableDateOnlySchema,
  drift_days: z.number().int(),
  is_key_milestone: z.boolean(),
  key_milestone_label: z.string().nullable(),
  subtasks: z.array(SubtaskSchema),
  dependencies: z.array(z.string()),
  notes: z.array(z.string()),
});

export const AgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(AGENT_TYPES),
  parent_id: z.string().optional(),
  color: z.string().min(1),
  status: z.enum(["active", "idle"]),
  permissions: z.array(z.string()),
  last_action_at: NullableIsoStringSchema,
  session_action_count: z.number().int().min(0),
});

export const AgentLogEntrySchema = z.object({
  id: z.string().min(1),
  agent_id: z.string().min(1),
  action: z.string().min(1),
  target_type: z.enum(["subtask", "milestone", "agent", "project", "system"]),
  target_id: z.string().min(1),
  description: z.string(),
  timestamp: z.string().datetime(),
  tags: z.array(z.string()),
});

export const PhaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  start_week: z.number().int().min(1),
  end_week: z.number().int().min(1),
  color: z.string().optional(),
});

export const TrackerStateSchema = z.object({
  _meta: z
    .object({
      schema_version: z.number().int().min(1),
      revision: z.number().int().min(0),
      updated_at: z.string().datetime(),
    })
    .optional(),
  project: ProjectMetaSchema,
  milestones: z.array(MilestoneSchema),
  agents: z.array(AgentSchema),
  agent_log: z.array(AgentLogEntrySchema),
  schedule: z.object({ phases: z.array(PhaseSchema) }),
  settings: z.object({ domain_colors: z.record(z.string(), z.string()) }).optional(),
});

export function todayDateOnly(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

export function toDateOnly(date: Date): string {
  return todayDateOnly(date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

export function getWeekOneStart(projectStartDate: string): Date {
  const start = parseDateOnly(projectStartDate);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return addDays(start, -daysSinceMonday);
}

export function getTotalWeeks(tracker: TrackerState): number {
  const weekOne = getWeekOneStart(tracker.project.start_date);
  const target = parseDateOnly(tracker.project.target_date);
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.max(1, Math.ceil((target.getTime() - weekOne.getTime() + 1) / msPerWeek));
}

export function getWeekStartDate(tracker: TrackerState, week: number): Date {
  return addDays(getWeekOneStart(tracker.project.start_date), (week - 1) * 7);
}

export function selectCurrentWeek(tracker: TrackerState | null, now = new Date()): number {
  if (!tracker) return 1;
  const weekOne = getWeekOneStart(tracker.project.start_date);
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const rawWeek = Math.floor((now.getTime() - weekOne.getTime()) / msPerWeek) + 1;
  return Math.max(1, Math.min(getTotalWeeks(tracker), rawWeek));
}

export function selectCurrentWeekFractional(tracker: TrackerState | null, now = new Date()): number {
  if (!tracker) return 1;
  const weekOne = getWeekOneStart(tracker.project.start_date);
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const rawWeek = (now.getTime() - weekOne.getTime()) / msPerWeek + 1;
  return Math.max(1, Math.min(getTotalWeeks(tracker) + 0.99, rawWeek));
}

export function selectCurrentPhase(tracker: TrackerState | null): string {
  if (!tracker) return "";
  const currentWeek = selectCurrentWeek(tracker);
  const phase = tracker.schedule.phases.find(
    (item) => currentWeek >= item.start_week && currentWeek <= item.end_week,
  );
  return phase?.title ?? "";
}

export function selectScheduleStatus(tracker: TrackerState | null): ScheduleStatus {
  if (!tracker || tracker.milestones.length === 0) return "on_track";
  const drifts = tracker.milestones.map((milestone) => milestone.drift_days);
  if (Math.max(...drifts) > 3) return "behind";
  if (Math.min(...drifts) < -3) return "ahead";
  return "on_track";
}

export function selectMilestoneProgress(milestone: Milestone): { done: number; total: number; pct: number } {
  const total = milestone.subtasks.length;
  const done = milestone.subtasks.filter((task) => task.status === "done").length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function selectTaskCounts(tracker: TrackerState): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    blocked: 0,
  };
  for (const milestone of tracker.milestones) {
    for (const task of milestone.subtasks) {
      counts[task.status] += 1;
    }
  }
  return counts;
}

export function allTasks(tracker: TrackerState): TaskWithMilestone[] {
  return tracker.milestones.flatMap((milestone) =>
    milestone.subtasks.map((subtask) => ({ subtask, milestone })),
  );
}

export function findTask(state: TrackerState, taskId: string): TaskWithMilestone | null {
  for (const milestone of state.milestones) {
    const subtask = milestone.subtasks.find((task) => task.id === taskId);
    if (subtask) return { subtask, milestone };
  }
  return null;
}

export function getDomainColor(tracker: TrackerState, domain: string): string {
  const existing = tracker.settings.domain_colors[domain];
  if (existing) return existing;
  const domains = Array.from(new Set(tracker.milestones.map((milestone) => milestone.domain))).sort();
  const index = Math.max(0, domains.indexOf(domain));
  return DOMAIN_COLOR_PALETTE[index % DOMAIN_COLOR_PALETTE.length];
}

export function ensureDomainColors(tracker: TrackerState): void {
  const seenDomains = Array.from(new Set(tracker.milestones.map((milestone) => milestone.domain))).sort();
  for (const domain of seenDomains) {
    if (!tracker.settings.domain_colors[domain]) {
      const assignedCount = Object.keys(tracker.settings.domain_colors).length;
      tracker.settings.domain_colors[domain] = DOMAIN_COLOR_PALETTE[assignedCount % DOMAIN_COLOR_PALETTE.length];
    }
  }
}

export function createEmptyTracker(projectName = "EcoPest"): TrackerState {
  return recalculateDerivedFields({
    _meta: {
      schema_version: 1,
      revision: 0,
      updated_at: nowIso(),
    },
    project: {
      name: projectName,
      start_date: todayDateOnly(),
      target_date: toDateOnly(addDays(new Date(), 56)),
      current_week: 1,
      schedule_status: "on_track",
      overall_progress: 0,
    },
    milestones: [],
    agents: [],
    agent_log: [],
    schedule: { phases: [] },
    settings: { domain_colors: {} },
  });
}

export function normalizeTrackerState(input: unknown): TrackerState {
  const parsed = TrackerStateSchema.parse(input);
  return recalculateDerivedFields({
    _meta: parsed._meta ?? {
      schema_version: 1,
      revision: 0,
      updated_at: nowIso(),
    },
    project: parsed.project,
    milestones: parsed.milestones,
    agents: parsed.agents,
    agent_log: parsed.agent_log,
    schedule: parsed.schedule,
    settings: parsed.settings ?? { domain_colors: {} },
  });
}

export function recalculateDerivedFields(tracker: TrackerState): TrackerState {
  const totalTasks = tracker.milestones.reduce((sum, milestone) => sum + milestone.subtasks.length, 0);
  let doneTasks = 0;

  for (const milestone of tracker.milestones) {
    for (const task of milestone.subtasks) {
      task.done = task.status === "done";
      if (task.done) doneTasks += 1;
      if (task.status !== "blocked") {
        task.blocked_by = null;
        task.blocked_reason = null;
      }
      if (task.status !== "done") {
        task.completed_at = null;
        task.completed_by = null;
      }
    }
    if (milestone.subtasks.length > 0 && milestone.subtasks.every((task) => task.status === "done")) {
      milestone.actual_end ??= todayDateOnly();
    }
  }

  tracker.project.overall_progress = totalTasks > 0 ? Number((doneTasks / totalTasks).toFixed(4)) : 0;
  tracker.project.current_week = selectCurrentWeek(tracker);
  tracker.project.schedule_status = selectScheduleStatus(tracker);
  ensureDomainColors(tracker);
  return tracker;
}

export function createMilestone(input: {
  id: string;
  title: string;
  domain?: string;
  week?: number;
  phase?: string;
  planned_start?: string | null;
  planned_end?: string | null;
  dependencies?: string[];
  is_key_milestone?: boolean;
  key_milestone_label?: string | null;
}): Milestone {
  return {
    id: input.id,
    title: input.title,
    domain: input.domain ?? "general",
    week: input.week ?? 1,
    phase: input.phase ?? input.id,
    planned_start: input.planned_start ?? null,
    planned_end: input.planned_end ?? null,
    actual_start: null,
    actual_end: null,
    drift_days: 0,
    is_key_milestone: input.is_key_milestone ?? false,
    key_milestone_label: input.key_milestone_label ?? null,
    subtasks: [],
    dependencies: input.dependencies ?? [],
    notes: [],
  };
}

export function createSubtask(input: {
  id: string;
  label: string;
  priority?: Priority;
  acceptance_criteria?: string[];
  constraints?: string[];
  depends_on?: string[];
  execution_mode?: ExecutionMode;
  agent_target?: string | null;
}): Subtask {
  return {
    id: input.id,
    label: input.label,
    status: "todo",
    done: false,
    assignee: null,
    blocked_by: null,
    blocked_reason: null,
    completed_at: null,
    completed_by: null,
    priority: input.priority ?? "P2",
    notes: null,
    prompt: null,
    context_files: [],
    reference_docs: [],
    acceptance_criteria: input.acceptance_criteria ?? [],
    constraints: input.constraints ?? [],
    agent_target: input.agent_target ?? null,
    execution_mode: input.execution_mode ?? "agent",
    depends_on: input.depends_on ?? [],
    last_run_id: null,
    builder_prompt: null,
  };
}

export function makeLogEntry(input: {
  agent_id: string;
  action: string;
  target_type: AgentLogEntry["target_type"];
  target_id: string;
  description: string;
  tags?: string[];
}): AgentLogEntry {
  const timestamp = nowIso();
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    id: `log_${Date.now()}_${suffix}`,
    agent_id: input.agent_id,
    action: input.action,
    target_type: input.target_type,
    target_id: input.target_id,
    description: input.description,
    timestamp,
    tags: Array.from(new Set(input.tags ?? [])),
  };
}

export function isMilestoneComplete(milestone: Milestone): boolean {
  return milestone.subtasks.length > 0 && milestone.subtasks.every((task) => task.status === "done");
}

export function formatStatus(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    todo: "قيد الانتظار",
    in_progress: "قيد التنفيذ",
    review: "للمراجعة",
    done: "منجز",
    blocked: "متوقف",
  };
  return labels[status];
}
