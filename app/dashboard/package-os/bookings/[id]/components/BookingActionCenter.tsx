"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";


type Item = {
  id: string;
  name: string;
  supplier_id: string | null;
  supplier_status: string;
};


type EventRow = {
  id: string;

  event_type: string;

  title: string;

  description:
    string |
    null;

  created_at: string;

  metadata:
    Record<
      string,
      unknown
    >;
};


type Props = {
  bookingId: string;

  bookingStatus: string;

  balanceAmount: number;

  items: Item[];

  onChanged:
    () => Promise<void>;
};


function money(
  value: number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function dateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}


function eventIcon(
  type: string
) {
  if (
    type ===
    "payment_received"
  ) {
    return "₺";
  }

  if (
    type ===
    "supplier_status_changed"
  ) {
    return "✓";
  }

  if (
    type ===
    "booking_status_changed"
  ) {
    return "↻";
  }

  if (
    type ===
    "operation_note"
  ) {
    return "✎";
  }

  return "●";
}


export default function
BookingActionCenter({
  bookingId,
  bookingStatus,
  balanceAmount,
  items,
  onChanged,
}: Props) {
  const [
    events,
    setEvents,
  ] =
    useState<
      EventRow[]
    >(
      []
    );

  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState(
      "cash"
    );

  const [
    paymentNote,
    setPaymentNote,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState(
      bookingStatus
    );

  const [
    statusNote,
    setStatusNote,
  ] =
    useState("");

  const [
    operationNote,
    setOperationNote,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const loadEvents =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "package_booking_events"
            )
            .select(`
              id,
              event_type,
              title,
              description,
              created_at,
              metadata
            `)
            .eq(
              "booking_id",
              bookingId
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
            );

        if (error) {
          throw new Error(
            error.message
          );
        }

        setEvents(
          (
            data ??
            []
          ) as EventRow[]
        );
      },
      [
        bookingId,
      ]
    );


  useEffect(
    () => {
      setStatus(
        bookingStatus
      );
    },
    [
      bookingStatus,
    ]
  );


  useEffect(
    () => {
      void loadEvents();
    },
    [
      loadEvents,
    ]
  );


  async function refreshAll() {
    await Promise.all([
      loadEvents(),
      onChanged(),
    ]);
  }


  async function addPayment(
    event:
      FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const amount =
      Number(
        paymentAmount
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setErrorMessage(
        "Geçerli bir tahsilat tutarı girin."
      );

      return;
    }

    setBusy(
      "payment"
    );

    try {
      const {
        error,
      } =
        await supabase
          .rpc(
            "package_booking_add_payment",
            {
              p_booking_id:
                bookingId,

              p_amount:
                amount,

              p_payment_method:
                paymentMethod,

              p_note:
                paymentNote ||
                null,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setPaymentAmount(
        ""
      );

      setPaymentNote(
        ""
      );

      setMessage(
        "Tahsilat kaydedildi."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tahsilat kaydedilemedi."
      );
    } finally {
      setBusy("");
    }
  }


  async function updateStatus() {
    setMessage("");
    setErrorMessage("");

    setBusy(
      "status"
    );

    try {
      const {
        error,
      } =
        await supabase
          .rpc(
            "package_booking_set_status",
            {
              p_booking_id:
                bookingId,

              p_status:
                status,

              p_note:
                statusNote ||
                null,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setStatusNote(
        ""
      );

      setMessage(
        "Rezervasyon durumu güncellendi."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Rezervasyon durumu güncellenemedi."
      );
    } finally {
      setBusy("");
    }
  }


  async function updateSupplier(
    itemId: string,
    supplierStatus:
      string
  ) {
    setMessage("");
    setErrorMessage("");

    setBusy(
      itemId
    );

    try {
      const {
        error,
      } =
        await supabase
          .rpc(
            "package_booking_set_supplier_status",
            {
              p_booking_item_id:
                itemId,

              p_status:
                supplierStatus,

              p_note:
                null,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setMessage(
        "Tedarikçi durumu güncellendi."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tedarikçi durumu güncellenemedi."
      );
    } finally {
      setBusy("");
    }
  }


  async function addNote(
    event:
      FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (
      !operationNote
        .trim()
    ) {
      return;
    }

    setBusy(
      "note"
    );

    try {
      const {
        error,
      } =
        await supabase
          .rpc(
            "package_booking_add_note",
            {
              p_booking_id:
                bookingId,

              p_note:
                operationNote.trim(),
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setOperationNote(
        ""
      );

      setMessage(
        "Operasyon notu eklendi."
      );

      await loadEvents();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Not eklenemedi."
      );
    } finally {
      setBusy("");
    }
  }


  return (
    <div className="space-y-6">

      {
        message &&
        (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )
      }

      {
        errorMessage &&
        (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )
      }


      <section className="rounded-[26px] border border-white/10 bg-slate-900 p-6">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              Finans
            </p>

            <h2 className="mt-2 text-xl font-black">
              Tahsilat Ekle
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Kalan müşteri bakiyesi:{" "}
              <strong className="text-white">
                {
                  money(
                    balanceAmount
                  )
                }
              </strong>
            </p>
          </div>

        </div>


        <form
          onSubmit={
            addPayment
          }
          className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto]"
        >

          <input
            type="number"
            min="0.01"
            step="0.01"
            max={
              Math.max(
                balanceAmount,
                0
              )
            }
            value={
              paymentAmount
            }
            onChange={
              event =>
                setPaymentAmount(
                  event.target.value
                )
            }
            placeholder="Tutar"
            className="rounded-xl border border-white/10 bg-slate-950 p-3"
          />

          <select
            value={
              paymentMethod
            }
            onChange={
              event =>
                setPaymentMethod(
                  event.target.value
                )
            }
            className="rounded-xl border border-white/10 bg-slate-950 p-3"
          >
            <option value="cash">
              Nakit
            </option>

            <option value="credit_card">
              Kredi Kartı
            </option>

            <option value="bank_transfer">
              Havale / EFT
            </option>

            <option value="pos">
              POS
            </option>

            <option value="other">
              Diğer
            </option>
          </select>

          <input
            value={
              paymentNote
            }
            onChange={
              event =>
                setPaymentNote(
                  event.target.value
                )
            }
            placeholder="Tahsilat notu / açıklama"
            className="rounded-xl border border-white/10 bg-slate-950 p-3"
          />

          <button
            type="submit"
            disabled={
              busy ===
              "payment" ||
              balanceAmount <=
              0
            }
            className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-black disabled:opacity-40"
          >
            {
              busy ===
              "payment"
                ? "Kaydediliyor..."
                : "Tahsilat Kaydet"
            }
          </button>

        </form>

      </section>


      <section className="rounded-[26px] border border-white/10 bg-slate-900 p-6">

        <p className="text-xs font-black uppercase tracking-wider text-cyan-400">
          Rezervasyon
        </p>

        <h2 className="mt-2 text-xl font-black">
          Durum Yönetimi
        </h2>


        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_2fr_auto]">

          <select
            value={
              status
            }
            onChange={
              event =>
                setStatus(
                  event.target.value
                )
            }
            className="rounded-xl border border-white/10 bg-slate-950 p-3"
          >

            <option value="pending">
              Ödeme Bekliyor
            </option>

            <option value="confirmed">
              Onaylı
            </option>

            <option value="in_service">
              Tatilde / Hizmette
            </option>

            <option value="completed">
              Tamamlandı
            </option>

            <option value="cancelled">
              İptal
            </option>

          </select>

          <input
            value={
              statusNote
            }
            onChange={
              event =>
                setStatusNote(
                  event.target.value
                )
            }
            placeholder="Durum değişikliği açıklaması"
            className="rounded-xl border border-white/10 bg-slate-950 p-3"
          />

          <button
            type="button"
            onClick={
              () =>
                void updateStatus()
            }
            disabled={
              busy ===
              "status"
            }
            className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 disabled:opacity-40"
          >
            Durumu Güncelle
          </button>

        </div>

      </section>


      <section className="rounded-[26px] border border-white/10 bg-slate-900 p-6">

        <p className="text-xs font-black uppercase tracking-wider text-violet-400">
          Operasyon
        </p>

        <h2 className="mt-2 text-xl font-black">
          Tedarikçi Onay Merkezi
        </h2>


        <div className="mt-5 space-y-3">

          {
            items.map(
              item => (
                <div
                  key={
                    item.id
                  }
                  className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 md:grid-cols-[1fr_220px]"
                >

                  <div>
                    <p className="font-black">
                      {
                        item.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        item.supplier_id
                          ? "Tedarikçili hizmet"
                          : "İç hizmet"
                      }
                    </p>
                  </div>


                  <select
                    value={
                      item.supplier_status
                    }
                    disabled={
                      busy ===
                      item.id
                    }
                    onChange={
                      event =>
                        void updateSupplier(
                          item.id,
                          event.target.value
                        )
                    }
                    className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm font-bold"
                  >

                    <option value="pending">
                      Bekliyor
                    </option>

                    <option value="requested">
                      Talep Gönderildi
                    </option>

                    <option value="confirmed">
                      Onaylandı
                    </option>

                    <option value="completed">
                      Tamamlandı
                    </option>

                    <option value="cancelled">
                      İptal
                    </option>

                  </select>

                </div>
              )
            )
          }

        </div>

      </section>


      <section className="rounded-[26px] border border-white/10 bg-slate-900 p-6">

        <p className="text-xs font-black uppercase tracking-wider text-amber-400">
          Operasyon Günlüğü
        </p>

        <h2 className="mt-2 text-xl font-black">
          Not & Zaman Çizelgesi
        </h2>


        <form
          onSubmit={
            addNote
          }
          className="mt-5 flex gap-3"
        >

          <input
            value={
              operationNote
            }
            onChange={
              event =>
                setOperationNote(
                  event.target.value
                )
            }
            placeholder="Örn. Otelle görüşüldü, rezervasyon teyidi alındı..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3"
          />

          <button
            type="submit"
            disabled={
              busy ===
              "note"
            }
            className="rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 disabled:opacity-40"
          >
            Not Ekle
          </button>

        </form>


        <div className="mt-7 space-y-0">

          {
            events.map(
              (
                event,
                index
              ) => (
                <div
                  key={
                    event.id
                  }
                  className="relative grid grid-cols-[42px_1fr] gap-4"
                >

                  <div className="flex flex-col items-center">

                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950 text-sm font-black text-orange-300">
                      {
                        eventIcon(
                          event.event_type
                        )
                      }
                    </div>

                    {
                      index <
                      events.length -
                      1 &&
                      (
                        <div className="min-h-10 w-px flex-1 bg-white/10" />
                      )
                    }

                  </div>


                  <div className="pb-6">

                    <div className="flex flex-wrap items-start justify-between gap-3">

                      <p className="font-black">
                        {
                          event.title
                        }
                      </p>

                      <span className="text-xs text-slate-500">
                        {
                          dateTime(
                            event.created_at
                          )
                        }
                      </span>

                    </div>

                    {
                      event.description &&
                      (
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {
                            event.description
                          }
                        </p>
                      )
                    }

                  </div>

                </div>
              )
            )
          }


          {
            events.length ===
            0 &&
            (
              <div className="rounded-xl border border-white/10 bg-slate-950 p-5 text-sm text-slate-500">
                Henüz operasyon hareketi bulunmuyor.
              </div>
            )
          }

        </div>

      </section>

    </div>
  );
}
