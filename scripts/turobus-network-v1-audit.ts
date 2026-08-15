import fs from "node:fs";
import path from "node:path";

const migration =
  path.join(
    process.cwd(),
    "supabase/migrations/20260815123000_turobus_network_v1_integration_core.sql"
  );

const content =
  fs.readFileSync(
    migration,
    "utf8"
  );

const checks = [
  [
    "Network resource tablosu",
    "turobus_network_resources",
  ],
  [
    "Inventory source tablosu",
    "turobus_inventory_sources",
  ],
  [
    "Marketplace satış kanalı",
    "turobus_marketplace",
  ],
  [
    "Komisyon fonksiyonu",
    "calculate_turobus_marketplace_commission",
  ],
  [
    "Network katalog RPC",
    "get_turobus_network_catalog",
  ],
  [
    "Private contract migration",
    "private_contract",
  ],
];

let failed = 0;

console.log(
  "\nTUROBUS NETWORK V1 — INTEGRATION CORE AUDIT\n"
);

for (const [
  name,
  token,
] of checks) {

  if (
    content.includes(
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
