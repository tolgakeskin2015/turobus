"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  FaBell,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type AlertEvent = {
  id: string;
  product_id: string;
  detected_price: number;
  target_price: number;
  created_at: string;
};


type Product = {
  id: string;
  tour_id: string;
  title: string;
};


export default function ProductPriceAlarm() {

  const [
    events,
    setEvents,
  ] =
    useState<AlertEvent[]>(
      []
    );


  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
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
          data:
            eventData,
          error:
            eventError,
        } =
          await supabase
            .from(
              "tour_product_price_alert_events"
            )
            .select(
              "id,product_id,detected_price,target_price,created_at"
            )
            .eq(
              "company_id",
              membership.company_id
            )
            .is(
              "acknowledged_at",
              null
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(10);


        if (
          eventError ||
          !eventData ||
          eventData.length ===
            0
        ) {
          return;
        }


        const productIds =
          eventData.map(
            item =>
              String(
                item.product_id
              )
          );


        const {
          data:
            productData,
        } =
          await supabase
            .from(
              "tour_product_catalog"
            )
            .select(
              "id,tour_id,title"
            )
            .eq(
              "company_id",
              membership.company_id
            )
            .in(
              "id",
              productIds
            );


        setEvents(
          eventData as unknown as
            AlertEvent[]
        );


        setProducts(
          (
            productData ??
            []
          ) as unknown as
            Product[]
        );

      }
    )();

  }, []);


  if (
    events.length ===
      0
  ) {
    return null;
  }


  const productMap =
    new Map(
      products.map(
        item => [
          item.id,
          item,
        ]
      )
    );


  return (
    <section
      data-tour-os-product-price-alarm
      className="mt-5 rounded-[22px] border border-amber-500/20 bg-amber-500/[.04] p-4"
    >

      <div className="flex items-start gap-3">

        <FaBell className="mt-0.5 text-amber-300" />

        <div className="min-w-0 flex-1">

          <div className="text-[9px] font-black text-amber-200">
            {events.length} fiyat alarmı tetiklendi
          </div>


          <div className="mt-3 flex flex-wrap gap-2">

            {events
              .slice(
                0,
                4
              )
              .map(
                event => {

                  const product =
                    productMap.get(
                      event.product_id
                    );


                  if (
                    !product
                  ) {
                    return null;
                  }


                  return (

                    <Link
                      key={
                        event.id
                      }
                      href={`/dashboard/turlar/${product.tour_id}/ticari-urunler`}
                      className="rounded-xl border border-amber-500/20 bg-[#07131f] px-3 py-2 text-[7px] font-black text-amber-300"
                    >
                      {product.title}
                      {" · "}
                      {Number(
                        event.detected_price
                      ).toLocaleString(
                        "tr-TR"
                      )}
                      {" TL"}
                    </Link>
                  );
                }
              )}

          </div>

        </div>

      </div>

    </section>
  );
}
