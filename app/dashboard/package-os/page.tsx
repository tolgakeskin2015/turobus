"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type QuoteRow = {
  id: string;
  created_at: string;
  status: string;
};

type BookingRow = {
  id: string;
  sale_price: number;
  balance_amount: number;
  net_profit: number;
  status: string;
  check_in: string;
};

type PayableRow = {
  amount: number;
  paid_amount: number;
  status: string;
};

type TaskRow = {
  id: string;

  supplier_room_issue_status:
    string;

  supplier_room_issue_priority:
    string;

  supplier_room_issue_assigned_to:
    string | null;

  supplier_room_issue_sla_due_at:
    string | null;
};

type AlertSummary = {
  unread: number;
  critical: number;
  sla: number;
  active: number;
  muted: number;
};

const emptyAlertSummary: AlertSummary = {
  unread: 0,
  critical: 0,
  sla: 0,
  active: 0,
  muted: 0,
};

const modules = [
  {
    title: "Paket Oluştur",
    description:
      "Otel, aktivite, transfer ve ek hizmetleri birleştirerek canlı maliyet ve kâr hesabı yap.",
    href: "/dashboard/package-os/builder",
    status: "Aktif",
  },
  {
    title: "Oteller",
    description:
      "Anlaşmalı otelleri, oda tiplerini, pansiyonları ve sezon alış fiyatlarını yönet.",
    href: "/dashboard/package-os/hotels",
    status: "Aktif",
  },
  {
    title: "Aktiviteler",
    description:
      "Aktiviteci, alış fiyatı, gün/saat kontenjanı ve müsaitlik bilgilerini yönet.",
    href: "/dashboard/package-os/activities",
    status: "Aktif",
  },
  {
    title: "Teklifler",
    description:
      "Satış personelinin oluşturduğu teklifleri ve misafire gönderim durumlarını takip et.",
    href: "/dashboard/package-os/quotes",
    status: "Aktif",
  },
  {
    title: "Paket Rezervasyonları",
    description:
      "Satılan paketleri, giriş tarihlerini, tahsilatı ve operasyon aksiyonlarını tek ekrandan yönet.",
    href: "/dashboard/package-os/bookings",
    status: "Aktif",
  },
  {
    title: "Ekstra Siparişler",
    description:
      "Misafir uygulamasından satılan ekstra aktiviteleri, tahsilatı, operasyon durumunu ve kârlılığı yönet.",
    href: "/dashboard/package-os/extra-orders",
    status: "Aktif",
  },
  {
    title: "Operasyon Kontrol Kulesi",
    description:
      "Bugünkü paket ve ekstra operasyonları, kritik uyarıları ve yaklaşan hizmetleri tek ekrandan yönet.",
    href: "/dashboard/package-os/control-tower",
    status: "Aktif",
  },
  {
    title: "Operasyon Görev Havuzu",
    description:
      "Tüm açık, kritik, geciken ve sorumlusuz operasyon görevlerini personel bazında tek ekrandan yönet.",
    href: "/dashboard/package-os/task-pool",
    status: "Canlı",
  },
  {
    title: "Operasyon Alarm Merkezi",
    description:
      "Kritik görev ve SLA alarmlarını, okunmamış uyarıları ve sessize alınan kayıtları tek merkezden yönet.",
    href: "/dashboard/package-os/alarm-center",
    status: "Canlı",
  },
  {
    title: "Tedarikçi Uyarıları",
    description:
      "Yeni atanan ve tedarikçiye bildirilmesi gereken operasyonları takip et.",
    href: "/dashboard/package-os/supplier-alerts",
    status: "Aktif",
  },
  {
    title: "Tedarikçi Portalları",
    description:
      "Tedarikçilerin günlük operasyonlarını ve hakedişlerini görebileceği güvenli bağlantıları yönet.",
    href: "/dashboard/package-os/supplier-portals",
    status: "Aktif",
  },
  {
    title: "Tedarikçi Hakedişleri",
    description:
      "Otel, aktivite ve transfer firmalarına yapılacak ödemeleri ve vadeleri tek ekrandan izle.",
    href: "/dashboard/package-os/payables",
    status: "Aktif",
  },
  {
    title: "Kâr & Finans",
    description:
      "Satış, gerçek maliyet, brüt kâr, komisyon ve net kârı paket bazında analiz et.",
    href: "/dashboard/package-os/finance",
    status: "Aktif",
  },
  {
    title: "Voucher & QR",
    description:
      "Misafir hizmet voucherlarını ve QR kullanım kayıtlarını takip et.",
    href: "/dashboard/package-os/vouchers",
    status: "Aktif",
  },
];

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function PackageOsPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [alertSummary, setAlertSummary] =
    useState<AlertSummary>(
      emptyAlertSummary
    );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async (companyId: string) => {
    const [
      quoteResult,
      bookingResult,
      payableResult,
      taskResult,
      alertResult,
    ] = await Promise.all([
      supabase
        .from("package_quotes")
        .select("id, created_at, status")
        .eq("company_id", companyId),
      supabase
        .from("package_bookings")
        .select("id, sale_price, balance_amount, net_profit, status, check_in")
        .eq("company_id", companyId),
      supabase
        .from("package_supplier_payables")
        .select("amount, paid_amount, status")
        .eq("company_id", companyId),

      supabase
        .from("package_booking_items")
        .select(`
          id,
          supplier_room_issue_status,
          supplier_room_issue_priority,
          supplier_room_issue_assigned_to,
          supplier_room_issue_sla_due_at
        `)
        .eq("company_id", companyId)
        .neq("supplier_room_issue_status", "none"),

      supabase.rpc(
        "get_package_operation_alert_summary",
        {
          p_company_id:
            companyId,
        }
      ),
    ]);

    if (quoteResult.error) throw new Error(quoteResult.error.message);
    if (bookingResult.error) throw new Error(bookingResult.error.message);
    if (payableResult.error) throw new Error(payableResult.error.message);
    if (taskResult.error) throw new Error(taskResult.error.message);
    if (alertResult.error) throw new Error(alertResult.error.message);

    setQuotes((quoteResult.data ?? []) as QuoteRow[]);
    setBookings((bookingResult.data ?? []) as BookingRow[]);
    setPayables((payableResult.data ?? []) as PayableRow[]);
    setTasks((taskResult.data ?? []) as TaskRow[]);

    setAlertSummary({
      unread:
        Number(
          alertResult.data?.unread ??
          0
        ),

      critical:
        Number(
          alertResult.data?.critical ??
          0
        ),

      sla:
        Number(
          alertResult.data?.sla ??
          0
        ),

      active:
        Number(
          alertResult.data?.active ??
          0
        ),

      muted:
        Number(
          alertResult.data?.muted ??
          0
        ),
    });
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMessage("Kullanıcı oturumu bulunamadı.");
          return;
        }

        const currentMembership = await getCurrentMembership(user.id);

        if (!currentMembership) {
          setErrorMessage("Aktif şirket üyeliği bulunamadı.");
          return;
        }

        setMembership(currentMembership);
        await loadDashboard(currentMembership.company_id);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Paket Satış Merkezi verileri yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const today = new Date();
    const localDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const todayQuotes = quotes.filter(
      (quote) => quote.created_at.slice(0, 10) === localDay
    ).length;

    const activeBookings = bookings.filter(
      (booking) => !["completed", "cancelled"].includes(booking.status)
    );

    const totalBalance = activeBookings.reduce(
      (sum, booking) => sum + Number(booking.balance_amount || 0),
      0
    );

    const netProfit = activeBookings.reduce(
      (sum, booking) => sum + Number(booking.net_profit || 0),
      0
    );

    const supplierBalance = payables
      .filter((payable) => payable.status !== "cancelled")
      .reduce(
        (sum, payable) =>
          sum +
          Math.max(
            Number(payable.amount || 0) - Number(payable.paid_amount || 0),
            0
          ),
        0
      );

    const arrivalsToday = activeBookings.filter(
      (booking) => booking.check_in === localDay
    ).length;

    const now = Date.now();

    const openTasks = tasks.filter(
      (task) =>
        task.supplier_room_issue_status !== "resolved"
    );

    const criticalTasks = openTasks.filter(
      (task) =>
        task.supplier_room_issue_priority === "critical"
    ).length;

    const overdueTasks = openTasks.filter(
      (task) =>
        Boolean(task.supplier_room_issue_sla_due_at) &&
        new Date(
          task.supplier_room_issue_sla_due_at as string
        ).getTime() < now
    ).length;

    const unassignedTasks = openTasks.filter(
      (task) =>
        !task.supplier_room_issue_assigned_to
    ).length;

    return {
      todayQuotes,
      activeBookings: activeBookings.length,
      totalBalance,
      netProfit,
      supplierBalance,
      arrivalsToday,
      openTasks: openTasks.length,
      criticalTasks,
      overdueTasks,
      unassignedTasks,
    };
  }, [bookings, payables, quotes, tasks]);

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 p-7 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
                  TUROBUS PACKAGE OS
                </p>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                  Canlı Veri
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                Paket Satış Merkezi
              </h1>

              <p className="mt-4 max-w-3xl text-slate-400">
                Tekliften rezervasyona, tahsilattan tedarikçi hakedişine kadar paket satış operasyonunun tamamını tek merkezden yönetin.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!membership || loading}
                onClick={() => membership && void loadDashboard(membership.company_id)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black disabled:opacity-40"
              >
                ↻ Veriyi Yenile
              </button>

              <Link
                href="/dashboard/package-os/builder"
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black"
              >
                + Yeni Paket
              </Link>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )}

          <Link
            href="/dashboard/package-os/alarm-center"
            className={`mt-6 flex flex-col gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between ${
              alertSummary.critical > 0
                ? "border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/5"
                : alertSummary.unread > 0
                  ? "border-orange-500/30 bg-orange-500/10"
                  : "border-emerald-500/20 bg-emerald-500/5"
            }`}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
                  OPERASYON ALARM MERKEZİ
                </p>

                {alertSummary.unread > 0 && (
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">
                    {alertSummary.unread}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xl font-black">
                {loading
                  ? "Alarmlar yükleniyor..."
                  : alertSummary.unread > 0
                    ? `${alertSummary.unread} okunmamış operasyon alarmı`
                    : "Okunmamış operasyon alarmı yok"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-red-500/15 px-3 py-2 text-xs font-black text-red-300">
                Kritik {loading ? "…" : alertSummary.critical}
              </span>

              <span className="rounded-full bg-orange-500/15 px-3 py-2 text-xs font-black text-orange-300">
                SLA {loading ? "…" : alertSummary.sla}
              </span>

              <span className="rounded-full bg-cyan-500/15 px-3 py-2 text-xs font-black text-cyan-300">
                Aktif {loading ? "…" : alertSummary.active}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">
                Alarm Merkezini Aç →
              </span>
            </div>
          </Link>


          <Link
            href="/dashboard/package-os/task-pool"
            className={`mt-4 flex flex-col gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between ${
              stats.overdueTasks > 0 || stats.criticalTasks > 0
                ? "border-red-500/30 bg-red-500/10"
                : stats.openTasks > 0
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-emerald-500/20 bg-emerald-500/5"
            }`}
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                OPERASYON GÖREV HAVUZU
              </p>

              <p className="mt-2 text-xl font-black">
                {loading
                  ? "Görevler yükleniyor..."
                  : stats.openTasks === 0
                    ? "Açık operasyon görevi yok"
                    : `${stats.openTasks} açık görev`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-red-500/15 px-3 py-2 text-xs font-black text-red-300">
                Kritik {loading ? "…" : stats.criticalTasks}
              </span>

              <span className="rounded-full bg-orange-500/15 px-3 py-2 text-xs font-black text-orange-300">
                Geciken {loading ? "…" : stats.overdueTasks}
              </span>

              <span className="rounded-full bg-cyan-500/15 px-3 py-2 text-xs font-black text-cyan-300">
                Sorumlusuz {loading ? "…" : stats.unassignedTasks}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">
                Görev Havuzunu Aç →
              </span>
            </div>
          </Link>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Bugünkü Teklif", String(stats.todayQuotes), "Bugün oluşturulan"],
              ["Aktif Paket", String(stats.activeBookings), "Operasyonda olan"],
              ["Bugün Giriş", String(stats.arrivalsToday), "Başlayacak paket"],
              ["Bekleyen Tahsilat", money(stats.totalBalance), "Misafirden alınacak"],
              ["Tedarikçi Borcu", money(stats.supplierBalance), "Ödenecek hakediş"],
              ["Net Kâr", money(stats.netProfit), "Aktif rezervasyonlar"],
            ].map(([label, value, note]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950 p-5"
              >
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black">{loading ? "…" : value}</p>
                <p className="mt-2 text-xs text-slate-500">{note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              href={module.href}
              key={module.title}
              className="group rounded-[28px] border border-white/10 bg-slate-900 p-6 transition hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-slate-900/80"
            >
              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                {module.status}
              </span>

              <h2 className="mt-4 text-xl font-black">{module.title}</h2>

              <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-400">
                {module.description}
              </p>

              <p className="mt-6 text-sm font-black text-orange-300 transition group-hover:translate-x-1">
                Yönet →
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/5 p-6 lg:col-span-2">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Fiyat & Maliyet Güvenliği
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Teklif kabul edildiğinde otel, aktivite ve diğer hizmetlerin maliyet snapshot&apos;ı rezervasyona kilitlenir. Sonradan tedarikçi fiyatı değişse bile geçmiş satışın maliyeti ve kârlılığı korunur.
            </p>
          </div>

          <Link
            href="/dashboard/package-os/bookings"
            className="rounded-[28px] border border-orange-500/20 bg-orange-500/5 p-6 transition hover:border-orange-500/40"
          >
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              Operasyon
            </p>
            <h2 className="mt-3 text-2xl font-black">Rezervasyon Operasyon Merkezi</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Tedarikçi teyidi, voucher, tahsilat ve hakediş aksiyonlarını yönetin.
            </p>
            <p className="mt-5 text-sm font-black text-orange-300">Merkezi Aç →</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
