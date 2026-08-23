import type { ReactNode } from "react";

import TourOsProfessionalShell from "../tour-os-ui/TourOsProfessionalShell";

import "../tour-os-ui/tour-os-professional.css";

export default function ToursLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-tour-os-shell
      className="
        [&_.tour-os-label]:text-[11px]
        [&_.tour-os-label]:font-bold
        [&_.tour-os-label]:tracking-[0.08em]
        [&_.tour-os-label]:text-slate-400

        [&_.tour-os-input]:min-h-11
        [&_.tour-os-input]:text-[13px]
        [&_.tour-os-input]:font-semibold

        [&_.tour-os-card]:rounded-2xl
        [&_.tour-os-card]:border
        [&_.tour-os-card]:border-white/[.08]
        [&_.tour-os-card]:bg-[linear-gradient(145deg,rgba(10,23,35,.96),rgba(3,8,14,.98))]
        [&_.tour-os-card]:shadow-[0_16px_50px_rgba(0,0,0,.18)]
      "
    >
      <TourOsProfessionalShell>{children}</TourOsProfessionalShell>
    </div>
  );
}
