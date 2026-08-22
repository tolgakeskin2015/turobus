"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  FaShieldAlt,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Provider = {
  id: string;
  last_status: string;
  active: boolean;
  configured: boolean;
};


type Plan = {
  id: string;
  tour_id: string;
  status: string;
};


type Snapshot = {
  id: string;
  tour_id: string;
  health_score: number;
};


export default function PlatformGovernanceAlarm() {

  const [
    providerRisk,
    setProviderRisk,
  ] =
    useState(0);


  const [
    unreconciled,
    setUnreconciled,
  ] =
    useState<Plan[]>(
      []
    );


  const [
    weakHealth,
    setWeakHealth,
  ] =
    useState<Snapshot[]>(
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


        const [
          providerResult,
          planResult,
          snapshotResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_provider_registry"
              )
              .select(
                "id,last_status,active,configured"
              )
              .eq(
                "company_id",
                membership.company_id
              )
              .eq(
                "active",
                true
              ),

            supabase
              .from(
                "tour_payment_distribution_plans"
              )
              .select(
                "id,tour_id,status"
              )
              .eq(
                "company_id",
                membership.company_id
              )
              .eq(
                "status",
                "confirmed"
              )
              .limit(10),

            supabase
              .from(
                "tour_control_tower_snapshots"
              )
              .select(
                "id,tour_id,health_score"
              )
              .eq(
                "company_id",
                membership.company_id
              )
              .is(
                "departure_id",
                null
              )
              .lt(
                "health_score",
                60
              )
              .order(
                "generated_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(10),
          ]);


        if (
          !providerResult.error
        ) {

          const rows =
            (
              providerResult.data ??
              []
            ) as unknown as
              Provider[];


          setProviderRisk(
            rows.filter(
              provider =>
                !provider.configured
                ||
                [
                  "down",
                  "degraded",
                  "misconfigured",
                ].includes(
                  provider.last_status
                )
            ).length
          );
        }


        if (
          !planResult.error
        ) {

          setUnreconciled(
            (
              planResult.data ??
              []
            ) as unknown as
              Plan[]
          );
        }


        if (
          !snapshotResult.error
        ) {

          setWeakHealth(
            (
              snapshotResult.data ??
              []
            ) as unknown as
              Snapshot[]
          );
        }

      }
    )();

  }, []);


  if (
    providerRisk ===
      0
    &&
    unreconciled.length ===
      0
    &&
    weakHealth.length ===
      0
  ) {
    return null;
  }


  const firstTourId =
    weakHealth[0]?.tour_id
    ??
    unreconciled[0]?.tour_id;


  return (
    <section
      data-tour-os-platform-governance-alarm
      className="mt-5 rounded-[22px] border border-orange-500/20 bg-orange-500/[.04] p-4"
    >

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

        <div className="flex items-start gap-3">

          <FaShieldAlt className="mt-0.5 text-orange-300" />

          <div>

            <div className="text-[9px] font-black text-orange-200">
              Platform yönetim kontrolü gerekiyor
            </div>


            <div className="mt-1 text-[7px] text-orange-100/60">
              Provider risk: {providerRisk}
              {" · "}
              Mutabakat bekleyen: {unreconciled.length}
              {" · "}
              Sağlık skoru düşük: {weakHealth.length}
            </div>

          </div>

        </div>


        {firstTourId && (

          <Link
            href={`/dashboard/turlar/${firstTourId}/platform-kontrol`}
            className="rounded-xl border border-orange-500/20 bg-[#07131f] px-4 py-2 text-[8px] font-black text-orange-300"
          >
            Platform Control Tower
          </Link>
        )}

      </div>

    </section>
  );
}
