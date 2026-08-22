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
  FaShieldAlt,
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


type Plan = {
  id: string;
  name: string;
  description: string | null;
  max_compensation_amount: number;
  currency: string;
  active: boolean;
};


type Enrollment = {
  id: string;
  reservation_id: string;
  protection_plan_id: string;
  status: string;
};


type Claim = {
  id: string;
  claim_number: string;
  reservation_id: string;
  claim_type: string;
  status: string;
  requested_amount: number;
  approved_amount: number;
  currency: string;
};


type Reservation = {
  id: string;
  departure_id: string | null;
  guests: number;
  status: string;
};


export default function ProtectionPage() {

  const params =
    useParams<{
      id: string;
    }>();

  const tourId =
    String(
      params.id
    );

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    plans,
    setPlans,
  ] =
    useState<Plan[]>(
      []
    );

  const [
    enrollments,
    setEnrollments,
  ] =
    useState<Enrollment[]>(
      []
    );

  const [
    claims,
    setClaims,
  ] =
    useState<Claim[]>(
      []
    );

  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );

  const [
    name,
    setName,
  ] =
    useState(
      "Turobüs Güvence"
    );

  const [
    maxCompensation,
    setMaxCompensation,
  ] =
    useState("5000");

  const [
    selectedPlan,
    setSelectedPlan,
  ] =
    useState("");

  const [
    selectedReservation,
    setSelectedReservation,
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

        const [
          planResult,
          enrollmentResult,
          claimResult,
          reservationResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_protection_plans"
              )
              .select(
                "id,name,description,max_compensation_amount,currency,active"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "tour_protection_enrollments"
              )
              .select(
                "id,reservation_id,protection_plan_id,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              ),

            supabase
              .from(
                "tour_protection_claims"
              )
              .select(
                "id,claim_number,reservation_id,claim_type,status,requested_amount,approved_amount,currency"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "reservations"
              )
              .select(
                "id,departure_id,guests,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .neq(
                "status",
                "cancelled"
              ),
          ]);


        const firstError =
          [
            planResult.error,
            enrollmentResult.error,
            claimResult.error,
            reservationResult.error,
          ].find(Boolean);


        if (
          firstError
        ) {
          throw firstError;
        }


        setPlans(
          (
            planResult.data ??
            []
          ) as unknown as
            Plan[]
        );


        setEnrollments(
          (
            enrollmentResult.data ??
            []
          ) as unknown as
            Enrollment[]
        );


        setClaims(
          (
            claimResult.data ??
            []
          ) as unknown as
            Claim[]
        );


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );

      },
      [
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
          } =
            await supabase
              .auth
              .getUser();


          if (
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

          setLoading(false);
        }

      }
    )();

  }, [
    load,
  ]);


  const activeCount =
    enrollments.filter(
      item =>
        item.status ===
          "active"
    ).length;


  const openClaims =
    claims.filter(
      item =>
        ![
          "completed",
          "rejected",
          "cancelled",
        ].includes(
          item.status
        )
    ).length;


  const requestedTotal =
    useMemo(
      () =>
        claims.reduce(
          (
            total,
            claim
          ) =>
            total +
            Number(
              claim.requested_amount ||
              0
            ),
          0
        ),
      [
        claims,
      ]
    );


  async function run(
    fn: string,
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


    setBusy(true);
    setError("");
    setNotice("");


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

      setBusy(false);
    }
  }


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Güvence merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="protection-center"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-emerald-500/15 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.13),transparent_35%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex items-center gap-3">

            <FaShieldAlt className="text-2xl text-emerald-300" />

            <div>

              <div className="text-[8px] font-black tracking-[.16em] text-emerald-300">
                AŞAMA 17
              </div>

              <h1 className="mt-1 text-3xl font-black">
                Güvence & Müşteri Koruma
              </h1>

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


        <section className="mt-5 grid gap-3 md:grid-cols-3">

          {[
            [
              "Aktif Güvence",
              String(
                activeCount
              ),
            ],
            [
              "Açık Talep",
              String(
                openClaims
              ),
            ],
            [
              "Talep Tutarı",
              new Intl.NumberFormat(
                "tr-TR",
                {
                  style:
                    "currency",
                  currency:
                    "TRY",
                }
              ).format(
                requestedTotal
              ),
            ],
          ].map(
            item => (

              <article
                key={
                  item[0]
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >

                <div className="text-[7px] font-black uppercase text-slate-500">
                  {item[0]}
                </div>

                <div className="mt-3 text-2xl font-black">
                  {item[1]}
                </div>

              </article>
            )
          )}

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-sm font-black">
              Güvence Paketi
            </div>


            <input
              value={
                name
              }
              onChange={
                event =>
                  setName(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              type="number"
              min="0"
              value={
                maxCompensation
              }
              onChange={
                event =>
                  setMaxCompensation(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "create_tour_protection_plan",
                    {
                      p_company_id:
                        companyId,
                      p_name:
                        name,
                      p_description:
                        "Tur hizmet kusuru, gecikme ve iptal koruması.",
                      p_max_compensation:
                        Number(
                          maxCompensation
                        ) ||
                        0,
                      p_delay:
                        true,
                      p_missing_service:
                        true,
                      p_supplier_failure:
                        true,
                      p_transport_failure:
                        true,
                      p_accommodation_failure:
                        true,
                      p_cancellation:
                        true,
                    },
                    "Güvence paketi oluşturuldu."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-emerald-500 px-4 text-[8px] font-black text-black"
            >
              Güvence Paketi Oluştur
            </button>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-sm font-black">
              Rezervasyona Güvence Tanımla
            </div>


            <select
              value={
                selectedPlan
              }
              onChange={
                event =>
                  setSelectedPlan(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >

              <option value="">
                Güvence seç
              </option>

              {plans
                .filter(
                  plan =>
                    plan.active
                )
                .map(
                  plan => (

                    <option
                      key={
                        plan.id
                      }
                      value={
                        plan.id
                      }
                    >
                      {plan.name}
                      {" · "}
                      {plan.max_compensation_amount}
                      {" "}
                      {plan.currency}
                    </option>
                  )
                )}

            </select>


            <select
              value={
                selectedReservation
              }
              onChange={
                event =>
                  setSelectedReservation(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >

              <option value="">
                Rezervasyon seç
              </option>

              {reservations.map(
                reservation => (

                  <option
                    key={
                      reservation.id
                    }
                    value={
                      reservation.id
                    }
                  >
                    {reservation.id.slice(
                      0,
                      8
                    )}
                    {" · "}
                    {reservation.guests}
                    {" kişi"}
                  </option>
                )
              )}

            </select>


            <button
              disabled={
                busy ||
                !selectedPlan ||
                !selectedReservation
              }
              onClick={
                () =>
                  void run(
                    "enroll_tour_reservation_protection",
                    {
                      p_reservation_id:
                        selectedReservation,
                      p_plan_id:
                        selectedPlan,
                    },
                    "Rezervasyona güvence tanımlandı."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-orange-500 px-4 text-[8px] font-black disabled:opacity-40"
            >
              Güvenceyi Aktifleştir
            </button>

          </article>

        </section>


        <section className="mt-5 overflow-x-auto rounded-[22px] border border-white/10">

          <table className="min-w-[900px] text-left">

            <thead className="bg-[#07131f] text-[7px] font-black uppercase text-slate-500">

              <tr>
                <th className="px-4 py-3">Talep</th>
                <th className="px-4 py-3">Tür</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">Talep</th>
                <th className="px-4 py-3 text-right">Onay</th>
              </tr>

            </thead>

            <tbody>

              {claims.map(
                claim => (

                  <tr
                    key={
                      claim.id
                    }
                    className="border-t border-white/[.06] text-[8px] font-bold"
                  >
                    <td className="px-4 py-4">
                      {claim.claim_number}
                    </td>
                    <td className="px-4 py-4">
                      {claim.claim_type}
                    </td>
                    <td className="px-4 py-4">
                      {claim.status}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {claim.requested_amount}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {claim.approved_amount}
                    </td>
                  </tr>
                )
              )}

            </tbody>

          </table>

        </section>

      </div>

    </main>
  );
}
