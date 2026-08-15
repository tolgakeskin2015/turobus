import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;

  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();

    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");

    if (index <= 0) continue;

    const key = line.slice(0, index).trim();

    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(
  path.join(
    process.cwd(),
    ".env.local"
  )
);

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Supabase env bulunamadı."
  );

  process.exit(1);
}

const supabase =
  createClient(
    url,
    key
  );

async function testTable(
  table: string
) {

  const result =
    await supabase
      .from(table)
      .select("*")
      .limit(1);

  if (!result.error) {

    const first =
      Array.isArray(result.data)
      && result.data.length
        ? result.data[0]
        : null;

    console.log(
      `✅ ${table}`
    );

    if (first) {

      console.log(
        "   kolonlar:",
        Object.keys(first).join(", ")
      );

    }

    return true;
  }

  const message =
    result.error.message || "";

  if (
    message.includes(
      "does not exist"
    )
    ||
    message.includes(
      "schema cache"
    )
  ) {
    return false;
  }

  console.log(
    `⚠️ ${table}: ${message}`
  );

  return false;
}


async function main() {

  console.log(
    "\nTUROBUS — MEVCUT MODUL TABLOLARI\n"
  );

  const candidates = [

    // Hotel / PMS
    "hotels",
    "hotel_rooms",
    "hotel_room_types",
    "hotel_rates",
    "hotel_inventory",
    "hotel_reservations",
    "room_types",
    "rooms",

    // Package
    "package_hotels",
    "package_hotel_rates",
    "package_activities",
    "package_quotes",
    "package_quote_items",
    "package_bookings",
    "package_booking_items",

    // Tour
    "tours",
    "tour_departures",
    "reservations",
    "tour_departure_operations",
    "tour_manifest_entries",
  ];

  let found = 0;

  for (const table of candidates) {

    if (
      await testTable(
        table
      )
    ) {
      found++;
    }

  }

  console.log(
    `\nBulunan aday tablo: ${found}`
  );
}

main().catch(
  error => {

    console.error(error);

    process.exit(1);
  }
);
