"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";


type OperationSource =
  | "package"
  | "extra";


type Operation = {

  source:
    OperationSource;

  item_id: string;

  order_id?: string;

  booking_id: string;

  booking_code: string;

  customer_name: string;

  customer_phone:
    string | null;

  service_name: string;

  service_date:
    string | null;

  service_time:
    string | null;

  quantity: number;

  status: string;

  customer_status:
    string | null;

  room_plan?: Array<{
    adults: number;
    children: number;
  }>;

  guests?: Array<{
    guest_order: number;
    guest_type: "adult" | "child";
    full_name: string;
    child_age: number | null;
    is_primary: boolean;
  }>;

  supplier_confirmation_code?:
    string | null;

  supplier_note?:
    string | null;

  supplier_confirmed_at?:
    string | null;

  supplier_room_confirmation?: Array<{
    room_order: number;
    status: "confirmed" | "pending" | "rejected";
    room_number?: string;
    note?: string;
  }>;
};


type SupplierPortal = {

  supplier: {
    id: string;

    name: string;

    legal_name:
      string | null;

    contact_name:
      string | null;

    phone:
      string | null;

    whatsapp_phone:
      string | null;

    email:
      string | null;

    iban:
      string | null;
  };


  date: string;


  financial: {
    total_payable: number;
    paid_amount: number;
    remaining_amount: number;
  };


  operations:
    Operation[];
};


function todayLocal() {

  const date =
    new Date();


  return [
    date.getFullYear(),

    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),

  ].join("-");
}


function money(
  value: number
) {

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "TRY",
    }
  ).format(
    Number(
      value ||
      0
    )
  );
}


function formatDate(
  value: string
) {

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      weekday:
        "long",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


export default function SupplierPortalPage() {

  const params =
    useParams<{
      token: string;
    }>();


  const token =
    String(
      params?.token ||
      ""
    );


  const [
    date,
    setDate,
  ] =
    useState(
      todayLocal()
    );


  const [
    payload,
    setPayload,
  ] =
    useState<SupplierPortal | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    savingId,
    setSavingId,
  ] =
    useState(
      ""
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ""
    );


  const [
    confirmOperation,
    setConfirmOperation,
  ] =
    useState<Operation | null>(
      null
    );


  const [
    confirmationCode,
    setConfirmationCode,
  ] =
    useState(
      ""
    );


  const [
    confirmationNote,
    setConfirmationNote,
  ] =
    useState(
      ""
    );


  const [
    roomConfirmations,
    setRoomConfirmations,
  ] =
    useState<Array<{
      room_order: number;
      status:
        "confirmed" |
        "pending" |
        "rejected";
      room_number: string;
      note: string;
    }>>(
      []
    );


  const loadPortal =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setErrorMessage(
          ""
        );


        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_supplier_portal_public_v3",
            {
              p_token:
                token,

              p_date:
                date,
            }
          );


        if (
          error ||
          !data
        ) {

          setErrorMessage(
            error?.message ||
              "Tedarikçi portalı açılamadı."
          );

          setPayload(
            null
          );

          setLoading(
            false
          );

          return;
        }


        setPayload(
          data as SupplierPortal
        );


        setLoading(
          false
        );

      },
      [
        token,
        date,
      ]
    );


  useEffect(() => {

    if (token) {
      void loadPortal();
    }

  }, [
    token,
    loadPortal,
  ]);


  const stats =
    useMemo(
      () => ({

        total:
          payload?.operations
            .length ||
          0,


        confirmed:
          payload?.operations
            .filter(
              row =>
                [
                  "confirmed",
                  "in_service",
                  "completed",
                ].includes(
                  row.status
                )
            )
            .length ||
          0,


        completed:
          payload?.operations
            .filter(
              row =>
                row.status ===
                "completed"
            )
            .length ||
          0,

      }),
      [
        payload,
      ]
    );


  function openConfirmation(
    operation: Operation
  ) {

    setConfirmOperation(
      operation
    );

    setConfirmationCode(
      operation
        .supplier_confirmation_code ||
        ""
    );

    setConfirmationNote(
      operation
        .supplier_note ||
        ""
    );


    const existing =
      operation
        .supplier_room_confirmation ||
      [];


    if (
      existing.length >
      0
    ) {

      setRoomConfirmations(
        existing.map(
          (
            room,
            index
          ) => ({
            room_order:
              room.room_order ||
              index + 1,

            status:
              room.status ||
              "confirmed",

            room_number:
              room.room_number ||
              "",

            note:
              room.note ||
              "",
          })
        )
      );

      return;
    }


    setRoomConfirmations(
      (
        operation.room_plan ||
        []
      ).map(
        (
          _room,
          index
        ) => ({
          room_order:
            index + 1,

          status:
            "confirmed",

          room_number:
            "",

          note:
            "",
        })
      )
    );
  }


  async function submitConfirmation() {

    if (!confirmOperation) {
      return;
    }


    setSavingId(
      confirmOperation.item_id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );


    const {
      error,
    } =
      await supabase.rpc(
        "confirm_package_supplier_operation_public_v2",
        {
          p_token:
            token,

          p_date:
            date,

          p_item_id:
            confirmOperation.item_id,

          p_confirmation_code:
            confirmationCode.trim() ||
            null,

          p_note:
            confirmationNote.trim() ||
            null,

          p_room_confirmation:
            roomConfirmations.map(
              room => ({
                room_order:
                  room.room_order,

                status:
                  room.status,

                room_number:
                  room.room_number.trim(),

                note:
                  room.note.trim(),
              })
            ),
        }
      );


    if (error) {

      setErrorMessage(
        error.message
      );

      setSavingId(
        ""
      );

      return;
    }


    setSuccessMessage(
      "Rezervasyon ve oda dağılımı başarıyla teyit edildi."
    );

    setConfirmOperation(
      null
    );

    await loadPortal();

    setSavingId(
      ""
    );
  }


  async function updateStatus(
    operation: Operation,
    status: string
  ) {

    setSavingId(
      operation.item_id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );


    const {
      error,
    } =
      await supabase.rpc(
        "update_package_supplier_operation_public",
        {

          p_token:
            token,

          p_source:
            operation.source,

          p_item_id:
            operation.item_id,

          p_status:
            status,
        }
      );


    if (error) {

      setErrorMessage(
        error.message
      );

      setSavingId(
        ""
      );

      return;
    }


    setSuccessMessage(
      "Operasyon durumu güncellendi."
    );


    await loadPortal();


    setSavingId(
      ""
    );
  }


  if (loading) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Tedarikçi portalı hazırlanıyor...
      </main>
    );
  }


  if (!payload) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">

        <div className="max-w-lg rounded-[30px] border border-red-500/20 bg-slate-900 p-8 text-center">

          <h1 className="text-2xl font-black">
            Portal açılamadı
          </h1>


          <p className="mt-4 text-red-300">
            {errorMessage}
          </p>

        </div>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">

      <div className="mx-auto max-w-6xl">


        <div className="rounded-[32px] border border-white/10 bg-slate-900 p-6 md:p-9">

          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
            TUROBUS SUPPLIER PORTAL
          </p>


          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            {
              payload.supplier.name
            }
          </h1>


          <p className="mt-3 text-slate-400">
            Günlük operasyonlarını ve hakediş durumunu buradan takip edebilirsin.
          </p>


          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <StatCard
              label="Bugünkü İş"
              value={
                String(
                  stats.total
                )
              }
            />


            <StatCard
              label="Onaylanan"
              value={
                String(
                  stats.confirmed
                )
              }
            />


            <StatCard
              label="Tamamlanan"
              value={
                String(
                  stats.completed
                )
              }
            />


            <StatCard
              label="Toplam Hakediş"
              value={
                money(
                  payload.financial
                    .total_payable
                )
              }
            />


            <StatCard
              label="Kalan"
              value={
                money(
                  payload.financial
                    .remaining_amount
                )
              }
            />

          </div>

        </div>


        {errorMessage && (

          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>

        )}


        {successMessage && (

          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            {successMessage}
          </div>

        )}


        <div className="mt-6 rounded-[26px] border border-white/10 bg-slate-900 p-5">

          <label className="text-xs font-black uppercase tracking-wider text-slate-500">
            Operasyon Tarihi
          </label>


          <input
            type="date"
            value={
              date
            }
            onChange={
              event =>
                setDate(
                  event.target.value
                )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 md:w-auto"
          />

        </div>


        <div className="mt-6 space-y-4">

          {
            payload.operations
              .map(
                operation => (
                  <article
                    key={
                      `${operation.source}-${operation.item_id}`
                    }
                    className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">


                      <div>

                        <div className="flex flex-wrap gap-2">

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${
                              operation.source ===
                              "extra"
                                ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                                : "border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >

                            {
                              operation.source ===
                              "extra"
                                ? "EKSTRA"
                                : "PAKET"
                            }

                          </span>


                          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                            {
                              operation.status
                            }
                          </span>

                        </div>


                        <h2 className="mt-4 text-2xl font-black">
                          {
                            operation.service_name
                          }
                        </h2>


                        <p className="mt-2 text-sm text-slate-400">

                          {
                            operation.customer_name
                          }

                          {" · "}

                          {
                            operation.booking_code
                          }

                        </p>


                        {
                          operation.customer_phone &&
                          (
                            <a
                              href={`tel:${operation.customer_phone}`}
                              className="mt-2 inline-block text-sm font-bold text-orange-300"
                            >
                              {
                                operation.customer_phone
                              }
                            </a>
                          )
                        }

                      </div>


                      <div className="lg:text-right">

                        <p className="text-3xl font-black text-orange-400">

                          {
                            operation.service_time
                              ? operation.service_time
                                  .slice(
                                    0,
                                    5
                                  )
                              : "--:--"
                          }

                        </p>


                        <p className="mt-2 text-sm text-slate-400">

                          {
                            operation.service_date
                              ? formatDate(
                                  operation.service_date
                                )
                              : "Tarih planlanmadı"
                          }

                        </p>


                        <p className="mt-2 text-sm font-bold">
                          Adet:
                          {" "}
                          {
                            operation.quantity
                          }
                        </p>

                      </div>

                    </div>


                    {
                      operation.source ===
                        "package" &&
                      operation.room_plan &&
                      operation.room_plan.length >
                        0 &&
                      (
                        <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">

                          <div className="flex flex-wrap items-center justify-between gap-3">

                            <div>

                              <p className="text-xs font-black uppercase tracking-wider text-orange-300">
                                ODA DAĞILIMI
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Rezervasyonda {
                                  operation.room_plan.length
                                } oda bulunuyor.
                              </p>

                            </div>

                            {
                              operation.supplier_confirmation_code &&
                              (
                                <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300">
                                  Teyit: {
                                    operation.supplier_confirmation_code
                                  }
                                </span>
                              )
                            }

                          </div>


                          <div className="mt-4 grid gap-3 md:grid-cols-2">

                            {
                              operation.room_plan.map(
                                (
                                  room,
                                  index
                                ) => {

                                  const occupancy =
                                    Number(
                                      room.adults ||
                                      0
                                    ) +
                                    Number(
                                      room.children ||
                                      0
                                    );

                                  const confirmation =
                                    operation
                                      .supplier_room_confirmation
                                      ?.find(
                                        entry =>
                                          entry.room_order ===
                                          index + 1
                                      );

                                  return (
                                    <div
                                      key={
                                        index
                                      }
                                      className="rounded-xl border border-white/10 bg-slate-950 p-4"
                                    >

                                      <div className="flex items-center justify-between">

                                        <span className="font-black">
                                          {
                                            index +
                                            1
                                          }
                                          . Oda
                                        </span>

                                        <span className="text-xs font-black text-orange-300">
                                          {
                                            occupancy === 1
                                              ? "Single"
                                              : occupancy === 2
                                                ? "Double"
                                                : occupancy === 3
                                                  ? "Triple"
                                                  : `${occupancy} kişi`
                                          }
                                        </span>

                                      </div>

                                      <p className="mt-2 text-xs text-slate-400">
                                        {
                                          room.adults
                                        }
                                        {" yetişkin"}

                                        {
                                          room.children > 0
                                            ? ` · ${room.children} çocuk`
                                            : ""
                                        }
                                      </p>

                                      {
                                        confirmation &&
                                        (
                                          <div className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-300">
                                            {
                                              confirmation.status ===
                                                "confirmed"
                                                ? "Teyit edildi"
                                                : confirmation.status ===
                                                  "rejected"
                                                  ? "Reddedildi"
                                                  : "Bekliyor"
                                            }

                                            {
                                              confirmation.room_number
                                                ? ` · Oda No: ${confirmation.room_number}`
                                                : ""
                                            }
                                          </div>
                                        )
                                      }

                                    </div>
                                  );
                                }
                              )
                            }

                          </div>

                        </div>
                      )
                    }


                    {
                      operation.source ===
                        "package" &&
                      operation.guests &&
                      operation.guests.length >
                        0 &&
                      (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-5">

                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            MİSAFİRLER
                          </p>

                          <div className="mt-3 grid gap-2 md:grid-cols-2">

                            {
                              operation.guests.map(
                                guest => (
                                  <div
                                    key={
                                      guest.guest_order
                                    }
                                    className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm"
                                  >

                                    <span className="font-bold">
                                      {
                                        guest.full_name
                                      }
                                    </span>

                                    <span className="text-xs text-slate-500">
                                      {
                                        guest.guest_type ===
                                          "child"
                                          ? `Çocuk${guest.child_age !== null ? ` · ${guest.child_age} yaş` : ""}`
                                          : "Yetişkin"
                                      }
                                    </span>

                                  </div>
                                )
                              )
                            }

                          </div>

                        </div>
                      )
                    }


                    <div className="mt-6 flex flex-wrap gap-3">

                      {
                        operation.source ===
                        "package"
                          ? (
                            <>

                              <ActionButton
                                disabled={
                                  savingId ===
                                  operation.item_id
                                }
                                onClick={() =>
                                  openConfirmation(
                                    operation
                                  )
                                }
                              >
                                Teyit Ver
                              </ActionButton>


                              <ActionButton
                                disabled={
                                  savingId ===
                                  operation.item_id
                                }
                                onClick={() =>
                                  void updateStatus(
                                    operation,
                                    "completed"
                                  )
                                }
                              >
                                Tamamlandı
                              </ActionButton>

                            </>
                          )
                          : (
                            <>

                              <ActionButton
                                disabled={
                                  savingId ===
                                  operation.item_id
                                }
                                onClick={() =>
                                  void updateStatus(
                                    operation,
                                    "confirmed"
                                  )
                                }
                              >
                                Onayla
                              </ActionButton>


                              <ActionButton
                                disabled={
                                  savingId ===
                                  operation.item_id
                                }
                                onClick={() =>
                                  void updateStatus(
                                    operation,
                                    "in_service"
                                  )
                                }
                              >
                                Hizmet Başladı
                              </ActionButton>


                              <ActionButton
                                disabled={
                                  savingId ===
                                  operation.item_id
                                }
                                onClick={() =>
                                  void updateStatus(
                                    operation,
                                    "completed"
                                  )
                                }
                              >
                                Tamamlandı
                              </ActionButton>

                            </>
                          )
                      }

                    </div>

                  </article>
                )
              )
          }


          {
            payload.operations.length ===
            0 &&
            (
              <div className="rounded-[28px] border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
                Bu tarihte size atanmış operasyon bulunmuyor.
              </div>
            )
          }

        </div>


        <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-900 p-6">

          <h2 className="text-xl font-black">
            Hakediş Özeti
          </h2>


          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <FinanceCard
              label="Toplam"
              value={
                money(
                  payload.financial
                    .total_payable
                )
              }
            />


            <FinanceCard
              label="Ödenen"
              value={
                money(
                  payload.financial
                    .paid_amount
                )
              }
            />


            <FinanceCard
              label="Kalan"
              value={
                money(
                  payload.financial
                    .remaining_amount
                )
              }
            />

          </div>


          {
            payload.supplier.iban &&
            (
              <p className="mt-5 text-sm text-slate-400">
                Kayıtlı IBAN:
                {" "}
                <span className="font-bold text-white">
                  {
                    payload.supplier.iban
                  }
                </span>
              </p>
            )
          }

        </div>

        {
          confirmOperation &&
          (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">

              <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      TEDARİKÇİ TEYİDİ
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {
                        confirmOperation.service_name
                      }
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {
                        confirmOperation.booking_code
                      }
                      {" · "}
                      {
                        confirmOperation.customer_name
                      }
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      setConfirmOperation(
                        null
                      )
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black"
                  >
                    Kapat
                  </button>

                </div>


                <div className="mt-6 grid gap-4 md:grid-cols-2">

                  <label>

                    <span className="text-xs font-black uppercase text-slate-500">
                      Teyit Numarası
                    </span>

                    <input
                      value={
                        confirmationCode
                      }
                      onChange={
                        event =>
                          setConfirmationCode(
                            event.target.value
                          )
                      }
                      placeholder="Örn. HTL-45892"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    />

                  </label>


                  <label>

                    <span className="text-xs font-black uppercase text-slate-500">
                      Genel Not
                    </span>

                    <input
                      value={
                        confirmationNote
                      }
                      onChange={
                        event =>
                          setConfirmationNote(
                            event.target.value
                          )
                      }
                      placeholder="Varsa özel not"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    />

                  </label>

                </div>


                {
                  (
                    confirmOperation.room_plan ||
                    []
                  ).length >
                    0 &&
                  (
                    <div className="mt-7">

                      <p className="text-xs font-black uppercase tracking-wider text-orange-300">
                        ODA BAZLI TEYİT
                      </p>

                      <div className="mt-4 space-y-4">

                        {
                          (
                            confirmOperation.room_plan ||
                            []
                          ).map(
                            (
                              room,
                              index
                            ) => {

                              const state =
                                roomConfirmations[
                                  index
                                ];

                              const occupancy =
                                Number(
                                  room.adults ||
                                  0
                                ) +
                                Number(
                                  room.children ||
                                  0
                                );

                              if (!state) {
                                return null;
                              }

                              return (
                                <div
                                  key={
                                    index
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                                >

                                  <div className="flex flex-wrap items-center justify-between gap-3">

                                    <div>

                                      <div className="font-black">
                                        {
                                          index +
                                          1
                                        }
                                        . Oda · {
                                          occupancy === 1
                                            ? "Single"
                                            : occupancy === 2
                                              ? "Double"
                                              : occupancy === 3
                                                ? "Triple"
                                                : `${occupancy} kişi`
                                        }
                                      </div>

                                      <div className="mt-1 text-xs text-slate-500">
                                        {
                                          room.adults
                                        }
                                        {" yetişkin"}

                                        {
                                          room.children >
                                            0
                                            ? ` · ${room.children} çocuk`
                                            : ""
                                        }
                                      </div>

                                    </div>


                                    <select
                                      value={
                                        state.status
                                      }
                                      onChange={
                                        event => {

                                          const value =
                                            event.target.value as
                                              "confirmed" |
                                              "pending" |
                                              "rejected";

                                          setRoomConfirmations(
                                            current =>
                                              current.map(
                                                (
                                                  row,
                                                  roomIndex
                                                ) =>
                                                  roomIndex ===
                                                    index
                                                    ? {
                                                        ...row,
                                                        status:
                                                          value,
                                                      }
                                                    : row
                                              )
                                          );
                                        }
                                      }
                                      className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-black"
                                    >
                                      <option value="confirmed">
                                        Teyit Edildi
                                      </option>

                                      <option value="pending">
                                        Bekliyor
                                      </option>

                                      <option value="rejected">
                                        Uygun Değil
                                      </option>
                                    </select>

                                  </div>


                                  <div className="mt-4 grid gap-3 md:grid-cols-2">

                                    <input
                                      value={
                                        state.room_number
                                      }
                                      onChange={
                                        event =>
                                          setRoomConfirmations(
                                            current =>
                                              current.map(
                                                (
                                                  row,
                                                  roomIndex
                                                ) =>
                                                  roomIndex ===
                                                    index
                                                    ? {
                                                        ...row,
                                                        room_number:
                                                          event.target.value,
                                                      }
                                                    : row
                                              )
                                          )
                                      }
                                      placeholder="Oda No (opsiyonel)"
                                      className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                                    />


                                    <input
                                      value={
                                        state.note
                                      }
                                      onChange={
                                        event =>
                                          setRoomConfirmations(
                                            current =>
                                              current.map(
                                                (
                                                  row,
                                                  roomIndex
                                                ) =>
                                                  roomIndex ===
                                                    index
                                                    ? {
                                                        ...row,
                                                        note:
                                                          event.target.value,
                                                      }
                                                    : row
                                              )
                                          )
                                      }
                                      placeholder="Oda notu"
                                      className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                                    />

                                  </div>

                                </div>
                              );
                            }
                          )
                        }

                      </div>

                    </div>
                  )
                }


                <button
                  type="button"
                  disabled={
                    savingId ===
                    confirmOperation.item_id
                  }
                  onClick={() =>
                    void submitConfirmation()
                  }
                  className="mt-7 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50"
                >
                  {
                    savingId ===
                    confirmOperation.item_id
                      ? "Kaydediliyor..."
                      : "Rezervasyonu ve Odaları Teyit Et"
                  }
                </button>

              </div>

            </div>
          )
        }


      </div>

    </main>
  );
}


function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children:
    React.ReactNode;

  disabled?:
    boolean;

  onClick:
    () => void;
}) {

  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black disabled:opacity-40"
    >
      {children}
    </button>
  );
}


function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>


      <p className="mt-3 text-lg font-black">
        {value}
      </p>

    </div>
  );
}


function FinanceCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

      <p className="text-xs text-slate-500">
        {label}
      </p>


      <p className="mt-2 text-xl font-black">
        {value}
      </p>

    </div>
  );
}
