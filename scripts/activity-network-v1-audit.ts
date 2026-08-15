import fs from "node:fs";

const sql = fs.readFileSync(
  "supabase/migrations/20260815170000_activity_network_v1.sql",
  "utf8"
);

const builder = fs.readFileSync(
  "app/dashboard/package-os/builder/components/PackageBuilderV2.tsx",
  "utf8"
);

const booking = fs.readFileSync(
  "app/dashboard/package-os/bookings/[id]/page.tsx",
  "utf8"
);

const checks: Array<[string, boolean]> = [
  ["Staff / pilots", sql.includes("activity_network_staff")],
  ["Slot staff", sql.includes("activity_network_slot_staff")],
  ["Generic activity request", sql.includes("package_quote_activity_network_requests")],
  ["Multiple provider assignment", sql.includes("activity_network_assignments")],
  ["Real capacity reserve", sql.includes("reserved_count")],
  ["Activity Network sync", sql.includes("sync_turobus_activity_network")],
  ["Operation selects provider slot", sql.includes("assign_package_activity_network_slot")],
  ["Release capacity", sql.includes("release_package_activity_network_assignment")],
  ["Provider incoming bookings", sql.includes("get_activity_provider_network_bookings")],
  ["Builder connected", builder.includes("ActivityNetworkPicker")],
  ["Booking operation connected", booking.includes("ActivityNetworkOperationCenter")],
  ["Provider dashboard", fs.existsSync("app/dashboard/activity-network/page.tsx")],
];

let failed = 0;
console.log("\nTUROBUS ACTIVITY NETWORK V1 AUDIT\n");
for (const [name, ok] of checks) {
  if (ok) console.log(`✅ ${name}`);
  else {
    failed++;
    console.log(`❌ ${name}`);
  }
}
console.log("");
console.log(`✅ Geçen: ${checks.length - failed}`);
console.log(`❌ Hatalı: ${failed}`);
console.log("");
process.exit(failed === 0 ? 0 : 1);
