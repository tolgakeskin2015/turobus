"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCashRegister,
  FaCreditCard,
  FaFileInvoiceDollar,
  FaHotel,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  addFolioCharge,
  addFolioPayment,
  deleteFolioCharge,
  deleteFolioPayment,
  FolioDetail,
  FolioReservation,
  getFolioDetail,
  getFolioReservations,
  getOrCreateFolio,
  updateFolioStatus,
} from "@/lib/hotel/folio/folio-service";

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function money(
  value: number,
  currency: string
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
    }
  ).format(Number(value || 0));
}

function formatDate(
  value: string
): string {
  return new Date(value).toLocaleDateString(
    "tr-TR"
  );
}

const chargeCategories = {
  accommodation: "Konaklama",
  restaurant: "Restoran",
  bar: "Bar",
  minibar: "Minibar",
  spa: "SPA",
  transfer: "Transfer",
  tour: "Tur",
  laundry: "Çamaşır",
  room_service: "Oda Servisi",
  late_checkout: "Geç Çıkış",
  early_checkin: "Erken Giriş",
  tax: "Vergi",
  discount: "İndirim",
  other: "Diğer",
};

const paymentTypes = {
  cash: "Nakit",
  credit_card: "Kredi Kartı",
  debit_card: "Banka Kartı",
  bank_transfer: "Havale / EFT",
  online: "Online Ödeme",
  agency: "Acente",
  voucher: "Voucher",
  other: "Diğer",
};

export default function FolioPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    reservations,
    setReservations,
  ] = useState<FolioReservation[]>([]);

  const [
    selectedReservation,
    setSelectedReservation,
  ] =
    useState<FolioReservation | null>(
      null
    );

  const [detail, setDetail] =
    useState<FolioDetail | null>(null);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [chargeForm, setChargeForm] =
    useState({
      category: "restaurant",
      description: "",
      quantity: "1",
      unitPrice: "",
      taxRate: "10",
      discountAmount: "0",
      notes: "",
    });

  const [paymentForm, setPaymentForm] =
    useState({
      paymentType: "cash",
      transactionType:
        "payment" as
          | "payment"
          | "refund",
      amount: "",
      currency: "TRY",
      exchangeRate: "1",
      referenceNo: "",
      provider: "",
      installmentCount: "1",
      notes: "",
    });

  const loadReservations =
    useCallback(
      async (companyId: string) => {
        const data =
          await getFolioReservations(
            companyId
          );

        setReservations(data);
      },
      []
    );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          currentMembership
        );

        await loadReservations(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Folio merkezi yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadReservations]);

  const filteredReservations =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      if (!query) {
        return reservations;
      }

      return reservations.filter(
        (reservation) => {
          const hotel =
            firstRelation(
              reservation.hotel
            );

          const room =
            firstRelation(
              reservation.room
            );

          return [
            reservation.reservation_no,
            hotel?.name,
            room?.room_number,
            reservation.status,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            );
        }
      );
    }, [reservations, search]);

  async function openReservation(
    reservation: FolioReservation
  ) {
    if (!membership) return;

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const folio =
        await getOrCreateFolio(
          membership.company_id,
          reservation.id
        );

      const folioDetail =
        await getFolioDetail(
          membership.company_id,
          folio.id
        );

      setSelectedReservation(
        reservation
      );

      setDetail(folioDetail);

      setPaymentForm((current) => ({
        ...current,
        currency:
          folioDetail.folio.currency,
      }));
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Folio açılamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function refreshDetail() {
    if (!membership || !detail) {
      return;
    }

    const updated =
      await getFolioDetail(
        membership.company_id,
        detail.folio.id
      );

    setDetail(updated);

    await loadReservations(
      membership.company_id
    );
  }

  async function submitCharge(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      !detail ||
      !selectedReservation
    ) {
      return;
    }

    if (
      !chargeForm.description.trim()
    ) {
      setErrorMessage(
        "Harcama açıklaması girilmelidir."
      );

      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      await addFolioCharge({
        companyId:
          membership.company_id,
        hotelId:
          selectedReservation.hotel_id,
        reservationId:
          selectedReservation.id,
        folioId: detail.folio.id,
        category:
          chargeForm.category,
        description:
          chargeForm.description.trim(),
        quantity: Math.max(
          0.001,
          Number(
            chargeForm.quantity
          ) || 1
        ),
        unitPrice: Math.max(
          0,
          Number(
            chargeForm.unitPrice
          ) || 0
        ),
        taxRate: Math.max(
          0,
          Number(
            chargeForm.taxRate
          ) || 0
        ),
        discountAmount: Math.max(
          0,
          Number(
            chargeForm.discountAmount
          ) || 0
        ),
        currency:
          detail.folio.currency,
        notes:
          chargeForm.notes.trim() ||
          null,
        userId: user?.id ?? null,
      });

      setChargeForm({
        category: "restaurant",
        description: "",
        quantity: "1",
        unitPrice: "",
        taxRate: "10",
        discountAmount: "0",
        notes: "",
      });

      await refreshDetail();

      setSuccessMessage(
        "Harcama folioya eklendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Harcama eklenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function submitPayment(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      !detail ||
      !selectedReservation
    ) {
      return;
    }

    const amount = Number(
      paymentForm.amount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setErrorMessage(
        "Geçerli bir ödeme tutarı girilmelidir."
      );

      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      await addFolioPayment({
        companyId:
          membership.company_id,
        hotelId:
          selectedReservation.hotel_id,
        reservationId:
          selectedReservation.id,
        folioId: detail.folio.id,
        paymentType:
          paymentForm.paymentType,
        transactionType:
          paymentForm.transactionType,
        amount,
        currency:
          paymentForm.currency,
        exchangeRate: Math.max(
          0.000001,
          Number(
            paymentForm.exchangeRate
          ) || 1
        ),
        referenceNo:
          paymentForm.referenceNo.trim() ||
          null,
        provider:
          paymentForm.provider.trim() ||
          null,
        installmentCount: Math.max(
          1,
          Number(
            paymentForm.installmentCount
          ) || 1
        ),
        notes:
          paymentForm.notes.trim() ||
          null,
        userId: user?.id ?? null,
      });

      setPaymentForm(
        (current) => ({
          ...current,
          amount: "",
          referenceNo: "",
          provider: "",
          installmentCount: "1",
          notes: "",
        })
      );

      await refreshDetail();

      setSuccessMessage(
        paymentForm.transactionType ===
          "payment"
          ? "Ödeme folioya işlendi."
          : "İade folioya işlendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ödeme kaydedilemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function removeCharge(
    chargeId: string
  ) {
    if (!membership || !detail) {
      return;
    }

    if (
      !window.confirm(
        "Bu harcama kalıcı olarak silinsin mi?"
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await deleteFolioCharge(
        membership.company_id,
        chargeId
      );

      await refreshDetail();

      setSuccessMessage(
        "Harcama silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Harcama silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function removePayment(
    paymentId: string
  ) {
    if (!membership || !detail) {
      return;
    }

    if (
      !window.confirm(
        "Bu ödeme hareketi kalıcı olarak silinsin mi?"
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await deleteFolioPayment(
        membership.company_id,
        paymentId
      );

      await refreshDetail();

      setSuccessMessage(
        "Ödeme hareketi silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ödeme silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function toggleFolioStatus() {
    if (!membership || !detail) {
      return;
    }

    const nextStatus =
      detail.folio.status === "open"
        ? "closed"
        : "open";

    if (
      nextStatus === "closed" &&
      Math.abs(detail.folio.balance) >
        0.01 &&
      !window.confirm(
        `Folioda ${money(
          detail.folio.balance,
          detail.folio.currency
        )} bakiye bulunuyor. Yine de kapatılsın mı?`
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await updateFolioStatus(
        membership.company_id,
        detail.folio.id,
        nextStatus
      );

      await refreshDetail();

      setSuccessMessage(
        nextStatus === "closed"
          ? "Folio kapatıldı."
          : "Folio yeniden açıldı."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Folio durumu güncellenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Folio merkezi yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1700px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL PMS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Folio & Ödeme Merkezi
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            Misafir hesaplarını, ek
            harcamaları, tahsilatları ve
            iadeleri tek ekrandan yönetin.
          </p>
        </header>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[30px] border border-white/10 bg-slate-900 p-5">
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Rezervasyon veya oda ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <div className="mt-5 max-h-[760px] space-y-3 overflow-y-auto pr-1">
              {filteredReservations.map(
                (reservation) => {
                  const hotel =
                    firstRelation(
                      reservation.hotel
                    );

                  const room =
                    firstRelation(
                      reservation.room
                    );

                  const selected =
                    selectedReservation?.id ===
                    reservation.id;

                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void openReservation(
                          reservation
                        )
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-orange-400 bg-orange-500/10"
                          : "border-white/10 bg-slate-950 hover:border-white/20"
                      }`}
                    >
                      <p className="text-xs font-black text-orange-400">
                        {
                          reservation.reservation_no
                        }
                      </p>

                      <p className="mt-2 font-black">
                        {hotel?.name ??
                          "Otel"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {room?.room_number
                          ? `Oda ${room.room_number}`
                          : "Oda atanmadı"}
                        {" · "}
                        {reservation.status}
                      </p>

                      <p className="mt-3 text-lg font-black text-amber-400">
                        {money(
                          reservation.balance,
                          reservation.currency
                        )}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </aside>

          {!detail ||
          !selectedReservation ? (
            <section className="flex min-h-[650px] items-center justify-center rounded-[30px] border border-white/10 bg-slate-900 p-12 text-center">
              <div>
                <FaFileInvoiceDollar className="mx-auto text-5xl text-orange-400" />

                <h2 className="mt-5 text-2xl font-black">
                  Bir rezervasyon seçin
                </h2>

                <p className="mt-2 text-slate-500">
                  Folio detayları burada
                  görüntülenecek.
                </p>
              </div>
            </section>
          ) : (
            <section>
              <div className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      {detail.folio.folio_no}
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      {
                        selectedReservation.reservation_no
                      }
                    </h2>

                    <p className="mt-2 text-slate-500">
                      {
                        firstRelation(
                          selectedReservation.hotel
                        )?.name
                      }
                      {" · "}
                      {
                        firstRelation(
                          selectedReservation.room_type
                        )?.name
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void toggleFolioStatus()
                    }
                    className={`min-h-12 rounded-xl px-6 font-black ${
                      detail.folio.status ===
                      "open"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    {detail.folio.status ===
                    "open"
                      ? "Folioyu Kapat"
                      : "Folioyu Aç"}
                  </button>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label:
                        "Konaklama Bakiyesi",
                      value:
                        detail.folio
                          .opening_balance,
                      icon: FaHotel,
                    },
                    {
                      label:
                        "Ek Harcamalar",
                      value:
                        detail.folio
                          .charge_total,
                      icon: FaCashRegister,
                    },
                    {
                      label: "Tahsilat",
                      value:
                        detail.folio
                          .payment_total -
                        detail.folio
                          .refund_total,
                      icon:
                        FaMoneyBillWave,
                    },
                    {
                      label: "Kalan Bakiye",
                      value:
                        detail.folio
                          .balance,
                      icon: FaCreditCard,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <article
                        key={item.label}
                        className="rounded-2xl bg-slate-950 p-5"
                      >
                        <Icon className="text-orange-400" />

                        <p className="mt-4 text-xs text-slate-500">
                          {item.label}
                        </p>

                        <p className="mt-2 text-2xl font-black">
                          {money(
                            item.value,
                            detail.folio
                              .currency
                          )}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid gap-6 2xl:grid-cols-2">
                <form
                  onSubmit={submitCharge}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <h3 className="flex items-center gap-3 text-2xl font-black">
                    <FaPlus className="text-orange-400" />
                    Harcama Ekle
                  </h3>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <select
                      value={
                        chargeForm.category
                      }
                      onChange={(event) =>
                        setChargeForm(
                          (current) => ({
                            ...current,
                            category:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(
                        chargeCategories
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {label}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      required
                      value={
                        chargeForm.description
                      }
                      onChange={(event) =>
                        setChargeForm(
                          (current) => ({
                            ...current,
                            description:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Açıklama"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />

                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={
                        chargeForm.quantity
                      }
                      onChange={(event) =>
                        setChargeForm(
                          (current) => ({
                            ...current,
                            quantity:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Adet"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />

                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        chargeForm.unitPrice
                      }
                      onChange={(event) =>
                        setChargeForm(
                          (current) => ({
                            ...current,
                            unitPrice:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Birim fiyat"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        chargeForm.taxRate
                      }
                      onChange={(event) =>
                        setChargeForm(
                          (current) => ({
                            ...current,
                            taxRate:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="KDV %"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        chargeForm.discountAmount
                      }
                      onChange={(event) =>
                        setChargeForm(
                          (current) => ({
                            ...current,
                            discountAmount:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="İndirim"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      processing ||
                      detail.folio.status !==
                        "open"
                    }
                    className="mt-5 min-h-12 w-full rounded-xl bg-orange-500 font-black disabled:opacity-50"
                  >
                    Harcamayı Kaydet
                  </button>
                </form>

                <form
                  onSubmit={submitPayment}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <h3 className="flex items-center gap-3 text-2xl font-black">
                    <FaMoneyBillWave className="text-emerald-400" />
                    Ödeme / İade
                  </h3>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <select
                      value={
                        paymentForm.transactionType
                      }
                      onChange={(event) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            transactionType:
                              event.target
                                .value as
                                | "payment"
                                | "refund",
                          })
                        )
                      }
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      <option value="payment">
                        Tahsilat
                      </option>

                      <option value="refund">
                        İade
                      </option>
                    </select>

                    <select
                      value={
                        paymentForm.paymentType
                      }
                      onChange={(event) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            paymentType:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(
                        paymentTypes
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {label}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        paymentForm.amount
                      }
                      onChange={(event) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            amount:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Tutar"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />

                    <select
                      value={
                        paymentForm.currency
                      }
                      onChange={(event) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            currency:
                              event.target
                                .value,
                            exchangeRate:
                              event.target
                                .value ===
                              detail.folio
                                .currency
                                ? "1"
                                : current.exchangeRate,
                          })
                        )
                      }
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      <option value="TRY">
                        TRY
                      </option>
                      <option value="EUR">
                        EUR
                      </option>
                      <option value="USD">
                        USD
                      </option>
                      <option value="GBP">
                        GBP
                      </option>
                    </select>

                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={
                        paymentForm.exchangeRate
                      }
                      onChange={(event) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            exchangeRate:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Kur"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />

                    <input
                      value={
                        paymentForm.referenceNo
                      }
                      onChange={(event) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            referenceNo:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Referans no"
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      processing ||
                      detail.folio.status !==
                        "open"
                    }
                    className="mt-5 min-h-12 w-full rounded-xl bg-emerald-500 font-black disabled:opacity-50"
                  >
                    Ödemeyi Kaydet
                  </button>
                </form>
              </div>

              <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6">
                <h3 className="text-2xl font-black">
                  Harcama Hareketleri
                </h3>

                <div className="mt-5 space-y-3">
                  {detail.charges.map(
                    (charge) => (
                      <article
                        key={charge.id}
                        className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-950 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="font-black">
                            {
                              charge.description
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              chargeCategories[
                                charge.category as keyof typeof chargeCategories
                              ]
                            }
                            {" · "}
                            {charge.quantity}
                            {" × "}
                            {money(
                              charge.unit_price,
                              charge.currency
                            )}
                            {" · KDV %"}
                            {charge.tax_rate}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <p className="text-lg font-black">
                            {money(
                              charge.total_amount,
                              charge.currency
                            )}
                          </p>

                          <button
                            type="button"
                            disabled={
                              processing ||
                              detail.folio
                                .status !==
                                "open"
                            }
                            onClick={() =>
                              void removeCharge(
                                charge.id
                              )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </article>
                    )
                  )}

                  {detail.charges.length ===
                    0 && (
                    <p className="text-slate-500">
                      Ek harcama bulunmuyor.
                    </p>
                  )}
                </div>
              </section>

              <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6">
                <h3 className="text-2xl font-black">
                  Ödeme Hareketleri
                </h3>

                <div className="mt-5 space-y-3">
                  {detail.payments.map(
                    (payment) => (
                      <article
                        key={payment.id}
                        className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-950 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p
                            className={`font-black ${
                              payment.transaction_type ===
                              "refund"
                                ? "text-red-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {payment.transaction_type ===
                            "refund"
                              ? "İade"
                              : "Tahsilat"}
                            {" · "}
                            {
                              paymentTypes[
                                payment.payment_type as keyof typeof paymentTypes
                              ]
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              payment.payment_date
                            )}
                            {" · Kur: "}
                            {
                              payment.exchange_rate
                            }
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <p className="text-lg font-black">
                            {money(
                              payment.base_amount,
                              detail.folio
                                .currency
                            )}
                          </p>

                          <button
                            type="button"
                            disabled={
                              processing ||
                              detail.folio
                                .status !==
                                "open"
                            }
                            onClick={() =>
                              void removePayment(
                                payment.id
                              )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </article>
                    )
                  )}

                  {detail.payments.length ===
                    0 && (
                    <p className="text-slate-500">
                      Ödeme hareketi
                      bulunmuyor.
                    </p>
                  )}
                </div>
              </section>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
