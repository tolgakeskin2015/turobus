"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowLeft,
  FaCheck,
  FaExclamationTriangle,
  FaLink,
  FaSearch,
  FaSync,
  FaTimes,
  FaUserCheck,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  applyCustomer360Match,
  applyCustomer360SafeMatches,
  buildCustomer360MatchQueue,
  discoverCustomer360Sources,
  ignoreCustomer360Match,
  loadCustomer360List,
  loadCustomer360MatchQueue,
} from "@/lib/customer-360/repository";

import type {
  Customer360Customer,
} from "@/lib/customer-360/types";

import type {
  Customer360MatchQueueRow,
} from "@/lib/customer-360/repository";


function confidenceTone(
  value:
    number
) {
  if (
    value >= 100
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value >= 90
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  return "border-red-500/20 bg-red-500/10 text-red-300";
}


function reasonLabel(
  value:
    string
) {
  if (
    value ===
    "phone_and_email"
  ) {
    return "Telefon + E-posta";
  }

  if (
    value ===
    "phone"
  ) {
    return "Telefon";
  }

  if (
    value ===
    "email"
  ) {
    return "E-posta";
  }

  return value;
}


export default function Customer360MatchCenter() {
  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    queue,
    setQueue,
  ] =
    useState<
      Customer360MatchQueueRow[]
    >(
      []
    );


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
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState("");


  const [
    query,
    setQuery,
  ] =
    useState("");


  const refresh =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {
        const [
          matchRows,
          customerRows,
        ] =
          await Promise.all([
            loadCustomer360MatchQueue(
              currentCompanyId
            ),

            loadCustomer360List(
              currentCompanyId
            ),
          ]);


        setQueue(
          matchRows
        );

        setCustomers(
          customerRows
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


  const pending =
    queue.filter(
      (
        row
      ) =>
        row.status ===
        "pending"
    );


  const conflicts =
    queue.filter(
      (
        row
      ) =>
        row.status ===
        "conflict"
    );


  const matched =
    queue.filter(
      (
        row
      ) =>
        row.status ===
        "matched"
    );


  const filtered =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        if (!needle) {
          return queue;
        }


        return queue.filter(
          (
            row
          ) =>
            [
              row.source_name,
              row.source_phone,
              row.source_email,
              row.source_table,
              row.entity_type,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLocaleLowerCase(
                "tr"
              )
              .includes(
                needle
              )
        );

      },
      [
        queue,
        query,
      ]
    );


  function customerName(
    id:
      string | null
  ) {
    if (!id) {
      return "Eşleşme yok";
    }


    return (
      customers.find(
        (
          customer
        ) =>
          customer.id ===
          id
      )?.full_name ??
      "Müşteri bulunamadı"
    );
  }


  async function buildQueue() {
    if (!companyId) {
      return;
    }


    setBusy(
      true
    );

    setError("");

    setNotice("");


    try {
      await discoverCustomer360Sources();

      await buildCustomer360MatchQueue(
        companyId
      );

      await refresh(
        companyId
      );


      setNotice(
        "Kaynak tablolar tarandı ve eşleştirme kuyruğu güncellendi."
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
      setBusy(
        false
      );
    }
  }


  async function autoApply() {
    if (
      !window.confirm(
        "Yalnızca tek ve yüksek güvenli telefon/e-posta eşleşmeleri Müşteri 360'a bağlanacak. Devam edilsin mi?"
      )
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");

    setNotice("");


    try {
      await applyCustomer360SafeMatches(
        companyId
      );

      await refresh(
        companyId
      );


      setNotice(
        "Güvenli eşleşmeler Müşteri 360 profillerine bağlandı."
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
      setBusy(
        false
      );
    }
  }


  async function applyOne(
    row:
      Customer360MatchQueueRow
  ) {
    if (
      !window.confirm(
        `${row.source_name || "Kayıt"} → ${customerName(row.suggested_customer_id)} bağlansın mı?`
      )
    ) {
      return;
    }


    setBusy(
      true
    );

    try {
      await applyCustomer360Match(
        row.id
      );

      await refresh(
        companyId
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
      setBusy(
        false
      );
    }
  }


  async function ignoreOne(
    row:
      Customer360MatchQueueRow
  ) {
    setBusy(
      true
    );

    try {
      await ignoreCustomer360Match(
        row.id
      );

      await refresh(
        companyId
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
      setBusy(
        false
      );
    }
  }


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Eşleştirme Merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">
      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/musteri-360"
          className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 transition hover:text-orange-300"
        >
          <FaArrowLeft />
          Müşteri 360
        </Link>


        <section className="mt-4 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.14),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                CUSTOMER IDENTITY ENGINE
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Müşteri{" "}
                <span className="text-orange-400">
                  Eşleştirme Merkezi
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">
                Eski rezervasyon ve teklif kayıtlarını telefon/e-posta üzerinden merkezi müşteri profiline güvenli biçimde bağlar. Kaynak tablolara yazmaz.
              </p>
            </div>


            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  void buildQueue()
                }
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 text-xs font-black"
              >
                <FaSync />
                Kaynakları Tara
              </button>

              <button
                type="button"
                disabled={
                  busy ||
                  pending.length ===
                    0
                }
                onClick={() =>
                  void autoApply()
                }
                className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white disabled:opacity-40"
              >
                <FaUserCheck />
                Güvenli Eşleşmeleri Uygula
              </button>
            </div>
          </div>
        </section>


        {(error ||
          notice) && (
          <div className="mt-4">
            {error && (
              <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">
                <FaExclamationTriangle />
                {error}
              </div>
            )}

            {notice && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-4 text-xs font-bold text-emerald-200">
                {notice}
              </div>
            )}
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Toplam Kuyruk",
              queue.length,
            ],

            [
              "Bekleyen",
              pending.length,
            ],

            [
              "Çakışma",
              conflicts.length,
            ],

            [
              "Bağlanan",
              matched.length,
            ],
          ].map(
            ([
              title,
              value,
            ]) => (
              <article
                key={
                  title
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
                  {title}
                </div>

                <div className="mt-3 text-3xl font-black">
                  {value}
                </div>
              </article>
            )
          )}
        </section>


        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">
          <div className="border-b border-white/[.07] p-4">
            <div className="relative">
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
                placeholder="İsim, telefon, e-posta veya kaynak ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-xs font-bold outline-none focus:border-orange-500/40"
              />
            </div>
          </div>


          {filtered.length ===
          0 ? (
            <div className="p-12 text-center">
              <FaLink className="mx-auto text-4xl text-slate-800" />

              <div className="mt-4 text-sm font-black">
                Eşleştirme kaydı yok
              </div>

              <div className="mt-2 text-[10px] text-slate-600">
                “Kaynakları Tara” ile mevcut müşteri temas kayıtlarını analiz edin.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/[.07] text-left text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                    <th className="px-5 py-4">
                      Kaynak
                    </th>

                    <th className="px-5 py-4">
                      Kişi
                    </th>

                    <th className="px-5 py-4">
                      Temas
                    </th>

                    <th className="px-5 py-4">
                      Önerilen Profil
                    </th>

                    <th className="px-5 py-4">
                      Güven
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
                      row
                    ) => (
                      <tr
                        key={
                          row.id
                        }
                        className="border-b border-white/[.05] hover:bg-white/[.025]"
                      >
                        <td className="px-5 py-4">
                          <div className="text-[10px] font-black text-orange-300">
                            {row.entity_type}
                          </div>

                          <div className="mt-1 text-[8px] text-slate-700">
                            {row.source_table}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs font-black">
                            {row.source_name ||
                              "İsimsiz kayıt"}
                          </div>

                          <div className="mt-1 text-[8px] text-slate-700">
                            {row.source_id}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[9px] leading-5 text-slate-400">
                          <div>
                            {row.source_phone ||
                              "—"}
                          </div>

                          <div>
                            {row.source_email ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {row.suggested_customer_id ? (
                            <Link
                              href={`/dashboard/musteri-360/${row.suggested_customer_id}`}
                              className="text-[10px] font-black text-slate-300 transition hover:text-orange-300"
                            >
                              {customerName(
                                row.suggested_customer_id
                              )}
                            </Link>
                          ) : (
                            <span className="text-[9px] text-slate-600">
                              Bulunamadı
                            </span>
                          )}

                          <div className="mt-1 text-[8px] text-slate-700">
                            {reasonLabel(
                              row.match_reason
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${confidenceTone(
                            Number(
                              row.confidence
                            )
                          )}`}>
                            %{Number(
                              row.confidence
                            ).toFixed(
                              0
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-[9px] font-black uppercase text-slate-400">
                            {row.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {row.status ===
                              "pending" &&
                              row.suggested_customer_id && (
                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void applyOne(
                                      row
                                    )
                                  }
                                  className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300"
                                  title="Eşleştir"
                                >
                                  <FaCheck />
                                </button>
                              )}

                            {row.status ===
                              "pending" && (
                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void ignoreOne(
                                      row
                                    )
                                  }
                                  className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-300"
                                  title="Yoksay"
                                >
                                  <FaTimes />
                                </button>
                              )}
                          </div>
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
    </main>
  );
}
