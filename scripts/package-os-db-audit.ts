import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(fileName: string) {
  const file = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(file)) return;

  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index < 1) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY .env.local içinde bulunamadı."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let passed = 0;
let failed = 0;
let warned = 0;

function ok(name: string, detail = "") {
  passed += 1;
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail = "") {
  failed += 1;
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

function warn(name: string, detail = "") {
  warned += 1;
  console.log(`⚠️ ${name}${detail ? ` — ${detail}` : ""}`);
}

function n(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function sameMoney(a: number, b: number) {
  return Math.abs(a - b) < 0.02;
}

async function tableReadable(table: string) {
  const { error } = await supabase.from(table).select("*").limit(1);

  if (error) {
    fail(`Tablo ${table}`, error.message);
    return false;
  }

  ok(`Tablo ${table}`, "okunabiliyor");
  return true;
}

async function main() {
  console.log("\nTUROBUS PACKAGE OS — GERÇEK DB DENETİMİ\n");

  const criticalTables = [
    "package_quotes",
    "package_quote_guests",
    "package_quote_items",
    "package_bookings",
    "package_booking_guests",
    "package_booking_items",
    "package_customer_payments",
    "package_supplier_payables",
    "package_vouchers",
    "package_booking_events",
    "package_whatsapp_queue",
  ];

  for (const table of criticalTables) {
    await tableReadable(table);
  }

  const { data: quotes, error: quoteError } = await supabase
    .from("package_quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (quoteError) {
    fail("Son teklifler", quoteError.message);
  } else if (!quotes || quotes.length === 0) {
    fail("Son teklifler", "Veritabanında test edilecek teklif bulunamadı");
  } else {
    const quote = quotes[0] as Record<string, unknown>;
    const quoteId = String(quote.id);

    ok("Son teklif bulundu", `id=${quoteId}`);

    const { data: guests, error: guestError } = await supabase
      .from("package_quote_guests")
      .select("*")
      .eq("quote_id", quoteId)
      .order("guest_order", { ascending: true });

    if (guestError) {
      fail("Teklif misafirleri", guestError.message);
    } else {
      const expected = Math.max(n(quote.adults) + n(quote.children), 1);
      const actual = guests?.length ?? 0;

      if (actual === expected) {
        ok("Teklif misafir sayısı", `${actual}/${expected}`);
      } else {
        fail("Teklif misafir sayısı", `beklenen=${expected}, kayıtlı=${actual}`);
      }

      const primary = guests?.filter((guest) => guest.is_primary) ?? [];
      if (primary.length === 1) {
        ok("Ana misafir", String(primary[0].full_name ?? ""));
      } else {
        fail("Ana misafir", `primary kayıt sayısı=${primary.length}`);
      }
    }

    const { data: quoteItems, error: quoteItemsError } = await supabase
      .from("package_quote_items")
      .select("*")
      .eq("quote_id", quoteId);

    if (quoteItemsError) {
      fail("Teklif hizmet kalemleri", quoteItemsError.message);
    } else if ((quoteItems?.length ?? 0) > 0) {
      ok("Teklif hizmet kalemleri", `${quoteItems?.length ?? 0} kalem`);
    } else {
      warn("Teklif hizmet kalemleri", "Son teklifte hizmet kalemi yok");
    }
  }

  const { data: bookings, error: bookingError } = await supabase
    .from("package_bookings")
    .select("*")
    .order("booked_at", { ascending: false })
    .limit(5);

  if (bookingError) {
    fail("Son rezervasyonlar", bookingError.message);
  } else if (!bookings || bookings.length === 0) {
    warn("Son rezervasyon", "Henüz paket rezervasyonu bulunamadı");
  } else {
    const booking = bookings[0] as Record<string, unknown>;
    const bookingId = String(booking.id);

    ok(
      "Son rezervasyon bulundu",
      `${String(booking.booking_code ?? bookingId)}`
    );

    if (booking.quote_id) {
      ok("Rezervasyon teklif bağlantısı", String(booking.quote_id));
    } else {
      fail("Rezervasyon teklif bağlantısı", "quote_id boş");
    }

    const snapshot = booking.quote_snapshot;
    if (
      snapshot &&
      typeof snapshot === "object" &&
      Object.keys(snapshot as Record<string, unknown>).length > 0 &&
      booking.quote_snapshot_created_at
    ) {
      ok("Rezervasyon snapshot", "kilitli");
    } else {
      fail("Rezervasyon snapshot", "snapshot veya kilit zamanı eksik");
    }

    const { data: bookingGuests, error: bookingGuestsError } = await supabase
      .from("package_booking_guests")
      .select("*")
      .eq("booking_id", bookingId)
      .order("guest_order", { ascending: true });

    if (bookingGuestsError) {
      fail("Rezervasyon misafir snapshot", bookingGuestsError.message);
    } else {
      const expected = Math.max(n(booking.adults) + n(booking.children), 1);
      const actual = bookingGuests?.length ?? 0;

      if (actual === expected) {
        ok("Rezervasyon misafir snapshot", `${actual}/${expected}`);
      } else {
        fail(
          "Rezervasyon misafir snapshot",
          `beklenen=${expected}, snapshot=${actual}`
        );
      }
    }

    const { data: items, error: itemError } = await supabase
      .from("package_booking_items")
      .select("*")
      .eq("booking_id", bookingId);

    if (itemError) {
      fail("Rezervasyon hizmetleri", itemError.message);
    } else if ((items?.length ?? 0) > 0) {
      ok("Rezervasyon hizmetleri", `${items?.length ?? 0} hizmet`);

      const invalidStatuses = (items ?? []).filter(
        (item) =>
          !["pending", "requested", "confirmed", "completed", "cancelled"].includes(
            String(item.supplier_status ?? "pending")
          )
      );

      if (invalidStatuses.length === 0) {
        ok("Tedarikçi durumları", "geçerli");
      } else {
        fail("Tedarikçi durumları", `${invalidStatuses.length} geçersiz kayıt`);
      }
    } else {
      fail("Rezervasyon hizmetleri", "Rezervasyonda hizmet bulunamadı");
    }

    const { data: payments, error: paymentError } = await supabase
      .from("package_customer_payments")
      .select("*")
      .eq("booking_id", bookingId);

    if (paymentError) {
      fail("Müşteri tahsilatları", paymentError.message);
    } else {
      const completedTotal = (payments ?? [])
        .filter((payment) => String(payment.status) === "completed")
        .reduce((sum, payment) => sum + n(payment.amount), 0);

      if (sameMoney(completedTotal, n(booking.paid_amount))) {
        ok("Tahsilat toplamı", `DB=${n(booking.paid_amount)}, hareket=${completedTotal}`);
      } else {
        fail(
          "Tahsilat toplamı",
          `booking.paid_amount=${n(booking.paid_amount)}, hareket=${completedTotal}`
        );
      }

      const expectedBalance = Math.max(n(booking.sale_price) - completedTotal, 0);
      if (sameMoney(expectedBalance, n(booking.balance_amount))) {
        ok("Misafir kalan bakiye", String(n(booking.balance_amount)));
      } else {
        fail(
          "Misafir kalan bakiye",
          `beklenen=${expectedBalance}, kayıtlı=${n(booking.balance_amount)}`
        );
      }
    }

    const { data: payables, error: payableError } = await supabase
      .from("package_supplier_payables")
      .select("*")
      .eq("booking_id", bookingId);

    if (payableError) {
      fail("Tedarikçi hakedişleri", payableError.message);
    } else {
      const invalid = (payables ?? []).filter(
        (row) => n(row.paid_amount) < 0 || n(row.amount) < 0 || n(row.paid_amount) - n(row.amount) > 0.02
      );

      if (invalid.length === 0) {
        ok("Tedarikçi hakediş matematiği", `${payables?.length ?? 0} kayıt`);
      } else {
        fail("Tedarikçi hakediş matematiği", `${invalid.length} hatalı kayıt`);
      }
    }

    const { data: vouchers, error: voucherError } = await supabase
      .from("package_vouchers")
      .select("*")
      .eq("booking_id", bookingId);

    if (voucherError) {
      fail("Voucher kayıtları", voucherError.message);
    } else {
      const invalid = (vouchers ?? []).filter(
        (voucher) => !voucher.voucher_code || !voucher.qr_token
      );

      if (invalid.length === 0) {
        ok("Voucher kayıtları", `${vouchers?.length ?? 0} voucher`);
      } else {
        fail("Voucher kayıtları", `${invalid.length} voucher kod/QR eksik`);
      }
    }

    const { data: events, error: eventError } = await supabase
      .from("package_booking_events")
      .select("id,event_type,title,created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (eventError) {
      fail("Operasyon zaman çizelgesi", eventError.message);
    } else if ((events?.length ?? 0) > 0) {
      ok("Operasyon zaman çizelgesi", `${events?.length ?? 0} hareket`);
    } else {
      warn("Operasyon zaman çizelgesi", "Bu rezervasyonda event bulunamadı");
    }
  }

  const { data: queueRows, error: queueError } = await supabase
    .from("package_whatsapp_queue")
    .select("id,status,to_phone,source,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (queueError) {
    fail("WhatsApp kuyruğu", queueError.message);
  } else {
    const validStatuses = new Set([
      "pending",
      "processing",
      "sent",
      "delivered",
      "read",
      "retry",
      "failed",
      "cancelled",
    ]);

    const invalid = (queueRows ?? []).filter(
      (row) => !row.to_phone || !validStatuses.has(String(row.status))
    );

    if (invalid.length === 0) {
      ok("WhatsApp kuyruğu", `${queueRows?.length ?? 0} son kayıt geçerli`);
    } else {
      fail("WhatsApp kuyruğu", `${invalid.length} geçersiz kayıt`);
    }
  }

  console.log("\n====================================");
  console.log(`✅ Geçen: ${passed}`);
  console.log(`⚠️ Uyarı: ${warned}`);
  console.log(`❌ Hatalı: ${failed}`);
  console.log("====================================\n");

  if (failed > 0) process.exit(1);
}

void main();
