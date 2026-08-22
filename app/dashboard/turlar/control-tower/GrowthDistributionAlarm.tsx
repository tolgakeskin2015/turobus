"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  FaBolt,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Offer = {
  id: string;
  tour_id: string;
  title: string;
  expires_at: string;
};


type Group = {
  id: string;
  tour_id: string;
  request_number: string;
  passenger_count: number;
};


export default function GrowthDistributionAlarm() {

  const [
    offers,
    setOffers,
  ] =
    useState<Offer[]>(
      []
    );


  const [
    groups,
    setGroups,
  ] =
    useState<Group[]>(
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


        const tomorrow =
          new Date(
            Date.now() +
            24 *
            60 *
            60 *
            1000
          ).toISOString();


        const [
          offerResult,
          groupResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_last_minute_offers"
              )
              .select(
                "id,tour_id,title,expires_at"
              )
              .eq(
                "company_id",
                membership.company_id
              )
              .eq(
                "status",
                "active"
              )
              .lte(
                "expires_at",
                tomorrow
              )
              .gte(
                "expires_at",
                new Date().toISOString()
              )
              .limit(10),

            supabase
              .from(
                "tour_group_requests"
              )
              .select(
                "id,tour_id,request_number,passenger_count"
              )
              .eq(
                "company_id",
                membership.company_id
              )
              .eq(
                "status",
                "new"
              )
              .limit(10),
          ]);


        if (
          !offerResult.error
        ) {
          setOffers(
            (
              offerResult.data ??
              []
            ) as unknown as
              Offer[]
          );
        }


        if (
          !groupResult.error
        ) {
          setGroups(
            (
              groupResult.data ??
              []
            ) as unknown as
              Group[]
          );
        }

      }
    )();

  }, []);


  if (
    offers.length ===
      0
    &&
    groups.length ===
      0
  ) {
    return null;
  }


  return (
    <section
      data-tour-os-growth-distribution-alarm
      className="mt-5 rounded-[22px] border border-fuchsia-500/20 bg-fuchsia-500/[.04] p-4"
    >

      <div className="flex items-start gap-3">

        <FaBolt className="mt-0.5 text-fuchsia-300" />

        <div className="min-w-0 flex-1">

          <div className="text-[9px] font-black text-fuchsia-200">
            Büyüme & satış fırsatları
          </div>


          <div className="mt-1 text-[7px] text-fuchsia-100/60">
            24 saat içinde bitecek son dakika: {offers.length}
            {" · "}
            Yeni grup talebi: {groups.length}
          </div>


          <div className="mt-3 flex flex-wrap gap-2">

            {offers
              .slice(
                0,
                2
              )
              .map(
                item => (

                  <Link
                    key={
                      item.id
                    }
                    href={`/dashboard/turlar/${item.tour_id}/buyume-kanallari`}
                    className="rounded-xl border border-fuchsia-500/20 bg-[#07131f] px-3 py-2 text-[7px] font-black text-fuchsia-300"
                  >
                    {item.title}
                  </Link>
                )
              )}


            {groups
              .slice(
                0,
                2
              )
              .map(
                item => (

                  <Link
                    key={
                      item.id
                    }
                    href={`/dashboard/turlar/${item.tour_id}/buyume-kanallari`}
                    className="rounded-xl border border-blue-500/20 bg-[#07131f] px-3 py-2 text-[7px] font-black text-blue-300"
                  >
                    {item.request_number}
                    {" · "}
                    {item.passenger_count} kişi
                  </Link>
                )
              )}

          </div>

        </div>

      </div>

    </section>
  );
}
