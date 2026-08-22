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
  FaChartLine,
  FaCheckCircle,
  FaCoins,
  FaSyncAlt,
  FaTimesCircle,
  FaUserTie,
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


type Staff = {
  id: string;
  full_name: string;
  staff_role: string;
  is_active: boolean;
};


type Plan = {
  id: string;
  name: string;
  basis: string;
  rate_percent: number;
  fixed_amount: number;
  active: boolean;
};


type Reservation = {
  id: string;
  reservation_code: string | null;
  full_name: string;
  departure_id: string | null;
  status: string;
};


type StaffSale = {
  id: string;
  reservation_id: string;
  staff_id: string;
  revenue_amount: number;
  gross_profit_amount: number;
  commission_amount: number;
  status: string;
};


type Snapshot = {
  id: string;
  staff_id: string;
  sale_count: number;
  revenue_amount: number;
  gross_profit_amount: number;
  approved_commission_amount: number;
  paid_commission_amount: number;
  average_sale_amount: number;
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
      value ||
      0
    )
  );
}


export default function TourPerformancePage() {

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
    staff,
    setStaff,
  ] =
    useState<Staff[]>(
      []
    );


  const [
    plans,
    setPlans,
  ] =
    useState<Plan[]>(
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
    sales,
    setSales,
  ] =
    useState<StaffSale[]>(
      []
    );


  const [
    snapshots,
    setSnapshots,
  ] =
    useState<Snapshot[]>(
      []
    );


  const [
    selectedStaff,
    setSelectedStaff,
  ] =
    useState("");


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
    planName,
    setPlanName,
  ] =
    useState(
      "Standart Satış Primi"
    );


  const [
    rate,
    setRate,
  ] =
    useState("10");


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


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
          staffResult,
          planResult,
          reservationResult,
          saleResult,
          snapshotResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "staff_profiles"
              )
              .select(
                "id,full_name,staff_role,is_active"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "is_active",
                true
              ),

            supabase
              .from(
                "tour_staff_commission_plans"
              )
              .select(
                "id,name,basis,rate_percent,fixed_amount,active"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "active",
                true
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
                "id,reservation_code,full_name,departure_id,status"
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

            supabase
              .from(
                "tour_staff_sales"
              )
              .select(
                "id,reservation_id,staff_id,revenue_amount,gross_profit_amount,commission_amount,status"
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
                "tour_staff_performance_snapshots"
              )
              .select(
                "id,staff_id,sale_count,revenue_amount,gross_profit_amount,approved_commission_amount,paid_commission_amount,average_sale_amount"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .is(
                "departure_id",
                null
              ),
          ]);


        const firstError =
          [
            staffResult.error,
            planResult.error,
            reservationResult.error,
            saleResult.error,
            snapshotResult.error,
          ].find(Boolean);


        if (
          firstError
        ) {
          throw firstError;
        }


        setStaff(
          (
            staffResult.data ??
            []
          ) as unknown as
            Staff[]
        );


        setPlans(
          (
            planResult.data ??
            []
          ) as unknown as
            Plan[]
        );


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );


        setSales(
          (
            saleResult.data ??
            []
          ) as unknown as
            StaffSale[]
        );


        setSnapshots(
          (
            snapshotResult.data ??
            []
          ) as unknown as
            Snapshot[]
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


  const staffMap =
    useMemo(
      () =>
        new Map(
          staff.map(
            item => [
              item.id,
              item.full_name,
            ]
          )
        ),
      [
        staff,
      ]
    );


  const revenue =
    sales.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.revenue_amount ||
          0
        ),
      0
    );


  const profit =
    sales.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.gross_profit_amount ||
          0
        ),
      0
    );


  const commissions =
    sales.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.commission_amount ||
          0
        ),
      0
    );


  async function run(
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
        Performans merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="staff-performance"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1700px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-blue-500/15 bg-[#07131f] p-6 lg:p-8">

          <div className="flex items-center gap-3">

            <FaUserTie className="text-2xl text-blue-300" />

            <div>

              <div className="text-[8px] font-black text-blue-300">
                AŞAMA 20
              </div>

              <h1 className="text-3xl font-black">
                Personel Satış & Prim Performansı
              </h1>

            </div>

          </div>

        </section>


        {error && (

          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] text-red-300">
            <FaTimesCircle className="mr-2 inline" />
            {error}
          </div>
        )}


        {notice && (

          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] text-emerald-300">
            <FaCheckCircle className="mr-2 inline" />
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-3 md:grid-cols-4">

          {[
            [
              "Atanmış Satış",
              String(
                sales.length
              ),
            ],
            [
              "Ciro",
              money(
                revenue
              ),
            ],
            [
              "Brüt Kâr",
              money(
                profit
              ),
            ],
            [
              "Toplam Prim",
              money(
                commissions
              ),
            ],
          ].map(
            item => (

              <article
                key={item[0]}
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="text-[7px] font-black text-slate-500">
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

            <div className="flex items-center gap-2 text-sm font-black">
              <FaCoins className="text-orange-300" />
              Prim Planı
            </div>


            <input
              value={
                planName
              }
              onChange={
                event =>
                  setPlanName(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              type="number"
              min="0"
              max="100"
              value={
                rate
              }
              onChange={
                event =>
                  setRate(
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
                    "create_tour_staff_commission_plan",
                    {
                      p_company_id:
                        companyId,

                      p_name:
                        planName,

                      p_basis:
                        "gross_profit",

                      p_rate_percent:
                        Number(
                          rate
                        ) ||
                        0,

                      p_fixed_amount:
                        0,

                      p_min_sale_amount:
                        0,
                    },
                    "Prim planı oluşturuldu."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
            >
              Prim Planı Oluştur
            </button>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-sm font-black">
              Satışı Personele Bağla
            </div>


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
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Rezervasyon seç
              </option>

              {reservations.map(
                item => (

                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.reservation_code ||
                      item.id.slice(
                        0,
                        8
                      )}
                    {" · "}
                    {item.full_name}
                  </option>
                )
              )}
            </select>


            <select
              value={
                selectedStaff
              }
              onChange={
                event =>
                  setSelectedStaff(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Personel seç
              </option>

              {staff.map(
                item => (

                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.full_name}
                    {" · "}
                    {item.staff_role}
                  </option>
                )
              )}
            </select>


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
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Prim planı seç
              </option>

              {plans.map(
                item => (

                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.name}
                    {" · "}
                    %{item.rate_percent}
                  </option>
                )
              )}
            </select>


            <button
              disabled={
                busy ||
                !selectedReservation ||
                !selectedStaff ||
                !selectedPlan
              }
              onClick={
                () =>
                  void run(
                    "assign_tour_sale_to_staff",
                    {
                      p_reservation_id:
                        selectedReservation,

                      p_staff_id:
                        selectedStaff,

                      p_plan_id:
                        selectedPlan,
                    },
                    "Satış personele bağlandı ve primi hesaplandı."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-blue-500 px-4 text-[8px] font-black disabled:opacity-40"
            >
              Satışı Ata
            </button>

          </article>

        </section>


        <section className="mt-5 overflow-x-auto rounded-[22px] border border-white/10">

          <table className="min-w-[1100px] text-left">

            <thead className="bg-[#07131f] text-[7px] font-black text-slate-500">
              <tr>
                <th className="px-4 py-3">Personel</th>
                <th className="px-4 py-3">Satış</th>
                <th className="px-4 py-3 text-right">Ciro</th>
                <th className="px-4 py-3 text-right">Kâr</th>
                <th className="px-4 py-3 text-right">Prim</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">İşlem</th>
              </tr>
            </thead>

            <tbody>

              {sales.map(
                item => (

                  <tr
                    key={
                      item.id
                    }
                    className="border-t border-white/[.06] text-[8px]"
                  >

                    <td className="px-4 py-4 font-black">
                      {staffMap.get(
                        item.staff_id
                      ) ||
                        item.staff_id.slice(
                          0,
                          8
                        )}
                    </td>

                    <td className="px-4 py-4">
                      {item.reservation_id.slice(
                        0,
                        8
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {money(
                        item.revenue_amount
                      )}
                    </td>

                    <td className="px-4 py-4 text-right text-emerald-300">
                      {money(
                        item.gross_profit_amount
                      )}
                    </td>

                    <td className="px-4 py-4 text-right text-orange-300">
                      {money(
                        item.commission_amount
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {item.status}
                    </td>

                    <td className="px-4 py-4">

                      {item.status ===
                        "pending" && (

                        <button
                          disabled={
                            busy
                          }
                          onClick={
                            () =>
                              void run(
                                "approve_tour_staff_commission",
                                {
                                  p_staff_sale_id:
                                    item.id,
                                },
                                "Prim onaylandı."
                              )
                          }
                          className="rounded-lg bg-emerald-500 px-3 py-2 text-[7px] font-black text-black"
                        >
                          Onayla
                        </button>
                      )}


                      {item.status ===
                        "approved" && (

                        <button
                          disabled={
                            busy
                          }
                          onClick={
                            () => {

                              if (
                                !window.confirm(
                                  "Primi ödendi olarak işleyip gerçek gider kaydı oluşturulsun mu?"
                                )
                              ) {
                                return;
                              }

                              void run(
                                "pay_tour_staff_commission",
                                {
                                  p_staff_sale_id:
                                    item.id,

                                  p_note:
                                    "Tour OS personel satış primi",
                                },
                                "Prim ödendi ve gider kaydı oluşturuldu."
                              );
                            }
                          }
                          className="rounded-lg bg-orange-500 px-3 py-2 text-[7px] font-black"
                        >
                          Primi Öde
                        </button>
                      )}

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </section>


        <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f] p-5">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaChartLine className="text-blue-300" />
              Personel Performans Snapshot
            </div>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "generate_tour_staff_performance",
                    {
                      p_tour_id:
                        tourId,

                      p_departure_id:
                        null,
                    },
                    "Performans snapshot güncellendi."
                  )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-[8px] font-black"
            >
              <FaSyncAlt />
              Yenile
            </button>

          </div>


          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

            {snapshots.map(
              item => (

                <article
                  key={
                    item.id
                  }
                  className="rounded-xl border border-white/[.07] bg-[#030a11]/70 p-4"
                >
                  <div className="text-[8px] font-black">
                    {staffMap.get(
                      item.staff_id
                    ) ||
                      item.staff_id.slice(
                        0,
                        8
                      )}
                  </div>

                  <div className="mt-2 text-[7px] text-slate-500">
                    {item.sale_count} satış
                  </div>

                  <div className="mt-2 text-lg font-black">
                    {money(
                      item.revenue_amount
                    )}
                  </div>

                  <div className="mt-1 text-[7px] text-emerald-300">
                    Kâr{" "}
                    {money(
                      item.gross_profit_amount
                    )}
                  </div>

                  <div className="mt-1 text-[7px] text-orange-300">
                    Ödenen prim{" "}
                    {money(
                      item.paid_commission_amount
                    )}
                  </div>
                </article>
              )
            )}

          </div>

        </section>

      </div>

    </main>
  );
}
