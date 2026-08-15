import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactDate(date: string) {
  return date.replace(/-/g, "");
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Villa iCal için Supabase service role key eksik." },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: connection, error: connectionError } = await admin
    .from("villa_channel_connections")
    .select("villa_id,company_id,is_active")
    .eq("export_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (connectionError || !connection) {
    return new NextResponse("Takvim bulunamadı.", { status: 404 });
  }

  const { data: villa } = await admin
    .from("villas")
    .select("name")
    .eq("id", connection.villa_id)
    .maybeSingle();

  const { data: reservations, error: reservationError } = await admin
    .from("villa_reservations")
    .select("id,reservation_code,guest_name,check_in,check_out,status")
    .eq("company_id", connection.company_id)
    .eq("villa_id", connection.villa_id)
    .neq("status", "cancelled")
    .gte("check_out", new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10))
    .order("check_in");

  if (reservationError) {
    return NextResponse.json(
      { ok: false, error: reservationError.message },
      { status: 500 }
    );
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const events = (reservations ?? []).map((reservation) => [
    "BEGIN:VEVENT",
    `UID:villa-${reservation.id}@turobus`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(reservation.check_in)}`,
    `DTEND;VALUE=DATE:${compactDate(reservation.check_out)}`,
    `SUMMARY:${escapeIcs(`Dolu - ${villa?.name ?? "Villa"}`)}`,
    `DESCRIPTION:${escapeIcs(`Turobus Villa OS - ${reservation.reservation_code}`)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ].join("\r\n"));

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Turobus//Villa OS//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(villa?.name ?? "Turobus Villa")}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename=\"turobus-villa-${token.slice(0, 8)}.ics\"`,
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
