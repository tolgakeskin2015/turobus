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
  FaCashRegister,
  FaCheckCircle,
  FaCoins,
  FaCopy,
  FaCreditCard,
  FaFilter,
  FaLink,
  FaMoneyBillWave,
  FaSearch,
  FaShip,
  FaTimes,
  FaWallet,
  FaWhatsapp,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  createYachtPaymentLink,
  loadYachtFinanceCenter,
  recordYachtManualPayment,
  type YachtPayment,
  type YachtPaymentLink,
} from "@/lib/yacht-os/finance-center";


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function paymentLabel(
  value: string
) {
  const map:
    Record<
      string,
      string
    > = {
      pending:
        "Bekliyor",

      partial:
        "Kısmi",

      paid:
        "Ödendi",

      refunded:
        "İade",

      failed:
        "Başarısız",

      cancelled:
        "İptal",
    };

  return (
    map[value] ||
    value
  );
}


function paymentTone(
  value: string
) {
  if (
    value ===
    "paid"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value ===
      "partial" ||
    value ===
      "pending"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-red-500/20 bg-red-500/10 text-red-300";
}


export default function YachtFinanceCenterPage() {

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
    bookings,
    setBookings,
  ] =
    useState<any[]>(
      []
    );

  const [
    yachts,
    setYachts,
  ] =
    useState<any[]>(
      []
    );

  const [
    payments,
    setPayments,
  ] =
    useState<
      YachtPayment[]
    >([]);

  const [
    paymentLinks,
    setPaymentLinks,
  ] =
    useState<
      YachtPaymentLink[]
    >([]);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  const [
    modal,
    setModal,
  ] =
    useState<
      "payment" |
      "link" |
      null
    >(null);

  const [
    bookingId,
    setBookingId,
  ] =
    useState("");

  const [
    amount,
    setAmount,
  ] =
    useState("");

  const [
    method,
    setMethod,
  ] =
    useState(
      "bank_transfer"
    );

  const [
    referenceNo,
    setReferenceNo,
  ] =
    useState("");

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    validUntil,
    setValidUntil,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");


  const refresh =
    useCallback(
      async (
        activeCompany:
          string
      ) => {

        const data =
          await loadYachtFinanceCenter(
            activeCompany
          );

        setBookings(
          data.bookings
        );

        setYachts(
          data.yachts
        );

        setPayments(
          data.payments
        );

        setPaymentLinks(
          data.paymentLinks
        );
      },
      []
    );


  useEffect(
    () => {

      async function boot() {

        try {

          const user =
            await getCurrentUser();

          if (!user) {
            throw new Error(
              "Aktif oturum bulunamadı."
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


      void boot();
    },
    [
      refresh,
    ]
  );


  function toast(
    message: string
  ) {
    setNotice(
      message
    );

    window.setTimeout(
      () =>
        setNotice(""),
      2200
    );
  }


  const rows =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return bookings
          .filter(
            (
              booking
            ) => {

              const yacht =
                yachts.find(
                  (
                    item
                  ) =>
                    item.id ===
                    booking.yacht_id
                );


              const text =
                `${booking.booking_code} ${booking.guest_name} ${booking.guest_phone || ""} ${yacht?.name || ""}`
                  .toLocaleLowerCase(
                    "tr"
                  );


              const searchOk =
                !needle ||
                text.includes(
                  needle
                );


              const statusOk =
                statusFilter ===
                  "all" ||
                booking.payment_status ===
                  statusFilter;


              return (
                searchOk &&
                statusOk
              );
            }
          );
      },
      [
        bookings,
        yachts,
        query,
        statusFilter,
      ]
    );


  const totalSales =
    bookings
      .filter(
        (
          item
        ) =>
          item.status !==
          "cancelled"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.total_amount
          ),
        0
      );


  const collected =
    bookings.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.paid_amount
        ),
      0
    );


  const openBalance =
    Math.max(
      totalSales -
      collected,
      0
    );


  const supplierPayable =
    bookings
      .filter(
        (
          item
        ) =>
          item.status !==
          "cancelled"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.supplier_cost
          ),
        0
      );


  const commission =
    bookings.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.commission_amount
        ),
      0
    );


  const grossProfit =
    totalSales -
    supplierPayable;


  function openPayment(
    id: string
  ) {
    const booking =
      bookings.find(
        (
          item
        ) =>
          item.id ===
          id
      );

    setBookingId(
      id
    );

    setAmount(
      String(
        Math.max(
          Number(
            booking?.total_amount ||
            0
          ) -
          Number(
            booking?.paid_amount ||
            0
          ),
          0
        )
      )
    );

    setReferenceNo("");
    setNote("");
    setModal(
      "payment"
    );
  }


  function openLink(
    id: string
  ) {
    const booking =
      bookings.find(
        (
          item
        ) =>
          item.id ===
          id
      );

    setBookingId(
      id
    );

    setAmount(
      String(
        Math.max(
          Number(
            booking?.total_amount ||
            0
          ) -
          Number(
            booking?.paid_amount ||
            0
          ),
          0
        )
      )
    );

    setNote("");
    setValidUntil("");
    setModal(
      "link"
    );
  }


  async function savePayment() {

    if (
      !bookingId ||
      Number(
        amount
      ) <= 0
    ) {
      setError(
        "Rezervasyon ve tahsilat tutarı zorunlu."
      );

      return;
    }


    setSaving(true);
    setError("");


    try {

      await recordYachtManualPayment({
        bookingId,

        amount:
          Number(
            amount
          ),

        method,

        referenceNo:
          referenceNo ||
          undefined,

        note:
          note ||
          undefined,
      });


      await refresh(
        companyId
      );


      setModal(
        null
      );

      toast(
        "Tahsilat başarıyla işlendi."
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

      setSaving(
        false
      );
    }
  }


  async function saveLink() {

    if (
      !bookingId ||
      Number(
        amount
      ) <= 0
    ) {
      setError(
        "Rezervasyon ve ödeme linki tutarı zorunlu."
      );

      return;
    }


    setSaving(true);
    setError("");


    try {

      const result =
        await createYachtPaymentLink({
          bookingId,

          amount:
            Number(
              amount
            ),

          validUntil:
            validUntil ||
            undefined,

          note:
            note ||
            undefined,
        });


      const url =
        `${window.location.origin}/yat-odeme/${result.token}`;


      await navigator
        .clipboard
        .writeText(
          url
        );


      await refresh(
        companyId
      );


      setModal(
        null
      );


      toast(
        "Ödeme linki oluşturuldu ve kopyalandı."
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

      setSaving(
        false
      );
    }
  }


  async function copyLink(
    link:
      YachtPaymentLink
  ) {

    const url =
      `${window.location.origin}/yat-odeme/${link.public_token}`;


    await navigator
      .clipboard
      .writeText(
        url
      );


    toast(
      "Ödeme linki kopyalandı."
    );
  }


  function whatsappLink(
    link:
      YachtPaymentLink
  ) {

    const booking =
      bookings.find(
        (
          item
        ) =>
          item.id ===
          link.booking_id
      );


    const url =
      `${window.location.origin}/yat-odeme/${link.public_token}`;


    const message = [
      `Merhaba ${booking?.guest_name || ""},`,
      "",
      "Turobus yat & tekne rezervasyonunuz için güvenli ödeme bağlantınız:",
      "",
      url,
      "",
      `Ödenecek tutar: ${money(link.amount, link.currency)}`,
      `Rezervasyon: ${booking?.booking_code || ""}`,
    ].join(
      "\n"
    );


    const phone =
      String(
        booking?.guest_phone ||
        ""
      )
        .replace(
          /\D/g,
          ""
        )
        .replace(
          /^0/,
          "90"
        );


    window.open(
      phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }


  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaWallet className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[120] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">
          <FaCheckCircle className="text-emerald-400" />

          <span className="text-xs font-black">
            {notice}
          </span>
        </div>
      )}


      <div className="mx-auto max-w-[1800px] px-5 py-7 lg:px-8">

        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,.12),transparent_35%),radial-gradient(circle_at_70%_0%,rgba(249,115,22,.10),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            YAT & TEKNE OS
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.22em] text-emerald-300">
                  FINANCE CONTROL
                </span>

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black text-orange-300">
                  ● Canlı Tahsilat
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Finans &{" "}
                <span className="text-orange-400">
                  Tahsilat Merkezi
                </span>
              </h1>


              <p className="mt-3 text-xs text-slate-400">
                {companyName}
                {" · "}
                Satış, tahsilat, bakiye, online ödeme ve partner maliyetleri.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

              <HeaderMetric
                label="Rezervasyon"
                value={String(
                  bookings.length
                )}
              />

              <HeaderMetric
                label="Tahsilat"
                value={String(
                  payments.filter(
                    (
                      item
                    ) =>
                      item.status ===
                      "paid"
                  ).length
                )}
              />

              <HeaderMetric
                label="Aktif Link"
                value={String(
                  paymentLinks.filter(
                    (
                      item
                    ) =>
                      item.status ===
                      "active"
                  ).length
                )}
              />

              <HeaderMetric
                label="Açık Bakiye"
                value={money(
                  openBalance
                )}
                danger={
                  openBalance >
                  0
                }
              />

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <FaTimes />
            </button>

          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <Kpi
            label="Toplam Satış"
            value={money(
              totalSales
            )}
            detail="İptal dışı rezervasyon"
          />

          <Kpi
            label="Tahsil Edilen"
            value={money(
              collected
            )}
            detail={
              totalSales > 0
                ? `%${(
                    collected /
                    totalSales *
                    100
                  ).toFixed(
                    1
                  )} tahsilat oranı`
                : "%0"
            }
            success
          />

          <Kpi
            label="Açık Bakiye"
            value={money(
              openBalance
            )}
            detail="Müşteriden beklenen"
            danger={
              openBalance >
              0
            }
          />

          <Kpi
            label="Tedarikçi Maliyeti"
            value={money(
              supplierPayable
            )}
            detail="Partner maliyet toplamı"
          />

          <Kpi
            label="Komisyon"
            value={money(
              commission
            )}
            detail="Rezervasyon komisyonları"
          />

          <Kpi
            label="Brüt Fark"
            value={money(
              grossProfit
            )}
            detail="Satış - tedarikçi maliyeti"
            success={
              grossProfit >=
              0
            }
          />

        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center">

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
                placeholder="Rezervasyon, müşteri, telefon veya tekne ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-600" />

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >

                <option value="all">
                  Tüm Ödeme Durumları
                </option>

                <option value="pending">
                  Ödeme Bekliyor
                </option>

                <option value="partial">
                  Kısmi Tahsilat
                </option>

                <option value="paid">
                  Tamamı Ödendi
                </option>

                <option value="refunded">
                  İade
                </option>

              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1800px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Satış
                  </th>

                  <th className="px-5 py-4">
                    Tahsil
                  </th>

                  <th className="px-5 py-4">
                    Kalan
                  </th>

                  <th className="px-5 py-4">
                    Tedarikçi
                  </th>

                  <th className="px-5 py-4">
                    Komisyon
                  </th>

                  <th className="px-5 py-4">
                    Brüt Fark
                  </th>

                  <th className="px-5 py-4">
                    Ödeme
                  </th>

                  <th className="px-5 py-4">
                    Online Link
                  </th>

                  <th className="px-5 py-4">
                    Aksiyon
                  </th>

                </tr>

              </thead>


              <tbody>

                {rows.map(
                  (
                    booking
                  ) => {

                    const yacht =
                      yachts.find(
                        (
                          item
                        ) =>
                          item.id ===
                          booking.yacht_id
                      );


                    const remaining =
                      Math.max(
                        Number(
                          booking.total_amount
                        ) -
                        Number(
                          booking.paid_amount
                        ),
                        0
                      );


                    const profit =
                      Number(
                        booking.total_amount
                      ) -
                      Number(
                        booking.supplier_cost
                      );


                    const links =
                      paymentLinks.filter(
                        (
                          item
                        ) =>
                          item.booking_id ===
                          booking.id
                      );


                    const activeLink =
                      links.find(
                        (
                          item
                        ) =>
                          item.status ===
                          "active"
                      );


                    return (
                      <tr
                        key={
                          booking.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.02]"
                      >

                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              booking.booking_code
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              booking.source
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              booking.guest_name
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              booking.guest_phone ||
                              "—"
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <FaShip className="text-orange-400" />

                            <div>

                              <div className="text-[9px] font-black">
                                {
                                  yacht?.name ||
                                  "—"
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {
                                  yacht?.city ||
                                  "—"
                                }
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {
                            booking.start_date
                          }
                          {" → "}
                          {
                            booking.end_date
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            booking.total_amount,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            booking.paid_amount,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                            remaining > 0
                              ? "bg-red-500/10 text-red-300"
                              : "bg-emerald-500/10 text-emerald-300"
                          }`}>
                            {money(
                              remaining,
                              booking.currency
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black text-blue-300">
                          {money(
                            booking.supplier_cost,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black text-orange-300">
                          {money(
                            booking.commission_amount,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black text-emerald-300">
                          {money(
                            profit,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${paymentTone(
                            booking.payment_status
                          )}`}>
                            {paymentLabel(
                              booking.payment_status
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          {activeLink ? (
                            <div className="flex gap-1.5">

                              <button
                                type="button"
                                title="Linki kopyala"
                                onClick={() =>
                                  void copyLink(
                                    activeLink
                                  )
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-slate-300"
                              >
                                <FaCopy />
                              </button>

                              <button
                                type="button"
                                title="WhatsApp"
                                onClick={() =>
                                  whatsappLink(
                                    activeLink
                                  )
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300"
                              >
                                <FaWhatsapp />
                              </button>

                            </div>
                          ) : (
                            <span className="text-[8px] text-slate-600">
                              Aktif link yok
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4">

                          {remaining >
                          0 ? (
                            <div className="flex gap-1.5">

                              <button
                                type="button"
                                onClick={() =>
                                  openPayment(
                                    booking.id
                                  )
                                }
                                className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-[8px] font-black"
                              >
                                <FaCashRegister />
                                Tahsilat
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openLink(
                                    booking.id
                                  )
                                }
                                className="flex h-9 items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[.07] px-3 text-[8px] font-black text-orange-300"
                              >
                                <FaLink />
                                Ödeme Linki
                              </button>

                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[8px] font-black text-emerald-300">
                              <FaCheckCircle />
                              Hesap Kapandı
                            </div>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="border-b border-white/10 p-5">

            <div className="text-lg font-black">
              Tahsilat Hareketleri
            </div>

            <div className="mt-1 text-[9px] text-slate-500">
              Nakit, havale, kart ve iyzico tahsilat geçmişi
            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1200px] text-left">

              <thead className="sticky top-0 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase text-slate-600">

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Tutar
                  </th>

                  <th className="px-5 py-4">
                    Yöntem
                  </th>

                  <th className="px-5 py-4">
                    Referans
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                  <th className="px-5 py-4">
                    Not
                  </th>

                </tr>

              </thead>


              <tbody>

                {payments.map(
                  (
                    payment
                  ) => {

                    const booking =
                      bookings.find(
                        (
                          item
                        ) =>
                          item.id ===
                          payment.booking_id
                      );


                    return (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-t border-white/[.06]"
                      >

                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {new Intl.DateTimeFormat(
                            "tr-TR",
                            {
                              day:
                                "2-digit",

                              month:
                                "short",

                              hour:
                                "2-digit",

                              minute:
                                "2-digit",
                            }
                          ).format(
                            new Date(
                              payment.paid_at ||
                              payment.created_at
                            )
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            booking?.booking_code ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[9px]">
                          {
                            booking?.guest_name ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            payment.amount,
                            payment.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px]">
                          {
                            payment.payment_method
                          }
                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {
                            payment.reference_no ||
                            payment.provider_payment_id ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${paymentTone(
                            payment.status
                          )}`}>
                            {paymentLabel(
                              payment.status
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {
                            payment.note ||
                            "—"
                          }
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>


      {modal && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#07131f] p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  {modal ===
                  "payment"
                    ? "TAHSİLAT İŞLE"
                    : "ONLINE ÖDEME LİNKİ"}
                </div>

                <div className="mt-2 text-xl font-black">
                  {modal ===
                  "payment"
                    ? "Yeni Tahsilat"
                    : "Ödeme Linki Oluştur"}
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setModal(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 space-y-4">


              <label>

                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Tutar
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    amount
                  }
                  onChange={(
                    event
                  ) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs font-black outline-none"
                />

              </label>


              {modal ===
                "payment" && (
                <>
                  <label>

                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Ödeme Yöntemi
                    </span>

                    <select
                      value={
                        method
                      }
                      onChange={(
                        event
                      ) =>
                        setMethod(
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-xs font-black outline-none"
                    >

                      <option value="cash">
                        Nakit
                      </option>

                      <option value="bank_transfer">
                        Havale / EFT
                      </option>

                      <option value="credit_card">
                        Fiziki Kredi Kartı
                      </option>

                      <option value="other">
                        Diğer
                      </option>

                    </select>

                  </label>


                  <label>

                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Dekont / Referans
                    </span>

                    <input
                      value={
                        referenceNo
                      }
                      onChange={(
                        event
                      ) =>
                        setReferenceNo(
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
                    />

                  </label>
                </>
              )}


              {modal ===
                "link" && (
                <label>

                  <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                    Link Geçerlilik
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      validUntil
                    }
                    onChange={(
                      event
                    ) =>
                      setValidUntil(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
                  />

                </label>
              )}


              <label>

                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Not
                </span>

                <textarea
                  value={
                    note
                  }
                  onChange={(
                    event
                  ) =>
                    setNote(
                      event.target.value
                    )
                  }
                  className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
                />

              </label>

            </div>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                modal ===
                "payment"
                  ? void savePayment()
                  : void saveLink()
              }
              className={`mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-black ${
                modal ===
                "payment"
                  ? "bg-emerald-500"
                  : "bg-orange-500"
              }`}
            >

              {modal ===
              "payment"
                ? <FaMoneyBillWave />
                : <FaCreditCard />}

              {saving
                ? "Kaydediliyor..."
                : modal ===
                  "payment"
                  ? "Tahsilatı Kaydet"
                  : "Ödeme Linkini Oluştur"}

            </button>

          </div>

        </div>
      )}

    </main>
  );
}


function HeaderMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className={`min-w-[115px] rounded-xl border px-4 py-3 ${
      danger
        ? "border-red-500/20 bg-red-500/[.06]"
        : "border-white/10 bg-black/10"
    }`}>

      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className={`mt-1 text-sm font-black ${
        danger
          ? "text-red-300"
          : "text-white"
      }`}>
        {value}
      </div>

    </div>
  );
}


function Kpi({
  label,
  value,
  detail,
  success = false,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
        {label}
      </div>

      <div className={`mt-3 text-2xl font-black ${
        success
          ? "text-emerald-300"
          : danger
            ? "text-red-300"
            : "text-white"
      }`}>
        {value}
      </div>

      <div className="mt-2 text-[8px] text-slate-500">
        {detail}
      </div>

    </div>
  );
}
