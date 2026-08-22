"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  FaExclamationTriangle,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type AlertRefund = {
  id: string;
  tour_id: string;
  case_id: string;
  amount: number;
  reconciliation_status: string;
};


export default function RefundClosureAlarm() {

  const [
    rows,
    setRows,
  ] =
    useState<AlertRefund[]>(
      []
    );


  useEffect(() => {

    void (
      async () => {

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
          return;
        }


        const membership =
          await getCurrentMembership(
            authData.user.id
          );


        if (
          !membership
        ) {
          return;
        }


        const {
          data,
          error,
        } =
          await supabase
            .from(
              "tour_change_refunds"
            )
            .select(
              "id,tour_id,case_id,amount,reconciliation_status"
            )
            .eq(
              "company_id",
              membership.company_id
            )
            .eq(
              "status",
              "paid"
            )
            .neq(
              "reconciliation_status",
              "reconciled"
            )
            .order(
              "completed_at",
              {
                ascending:
                  true,
              }
            )
            .limit(
              10
            );


        if (
          !error
        ) {

          setRows(
            (
              data ??
              []
            ) as unknown as
              AlertRefund[]
          );
        }

      }
    )();

  }, []);


  if (
    rows.length ===
    0
  ) {
    return null;
  }


  const total =
    rows.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.amount ||
          0
        ),
      0
    );


  return (
    <section
      data-tour-os-refund-closure-alarm
      className="mt-5 rounded-[22px] border border-amber-500/25 bg-amber-500/[.055] p-4"
    >

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-start gap-3">

          <FaExclamationTriangle className="mt-0.5 text-amber-300" />

          <div>

            <div className="text-[9px] font-black text-amber-200">
              {rows.length} iade kapanış / mutabakat bekliyor
            </div>

            <div className="mt-1 text-[7px] font-bold text-amber-100/60">
              Toplam açık kapanış tutarı:{" "}
              {new Intl.NumberFormat(
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
                total
              )}
            </div>

          </div>

        </div>


        <div className="flex flex-wrap gap-2">

          {rows
            .slice(
              0,
              3
            )
            .map(
              item => (

                <Link
                  key={
                    item.id
                  }
                  href={`/dashboard/turlar/${item.tour_id}/degisiklikler/${item.case_id}/iade/kapanis`}
                  className="rounded-xl border border-amber-500/20 bg-[#07131f] px-3 py-2 text-[7px] font-black text-amber-300"
                >
                  {item.id.slice(
                    0,
                    8
                  )}
                  {" · "}
                  {item.reconciliation_status}
                </Link>
              )
            )}

        </div>

      </div>

    </section>
  );
}
