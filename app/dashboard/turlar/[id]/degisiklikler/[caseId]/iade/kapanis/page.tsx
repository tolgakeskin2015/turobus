"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileInvoice,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Refund = {
  id: string;
  amount: number;
  currency: string;
  status: string;

  provider:
    string | null;

  provider_reference:
    string | null;

  reconciliation_status:
    string;

  receipt_document_id:
    string | null;

  customer_notification_id:
    string | null;

  closure_prepared_at:
    string | null;

  reconciled_at:
    string | null;

  reconciliation_note:
    string | null;
};


type Communication = {
  id: string;
  delivery_status: string;
  channel: string;
};


type ChangeCase = {
  id: string;
  case_number: string;
};


function money(
  value:
    number
) {

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "TRY",

      maximumFractionDigits:
        2,
    }
  ).format(
    Number(
      value ||
      0
    )
  );
}


export default function RefundClosurePage() {

  const params =
    useParams<{
      id: string;
      caseId: string;
    }>();


  const tourId =
    String(
      params.id
    );


  const caseId =
    String(
      params.caseId
    );


  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    changeCase,
    setChangeCase,
  ] =
    useState<ChangeCase | null>(
      null
    );


  const [
    refunds,
    setRefunds,
  ] =
    useState<Refund[]>(
      []
    );


  const [
    communications,
    setCommunications,
  ] =
    useState<Communication[]>(
      []
    );


  const [
    selectedRefundId,
    setSelectedRefundId,
  ] =
    useState("");


  const [
    note,
    setNote,
  ] =
    useState("");


  const [
    allowUnsent,
    setAllowUnsent,
  ] =
    useState(false);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


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


  const load =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {

        const [
          caseResult,
          refundResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_change_cases"
              )
              .select(
                "id,case_number"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .eq(
                "id",
                caseId
              )
              .maybeSingle(),

            supabase
              .from(
                "tour_change_refunds"
              )
              .select(
                [
                  "id",
                  "amount",
                  "currency",
                  "status",
                  "provider",
                  "provider_reference",
                  "reconciliation_status",
                  "receipt_document_id",
                  "customer_notification_id",
                  "closure_prepared_at",
                  "reconciled_at",
                  "reconciliation_note",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "case_id",
                caseId
              )
              .eq(
                "status",
                "paid"
              )
              .order(
                "completed_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);


        if (
          caseResult.error
        ) {
          throw caseResult.error;
        }


        if (
          refundResult.error
        ) {
          throw refundResult.error;
        }


        if (
          !caseResult.data
        ) {
          throw new Error(
            "Vaka bulunamadı."
          );
        }


        const loadedRefunds =
          (
            refundResult.data ??
            []
          ) as unknown as
            Refund[];


        setChangeCase(
          caseResult.data as
            ChangeCase
        );


        setRefunds(
          loadedRefunds
        );


        setSelectedRefundId(
          current => {

            if (
              current &&
              loadedRefunds.some(
                item =>
                  item.id ===
                  current
              )
            ) {
              return current;
            }

            return (
              loadedRefunds[0]
                ?.id ??
              ""
            );
          }
        );


        const ids =
          loadedRefunds
            .map(
              item =>
                item.customer_notification_id
            )
            .filter(
              (
                item
              ):
                item is string =>
                  Boolean(
                    item
                  )
            );


        if (
          ids.length ===
          0
        ) {

          setCommunications(
            []
          );

          return;
        }


        const communicationResult =
          await supabase
            .from(
              "tour_operation_communications"
            )
            .select(
              "id,delivery_status,channel"
            )
            .eq(
              "company_id",
              currentCompanyId
            )
            .in(
              "id",
              ids
            );


        if (
          communicationResult.error
        ) {
          throw communicationResult.error;
        }


        setCommunications(
          (
            communicationResult.data ??
            []
          ) as unknown as
            Communication[]
        );

      },
      [
        caseId,
        tourId,
      ]
    );


  useEffect(() => {

    void (
      async () => {

        try {

          const {
            data:
              authData,

            error:
              authError,
          } =
            await supabase
              .auth
              .getUser();


          if (
            authError ||
            !authData.user
          ) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }


          const membership =
            await getCurrentMembership(
              authData.user.id
            );


          if (
            !membership
          ) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }


          setCompanyId(
            membership.company_id
          );


          await load(
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
    load,
  ]);


  const selected =
    useMemo(
      () =>
        refunds.find(
          item =>
            item.id ===
            selectedRefundId
        ) ??
        null,
      [
        refunds,
        selectedRefundId,
      ]
    );


  const communication =
    selected
      ?.customer_notification_id
      ? communications.find(
          item =>
            item.id ===
            selected.customer_notification_id
        ) ??
        null
      : null;


  const messageDelivered =
    Boolean(
      communication &&
      [
        "sent",
        "delivered",
        "read",
      ].includes(
        communication.delivery_status
      )
    );


  async function runRpc(
    fn:
      string,
    args:
      Record<
        string,
        unknown
      >,
    success:
      string
  ) {

    if (
      !companyId ||
      !selectedRefundId
    ) {
      return;
    }


    setBusy(
      true
    );

    setError(
      ""
    );

    setNotice(
      ""
    );


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          fn,
          args
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId
      );


      setNotice(
        success
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


  async function prepareClosure() {

    await runRpc(
      "prepare_tour_refund_closure",
      {
        p_refund_id:
          selectedRefundId,
      },
      "İade kapanış dosyası hazırlandı."
    );
  }


  async function reconcile() {

    if (
      !window.confirm(
        allowUnsent
          ? "Müşteri mesajı gönderilmiş görünmüyor. Manuel override ile finans mutabakatını kapatmak istediğinizden emin misiniz?"
          : "İade finans mutabakatını kapatmak istiyor musunuz?"
      )
    ) {
      return;
    }


    await runRpc(
      "reconcile_tour_refund_closure",
      {
        p_refund_id:
          selectedRefundId,

        p_note:
          note.trim() ||
          null,

        p_allow_unsent_notification:
          allowUnsent,
      },
      "İade finans mutabakatı kapatıldı."
    );
  }


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        İade kapanış merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="refund-closure"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}/degisiklikler/${caseId}/iade`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Finans & İade
        </Link>


        <section className="mt-4 rounded-[30px] border border-emerald-500/15 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.12),transparent_35%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="text-[8px] font-black uppercase tracking-[.16em] text-emerald-300">
            İADE KAPANIŞI
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
            {changeCase?.case_number ||
              "İade Mutabakatı"}
          </h1>

          <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-400">
            İade makbuzu, müşteri bilgilendirmesi ve finans mutabakatını tek kapanış akışında kontrol eder.
          </p>

        </section>


        {error && (

          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] font-bold text-red-300">
            <FaTimesCircle className="mr-2 inline" />
            {error}
          </div>
        )}


        {notice && (

          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] font-bold text-emerald-300">
            <FaCheckCircle className="mr-2 inline" />
            {notice}
          </div>
        )}


        {refunds.length ===
          0 ? (

          <section className="mt-5 rounded-[24px] border border-dashed border-white/10 px-5 py-14 text-center">

            <FaExclamationTriangle className="mx-auto text-2xl text-amber-400" />

            <div className="mt-3 text-sm font-black">
              Kapanacak ödenmiş iade yok
            </div>

            <div className="mt-1 text-[8px] text-slate-500">
              Önce Finans & İade ekranında manuel veya provider iadesinin gerçekten tamamlanması gerekir.
            </div>

          </section>

        ) : (

          <>

            <section className="mt-5 rounded-[22px] border border-white/10 bg-[#07131f] p-5">

              <label className="grid gap-2">

                <span className="text-[8px] font-black text-slate-400">
                  Ödenmiş İade
                </span>

                <select
                  value={
                    selectedRefundId
                  }
                  onChange={
                    event =>
                      setSelectedRefundId(
                        event.target.value
                      )
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                >

                  {refunds.map(
                    refund => (

                      <option
                        key={
                          refund.id
                        }
                        value={
                          refund.id
                        }
                      >
                        {refund.id.slice(
                          0,
                          8
                        )}
                        {" · "}
                        {money(
                          refund.amount
                        )}
                        {" · "}
                        {refund.reconciliation_status}
                      </option>
                    )
                  )}

                </select>

              </label>

            </section>


            <section className="mt-5 grid gap-3 md:grid-cols-3">

              <article className="rounded-[22px] border border-white/10 bg-white/[.025] p-5">

                <FaFileInvoice className="text-orange-300" />

                <div className="mt-3 text-[8px] font-black uppercase text-slate-500">
                  İade Makbuzu
                </div>

                <div className="mt-2 text-sm font-black">
                  {selected
                    ?.receipt_document_id
                    ? "Hazır"
                    : "Bekliyor"}
                </div>

                <Link
                  href={`/dashboard/turlar/${tourId}/belgeler`}
                  className="mt-3 inline-block text-[8px] font-black text-orange-300"
                >
                  Belge Merkezini Aç
                </Link>

              </article>


              <article className="rounded-[22px] border border-white/10 bg-white/[.025] p-5">

                <FaEnvelope className="text-blue-300" />

                <div className="mt-3 text-[8px] font-black uppercase text-slate-500">
                  Müşteri Bildirimi
                </div>

                <div className="mt-2 text-sm font-black">
                  {communication
                    ? communication.delivery_status
                    : "Bekliyor"}
                </div>

                <div className="mt-1 text-[7px] text-slate-500">
                  {communication
                    ?.channel ||
                    "—"}
                </div>

                <Link
                  href={`/dashboard/turlar/${tourId}/mesajlar`}
                  className="mt-3 inline-block text-[8px] font-black text-blue-300"
                >
                  Mesaj Merkezini Aç
                </Link>

              </article>


              <article className="rounded-[22px] border border-emerald-500/15 bg-emerald-500/[.035] p-5">

                <FaSyncAlt className="text-emerald-300" />

                <div className="mt-3 text-[8px] font-black uppercase text-slate-500">
                  Finans Mutabakatı
                </div>

                <div className="mt-2 text-sm font-black text-emerald-300">
                  {selected
                    ?.reconciliation_status ||
                    "pending"}
                </div>

              </article>

            </section>


            {selected
              ?.reconciliation_status ===
              "pending" && (

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void prepareClosure()
                }
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-[8px] font-black text-white disabled:opacity-50"
              >
                <FaFileInvoice />
                Kapanış Dosyasını Hazırla
              </button>
            )}


            {selected
              ?.reconciliation_status ===
              "ready" && (

              <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

                <div className="text-sm font-black">
                  Finans Mutabakatını Kapat
                </div>

                <div className="mt-1 text-[8px] leading-5 text-slate-500">
                  Normalde müşteri bildiriminin sent / delivered / read olması gerekir.
                </div>


                <textarea
                  value={
                    note
                  }
                  onChange={
                    event =>
                      setNote(
                        event.target.value
                      )
                  }
                  placeholder="Mutabakat notu..."
                  rows={3}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] outline-none"
                />


                {!messageDelivered && (

                  <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[.05] p-4">

                    <input
                      type="checkbox"
                      checked={
                        allowUnsent
                      }
                      onChange={
                        event =>
                          setAllowUnsent(
                            event.target.checked
                          )
                      }
                      className="mt-0.5"
                    />

                    <span className="text-[8px] font-bold leading-5 text-amber-200">
                      Müşteri bildirimi gönderilmiş görünmüyor. İstisnai olarak manuel mutabakat ile kapat.
                    </span>

                  </label>
                )}


                <button
                  type="button"
                  disabled={
                    busy ||
                    (
                      !messageDelivered &&
                      !allowUnsent
                    )
                  }
                  onClick={
                    () =>
                      void reconcile()
                  }
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-[8px] font-black text-white disabled:opacity-40"
                >
                  <FaCheckCircle />
                  Mutabakatı Kapat
                </button>

              </section>
            )}


            {selected
              ?.reconciliation_status ===
              "reconciled" && (

              <section className="mt-5 rounded-[24px] border border-emerald-500/20 bg-emerald-500/[.055] p-5">

                <FaCheckCircle className="text-2xl text-emerald-300" />

                <div className="mt-3 text-sm font-black text-emerald-300">
                  İade dosyası tamamen kapatıldı
                </div>

                <div className="mt-1 text-[8px] text-slate-400">
                  Belge, müşteri bildirim kaydı ve finans mutabakatı tamamlandı.
                </div>

              </section>
            )}

          </>
        )}

      </div>

    </main>
  );
}
