"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBirthdayCake,
  FaChevronRight,
  FaEnvelope,
  FaExclamationTriangle,
  FaFilter,
  FaIdCard,
  FaPhone,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUserCircle,
  FaUsers,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  createCustomer360,
  loadCustomer360List,
} from "@/lib/customer-360/repository";

import type {
  Customer360Customer,
} from "@/lib/customer-360/types";


type FormState = {
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  identityType: string;
  identityNumber: string;
  city: string;
  country: string;
  source: string;
};


const emptyForm:
  FormState = {
    fullName: "",
    phone: "",
    email: "",
    birthDate: "",
    identityType: "",
    identityNumber: "",
    city: "",
    country: "Türkiye",
    source: "manual",
  };


function segmentLabel(
  value:
    Customer360Customer["segment"]
) {
  if (
    value === "vip"
  ) {
    return "VIP";
  }

  if (
    value === "repeat"
  ) {
    return "Tekrar Müşteri";
  }

  if (
    value === "corporate"
  ) {
    return "Kurumsal";
  }

  if (
    value === "risk"
  ) {
    return "Risk";
  }

  return "Standart";
}


function segmentTone(
  value:
    Customer360Customer["segment"]
) {
  if (
    value === "vip"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (
    value === "risk"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (
    value === "repeat"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


export default function Customer360Page() {
  const [
    customers,
    setCustomers,
  ] =
    useState<
      Customer360Customer[]
    >(
      []
    );


  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    companyName,
    setCompanyName,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(false);


  const [
    query,
    setQuery,
  ] =
    useState("");


  const [
    segment,
    setSegment,
  ] =
    useState("all");


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      emptyForm
    );


  const refresh =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {
        const rows =
          await loadCustomer360List(
            currentCompanyId
          );

        setCustomers(
          rows
        );
      },
      []
    );


  useEffect(() => {
    void (
      async () => {
        setLoading(
          true
        );

        setError("");

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

          setCompanyName(
            membership.company.name
          );

          await refresh(
            membership.company_id
          );
        } catch (
          currentError
        ) {
          setError(
            currentError instanceof
              Error
              ? currentError.message
              : String(
                  currentError
                )
          );
        } finally {
          setLoading(
            false
          );
        }
      }
    )();
  }, [
    refresh,
  ]);


  const filtered =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );

        return customers.filter(
          (
            customer
          ) => {
            const haystack =
              [
                customer.full_name,
                customer.phone,
                customer.email,
                customer.customer_code,
                customer.identity_number,
                customer.city,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLocaleLowerCase(
                  "tr"
                );

            const matchesSearch =
              !needle ||
              haystack.includes(
                needle
              );

            const matchesSegment =
              segment ===
                "all" ||
              customer.segment ===
                segment;

            return (
              matchesSearch &&
              matchesSegment
            );
          }
        );
      },
      [
        customers,
        query,
        segment,
      ]
    );


  const vipCount =
    customers.filter(
      (
        customer
      ) =>
        customer.segment ===
        "vip"
    ).length;


  const repeatCount =
    customers.filter(
      (
        customer
      ) =>
        customer.segment ===
        "repeat"
    ).length;


  async function saveCustomer() {
    if (
      !form.fullName.trim()
    ) {
      setError(
        "Ad soyad zorunlu."
      );

      return;
    }


    setSaving(
      true
    );

    setError("");


    try {
      const result =
        await createCustomer360(
          {
            companyId,

            fullName:
              form.fullName.trim(),

            phone:
              form.phone.trim(),

            email:
              form.email.trim(),

            birthDate:
              form.birthDate,

            identityType:
              form.identityType as
                | "tc"
                | "passport"
                | "other"
                | "",

            identityNumber:
              form.identityNumber.trim(),

            city:
              form.city.trim(),

            country:
              form.country.trim(),

            source:
              form.source.trim(),
          }
        );


      await refresh(
        companyId
      );


      setForm(
        emptyForm
      );

      setModalOpen(
        false
      );


      window.location.href =
        `/dashboard/musteri-360/${result.customer_id}`;

    } catch (
      currentError
    ) {
      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );

    } finally {
      setSaving(
        false
      );
    }
  }


  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <div className="text-center">
          <FaUserCircle className="mx-auto animate-pulse text-3xl text-orange-400" />

          <div className="mt-4 text-sm font-black">
            Müşteri 360 yükleniyor...
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">
      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                  TUROBUS CUSTOMER OS
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-300">
                  ● Şirket izolasyonlu
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Müşteri{" "}
                <span className="text-orange-400">
                  360
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">
                {companyName || "Aktif firma"} · Her müşteriyi tek merkezi profilde toplayan müşteri kimlik ve ilişki katmanı.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/musteri-360/canli-senkronizasyon"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.06] px-5 text-xs font-black text-orange-300 transition hover:bg-orange-500/10"
              >
                <FaUserCircle />
                Canlı Senkronizasyon
              </Link>

              <Link
                href="/dashboard/musteri-360/otomatik-profiller"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] px-5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/10"
              >
                <FaUserCircle />
                Otomatik Profiller
              </Link>

              <Link
                href="/dashboard/musteri-360/eslestirme"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 text-xs font-black text-slate-200 transition hover:border-orange-500/20 hover:text-orange-300"
              >
                <FaUsers />
                Eşleştirme Merkezi
              </Link>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    true
                  )
                }
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white shadow-lg shadow-orange-500/10 transition hover:bg-orange-400"
              >
                <FaPlus />
                Yeni Müşteri
              </button>
            </div>
          </div>
        </section>


        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-400" />

            <div className="min-w-0 flex-1 text-xs font-bold text-red-200">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-red-300"
            >
              <FaTimes />
            </button>
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title:
                "Toplam Müşteri",

              value:
                customers.length,

              detail:
                "Merkezi müşteri profili",

              icon:
                <FaUsers />,
            },

            {
              title:
                "VIP",

              value:
                vipCount,

              detail:
                "VIP segmentindeki müşteriler",

              icon:
                <FaUserCircle />,
            },

            {
              title:
                "Tekrar Müşteri",

              value:
                repeatCount,

              detail:
                "Tekrar satın alma segmenti",

              icon:
                <FaBirthdayCake />,
            },

            {
              title:
                "Aktif Profil",

              value:
                customers.filter(
                  (
                    customer
                  ) =>
                    customer.status ===
                    "active"
                ).length,

              detail:
                "Kullanılabilir müşteri kaydı",

              icon:
                <FaIdCard />,
            },
          ].map(
            (
              item
            ) => (
              <article
                key={
                  item.title
                }
                className="rounded-[24px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[.17em] text-slate-600">
                      {item.title}
                    </div>

                    <div className="mt-3 text-3xl font-black">
                      {item.value}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500">
                      {item.detail}
                    </div>
                  </div>

                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-300">
                    {item.icon}
                  </div>
                </div>
              </article>
            )
          )}
        </section>


        <section className="mt-5 rounded-[26px] border border-white/10 bg-[#07131f]">
          <div className="flex flex-col gap-3 border-b border-white/[.07] p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

              <input
                value={
                  query
                }
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Ad, telefon, e-posta, müşteri kodu, kimlik veya şehir ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-xs font-bold outline-none transition focus:border-orange-500/40"
              />
            </div>

            <div className="relative">
              <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

              <select
                value={
                  segment
                }
                onChange={(
                  event
                ) =>
                  setSegment(
                    event.target.value
                  )
                }
                className="h-12 min-w-[210px] rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-xs font-bold outline-none"
              >
                <option value="all">
                  Tüm segmentler
                </option>

                <option value="standard">
                  Standart
                </option>

                <option value="repeat">
                  Tekrar Müşteri
                </option>

                <option value="vip">
                  VIP
                </option>

                <option value="corporate">
                  Kurumsal
                </option>

                <option value="risk">
                  Risk
                </option>
              </select>
            </div>
          </div>


          {filtered.length ===
          0 ? (
            <div className="p-12 text-center">
              <FaUserCircle className="mx-auto text-4xl text-slate-800" />

              <div className="mt-4 text-sm font-black">
                Müşteri bulunamadı
              </div>

              <div className="mt-2 text-[10px] text-slate-600">
                İlk merkezi müşteri profilini oluşturarak başlayabilirsiniz.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/[.07] text-left text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                    <th className="px-5 py-4">
                      Müşteri
                    </th>

                    <th className="px-5 py-4">
                      İletişim
                    </th>

                    <th className="px-5 py-4">
                      Konum
                    </th>

                    <th className="px-5 py-4">
                      Segment
                    </th>

                    <th className="px-5 py-4">
                      Kimlik
                    </th>

                    <th className="px-5 py-4 text-right">
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map(
                    (
                      customer
                    ) => (
                      <tr
                        key={
                          customer.id
                        }
                        className="border-b border-white/[.05] transition hover:bg-white/[.025]"
                      >
                        <td className="px-5 py-4">
                          <div className="font-black text-sm">
                            {customer.full_name}
                          </div>

                          <div className="mt-1 text-[9px] font-bold text-slate-600">
                            {customer.customer_code}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1.5 text-[10px] text-slate-400">
                            <div className="flex items-center gap-2">
                              <FaPhone className="text-slate-700" />
                              {customer.phone || "—"}
                            </div>

                            <div className="flex items-center gap-2">
                              <FaEnvelope className="text-slate-700" />
                              {customer.email || "—"}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[10px] text-slate-400">
                          {[
                            customer.city,
                            customer.country,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ", "
                            ) || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${segmentTone(
                              customer.segment
                            )}`}
                          >
                            {segmentLabel(
                              customer.segment
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[10px] text-slate-400">
                          {customer.identity_type
                            ? `${customer.identity_type.toUpperCase()} · ${customer.identity_number
                              ? `••••${customer.identity_number.slice(-4)}`
                              : "Kayıt yok"}`
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/musteri-360/${customer.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 text-[9px] font-black text-slate-300 transition hover:border-orange-500/20 hover:text-orange-300"
                          >
                            Profili Aç
                            <FaChevronRight />
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>


      {modalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#07131f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[.07] p-5">
              <div>
                <div className="text-lg font-black">
                  Yeni Müşteri
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  Merkezi müşteri profili oluşturulur.
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-400"
              >
                <FaTimes />
              </button>
            </div>


            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Ad Soyad *
                </span>

                <input
                  value={
                    form.fullName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        fullName:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none focus:border-orange-500/40"
                />
              </label>


              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Telefon
                </span>

                <input
                  value={
                    form.phone
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        phone:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none"
                />
              </label>


              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  E-posta
                </span>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        email:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none"
                />
              </label>


              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Doğum Tarihi
                </span>

                <input
                  type="date"
                  value={
                    form.birthDate
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        birthDate:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none"
                />
              </label>


              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Kimlik Tipi
                </span>

                <select
                  value={
                    form.identityType
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        identityType:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none"
                >
                  <option value="">
                    Seçiniz
                  </option>

                  <option value="tc">
                    T.C. Kimlik
                  </option>

                  <option value="passport">
                    Pasaport
                  </option>

                  <option value="other">
                    Diğer
                  </option>
                </select>
              </label>


              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Kimlik / Pasaport No
                </span>

                <input
                  value={
                    form.identityNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        identityNumber:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none"
                />
              </label>


              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Şehir
                </span>

                <input
                  value={
                    form.city
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        city:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none"
                />
              </label>


              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Ülke
                </span>

                <input
                  value={
                    form.country
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      {
                        ...form,
                        country:
                          event.target.value,
                      }
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-bold outline-none"
                />
              </label>
            </div>


            <div className="flex justify-end gap-3 border-t border-white/[.07] p-5">
              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="h-11 rounded-xl border border-white/10 px-5 text-xs font-black text-slate-400"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  void saveCustomer()
                }
                className="h-11 rounded-xl bg-orange-500 px-6 text-xs font-black text-white disabled:opacity-40"
              >
                {saving
                  ? "Kaydediliyor..."
                  : "Müşteriyi Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
