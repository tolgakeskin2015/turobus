import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set([
  "super_admin",
  "company_owner",
  "operation_manager",
]);

function bearer(request: NextRequest) {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

function unfoldIcs(text: string) {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function dateValue(value: string | undefined) {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function daysBetween(start: string, end: string) {
  const a = new Date(`${start}T12:00:00Z`).getTime();
  const b = new Date(`${end}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

function datesBetween(start: string, end: string) {
  const out: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor < last) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function parseEvents(text: string) {
  const source = unfoldIcs(text);
  const blocks = source.split("BEGIN:VEVENT").slice(1);
  const events: Array<{ uid: string; start: string; end: string; summary: string }> = [];

  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0] ?? "";
    const lines = body.split(/\r?\n/);
    const read = (key: string) => {
      const line = lines.find((item) => item.toUpperCase().startsWith(key));
      return line ? line.slice(line.indexOf(":") + 1).trim() : undefined;
    };

    const uid = read("UID");
    const start = dateValue(read("DTSTART"));
    const end = dateValue(read("DTEND"));
    const summary = (read("SUMMARY") ?? "").replace(/\\,/g, ",").replace(/\\n/g, " ").trim();

    if (uid && start && end && end > start) {
      events.push({ uid, start, end, summary });
    }
  }

  return events;
}

function assertRemoteCalendarUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("iCal adresi HTTPS olmalı.");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error("Yerel ağ adresleri iCal kaynağı olarak kullanılamaz.");
  }
  return url;
}

export async function POST(request: NextRequest) {
  const token = bearer(request);
  if (!token) return NextResponse.json({ ok: false, error: "Oturum gerekli." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";

  if (!companyId || !connectionId) {
    return NextResponse.json({ ok: false, error: "companyId ve connectionId gerekli." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ ok: false, error: "Oturum doğrulanamadı." }, { status: 401 });

  const { data: membership } = await admin
    .from("company_members")
    .select("role,is_active")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership || !ALLOWED_ROLES.has(membership.role)) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const { data: connection, error: connectionError } = await admin
    .from("villa_channel_connections")
    .select("id,company_id,villa_id,channel,import_url,is_active")
    .eq("id", connectionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (connectionError || !connection) {
    return NextResponse.json({ ok: false, error: connectionError?.message ?? "Kanal bağlantısı bulunamadı." }, { status: 404 });
  }
  if (!connection.is_active || !connection.import_url) {
    return NextResponse.json({ ok: false, error: "Aktif iCal import adresi bulunmuyor." }, { status: 400 });
  }

  try {
    const url = assertRemoteCalendarUrl(connection.import_url);
    const response = await fetch(url, {
      headers: { "user-agent": "Turobus-VillaOS-iCal/1.0", accept: "text/calendar,text/plain;q=0.9,*/*;q=0.5" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`iCal kaynağı HTTP ${response.status} döndürdü.`);

    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("iCal dosyası çok büyük.");
    const events = parseEvents(text);

    const { data: existingRows, error: existingError } = await admin
      .from("villa_channel_events")
      .select("id,external_uid,reservation_id,starts_on,ends_on,status")
      .eq("connection_id", connection.id);
    if (existingError) throw new Error(existingError.message);

    const existing = new Map((existingRows ?? []).map((row) => [row.external_uid, row]));
    const seen = new Set<string>();
    let created = 0;
    let updated = 0;

    const salesChannel = ["airbnb", "booking", "vrbo"].includes(connection.channel)
      ? connection.channel
      : "external";

    for (const event of events) {
      seen.add(event.uid);
      const old = existing.get(event.uid);
      let reservationId = old?.reservation_id as string | null | undefined;
      const reservationPayload = {
        company_id: companyId,
        villa_id: connection.villa_id,
        sales_channel: salesChannel,
        source_reference: event.uid,
        guest_name: event.summary || `${String(connection.channel).toUpperCase()} Rezervasyonu`,
        guest_count: 1,
        check_in: event.start,
        check_out: event.end,
        nights: daysBetween(event.start, event.end),
        nightly_total: 0,
        cleaning_fee: 0,
        security_deposit: 0,
        extra_total: 0,
        discount_total: 0,
        grand_total: 0,
        paid_total: 0,
        balance: 0,
        currency: "TRY",
        status: "confirmed",
        turobus_commission_rate: 0,
        turobus_commission_amount: 0,
        notes: `iCal sync · ${connection.channel}`,
        updated_at: new Date().toISOString(),
      };

      if (reservationId) {
        const { error } = await admin.from("villa_reservations").update(reservationPayload).eq("id", reservationId);
        if (error) throw new Error(error.message);
        updated += 1;
      } else {
        const { data: inserted, error } = await admin
          .from("villa_reservations")
          .insert({ ...reservationPayload, reservation_code: `IC-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}` })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        reservationId = inserted.id;
        created += 1;
      }

      const calendarPayload = datesBetween(event.start, event.end).map((calendar_date) => ({
        company_id: companyId,
        villa_id: connection.villa_id,
        calendar_date,
        status: "reserved",
        source: connection.channel,
        external_uid: event.uid,
        updated_at: new Date().toISOString(),
      }));
      if (calendarPayload.length) {
        const { error } = await admin.from("villa_calendar").upsert(calendarPayload, { onConflict: "villa_id,calendar_date" });
        if (error) throw new Error(error.message);
      }

      const { error: eventError } = await admin.from("villa_channel_events").upsert({
        company_id: companyId,
        villa_id: connection.villa_id,
        connection_id: connection.id,
        external_uid: event.uid,
        reservation_id: reservationId,
        starts_on: event.start,
        ends_on: event.end,
        summary: event.summary || null,
        status: "active",
        last_seen_at: new Date().toISOString(),
        raw_payload: event,
        updated_at: new Date().toISOString(),
      }, { onConflict: "connection_id,external_uid" });
      if (eventError) throw new Error(eventError.message);
    }

    let removed = 0;
    for (const row of existingRows ?? []) {
      if (row.status !== "active" || seen.has(row.external_uid)) continue;
      removed += 1;
      await admin.from("villa_channel_events").update({ status: "removed", updated_at: new Date().toISOString() }).eq("id", row.id);
      if (row.reservation_id) await admin.from("villa_reservations").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", row.reservation_id);
      await admin
        .from("villa_calendar")
        .update({ status: "available", source: "villa_os", external_uid: null, updated_at: new Date().toISOString() })
        .eq("villa_id", connection.villa_id)
        .eq("external_uid", row.external_uid);
    }

    await admin.from("villa_channel_connections").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "success",
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", connection.id);

    return NextResponse.json({ ok: true, events: events.length, created, updated, removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "iCal senkronizasyonu başarısız.";
    await admin.from("villa_channel_connections").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "failed",
      last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq("id", connection.id);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
