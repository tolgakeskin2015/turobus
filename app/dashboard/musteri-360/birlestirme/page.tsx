"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaSearch,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  loadCustomer360List,
  loadCustomer360MergePreview,
  mergeCustomer360Profiles,
} from "@/lib/customer-360/repository";

import type {
  Customer360MergePreview,
} from "@/lib/customer-360/repository";

import type {
  Customer360Customer,
} from "@/lib/customer-360/types";


export default function CustomerMergeCenterPage() {
  const [
    companyId,
    setCompanyId,
  ] = useState("");

  const [
    customers,
    setCustomers,
  ] =
    useState<Customer360Customer[]>(
      []
    );

  const [
    targetId,
    setTargetId,
  ] = useState("");

  const [
    sourceId,
    setSourceId,
  ] = useState("");

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    preview,
    setPreview,
  ] =
    useState<Customer360MergePreview | null>(
      null
    );

  const [
    confirmation,
    setConfirmation,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    previewing,
    setPreviewing,
  ] = useState(false);

  const [
    merging,
    setMerging,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    void (
      async () => {
        try {
          const user =
            await getCurrentUser();

          if (!user) {
            throw new Error(
              "Aktif kullanıcı bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              user.id
            );

          if (!membership) {
            throw new Error(
              "Aktif firma bulunamadı."
            );
          }

          setCompanyId(
            membership.company_id
          );

          const rows =
            await loadCustomer360List(
              membership.company_id
            );

          setCustomers(
            rows
          );

        } catch (
          currentError
        ) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : String(currentError)
          );

        } finally {
          setLoading(false);
        }
      }
    )();
  }, []);


  const filtered =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );

        if (!needle) {
          return customers;
        }

        return customers.filter(
          (
            customer
          ) =>
            [
              customer.full_name,
              customer.customer_code,
              customer.phone,
              customer.email,
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(needle)
        );
      },
      [
        customers,
        query,
      ]
    );


  const target =
    customers.find(
      (
        customer
      ) =>
        customer.id ===
        targetId
    ) ?? null;


  const source =
    customers.find(
      (
        customer
      ) =>
        customer.id ===
        sourceId
    ) ?? null;


  async function createPreview() {
    if (
      !companyId ||
      !targetId ||
      !sourceId
    ) {
      setError(
        "Hedef ve kaynak müşteri seçin."
      );

      return;
    }

    if (
      targetId ===
      sourceId
    ) {
      setError(
        "Aynı müşteri birleştirilemez."
      );

      return;
    }

    setPreviewing(true);
    setError("");
    setPreview(null);
    setConfirmation("");

    try {
      const result =
        await loadCustomer360MergePreview(
          companyId,
          targetId,
          sourceId
        );

      setPreview(
        result
      );

    } catch (
      currentError
    ) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError)
      );

    } finally {
      setPreviewing(false);
    }
  }


  async function executeMerge() {
    if (
      confirmation !==
      "BİRLEŞTİR"
    ) {
      setError(
        'Devam etmek için "BİRLEŞTİR" yazın.'
      );

      return;
    }

    setMerging(true);
    setError("");

    try {
      const result =
        await mergeCustomer360Profiles(
          companyId,
          targetId,
          sourceId
        );

      window.location.href =
        `/dashboard/musteri-360/${result.target_customer_id}`;

    } catch (
      currentError
    ) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError)
      );

      setMerging(false);
    }
  }


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        <div className="text-sm font-black">
          Birleştirme Merkezi yükleniyor...
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.12),transparent_36%),linear-gradient(145deg,#07131f,#040b12)]">

          <div className="border-b border-white/[.07] p-6 lg:p-8">

            <Link
              href="/dashboard/musteri-360"
              className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 transition hover:text-orange-300"
            >
              <FaArrowLeft />
              Müşteri 360
            </Link>


            <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
                  <FaExchangeAlt />
                  DUPLICATE MERGE CENTER
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                  Müşteri
                  <span className="text-orange-400">
                    {" "}
                    Birleştirme Merkezi
                  </span>
                </h1>

                <p className="mt-3 max-w-3xl text-[10px] leading-6 text-slate-500">
                  Aynı kişiye ait mükerrer profilleri tek ana müşteri altında güvenli biçimde birleştirir. Rezervasyon, finans, mesaj, not, grup ve operasyon bağlantıları korunur.
                </p>

              </div>


              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[.045] px-4 py-3 text-[8px] font-black text-emerald-300">
                <FaShieldAlt />
                Audit kayıtlı işlem
              </div>

            </div>

          </div>


          {error && (
            <div className="border-b border-red-500/15 bg-red-500/[.045] px-6 py-4 text-[9px] font-bold text-red-200">
              <FaExclamationTriangle className="mr-2 inline" />
              {error}
            </div>
          )}


          <div className="p-6 lg:p-8">

            <div className="relative mb-5">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />

              <input
                value={query}
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Müşteri adı, kod, telefon veya e-posta ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-[10px] font-bold outline-none focus:border-orange-500/30"
              />
            </div>


            <div className="grid gap-5 lg:grid-cols-2">

              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[.025] p-5">

                <div className="text-[8px] font-black uppercase tracking-[.15em] text-emerald-300">
                  1 · HEDEF PROFİL
                </div>

                <div className="mt-2 text-sm font-black">
                  Korunacak ana müşteri
                </div>

                <select
                  value={targetId}
                  onChange={(
                    event
                  ) => {
                    setTargetId(
                      event.target.value
                    );
                    setPreview(null);
                  }}
                  className="mt-4 h-12 w-full rounded-xl border border-white/10 bg-[#06111c] px-4 text-[10px] font-bold outline-none"
                >
                  <option value="">
                    Hedef müşteri seçin
                  </option>

                  {filtered.map(
                    (
                      customer
                    ) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.full_name} · {customer.customer_code}
                      </option>
                    )
                  )}
                </select>


                {target && (
                  <div className="mt-4 rounded-xl border border-white/[.07] bg-black/20 p-4">

                    <div className="text-xs font-black">
                      {target.full_name}
                    </div>

                    <div className="mt-2 text-[8px] text-slate-500">
                      {target.phone || "Telefon yok"}
                    </div>

                    <div className="mt-1 text-[8px] text-slate-500">
                      {target.email || "E-posta yok"}
                    </div>

                  </div>
                )}

              </div>


              <div className="rounded-2xl border border-red-500/15 bg-red-500/[.02] p-5">

                <div className="text-[8px] font-black uppercase tracking-[.15em] text-red-300">
                  2 · KAYNAK PROFİL
                </div>

                <div className="mt-2 text-sm font-black">
                  Birleştirilecek mükerrer kayıt
                </div>

                <select
                  value={sourceId}
                  onChange={(
                    event
                  ) => {
                    setSourceId(
                      event.target.value
                    );
                    setPreview(null);
                  }}
                  className="mt-4 h-12 w-full rounded-xl border border-white/10 bg-[#06111c] px-4 text-[10px] font-bold outline-none"
                >
                  <option value="">
                    Kaynak müşteri seçin
                  </option>

                  {filtered.map(
                    (
                      customer
                    ) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.full_name} · {customer.customer_code}
                      </option>
                    )
                  )}
                </select>


                {source && (
                  <div className="mt-4 rounded-xl border border-white/[.07] bg-black/20 p-4">

                    <div className="text-xs font-black">
                      {source.full_name}
                    </div>

                    <div className="mt-2 text-[8px] text-slate-500">
                      {source.phone || "Telefon yok"}
                    </div>

                    <div className="mt-1 text-[8px] text-slate-500">
                      {source.email || "E-posta yok"}
                    </div>

                  </div>
                )}

              </div>

            </div>


            <button
              type="button"
              onClick={() =>
                void createPreview()
              }
              disabled={
                previewing ||
                !targetId ||
                !sourceId ||
                targetId === sourceId
              }
              className="mt-5 min-h-12 w-full rounded-xl bg-orange-500 px-5 text-[10px] font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {previewing
                ? "Analiz ediliyor..."
                : "Birleştirme Önizlemesi Oluştur"}
            </button>


            {preview && (
              <div className="mt-7 rounded-[24px] border border-white/10 bg-black/20 p-5 lg:p-6">

                <div className="flex items-center gap-2 text-sm font-black">
                  <FaUsers className="text-orange-300" />
                  Taşınacak Müşteri Verileri
                </div>


                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">

                  {[
                    [
                      "Yolcu",
                      preview.travelers,
                    ],
                    [
                      "Not",
                      preview.notes,
                    ],
                    [
                      "Tercih",
                      preview.preferences,
                    ],
                    [
                      "Talep / Şikâyet",
                      preview.cases,
                    ],
                    [
                      "Mesaj",
                      preview.messages,
                    ],
                    [
                      "Operasyon Bağı",
                      preview.entity_links,
                    ],
                    [
                      "Grup",
                      preview.group_memberships,
                    ],
                    [
                      "İlişki",
                      preview.relationships,
                    ],
                  ].map(
                    (
                      [
                        label,
                        value,
                      ]
                    ) => (
                      <div
                        key={label}
                        className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"
                      >
                        <div className="text-[7px] font-black uppercase text-slate-600">
                          {label}
                        </div>

                        <div className="mt-2 text-xl font-black">
                          {value}
                        </div>
                      </div>
                    )
                  )}

                </div>


                {(
                  preview.phone_conflict ||
                  preview.email_conflict ||
                  preview.identity_conflict
                ) && (
                  <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[.05] p-4">

                    <div className="flex items-center gap-2 text-[9px] font-black text-amber-300">
                      <FaExclamationTriangle />
                      Profil alanlarında farklılık bulundu
                    </div>

                    <div className="mt-2 text-[8px] leading-5 text-slate-500">
                      Hedef profil önceliklidir. Hedefte boş olan alanlar kaynak profilden tamamlanır.
                    </div>

                  </div>
                )}


                <div className="mt-5 rounded-xl border border-red-500/15 bg-red-500/[.035] p-4">

                  <div className="text-[9px] font-black text-red-200">
                    Bu işlem kaynak müşteri profilini kaldırır.
                  </div>

                  <div className="mt-2 text-[8px] leading-5 text-slate-500">
                    İlişkili Customer 360 kayıtları hedef müşteriye taşınır ve işlem audit geçmişine kaydedilir.
                  </div>

                </div>


                <div className="mt-5">

                  <label className="text-[8px] font-black text-slate-500">
                    Onaylamak için BİRLEŞTİR yazın
                  </label>

                  <input
                    value={confirmation}
                    onChange={(
                      event
                    ) =>
                      setConfirmation(
                        event.target.value
                      )
                    }
                    placeholder="BİRLEŞTİR"
                    className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px] font-black outline-none focus:border-red-500/30"
                  />

                </div>


                <button
                  type="button"
                  onClick={() =>
                    void executeMerge()
                  }
                  disabled={
                    merging ||
                    confirmation !==
                      "BİRLEŞTİR"
                  }
                  className="mt-4 min-h-12 w-full rounded-xl border border-red-500/25 bg-red-500/[.09] px-5 text-[10px] font-black text-red-200 transition hover:bg-red-500/[.14] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {merging
                    ? "Profiller birleştiriliyor..."
                    : "Profilleri Güvenli Şekilde Birleştir"}
                </button>

              </div>
            )}

          </div>

        </section>

      </div>

    </main>
  );
}
