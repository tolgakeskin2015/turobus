import type {
  ReactNode,
} from "react";

import TourOsProfessionalShell from "../tour-os-ui/TourOsProfessionalShell";

import "../tour-os-ui/tour-os-professional.css";


export default function TourCreateLayout({
  children,
}: {
  children:
    ReactNode;
}) {

  return (
    <TourOsProfessionalShell>
      {children}
    </TourOsProfessionalShell>
  );

}
