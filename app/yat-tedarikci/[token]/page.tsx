"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  FaAnchor,
  FaCalendarAlt,
  FaCoins,
  FaShip,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Portal = {
  supplier: {
    id: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    commission_rate: number;
    current_balance: number;
    rating: number | null;
    status: string;
  };

  yachts: Array<{
    id: string;
    name: string;
    type: string;
    city: string;
    marina: string | null;
    status: string;
    max_guests: number;
    base_daily_price: number;
    currency: string;
  }>;

  bookings: Array<{
    id: string;
    booking_code: string;
    guest_name: string;
    guest_count: number;
    start_date: string;
    end_date: string;
    status: string;
    operation_status: string;
    total_amount: number;
    supplier_cost: number;
    currency: string;
    yacht_name: string;
  }>;
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
    Number(
      value || 0
    )
  );
}


export default function YachtSupplierPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    String(
      params?.token ??
      ""
    );

  const [
    portal,
    setPortal,
  ] =
    useState<
      Portal | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(
    () => {
      async function load() {
        const {
          data,
        } =
          await supabase.rpc(
            "get_public_yacht_supplier_portal",
            {
              p_token:
                token,
            }
          );

        setPortal(
          (
            data ??
            null
          ) as Portal | null
        );

        setLoading(
          false
        );
      }

      if (token) {
        void load();
      }
    },
    [
      token,
    ]
  );


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        <FaAnchor className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  if (!portal) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        Partner portalı bulunamadı.
      </main>
    );
  }


  const supplierTotal =
    portal.bookings.reduce(
      (
        total,
        booking
      ) =>
        total +
        Number(
          booking.supplier_cost
        ),
      0
    );


  return (
    <main className="min-h-screen bg-[#030a11] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">

        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.18),transparent_38%),#07131f] p-7 lg:p-9">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-xl text-orange-400">
              <FaUserTie />
            </div>

            <div>
              <div className="text-[9px] font-black uppercase tracking-[.22em] text-orange-400">
                TUROBUS YACHT PARTNER
              </div>

              <h1 className="mt-1 text-2xl font-black">
                {portal.supplier.name}
              </h1>

              <div className="mt-1 text-[10px] text-slate-500">
                {portal.supplier.contact_name || "Partner hesabı"}
              </div>
            </div>
          </div>
        </section>


        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            icon={<FaShip />}
            label="Filo"
            value={String(
              portal.yachts.length
            )}
          />

          <Metric
            icon={<FaCalendarAlt />}
            label="Rezervasyon"
            value={String(
              portal.bookings.length
            )}
          />

          <Metric
            icon={<FaCoins />}
            label="Hakediş"
            value={money(
              supplierTotal
            )}
          />

          <Metric
            icon={<FaUsers />}
            label="Komisyon"
            value={`%${portal.supplier.commission_rate}`}
          />
        </section>


        <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
          <h2 className="text-lg font-black">
            Filom
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {portal.yachts.map(
              (
                yacht
              ) => (
                <div
                  key={
                    yacht.id
                  }
                  className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"
                >
                  <div className="text-sm font-black">
                    {yacht.name}
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    {yacht.city}
                    {yacht.marina
                      ? ` · ${yacht.marina}`
                      : ""}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[.06] pt-3">
                    <span className="text-[9px] text-slate-500">
                      {yacht.max_guests} kişi
                    </span>

                    <span className="text-[10px] font-black text-orange-300">
                      {money(
                        yacht.base_daily_price,
                        yacht.currency
                      )}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">
          <div className="border-b border-white/10 p-5 lg:p-6">
            <h2 className="text-lg font-black">
              Rezervasyonlar
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="text-[8px] font-black uppercase text-slate-600">
                  <th className="px-5 py-4">
                    Kod
                  </th>
                  <th className="px-5 py-4">
                    Tekne
                  </th>
                  <th className="px-5 py-4">
                    Misafir
                  </th>
                  <th className="px-5 py-4">
                    Tarih
                  </th>
                  <th className="px-5 py-4">
                    Kişi
                  </th>
                  <th className="px-5 py-4">
                    Hakediş
                  </th>
                  <th className="px-5 py-4">
                    Durum
                  </th>
                </tr>
              </thead>

              <tbody>
                {portal.bookings.map(
                  (
                    booking
                  ) => (
                    <tr
                      key={
                        booking.id
                      }
                      className="border-t border-white/[.06] text-[10px]"
                    >
                      <td className="px-5 py-4 font-black">
                        {booking.booking_code}
                      </td>

                      <td className="px-5 py-4">
                        {booking.yacht_name}
                      </td>

                      <td className="px-5 py-4">
                        {booking.guest_name}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {booking.start_date}
                      </td>

                      <td className="px-5 py-4">
                        {booking.guest_count}
                      </td>

                      <td className="px-5 py-4 font-black text-emerald-300">
                        {money(
                          booking.supplier_cost,
                          booking.currency
                        )}
                      </td>

                      <td className="px-5 py-4 text-orange-300">
                        {booking.status}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}


function Metric({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">
      <div className="text-orange-400">
        {icon}
      </div>

      <div className="mt-4 text-[8px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-xl font-black">
        {value}
      </div>
    </div>
  );
}
