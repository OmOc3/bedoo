# Command Center Workflow

The command center uses `project-tracker.json` as the single source of truth. The Electron app watches it, the MCP server mutates it through tools, and both write through the same revision-aware atomic writer.

## Lifecycle

| From | To | Tool / UI Action | Owner |
| --- | --- | --- | --- |
| `todo` | `in_progress` | `start_task` or board move | Agent or operator |
| `in_progress` | `review` | `complete_task` or board move | Agent or operator |
| `review` | `done` | `approve_task` or board move to Done | Operator |
| `review` | `in_progress` | `reject_task` | Operator |
| any active state | `blocked` | `block_task` or board move | Agent or operator |
| `blocked` | `todo` / `in_progress` | `unblock_task` | Agent or operator |
| any | `todo` | `reset_task` | Operator |

Tasks do not move directly from implementation to done. If a UI move requests `done` from any state except `review`, the app sends the task to `review` instead.

## Operator-Only MCP Calls

The stdio MCP transport does not provide strong caller identity. To reduce accidental approvals, operator-only tools require `operator_confirm: true`:

- `approve_task`
- `reject_task`
- `reset_task`

Agents must not pass this flag unless the user explicitly instructs them to perform the operator action.

## Tracker Write Rules

- The tracker contains `_meta.revision`.
- Every write reads the current revision under a lock.
- The writer rejects stale writes when an expected revision is supplied.
- Writes go to a temporary file and then atomically rename over `project-tracker.json`.
- `done` is derived from `status === "done"` during normalization.

## Hydration Sequence

After the skeleton exists, populate it from a manifesto and roadmap:

1. `update_project` sets project name and date range.
2. `create_phase` creates schedule phases.
3. `set_domain_color` optionally fixes domain colors.
4. `create_milestone` creates milestones with week, phase, dependencies, dates, and key milestone flags.
5. `add_milestone_task` adds subtasks and acceptance criteria.
6. `set_milestone_dependencies` resolves cross-milestone dependency lists.
7. `register_agent` records the agent roster.

## Local Commands

Run from the repo root with `npm.cmd` on this Windows machine:

```powershell
npm.cmd --prefix packages/command-center run build
npm.cmd --prefix packages/command-center run mcp:serve
npm.cmd --prefix packages/command-center run dev
```

CLI examples:

```powershell
npm.cmd --prefix packages/command-center run cli -- get-project-status
npm.cmd --prefix packages/command-center run cli -- create-milestone foundation "Foundation" --domain platform --week 1
npm.cmd --prefix packages/command-center run cli -- add-milestone-task foundation "Create tracker schema"
```
