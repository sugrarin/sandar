"use client";

import type { ReactNode } from "react";
import { AccountSegmentedNav } from "@/components/AccountSegmentedNav";

export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <section className="screen screen--active">
      <AccountSegmentedNav />
      {children}
    </section>
  );
}
