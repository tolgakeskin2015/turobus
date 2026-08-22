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
  FaExclamationTriangle,
  FaPlay,
  FaSave,
  FaTimesCircle,
  FaUserCheck,
  FaUsers,
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


type ChangeCase = {
  id: string;
  company_id: string;
  tour_id: string;
  departure_id:
    string | null;
  reservation_id:
    string | null;
  case_number: string;
  case_type: string;
  status: string;
  priority: string;
  reason:
    string | null;
  requested_refund_amount: number;
  approved_refund_amount: number;
  supplier_cancellation_cost: number;
  customer_penalty_amount: number;
  result_snapshot:
    Record<string, unknown>;
};


type Reservation = {
  id: string;
  reservation_code:
    string | null;
  full_name: string;
  guests: number;
  status: string;
  departure_id:
    string | null;
};


type Passenger = {
  id: string;
  passenger_no: number;
  full_name: string;
  phone:
    string | null;
  identity_type:
    string | null;
  identity_number:
    string | null;
  cancellation_status: string;
};


type CaseItem = {
  id: string;
  source_id:
    string | null;
  item_type: string;
  action_type: string;
  status: string;
};


type CaseEvent = {
  id: string;
  event_type: string;
  note:
    string | null;
  created_at: string;
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
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function dateLabel(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}


function caseTypeLabel(
  value:
    string
) {
  const labels:
    Record<
      string,
      string
    > = {
      full_cancellation:
        "Tam İptal",
      partial_cancellation:
        "Kısmi İptal",
      full_refund:
        "Tam İade",
      partial_refund:
        "Kısmi İade",
      passenger_change:
        "Yolcu Değişikliği",
      departure_change:
        "Tur Çıkışı Değişikliği",
      flight_change:
        "Uçuş Değişikliği",
      bus_change:
        "Otobüs Değişikliği",
      transport_change:
        "Ulaşım Değişikliği",
    };

  return labels[value] ??
    value;
}


function statusLabel(
  value:
    string
) {
  const labels:
    Record<
      string,
      string
    > = {
      draft:
        "Taslak",
      pending_review:
        "Onay Bekliyor",
      approved:
        "Onaylandı",
      rejected:
        "Reddedildi",
      processing:
        "İşleniyor",
      completed:
        "Tamamlandı",
      cancelled:
        "Vaka İptal",
    };

  return labels[value] ??
    value;
}


export default function TourChangeCaseDetailPage() {

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
    reservation,
    setReservation,
  ] =
    useState<Reservation | null>(
      null
    );


  const [
    passengers,
    setPassengers,
  ] =
    useState<Passenger[]>(
      []
    );


  const [
    items,
    setItems,
  ] =
    useState<CaseItem[]>(
      []
    );


  const [
    events,
    setEvents,
  ] =
    useState<CaseEvent[]>(
      []
    );


  const [
    selectedPassengerIds,
    setSelectedPassengerIds,
  ] =
    useState<string[]>(
      []
    );


  const [
    decisionNote,
    setDecisionNote,
  ] =
    useState("");


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

        const {
          data:
            caseData,
          error:
            caseError,
        } =
          await supabase
            .from(
              "tour_change_cases"
            )
            .select(
              "*"
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
            .maybeSingle();


        if (
          caseError
        ) {
          throw caseError;
        }


        if (
          !caseData
        ) {
          throw new Error(
            "Vaka bulunamadı."
          );
        }


        const loadedCase =
          caseData as unknown as
            ChangeCase;


        const [
          itemResult,
          eventResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_change_case_items"
              )
              .select(
                "id,source_id,item_type,action_type,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "case_id",
                caseId
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "tour_change_case_events"
              )
              .select(
                "id,event_type,note,created_at"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "case_id",
                caseId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);


        if (
          itemResult.error
        ) {
          throw itemResult.error;
        }


        if (
          eventResult.error
        ) {
          throw eventResult.error;
        }


        let loadedReservation:
          Reservation | null =
            null;

        let loadedPassengers:
          Passenger[] =
            [];


        if (
          loadedCase.reservation_id
        ) {

          const [
            reservationResult,
            passengerResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "reservations"
                )
                .select(
                  "id,reservation_code,full_name,guests,status,departure_id"
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "id",
                  loadedCase.reservation_id
                )
                .maybeSingle(),

              supabase
                .from(
                  "tour_passengers"
                )
                .select(
                  [
                    "id",
                    "passenger_no",
                    "full_name",
                    "phone",
                    "identity_type",
                    "identity_number",
                    "cancellation_status",
                  ].join(
                    ","
                  )
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "reservation_id",
                  loadedCase.reservation_id
                )
                .order(
                  "passenger_no",
                  {
                    ascending:
                      true,
                  }
                ),
            ]);


          if (
            reservationResult.error
          ) {
            throw reservationResult.error;
          }


          if (
            passengerResult.error
          ) {
            throw passengerResult.error;
          }


          loadedReservation =
            reservationResult.data as unknown as
              Reservation | null;


          loadedPassengers =
            (
              passengerResult.data ??
              []
            ) as unknown as
              Passenger[];
        }


        const loadedItems =
          (
            itemResult.data ??
            []
          ) as unknown as
            CaseItem[];


        setChangeCase(
          loadedCase
        );


        setReservation(
          loadedReservation
        );


        setPassengers(
          loadedPassengers
        );


        setItems(
          loadedItems
        );


        setEvents(
          (
            eventResult.data ??
            []
          ) as unknown as
            CaseEvent[]
        );


        setSelectedPassengerIds(
          loadedItems
            .filter(
              item =>
                item.item_type ===
                  "passenger" &&
                item.action_type ===
                  "cancel" &&
                item.source_id
            )
            .map(
              item =>
                String(
                  item.source_id
                )
            )
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

        setLoading(
          true
        );


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


  const activePassengers =
    useMemo(
      () =>
        passengers.filter(
          passenger =>
            passenger.cancellation_status ===
            "active"
        ),
      [
        passengers,
      ]
    );


  function togglePassenger(
    passengerId:
      string
  ) {

    setSelectedPassengerIds(
      current =>
        current.includes(
          passengerId
        )
          ? current.filter(
              id =>
                id !==
                passengerId
            )
          : [
              ...current,
              passengerId,
            ]
    );
  }


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
      !companyId
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


  async function savePassengerSelection() {

    await runRpc(
      "set_tour_partial_cancellation_passengers",
      {
        p_case_id:
          caseId,

        p_passenger_ids:
          selectedPassengerIds,
      },
      "Kısmi iptal yolcu seçimi kaydedildi."
    );
  }


  async function submitReview() {

    await runRpc(
      "submit_tour_change_case",
      {
        p_case_id:
          caseId,
      },
      "Vaka onaya gönderildi."
    );
  }


  async function decide(
    decision:
      "approve" |
      "reject"
  ) {

    await runRpc(
      "decide_tour_change_case",
      {
        p_case_id:
          caseId,

        p_decision:
          decision,

        p_note:
          decisionNote.trim() ||
          null,
      },
      decision ===
        "approve"
        ? "Vaka onaylandı."
        : "Vaka reddedildi."
    );
  }


  async function applyCancellation() {

    if (
      !window.confirm(
        "Bu işlem gerçek rezervasyon ve yolcu kayıtlarını değiştirecek. İptali uygulamak istiyor musunuz?"
      )
    ) {
      return;
    }


    await runRpc(
      "apply_tour_cancellation_case",
      {
        p_case_id:
          caseId,
      },
      "İptal operasyonu başarıyla uygulandı."
    );
  }


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Vaka yükleniyor...
      </main>
    );
  }


  if (
    !changeCase
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        {error ||
          "Vaka bulunamadı."}
      </main>
    );
  }


  const isCancellation =
    [
      "full_cancellation",
      "partial_cancellation",
    ].includes(
      changeCase.case_type
    );


  return (
    <main
      data-tour-os-screen="change-case-detail"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}/degisiklikler`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          İptal & Değişiklik Merkezi
        </Link>


        <Link
          href={`/dashboard/turlar/${tourId}/degisiklikler/${caseId}/iade`}
          className="ml-3 inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-2.5 text-[8px] font-black text-emerald-300"
        >
          Finans & İade
        </Link>


        <section className="mt-4 rounded-[30px] border border-red-500/15 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.12),transparent_35%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="text-[8px] font-black uppercase tracking-[.16em] text-red-300">
                {changeCase.case_number}
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
                {caseTypeLabel(
                  changeCase.case_type
                )}
              </h1>

              <div className="mt-2 text-[9px] text-slate-400">
                {changeCase.reason ||
                  "Vaka nedeni belirtilmedi."}
              </div>

            </div>


            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

              <div className="text-[7px] font-black uppercase text-slate-500">
                Vaka Durumu
              </div>

              <div className="mt-1 text-sm font-black">
                {statusLabel(
                  changeCase.status
                )}
              </div>

            </div>

          </div>

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


        <section className="mt-5 grid gap-4 lg:grid-cols-4">

          <div className="rounded-[20px] border border-white/10 bg-white/[.025] p-4">
            <div className="text-[7px] font-black uppercase text-slate-500">
              Rezervasyon
            </div>
            <div className="mt-2 text-sm font-black">
              {reservation?.reservation_code ||
                reservation?.id.slice(
                  0,
                  8
                ) ||
                "—"}
            </div>
            <div className="mt-1 text-[8px] text-slate-500">
              {reservation?.full_name ||
                "—"}
            </div>
          </div>


          <div className="rounded-[20px] border border-white/10 bg-white/[.025] p-4">
            <div className="text-[7px] font-black uppercase text-slate-500">
              Rezervasyon Kişi
            </div>
            <div className="mt-2 text-xl font-black">
              {reservation?.guests ??
                0}
            </div>
          </div>


          <div className="rounded-[20px] border border-white/10 bg-white/[.025] p-4">
            <div className="text-[7px] font-black uppercase text-slate-500">
              Talep İade
            </div>
            <div className="mt-2 text-xl font-black">
              {money(
                changeCase.requested_refund_amount
              )}
            </div>
          </div>


          <div className="rounded-[20px] border border-amber-500/15 bg-amber-500/[.04] p-4">
            <div className="text-[7px] font-black uppercase text-amber-400">
              Tedarikçi İptal Maliyeti
            </div>
            <div className="mt-2 text-xl font-black text-amber-300">
              {money(
                changeCase.supplier_cancellation_cost
              )}
            </div>
          </div>

        </section>


        {changeCase.case_type ===
          "partial_cancellation" && (

          <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>

                <div className="flex items-center gap-2 text-sm font-black">
                  <FaUsers className="text-orange-300" />
                  İptal Edilecek Yolcular
                </div>

                <div className="mt-1 text-[8px] text-slate-500">
                  Yalnız aktif yolcular seçilebilir. Tüm yolcuları iptal etmek için tam iptal vakası kullanılmalıdır.
                </div>

              </div>


              {changeCase.status ===
                "draft" && (

                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={
                    () =>
                      void savePassengerSelection()
                  }
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[8px] font-black text-white disabled:opacity-50"
                >
                  <FaSave />
                  Seçimi Kaydet
                </button>
              )}

            </div>


            <div className="mt-4 grid gap-2 lg:grid-cols-2">

              {activePassengers.map(
                passenger => {

                  const checked =
                    selectedPassengerIds.includes(
                      passenger.id
                    );

                  return (

                    <label
                      key={
                        passenger.id
                      }
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                        checked
                          ? "border-orange-500/30 bg-orange-500/[.06]"
                          : "border-white/[.08] bg-[#030a11]/60"
                      }`}
                    >

                      <div>

                        <div className="text-[9px] font-black">
                          #{passenger.passenger_no}
                          {" · "}
                          {passenger.full_name}
                        </div>

                        <div className="mt-1 text-[7px] text-slate-500">
                          {passenger.identity_type ||
                            "kimlik"}
                          {" · "}
                          {passenger.identity_number ||
                            "numara yok"}
                        </div>

                      </div>


                      <input
                        type="checkbox"
                        disabled={
                          changeCase.status !==
                            "draft"
                        }
                        checked={
                          checked
                        }
                        onChange={
                          () =>
                            togglePassenger(
                              passenger.id
                            )
                        }
                      />

                    </label>
                  );
                }
              )}

            </div>

          </section>
        )}


        <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[.025] p-5">

          <div className="text-sm font-black">
            Onay & Uygulama
          </div>


          <div className="mt-4 flex flex-wrap gap-3">

            {changeCase.status ===
              "draft" && (

              <button
                type="button"
                disabled={
                  busy ||
                  (
                    changeCase.case_type ===
                      "partial_cancellation" &&
                    selectedPassengerIds.length ===
                      0
                  )
                }
                onClick={
                  () =>
                    void submitReview()
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-[8px] font-black text-black disabled:opacity-40"
              >
                <FaUserCheck />
                Onaya Gönder
              </button>
            )}


            {changeCase.status ===
              "pending_review" && (

              <>
                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={
                    () =>
                      void decide(
                        "approve"
                      )
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-[8px] font-black text-white"
                >
                  <FaCheckCircle />
                  Onayla
                </button>

                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={
                    () =>
                      void decide(
                        "reject"
                      )
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-500 px-4 text-[8px] font-black text-white"
                >
                  <FaTimesCircle />
                  Reddet
                </button>
              </>
            )}


            {changeCase.status ===
              "approved" &&
              isCancellation && (

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void applyCancellation()
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-[8px] font-black text-white"
              >
                <FaPlay />
                İptali Gerçekten Uygula
              </button>
            )}

          </div>


          {changeCase.status ===
            "pending_review" && (

            <textarea
              value={
                decisionNote
              }
              onChange={
                event =>
                  setDecisionNote(
                    event.target.value
                  )
              }
              rows={2}
              placeholder="Onay / red notu..."
              className="mt-4 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] outline-none"
            />
          )}

        </section>


        <section className="mt-5 rounded-[24px] border border-amber-500/15 bg-amber-500/[.035] p-5">

          <div className="flex gap-3">

            <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-300" />

            <div className="text-[8px] font-bold leading-5 text-amber-100/75">
              Bu motor rezervasyon/yolcu iptalini ve kontenjan/koltuk serbest bırakmayı uygular. Para iadesi yapmaz. Talep edilen veya onaylanan iade tutarı 15.1D Finans & İade motorunda işlenecektir.
            </div>

          </div>

        </section>


        <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[.02] p-5">

          <div className="text-sm font-black">
            Immutable Audit Timeline
          </div>


          <div className="mt-4 space-y-2">

            {events.map(
              event => (

                <div
                  key={
                    event.id
                  }
                  className="flex flex-col gap-2 rounded-xl border border-white/[.07] bg-[#030a11]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div>

                    <div className="text-[8px] font-black text-slate-300">
                      {event.event_type}
                    </div>

                    <div className="mt-1 text-[8px] text-slate-500">
                      {event.note ||
                        "Audit hareketi"}
                    </div>

                  </div>


                  <div className="text-[7px] font-bold text-slate-600">
                    {dateLabel(
                      event.created_at
                    )}
                  </div>

                </div>
              )
            )}

          </div>

        </section>

      </div>

    </main>
  );
}
