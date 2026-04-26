import type { ReactNode } from "react";
import { CopyrightFooter } from "@/components/legal/copyright-footer";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CopyrightFooter />
    </>
  );
}
