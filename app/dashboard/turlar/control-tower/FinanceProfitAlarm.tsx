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


type Row = {
  id: string;
  tour_id: string;
  finance_status: string;
  operational_net_result: number;
  outstanding_receivable: number;
  outstanding_payable: number;
};


export default function FinanceProfitAlarm() {

  const [
    rows,
    setRows,
  ] =
    useState<Row[]>(
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
              "tour_finance_intelligence_snapshots"
            )
            .select(
              "id,tour_id,finance_status,operational_net_result,outstanding_receivable,outstanding_payable"
            )
            .eq(
              "company_id",
              membership.company_id
            )
            .is(
              "departure_id",
              null
            )
            .in(
              "finance_status",
              [
                "watch",
                "loss",
                "critical",
              ]
            )
            .limit(10);


        if (
          !error
        ) {

          setRows(
            (
              data ??
              []
            ) as unknown as
              Row[]
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


  return (
    <section
      data-tour-os-finance-profit-alarm
      className="mt-5 rounded-[22px] border border-amber-500/20 bg-amber-500/[.045] p-4"
    >

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

        <div className="flex items-start gap-3">

          <FaExclamationTriangle className="mt-0.5 text-amber-300" />

          <div>

            <div className="text-[9px] font-black text-amber-200">
              {rows.length} tur finans incelemesi istiyor
            </div>

            <div className="mt-1 text-[7px] text-amber-100/60">
              Negatif sonuç, düşük marj veya açık tahsilat/borç kontrolü.
            </div>

          </div>

        </div>


        <div className="flex flex-wrap gap-2">

          {rows
            .slice(
              0,
              4
            )
            .map(
              item => (

                <Link
                  key={
                    item.id
                  }
                  href={`/dashboard/turlar/${item.tour_id}/finans-yonetim`}
                  className="rounded-xl border border-amber-500/20 bg-[#07131f] px-3 py-2 text-[7px] font-black text-amber-300"
                >
                  {item.finance_status}
                  {" · "}
                  {Number(
                    item.operational_net_result
                  ).toLocaleString(
                    "tr-TR"
                  )}
                  {" TL"}
                </Link>
              )
            )}

        </div>

      </div>

    </section>
  );
}
