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
  FaBolt,
  FaBuilding,
  FaCheckCircle,
  FaGift,
  FaGlobe,
  FaLayerGroup,
  FaSearch,
  FaTags,
  FaTimesCircle,
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


type Product = {
  id: string;
  title: string;
  product_type: string;
  sale_price: number;
  currency: string;
  available_quantity: number | null;
};


type Reservation = {
  id: string;
  reservation_code: string | null;
  full_name: string;
  departure_id: string | null;
};


type Discovery = {
  destination: string;
  currency: string;
  minimum_price: number;
  maximum_price: number;
  product_count: number;
  available_product_count: number;
  product_types: string[];
};


type LastMinuteOffer = {
  id: string;
  title: string;
  product_id: string | null;
  original_price: number;
  offer_price: number;
  currency: string;
  available_quantity: number | null;
  expires_at: string;
  status: string;
};


type GroupRequest = {
  id: string;
  request_number: string;
  group_name: string;
  contact_name: string;
  passenger_count: number;
  target_budget: number | null;
  status: string;
};


type PuanAccount = {
  id: string;
  subject_type: string;
  subject_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  status: string;
};


type B2B = {
  id: string;
  name: string;
  account_code: string;
  commission_percent: number;
  discount_percent: number;
  credit_limit: number;
  status: string;
};


type SaaS = {
  id: string;
  plan_key: string;
  status: string;
  seat_limit: number;
  monthly_price: number;
  billing_source: string;
};


type WhiteLabel = {
  id: string;
  brand_name: string | null;
  custom_domain: string | null;
  domain_verified_at: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  hide_turobus_branding: boolean;
  status: string;
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


export default function GrowthDistributionPage() {

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
    products,
    setProducts,
  ] =
    useState<Product[]>(
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
    discoveries,
    setDiscoveries,
  ] =
    useState<Discovery[]>(
      []
    );


  const [
    offers,
    setOffers,
  ] =
    useState<LastMinuteOffer[]>(
      []
    );


  const [
    groups,
    setGroups,
  ] =
    useState<GroupRequest[]>(
      []
    );


  const [
    puanAccounts,
    setPuanAccounts,
  ] =
    useState<PuanAccount[]>(
      []
    );


  const [
    b2bAccounts,
    setB2bAccounts,
  ] =
    useState<B2B[]>(
      []
    );


  const [
    saas,
    setSaas,
  ] =
    useState<SaaS | null>(
      null
    );


  const [
    whiteLabel,
    setWhiteLabel,
  ] =
    useState<WhiteLabel | null>(
      null
    );


  const [
    budget,
    setBudget,
  ] =
    useState("");


  const [
    discoveryType,
    setDiscoveryType,
  ] =
    useState("");


  const [
    discoveryDestination,
    setDiscoveryDestination,
  ] =
    useState("");


  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState("");


  const [
    lastMinutePrice,
    setLastMinutePrice,
  ] =
    useState("");


  const [
    expiresAt,
    setExpiresAt,
  ] =
    useState("");


  const [
    groupName,
    setGroupName,
  ] =
    useState("");


  const [
    groupContact,
    setGroupContact,
  ] =
    useState("");


  const [
    groupPhone,
    setGroupPhone,
  ] =
    useState("");


  const [
    passengerCount,
    setPassengerCount,
  ] =
    useState("10");


  const [
    selectedReservation,
    setSelectedReservation,
  ] =
    useState("");


  const [
    points,
    setPoints,
  ] =
    useState("100");


  const [
    b2bName,
    setB2bName,
  ] =
    useState("");


  const [
    b2bCode,
    setB2bCode,
  ] =
    useState("");


  const [
    b2bDiscount,
    setB2bDiscount,
  ] =
    useState("0");


  const [
    b2bCommission,
    setB2bCommission,
  ] =
    useState("0");


  const [
    saasPlan,
    setSaasPlan,
  ] =
    useState("professional");


  const [
    seatLimit,
    setSeatLimit,
  ] =
    useState("5");


  const [
    monthlyPrice,
    setMonthlyPrice,
  ] =
    useState("0");


  const [
    brandName,
    setBrandName,
  ] =
    useState("");


  const [
    customDomain,
    setCustomDomain,
  ] =
    useState("");


  const [
    primaryColor,
    setPrimaryColor,
  ] =
    useState("");


  const [
    accentColor,
    setAccentColor,
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
          productResult,
          reservationResult,
          offerResult,
          groupResult,
          puanResult,
          b2bResult,
          saasResult,
          whiteLabelResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_product_catalog"
              )
              .select(
                "id,title,product_type,sale_price,currency,available_quantity"
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
                "id,reservation_code,full_name,departure_id"
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
                "tour_last_minute_offers"
              )
              .select(
                "id,title,product_id,original_price,offer_price,currency,available_quantity,expires_at,status"
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
                "tour_group_requests"
              )
              .select(
                "id,request_number,group_name,contact_name,passenger_count,target_budget,status"
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
                "turopuan_accounts"
              )
              .select(
                "id,subject_type,subject_id,balance,lifetime_earned,lifetime_spent,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "subject_type",
                "reservation"
              ),

            supabase
              .from(
                "tour_b2b_accounts"
              )
              .select(
                "id,name,account_code,commission_percent,discount_percent,credit_limit,status"
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
                "tour_saas_subscriptions"
              )
              .select(
                "id,plan_key,status,seat_limit,monthly_price,billing_source"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .maybeSingle(),

            supabase
              .from(
                "tour_white_label_settings"
              )
              .select(
                "id,brand_name,custom_domain,domain_verified_at,logo_url,primary_color,accent_color,hide_turobus_branding,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .maybeSingle(),
          ]);


        const firstError =
          [
            productResult.error,
            reservationResult.error,
            offerResult.error,
            groupResult.error,
            puanResult.error,
            b2bResult.error,
            saasResult.error,
            whiteLabelResult.error,
          ].find(Boolean);


        if (
          firstError
        ) {
          throw firstError;
        }


        setProducts(
          (
            productResult.data ??
            []
          ) as unknown as
            Product[]
        );


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );


        setOffers(
          (
            offerResult.data ??
            []
          ) as unknown as
            LastMinuteOffer[]
        );


        setGroups(
          (
            groupResult.data ??
            []
          ) as unknown as
            GroupRequest[]
        );


        setPuanAccounts(
          (
            puanResult.data ??
            []
          ) as unknown as
            PuanAccount[]
        );


        setB2bAccounts(
          (
            b2bResult.data ??
            []
          ) as unknown as
            B2B[]
        );


        setSaas(
          saasResult.data as
            SaaS | null
        );


        setWhiteLabel(
          whiteLabelResult.data as
            WhiteLabel | null
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


  const puanByReservation =
    useMemo(
      () =>
        new Map(
          puanAccounts.map(
            account => [
              account.subject_id,
              account,
            ]
          )
        ),
      [
        puanAccounts,
      ]
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
      string,
    reload:
      boolean =
        true
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


      if (
        reload
      ) {
        await load(
          companyId
        );
      }


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


  async function discover() {

    setBusy(true);
    setError("");
    setNotice("");


    try {

      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          "discover_tour_destinations",
          {
            p_tour_id:
              tourId,

            p_budget_max:
              budget
                ? Number(
                    budget
                  )
                : null,

            p_product_type:
              discoveryType ||
              null,

            p_destination_query:
              discoveryDestination ||
              null,

            p_availability_only:
              true,
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      setDiscoveries(
        (
          data ??
          []
        ) as unknown as
          Discovery[]
      );


      setNotice(
        "Gerçek ürün kataloğuna göre destinasyon sonuçları getirildi."
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


  async function ensureAndAwardPoints() {

    if (
      !selectedReservation
    ) {
      return;
    }


    setBusy(true);
    setError("");
    setNotice("");


    try {

      const {
        data:
          accountId,
        error:
          accountError,
      } =
        await supabase.rpc(
          "ensure_turopuan_account",
          {
            p_company_id:
              companyId,

            p_subject_type:
              "reservation",

            p_subject_id:
              selectedReservation,
          }
        );


      if (
        accountError
      ) {
        throw accountError;
      }


      const {
        error:
          awardError,
      } =
        await supabase.rpc(
          "award_turopuan",
          {
            p_account_id:
              accountId,

            p_points:
              Math.max(
                1,
                Math.floor(
                  Number(
                    points
                  ) ||
                  0
                )
              ),

            p_description:
              "Tour OS sadakat puanı",

            p_reference_type:
              "reservation",

            p_reference_id:
              selectedReservation,

            p_idempotency_key:
              `manual-award:${selectedReservation}:${Date.now()}`,
          }
        );


      if (
        awardError
      ) {
        throw awardError;
      }


      await load(
        companyId
      );


      setNotice(
        "TuroPuan başarıyla işlendi."
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
        Büyüme ve dağıtım merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="growth-distribution"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1800px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-fuchsia-500/15 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,.12),transparent_35%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="text-[8px] font-black tracking-[.16em] text-fuchsia-300">
            AŞAMA 30–36
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Büyüme & Dağıtım Platformu
          </h1>

          <p className="mt-3 max-w-4xl text-[9px] leading-5 text-slate-400">
            Destinasyon keşfi, son dakika satışı, grup talepleri, TuroPuan, B2B kanal yönetimi, SaaS yetkilendirmesi ve white-label markalama.
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


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">

          {[
            [
              "Ürün",
              String(
                products.length
              ),
            ],
            [
              "Son Dakika",
              String(
                offers.filter(
                  x =>
                    x.status ===
                    "active"
                ).length
              ),
            ],
            [
              "Grup",
              String(
                groups.length
              ),
            ],
            [
              "TuroPuan",
              String(
                puanAccounts.reduce(
                  (
                    total,
                    x
                  ) =>
                    total +
                    Number(
                      x.balance ||
                      0
                    ),
                  0
                )
              ),
            ],
            [
              "B2B",
              String(
                b2bAccounts.length
              ),
            ],
            [
              "SaaS",
              saas?.status ??
              "Yok",
            ],
            [
              "White-label",
              whiteLabel?.status ??
              "Yok",
            ],
          ].map(
            item => (

              <article
                key={
                  item[0]
                }
                className="rounded-[20px] border border-white/10 bg-[#07131f] p-4"
              >
                <div className="text-[7px] font-black text-slate-500">
                  {item[0]}
                </div>

                <div className="mt-2 text-xl font-black">
                  {item[1]}
                </div>
              </article>
            )
          )}

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaSearch className="text-cyan-300" />
              30 — Nereye Gidebilirim?
            </div>


            <div className="mt-4 grid gap-3 sm:grid-cols-3">

              <input
                type="number"
                min="0"
                value={
                  budget
                }
                onChange={
                  event =>
                    setBudget(
                      event.target.value
                    )
                }
                placeholder="Maksimum bütçe"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <select
                value={
                  discoveryType
                }
                onChange={
                  event =>
                    setDiscoveryType(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              >
                <option value="">
                  Tüm ürünler
                </option>
                <option value="hotel">
                  Otel
                </option>
                <option value="transfer">
                  Transfer
                </option>
                <option value="activity">
                  Aktivite
                </option>
                <option value="tour">
                  Tur
                </option>
                <option value="car_rental">
                  Araç
                </option>
              </select>


              <input
                value={
                  discoveryDestination
                }
                onChange={
                  event =>
                    setDiscoveryDestination(
                      event.target.value
                    )
                }
                placeholder="Destinasyon"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void discover()
              }
              className="mt-3 min-h-11 rounded-xl bg-cyan-500 px-4 text-[8px] font-black text-black"
            >
              Gerçek Katalogda Ara
            </button>


            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              {discoveries.map(
                (
                  item,
                  index
                ) => (

                  <div
                    key={
                      `${item.destination}-${item.currency}-${index}`
                    }
                    className="rounded-xl border border-white/[.07] bg-[#030a11]/70 p-4"
                  >
                    <div className="text-[9px] font-black">
                      {item.destination}
                    </div>

                    <div className="mt-2 text-lg font-black text-cyan-300">
                      {money(
                        item.minimum_price
                      )}
                    </div>

                    <div className="mt-1 text-[7px] text-slate-500">
                      {item.product_count} ürün · {item.available_product_count} müsait sinyal
                    </div>
                  </div>
                )
              )}

            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaBolt className="text-amber-300" />
              31 — Son Dakika
            </div>


            <select
              value={
                selectedProduct
              }
              onChange={
                event =>
                  setSelectedProduct(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Ürün seç
              </option>

              {products.map(
                product => (

                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.title}
                    {" · "}
                    {money(
                      product.sale_price
                    )}
                  </option>
                )
              )}
            </select>


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                type="number"
                min="0"
                value={
                  lastMinutePrice
                }
                onChange={
                  event =>
                    setLastMinutePrice(
                      event.target.value
                    )
                }
                placeholder="Son dakika fiyatı"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="datetime-local"
                value={
                  expiresAt
                }
                onChange={
                  event =>
                    setExpiresAt(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy ||
                !selectedProduct ||
                !lastMinutePrice ||
                !expiresAt
              }
              onClick={
                () =>
                  void run(
                    "create_tour_last_minute_offer",
                    {
                      p_product_id:
                        selectedProduct,

                      p_title:
                        `${products.find(
                          x =>
                            x.id ===
                            selectedProduct
                        )?.title ?? "Ürün"} Son Dakika`,

                      p_offer_price:
                        Number(
                          lastMinutePrice
                        ),

                      p_expires_at:
                        new Date(
                          expiresAt
                        ).toISOString(),

                      p_available_quantity:
                        null,
                    },
                    "Son dakika fırsatı oluşturuldu."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-amber-500 px-4 text-[8px] font-black text-black"
            >
              Son Dakika Yayınla
            </button>


            <div className="mt-4 space-y-2">

              {offers
                .slice(
                  0,
                  5
                )
                .map(
                  offer => (

                    <div
                      key={
                        offer.id
                      }
                      className="rounded-xl border border-white/[.06] bg-[#030a11]/70 p-3"
                    >
                      <div className="text-[8px] font-black">
                        {offer.title}
                      </div>

                      <div className="mt-1 text-[8px] text-amber-300">
                        {money(
                          offer.offer_price
                        )}
                        {" · "}
                        {offer.status}
                      </div>
                    </div>
                  )
                )}

            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaUsers className="text-blue-300" />
              32 — Grup Satışı
            </div>


            <input
              value={
                groupName
              }
              onChange={
                event =>
                  setGroupName(
                    event.target.value
                  )
              }
              placeholder="Grup adı"
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              value={
                groupContact
              }
              onChange={
                event =>
                  setGroupContact(
                    event.target.value
                  )
              }
              placeholder="Yetkili kişi"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                value={
                  groupPhone
                }
                onChange={
                  event =>
                    setGroupPhone(
                      event.target.value
                    )
                }
                placeholder="Telefon"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="number"
                min="2"
                value={
                  passengerCount
                }
                onChange={
                  event =>
                    setPassengerCount(
                      event.target.value
                    )
                }
                placeholder="Kişi"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy ||
                !groupName ||
                !groupContact
              }
              onClick={
                () =>
                  void run(
                    "create_tour_group_request",
                    {
                      p_tour_id:
                        tourId,

                      p_departure_id:
                        null,

                      p_group_name:
                        groupName,

                      p_contact_name:
                        groupContact,

                      p_contact_phone:
                        groupPhone ||
                        null,

                      p_contact_email:
                        null,

                      p_passenger_count:
                        Number(
                          passengerCount
                        ) ||
                        2,

                      p_target_budget:
                        null,

                      p_requested_services:
                        [],

                      p_notes:
                        "Tour OS grup talebi",
                    },
                    "Grup talebi oluşturuldu."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-blue-500 px-4 text-[8px] font-black"
            >
              Grup Talebi Oluştur
            </button>


            <div className="mt-4 space-y-2">

              {groups
                .slice(
                  0,
                  5
                )
                .map(
                  group => (

                    <div
                      key={
                        group.id
                      }
                      className="rounded-xl border border-white/[.06] bg-[#030a11]/70 p-3"
                    >
                      <div className="text-[8px] font-black">
                        {group.request_number}
                        {" · "}
                        {group.group_name}
                      </div>

                      <div className="mt-1 text-[7px] text-slate-500">
                        {group.passenger_count} kişi · {group.status}
                      </div>
                    </div>
                  )
                )}

            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaGift className="text-emerald-300" />
              33 — TuroPuan
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
                reservation => {

                  const account =
                    puanByReservation.get(
                      reservation.id
                    );


                  return (

                    <option
                      key={
                        reservation.id
                      }
                      value={
                        reservation.id
                      }
                    >
                      {reservation.reservation_code ||
                        reservation.id.slice(
                          0,
                          8
                        )}
                      {" · "}
                      {reservation.full_name}
                      {" · "}
                      {account?.balance ??
                        0}
                      {" puan"}
                    </option>
                  );
                }
              )}

            </select>


            <input
              type="number"
              min="1"
              value={
                points
              }
              onChange={
                event =>
                  setPoints(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <button
              disabled={
                busy ||
                !selectedReservation
              }
              onClick={
                () =>
                  void ensureAndAwardPoints()
              }
              className="mt-3 min-h-11 rounded-xl bg-emerald-500 px-4 text-[8px] font-black text-black"
            >
              TuroPuan Kazandır
            </button>


            <div className="mt-4 text-[8px] leading-5 text-slate-500">
              TuroPuan hareketleri immutable ledger’da tutulur. Puan harcama işlemi finans yetkisi gerektirir ve otomatik para iadesi/ödeme oluşturmaz.
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-3">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaBuilding className="text-indigo-300" />
              34 — B2B
            </div>


            <input
              value={
                b2bName
              }
              onChange={
                event =>
                  setB2bName(
                    event.target.value
                  )
              }
              placeholder="Acente / şirket adı"
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              value={
                b2bCode
              }
              onChange={
                event =>
                  setB2bCode(
                    event.target.value
                  )
              }
              placeholder="B2B kodu"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                type="number"
                min="0"
                max="100"
                value={
                  b2bDiscount
                }
                onChange={
                  event =>
                    setB2bDiscount(
                      event.target.value
                    )
                }
                placeholder="İskonto %"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="number"
                min="0"
                max="100"
                value={
                  b2bCommission
                }
                onChange={
                  event =>
                    setB2bCommission(
                      event.target.value
                    )
                }
                placeholder="Komisyon %"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy ||
                !b2bName ||
                !b2bCode
              }
              onClick={
                () =>
                  void run(
                    "create_tour_b2b_account",
                    {
                      p_company_id:
                        companyId,

                      p_name:
                        b2bName,

                      p_account_code:
                        b2bCode,

                      p_contact_name:
                        null,

                      p_contact_phone:
                        null,

                      p_contact_email:
                        null,

                      p_commission_percent:
                        Number(
                          b2bCommission
                        ) ||
                        0,

                      p_discount_percent:
                        Number(
                          b2bDiscount
                        ) ||
                        0,

                      p_credit_limit:
                        0,
                    },
                    "B2B hesabı oluşturuldu."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-indigo-500 px-4 text-[8px] font-black"
            >
              B2B Hesabı Aç
            </button>


            <div className="mt-4 text-[7px] text-slate-500">
              Aktif B2B hesap: {b2bAccounts.filter(
                x =>
                  x.status ===
                  "active"
              ).length}
            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaLayerGroup className="text-fuchsia-300" />
              35 — SaaS
            </div>


            <input
              value={
                saasPlan
              }
              onChange={
                event =>
                  setSaasPlan(
                    event.target.value
                  )
              }
              placeholder="Plan"
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                type="number"
                min="1"
                value={
                  seatLimit
                }
                onChange={
                  event =>
                    setSeatLimit(
                      event.target.value
                    )
                }
                placeholder="Kullanıcı"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="number"
                min="0"
                value={
                  monthlyPrice
                }
                onChange={
                  event =>
                    setMonthlyPrice(
                      event.target.value
                    )
                }
                placeholder="Aylık fiyat"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "configure_tour_saas_subscription",
                    {
                      p_company_id:
                        companyId,

                      p_plan_key:
                        saasPlan,

                      p_status:
                        "trial",

                      p_seat_limit:
                        Number(
                          seatLimit
                        ) ||
                        1,

                      p_monthly_price:
                        Number(
                          monthlyPrice
                        ) ||
                        0,

                      p_module_flags:
                        {
                          tour_os:
                            true,
                          b2b:
                            true,
                          white_label:
                            true,
                        },
                    },
                    "SaaS plan kaydı güncellendi."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-fuchsia-500 px-4 text-[8px] font-black"
            >
              SaaS Planını Kaydet
            </button>


            <div className="mt-4 rounded-xl border border-fuchsia-500/10 bg-[#030a11]/70 p-3 text-[8px]">

              <div>
                Plan:{" "}
                <span className="font-black">
                  {saas?.plan_key ||
                    "—"}
                </span>
              </div>

              <div className="mt-1 text-slate-500">
                Durum: {saas?.status || "—"}
                {" · "}
                Billing: {saas?.billing_source || "—"}
              </div>

            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaGlobe className="text-orange-300" />
              36 — White-label
            </div>


            <input
              value={
                brandName
              }
              onChange={
                event =>
                  setBrandName(
                    event.target.value
                  )
              }
              placeholder="Marka adı"
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              value={
                customDomain
              }
              onChange={
                event =>
                  setCustomDomain(
                    event.target.value
                  )
              }
              placeholder="ornek.com"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                value={
                  primaryColor
                }
                onChange={
                  event =>
                    setPrimaryColor(
                      event.target.value
                    )
                }
                placeholder="#000000"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                value={
                  accentColor
                }
                onChange={
                  event =>
                    setAccentColor(
                      event.target.value
                    )
                }
                placeholder="#F97316"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "configure_tour_white_label",
                    {
                      p_company_id:
                        companyId,

                      p_brand_name:
                        brandName ||
                        null,

                      p_custom_domain:
                        customDomain ||
                        null,

                      p_logo_url:
                        null,

                      p_primary_color:
                        primaryColor ||
                        null,

                      p_accent_color:
                        accentColor ||
                        null,

                      p_support_email:
                        null,

                      p_support_phone:
                        null,

                      p_hide_turobus_branding:
                        false,
                    },
                    "White-label ayarları kaydedildi."
                  )
              }
              className="mt-3 min-h-11 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
            >
              Markayı Kaydet
            </button>


            <div className="mt-4 rounded-xl border border-orange-500/10 bg-[#030a11]/70 p-3 text-[8px]">

              <div className="font-black">
                {whiteLabel?.brand_name ||
                  "Henüz marka yok"}
              </div>

              <div className="mt-1 text-slate-500">
                Domain: {whiteLabel?.custom_domain || "—"}
              </div>

              <div className="mt-1 text-slate-500">
                Domain doğrulandı:{" "}
                {whiteLabel?.domain_verified_at
                  ? "Evet"
                  : "Hayır"}
              </div>

            </div>

          </article>

        </section>


        <section className="mt-5 rounded-[22px] border border-white/10 bg-[#07131f] p-5">

          <div className="flex items-center gap-2 text-sm font-black">
            <FaTags className="text-slate-300" />
            Paket D Güvenlik Durumu
          </div>


          <div className="mt-4 grid gap-3 md:grid-cols-3">

            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[.03] p-4 text-[8px] text-emerald-300">
              Nereye Gidebilirim sonuçları yalnız gerçek ticari katalogdan gelir.
            </div>

            <div className="rounded-xl border border-amber-500/10 bg-amber-500/[.03] p-4 text-[8px] text-amber-300">
              SaaS billing_source=manual olduğunda ödeme yapılmış kabul edilmez.
            </div>

            <div className="rounded-xl border border-orange-500/10 bg-orange-500/[.03] p-4 text-[8px] text-orange-300">
              White-label domain değiştiğinde doğrulama otomatik olarak sıfırlanır.
            </div>

          </div>

        </section>

      </div>

    </main>
  );
}
