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


type IncidentAlarm = {
  id: string;

  tour_id: string;

  incident_number: string;

  title: string;

  severity: string;

  status: string;

  sla_due_at:
    string | null;

  estimated_loss_amount: number;
};


export default function IncidentCriticalAlarm() {

  const [
    rows,
    setRows,
  ] =
    useState<IncidentAlarm[]>(
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
              "tour_operation_incidents"
            )
            .select(
              "id,tour_id,incident_number,title,severity,status,sla_due_at,estimated_loss_amount"
            )
            .eq(
              "company_id",
              membership.company_id
            )
            .in(
              "severity",
              [
                "high",
                "critical",
              ]
            )
            .not(
              "status",
              "in",
              "(resolved,closed,cancelled)"
            )
            .order(
              "created_at",
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
              IncidentAlarm[]
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


  const overdue =
    rows.filter(
      item =>
        Boolean(
          item.sla_due_at
        ) &&
        new Date(
          String(
            item.sla_due_at
          )
        ).getTime() <
          Date.now()
    ).length;


  const loss =
    rows.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.estimated_loss_amount ||
          0
        ),
      0
    );


  return (
    <section
      data-tour-os-incident-critical-alarm
      className="mt-5 rounded-[22px] border border-red-500/25 bg-red-500/[.055] p-4"
    >

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

        <div className="flex items-start gap-3">

          <FaExclamationTriangle className="mt-0.5 text-red-300" />

          <div>

            <div className="text-[9px] font-black text-red-200">
              {rows.length} yüksek/kritik operasyon vakası
            </div>

            <div className="mt-1 text-[7px] font-bold text-red-100/60">
              SLA geciken: {overdue}
              {" · "}
              Tahmini zarar:{" "}
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
                loss
              )}
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
                  href={`/dashboard/turlar/${item.tour_id}/hatalar/${item.id}`}
                  className="rounded-xl border border-red-500/20 bg-[#07131f] px-3 py-2 text-[7px] font-black text-red-300"
                >
                  {item.incident_number}
                  {" · "}
                  {item.severity}
                </Link>
              )
            )}

        </div>

      </div>

    </section>
  );
}
