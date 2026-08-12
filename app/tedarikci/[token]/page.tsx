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
            "get_package_supplier_portal_public",
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
