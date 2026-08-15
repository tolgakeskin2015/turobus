import fs from "node:fs";
import path from "node:path";

const file =
  path.join(
    process.cwd(),
    "supabase/migrations/20260815143000_turobus_network_bridge_v1.sql"
  );

const sql =
  fs.readFileSync(
    file,
    "utf8"
  );

const checks: Array<[string, string]> = [

  [
    "Network inventory units",
    "turobus_network_inventory_units",
  ],

  [
    "Network allocations",
    "turobus_network_allocations",
  ],

  [
    "Hotel/Tour sync",
    "sync_turobus_network_sources",
  ],

  [
    "Live catalog",
    "get_turobus_network_live_catalog",
  ],

  [
    "Hotel reservation bridge",
    "reserve_turobus_network_hotel",
  ],

  [
    "Tour capacity bridge",
    "reserve_turobus_network_tour",
  ],

  [
    "Allocation release",
    "release_turobus_network_allocation",
  ],

  [
    "Hotel real inventory",
    "reserved_inventory",
  ],

  [
    "Tour real inventory",
    "reserved_count",
  ],
];

let failed = 0;

console.log(
  "\nTUROBUS NETWORK BRIDGE V1 AUDIT\n"
);

for (
  const [
    name,
    token,
  ]
  of checks
) {

  if (
    sql.includes(
      token
    )
  ) {

    console.log(
      `✅ ${name}`
    );

  } else {

    failed++;

    console.log(
      `❌ ${name}`
    );

  }
}

console.log(
  "\n=============================="
);

console.log(
  `✅ Geçen: ${checks.length - failed}`
);

console.log(
  `❌ Hatalı: ${failed}`
);

console.log(
  "==============================\n"
);

process.exit(
  failed === 0
    ? 0
    : 1
);
