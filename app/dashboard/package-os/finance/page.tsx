"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Booking = {
  id: string;
  total_amount: number | null;
  paid_amount: number | null;
  currency: string | null;
  created_at: string;
};


type Payable = {
  id: string;
  amount: number;
  paid_amount: number;
  status: string;
  currency: string;
  created_at: string;
};


type ExtraOrder = {
  id: string;
  total_amount: number | null;
  status: string;
  created_at: string;
};


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(
    value
  );
}


export default function PackageFinancePage() {

  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>([]);


  const [
    payables,
    setPayables,
  ] =
    useState<Payable[]>([]);


  const [
    extras,
    setExtras,
  ] =
    useState<ExtraOrder[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const loadData =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setErrorMessage(
          ""
        );


        const {
          data:
            authData,
          error:
            authError,
        } =
          await supabase.auth
            .getUser();


        if (
          authError ||
          !authData.user
        ) {

          setErrorMessage(
            "Oturum bulunamadı."
          );

          setLoading(
            false
          );

          return;
        }


        const membership =
          await getCurrentMembership(
            authData.user.id
          );


        if (!membership) {

          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );

          setLoading(
            false
          );

          return;
        }


        const companyId =
          membership.company_id;


        const [
          bookingResult,
          payableResult,
          extraResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "package_bookings"
              )
              .select(`
                id,
                total_amount,
                paid_amount,
                currency,
                created_at
              `)
              .eq(
                "company_id",
                companyId
              ),

            supabase
              .from(
                "package_supplier_payables"
              )
              .select(`
                id,
                amount,
                paid_amount,
                status,
                currency,
                created_at
              `)
              .eq(
                "company_id",
                companyId
              ),

            supabase
              .from(
                "package_extra_orders"
              )
              .select(`
                id,
                total_amount,
                status,
                created_at
              `)
              .eq(
                "company_id",
                companyId
              ),

          ]);


        if (
          bookingResult.error
        ) {

          setErrorMessage(
            bookingResult.error.message
          );

          setLoading(
            false
          );

          return;
        }


        if (
          payableResult.error
        ) {

          setErrorMessage(
            payableResult.error.message
          );

          setLoading(
            false
          );

          return;
        }


        if (
          extraResult.error
        ) {

          setErrorMessage(
            extraResult.error.message
          );

          setLoading(
            false
          );

          return;
        }


        setBookings(
          (
            bookingResult.data ??
            []
          ) as Booking[]
        );


        setPayables(
          (
            payableResult.data ??
            []
          ) as Payable[]
        );


        setExtras(
          (
            extraResult.data ??
            []
          ) as ExtraOrder[]
        );


        setLoading(
          false
        );

      },
      []
    );


  useEffect(
    () => {

      void loadData();

    },
    [
      loadData,
    ]
  );


  const stats =
    useMemo(
      () => {

        const packageSales =
          bookings.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.total_amount ??
                0
              ),
            0
          );


        const packageCollected =
          bookings.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.paid_amount ??
                0
              ),
            0
          );


        const extraSales =
          extras
            .filter(
              row =>
                row.status ===
                "paid"
            )
            .reduce(
              (
                total,
                row
              ) =>
                total +
                Number(
                  row.total_amount ??
                  0
                ),
              0
            );


        const supplierCost =
          payables.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.amount ??
                0
              ),
            0
          );


        const supplierPaid =
          payables.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.paid_amount ??
                0
              ),
            0
          );


        const receivable =
          Math.max(
            packageSales -
            packageCollected,
            0
          );


        const supplierBalance =
          Math.max(
            supplierCost -
            supplierPaid,
            0
          );


        const totalRevenue =
          packageSales +
          extraSales;


        const grossProfit =
          totalRevenue -
          supplierCost;


        return {
          packageSales,
          packageCollected,
          extraSales,
          supplierCost,
          supplierPaid,
          receivable,
          supplierBalance,
          totalRevenue,
          grossProfit,
        };

      },
      [
        bookings,
        payables,
        extras,
      ]
    );


  if (loading) {

    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-950 text-white">
        Finans merkezi hazırlanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
                TUROBUS PACKAGE OS
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Finans Merkezi
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Paket satışları, tahsilatlar,
                ekstra gelirler ve tedarikçi
                borçlarını tek ekrandan takip edin.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  void loadData()
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
              >
                Yenile
              </button>

              <Link
                href="/dashboard/package-os/payments"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300"
              >
                Tahsilatlar
              </Link>

              <Link
                href="/dashboard/package-os/payables"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-black text-amber-300"
              >
                Tedarikçi Borçları
              </Link>

              <Link
                href="/dashboard/package-os"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Package OS
              </Link>

            </div>

          </div>

        </section>


        {
          errorMessage &&
          (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )
        }


        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <Card
            title="Toplam Ciro"
            value={
              money(
                stats.totalRevenue
              )
            }
          />

          <Card
            title="Paket Satışı"
            value={
              money(
                stats.packageSales
              )
            }
          />

          <Card
            title="Ekstra Satış"
            value={
              money(
                stats.extraSales
              )
            }
          />

          <Card
            title="Tahsil Edilen"
            value={
              money(
                stats.packageCollected
              )
            }
          />

          <Card
            title="Brüt Kâr"
            value={
              money(
                stats.grossProfit
              )
            }
          />

        </section>


        <section className="mt-6 grid gap-4 md:grid-cols-3">

          <Card
            title="Müşteriden Alacak"
            value={
              money(
                stats.receivable
              )
            }
          />

          <Card
            title="Tedarikçi Toplam Maliyet"
            value={
              money(
                stats.supplierCost
              )
            }
          />

          <Card
            title="Tedarikçiye Kalan Borç"
            value={
              money(
                stats.supplierBalance
              )
            }
          />

        </section>


        <section className="mt-6 grid gap-5 lg:grid-cols-2">

          <div className="rounded-[26px] border border-white/10 bg-slate-900 p-6">

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              TAHSİLAT DURUMU
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-300">
              {
                money(
                  stats.packageCollected
                )
              }
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Toplam paket satışının tahsil edilen kısmı.
            </p>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950">

              <div
                className="h-full bg-emerald-500"
                style={{
                  width:
                    `${
                      stats.packageSales >
                      0
                        ? Math.min(
                            (
                              stats.packageCollected /
                              stats.packageSales
                            ) *
                              100,
                            100
                          )
                        : 0
                    }%`,
                }}
              />

            </div>

          </div>


          <div className="rounded-[26px] border border-white/10 bg-slate-900 p-6">

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              TEDARİKÇİ ÖDEME DURUMU
            </p>

            <p className="mt-3 text-3xl font-black text-amber-300">
              {
                money(
                  stats.supplierPaid
                )
              }
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Toplam tedarikçi maliyetinin ödenen kısmı.
            </p>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950">

              <div
                className="h-full bg-amber-500"
                style={{
                  width:
                    `${
                      stats.supplierCost >
                      0
                        ? Math.min(
                            (
                              stats.supplierPaid /
                              stats.supplierCost
                            ) *
                              100,
                            100
                          )
                        : 0
                    }%`,
                }}
              />

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}


function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {

  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-900 p-5">

      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-black">
        {value}
      </p>

    </div>
  );
}
