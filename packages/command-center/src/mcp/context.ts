import fs from "node:fs";
import path from "node:path";
import {
  allTasks,
  findTask,
  formatStatus,
  getDomainColor,
} from "../shared/schema.js";
import { getTrackerPath, resolveProjectRoot } from "../shared/tracker-file.js";
import type { Milestone, Subtask, TrackerState } from "../shared/schema.js";

function pct(done: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((done / total) * 100)}%`;
}

function progressFor(milestone: Milestone): { done: number; total: number; pct: string } {
  const total = milestone.subtasks.length;
  const done = milestone.subtasks.filter((task) => task.status === "done").length;
  return { done, total, pct: pct(done, total) };
}

function readOptionalProjectFile(filePath: string | null): string | null {
  if (!filePath) return null;
  const root = resolveProjectRoot();
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath);
  if (!resolved.startsWith(root)) return null;
  try {
    return fs.readFileSync(resolved, "utf8");
  } catch {
    return null;
  }
}

function taskLine(task: Subtask): string {
  const done = task.status === "done" ? "x" : " ";
  const assignee = task.assignee ? ` @${task.assignee}` : "";
  return `- [${done}] ${task.id} ${formatStatus(task.status)} ${task.priority}${assignee}: ${task.label}`;
}

function revisionHistory(state: TrackerState, taskId: string): string {
  const revisions = state.agent_log.filter(
    (entry) => entry.target_id === taskId && entry.action === "revision_requested",
  );
  if (revisions.length === 0) return "No revision requests.";
  return revisions
    .map((entry, index) => `${index + 1}. ${entry.timestamp} - ${entry.description}`)
    .join("\n");
}

export function buildTaskContext(state: TrackerState, subtask: Subtask, milestone: Milestone): string {
  const milestoneProgress = progressFor(milestone);
  const builderPrompt = readOptionalProjectFile(subtask.builder_prompt);
  const upstream = milestone.dependencies
    .map((dependencyId) => state.milestones.find((item) => item.id === dependencyId))
    .filter((item): item is Milestone => Boolean(item))
    .map((dependency) => {
      const progress = progressFor(dependency);
      return `- ${dependency.id}: ${dependency.title} (${progress.done}/${progress.total}, ${progress.pct})`;
    });
  const downstream = state.milestones
    .filter((item) => item.dependencies.includes(milestone.id))
    .map((item) => `- ${item.id}: ${item.title}`);

  return [
    `# Task Context: ${subtask.id}`,
    "",
    "## Task Metadata",
    `- Label: ${subtask.label}`,
    `- Status: ${formatStatus(subtask.status)} (${subtask.status})`,
    `- Priority: ${subtask.priority}`,
    `- Execution mode: ${subtask.execution_mode}`,
    `- Assignee: ${subtask.assignee ?? "unassigned"}`,
    `- Blocked reason: ${subtask.blocked_reason ?? "none"}`,
    `- Notes: ${subtask.notes ?? "none"}`,
    "",
    "## Acceptance Criteria",
    subtask.acceptance_criteria.length > 0
      ? subtask.acceptance_criteria.map((item) => `- [ ] ${item}`).join("\n")
      : "- [ ] No acceptance criteria recorded.",
    "",
    "## Constraints",
    subtask.constraints.length > 0 ? subtask.constraints.map((item) => `- ${item}`).join("\n") : "- None recorded.",
    "",
    "## Context Files",
    subtask.context_files.length > 0
      ? subtask.context_files.map((item) => `- ${item}`).join("\n")
      : "- None recorded.",
    "",
    "## Reference Docs",
    subtask.reference_docs.length > 0
      ? subtask.reference_docs.map((item) => `- ${item}`).join("\n")
      : "- None recorded.",
    "",
    "## Revision History",
    revisionHistory(state, subtask.id),
    "",
    "## Builder Prompt",
    builderPrompt ? `\n${builderPrompt}\n` : "No builder prompt file found.",
    "",
    "## Milestone",
    `- ID: ${milestone.id}`,
    `- Title: ${milestone.title}`,
    `- Domain: ${milestone.domain}`,
    `- Phase: ${milestone.phase}`,
    `- Week: ${milestone.week}`,
    `- Planned: ${milestone.planned_start ?? "unset"} to ${milestone.planned_end ?? "unset"}`,
    `- Drift: ${milestone.drift_days} days`,
    `- Progress: ${milestoneProgress.done}/${milestoneProgress.total} (${milestoneProgress.pct})`,
    "",
    "## Exit Criteria",
    milestone.notes.length > 0 ? milestone.notes.map((item) => `- ${item}`).join("\n") : "- None recorded.",
    "",
    "## Sibling Tasks",
    milestone.subtasks
      .filter((task) => task.id !== subtask.id)
      .map(taskLine)
      .join("\n") || "- No sibling tasks.",
    "",
    "## Upstream Dependencies",
    upstream.join("\n") || "- None.",
    "",
    "## Downstream Milestones",
    downstream.join("\n") || "- None.",
  ].join("\n");
}

export function buildTaskSummary(state: TrackerState, subtask: Subtask, milestone: Milestone): string {
  return [
    `# Task Summary: ${subtask.id}`,
    "",
    `- Label: ${subtask.label}`,
    `- Status: ${formatStatus(subtask.status)} (${subtask.status})`,
    `- Domain: ${milestone.domain}`,
    `- Priority: ${subtask.priority}`,
    "",
    "## Acceptance Criteria",
    subtask.acceptance_criteria.length > 0
      ? subtask.acceptance_criteria.map((item) => `- [ ] ${item}`).join("\n")
      : "- [ ] No acceptance criteria recorded.",
    "",
    "## Constraints",
    subtask.constraints.length > 0 ? subtask.constraints.map((item) => `- ${item}`).join("\n") : "- None recorded.",
    "",
    "## Context Files",
    subtask.context_files.length > 0
      ? subtask.context_files.map((item) => `- ${item}`).join("\n")
      : "- None recorded.",
    "",
    "## Revision History",
    revisionHistory(state, subtask.id),
  ].join("\n");
}

export function buildProjectStatus(state: TrackerState): string {
  const tasks = allTasks(state);
  const total = tasks.length;
  const done = tasks.filter(({ subtask }) => subtask.status === "done").length;
  const inProgress = tasks.filter(({ subtask }) => subtask.status === "in_progress").length;
  const blocked = tasks.filter(({ subtask }) => subtask.status === "blocked").length;
  const currentPhase = state.schedule.phases.find(
    (phase) => state.project.current_week >= phase.start_week && state.project.current_week <= phase.end_week,
  );

  return [
    `# Project Status: ${state.project.name}`,
    "",
    `- Tracker: ${getTrackerPath()}`,
    `- Revision: ${state._meta.revision}`,
    `- Start date: ${state.project.start_date}`,
    `- Target date: ${state.project.target_date}`,
    `- Current week: ${state.project.current_week}`,
    `- Current phase: ${currentPhase?.title ?? "none"}`,
    `- Schedule: ${state.project.schedule_status}`,
    `- Progress: ${done}/${total} (${pct(done, total)})`,
    `- In progress: ${inProgress}`,
    `- Blocked: ${blocked}`,
    `- Milestones: ${state.milestones.length}`,
    `- Agents: ${state.agents.length}`,
    `- Log entries: ${state.agent_log.length}`,
  ].join("\n");
}

export function buildMilestoneOverview(milestone: Milestone, state: TrackerState): string {
  const progress = progressFor(milestone);
  const dependencies = milestone.dependencies.map((dependencyId) => {
    const dependency = state.milestones.find((item) => item.id === dependencyId);
    if (!dependency) return `- ${dependencyId}: missing`;
    const dependencyProgress = progressFor(dependency);
    return `- ${dependency.id}: ${dependency.title} (${dependencyProgress.done}/${dependencyProgress.total}, ${dependencyProgress.pct})`;
  });

  return [
    `# Milestone: ${milestone.id}`,
    "",
    `- Title: ${milestone.title}`,
    `- Domain: ${milestone.domain}`,
    `- Domain color: ${getDomainColor(state, milestone.domain)}`,
    `- Phase: ${milestone.phase}`,
    `- Week: ${milestone.week}`,
    `- Planned: ${milestone.planned_start ?? "unset"} to ${milestone.planned_end ?? "unset"}`,
    `- Actual: ${milestone.actual_start ?? "unset"} to ${milestone.actual_end ?? "unset"}`,
    `- Drift: ${milestone.drift_days} days`,
    `- Progress: ${progress.done}/${progress.total} (${progress.pct})`,
    `- Key milestone: ${milestone.is_key_milestone ? milestone.key_milestone_label ?? "yes" : "no"}`,
    "",
    "## Exit Criteria / Notes",
    milestone.notes.length > 0 ? milestone.notes.map((item) => `- ${item}`).join("\n") : "- None recorded.",
    "",
    "## Tasks",
    milestone.subtasks.map(taskLine).join("\n") || "- No tasks.",
    "",
    "## Dependencies",
    dependencies.join("\n") || "- None.",
  ].join("\n");
}

export function getTaskOrThrow(state: TrackerState, taskId: string): { subtask: Subtask; milestone: Milestone } {
  const result = findTask(state, taskId);
  if (!result) throw new Error(`Task '${taskId}' not found in any milestone`);
  return result;
}
