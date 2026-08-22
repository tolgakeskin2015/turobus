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


type Claim = {
  id: string;
  tour_id: string;
  claim_number: string;
  status: string;
};


type Outbox = {
  id: string;
  tour_id: string | null;
  status: string;
};


export default function ProtectionAutomationAlarm() {

  const [
    claims,
    setClaims,
  ] =
    useState<Claim[]>(
      []
    );

  const [
    outbox,
    setOutbox,
  ] =
    useState<Outbox[]>(
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
          claimResult,
          outboxResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_protection_claims"
              )
              .select(
                "id,tour_id,claim_number,status"
              )
              .eq(
                "company_id",
                membership.company_id
              )
              .in(
                "status",
                [
                  "submitted",
                  "reviewing",
                  "action_required",
                  "approved",
                ]
              )
              .limit(10),

            supabase
              .from(
                "tour_automation_outbox"
              )
              .select(
                "id,tour_id,status"
              )
              .eq(
                "company_id",
                membership.company_id
              )
              .in(
                "status",
                [
                  "blocked_no_provider",
                  "failed",
                ]
              )
              .limit(25),
          ]);


        if (
          !claimResult.error
        ) {
          setClaims(
            (
              claimResult.data ??
              []
            ) as unknown as
              Claim[]
          );
        }


        if (
          !outboxResult.error
        ) {
          setOutbox(
            (
              outboxResult.data ??
              []
            ) as unknown as
              Outbox[]
          );
        }

      }
    )();

  }, []);


  if (
    claims.length ===
      0 &&
    outbox.length ===
      0
  ) {
    return null;
  }


  return (
    <section className="mt-5 rounded-[22px] border border-violet-500/20 bg-violet-500/[.045] p-4">

      <div className="flex items-start gap-3">

        <FaShieldAlt className="mt-0.5 text-violet-300" />

        <div>

          <div className="text-[9px] font-black text-violet-200">
            Müşteri Koruma & Otomasyon
          </div>

          <div className="mt-1 text-[7px] text-violet-100/60">
            Açık güvence talebi: {claims.length}
            {" · "}
            Provider/hata bekleyen mesaj: {outbox.length}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">

            {claims
              .slice(0, 3)
              .map(
                claim => (

                  <Link
                    key={
                      claim.id
                    }
                    href={`/dashboard/turlar/${claim.tour_id}/guvence`}
                    className="rounded-xl border border-violet-500/20 bg-[#07131f] px-3 py-2 text-[7px] font-black text-violet-300"
                  >
                    {claim.claim_number}
                  </Link>
                )
              )}

          </div>

        </div>

      </div>

    </section>
  );
}
