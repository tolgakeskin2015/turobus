"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";


type Slot = {
  id: string;

  slot_date: string;
  start_time: string | null;

  capacity: number;
  reserved_count: number;
  available_capacity: number;

  selected: boolean;
};


type SlotPayload = {
  booking_code: string;

  activity_name: string;

  quantity: number;

  selected_slot_id:
    | string
    | null;

  slots: Slot[];
};


function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


export default function ActivitySlotPage() {
  const params =
    useParams<{
      token: string;
      itemId: string;
    }>();

  const router =
    useRouter();

  const token =
    String(
      params?.token || ""
    );

  const itemId =
    String(
      params?.itemId || ""
    );

  const [
    payload,
    setPayload,
  ] =
    useState<SlotPayload | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    selectingId,
    setSelectingId,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


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
            "get_package_activity_slots_public",
            {
              p_booking_token:
                token,

              p_booking_item_id:
                itemId,
            }
          );

        if (
          error ||
          !data
        ) {
          setPayload(null);

          setErrorMessage(
            error?.message ||
              "Aktivite saatleri yüklenemedi."
          );

          setLoading(false);

          return;
        }

        setPayload(
          data as SlotPayload
        );

        setLoading(false);
      },
      [
        token,
        itemId,
      ]
    );


  useEffect(() => {
    if (
      token &&
      itemId
    ) {
      void loadSlots();
    }
  }, [
    token,
    itemId,
    loadSlots,
  ]);


  async function selectSlot(
    slotId: string
  ) {
    setSelectingId(
      slotId
    );

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "select_package_activity_slot_public",
          {
            p_booking_token:
              token,

            p_booking_item_id:
              itemId,

            p_slot_id:
              slotId,
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const result =
        data as {
          service_date?: string;
          service_time?: string;
          already_selected?: boolean;
        };

      if (
        result.already_selected
      ) {
        setSuccessMessage(
          "Bu saat zaten seçili."
        );
      } else {
        setSuccessMessage(
          "Aktivite saatiniz kaydedildi."
        );
      }

      await loadSlots();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Saat seçilemedi."
      );
    } finally {
      setSelectingId("");
    }
  }


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Müsait saatler kontrol ediliyor...
      </main>
    );
  }


  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-[28px] border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black">
            Saat seçimi açılamadı
          </h1>

          <p className="mt-4 text-red-300">
            {errorMessage}
          </p>

          <Link
            href={`/seyahat/${token}`}
            className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-3 font-black"
          >
            Seyahatime Dön
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-3xl">

        <Link
          href={`/seyahat/${token}`}
          className="text-sm font-black text-orange-400"
        >
          ← Seyahatime Dön
        </Link>


        <div className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-7 md:p-9">

          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">
            TUROBUS TRAVEL WALLET
          </p>

          <h1 className="mt-4 text-4xl font-black">
            Aktivite Saatini Seç
          </h1>

          <p className="mt-3 text-xl font-black">
            {payload.activity_name}
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Rezervasyon:{" "}
            {payload.booking_code}
            {" · "}
            Kapasite ihtiyacı:{" "}
            {Number(
              payload.quantity
            )}
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


          <div className="mt-7 space-y-4">

            {payload.slots.map(
              (slot) => {

                const available =
                  Number(
                    slot.available_capacity
                  );

                const selected =
                  slot.selected;

                return (
                  <div
                    key={slot.id}
                    className={
                      selected
                        ? "rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5"
                        : "rounded-2xl border border-white/10 bg-slate-950 p-5"
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-5">

                      <div>
                        <p className="text-sm font-black text-slate-400">
                          {formatDate(
                            slot.slot_date
                          )}
                        </p>

                        <p className="mt-2 text-3xl font-black">
                          {slot.start_time
                            ? slot.start_time.slice(
                                0,
                                5
                              )
                            : "Saat belirlenecek"}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Kalan kapasite:{" "}
                          {available}
                        </p>
                      </div>


                      {selected ? (
                        <div className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-black">
                          ✓ Seçili Saat
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            selectingId ===
                              slot.id ||
                            available <= 0
                          }
                          onClick={() =>
                            void selectSlot(
                              slot.id
                            )
                          }
                          className="rounded-xl bg-orange-500 px-6 py-3 font-black text-black disabled:opacity-40"
                        >
                          {selectingId ===
                          slot.id
                            ? "Kaydediliyor..."
                            : "Bu Saati Seç"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )}


            {payload.slots.length ===
              0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-slate-400">
                Şu anda seçilebilir
                aktivite saati
                bulunmuyor.
              </div>
            )}

          </div>


          {payload.selected_slot_id && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/seyahat/${token}`
                )
              }
              className="mt-7 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 font-black text-emerald-300"
            >
              Programıma Dön
            </button>
          )}

        </div>
      </div>
    </main>
  );
}
