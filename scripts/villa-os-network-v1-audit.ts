import fs from "node:fs";

const sql = fs.readFileSync("supabase/migrations/20260815180000_villa_os_network_v1.sql", "utf8");
const dashboard = fs.readFileSync("app/dashboard/villa-os/page.tsx", "utf8");
const guest = fs.readFileSync("app/villa-misafir/[token]/page.tsx", "utf8");

const checks: Array<[string, boolean]> = [
  ["Villa portfolio", sql.includes("create table if not exists public.villas")],
  ["Photo gallery", sql.includes("villa_photos") && sql.includes("villa-media")],
  ["Daily calendar", sql.includes("villa_calendar")],
  ["Reservations", sql.includes("villa_reservations")],
  ["Conditional cleaning fee", sql.includes("cleaning_fee_under_nights") && sql.includes("calculate_villa_cleaning_fee")],
  ["Payments", sql.includes("villa_payments") && sql.includes("refresh_villa_reservation_balance")],
  ["Cleaning operations", sql.includes("villa_cleaning_tasks")],
  ["Invoice connector ready", sql.includes("villa_invoices") && sql.includes("provider_document_id")],
  ["Channel manager", sql.includes("villa_channel_connections") && sql.includes("import_url") && sql.includes("export_token")],
  ["B2B partners", sql.includes("villa_b2b_access")],
  ["Role users", sql.includes("villa_os_users")],
  ["Marketplace switch", sql.includes("marketplace_enabled") && sql.includes("turobus_marketplace")],
  ["Commission only marketplace", sql.includes("if p_sales_channel='turobus_marketplace'")],
  ["Guest portal", sql.includes("get_villa_guest_portal") && guest.includes("TATİLİM")],
  ["Upsell", guest.includes("Tatilini Geliştir") && guest.includes("/turlar")],
  ["Dashboard metrics", sql.includes("get_villa_os_dashboard") && dashboard.includes("Doluluk")],
  ["Network sync", sql.includes("sync_turobus_villa_network")],
  ["Cleaning UI", dashboard.includes("Temizlik Operasyonu")],
];

let failed = 0;
console.log("\nTUROBUS VILLA OS + NETWORK V1 AUDIT\n");
for (const [name, ok] of checks) {
  if (ok) console.log(`✅ ${name}`);
  else { failed++; console.log(`❌ ${name}`); }
}
console.log(`\n✅ Geçen: ${checks.length - failed}`);
console.log(`❌ Hatalı: ${failed}\n`);
process.exit(failed === 0 ? 0 : 1);
