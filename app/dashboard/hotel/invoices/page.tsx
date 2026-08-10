"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addHotelInvoiceItem,
  createHotelInvoice,
  issueHotelInvoice,
  listHotelInvoiceItems,
  listHotelInvoices,
  type HotelInvoice,
  type HotelInvoiceCustomerType,
  type HotelInvoiceItem,
} from "@/lib/hotel/invoice/invoice-service";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import { supabase } from "@/lib/supabase";

type HotelOption = {
  id: string;
  name: string;
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

export default function HotelInvoicesPage() {
  const [companyId, setCompanyId] = useState("");
  const [hotelId, setHotelId] = useState("");

  const [hotels, setHotels] = useState<
    HotelOption[]
  >([]);

  const [invoices, setInvoices] = useState<
    HotelInvoice[]
  >([]);

  const [selectedInvoice, setSelectedInvoice] =
    useState<HotelInvoice | null>(null);

  const [items, setItems] = useState<
    HotelInvoiceItem[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [customerType, setCustomerType] =
    useState<HotelInvoiceCustomerType>(
      "individual"
    );

  const [customerName, setCustomerName] =
    useState("");

  const [taxOffice, setTaxOffice] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [identityNumber, setIdentityNumber] =
    useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [itemDescription, setItemDescription] =
    useState("Konaklama Hizmeti");

  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("20");

  const load = useCallback(
    async (
      nextCompanyId?: string,
      nextHotelId?: string
    ) => {
      try {
        setLoading(true);
        setErrorMessage("");

        let cId =
          nextCompanyId || companyId;

        let hId =
          nextHotelId || hotelId;

        if (!cId) {
          const user = await getCurrentUser();

          if (!user) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(user.id);

          if (!membership) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }

          cId = membership.company_id;

          const { data, error } = await supabase
            .from("hotels")
            .select("id, name")
            .eq("company_id", cId)
            .order("created_at", {
              ascending: true,
            });

          if (error) throw error;

          const hotelList =
            (data ?? []) as HotelOption[];

          if (!hotelList.length) {
            throw new Error(
              "Otel bulunamadı."
            );
          }

          setHotels(hotelList);

          hId = hotelList[0].id;

          setCompanyId(cId);
          setHotelId(hId);
        }

        if (!cId || !hId) return;

        const invoiceList =
          await listHotelInvoices(
            cId,
            hId
          );

        setInvoices(invoiceList);

        if (selectedInvoice) {
          const refreshed =
            invoiceList.find(
              (item) =>
                item.id ===
                selectedInvoice.id
            ) || null;

          setSelectedInvoice(refreshed);

          if (refreshed) {
            const invoiceItems =
              await listHotelInvoiceItems(
                refreshed.id
              );

            setItems(invoiceItems);
          }
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Fatura verileri yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      companyId,
      hotelId,
      selectedInvoice,
    ]
  );

  useEffect(() => {
    void load();
  }, []);

  async function changeHotel(
    nextHotelId: string
  ) {
    setHotelId(nextHotelId);
    setSelectedInvoice(null);
    setItems([]);

    await load(
      companyId,
      nextHotelId
    );
  }

  async function createInvoice() {
    try {
      setMessage("");
      setErrorMessage("");

      if (!customerName.trim()) {
        throw new Error(
          "Müşteri adı gir."
        );
      }

      const invoiceId =
        await createHotelInvoice({
          companyId,
          hotelId,
          customerName:
            customerName.trim(),
          customerType,
          taxOffice,
          taxNumber,
          identityNumber,
          email,
          phone,
        });

      setCustomerName("");
      setTaxOffice("");
      setTaxNumber("");
      setIdentityNumber("");
      setEmail("");
      setPhone("");

      await load(companyId, hotelId);

      const current =
        await listHotelInvoices(
          companyId,
          hotelId
        );

      const invoice =
        current.find(
          (item) => item.id === invoiceId
        ) || null;

      setInvoices(current);
      setSelectedInvoice(invoice);
      setItems([]);

      setMessage(
        "Taslak fatura oluşturuldu."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fatura oluşturulamadı."
      );
    }
  }

  async function selectInvoice(
    invoice: HotelInvoice
  ) {
    try {
      setSelectedInvoice(invoice);

      const invoiceItems =
        await listHotelInvoiceItems(
          invoice.id
        );

      setItems(invoiceItems);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fatura kalemleri yüklenemedi."
      );
    }
  }

  async function addItem() {
    if (!selectedInvoice) return;

    try {
      setMessage("");
      setErrorMessage("");

      if (!itemDescription.trim()) {
        throw new Error(
          "Kalem açıklaması gir."
        );
      }

      await addHotelInvoiceItem({
        invoiceId: selectedInvoice.id,
        description:
          itemDescription.trim(),
        quantity: Number(quantity || 1),
        unitPrice: Number(
          unitPrice || 0
        ),
        taxRate: Number(taxRate || 0),
      });

      setItemDescription(
        "Konaklama Hizmeti"
      );
      setQuantity("1");
      setUnitPrice("0");
      setTaxRate("20");

      setMessage(
        "Fatura kalemi eklendi."
      );

      const invoiceItems =
        await listHotelInvoiceItems(
          selectedInvoice.id
        );

      setItems(invoiceItems);

      await load(companyId, hotelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kalem eklenemedi."
      );
    }
  }

  async function issueInvoice() {
    if (!selectedInvoice) return;

    try {
      await issueHotelInvoice(
        selectedInvoice.id
      );

      setMessage(
        "Fatura kesildi."
      );

      await load(companyId, hotelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fatura kesilemedi."
      );
    }
  }

  const summary = useMemo(() => {
    return {
      total: invoices.length,
      drafts: invoices.filter(
        (item) =>
          item.status === "draft"
      ).length,
      issued: invoices.filter(
        (item) =>
          item.status === "issued"
      ).length,
      revenue: invoices
        .filter(
          (item) =>
            item.status === "issued"
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.grand_total || 0
            ),
          0
        ),
    };
  }, [invoices]);

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS HOTEL PMS
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Fatura Merkezi
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Konaklama faturalarını ve
              KDV hesaplamalarını yönet.
            </p>
          </div>

          <select
            value={hotelId}
            onChange={(event) =>
              void changeHotel(
                event.target.value
              )
            }
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold"
          >
            {hotels.map((hotel) => (
              <option
                key={hotel.id}
                value={hotel.id}
              >
                {hotel.name}
              </option>
            ))}
          </select>
        </header>

        {message && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Toplam Fatura"
            value={String(summary.total)}
          />

          <Stat
            label="Taslak"
            value={String(summary.drafts)}
          />

          <Stat
            label="Kesilmiş"
            value={String(summary.issued)}
          />

          <Stat
            label="Fatura Cirosu"
            value={money(summary.revenue)}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              Yeni Fatura
            </h2>

            <div className="mt-5 space-y-3">
              <select
                value={customerType}
                onChange={(event) =>
                  setCustomerType(
                    event.target
                      .value as HotelInvoiceCustomerType
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              >
                <option value="individual">
                  Bireysel
                </option>

                <option value="company">
                  Kurumsal
                </option>
              </select>

              <input
                value={customerName}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value
                  )
                }
                placeholder="Müşteri / Firma adı"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              />

              {customerType ===
                "individual" && (
                <input
                  value={identityNumber}
                  onChange={(event) =>
                    setIdentityNumber(
                      event.target.value
                    )
                  }
                  placeholder="T.C. Kimlik No"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                />
              )}

              {customerType ===
                "company" && (
                <>
                  <input
                    value={taxOffice}
                    onChange={(event) =>
                      setTaxOffice(
                        event.target.value
                      )
                    }
                    placeholder="Vergi Dairesi"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />

                  <input
                    value={taxNumber}
                    onChange={(event) =>
                      setTaxNumber(
                        event.target.value
                      )
                    }
                    placeholder="Vergi No"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </>
              )}

              <input
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="E-posta"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="Telefon"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <button
                type="button"
                onClick={() =>
                  void createInvoice()
                }
                className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black"
              >
                Taslak Fatura Oluştur
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-black">
                Faturalar
              </h2>

              {loading ? (
                <div className="py-10 text-slate-500">
                  Yükleniyor...
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-10 text-slate-500">
                  Henüz fatura yok.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {invoices.map(
                    (invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() =>
                          void selectInvoice(
                            invoice
                          )
                        }
                        className="flex w-full flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition hover:border-orange-500/40 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="font-black">
                            {
                              invoice.invoice_no
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            {
                              invoice.customer_name
                            }
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="font-black">
                            {money(
                              invoice.grand_total
                            )}
                          </p>

                          <p className="mt-1 text-xs uppercase text-slate-500">
                            {invoice.status}
                          </p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {selectedInvoice && (
              <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <p className="text-xs font-black text-orange-400">
                      {
                        selectedInvoice.invoice_no
                      }
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      {
                        selectedInvoice.customer_name
                      }
                    </h2>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-black">
                      {money(
                        selectedInvoice.grand_total
                      )}
                    </p>

                    <p className="text-xs uppercase text-slate-500">
                      {
                        selectedInvoice.status
                      }
                    </p>
                  </div>
                </div>

                {selectedInvoice.status ===
                  "draft" && (
                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <input
                      value={itemDescription}
                      onChange={(event) =>
                        setItemDescription(
                          event.target.value
                        )
                      }
                      placeholder="Hizmet"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                    />

                    <input
                      type="number"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(
                          event.target.value
                        )
                      }
                      placeholder="Adet"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                    />

                    <input
                      type="number"
                      value={unitPrice}
                      onChange={(event) =>
                        setUnitPrice(
                          event.target.value
                        )
                      }
                      placeholder="Birim fiyat"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                    />

                    <select
                      value={taxRate}
                      onChange={(event) =>
                        setTaxRate(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                    >
                      <option value="0">
                        KDV %0
                      </option>

                      <option value="1">
                        KDV %1
                      </option>

                      <option value="10">
                        KDV %10
                      </option>

                      <option value="20">
                        KDV %20
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        void addItem()
                      }
                      className="rounded-xl border border-orange-500/40 px-4 py-3 font-black text-orange-400 md:col-span-4"
                    >
                      Fatura Kalemi Ekle
                    </button>
                  </div>
                )}

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="pb-3">
                          Açıklama
                        </th>
                        <th className="pb-3">
                          Adet
                        </th>
                        <th className="pb-3">
                          Fiyat
                        </th>
                        <th className="pb-3">
                          KDV
                        </th>
                        <th className="pb-3 text-right">
                          Toplam
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-slate-800"
                        >
                          <td className="py-3 font-bold">
                            {
                              item.description
                            }
                          </td>

                          <td className="py-3">
                            {item.quantity}
                          </td>

                          <td className="py-3">
                            {money(
                              item.unit_price
                            )}
                          </td>

                          <td className="py-3">
                            %{item.tax_rate}
                          </td>

                          <td className="py-3 text-right font-black">
                            {money(
                              item.line_total
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid gap-3 border-t border-slate-800 pt-5 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-slate-500">
                      Ara Toplam
                    </p>
                    <p className="mt-1 font-black">
                      {money(
                        selectedInvoice.subtotal
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      KDV
                    </p>
                    <p className="mt-1 font-black">
                      {money(
                        selectedInvoice.tax_total
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      Genel Toplam
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {money(
                        selectedInvoice.grand_total
                      )}
                    </p>
                  </div>
                </div>

                {selectedInvoice.status ===
                  "draft" && (
                  <button
                    type="button"
                    onClick={() =>
                      void issueInvoice()
                    }
                    className="mt-6 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-black text-black"
                  >
                    Faturayı Kes
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}
