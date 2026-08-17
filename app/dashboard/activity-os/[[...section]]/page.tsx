"use client";

import {
  useParams,
} from "next/navigation";

import ActivityOSPro from "../components/ActivityOSPro";


const allowed = new Set([
  "overview",
  "calendar",
  "bookings",
  "products",
  "operations",
  "guests",
  "partners",
  "staff",
  "finance",
  "marketplace",
  "reports",
  "settings",
]);


export default function ActivityOSPage() {

  const params =
    useParams<{
      section?: string[];
    }>();


  const raw =
    Array.isArray(
      params.section
    )
      ? params.section[0]
      : undefined;


  const section =
    raw &&
    allowed.has(raw)
      ? raw
      : "overview";


  return (
    <ActivityOSPro
      section={
        section as any
      }
    />
  );
}
