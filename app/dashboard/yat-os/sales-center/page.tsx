"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaAnchor,
  FaArrowLeft,
  FaCalculator,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaCopy,
  FaExternalLinkAlt,
  FaFilter,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaShip,
  FaTimes,
  FaTrash,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  cancelYachtQuote,
  convertYachtQuote,
  createYachtQuote,
  loadYachtSalesCenter,
  markYachtQuoteSent,
  type YachtQuote,
  type YachtQuoteItem,
} from "@/lib/yacht-os/sales-engine";


type ExtraDraft = {
  id: string;
  itemType: string;
  title: string;
  quantity: string;
  unitCost: string;
  unitSale: string;
};


const emptyExtra = (
  index: number
): ExtraDraft => ({
  id:
    `${Date.now()}-${index}`,

  itemType:
    "other",

  title:
    "",

  quantity:
    "1",

  unitCost:
    "0",

  unitSale:
    "0",
});


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function statusLabel(
  status: string
) {
  const map:
    Record<
      string,
      string
    > = {
      draft:
        "Taslak",

      sent:
        "Gönderildi",

      viewed:
        "Görüntülendi",

      accepted:
        "Kabul Edildi",

      rejected:
        "Reddedildi",

      expired:
        "Süresi Doldu",

      converted:
        "Rezervasyona Döndü",

      cancelled:
        "İptal",
    };

  return (
    map[status] ??
    status
  );
}


function statusTone(
  status: string
) {
  if (
    status ===
      "accepted" ||
    status ===
      "converted"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    status ===
    "viewed"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    status ===
    "sent"
  ) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  }

  if (
    status ===
      "rejected" ||
    status ===
      "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}


export default function YachtSalesCenterPage() {
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
    userId,
    setUserId,
  ] =
    useState("");

  const [
    companyName,
    setCompanyName,
  ] =
    useState("");

  const [
    quotes,
    setQuotes,
  ] =
    useState<
      YachtQuote[]
    >([]);

  const [
    items,
    setItems,
  ] =
    useState<
      YachtQuoteItem[]
    >([]);

  const [
    yachts,
    setYachts,
  ] =
    useState<
      any[]
    >([]);

  const [
    suppliers,
    setSuppliers,
  ] =
    useState<
      any[]
    >([]);

  const [
    assignments,
    setAssignments,
  ] =
    useState<
      any[]
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
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    yachtId,
    setYachtId,
  ] =
    useState("");

  const [
    customerName,
    setCustomerName,
  ] =
    useState("");

  const [
    customerPhone,
    setCustomerPhone,
  ] =
    useState("");

  const [
    customerEmail,
    setCustomerEmail,
  ] =
    useState("");

  const [
    startDate,
    setStartDate,
  ] =
    useState("");

  const [
    endDate,
    setEndDate,
  ] =
    useState("");

  const [
    guestCount,
    setGuestCount,
  ] =
    useState("2");

  const [
    supplierCost,
    setSupplierCost,
  ] =
    useState("0");

  const [
    yachtSalePrice,
    setYachtSalePrice,
  ] =
    useState("0");

  const [
    commissionAmount,
    setCommissionAmount,
  ] =
    useState("0");

  const [
    validUntil,
    setValidUntil,
  ] =
    useState("");

  const [
    optionExpiresAt,
    setOptionExpiresAt,
  ] =
    useState("");

  const [
    customerNote,
    setCustomerNote,
  ] =
    useState("");

  const [
    internalNote,
    setInternalNote,
  ] =
    useState("");

  const [
    extras,
    setExtras,
  ] =
    useState<
      ExtraDraft[]
    >([]);

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
        activeCompanyId:
          string
      ) => {
        const data =
          await loadYachtSalesCenter(
            activeCompanyId
          );

        setQuotes(
          data.quotes
        );

        setItems(
          data.items
        );

        setYachts(
          data.yachts
        );

        setSuppliers(
          data.suppliers
        );

        setAssignments(
          data.assignments
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

          if (
            !membership
          ) {
            throw new Error(
              "Aktif firma bulunamadı."
            );
          }

          setUserId(
            user.id
          );

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
          setLoading(false);
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


  const selectedYacht =
    yachts.find(
      (
        yacht
      ) =>
        yacht.id ===
        yachtId
    );


  const supplierId =
    assignments.find(
      (
        item
      ) =>
        item.yacht_id ===
        yachtId
    )?.supplier_id;


  const supplier =
    suppliers.find(
      (
        item
      ) =>
        item.id ===
        supplierId
    );


  const extraCost =
    extras.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity ||
          0
        ) *
        Number(
          item.unitCost ||
          0
        ),
      0
    );


  const extrasSale =
    extras.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity ||
          0
        ) *
        Number(
          item.unitSale ||
          0
        ),
      0
    );


  const totalCost =
    Number(
      supplierCost ||
      0
    ) +
    extraCost;


  const salePrice =
    Number(
      yachtSalePrice ||
      0
    ) +
    extrasSale;


  const grossProfit =
    salePrice -
    totalCost;


  const margin =
    salePrice > 0
      ? (
          grossProfit /
          salePrice
        ) *
        100
      : 0;


  const filteredQuotes =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );

        return quotes.filter(
          (
            quote
          ) => {
            const yacht =
              yachts.find(
                (
                  item
                ) =>
                  item.id ===
                  quote.yacht_id
              );

            const text =
              `${quote.quote_code} ${quote.customer_name} ${quote.customer_phone ?? ""} ${yacht?.name ?? ""}`
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
              quote.status ===
                statusFilter;

            return (
              searchOk &&
              statusOk
            );
          }
        );
      },
      [
        quotes,
        yachts,
        query,
        statusFilter,
      ]
    );


  const stats =
    useMemo(
      () => {
        const accepted =
          quotes.filter(
            (
              q
            ) =>
              q.status ===
                "accepted" ||
              q.status ===
                "converted"
          );

        const totalSales =
          accepted.reduce(
            (
              total,
              q
            ) =>
              total +
              Number(
                q.sale_price
              ),
            0
          );

        const totalProfit =
          accepted.reduce(
            (
              total,
              q
            ) =>
              total +
              Number(
                q.gross_profit
              ),
            0
          );

        return {
          total:
            quotes.length,

          active:
            quotes.filter(
              (
                q
              ) =>
                [
                  "draft",
                  "sent",
                  "viewed",
                ].includes(
                  q.status
                )
            ).length,

          accepted:
            accepted.length,

          conversion:
            quotes.length
              ? (
                  accepted.length /
                  quotes.length
                ) *
                100
              : 0,

          totalSales,
          totalProfit,
        };
      },
      [
        quotes,
      ]
    );


  function resetForm() {
    setYachtId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setStartDate("");
    setEndDate("");
    setGuestCount("2");
    setSupplierCost("0");
    setYachtSalePrice("0");
    setCommissionAmount("0");
    setValidUntil("");
    setOptionExpiresAt("");
    setCustomerNote("");
    setInternalNote("");
    setExtras([]);
  }


  async function createQuote() {
    if (
      !yachtId ||
      !customerName.trim() ||
      !startDate ||
      !endDate
    ) {
      setError(
        "Tekne, müşteri ve tarihler zorunlu."
      );

      return;
    }

    if (
      endDate <
      startDate
    ) {
      setError(
        "Bitiş tarihi başlangıç tarihinden önce olamaz."
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      await createYachtQuote({
        companyId,
        userId,

        yachtId,

        supplierId,

        customerName:
          customerName.trim(),

        customerPhone:
          customerPhone.trim() ||
          undefined,

        customerEmail:
          customerEmail.trim() ||
          undefined,

        startDate,
        endDate,

        guestCount:
          Math.max(
            1,
            Number(
              guestCount
            ) || 1
          ),

        supplierCost:
          Number(
            supplierCost
          ) || 0,

        yachtSalePrice:
          Number(
            yachtSalePrice
          ) || 0,

        commissionAmount:
          Number(
            commissionAmount
          ) || 0,

        validUntil:
          validUntil ||
          undefined,

        optionExpiresAt:
          optionExpiresAt ||
          undefined,

        customerNote:
          customerNote ||
          undefined,

        internalNote:
          internalNote ||
          undefined,

        items:
          extras
            .filter(
              (
                item
              ) =>
                item.title.trim()
            )
            .map(
              (
                item
              ) => ({
                itemType:
                  item.itemType,

                title:
                  item.title.trim(),

                quantity:
                  Math.max(
                    0.01,
                    Number(
                      item.quantity
                    ) || 1
                  ),

                unitCost:
                  Number(
                    item.unitCost
                  ) || 0,

                unitSale:
                  Number(
                    item.unitSale
                  ) || 0,
              })
            ),
      });

      await refresh(
        companyId
      );

      resetForm();
      setFormOpen(false);

      toast(
        "Profesyonel yat teklifi oluşturuldu."
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
      setSaving(false);
    }
  }


  function publicUrl(
    quote:
      YachtQuote
  ) {
    return (
      `${window.location.origin}/yat-teklif/${quote.public_token}`
    );
  }


  async function copyQuote(
    quote:
      YachtQuote
  ) {
    try {
      await markYachtQuoteSent(
        quote.id
      );

      await navigator.clipboard.writeText(
        publicUrl(
          quote
        )
      );

      await refresh(
        companyId
      );

      toast(
        "Müşteri teklif linki kopyalandı."
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
    }
  }


  async function whatsapp(
    quote:
      YachtQuote
  ) {
    try {
      await markYachtQuoteSent(
        quote.id
      );

      const yacht =
        yachts.find(
          (
            item
          ) =>
            item.id ===
            quote.yacht_id
        );

      const message = [
        `Merhaba ${quote.customer_name},`,
        "",
        "Turobus üzerinden size özel yat & tekne teklifiniz hazırlandı.",
        "",
        `Tekne: ${yacht?.name ?? "Yat & Tekne"}`,
        `Teklif No: ${quote.quote_code}`,
        `Toplam: ${money(quote.sale_price, quote.currency)}`,
        "",
        `Teklifi incelemek için:`,
        publicUrl(quote),
      ].join("\n");

      const phone =
        (
          quote.customer_phone ??
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
    }
  }


  async function convert(
    quote:
      YachtQuote
  ) {
    setSaving(true);

    try {
      const result =
        await convertYachtQuote(
          quote.id
        );

      await refresh(
        companyId
      );

      toast(
        `Rezervasyon oluşturuldu: ${result.booking_code ?? ""}`
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
      setSaving(false);
    }
  }


  async function cancel(
    quote:
      YachtQuote
  ) {
    setSaving(true);

    try {
      await cancelYachtQuote(
        quote.id,
        companyId
      );

      await refresh(
        companyId
      );

      toast(
        "Teklif iptal edildi."
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
      setSaving(false);
    }
  }


  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaCalculator className="animate-pulse text-4xl text-orange-400" />
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

        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.17),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>
              <Link
                href="/dashboard/yat-os"
                className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
              >
                <FaArrowLeft />
                YAT & TEKNE OS
              </Link>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.22em] text-orange-300">
                  SALES ENGINE
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Canlı Kârlılık
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Yat Teklif &{" "}
                <span className="text-orange-400">
                  Satış Merkezi
                </span>
              </h1>

              <p className="mt-3 text-xs text-slate-400">
                {companyName}
                {" · "}
                Maliyet, satış, kâr, marj, teklif,
                müşteri onayı ve rezervasyona dönüşüm.
              </p>
            </div>


            <button
              type="button"
              onClick={() =>
                setFormOpen(true)
              }
              className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black"
            >
              <FaPlus />
              Profesyonel Teklif Oluştur
            </button>

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


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <Kpi
            label="Toplam Teklif"
            value={String(
              stats.total
            )}
            detail="Oluşturulan"
          />

          <Kpi
            label="Aktif Pipeline"
            value={String(
              stats.active
            )}
            detail="Taslak / gönderilen / görüntülenen"
          />

          <Kpi
            label="Kazanılan"
            value={String(
              stats.accepted
            )}
            detail={`Dönüşüm %${stats.conversion.toFixed(1)}`}
          />

          <Kpi
            label="Kazanılan Satış"
            value={money(
              stats.totalSales
            )}
            detail="Kabul + rezervasyona dönüşen"
          />

          <Kpi
            label="Brüt Kâr"
            value={money(
              stats.totalProfit
            )}
            detail="Kazanılan teklifler"
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
                placeholder="Müşteri, telefon, teklif kodu veya tekne ara..."
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
                  Tüm Teklifler
                </option>

                <option value="draft">
                  Taslak
                </option>

                <option value="sent">
                  Gönderildi
                </option>

                <option value="viewed">
                  Görüntülendi
                </option>

                <option value="accepted">
                  Kabul Edildi
                </option>

                <option value="rejected">
                  Reddedildi
                </option>

                <option value="converted">
                  Rezervasyona Döndü
                </option>

                <option value="expired">
                  Süresi Doldu
                </option>
              </select>
            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1750px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">
                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Teklif
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
                    Kişi
                  </th>

                  <th className="px-5 py-4">
                    Maliyet
                  </th>

                  <th className="px-5 py-4">
                    Satış
                  </th>

                  <th className="px-5 py-4">
                    Komisyon
                  </th>

                  <th className="px-5 py-4">
                    Kâr
                  </th>

                  <th className="px-5 py-4">
                    Marj
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                  <th className="px-5 py-4">
                    Geçerlilik
                  </th>

                  <th className="px-5 py-4">
                    Paylaş
                  </th>

                  <th className="px-5 py-4">
                    Aksiyon
                  </th>

                </tr>
              </thead>


              <tbody>
                {filteredQuotes.map(
                  (
                    quote
                  ) => {
                    const yacht =
                      yachts.find(
                        (
                          item
                        ) =>
                          item.id ===
                          quote.yacht_id
                      );

                    const quoteItems =
                      items.filter(
                        (
                          item
                        ) =>
                          item.quote_id ===
                          quote.id
                      );

                    return (
                      <tr
                        key={
                          quote.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.02]"
                      >

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-black">
                            {
                              quote.quote_code
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              quoteItems.length
                            } ek hizmet
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-black">
                            {
                              quote.customer_name
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              quote.customer_phone ??
                              quote.customer_email ??
                              "—"
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-black">
                            {
                              yacht?.name ??
                              "—"
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              yacht?.city ??
                              "—"
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[8px] text-slate-400">
                          {
                            quote.start_date
                          }
                          {" → "}
                          {
                            quote.end_date
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            quote.guest_count
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black text-slate-400">
                          {money(
                            quote.total_cost,
                            quote.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black text-blue-300">
                          {money(
                            quote.sale_price,
                            quote.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black text-orange-300">
                          {money(
                            quote.commission_amount,
                            quote.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            quote.gross_profit,
                            quote.currency
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                            quote.margin_percent >=
                            20
                              ? "bg-emerald-500/10 text-emerald-300"
                              : quote.margin_percent >=
                                10
                                ? "bg-amber-500/10 text-amber-300"
                                : "bg-red-500/10 text-red-300"
                          }`}>
                            %
                            {Number(
                              quote.margin_percent
                            ).toFixed(
                              1
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                            quote.status
                          )}`}>
                            {statusLabel(
                              quote.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {quote.valid_until
                            ? new Intl.DateTimeFormat(
                                "tr-TR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              ).format(
                                new Date(
                                  quote.valid_until
                                )
                              )
                            : "Süresiz"}
                        </td>

                        <td className="px-5 py-4">

                          <div className="flex gap-1.5">

                            <button
                              type="button"
                              onClick={() =>
                                void copyQuote(
                                  quote
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-slate-300"
                              title="Linki kopyala"
                            >
                              <FaCopy />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  publicUrl(
                                    quote
                                  ),
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg border border-blue-500/20 bg-blue-500/[.07] text-blue-300"
                              title="Teklifi aç"
                            >
                              <FaExternalLinkAlt />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void whatsapp(
                                  quote
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300"
                              title="WhatsApp"
                            >
                              <FaWhatsapp />
                            </button>

                          </div>
                        </td>

                        <td className="px-5 py-4">

                          {quote.status ===
                          "accepted" ? (
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                void convert(
                                  quote
                                )
                              }
                              className="rounded-lg bg-emerald-500 px-3 py-2 text-[8px] font-black"
                            >
                              Rezervasyona Çevir
                            </button>
                          ) : quote.status ===
                            "converted" ? (
                            <span className="flex items-center gap-2 text-[8px] font-black text-emerald-300">
                              <FaCheckCircle />
                              Tamamlandı
                            </span>
                          ) : ![
                              "cancelled",
                              "rejected",
                              "expired",
                            ].includes(
                              quote.status
                            ) ? (
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                void cancel(
                                  quote
                                )
                              }
                              className="rounded-lg border border-red-500/20 bg-red-500/[.06] px-3 py-2 text-[8px] font-black text-red-300"
                            >
                              İptal
                            </button>
                          ) : (
                            <span className="text-[8px] text-slate-600">
                              İşlem kapalı
                            </span>
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

      </div>


      {formOpen && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">

          <div className="mx-auto my-6 max-w-6xl rounded-[30px] border border-white/10 bg-[#07131f] shadow-2xl">

            <div className="flex items-start justify-between border-b border-white/10 p-6">

              <div>
                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  PROFESYONEL YAT TEKLİF MOTORU
                </div>

                <div className="mt-2 text-2xl font-black">
                  Yeni Teklif
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  Maliyet bilgileri yalnız iç operasyon ekranında görünür.
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFormOpen(false)
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="grid gap-6 p-6 xl:grid-cols-[1.3fr_.7fr]">

              <div className="space-y-6">

                <FormSection
                  title="Müşteri & Seyahat"
                  icon={<FaUser />}
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

                    <Field
                      label="Müşteri Adı"
                      value={
                        customerName
                      }
                      onChange={
                        setCustomerName
                      }
                    />

                    <Field
                      label="Telefon"
                      value={
                        customerPhone
                      }
                      onChange={
                        setCustomerPhone
                      }
                    />

                    <Field
                      label="E-posta"
                      value={
                        customerEmail
                      }
                      onChange={
                        setCustomerEmail
                      }
                    />

                    <Field
                      label="Başlangıç"
                      type="date"
                      value={
                        startDate
                      }
                      onChange={
                        setStartDate
                      }
                    />

                    <Field
                      label="Bitiş"
                      type="date"
                      value={
                        endDate
                      }
                      onChange={
                        setEndDate
                      }
                    />

                    <Field
                      label="Kişi"
                      type="number"
                      value={
                        guestCount
                      }
                      onChange={
                        setGuestCount
                      }
                    />

                  </div>
                </FormSection>


                <FormSection
                  title="Tekne & Ana Fiyat"
                  icon={<FaShip />}
                >
                  <select
                    value={
                      yachtId
                    }
                    onChange={(
                      event
                    ) => {
                      const id =
                        event.target.value;

                      setYachtId(
                        id
                      );

                      const yacht =
                        yachts.find(
                          (
                            item
                          ) =>
                            item.id ===
                            id
                        );

                      if (yacht) {
                        setYachtSalePrice(
                          String(
                            yacht.base_daily_price
                          )
                        );
                      }
                    }}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-xs font-black outline-none"
                  >
                    <option value="">
                      Tekne seç
                    </option>

                    {yachts.map(
                      (
                        yacht
                      ) => (
                        <option
                          key={
                            yacht.id
                          }
                          value={
                            yacht.id
                          }
                        >
                          {
                            yacht.name
                          }
                          {" · "}
                          {
                            yacht.city
                          }
                          {" · "}
                          {money(
                            yacht.base_daily_price,
                            yacht.currency
                          )}
                        </option>
                      )
                    )}
                  </select>


                  {selectedYacht && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                      <Mini
                        label="Tekne"
                        value={
                          selectedYacht.name
                        }
                      />

                      <Mini
                        label="Partner"
                        value={
                          supplier?.name ??
                          "Direkt Filo"
                        }
                      />

                      <Mini
                        label="Liste Fiyatı"
                        value={money(
                          selectedYacht.base_daily_price,
                          selectedYacht.currency
                        )}
                      />

                      <Mini
                        label="Kapasite"
                        value={`${selectedYacht.max_guests} kişi`}
                      />

                    </div>
                  )}


                  <div className="mt-4 grid gap-3 sm:grid-cols-3">

                    <Field
                      label="Tedarikçi Maliyeti"
                      type="number"
                      value={
                        supplierCost
                      }
                      onChange={
                        setSupplierCost
                      }
                    />

                    <Field
                      label="Yat Satış Fiyatı"
                      type="number"
                      value={
                        yachtSalePrice
                      }
                      onChange={
                        setYachtSalePrice
                      }
                    />

                    <Field
                      label="Komisyon"
                      type="number"
                      value={
                        commissionAmount
                      }
                      onChange={
                        setCommissionAmount
                      }
                    />

                  </div>
                </FormSection>


                <FormSection
                  title="Ek Hizmetler"
                  icon={<FaPlus />}
                >

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[850px] text-left">

                      <thead>
                        <tr className="text-[8px] font-black uppercase text-slate-600">
                          <th className="pb-3">
                            Hizmet
                          </th>
                          <th className="pb-3">
                            Açıklama
                          </th>
                          <th className="pb-3">
                            Adet
                          </th>
                          <th className="pb-3">
                            Maliyet
                          </th>
                          <th className="pb-3">
                            Satış
                          </th>
                          <th />
                        </tr>
                      </thead>

                      <tbody>
                        {extras.map(
                          (
                            item
                          ) => (
                            <tr
                              key={
                                item.id
                              }
                              className="border-t border-white/[.06]"
                            >

                              <td className="py-2 pr-2">
                                <select
                                  value={
                                    item.itemType
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setExtras(
                                      (
                                        current
                                      ) =>
                                        current.map(
                                          (
                                            row
                                          ) =>
                                            row.id ===
                                            item.id
                                              ? {
                                                  ...row,
                                                  itemType:
                                                    event.target.value,
                                                }
                                              : row
                                        )
                                    )
                                  }
                                  className="h-10 rounded-lg border border-white/10 bg-[#0b1723] px-2 text-[8px]"
                                >
                                  <option value="transfer">
                                    Transfer
                                  </option>

                                  <option value="catering">
                                    Catering
                                  </option>

                                  <option value="crew">
                                    Ek Personel
                                  </option>

                                  <option value="activity">
                                    Aktivite
                                  </option>

                                  <option value="decoration">
                                    Süsleme
                                  </option>

                                  <option value="photography">
                                    Fotoğraf / Video
                                  </option>

                                  <option value="other">
                                    Diğer
                                  </option>
                                </select>
                              </td>

                              <td className="py-2 pr-2">
                                <input
                                  value={
                                    item.title
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setExtras(
                                      (
                                        current
                                      ) =>
                                        current.map(
                                          (
                                            row
                                          ) =>
                                            row.id ===
                                            item.id
                                              ? {
                                                  ...row,
                                                  title:
                                                    event.target.value,
                                                }
                                              : row
                                        )
                                    )
                                  }
                                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[.025] px-3 text-[8px]"
                                />
                              </td>

                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setExtras(
                                      (
                                        current
                                      ) =>
                                        current.map(
                                          (
                                            row
                                          ) =>
                                            row.id ===
                                            item.id
                                              ? {
                                                  ...row,
                                                  quantity:
                                                    event.target.value,
                                                }
                                              : row
                                        )
                                    )
                                  }
                                  className="h-10 w-20 rounded-lg border border-white/10 bg-white/[.025] px-2 text-[8px]"
                                />
                              </td>

                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  value={
                                    item.unitCost
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setExtras(
                                      (
                                        current
                                      ) =>
                                        current.map(
                                          (
                                            row
                                          ) =>
                                            row.id ===
                                            item.id
                                              ? {
                                                  ...row,
                                                  unitCost:
                                                    event.target.value,
                                                }
                                              : row
                                        )
                                    )
                                  }
                                  className="h-10 w-28 rounded-lg border border-white/10 bg-white/[.025] px-2 text-[8px]"
                                />
                              </td>

                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  value={
                                    item.unitSale
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setExtras(
                                      (
                                        current
                                      ) =>
                                        current.map(
                                          (
                                            row
                                          ) =>
                                            row.id ===
                                            item.id
                                              ? {
                                                  ...row,
                                                  unitSale:
                                                    event.target.value,
                                                }
                                              : row
                                        )
                                    )
                                  }
                                  className="h-10 w-28 rounded-lg border border-white/10 bg-white/[.025] px-2 text-[8px]"
                                />
                              </td>

                              <td className="py-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExtras(
                                      (
                                        current
                                      ) =>
                                        current.filter(
                                          (
                                            row
                                          ) =>
                                            row.id !==
                                            item.id
                                        )
                                    )
                                  }
                                  className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.06] text-red-300"
                                >
                                  <FaTrash />
                                </button>
                              </td>

                            </tr>
                          )
                        )}
                      </tbody>

                    </table>
                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      setExtras(
                        (
                          current
                        ) => [
                          ...current,
                          emptyExtra(
                            current.length
                          ),
                        ]
                      )
                    }
                    className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-[8px] font-black"
                  >
                    <FaPlus />
                    Ek Hizmet Ekle
                  </button>

                </FormSection>


                <FormSection
                  title="Geçerlilik & Notlar"
                  icon={<FaClock />}
                >

                  <div className="grid gap-3 md:grid-cols-2">

                    <Field
                      label="Teklif Geçerlilik"
                      type="datetime-local"
                      value={
                        validUntil
                      }
                      onChange={
                        setValidUntil
                      }
                    />

                    <Field
                      label="Opsiyon Bitiş"
                      type="datetime-local"
                      value={
                        optionExpiresAt
                      }
                      onChange={
                        setOptionExpiresAt
                      }
                    />

                  </div>


                  <textarea
                    value={
                      customerNote
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomerNote(
                        event.target.value
                      )
                    }
                    placeholder="Müşterinin göreceği teklif notu..."
                    className="mt-3 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
                  />


                  <textarea
                    value={
                      internalNote
                    }
                    onChange={(
                      event
                    ) =>
                      setInternalNote(
                        event.target.value
                      )
                    }
                    placeholder="Sadece şirket içi operasyon notu..."
                    className="mt-3 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
                  />

                </FormSection>

              </div>


              <div>

                <div className="sticky top-5 rounded-[26px] border border-orange-500/20 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.12),transparent_38%),#091621] p-5">

                  <div className="flex items-center gap-3">

                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                      <FaCalculator />
                    </div>

                    <div>
                      <div className="text-sm font-black">
                        Canlı Kârlılık
                      </div>

                      <div className="text-[8px] text-slate-500">
                        Teklif finans analizi
                      </div>
                    </div>

                  </div>


                  <div className="mt-5 space-y-3">

                    <FinanceRow
                      label="Tekne Maliyeti"
                      value={money(
                        Number(
                          supplierCost
                        )
                      )}
                    />

                    <FinanceRow
                      label="Ek Hizmet Maliyeti"
                      value={money(
                        extraCost
                      )}
                    />

                    <FinanceRow
                      label="TOPLAM MALİYET"
                      value={money(
                        totalCost
                      )}
                      strong
                    />

                    <div className="border-t border-white/10" />

                    <FinanceRow
                      label="Tekne Satışı"
                      value={money(
                        Number(
                          yachtSalePrice
                        )
                      )}
                    />

                    <FinanceRow
                      label="Ek Hizmet Satışı"
                      value={money(
                        extrasSale
                      )}
                    />

                    <FinanceRow
                      label="TOPLAM SATIŞ"
                      value={money(
                        salePrice
                      )}
                      strong
                    />

                    <div className="border-t border-white/10" />

                    <FinanceRow
                      label="Komisyon"
                      value={money(
                        Number(
                          commissionAmount
                        )
                      )}
                      orange
                    />

                    <FinanceRow
                      label="BRÜT KÂR"
                      value={money(
                        grossProfit
                      )}
                      success={
                        grossProfit >=
                        0
                      }
                      danger={
                        grossProfit <
                        0
                      }
                    />

                    <FinanceRow
                      label="KÂR MARJI"
                      value={`%${margin.toFixed(1)}`}
                      success={
                        margin >=
                        20
                      }
                      danger={
                        margin <
                        10
                      }
                    />

                  </div>


                  <div className="mt-6 rounded-xl border border-white/[.07] bg-black/10 p-4 text-[8px] leading-5 text-slate-500">
                    Maliyet, komisyon ve kâr bilgileri müşteri teklif ekranında gösterilmez.
                  </div>


                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void createQuote()
                    }
                    className="mt-5 h-12 w-full rounded-xl bg-orange-500 text-xs font-black"
                  >
                    {saving
                      ? "Oluşturuluyor..."
                      : "Teklifi Oluştur"}
                  </button>

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}


function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">
      <div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-600">
        {label}
      </div>

      <div className="mt-3 text-2xl font-black">
        {value}
      </div>

      <div className="mt-2 text-[8px] text-slate-500">
        {detail}
      </div>
    </div>
  );
}


function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon:
    React.ReactNode;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
          {icon}
        </div>

        <div className="text-sm font-black">
          {title}
        </div>
      </div>

      {children}

    </section>
  );
}


function Field({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange:
    (
      value: string
    ) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
        {label}
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none focus:border-orange-500/40"
      />
    </label>
  );
}


function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-black/10 p-3">
      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-[9px] font-black">
        {value}
      </div>
    </div>
  );
}


function FinanceRow({
  label,
  value,
  strong = false,
  success = false,
  danger = false,
  orange = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  success?: boolean;
  danger?: boolean;
  orange?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className={`text-[8px] ${
        strong
          ? "font-black text-white"
          : "text-slate-500"
      }`}>
        {label}
      </span>

      <span className={`text-[10px] font-black ${
        success
          ? "text-emerald-300"
          : danger
            ? "text-red-300"
            : orange
              ? "text-orange-300"
              : "text-white"
      }`}>
        {value}
      </span>

    </div>
  );
}
