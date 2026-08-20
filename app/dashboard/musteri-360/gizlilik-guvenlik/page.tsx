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
  FaIdCard,
  FaLock,
  FaSearch,
  FaShieldAlt,
  FaTimesCircle,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  loadCustomer360PrivacyCenter,
} from "@/lib/customer-360/repository";

import type {
  Customer360PrivacyCenterSnapshot,
} from "@/lib/customer-360/repository";


export default function CustomerPrivacyCenterPage() {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      Customer360PrivacyCenterSnapshot | null
    >(null);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    consentFilter,
    setConsentFilter,
  ] =
    useState("all");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");


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

          const result =
            await loadCustomer360PrivacyCenter(
              membership.company_id
            );

          setSnapshot(
            result
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
          setLoading(false);
        }
      }
    )();
  }, []);


  const filtered =
    useMemo(
      () => {
        const rows =
          snapshot?.customers ??
          [];

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );

        return rows.filter(
          (
            customer
          ) => {
            if (
              consentFilter ===
                "kvkk_missing" &&
              customer.kvkk_consent
            ) {
              return false;
            }

            if (
              consentFilter ===
                "marketing" &&
              !customer.marketing_consent
            ) {
              return false;
            }

            if (
              consentFilter ===
                "identity" &&
              !customer.identity_masked
            ) {
              return false;
            }

            if (!needle) {
              return true;
            }

            return [
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
              .includes(
                needle
              );
          }
        );
      },
      [
        snapshot,
        query,
        consentFilter,
      ]
    );


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        Gizlilik merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/musteri-360"
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Müşteri 360
        </Link>


        <section className="mt-4 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.11),transparent_34%),linear-gradient(145deg,#07131f,#040b12)]">

          <div className="border-b border-white/[.07] p-6 lg:p-8">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.17em] text-orange-300">
                  <FaShieldAlt />
                  PRIVACY & SECURITY CENTER
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                  KVKK & Kimlik
                  <span className="text-orange-400">
                    {" "}
                    Güvenlik Merkezi
                  </span>
                </h1>

                <p className="mt-3 max-w-3xl text-[10px] leading-6 text-slate-500">
                  Müşteri izin durumlarını, korunan kimlik kayıtlarını ve veri güvenliği kapsamını şirket genelinde izleyin.
                </p>

              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] px-4 py-3 text-[8px] font-black text-emerald-300">
                <FaLock />
                Ham kimlik normal profillerde tutulmaz
              </div>

            </div>


            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

              {[
                [
                  "Toplam Müşteri",
                  snapshot?.total_customers ??
                    0,
                ],
                [
                  "KVKK Kaydı",
                  snapshot?.kvkk_granted ??
                    0,
                ],
                [
                  "Pazarlama İzni",
                  snapshot?.marketing_granted ??
                    0,
                ],
                [
                  "Korunan Kimlik",
                  snapshot?.protected_identity_count ??
                    0,
                ],
              ].map(
                (
                  [
                    label,
                    value,
                  ]
                ) => (
                  <div
                    key={
                      label
                    }
                    className="rounded-2xl border border-white/[.07] bg-black/20 p-4"
                  >
                    <div className="text-[7px] font-black uppercase tracking-[.11em] text-slate-600">
                      {label}
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      {value}
                    </div>
                  </div>
                )
              )}

            </div>

          </div>


          {error && (
            <div className="border-b border-red-500/15 bg-red-500/[.04] px-6 py-4 text-[9px] text-red-200">
              {error}
            </div>
          )}


          <div className="border-b border-white/[.07] p-4 lg:p-5">

            <div className="grid gap-3 lg:grid-cols-[1fr_240px]">

              <div className="relative">

                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />

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
                  placeholder="Müşteri, kod, telefon veya e-posta ara..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[9px] font-bold outline-none"
                />

              </div>


              <select
                value={
                  consentFilter
                }
                onChange={(
                  event
                ) =>
                  setConsentFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
              >
                <option value="all">
                  Tüm Müşteriler
                </option>

                <option value="kvkk_missing">
                  KVKK Kaydı Olmayan
                </option>

                <option value="marketing">
                  Pazarlama İzinli
                </option>

                <option value="identity">
                  Korunan Kimliği Olan
                </option>
              </select>

            </div>

          </div>


          <div className="overflow-auto">

            <table className="min-w-[1100px] w-full">

              <thead className="bg-[#081522]">

                <tr className="border-b border-white/[.07] text-left text-[7px] font-black uppercase tracking-[.12em] text-slate-600">

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    KVKK
                  </th>

                  <th className="px-5 py-4">
                    Pazarlama
                  </th>

                  <th className="px-5 py-4">
                    Kimlik
                  </th>

                  <th className="px-5 py-4">
                    Durum
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
                      className="border-b border-white/[.045] hover:bg-white/[.02]"
                    >

                      <td className="px-5 py-4">

                        <div className="text-[10px] font-black">
                          {customer.full_name}
                        </div>

                        <div className="mt-1 font-mono text-[7px] text-slate-600">
                          {customer.customer_code}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={
                            customer.kvkk_consent
                              ? "inline-flex items-center gap-1 text-[8px] font-black text-emerald-300"
                              : "inline-flex items-center gap-1 text-[8px] font-black text-slate-600"
                          }
                        >
                          {customer.kvkk_consent
                            ? <FaCheckCircle />
                            : <FaTimesCircle />}

                          {customer.kvkk_consent
                            ? "Kayıtlı"
                            : "Yok"}
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={
                            customer.marketing_consent
                              ? "inline-flex items-center gap-1 text-[8px] font-black text-emerald-300"
                              : "inline-flex items-center gap-1 text-[8px] font-black text-slate-600"
                          }
                        >
                          {customer.marketing_consent
                            ? <FaCheckCircle />
                            : <FaTimesCircle />}

                          {customer.marketing_consent
                            ? "İzinli"
                            : "İzinsiz"}
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <FaIdCard className="text-orange-300" />

                          <div>

                            <div className="font-mono text-[9px] font-black">
                              {customer.identity_masked ||
                                "—"}
                            </div>

                            <div className="mt-1 text-[7px] text-slate-600">
                              {customer.identity_type ||
                                "Kimlik yok"}
                            </div>

                          </div>

                        </div>

                      </td>


                      <td className="px-5 py-4 text-[8px] font-black text-slate-400">
                        {customer.status}
                      </td>


                      <td className="px-5 py-4 text-right">

                        <Link
                          href={`/dashboard/musteri-360/${customer.id}`}
                          className="inline-flex rounded-xl border border-orange-500/20 bg-orange-500/[.05] px-3 py-2 text-[8px] font-black text-orange-300"
                        >
                          Güvenlik Detayı
                        </Link>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}
