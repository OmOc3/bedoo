import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Workaround for a Windows build-time ENOENT when Next tries
// to write diagnostics under `.next/diagnostics`.
const diagnosticsDir = join(process.cwd(), ".next", "diagnostics");
mkdirSync(diagnosticsDir, { recursive: true });

