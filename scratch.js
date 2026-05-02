const fs = require('fs');
const p = 'app/dashboard/manager/users/page.tsx';
let content = fs.readFileSync(p, 'utf8');

const search = `      </div>
      {user.role === "client" ? (`;

const replace = `      </div>
      {user.role === "technician" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">جدول العمل</h3>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
            تحديد أوقات عمل الفني والساعات المسموح له بتسجيل حضوره فيها.
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface)] disabled:opacity-60"
            href={\`/dashboard/manager/users/\${user.uid}/schedule\`}
          >
            إدارة جدول العمل
          </Link>
        </div>
      ) : null}
      {user.role === "client" ? (`;

const searchLF = search.replace(/\r\n/g, '\n');
const searchCRLF = searchLF.replace(/\n/g, '\r\n');

if (content.includes(searchLF)) {
  fs.writeFileSync(p, content.replace(searchLF, replace.replace(/\r\n/g, '\n')));
  console.log('replaced LF');
} else if (content.includes(searchCRLF)) {
  fs.writeFileSync(p, content.replace(searchCRLF, replace.replace(/\n/g, '\r\n')));
  console.log('replaced CRLF');
} else {
  console.log('not found');
}
