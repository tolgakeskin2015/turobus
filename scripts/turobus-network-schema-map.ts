import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;

  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();

    if (!line || line.startsWith("#")) continue;

    const i = line.indexOf("=");
    if (i <= 0) continue;

    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Supabase env bulunamadı.");
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
  "hotels",
  "hotel_rooms",
  "hotel_room_types",
  "hotel_inventory",
  "hotel_reservations",

  "package_hotel_rates",
  "package_activities",
  "package_quotes",
  "package_quote_items",
  "package_bookings",
  "package_booking_items",

  "tours",
  "tour_departures",
  "tour_departure_operations",
  "tour_manifest_entries",
];

async function inspect(table: string) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .limit(1);

  console.log("");
  console.log("========================================");
  console.log(`TABLE: ${table}`);
  console.log("========================================");

  if (error) {
    console.log(`ERROR: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    console.log("EMPTY_TABLE");
    return;
  }

  const row = data[0];

  console.log("COLUMNS:");
  console.log(Object.keys(row).join(", "));

  console.log("");
  console.log("SAMPLE TYPES:");

  for (const [key, value] of Object.entries(row)) {
    let type: string = typeof value;

    if (value === null) type = "null";
    else if (Array.isArray(value)) type = "array";

    console.log(`${key}: ${type}`);
  }
}

async function main() {
  console.log("");
  console.log("TUROBUS NETWORK — GERCEK SCHEMA MAP");
  console.log("");

  for (const table of tables) {
    await inspect(table);
  }

  console.log("");
  console.log("========================================");
  console.log(" SCHEMA MAP TAMAM ");
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
