import fs from "node:fs";
import path from "node:path";

const configuredBaseUrl = process.env.PACKAGE_OS_BASE_URL;
const baseUrls = configuredBaseUrl
  ? [configuredBaseUrl]
  : ["http://127.0.0.1:3000", "http://localhost:3000"];

let failed = 0;
let passed = 0;
let activeBaseUrl = baseUrls[0];

function ok(name: string, detail = "") {
  passed += 1;
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail = "") {
  failed += 1;
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

function errorDetail(error: unknown) {
  if (!(error instanceof Error)) return "Bilinmeyen bağlantı hatası";

  const cause = (error as Error & {
    cause?: {
      code?: string;
      address?: string;
      port?: number;
      message?: string;
    };
  }).cause;

  const extras = [
    cause?.code,
    cause?.address,
    cause?.port ? `port=${cause.port}` : undefined,
    cause?.message,
  ].filter(Boolean);

  return extras.length > 0
    ? `${error.message} (${extras.join(" · ")})`
    : error.message;
}

async function resolveBaseUrl() {
  for (const candidate of baseUrls) {
    try {
      const response = await fetch(`${candidate}/api/locations/turkey`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        activeBaseUrl = candidate;
        console.log(`✅ Sunucu bulundu — ${candidate}`);
        return true;
      }
    } catch (error) {
      console.log(`ℹ️ ${candidate} erişilemedi — ${errorDetail(error)}`);
    }
  }

  fail(
    "Dev server bağlantısı",
    "3000 portunda erişilebilir Next.js sunucusu bulunamadı"
  );

  return false;
}

async function checkRoute(route: string) {
  const name = `Route ${route}`;

  try {
    const response = await fetch(`${activeBaseUrl}${route}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: {
        "user-agent": "turobus-package-os-smoke-test",
      },
    });

    if (response.status >= 200 && response.status < 400) {
      ok(name, `HTTP ${response.status}`);
      return;
    }

    fail(name, `HTTP ${response.status}`);
  } catch (error) {
    fail(name, errorDetail(error));
  }
}

async function checkTurkeyLocations() {
  const name = "Türkiye il/ilçe API";

  try {
    const response = await fetch(`${activeBaseUrl}/api/locations/turkey`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      fail(name, `HTTP ${response.status}`);
      return;
    }

    const payload = (await response.json()) as unknown;

    const rows = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && "data" in payload
        ? (payload as { data?: unknown }).data
        : null;

    if (!Array.isArray(rows)) {
      fail(name, "Beklenen dizi formatı gelmedi");
      return;
    }

    if (rows.length !== 81) {
      fail(name, `81 il bekleniyordu, ${rows.length} geldi`);
      return;
    }

    const mugla = rows.find((row) => {
      if (!row || typeof row !== "object") return false;
      return (row as { name?: string }).name === "Muğla";
    }) as { districts?: Array<{ name?: string }> } | undefined;

    const hasFethiye = Boolean(
      mugla?.districts?.some((district) => district.name === "Fethiye")
    );

    if (!hasFethiye) {
      fail(name, "Muğla > Fethiye bulunamadı");
      return;
    }

    ok(name, "81 il ve Muğla > Fethiye doğrulandı");
  } catch (error) {
    fail(name, errorDetail(error));
  }
}

function checkFileContains(file: string, needles: string[]) {
  const absolute = path.resolve(process.cwd(), file);

  if (!fs.existsSync(absolute)) {
    fail(`Dosya ${file}`, "Bulunamadı");
    return;
  }

  const content = fs.readFileSync(absolute, "utf8");
  const missing = needles.filter((needle) => !content.includes(needle));

  if (missing.length > 0) {
    fail(`Dosya ${file}`, `Eksik: ${missing.join(", ")}`);
    return;
  }

  ok(`Dosya ${file}`, `${needles.length} kritik kontrol geçti`);
}

async function main() {
  console.log("\nTUROBUS PACKAGE OS — SMOKE TEST");
  console.log(`Aday URL: ${baseUrls.join(" , ")}\n`);

  const serverReady = await resolveBaseUrl();

  if (serverReady) {
    console.log(`Aktif URL: ${activeBaseUrl}\n`);

    await checkRoute("/dashboard/package-os");
    await checkRoute("/dashboard/package-os/builder");
    await checkRoute("/dashboard/package-os/hotels");
    await checkRoute("/dashboard/package-os/quotes");
    await checkRoute("/dashboard/package-os/bookings");
    await checkRoute("/dashboard/package-os/supplier-alerts");
    await checkRoute("/dashboard/package-os/supplier-portals");
    await checkRoute("/dashboard/package-os/vouchers");
    await checkRoute("/dashboard/package-os/payables");
    await checkRoute("/dashboard/package-os/whatsapp-queue");

    await checkTurkeyLocations();
  }

  checkFileContains(
    "app/dashboard/package-os/bookings/[id]/components/BookingActionCenter.tsx",
    [
      "package_booking_add_payment",
      "package_booking_send_supplier_request",
      "package_booking_confirm_supplier_service",
      "package_booking_ensure_voucher",
      "record_package_supplier_payment",
      "ensure_package_supplier_portal",
      "package_booking_queue_supplier_whatsapp",
    ]
  );

  checkFileContains("app/api/package-os/reminders/cron/route.ts", [
    "run_package_supplier_reminders",
    "run_package_operation_overdue_alerts",
    "enqueue_package_whatsapp_messages",
  ]);

  checkFileContains(
    "supabase/migrations/20260814124500_package_supplier_service_flow.sql",
    [
      "package_booking_send_supplier_request",
      "package_booking_confirm_supplier_service",
      "package_booking_ensure_voucher",
      "package_booking_complete_supplier_service",
    ]
  );

  checkFileContains(
    "supabase/migrations/20260814130500_package_booking_supplier_whatsapp.sql",
    ["package_booking_queue_supplier_whatsapp"]
  );

  console.log("\n==============================");
  console.log(`✅ Geçen: ${passed}`);
  console.log(`❌ Kalan/Hatalı: ${failed}`);
  console.log("==============================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
