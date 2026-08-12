"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";


type Slot = {
  id: string;

  slot_date: string;

  start_time: string;

  capacity: number;

  reserved_count: number;

  available_capacity: number;

  selected: boolean;
};


type SlotPayload = {
  order_token: string;

  extra_item_id: string;

  activity_name: string;

  quantity: number;

  selected_slot_id:
    string | null;

  slots: Slot[];
};


function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      weekday: "long",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


export default function ExtraActivitySlotPage() {

  const params =
    useParams<{
      token: string;
      orderToken: string;
      itemId: string;
    }>();


  const bookingToken =
    String(
      params?.token ||
      ""
    );


  const orderToken =
    String(
      params?.orderToken ||
      ""
    );


  const itemId =
    String(
      params?.itemId ||
      ""
    );


  const [
    payload,
    setPayload,
  ] =
    useState<SlotPayload | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    savingId,
    setSavingId,
  ] =
    useState("");


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");


  const loadSlots =
    useCallback(
      async () => {

        setLoading(true);

        setErrorMessage("");


        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_extra_slots_public",
            {
              p_order_token:
                orderToken,

              p_extra_item_id:
                itemId,
            }
          );


        if (
          error ||
          !data
        ) {
          setErrorMessage(
            error?.message ||
              "Aktivite saatleri yüklenemedi."
          );

          setPayload(
            null
          );

          setLoading(
            false
          );

          return;
        }


        setPayload(
          data as SlotPayload
        );

        setLoading(
          false
        );

      },
      [
        orderToken,
        itemId,
      ]
    );


  useEffect(() => {
    if (
      orderToken &&
      itemId
    ) {
      void loadSlots();
    }
  }, [
    orderToken,
    itemId,
    loadSlots,
  ]);


  async function selectSlot(
    slotId: string
  ) {

    setSavingId(
      slotId
    );

    setErrorMessage("");
    setSuccessMessage("");


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "select_package_extra_slot_public",
        {
          p_order_token:
            orderToken,

          p_extra_item_id:
            itemId,

          p_slot_id:
            slotId,
        }
      );


    if (error) {

      setErrorMessage(
        error.message
      );

      setSavingId("");

      await loadSlots();

      return;
    }


    const result =
      data as {
        service_date?: string;
        service_time?: string;
      };


    setSuccessMessage(
      result.service_date
        ? `Aktivite saatin ${formatDate(
            result.service_date
          )} ${
            result.service_time
              ? result.service_time.slice(
                  0,
                  5
                )
              : ""
          } olarak kaydedildi.`
        : "Aktivite saatin kaydedildi."
    );


    await loadSlots();

    setSavingId("");
  }


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Uygun saatler hazırlanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">

      <div className="mx-auto max-w-4xl">

        <Link
          href={`/seyahat/${bookingToken}/ekstralar?order=${encodeURIComponent(
            orderToken
          )}`}
          className="text-sm font-black text-orange-400"
        >
          ← Ekstra Siparişime Dön
        </Link>


        <div className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">
            TUROBUS ACTIVITY SCHEDULER
          </p>


          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            {payload?.activity_name ||
              "Aktivite Saatini Seç"}
          </h1>


          <p className="mt-3 text-slate-400">
            Sana uygun günü ve saati seç.
            Kontenjan anlık olarak sistemden ayrılır.
          </p>


          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )}


          {successMessage && (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
              {successMessage}
            </div>
          )}


          <div className="mt-8 space-y-3">

            {(payload?.slots ?? []).map(
              slot => {

                const selected =
                  slot.selected;


                return (
                  <button
                    key={
                      slot.id
                    }
                    type="button"
                    disabled={
                      savingId ===
                        slot.id ||
                      (
                        !selected &&
                        slot.available_capacity <=
                          0
                      )
                    }
                    onClick={() =>
                      void selectSlot(
                        slot.id
                      )
                    }
                    className={`w-full rounded-2xl border p-5 text-left transition disabled:opacity-40 ${
                      selected
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-white/10 bg-slate-950 hover:border-orange-500/40"
                    }`}
                  >

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                      <div>

                        <p className="font-black">
                          {formatDate(
                            slot.slot_date
                          )}
                        </p>


                        <p className="mt-1 text-2xl font-black text-orange-400">
                          {slot.start_time.slice(
                            0,
                            5
                          )}
                        </p>

                      </div>


                      <div className="md:text-right">

                        <p className="text-xs text-slate-500">
                          Kalan Kontenjan
                        </p>


                        <p className="mt-1 font-black">
                          {
                            slot.available_capacity
                          }
                        </p>


                        {selected && (
                          <p className="mt-2 text-sm font-black text-emerald-400">
                            ✓ Seçili Saat
                          </p>
                        )}

                      </div>

                    </div>

                  </button>
                );
              }
            )}

          </div>


          {payload &&
            payload.slots.length ===
              0 && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-slate-400">
                Şu anda uygun aktivite saati bulunmuyor.
              </div>
            )}

        </div>

      </div>

    </main>
  );
}
