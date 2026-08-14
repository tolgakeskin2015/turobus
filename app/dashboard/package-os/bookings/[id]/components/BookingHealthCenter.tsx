"use client";

type HealthItem = {
  id: string;
  supplier_id: string | null;
  supplier_status: string;

  supplier_room_confirmation: Array<{
    room_order: number;
    status:
      | "confirmed"
      | "pending"
      | "rejected";
    room_number?: string;
    note?: string;
  }>;

  voucher_created_at: string | null;
};

type HealthGuest = {
  full_name: string;
  phone: string | null;
  email: string | null;
};

type HealthPayable = {
  amount: number;
  paid_amount: number;
  due_date: string | null;
  status: string;
};

function daysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value.slice(0, 10)}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function BookingHealthCenter({
  checkIn,
  balanceAmount,
  guests,
  items,
  payables,
}: {
  checkIn: string;
  balanceAmount: number;
  guests: HealthGuest[];
  items: HealthItem[];
  payables: HealthPayable[];
}) {
  const days = daysUntil(checkIn);
  const supplierItems = items.filter((item) => Boolean(item.supplier_id));
  const supplierWaiting = supplierItems.filter(
    (item) => !["confirmed", "completed"].includes(item.supplier_status)
  ).length;
  const voucherMissing = supplierItems.filter(
    (item) => !item.voucher_created_at
  ).length;

  const rejectedRooms =
    supplierItems.reduce(
      (total, item) =>
        total +
        (
          item.supplier_room_confirmation ||
          []
        ).filter(
          room =>
            room.status ===
            "rejected"
        ).length,
      0
    );
  const guestMissing = guests.filter(
    (guest) => !guest.full_name?.trim() || (!guest.phone && !guest.email)
  ).length;
  const supplierBalance = payables.reduce(
    (sum, row) => sum + Math.max(0, Number(row.amount || 0) - Number(row.paid_amount || 0)),
    0
  );
  const overduePayables = payables.filter((row) => {
    if (!row.due_date || Number(row.amount || 0) <= Number(row.paid_amount || 0)) return false;
    return daysUntil(row.due_date) < 0;
  }).length;

  const problems =
    (balanceAmount > 0 ? 1 : 0) +
    supplierWaiting +
    voucherMissing +
    guestMissing +
    overduePayables +
    rejectedRooms;

  const hasCriticalRoomIssue =
    rejectedRooms > 0;

  const health =
    hasCriticalRoomIssue
      ? "Kritik Aksiyon"
      : problems === 0
        ? "Hazır"
        : problems <= 2
          ? "Kontrol Gerekli"
          : "Kritik Aksiyon";

  const healthClass =
    hasCriticalRoomIssue
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : problems === 0
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : problems <= 2
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-red-500/30 bg-red-500/10 text-red-300";

  const cards = [
    {
      label: "Giriş",
      value: days === 0 ? "Bugün" : days > 0 ? `${days} gün kaldı` : `${Math.abs(days)} gün geçti`,
      detail: checkIn,
      ok: days >= 0,
    },
    {
      label: "Misafir Bilgileri",
      value: guestMissing === 0 ? "Tam" : `${guestMissing} eksik`,
      detail: `${guests.length} misafir`,
      ok: guestMissing === 0,
    },
    {
      label: "Tahsilat",
      value: balanceAmount <= 0 ? "Tamamlandı" : money(balanceAmount),
      detail: balanceAmount <= 0 ? "Bakiye yok" : "Misafirden alınacak",
      ok: balanceAmount <= 0,
    },
    {
      label: "Tedarikçi Teyidi",
      value: supplierWaiting === 0 ? "Tam" : `${supplierWaiting} bekliyor`,
      detail: `${supplierItems.length} tedarikçili hizmet`,
      ok: supplierWaiting === 0,
    },
    {
      label: "Voucher",
      value: voucherMissing === 0 ? "Hazır" : `${voucherMissing} eksik`,
      detail: supplierItems.length ? "Hizmet voucher kontrolü" : "Tedarikçili hizmet yok",
      ok: voucherMissing === 0,
    },
    {
      label: "Hakediş",
      value: supplierBalance <= 0 ? "Kapalı" : money(supplierBalance),
      detail: overduePayables ? `${overduePayables} vadesi geçmiş` : "Tedarikçi bakiyesi",
      ok: overduePayables === 0,
    },
  ];

  return (
    <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
            REZERVASYON SAĞLIK MERKEZİ
          </p>
          <h2 className="mt-2 text-2xl font-black">Operasyon Hazırlık Kontrolü</h2>
          <p className="mt-2 text-sm text-slate-400">
            Tahsilat, misafir, tedarikçi, voucher ve hakediş durumunu tek bakışta kontrol edin.
          </p>
        </div>
        <div className={`rounded-2xl border px-5 py-3 ${healthClass}`}>
          <p className="text-[10px] font-black uppercase tracking-wider">Genel Durum</p>
          <p className="mt-1 text-lg font-black">{health}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-4 ${
              card.ok
                ? "border-emerald-500/15 bg-emerald-500/5"
                : "border-amber-500/20 bg-amber-500/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {card.label}
              </p>
              <span className={card.ok ? "text-emerald-400" : "text-amber-300"}>
                {card.ok ? "●" : "▲"}
              </span>
            </div>
            <p className={`mt-3 font-black ${card.ok ? "text-white" : "text-amber-300"}`}>
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{card.detail}</p>
          </div>
        ))}
      </div>

      {problems > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          <span className="font-black">Aksiyon özeti:</span>{" "}
          {balanceAmount > 0 ? `Tahsilat ${money(balanceAmount)} bekliyor. ` : ""}
          {supplierWaiting ? `${supplierWaiting} hizmet tedarikçi teyidi bekliyor. ` : ""}
          {voucherMissing ? `${voucherMissing} voucher eksik. ` : ""}
          {guestMissing ? `${guestMissing} misafirin iletişim bilgisi eksik. ` : ""}
          {overduePayables ? `${overduePayables} hakediş vadesi geçmiş. ` : ""}
          {rejectedRooms ? `${rejectedRooms} oda tedarikçi tarafından uygun değil olarak işaretlendi.` : ""}
        </div>
      )}
    </section>
  );
}
