"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaBolt,
  FaCalendarCheck,
  FaClipboardCheck,
  FaFileInvoiceDollar,
  FaHome,
  FaMoneyCheckAlt,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";


type Summary = {
  active_villas: number;
  today_checkins: number;
  today_checkouts: number;
  open_tasks: number;
  critical_tasks: number;
  open_cleaning: number;
  open_maintenance: number;
  pending_invoices: number;
  held_deposits: number;
  open_owner_settlements: number;
};

type Owner = {
  id: string;
  full_name: string;
};

type Reservation = {
  id: string;
  reservation_code: string;
  guest_name: string;
};

type Task = {
  id: string;
  task_type: string;
  title: string;
  task_date: string;
  priority: string;
  status: string;
};

type InvoiceJob = {
  id: string;
  status: string;
  job_type: string;
  created_at: string;
  error_message: string | null;
};


const today = () =>
  new Date().toISOString().slice(0, 10);

const monthStart = () =>
  `${today().slice(0, 7)}-01`;

const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const input =
  "w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/60";

const label =
  "mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-400";


export default function VillaAutomationCenterPage() {

  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    summary,
    setSummary,
  ] =
    useState<Summary | null>(
      null
    );

  const [
    owners,
    setOwners,
  ] =
    useState<Owner[]>(
      []
    );

  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );

  const [
    tasks,
    setTasks,
  ] =
    useState<Task[]>(
      []
    );

  const [
    jobs,
    setJobs,
  ] =
    useState<InvoiceJob[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    automationDate,
    setAutomationDate,
  ] =
    useState(today());

  const [
    settlement,
    setSettlement,
  ] =
    useState({
      ownerId: "",
      start: monthStart(),
      end: today(),
    });

  const [
    invoiceReservationId,
    setInvoiceReservationId,
  ] =
    useState("");


  const load =
    useCallback(
      async () => {

        setLoading(true);
        setError("");

        try {

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (!user) return;

          const current =
            await getCurrentMembership(
              user.id
            );

          if (!current) return;

          setMembership(
            current
          );

          const companyId =
            current.company_id;


          const [
            summaryResult,
            ownerResult,
            reservationResult,
            taskResult,
            jobResult,
          ] =
            await Promise.all([

              supabase.rpc(
                "get_villa_professional_summary",
                {
                  p_company_id:
                    companyId,
                  p_date:
                    automationDate,
                }
              ),

              supabase
                .from(
                  "villa_owners"
                )
                .select(
                  "id,full_name"
                )
                .eq(
                  "company_id",
                  companyId
                )
                .eq(
                  "is_active",
                  true
                )
                .order(
                  "full_name"
                ),

              supabase
                .from(
                  "villa_reservations"
                )
                .select(
                  "id,reservation_code,guest_name"
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "status",
                  "cancelled"
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  100
                ),

              supabase
                .from(
                  "villa_operation_tasks"
                )
                .select(
                  "id,task_type,title,task_date,priority,status"
                )
                .eq(
                  "company_id",
                  companyId
                )
                .order(
                  "task_date",
                  {
                    ascending:
                      true,
                  }
                )
                .limit(
                  100
                ),

              supabase
                .from(
                  "villa_invoice_jobs"
                )
                .select(
                  "id,status,job_type,created_at,error_message"
                )
                .eq(
                  "company_id",
                  companyId
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  50
                ),

            ]);


          const firstError =
            [
              summaryResult,
              ownerResult,
              reservationResult,
              taskResult,
              jobResult,
            ].find(
              (item) =>
                item.error
            )?.error;

          if (firstError) {
            throw firstError;
          }


          setSummary(
            summaryResult.data as Summary
          );

          setOwners(
            (ownerResult.data ??
              []) as Owner[]
          );

          setReservations(
            (reservationResult.data ??
              []) as Reservation[]
          );

          setTasks(
            (taskResult.data ??
              []) as Task[]
          );

          setJobs(
            (jobResult.data ??
              []) as InvoiceJob[]
          );


          const firstOwner =
            (
              ownerResult.data?.[0] as
                | Owner
                | undefined
            )?.id ?? "";

          const firstReservation =
            (
              reservationResult
                .data?.[0] as
                | Reservation
                | undefined
            )?.id ?? "";


          setSettlement(
            (currentState) => ({
              ...currentState,
              ownerId:
                currentState.ownerId ||
                firstOwner,
            })
          );

          setInvoiceReservationId(
            (currentState) =>
              currentState ||
              firstReservation
          );

        } catch (
          loadError
        ) {

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Villa OS kontrol merkezi yüklenemedi."
          );

        } finally {

          setLoading(false);

        }

      },
      [
        automationDate,
      ]
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ]
  );


  async function generateTasks() {

    if (!membership) return;

    setBusy(true);
    setError("");
    setMessage("");

    const {
      data,
      error:
        rpcError,
    } =
      await supabase.rpc(
        "generate_villa_daily_tasks",
        {
          p_company_id:
            membership.company_id,
          p_date:
            automationDate,
        }
      );

    if (rpcError) {

      setError(
        rpcError.message
      );

    } else {

      const created =
        Number(
          data?.created ?? 0
        );

      setMessage(
        `${automationDate} için ${created} yeni operasyon görevi oluşturuldu.`
      );

      await load();

    }

    setBusy(false);

  }


  async function generateSettlement(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !settlement.ownerId
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");


    const {
      data,
      error:
        rpcError,
    } =
      await supabase.rpc(
        "generate_villa_owner_settlement",
        {
          p_company_id:
            membership.company_id,

          p_owner_id:
            settlement.ownerId,

          p_period_start:
            settlement.start,

          p_period_end:
            settlement.end,

          p_currency:
            "TRY",
        }
      );


    if (rpcError) {

      setError(
        rpcError.message
      );

    } else {

      setMessage(
        `Malik hakedişi oluşturuldu. Kayıt: ${String(
          data
        ).slice(0, 8)}`
      );

      await load();

    }

    setBusy(false);

  }


  async function queueInvoice(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !invoiceReservationId
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");


    const {
      data,
      error:
        rpcError,
    } =
      await supabase.rpc(
        "queue_villa_invoice",
        {
          p_company_id:
            membership.company_id,

          p_reservation_id:
            invoiceReservationId,

          p_connector_id:
            null,
        }
      );


    if (rpcError) {

      setError(
        rpcError.message
      );

    } else {

      setMessage(
        `Fatura kuyruğa alındı. İş: ${String(
          data
        ).slice(0, 8)}`
      );

      await load();

    }

    setBusy(false);

  }


  if (loading) {

    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#06101b] text-slate-400">
        Villa OS profesyonel kontrol merkezi hazırlanıyor…
      </main>
    );

  }


  const cards = [

    [
      "Aktif Villa",
      summary?.active_villas ?? 0,
      FaHome,
    ],

    [
      "Bugünkü Giriş",
      summary?.today_checkins ?? 0,
      FaCalendarCheck,
    ],

    [
      "Bugünkü Çıkış",
      summary?.today_checkouts ?? 0,
      FaCalendarCheck,
    ],

    [
      "Açık Görev",
      summary?.open_tasks ?? 0,
      FaClipboardCheck,
    ],

    [
      "Kritik Görev",
      summary?.critical_tasks ?? 0,
      FaBolt,
    ],

    [
      "Bekleyen Fatura",
      summary?.pending_invoices ?? 0,
      FaFileInvoiceDollar,
    ],

  ] as const;


  return (
    <main className="min-h-screen bg-[#06101b] p-5 text-white lg:p-7">

      <div className="mx-auto max-w-[1750px]">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.28em] text-violet-300">
              TUROBUS VILLA OS · PROFESSIONAL
            </div>

            <h1 className="mt-2 text-3xl font-black">
              Villa OS Kontrol Kulesi
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Giriş-çıkış otomasyonu, görevler, malik hakedişi,
              fatura kuyruğu, depozito ve operasyon kontrolü.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            <Link
              href="/dashboard/villa-os/control-center"
              className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-slate-300"
            >
              PMS Takvimi
            </Link>

            <Link
              href="/dashboard/villa-os/finance-center"
              className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-slate-300"
            >
              Finans Merkezi
            </Link>

            <button
              type="button"
              onClick={() =>
                void load()
              }
              className="rounded-xl bg-violet-400 px-5 py-3 text-xs font-black text-slate-950"
            >
              Yenile
            </button>

          </div>

        </div>


        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}


        {message && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}


        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

          {cards.map(
            ([
              title,
              value,
              Icon,
            ]) => (

              <div
                key={title}
                className="rounded-2xl border border-white/[.07] bg-[#091724] p-5"
              >

                <div className="flex items-center justify-between">

                  <span className="text-[10px] font-black uppercase text-slate-500">
                    {title}
                  </span>

                  <Icon className="text-violet-300" />

                </div>

                <div className="mt-3 text-3xl font-black">
                  {value}
                </div>

              </div>

            )
          )}

        </div>


        <div className="mt-4 grid gap-3 lg:grid-cols-4">

          <div className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">
            <div className="text-xs text-slate-500">
              Açık Temizlik
            </div>
            <div className="mt-2 text-3xl font-black">
              {summary?.open_cleaning ?? 0}
            </div>
          </div>


          <div className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">
            <div className="text-xs text-slate-500">
              Açık Bakım
            </div>
            <div className="mt-2 text-3xl font-black">
              {summary?.open_maintenance ?? 0}
            </div>
          </div>


          <div className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">
            <div className="text-xs text-slate-500">
              Emanetteki Depozito
            </div>
            <div className="mt-2 text-2xl font-black">
              {money(
                summary?.held_deposits ??
                  0
              )}
            </div>
          </div>


          <div className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">
            <div className="text-xs text-slate-500">
              Açık Malik Hakedişi
            </div>
            <div className="mt-2 text-3xl font-black">
              {summary?.open_owner_settlements ?? 0}
            </div>
          </div>

        </div>


        <div className="mt-6 grid gap-5 2xl:grid-cols-3">

          <section className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">

            <div className="flex items-center gap-2">
              <FaBolt className="text-violet-300" />
              <h2 className="font-black">
                Günlük Operasyon Otomasyonu
              </h2>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Check-in, check-out, temizlik kontrolü,
              depozito ve fatura görevlerini otomatik üretir.
            </p>

            <label className="mt-5 block">

              <span className={label}>
                Operasyon Tarihi
              </span>

              <input
                type="date"
                className={input}
                value={automationDate}
                onChange={(event) =>
                  setAutomationDate(
                    event.target.value
                  )
                }
              />

            </label>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void generateTasks()
              }
              className="mt-4 w-full rounded-xl bg-violet-400 py-3 font-black text-slate-950 disabled:opacity-50"
            >
              Günlük Görevleri Üret
            </button>

          </section>


          <section className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">

            <div className="flex items-center gap-2">
              <FaMoneyCheckAlt className="text-violet-300" />
              <h2 className="font-black">
                Malik Hakedişi
              </h2>
            </div>

            <form
              onSubmit={
                generateSettlement
              }
              className="mt-5 space-y-3"
            >

              <label className="block">

                <span className={label}>
                  Villa Sahibi
                </span>

                <select
                  className={input}
                  value={
                    settlement.ownerId
                  }
                  onChange={(event) =>
                    setSettlement(
                      (current) => ({
                        ...current,
                        ownerId:
                          event.target
                            .value,
                      })
                    )
                  }
                >

                  <option value="">
                    Villa sahibi seçin
                  </option>

                  {owners.map(
                    (owner) => (
                      <option
                        key={owner.id}
                        value={owner.id}
                      >
                        {owner.full_name}
                      </option>
                    )
                  )}

                </select>

              </label>


              <div className="grid gap-3 sm:grid-cols-2">

                <label>

                  <span className={label}>
                    Dönem Başlangıcı
                  </span>

                  <input
                    type="date"
                    className={input}
                    value={
                      settlement.start
                    }
                    onChange={(event) =>
                      setSettlement(
                        (current) => ({
                          ...current,
                          start:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </label>


                <label>

                  <span className={label}>
                    Dönem Bitişi
                  </span>

                  <input
                    type="date"
                    className={input}
                    value={
                      settlement.end
                    }
                    onChange={(event) =>
                      setSettlement(
                        (current) => ({
                          ...current,
                          end:
                            event.target
                              .value,
                        })
                      )
                    }
                  />

                </label>

              </div>

              <button
                disabled={busy}
                className="w-full rounded-xl bg-violet-400 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                Hakedişi Otomatik Hesapla
              </button>

            </form>

          </section>


          <section className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">

            <div className="flex items-center gap-2">
              <FaFileInvoiceDollar className="text-violet-300" />
              <h2 className="font-black">
                E-Fatura / E-Arşiv Kuyruğu
              </h2>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Provider bağlantısı hazır olduğunda aynı kuyruk
              gerçek e-Fatura servisine bağlanabilir.
            </p>

            <form
              onSubmit={
                queueInvoice
              }
              className="mt-5 space-y-3"
            >

              <label className="block">

                <span className={label}>
                  Faturalandırılacak Rezervasyon
                </span>

                <select
                  className={input}
                  value={
                    invoiceReservationId
                  }
                  onChange={(event) =>
                    setInvoiceReservationId(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Rezervasyon seçin
                  </option>

                  {reservations.map(
                    (reservation) => (
                      <option
                        key={
                          reservation.id
                        }
                        value={
                          reservation.id
                        }
                      >
                        {
                          reservation.reservation_code
                        } ·{" "}
                        {
                          reservation.guest_name
                        }
                      </option>
                    )
                  )}

                </select>

              </label>

              <button
                disabled={busy}
                className="w-full rounded-xl bg-violet-400 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                Faturayı Kuyruğa Al
              </button>

            </form>

          </section>

        </div>


        <div className="mt-6 grid gap-5 2xl:grid-cols-2">

          <section className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h2 className="font-black">
                  Operasyon Görev Merkezi
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Giriş, çıkış, temizlik, depozito ve fatura görevleri.
                </p>

              </div>

              <FaClipboardCheck className="text-violet-300" />

            </div>


            <div className="mt-4 overflow-x-auto">

              <table className="w-full min-w-[700px] text-left text-xs">

                <thead className="text-slate-500">

                  <tr>
                    <th className="py-3">
                      TARİH
                    </th>
                    <th>
                      GÖREV
                    </th>
                    <th>
                      TİP
                    </th>
                    <th>
                      ÖNCELİK
                    </th>
                    <th>
                      DURUM
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {tasks.map(
                    (task) => (

                      <tr
                        key={task.id}
                        className="border-t border-white/[.05]"
                      >

                        <td className="py-3">
                          {task.task_date}
                        </td>

                        <td className="font-bold">
                          {task.title}
                        </td>

                        <td>
                          {task.task_type}
                        </td>

                        <td>
                          {task.priority}
                        </td>

                        <td>
                          {task.status}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>


          <section className="rounded-2xl border border-white/[.07] bg-[#091724] p-5">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h2 className="font-black">
                  Fatura İşlem Kuyruğu
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Provider entegrasyonuna gönderilecek işlemler.
                </p>

              </div>

              <FaShieldAlt className="text-violet-300" />

            </div>


            <div className="mt-4 overflow-x-auto">

              <table className="w-full min-w-[620px] text-left text-xs">

                <thead className="text-slate-500">

                  <tr>
                    <th className="py-3">
                      TARİH
                    </th>
                    <th>
                      İŞLEM
                    </th>
                    <th>
                      DURUM
                    </th>
                    <th>
                      HATA
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {jobs.map(
                    (job) => (

                      <tr
                        key={job.id}
                        className="border-t border-white/[.05]"
                      >

                        <td className="py-3">
                          {new Date(
                            job.created_at
                          ).toLocaleString(
                            "tr-TR"
                          )}
                        </td>

                        <td>
                          {job.job_type}
                        </td>

                        <td>
                          {job.status}
                        </td>

                        <td className="max-w-[260px] truncate text-red-300">
                          {job.error_message ??
                            "—"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </div>


        <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/[.06] p-5">

          <div className="flex items-center gap-2">
            <FaUsers className="text-violet-300" />
            <h3 className="font-black">
              Villa OS Profesyonel Akış
            </h3>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Rezervasyon → Merkezi Takvim → Misafir →
            Check-in → Operasyon Görevleri → Check-out →
            Temizlik / Hasar Kontrolü → Depozito →
            Fatura → Malik Hakedişi → Finans →
            Gün Sonu.
          </p>

        </div>

      </div>

    </main>
  );
}
