"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaChartPie,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaTimesCircle,
  FaWallet,
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

import TourModuleChrome from "../../../components/TourModuleChrome";


type Departure = {
  id: string;
  departure_date: string;
};


type Snapshot = {
  id: string;

  departure_id:
    string | null;

  reservation_count: number;

  passenger_count: number;

  sales_revenue: number;

  sales_declared_cost: number;

  sales_declared_gross_profit: number;

  operation_expense_total: number;

  operation_expense_paid: number;

  refund_paid_total: number;

  incident_actual_loss_total: number;

  approved_commission_total: number;

  paid_commission_total: number;

  outstanding_receivable: number;

  outstanding_payable: number;

  operational_net_result: number;

  margin_percent: number;

  finance_status: string;

  findings:
    Record<
      string,
      unknown
    >[];

  generated_at: string;
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


export default function TourFinanceManagementPage() {

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
    departures,
    setDepartures,
  ] =
    useState<Departure[]>(
      []
    );


  const [
    selectedDeparture,
    setSelectedDeparture,
  ] =
    useState("");


  const [
    snapshot,
    setSnapshot,
  ] =
    useState<Snapshot | null>(
      null
    );


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
          string,
        departureId?:
          string
      ) => {

        const departureResult =
          await supabase
            .from(
              "tour_departures"
            )
            .select(
              "id,departure_date"
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
              "departure_date",
              {
                ascending:
                  true,
              }
            );


        if (
          departureResult.error
        ) {
          throw departureResult.error;
        }


        setDepartures(
          (
            departureResult.data ??
            []
          ) as unknown as
            Departure[]
        );


        const query =
          supabase
            .from(
              "tour_finance_intelligence_snapshots"
            )
            .select("*")
            .eq(
              "company_id",
              currentCompanyId
            )
            .eq(
              "tour_id",
              tourId
            );


        const result =
          departureId
            ? await query
                .eq(
                  "departure_id",
                  departureId
                )
                .maybeSingle()
            : await query
                .is(
                  "departure_id",
                  null
                )
                .maybeSingle();


        if (
          result.error
        ) {
          throw result.error;
        }


        setSnapshot(
          result.data as
            Snapshot | null
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


  async function generate() {

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
          "generate_tour_finance_intelligence",
          {
            p_tour_id:
              tourId,

            p_departure_id:
              selectedDeparture ||
              null,
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId,
        selectedDeparture ||
          undefined
      );


      setNotice(
        "Finans snapshot güncellendi."
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
      <main data-tour-module-screen className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">

      <TourModuleChrome
        tourId={tourId}
        moduleKey="finance"
      />

        Finans yönetim merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="finance-management"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[26px] border border-emerald-500/15 bg-[#07131f] p-6 lg:p-8">

          <div className="flex items-center gap-3">

            <FaWallet className="text-2xl text-emerald-300" />

            <div>

              <div className="text-[8px] font-black text-emerald-300">
                AŞAMA 21
              </div>

              <h1 className="text-3xl font-black">
                Finans & Kârlılık Yönetim Merkezi
              </h1>

            </div>

          </div>


          <p className="mt-3 max-w-3xl text-[9px] leading-5 text-slate-400">
            Ciro, mevcut operasyon giderleri, personel primi, iade ve operasyon zararlarını aynı yönetim görünümünde toplar. Mevcut satış ve gider kayıtları kaynak sistem olarak korunur.
          </p>

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


        <section className="mt-5 rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

          <div className="flex flex-col gap-3 sm:flex-row">

            <select
              value={
                selectedDeparture
              }
              onChange={
                event =>
                  setSelectedDeparture(
                    event.target.value
                  )
              }
              className="min-h-11 flex-1 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[9px]"
            >

              <option value="">
                Tur Geneli
              </option>

              {departures.map(
                item => (

                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.departure_date}
                  </option>
                )
              )}

            </select>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void generate()
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-[8px] font-black text-black"
            >
              <FaSyncAlt />
              Finans Analizini Yenile
            </button>

          </div>

        </section>


        {snapshot ? (

          <>

            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

              {[
                [
                  "Ciro",
                  money(
                    snapshot.sales_revenue
                  ),
                ],
                [
                  "Operasyon Gideri",
                  money(
                    snapshot.operation_expense_total
                  ),
                ],
                [
                  "Net Sonuç",
                  money(
                    snapshot.operational_net_result
                  ),
                ],
                [
                  "Marj",
                  `%${Number(
                    snapshot.margin_percent ||
                    0
                  ).toFixed(1)}`,
                ],
                [
                  "Finans Durumu",
                  snapshot.finance_status,
                ],
              ].map(
                item => (

                  <article
                    key={
                      item[0]
                    }
                    className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
                  >

                    <div className="text-[7px] font-black text-slate-500">
                      {item[0]}
                    </div>

                    <div className="mt-3 text-xl font-black">
                      {item[1]}
                    </div>

                  </article>
                )
              )}

            </section>


            <section className="mt-5 grid gap-5 xl:grid-cols-2">

              <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

                <div className="flex items-center gap-2 text-sm font-black">
                  <FaChartPie className="text-emerald-300" />
                  Finans Dağılımı
                </div>


                <div className="mt-4 space-y-3 text-[8px]">

                  {[
                    [
                      "Rezervasyon",
                      snapshot.reservation_count,
                    ],
                    [
                      "Yolcu",
                      snapshot.passenger_count,
                    ],
                    [
                      "Satış maliyeti beyanı",
                      money(
                        snapshot.sales_declared_cost
                      ),
                    ],
                    [
                      "Satış brüt kâr beyanı",
                      money(
                        snapshot.sales_declared_gross_profit
                      ),
                    ],
                    [
                      "Ödenmiş gider",
                      money(
                        snapshot.operation_expense_paid
                      ),
                    ],
                    [
                      "Ödenmiş iade",
                      money(
                        snapshot.refund_paid_total
                      ),
                    ],
                    [
                      "Operasyon zararı",
                      money(
                        snapshot.incident_actual_loss_total
                      ),
                    ],
                    [
                      "Onaylı prim",
                      money(
                        snapshot.approved_commission_total
                      ),
                    ],
                    [
                      "Ödenmiş prim",
                      money(
                        snapshot.paid_commission_total
                      ),
                    ],
                  ].map(
                    item => (

                      <div
                        key={
                          String(
                            item[0]
                          )
                        }
                        className="flex items-center justify-between border-b border-white/[.05] pb-2"
                      >
                        <span className="text-slate-500">
                          {item[0]}
                        </span>

                        <span className="font-black">
                          {item[1]}
                        </span>
                      </div>
                    )
                  )}

                </div>

              </article>


              <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

                <div className="flex items-center gap-2 text-sm font-black">
                  <FaExclamationTriangle className="text-amber-300" />
                  Finans Riskleri
                </div>


                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  <div className="rounded-xl border border-amber-500/15 bg-amber-500/[.04] p-4">

                    <div className="text-[7px] text-slate-500">
                      Tahsil Edilecek
                    </div>

                    <div className="mt-2 text-lg font-black text-amber-300">
                      {money(
                        snapshot.outstanding_receivable
                      )}
                    </div>

                  </div>


                  <div className="rounded-xl border border-red-500/15 bg-red-500/[.04] p-4">

                    <div className="text-[7px] text-slate-500">
                      Ödenecek
                    </div>

                    <div className="mt-2 text-lg font-black text-red-300">
                      {money(
                        snapshot.outstanding_payable
                      )}
                    </div>

                  </div>

                </div>


                <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-xl bg-[#030a11] p-4 text-[8px] leading-5 text-slate-400">
                  {JSON.stringify(
                    snapshot.findings,
                    null,
                    2
                  )}
                </pre>

              </article>

            </section>


            <div className="mt-5 flex flex-wrap gap-3">

              <Link
                href={`/dashboard/turlar/${tourId}/finans`}
                className="rounded-xl border border-white/10 px-4 py-3 text-[8px] font-black text-slate-300"
              >
                Detay Gider / Finans Ekranı
              </Link>


              <Link
                href={`/dashboard/turlar/${tourId}/performans`}
                className="rounded-xl border border-blue-500/20 bg-blue-500/[.04] px-4 py-3 text-[8px] font-black text-blue-300"
              >
                Personel Performansı
              </Link>

            </div>

          </>

        ) : (

          <section className="mt-5 rounded-[22px] border border-dashed border-white/10 py-16 text-center text-[9px] text-slate-500">
            Finans snapshot henüz oluşturulmadı.
          </section>
        )}

      </div>

    </main>
  );
}


<style jsx global>{`
  [data-tour-module-screen] {
    min-height: 100vh;
  }

  [data-tour-module-screen] table {
    border-collapse: separate;
    border-spacing: 0;
  }

  [data-tour-module-screen] thead {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  [data-tour-module-screen] tbody tr {
    transition:
      background-color .16s ease,
      border-color .16s ease;
  }

  [data-tour-module-screen] tbody tr:hover {
    background: rgba(255,255,255,.024);
  }

  [data-tour-module-screen] input,
  [data-tour-module-screen] select,
  [data-tour-module-screen] textarea {
    outline: none;
  }

  [data-tour-module-screen] input:focus,
  [data-tour-module-screen] select:focus,
  [data-tour-module-screen] textarea:focus {
    border-color: rgba(249,115,22,.42);
    box-shadow:
      0 0 0 3px rgba(249,115,22,.06);
  }

  [data-tour-module-screen] button,
  [data-tour-module-screen] a {
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 768px) {
    [data-tour-module-screen] {
      padding-bottom: 84px;
    }

    [data-tour-module-chrome] {
      border-radius: 22px;
    }
  }
`}</style>

// TOUR_MODULE_PRO_V3_FINANCE
