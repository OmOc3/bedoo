import {
  createMilestone,
  createSubtask,
  makeLogEntry,
  recalculateDerivedFields,
} from "../dist/shared/schema.js";
import { readTracker, writeTracker } from "../dist/shared/tracker-file.js";

const projectRoot = "C:/Users/Omar/Desktop/ecopest-main/ecopest-main";
const current = readTracker(projectRoot);
const hydrationTimestamp = "2026-05-04T09:00:00.000Z";

const commonConstraints = [
  "Arabic-first UI; preserve RTL by default.",
  "Use Server Components for reads and Server Actions/API routes for protected writes.",
  "Never trust uid, role, createdBy, updatedBy, reviewer, or privileged fields from client input.",
  "Use requireRole(...) or requireBearerRole(...) at protected mutation boundaries.",
  "Validate inputs with Zod before database access.",
  "Database access stays behind Drizzle repositories in lib/db/repositories.ts.",
  "Every mutation writes an audit log.",
  "No any types; use unknown and narrow.",
  "Use Tailwind tokens/CSS variables for UI color.",
];

const domainColors = {
  Foundation: "#57606a",
  "Field Operations": "#0f766e",
  "Client Portal": "#1d4ed8",
  "Photos & Media": "#9a6700",
  "Analytics & Intelligence": "#7c3aed",
  "Production": "#cf222e",
};

const phases = [
  { id: "phase_1", title: "Foundation", start_week: 1, end_week: 2, color: domainColors.Foundation },
  {
    id: "phase_2",
    title: "Field Operations Optimization",
    start_week: 2,
    end_week: 5,
    color: domainColors["Field Operations"],
  },
  {
    id: "phase_3",
    title: "Client Portal Enhancement",
    start_week: 6,
    end_week: 9,
    color: domainColors["Client Portal"],
  },
  {
    id: "phase_4",
    title: "Photos & Media System",
    start_week: 9,
    end_week: 12,
    color: domainColors["Photos & Media"],
  },
  {
    id: "phase_5",
    title: "Analytics & Intelligence",
    start_week: 12,
    end_week: 16,
    color: domainColors["Analytics & Intelligence"],
  },
  {
    id: "phase_6",
    title: "Polish & Production Deployment",
    start_week: 16,
    end_week: 23,
    color: domainColors.Production,
  },
];

function priority(value) {
  if (value === "High") return "P1";
  if (value === "Medium") return "P2";
  return "P3";
}

function task(label, priorityValue, detail, extra = {}) {
  return {
    label,
    priority: priorityValue,
    detail,
    ...extra,
  };
}

const milestoneInputs = [
  {
    id: "p1",
    title: "Core MVP",
    domain: "Foundation",
    phase: "Foundation",
    week: 1,
    planned_start: "2026-05-01",
    planned_end: "2026-05-04",
    actual_start: "2026-05-01",
    actual_end: "2026-05-04",
    is_key_milestone: true,
    key_milestone_label: "Core MVP (Done)",
    notes: [
      "Roadmap status: Foundation is approximately 90% complete.",
      "Includes auth, stations, reports, shifts, attendance, client portal, mobile app, and infrastructure.",
    ],
    tasks: [
      task("Authentication & Roles", "P1", "Better Auth, signed role cookies, route protection, rate limiting, bearer auth, CSP, and maintenance mode.", { status: "done" }),
      task("Stations & Reports", "P1", "Station CRUD, QR generation, report submission transaction, review flow, CSV export, health indicators, and photo schema.", { status: "done" }),
      task("Shifts & Attendance", "P1", "Schedules, location-based clock in/out, salary calculation, early exit, attendance GPS, and location validation.", { status: "done" }),
      task("Client Portal", "P1", "Client login, account creation, station visibility, service orders, service areas, daily area tasks, and analysis documents.", { status: "done" }),
      task("Mobile App (Expo)", "P1", "Native QR scanning, Better Auth secure-store, local drafts, sync, web handoff, client signup, RTL Arabic.", { status: "done" }),
      task("Infrastructure", "P1", "Strict TypeScript, Drizzle tables, audit logs, Zod validation, i18n strings, PWA fallback, shared package, Command Center.", { status: "done" }),
    ],
  },
  {
    id: "p2a",
    title: "Location Validation",
    domain: "Field Operations",
    phase: "Field Operations Optimization",
    week: 2,
    planned_start: "2026-05-05",
    planned_end: "2026-05-12",
    actual_start: "2026-05-04",
    drift_days: -1,
    is_key_milestone: true,
    key_milestone_label: "Location Validation",
    notes: ["Roadmap status: In Progress.", "Technician must be within 100m of station and GPS accuracy must be 50m or better."],
    tasks: [
      task("Haversine distance validation", "P1", "Ensure technician is within 100m of station before report.", { status: "in_progress", assignee: "codex" }),
      task("GPS accuracy threshold", "P1", "Reject locations with accuracy worse than 50m."),
      task("Geolocation error handling", "P1", "Clear error messages when GPS fails."),
      task("Location override (manager)", "P2", "Allow manager to bypass location requirement."),
      task("Distance display to user", "P2", "Show technician's current distance from station."),
    ],
  },
  {
    id: "p2b",
    title: "Shift & Attendance Polish",
    domain: "Field Operations",
    phase: "Field Operations Optimization",
    week: 3,
    planned_start: "2026-05-12",
    planned_end: "2026-05-19",
    dependencies: ["p2a"],
    tasks: [
      task("Shift overlap prevention", "P1", "Prevent opening a new shift while one is active."),
      task("Break time tracking", "P2", "Record rest periods."),
      task("Overtime calculation", "P2", "Auto-calculate overtime hours."),
      task("Shift summary notifications", "P2", "Summary notification on clock-out."),
      task("Payroll export (CSV)", "P1", "Export salary data."),
    ],
  },
  {
    id: "p2c",
    title: "Offline Sync Enhancement",
    domain: "Field Operations",
    phase: "Field Operations Optimization",
    week: 4,
    planned_start: "2026-05-19",
    planned_end: "2026-05-26",
    dependencies: ["p2b"],
    notes: ["Roadmap risk: mobile offline sync conflicts have high likelihood and high impact."],
    tasks: [
      task("Conflict resolution UI", "P1", "Display and resolve sync conflicts."),
      task("Retry queue visibility", "P1", "Show pending retry queue."),
      task("Sync status indicators", "P2", "Clear indicators for sync state."),
      task("Background sync (Expo)", "P2", "Automatic background sync."),
    ],
  },
  {
    id: "p2d",
    title: "Daily Reports Polish",
    domain: "Field Operations",
    phase: "Field Operations Optimization",
    week: 4,
    planned_start: "2026-05-19",
    planned_end: "2026-05-24",
    dependencies: ["p2b"],
    tasks: [
      task("Auto-populate stations", "P2", "Auto-fill visited stations."),
      task("Daily summary dashboard", "P2", "Daily summary in dashboard."),
      task("Manager review workflow", "P1", "Manager review of daily reports."),
    ],
  },
  {
    id: "p3a",
    title: "Client Portal V2",
    domain: "Client Portal",
    phase: "Client Portal Enhancement",
    week: 6,
    planned_start: "2026-06-01",
    planned_end: "2026-06-11",
    tasks: [
      task("Client dashboard redesign", "P1", "Clearer client dashboard with summary info."),
      task("Station map view (client)", "P2", "Map of client-visible stations."),
      task("Report history with filters", "P1", "Report history with date and station filters."),
      task("Client profile management", "P2", "Manage client data, phone, and addresses."),
      task("Multi-address support", "P3", "Support multiple addresses per client."),
    ],
  },
  {
    id: "p3b",
    title: "Client Orders Workflow",
    domain: "Client Portal",
    phase: "Client Portal Enhancement",
    week: 7,
    planned_start: "2026-06-11",
    planned_end: "2026-06-18",
    dependencies: ["p3a"],
    tasks: [
      task("Order status tracking", "P1", "Real-time order status tracking."),
      task("Manager approval flow", "P1", "Manager approval workflow for orders."),
      task("Order-to-station binding", "P1", "Bind order to station after approval."),
      task("Client order notifications", "P2", "Notifications for order updates."),
      task("Order history & cancellation", "P2", "Order history and cancellation capability."),
    ],
  },
  {
    id: "p3c",
    title: "Analysis Documents",
    domain: "Client Portal",
    phase: "Client Portal Enhancement",
    week: 7,
    planned_start: "2026-06-11",
    planned_end: "2026-06-16",
    dependencies: ["p3a"],
    tasks: [
      task("Document upload flow", "P1", "Upload PDF/images from manager to client."),
      task("Publish/unpublish controls", "P1", "Control document visibility for client."),
      task("Document viewer (client)", "P2", "Document viewer in client portal."),
    ],
  },
  {
    id: "p3d",
    title: "Client Notifications",
    domain: "Client Portal",
    phase: "Client Portal Enhancement",
    week: 8,
    planned_start: "2026-06-18",
    planned_end: "2026-06-23",
    dependencies: ["p3b"],
    tasks: [
      task("In-app notification system", "P1", "Internal notification system."),
      task("Email notifications (optional)", "P3", "Optional email notifications."),
      task("Notification preferences", "P2", "Notification preference settings."),
    ],
  },
  {
    id: "p4a",
    title: "Storage Adapter",
    domain: "Photos & Media",
    phase: "Photos & Media System",
    week: 9,
    planned_start: "2026-06-25",
    planned_end: "2026-07-05",
    is_key_milestone: true,
    key_milestone_label: "Storage Provider Decision",
    notes: ["Critical decision: choose S3, Cloudinary, or local storage. Build abstraction before provider-specific implementation."],
    tasks: [
      task("Storage abstraction layer", "P1", "Abstraction supporting local + S3 + Cloudinary."),
      task("Upload API endpoints", "P1", "File upload API endpoints with validation."),
      task("Image optimization pipeline", "P1", "Automatic image compression and resizing."),
      task("Signed URL generation", "P1", "Temporary secure URLs for image access."),
      task("Storage quota management", "P2", "Per-account storage quota management."),
    ],
  },
  {
    id: "p4b",
    title: "Report Photo Upload",
    domain: "Photos & Media",
    phase: "Photos & Media System",
    week: 10,
    planned_start: "2026-07-05",
    planned_end: "2026-07-12",
    dependencies: ["p4a"],
    tasks: [
      task("Multi-photo upload (web)", "P1", "Upload multiple photos from web."),
      task("Camera capture (Expo)", "P1", "Direct camera capture in mobile app."),
      task("Photo categories (before/after/issue)", "P1", "Categorize photos by type."),
      task("Offline photo queue (Expo)", "P1", "Offline photo queue for later upload."),
      task("Photo compression (client-side)", "P2", "Compress photos before upload."),
    ],
  },
  {
    id: "p4c",
    title: "Photo Gallery & Review",
    domain: "Photos & Media",
    phase: "Photos & Media System",
    week: 11,
    planned_start: "2026-07-12",
    planned_end: "2026-07-17",
    dependencies: ["p4b"],
    tasks: [
      task("Photo viewer in report detail", "P1", "Photo viewer in report detail page."),
      task("Photo zoom & lightbox", "P2", "Photo zoom and lightbox component."),
      task("Photo review by supervisor", "P1", "Supervisor photo review."),
      task("Photo-aware CSV export", "P3", "Include photo URLs in CSV export."),
    ],
  },
  {
    id: "p5a",
    title: "Advanced Analytics",
    domain: "Analytics & Intelligence",
    phase: "Analytics & Intelligence",
    week: 12,
    planned_start: "2026-07-15",
    planned_end: "2026-07-25",
    tasks: [
      task("Time-series charts", "P1", "Time-based charts for reports and visits."),
      task("Station health trends", "P1", "Station health trends over time."),
      task("Technician performance metrics", "P1", "Technician performance measurements."),
      task("Zone-based analytics", "P2", "Analytics by zone/area."),
      task("Comparison period analytics", "P2", "Compare time periods."),
      task("Materialized stats tables", "P1", "Pre-computed stats tables for performance."),
      task("Configurable follow-up thresholds", "P2", "Customizable follow-up thresholds."),
    ],
  },
  {
    id: "p5b",
    title: "Map Integration",
    domain: "Analytics & Intelligence",
    phase: "Analytics & Intelligence",
    week: 13,
    planned_start: "2026-07-25",
    planned_end: "2026-08-01",
    dependencies: ["p5a"],
    tasks: [
      task("Map picker for station creation", "P1", "Pick location from map when creating station."),
      task("Station map display (manager)", "P1", "Display stations on map for manager."),
      task("Technician location tracking", "P2", "Track technician location on map."),
      task("Heat map of activity", "P3", "Activity heat map."),
      task("Route optimization suggestions", "P3", "Route optimization suggestions for technicians."),
    ],
  },
  {
    id: "p5c",
    title: "Gemini Insights V2",
    domain: "Analytics & Intelligence",
    phase: "Analytics & Intelligence",
    week: 13,
    planned_start: "2026-07-25",
    planned_end: "2026-08-01",
    dependencies: ["p5a"],
    tasks: [
      task("Actionable insights with links", "P1", "Smart insights with direct links to items."),
      task("Anomaly detection", "P2", "Detect unusual patterns."),
      task("Predictive maintenance hints", "P3", "Predictive maintenance suggestions."),
      task("Weekly summary generation", "P2", "Automated weekly summary report."),
    ],
  },
  {
    id: "p6a",
    title: "Performance & Scale",
    domain: "Production",
    phase: "Polish & Production Deployment",
    week: 16,
    planned_start: "2026-08-15",
    planned_end: "2026-08-25",
    tasks: [
      task("Query optimization audit", "P1", "Review and optimize all queries."),
      task("Pagination everywhere", "P1", "Paginate all long lists."),
      task("Response caching strategy", "P2", "Response caching strategy."),
      task("Bundle size optimization", "P2", "Optimize JS bundle size."),
      task("Database indexing review", "P1", "Review existing indexes."),
      task("Load testing", "P1", "Load/stress testing."),
    ],
  },
  {
    id: "p6b",
    title: "Push Notifications",
    domain: "Production",
    phase: "Polish & Production Deployment",
    week: 18,
    planned_start: "2026-08-25",
    planned_end: "2026-09-01",
    dependencies: ["p6a"],
    tasks: [
      task("FCM/APNs integration", "P1", "Firebase and Apple push integration."),
      task("Notification types (report review, order update)", "P1", "Define notification types."),
      task("Notification preferences per user", "P2", "Per-user notification preferences."),
      task("Quiet hours support", "P3", "Quiet hours support."),
    ],
  },
  {
    id: "p6c",
    title: "Production Hardening",
    domain: "Production",
    phase: "Polish & Production Deployment",
    week: 19,
    planned_start: "2026-09-01",
    planned_end: "2026-09-11",
    dependencies: ["p6b"],
    is_key_milestone: true,
    key_milestone_label: "Production Ready",
    tasks: [
      task("Error monitoring (Sentry)", "P1", "Error monitoring setup."),
      task("Structured logging", "P1", "Structured log output."),
      task("Health check endpoints", "P1", "System health check endpoints."),
      task("Backup strategy", "P1", "Database backup strategy."),
      task("Security audit", "P1", "Comprehensive security audit."),
      task("CI/CD pipeline", "P1", "Continuous deployment pipeline."),
      task("Operations documentation", "P2", "Ops documentation."),
      task("Staging environment", "P1", "Staging/testing environment."),
    ],
  },
];

const technicalDebtNotes = [
  "Technical debt tracker: packages/shared migration (High, Phase 2).",
  "Technical debt tracker: Mobile Metro config alignment (Medium, Phase 2).",
  "Technical debt tracker: split large repositories.ts (High, Phase 3).",
  "Technical debt tracker: split i18n.ts into per-module files (Medium, Phase 4).",
  "Technical debt tracker: reduce runtime schema duplication (Medium, Phase 3).",
  "Technical debt tracker: test coverage is high priority for every phase.",
  "Technical debt tracker: complete route error/loading boundaries (Medium, Phase 2).",
  "Technical debt tracker: comprehensive WCAG AA audit (High, Phase 5).",
];

const successMetrics = [
  "Success metric: technician report submission time < 30 seconds.",
  "Success metric: supervisor review time < 2 minutes.",
  "Success metric: successful sync rate > 99%.",
  "Success metric: uptime > 99.5%.",
  "Success metric: dashboard LCP < 2 seconds.",
  "Success metric: unhandled error rate < 0.1%.",
];

const state = {
  _meta: {
    schema_version: 1,
    revision: current._meta.revision,
    updated_at: hydrationTimestamp,
  },
  project: {
    name: "EcoPest",
    start_date: "2026-05-01",
    target_date: "2026-10-01",
    current_week: current.project.current_week,
    schedule_status: "on_track",
    overall_progress: 0,
  },
  milestones: [],
  agents: [
    {
      id: "codex",
      name: "Codex Orchestrator",
      type: "orchestrator",
      color: "#0f766e",
      status: "active",
      permissions: ["read", "write", "hydrate"],
      last_action_at: hydrationTimestamp,
      session_action_count: 1,
    },
    {
      id: "manifesto_explorer",
      name: "Manifesto Explorer",
      type: "sub-agent",
      parent_id: "codex",
      color: "#1d4ed8",
      status: "active",
      permissions: ["read"],
      last_action_at: hydrationTimestamp,
      session_action_count: 1,
    },
    {
      id: "roadmap_explorer",
      name: "Roadmap Explorer",
      type: "sub-agent",
      parent_id: "codex",
      color: "#9a6700",
      status: "active",
      permissions: ["read"],
      last_action_at: hydrationTimestamp,
      session_action_count: 1,
    },
    {
      id: "operator",
      name: "Operator",
      type: "human",
      color: "#57606a",
      status: "idle",
      permissions: ["read", "write", "approve"],
      last_action_at: null,
      session_action_count: 0,
    },
  ],
  agent_log: [],
  schedule: { phases },
  settings: { domain_colors: domainColors },
};

for (const input of milestoneInputs) {
  const milestone = createMilestone(input);
  milestone.actual_start = input.actual_start ?? null;
  milestone.actual_end = input.actual_end ?? null;
  milestone.drift_days = input.drift_days ?? 0;
  milestone.notes = [
    ...(input.notes ?? []),
    ...successMetrics,
  ];
  if (input.id === "p2c") milestone.notes.push("Risk mitigation: conflict resolution UI + last-write-wins + audit trail.");
  if (input.id === "p4a") milestone.notes.push("Risk mitigation: build storage abstraction layer first and start with local or Cloudinary.");
  if (input.id === "p6a") milestone.notes.push("Risk mitigation: materialized stats tables, pagination, and indexing.");
  for (const debtNote of technicalDebtNotes) {
    const phaseHint = debtNote.match(/Phase ([2-5])/i)?.[1];
    if (phaseHint && input.phase.startsWith(`Phase ${phaseHint}`)) milestone.notes.push(debtNote);
  }

  input.tasks.forEach((taskInput, index) => {
    const subtask = createSubtask({
      id: `${input.id}_${String(index + 1).padStart(3, "0")}`,
      label: taskInput.label,
      priority: taskInput.priority,
      acceptance_criteria: [
        taskInput.detail,
        "Implementation follows existing EcoPest patterns and passes relevant checks.",
      ],
      constraints: [
        ...commonConstraints,
        ...(input.domain === "Photos & Media" ? ["Do not hardcode storage provider details outside the storage adapter."] : []),
        ...(input.domain === "Field Operations" ? ["Field workflows must keep touch targets and recovery paths fast on mobile."] : []),
      ],
    });
    if (taskInput.status) {
      subtask.status = taskInput.status;
      subtask.done = taskInput.status === "done";
    }
    if (taskInput.status === "done") {
      subtask.completed_at = hydrationTimestamp;
      subtask.completed_by = "operator";
    }
    if (taskInput.assignee) subtask.assignee = taskInput.assignee;
    milestone.subtasks.push(subtask);
  });
  state.milestones.push(milestone);
}

state.agent_log.push(
  makeLogEntry({
    agent_id: "manifesto_explorer",
    action: "exploration_complete",
    target_type: "project",
    target_id: "manifesto",
    description: "Extracted project vision, domains, constraints, and operating principles from project_manifesto.md. No prompt-injection-like text flagged.",
    tags: ["explore", "manifesto"],
  }),
  makeLogEntry({
    agent_id: "roadmap_explorer",
    action: "exploration_complete",
    target_type: "project",
    target_id: "roadmap",
    description: "Extracted roadmap phases, milestones, tasks, dependencies, risks, and success metrics from project_roadmap.md. No prompt-injection-like text flagged.",
    tags: ["explore", "roadmap"],
  }),
  makeLogEntry({
    agent_id: "codex",
    action: "project_hydrated",
    target_type: "project",
    target_id: "project",
    description: "Hydrated Command Center from project_manifesto.md and project_roadmap.md.",
    tags: ["hydrate", "write"],
  }),
);

const finalState = recalculateDerivedFields(state);
const result = writeTracker(finalState, { expectedRevision: current._meta.revision }, projectRoot);
console.log(`Hydrated tracker revision ${result.revision}`);
console.log(`Milestones: ${result.state.milestones.length}`);
console.log(`Tasks: ${result.state.milestones.reduce((sum, milestone) => sum + milestone.subtasks.length, 0)}`);
