import fs from "node:fs";

const files = [
  "supabase/migrations/20260815160500_package_network_operation_center.sql",
  "app/dashboard/package-os/bookings/[id]/components/NetworkOperationCenter.tsx",
  "app/dashboard/package-os/bookings/[id]/page.tsx",
];

let failed = 0;

for (const file of files) {

  if (!fs.existsSync(file)) {

    console.log(
      `❌ ${file}`
    );

    failed++;

  } else {

    console.log(
      `✅ ${file}`
    );

  }
}

const sql =
  fs.readFileSync(
    files[0],
    "utf8"
  );

const page =
  fs.readFileSync(
    files[2],
    "utf8"
  );

const required = [
  "confirm_package_network_selection",
  "release_package_network_selection",
  "reserved_inventory",
  "reserved_count",
  "turobus_network_allocations",
];

for (const token of required) {

  if (!sql.includes(token)) {

    console.log(
      `❌ Eksik: ${token}`
    );

    failed++;
  }
}

if (
  !page.includes(
    "NetworkOperationCenter"
  )
) {

  console.log(
    "❌ NetworkOperationCenter sayfaya bağlı değil"
  );

  failed++;
}

console.log("");
console.log(
  failed === 0
    ? "✅ NETWORK OPERATION AUDIT TEMİZ"
    : `❌ ${failed} HATA`
);

process.exit(
  failed === 0
    ? 0
    : 1
);
