#!/usr/bin/env node
import { coerceCliValue, handleTool } from "./tools.js";

interface ParsedArgs {
  positional: string[];
  flags: Record<string, unknown>;
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, unknown> = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith("--")) {
      positional.push(current);
      continue;
    }

    const key = current.slice(2).replace(/-/g, "_");
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = coerceCliValue(next);
    index += 1;
  }

  return { positional, flags };
}

function splitList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item));
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function usage(): string {
  return [
    "Command Center CLI",
    "",
    "Usage:",
    "  command-center get-project-status",
    "  command-center get-task-context <task_id>",
    "  command-center list-tasks [--milestone-id id] [--status todo] [--domain name]",
    "  command-center create-milestone <id> <title> [--domain name] [--week 1] [--phase name]",
    "  command-center add-milestone-task <milestone_id> <label> [--priority P2]",
    "  command-center start-task <task_id> [--agent-id codex]",
    "  command-center complete-task <task_id> <summary> [--agent-id codex]",
    "  command-center approve-task <task_id> --operator-confirm [--operator-id Omar]",
    "  command-center register-agent <id> <name> <type> --permissions read,write",
    "  command-center tool <tool_name> '{\"json\":\"args\"}'",
  ].join("\n");
}

function jsonArg(value: string | undefined): unknown {
  if (!value) return {};
  return JSON.parse(value);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  const parsed = parseArgs(rest);
  let toolName = "";
  let args: Record<string, unknown> = {};

  switch (command) {
    case "tool": {
      const [name, json] = parsed.positional;
      if (!name) throw new Error("tool name is required");
      toolName = name;
      args = jsonArg(json) as Record<string, unknown>;
      break;
    }
    case "get-project-status":
      toolName = "get_project_status";
      break;
    case "get-task-context":
      toolName = "get_task_context";
      args = { task_id: parsed.positional[0] };
      break;
    case "get-task-summary":
      toolName = "get_task_summary";
      args = { task_id: parsed.positional[0] };
      break;
    case "list-tasks":
      toolName = "list_tasks";
      args = {
        milestone_id: parsed.flags.milestone_id,
        status: parsed.flags.status,
        domain: parsed.flags.domain,
      };
      break;
    case "list-agents":
      toolName = "list_agents";
      break;
    case "get-activity-feed":
      toolName = "get_activity_feed";
      args = {
        agent_id: parsed.flags.agent_id,
        limit: parsed.flags.limit,
      };
      break;
    case "create-milestone":
      toolName = "create_milestone";
      args = {
        id: parsed.positional[0],
        title: parsed.positional[1],
        domain: parsed.flags.domain,
        week: parsed.flags.week,
        phase: parsed.flags.phase,
        planned_start: parsed.flags.planned_start,
        planned_end: parsed.flags.planned_end,
        dependencies: splitList(parsed.flags.dependencies),
        is_key_milestone: parsed.flags.is_key_milestone,
        key_milestone_label: parsed.flags.key_milestone_label,
        agent_id: parsed.flags.agent_id,
      };
      break;
    case "add-milestone-task":
      toolName = "add_milestone_task";
      args = {
        milestone_id: parsed.positional[0],
        label: parsed.positional[1],
        priority: parsed.flags.priority,
        acceptance_criteria: splitList(parsed.flags.acceptance_criteria),
        constraints: splitList(parsed.flags.constraints),
        depends_on: splitList(parsed.flags.depends_on),
        execution_mode: parsed.flags.execution_mode,
        agent_target: parsed.flags.agent_target,
        agent_id: parsed.flags.agent_id,
      };
      break;
    case "start-task":
      toolName = "start_task";
      args = { task_id: parsed.positional[0], agent_id: parsed.flags.agent_id };
      break;
    case "complete-task":
      toolName = "complete_task";
      args = {
        task_id: parsed.positional[0],
        summary: parsed.positional[1],
        agent_id: parsed.flags.agent_id,
      };
      break;
    case "approve-task":
      toolName = "approve_task";
      args = {
        task_id: parsed.positional[0],
        feedback: parsed.flags.feedback,
        operator_id: parsed.flags.operator_id,
        operator_confirm: parsed.flags.operator_confirm,
      };
      break;
    case "reject-task":
      toolName = "reject_task";
      args = {
        task_id: parsed.positional[0],
        feedback: parsed.positional[1] ?? parsed.flags.feedback,
        operator_id: parsed.flags.operator_id,
        operator_confirm: parsed.flags.operator_confirm,
      };
      break;
    case "register-agent":
      toolName = "register_agent";
      args = {
        agent_id: parsed.positional[0],
        name: parsed.positional[1],
        type: parsed.positional[2],
        permissions: splitList(parsed.flags.permissions) ?? [],
        color: parsed.flags.color,
        parent_id: parsed.flags.parent_id,
      };
      break;
    default:
      throw new Error(`Unknown command '${command}'\n\n${usage()}`);
  }

  const response = await handleTool(toolName, args);
  for (const item of response.content) {
    console.log(item.text);
  }
  if (response.isError) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
