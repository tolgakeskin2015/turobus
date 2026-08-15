import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  {
    file: "app/dashboard/package-os/builder/components/PackageBuilderV2.tsx",
    patterns: [
      "NetworkInventoryPicker",
      "network",
    ],
  },
  {
    file: "app/dashboard/package-os/builder/components/NetworkInventoryPicker.tsx",
    patterns: [
      "supabase",
    ],
  },
  {
    file: "supabase/migrations/20260815154500_package_builder_network_live_v1.sql",
    patterns: [],
  },
];

let passed = 0;
let failed = 0;

console.log("");
console.log("TUROBUS — PACKAGE BUILDER NETWORK LIVE AUDIT");
console.log("============================================");

for (const check of checks) {
  const fullPath = path.join(root, check.file);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Dosya bulunamadı: ${check.file}`);
    failed++;
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf8");

  const missing = check.patterns.filter(
    (pattern) => !content.toLowerCase().includes(pattern.toLowerCase())
  );

  if (missing.length > 0) {
    console.error(
      `❌ ${check.file} — eksik işaretler: ${missing.join(", ")}`
    );
    failed++;
    continue;
  }

  console.log(`✅ ${check.file}`);
  passed++;
}

console.log("");
console.log("============================================");
console.log(`✅ Geçen: ${passed}`);
console.log(`❌ Hatalı: ${failed}`);
console.log("============================================");

process.exit(failed === 0 ? 0 : 1);
