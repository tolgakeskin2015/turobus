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

  supplier_id:
    string |
    null;

  supplier_status:
    string;

  supplier_requested_at:
    string |
    null;

  supplier_confirmed_at:
    string |
    null;

  supplier_completed_at:
    string |
    null;

  supplier_confirmation_code:
    string |
    null;

  supplier_note:
    string |
    null;

  supplier_due_date:
    string |
    null;

  voucher_created_at:
    string |
    null;
};


type Payable = {
  id: string;

  booking_item_id:
    string |
    null;

  supplier_id:
    string |
    null;

  amount: number;

  paid_amount: number;

  due_date:
    string |
    null;

  status:
    "open" |
    "partial" |
    "paid" |
    "cancelled";

  currency: string;
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
    supplierForms,
    setSupplierForms,
  ] =
    useState<
      Record<
        string,
        {
          confirmationCode:
            string;

          note:
            string;

          dueDate:
            string;
        }
      >
    >(
      {}
    );

  const [
    payables,
    setPayables,
  ] =
    useState<
      Payable[]
    >(
      []
    );

  const [
    payableInputs,
    setPayableInputs,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

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


  const loadPayables =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "package_supplier_payables"
            )
            .select(`
              id,
              booking_item_id,
              supplier_id,
              amount,
              paid_amount,
              due_date,
              status,
              currency
            `)
            .eq(
              "booking_id",
              bookingId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          throw new Error(
            error.message
          );
        }

        setPayables(
          (
            data ??
            []
          ) as Payable[]
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


  useEffect(
    () => {
      void loadPayables();
    },
    [
      loadPayables,
    ]
  );


  async function refreshAll() {
    await Promise.all([
      loadEvents(),
      loadPayables(),
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


  function supplierForm(
    item: Item
  ) {
    return (
      supplierForms[
        item.id
      ] ?? {
        confirmationCode:
          item.supplier_confirmation_code ??
          "",

        note:
          item.supplier_note ??
          "",

        dueDate:
          item.supplier_due_date ??
          "",
      }
    );
  }


  function changeSupplierForm(
    itemId: string,
    key:
      "confirmationCode" |
      "note" |
      "dueDate",
    value: string
  ) {
    setSupplierForms(
      current => ({
        ...current,

        [itemId]: {
          confirmationCode:
            current[itemId]
              ?.confirmationCode ??
            "",

          note:
            current[itemId]
              ?.note ??
            "",

          dueDate:
            current[itemId]
              ?.dueDate ??
            "",

          [key]:
            value,
        },
      })
    );
  }


  function payableForItem(
    itemId: string
  ) {
    return payables.find(
      payable =>
        payable.booking_item_id ===
        itemId
    );
  }


  function payableBalance(
    payable:
      Payable |
      undefined
  ) {
    if (!payable) {
      return 0;
    }

    return Math.max(
      Number(
        payable.amount ||
        0
      ) -
      Number(
        payable.paid_amount ||
        0
      ),
      0
    );
  }


  async function recordSupplierPayment(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    const payable =
      payableForItem(
        item.id
      );

    if (!payable) {
      setErrorMessage(
        "Bu hizmet için henüz hakediş kaydı oluşmamış."
      );

      return;
    }

    const remaining =
      payableBalance(
        payable
      );

    const amount =
      Number(
        payableInputs[
          payable.id
        ] ||
        0
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setErrorMessage(
        "Geçerli bir tedarikçi ödeme tutarı girin."
      );

      return;
    }

    if (
      amount >
      remaining
    ) {
      setErrorMessage(
        "Ödeme tutarı kalan hakedişten büyük olamaz."
      );

      return;
    }

    setBusy(
      `payable-${payable.id}`
    );

    try {
      const {
        error,
      } =
        await supabase
          .rpc(
            "record_package_supplier_payment",
            {
              p_payable_id:
                payable.id,

              p_amount:
                amount,

              p_notes:
                "Rezervasyon Detay Merkezi üzerinden tedarikçi ödemesi.",
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setPayableInputs(
        current => ({
          ...current,

          [payable.id]:
            "",
        })
      );

      setMessage(
        "Tedarikçi ödemesi kaydedildi."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tedarikçi ödemesi kaydedilemedi."
      );
    } finally {
      setBusy("");
    }
  }


  async function supplierPortalLink(
    item: Item
  ) {
    if (
      !item.supplier_id
    ) {
      throw new Error(
        "Bu hizmete tedarikçi atanmadı."
      );
    }

    const {
      data,
      error,
    } =
      await supabase
        .rpc(
          "ensure_package_supplier_portal",
          {
            p_supplier_id:
              item.supplier_id,
          }
        );

    if (
      error ||
      !data
    ) {
      throw new Error(
        error?.message ||
        "Tedarikçi portalı hazırlanamadı."
      );
    }

    const portal =
      data as {
        portal_token:
          string;
      };

    return (
      `${window.location.origin}` +
      `/tedarikci/${portal.portal_token}`
    );
  }


  async function copySupplierPortal(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    setBusy(
      `portal-copy-${item.id}`
    );

    try {
      const link =
        await supplierPortalLink(
          item
        );

      await navigator.clipboard
        .writeText(
          link
        );

      setMessage(
        "Tedarikçi portal bağlantısı kopyalandı."
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Portal bağlantısı kopyalanamadı."
      );
    } finally {
      setBusy("");
    }
  }


  async function openSupplierPortal(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    setBusy(
      `portal-open-${item.id}`
    );

    try {
      const link =
        await supplierPortalLink(
          item
        );

      window.open(
        link,
        "_blank",
        "noopener,noreferrer"
      );

      setMessage(
        "Tedarikçi portalı açıldı."
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tedarikçi portalı açılamadı."
      );
    } finally {
      setBusy("");
    }
  }


  async function queueSupplierWhatsApp(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    if (
      !item.supplier_id
    ) {
      setErrorMessage(
        "Önce hizmete tedarikçi atanmalıdır."
      );

      return;
    }

    setBusy(
      `whatsapp-${item.id}`
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            "package_booking_queue_supplier_whatsapp",
            {
              p_booking_item_id:
                item.id,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const result =
        data as {
          supplier_name?:
            string;
        };

      setMessage(
        result.supplier_name
          ? `${result.supplier_name} için WhatsApp mesajı kuyruğa alındı.`
          : "WhatsApp mesajı kuyruğa alındı."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "WhatsApp mesajı hazırlanamadı."
      );
    } finally {
      setBusy("");
    }
  }


  async function sendSupplierRequest(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    if (
      !item.supplier_id
    ) {
      setErrorMessage(
        "Önce hizmete tedarikçi atanmalıdır."
      );

      return;
    }

    const form =
      supplierForm(
        item
      );

    setBusy(
      `request-${item.id}`
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            "package_booking_send_supplier_request",
            {
              p_booking_item_id:
                item.id,

              p_note:
                form.note ||
                null,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const result =
        data as {
          portal_path?:
            string;
        };

      setMessage(
        result.portal_path
          ? `Tedarikçi talebi hazırlandı. Portal: ${result.portal_path}`
          : "Tedarikçi talebi gönderildi."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tedarikçi talebi gönderilemedi."
      );
    } finally {
      setBusy("");
    }
  }


  async function confirmSupplierService(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    const form =
      supplierForm(
        item
      );

    setBusy(
      `confirm-${item.id}`
    );

    try {
      const {
        error,
      } =
        await supabase
          .rpc(
            "package_booking_confirm_supplier_service",
            {
              p_booking_item_id:
                item.id,

              p_confirmation_code:
                form.confirmationCode ||
                null,

              p_note:
                form.note ||
                null,

              p_due_date:
                form.dueDate ||
                null,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setMessage(
        "Tedarikçi teyidi kaydedildi ve hakediş kontrol edildi."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tedarikçi teyidi kaydedilemedi."
      );
    } finally {
      setBusy("");
    }
  }


  async function ensureVoucher(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    setBusy(
      `voucher-${item.id}`
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            "package_booking_ensure_voucher",
            {
              p_booking_item_id:
                item.id,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const result =
        data as {
          voucher_code?:
            string;

          voucher_path?:
            string;
        };

      setMessage(
        result.voucher_code
          ? `${result.voucher_code} voucherı hazır.`
          : "Voucher hazırlandı."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Voucher oluşturulamadı."
      );
    } finally {
      setBusy("");
    }
  }


  async function completeSupplierService(
    item: Item
  ) {
    setMessage("");
    setErrorMessage("");

    const form =
      supplierForm(
        item
      );

    setBusy(
      `complete-${item.id}`
    );

    try {
      const {
        error,
      } =
        await supabase
          .rpc(
            "package_booking_complete_supplier_service",
            {
              p_booking_item_id:
                item.id,

              p_note:
                form.note ||
                null,
            }
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setMessage(
        "Hizmet tamamlandı olarak işaretlendi."
      );

      await refreshAll();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Hizmet tamamlanamadı."
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

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-violet-400">
              Operasyon
            </p>

            <h2 className="mt-2 text-xl font-black">
              Tedarikçi Operasyon Merkezi
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Talep, teyit numarası, ödeme vadesi,
              voucher ve hizmet tamamlanma sürecini
              tek yerden yönetin.
            </p>

          </div>

        </div>


        <div className="mt-6 space-y-4">

          {
            items.map(
              item => {
                const form =
                  supplierForm(
                    item
                  );

                const requested =
                  Boolean(
                    item.supplier_requested_at
                  );

                const confirmed =
                  item.supplier_status ===
                    "confirmed" ||
                  item.supplier_status ===
                    "completed";

                const completed =
                  item.supplier_status ===
                  "completed";

                const payable =
                  payableForItem(
                    item.id
                  );

                const remainingPayable =
                  payableBalance(
                    payable
                  );

                return (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div>

                        <p className="text-lg font-black">
                          {
                            item.name
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">

                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">
                            {
                              item.supplier_id
                                ? "Tedarikçili Hizmet"
                                : "İç Hizmet"
                            }
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              completed
                                ? "bg-emerald-500/10 text-emerald-300"
                                : confirmed
                                  ? "bg-cyan-500/10 text-cyan-300"
                                  : requested
                                    ? "bg-violet-500/10 text-violet-300"
                                    : "bg-amber-500/10 text-amber-300"
                            }`}
                          >
                            {
                              completed
                                ? "Hizmet Tamamlandı"
                                : confirmed
                                  ? "Tedarikçi Onayladı"
                                  : requested
                                    ? "Talep Gönderildi"
                                    : "Talep Bekliyor"
                            }
                          </span>

                          {
                            item.voucher_created_at &&
                            (
                              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                                Voucher Hazır
                              </span>
                            )
                          }

                        </div>

                      </div>


                      <div className="text-right text-xs text-slate-500">

                        {
                          item.supplier_requested_at &&
                          (
                            <div>
                              Talep:{" "}
                              {
                                dateTime(
                                  item.supplier_requested_at
                                )
                              }
                            </div>
                          )
                        }

                        {
                          item.supplier_confirmed_at &&
                          (
                            <div className="mt-1">
                              Teyit:{" "}
                              {
                                dateTime(
                                  item.supplier_confirmed_at
                                )
                              }
                            </div>
                          )
                        }

                        {
                          item.supplier_completed_at &&
                          (
                            <div className="mt-1">
                              Tamamlandı:{" "}
                              {
                                dateTime(
                                  item.supplier_completed_at
                                )
                              }
                            </div>
                          )
                        }

                      </div>

                    </div>


                    <div className="mt-5 grid gap-3 md:grid-cols-3">

                      <div>

                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                          Tedarikçi Teyit No
                        </label>

                        <input
                          value={
                            form.confirmationCode
                          }
                          onChange={
                            event =>
                              changeSupplierForm(
                                item.id,
                                "confirmationCode",
                                event.target.value
                              )
                          }
                          placeholder="Örn. HR-458921"
                          className="w-full rounded-xl border border-white/10 bg-slate-900 p-3"
                        />

                      </div>


                      <div>

                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                          Hakediş / Ödeme Vadesi
                        </label>

                        <input
                          type="date"
                          value={
                            form.dueDate
                          }
                          onChange={
                            event =>
                              changeSupplierForm(
                                item.id,
                                "dueDate",
                                event.target.value
                              )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-900 p-3"
                        />

                      </div>


                      <div>

                        <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                          Tedarikçi Notu
                        </label>

                        <input
                          value={
                            form.note
                          }
                          onChange={
                            event =>
                              changeSupplierForm(
                                item.id,
                                "note",
                                event.target.value
                              )
                          }
                          placeholder="Oda, saat, buluşma, özel not..."
                          className="w-full rounded-xl border border-white/10 bg-slate-900 p-3"
                        />

                      </div>

                    </div>


                    {
                      item.supplier_confirmation_code &&
                      (
                        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
                          Teyit No:{" "}
                          <strong>
                            {
                              item.supplier_confirmation_code
                            }
                          </strong>
                        </div>
                      )
                    }


                    {
                      payable &&
                      (
                        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">

                          <div className="flex flex-wrap items-start justify-between gap-4">

                            <div>

                              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                                Tedarikçi Hakedişi
                              </p>

                              <div className="mt-3 grid gap-3 sm:grid-cols-3">

                                <div>
                                  <p className="text-[11px] text-slate-500">
                                    Toplam
                                  </p>

                                  <p className="mt-1 font-black">
                                    {
                                      money(
                                        payable.amount
                                      )
                                    }
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] text-slate-500">
                                    Ödenen
                                  </p>

                                  <p className="mt-1 font-black text-emerald-300">
                                    {
                                      money(
                                        payable.paid_amount
                                      )
                                    }
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] text-slate-500">
                                    Kalan
                                  </p>

                                  <p className="mt-1 font-black text-amber-300">
                                    {
                                      money(
                                        remainingPayable
                                      )
                                    }
                                  </p>
                                </div>

                              </div>

                            </div>


                            <div className="text-right">

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                  payable.status ===
                                  "paid"
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : payable.status ===
                                      "partial"
                                      ? "bg-blue-500/10 text-blue-300"
                                      : payable.status ===
                                        "cancelled"
                                        ? "bg-red-500/10 text-red-300"
                                        : "bg-amber-500/10 text-amber-300"
                                }`}
                              >
                                {
                                  payable.status ===
                                  "paid"
                                    ? "Ödendi"
                                    : payable.status ===
                                      "partial"
                                      ? "Kısmi Ödendi"
                                      : payable.status ===
                                        "cancelled"
                                        ? "İptal"
                                        : "Ödeme Bekliyor"
                                }
                              </span>

                              {
                                payable.due_date &&
                                (
                                  <p className="mt-3 text-xs text-slate-500">
                                    Vade:{" "}
                                    {
                                      new Intl.DateTimeFormat(
                                        "tr-TR"
                                      ).format(
                                        new Date(
                                          `${payable.due_date}T12:00:00`
                                        )
                                      )
                                    }
                                  </p>
                                )
                              }

                            </div>

                          </div>


                          {
                            payable.status !==
                              "paid" &&
                            payable.status !==
                              "cancelled" &&
                            remainingPayable >
                              0 &&
                            (
                              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">

                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  max={
                                    remainingPayable
                                  }
                                  value={
                                    payableInputs[
                                      payable.id
                                    ] ??
                                    ""
                                  }
                                  onChange={
                                    event =>
                                      setPayableInputs(
                                        current => ({
                                          ...current,

                                          [payable.id]:
                                            event.target.value,
                                        })
                                      )
                                  }
                                  placeholder="Ödenecek tutar"
                                  className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-slate-900 p-3 text-sm"
                                />

                                <button
                                  type="button"
                                  disabled={
                                    busy ===
                                    `payable-${payable.id}`
                                  }
                                  onClick={
                                    () =>
                                      void recordSupplierPayment(
                                        item
                                      )
                                  }
                                  className="rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40"
                                >
                                  Tedarikçi Ödemesi Kaydet
                                </button>

                              </div>
                            )
                          }

                        </div>
                      )
                    }


                    <div className="mt-5 flex flex-wrap gap-2">

                      <button
                        type="button"
                        disabled={
                          !item.supplier_id ||
                          busy ===
                            `whatsapp-${item.id}`
                        }
                        onClick={
                          () =>
                            void queueSupplierWhatsApp(
                              item
                            )
                        }
                        className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black text-green-300 disabled:opacity-40"
                      >
                        WhatsApp Talebi Gönder
                      </button>


                      <button
                        type="button"
                        disabled={
                          !item.supplier_id ||
                          busy ===
                            `portal-open-${item.id}`
                        }
                        onClick={
                          () =>
                            void openSupplierPortal(
                              item
                            )
                        }
                        className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-black text-sky-300 disabled:opacity-40"
                      >
                        Portalı Aç
                      </button>


                      <button
                        type="button"
                        disabled={
                          !item.supplier_id ||
                          busy ===
                            `portal-copy-${item.id}`
                        }
                        onClick={
                          () =>
                            void copySupplierPortal(
                              item
                            )
                        }
                        className="rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-2 text-xs font-black text-slate-300 disabled:opacity-40"
                      >
                        Portal Linkini Kopyala
                      </button>


                      <button
                        type="button"
                        disabled={
                          !item.supplier_id ||
                          busy ===
                            `request-${item.id}` ||
                          completed
                        }
                        onClick={
                          () =>
                            void sendSupplierRequest(
                              item
                            )
                        }
                        className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-300 disabled:opacity-40"
                      >
                        {
                          requested
                            ? "Talebi Yeniden Gönder"
                            : "Tedarikçiye Talep Gönder"
                        }
                      </button>


                      <button
                        type="button"
                        disabled={
                          !item.supplier_id ||
                          busy ===
                            `confirm-${item.id}` ||
                          completed
                        }
                        onClick={
                          () =>
                            void confirmSupplierService(
                              item
                            )
                        }
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-300 disabled:opacity-40"
                      >
                        Tedarikçi Teyidini Kaydet
                      </button>


                      <button
                        type="button"
                        disabled={
                          !confirmed ||
                          busy ===
                            `voucher-${item.id}`
                        }
                        onClick={
                          () =>
                            void ensureVoucher(
                              item
                            )
                        }
                        className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-300 disabled:opacity-40"
                      >
                        {
                          item.voucher_created_at
                            ? "Voucherı Kontrol Et"
                            : "Voucher Oluştur"
                        }
                      </button>


                      <button
                        type="button"
                        disabled={
                          !confirmed ||
                          completed ||
                          busy ===
                            `complete-${item.id}`
                        }
                        onClick={
                          () =>
                            void completeSupplierService(
                              item
                            )
                        }
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-300 disabled:opacity-40"
                      >
                        Hizmeti Tamamla
                      </button>

                    </div>


                    {
                      !item.supplier_id &&
                      (
                        <p className="mt-4 text-xs text-amber-300">
                          Bu hizmet için henüz tedarikçi atanmamış.
                        </p>
                      )
                    }

                  </div>
                );
              }
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
