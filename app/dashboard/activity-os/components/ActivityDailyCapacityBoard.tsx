"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaPlus,
  FaTimes,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Slot = {
  id: string;
  activity_id: string;
  activity_name?: string;
  slot_date: string;
  start_time: string | null;
  end_time?: string | null;
  capacity: number;
  reserved_count: number;
  remaining_count?: number;
  occupancy_percent?: number;
  sale_price: number | null;
  currency: string;
  status: string;
};


type Activity = {
  id: string;
  name: string;
  currency: string;
  default_sale_price: number | null;
};


function today() {
  const d =
    new Date();

  return [
    d.getFullYear(),
    String(
      d.getMonth() + 1
    ).padStart(2, "0"),
    String(
      d.getDate()
    ).padStart(2, "0"),
  ].join("-");
}


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


export default function ActivityDailyCapacityBoard({
  companyId,
  slots,
  activities,
  onRefresh,
}: {
  companyId: string;
  slots: Slot[];
  activities: Activity[];
  onRefresh: () => Promise<void>;
}) {

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      today()
    );


  const [
    selectedActivity,
    setSelectedActivity,
  ] =
    useState(
      "all"
    );


  const [
    activeSlot,
    setActiveSlot,
  ] =
    useState<Slot | null>(
      null
    );


  const [
    customerName,
    setCustomerName,
  ] =
    useState("");


  const [
    customerPhone,
    setCustomerPhone,
  ] =
    useState("");


  const [
    customerEmail,
    setCustomerEmail,
  ] =
    useState("");


  const [
    quantity,
    setQuantity,
  ] =
    useState("1");


  const [
    saleTotal,
    setSaleTotal,
  ] =
    useState("");


  const [
    paidTotal,
    setPaidTotal,
  ] =
    useState("");


  const [
    hotelName,
    setHotelName,
  ] =
    useState("");


  const [
    pickupLocation,
    setPickupLocation,
  ] =
    useState("");


  const [
    sourceChannel,
    setSourceChannel,
  ] =
    useState(
      "direct"
    );


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(
    () => {

      if (!companyId) {
        return;
      }


      let timer:
        ReturnType<typeof setTimeout> |
        null =
          null;


      function queueRefresh() {

        if (timer) {
          clearTimeout(
            timer
          );
        }


        timer =
          setTimeout(
            () => {
              void onRefresh();
            },
            250
          );

      }


      const channel =
        supabase
          .channel(
            `activity-capacity-${companyId}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",

              schema:
                "public",

              table:
                "activity_os_bookings",

              filter:
                `company_id=eq.${companyId}`,
            },
            queueRefresh
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",

              schema:
                "public",

              table:
                "package_activity_slots",

              filter:
                `company_id=eq.${companyId}`,
            },
            queueRefresh
          )
          .subscribe();


      return () => {

        if (timer) {
          clearTimeout(
            timer
          );
        }


        void supabase.removeChannel(
          channel
        );

      };

    },
    [
      companyId,
      onRefresh,
    ]
  );


  const filtered =
    useMemo(
      () =>
        slots
          .filter(
            (
              slot
            ) =>
              slot.slot_date ===
              selectedDate
          )
          .filter(
            (
              slot
            ) =>
              selectedActivity ===
                "all" ||
              slot.activity_id ===
                selectedActivity
          )
          .sort(
            (
              a,
              b
            ) =>
              (
                a.start_time ??
                ""
              ).localeCompare(
                b.start_time ??
                ""
              )
          ),
      [
        slots,
        selectedDate,
        selectedActivity,
      ]
    );


  function remaining(
    slot: Slot
  ) {

    return Number(
      slot.remaining_count ??
      Math.max(
        Number(
          slot.capacity
        ) -
        Number(
          slot.reserved_count
        ),
        0
      )
    );

  }


  function occupancy(
    slot: Slot
  ) {

    if (
      slot.occupancy_percent !=
      null
    ) {
      return Number(
        slot.occupancy_percent
      );
    }


    if (
      Number(
        slot.capacity
      ) <= 0
    ) {
      return 0;
    }


    return Math.round(
      (
        Number(
          slot.reserved_count
        ) /
        Number(
          slot.capacity
        )
      ) *
      100
    );

  }


  function activityName(
    slot: Slot
  ) {

    return (
      slot.activity_name ??
      activities.find(
        (
          item
        ) =>
          item.id ===
          slot.activity_id
      )?.name ??
      "Aktivite"
    );

  }


  function openBooking(
    slot: Slot
  ) {

    const free =
      remaining(
        slot
      );


    if (
      free <= 0
    ) {
      return;
    }


    const activity =
      activities.find(
        (
          item
        ) =>
          item.id ===
          slot.activity_id
      );


    const unitPrice =
      Number(
        slot.sale_price ??
        activity?.default_sale_price ??
        0
      );


    setActiveSlot(
      slot
    );

    setQuantity(
      "1"
    );

    setSaleTotal(
      unitPrice
        ? String(
            unitPrice
          )
        : ""
    );

    setPaidTotal("");

    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setHotelName("");
    setPickupLocation("");
    setSourceChannel(
      "direct"
    );

    setError("");

  }


  function updateQuantity(
    value: string
  ) {

    if (
      !activeSlot
    ) {
      return;
    }


    const next =
      Math.max(
        Number(
          value ||
          1
        ),
        1
      );


    const free =
      remaining(
        activeSlot
      );


    if (
      next > free
    ) {

      setQuantity(
        String(
          free
        )
      );

      setError(
        `Bu slotta en fazla ${free} kişilik müsait kontenjan var.`
      );

      return;

    }


    setError("");

    setQuantity(
      String(
        next
      )
    );


    const activity =
      activities.find(
        (
          item
        ) =>
          item.id ===
          activeSlot.activity_id
      );


    const unitPrice =
      Number(
        activeSlot.sale_price ??
        activity?.default_sale_price ??
        0
      );


    if (
      unitPrice > 0
    ) {

      setSaleTotal(
        String(
          unitPrice *
          next
        )
      );

    }

  }


  async function saveBooking() {

    if (
      !activeSlot
    ) {
      return;
    }


    setError("");


    if (
      !customerName.trim()
    ) {

      setError(
        "Misafir adı zorunludur."
      );

      return;

    }


    const count =
      Math.max(
        Number(
          quantity ||
          1
        ),
        1
      );


    const free =
      remaining(
        activeSlot
      );


    if (
      count > free
    ) {

      setError(
        `Müsait kontenjan ${free} kişi. ${count} kişilik rezervasyon yapılamaz.`
      );

      return;

    }


    setSaving(
      true
    );


    const {
      data,
      error:
        bookingError,
    } =
      await supabase.rpc(
        "activity_os_quick_booking",
        {
          p_company_id:
            companyId,

          p_slot_id:
            activeSlot.id,

          p_customer_name:
            customerName.trim(),

          p_customer_phone:
            customerPhone.trim() ||
            null,

          p_customer_email:
            customerEmail.trim() ||
            null,

          p_quantity:
            count,

          p_source_channel:
            sourceChannel,

          p_seller_id:
            null,

          p_sale_total:
            Number(
              saleTotal ||
              0
            ),

          p_paid_total:
            Number(
              paidTotal ||
              0
            ),

          p_payment_method:
            "cash",

          p_hotel_name:
            hotelName.trim() ||
            null,

          p_pickup_location:
            pickupLocation.trim() ||
            null,

          p_special_notes:
            null,
        }
      );


    setSaving(
      false
    );


    if (
      bookingError
    ) {

      setError(
        bookingError.message
      );

      return;

    }


    await onRefresh();


    setActiveSlot(
      null
    );


    const result =
      data as {
        booking_code?: string;
      };


    window.alert(
      result.booking_code
        ? `Rezervasyon oluşturuldu: ${result.booking_code}`
        : "Rezervasyon oluşturuldu."
    );

  }


  return (
    <>

      <section className="mb-7 rounded-[30px] border border-white/10 bg-gradient-to-br from-[#111827] via-[#0b1220] to-[#070d17] p-5 shadow-[0_30px_100px_rgba(0,0,0,.35)] md:p-6">

        <div className="flex flex-wrap items-end justify-between gap-5">

          <div>

            <div className="flex flex-wrap items-center gap-3">

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                GÜNLÜK KONTENJAN YÖNETİMİ
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] text-emerald-300">

                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                CANLI STOK

              </div>

            </div>

            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              Bugün kaç kişi daha alabilirim?
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">
              Her seans kendi kapasitesini kullanır. Yeni müşteri aldığınızda müsait kontenjan otomatik düşer.
            </p>

          </div>


          <div className="grid gap-3 sm:grid-cols-2">

            <label>

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                Tarih
              </span>

              <input
                type="date"
                value={
                  selectedDate
                }
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black outline-none"
              />

            </label>


            <label>

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                Aktivite
              </span>

              <select
                value={
                  selectedActivity
                }
                onChange={(event) =>
                  setSelectedActivity(
                    event.target.value
                  )
                }
                className="min-w-[190px] rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black outline-none"
              >

                <option value="all">
                  Tüm Aktiviteler
                </option>

                {activities.map(
                  (
                    activity
                  ) => (

                    <option
                      key={
                        activity.id
                      }
                      value={
                        activity.id
                      }
                    >
                      {activity.name}
                    </option>

                  )
                )}

              </select>

            </label>

          </div>

        </div>


        <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">

          {filtered.map(
            (
              slot
            ) => {

              const free =
                remaining(
                  slot
                );

              const used =
                Number(
                  slot.reserved_count ??
                  0
                );

              const percent =
                occupancy(
                  slot
                );

              const full =
                free <= 0;


              return (

                <article
                  key={
                    slot.id
                  }
                  className={`overflow-hidden rounded-[24px] border ${
                    full
                      ? "border-red-500/25 bg-red-500/[.06]"
                      : free <= 2
                        ? "border-orange-500/25 bg-orange-500/[.05]"
                        : "border-white/10 bg-white/[.035]"
                  }`}
                >

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-500">
                          {activityName(
                            slot
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-2xl font-black">

                          <FaClock className="text-sm text-orange-400" />

                          {slot.start_time?.slice(
                            0,
                            5
                          ) ??
                            "-"}

                          {slot.end_time && (
                            <span className="text-base text-slate-600">
                              –
                              {slot.end_time.slice(
                                0,
                                5
                              )}
                            </span>
                          )}

                        </div>

                      </div>


                      <div className={`rounded-2xl px-4 py-3 text-center ${
                        full
                          ? "bg-red-500 text-white"
                          : "bg-emerald-500 text-slate-950"
                      }`}>

                        <div className="text-[8px] font-black uppercase">
                          {full
                            ? "DURUM"
                            : "MÜSAİT"}
                        </div>

                        <div className="mt-1 text-2xl font-black">
                          {full
                            ? "DOLU"
                            : free}
                        </div>

                        {!full && (
                          <div className="text-[8px] font-black">
                            KİŞİ
                          </div>
                        )}

                      </div>

                    </div>


                    <div className="mt-5 grid grid-cols-3 gap-2">

                      <div className="rounded-xl bg-black/25 p-3 text-center">

                        <div className="text-[8px] font-black uppercase text-slate-600">
                          Kapasite
                        </div>

                        <div className="mt-1 text-xl font-black">
                          {slot.capacity}
                        </div>

                      </div>


                      <div className="rounded-xl bg-black/25 p-3 text-center">

                        <div className="text-[8px] font-black uppercase text-slate-600">
                          Satılan
                        </div>

                        <div className="mt-1 text-xl font-black text-orange-300">
                          {used}
                        </div>

                      </div>


                      <div className="rounded-xl bg-black/25 p-3 text-center">

                        <div className="text-[8px] font-black uppercase text-slate-600">
                          Doluluk
                        </div>

                        <div className="mt-1 text-xl font-black text-fuchsia-300">
                          %{Math.round(
                            percent
                          )}
                        </div>

                      </div>

                    </div>


                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">

                      <div
                        className={`h-full rounded-full ${
                          full
                            ? "bg-red-500"
                            : percent >= 80
                              ? "bg-orange-500"
                              : "bg-emerald-500"
                        }`}
                        style={{
                          width:
                            `${Math.min(
                              percent,
                              100
                            )}%`,
                        }}
                      />

                    </div>


                    <div className="mt-4 flex items-center justify-between">

                      <div>

                        <div className="text-[8px] uppercase text-slate-600">
                          Satış fiyatı
                        </div>

                        <div className="mt-1 font-black">
                          {money(
                            Number(
                              slot.sale_price ??
                              0
                            ),
                            slot.currency
                          )}
                        </div>

                      </div>


                      <button
                        type="button"
                        disabled={
                          full
                        }
                        onClick={() =>
                          openBooking(
                            slot
                          )
                        }
                        className={`flex min-h-12 items-center gap-2 rounded-xl px-5 text-xs font-black transition ${
                          full
                            ? "cursor-not-allowed bg-white/[.04] text-slate-700"
                            : "bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
                        }`}
                      >

                        <FaUserPlus />

                        {full
                          ? "Kontenjan Dolu"
                          : "Yeni Müşteri Al"}

                      </button>

                    </div>

                  </div>

                </article>

              );

            }
          )}


          {filtered.length ===
            0 && (

            <div className="rounded-[24px] border border-dashed border-white/10 p-10 text-center md:col-span-2 2xl:col-span-3">

              <FaCalendarAlt className="mx-auto text-3xl text-slate-700" />

              <div className="mt-4 text-lg font-black">
                Bu tarihte seans yok.
              </div>

              <div className="mt-2 text-xs text-slate-600">
                Aşağıdaki bölümden yeni slot oluşturabilirsiniz.
              </div>

            </div>

          )}

        </div>

      </section>


      {activeSlot && (

        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">

          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white/10 bg-[#08111d] p-6 shadow-[0_40px_140px_rgba(0,0,0,.65)]">

            <div className="flex items-start justify-between gap-5">

              <div>

                <div className="text-[9px] font-black uppercase tracking-[.2em] text-orange-400">
                  HIZLI REZERVASYON
                </div>

                <h3 className="mt-2 text-2xl font-black">
                  {activityName(
                    activeSlot
                  )}
                </h3>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">

                  <span>
                    {activeSlot.slot_date}
                  </span>

                  <span>
                    {activeSlot.start_time?.slice(
                      0,
                      5
                    )}
                  </span>

                  <span className="font-black text-emerald-400">
                    {remaining(
                      activeSlot
                    )} kişi müsait
                  </span>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setActiveSlot(
                    null
                  )
                }
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <Field label="Misafir Ad Soyad">
                <input
                  value={
                    customerName
                  }
                  onChange={(event) =>
                    setCustomerName(
                      event.target.value
                    )
                  }
                  className={inputClass}
                  autoFocus
                />
              </Field>


              <Field label="Telefon">
                <input
                  value={
                    customerPhone
                  }
                  onChange={(event) =>
                    setCustomerPhone(
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="05xx xxx xx xx"
                />
              </Field>


              <Field label="E-posta">
                <input
                  type="email"
                  value={
                    customerEmail
                  }
                  onChange={(event) =>
                    setCustomerEmail(
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>


              <Field label={`Kişi Sayısı · Maksimum ${remaining(activeSlot)}`}>
                <input
                  type="number"
                  min="1"
                  max={
                    remaining(
                      activeSlot
                    )
                  }
                  value={
                    quantity
                  }
                  onChange={(event) =>
                    updateQuantity(
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>


              <Field label="Satış Kanalı">
                <select
                  value={
                    sourceChannel
                  }
                  onChange={(event) =>
                    setSourceChannel(
                      event.target.value
                    )
                  }
                  className={inputClass}
                >

                  <option value="direct">
                    Direkt
                  </option>

                  <option value="phone">
                    Telefon
                  </option>

                  <option value="whatsapp">
                    WhatsApp
                  </option>

                  <option value="instagram">
                    Instagram
                  </option>

                  <option value="hotel">
                    Otel
                  </option>

                  <option value="agency">
                    Acente
                  </option>

                  <option value="external_seller">
                    Dış Satışçı
                  </option>

                  <option value="turobus_marketplace">
                    Turobus Marketplace
                  </option>

                </select>
              </Field>


              <Field label="Toplam Satış">
                <input
                  type="number"
                  min="0"
                  value={
                    saleTotal
                  }
                  onChange={(event) =>
                    setSaleTotal(
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>


              <Field label="Alınan Ödeme">
                <input
                  type="number"
                  min="0"
                  value={
                    paidTotal
                  }
                  onChange={(event) =>
                    setPaidTotal(
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>


              <Field label="Otel">
                <input
                  value={
                    hotelName
                  }
                  onChange={(event) =>
                    setHotelName(
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="Varsa otel adı"
                />
              </Field>


              <div className="md:col-span-2">

                <Field label="Pickup Noktası">
                  <input
                    value={
                      pickupLocation
                    }
                    onChange={(event) =>
                      setPickupLocation(
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Varsa alınacağı nokta"
                  />
                </Field>

              </div>

            </div>


            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.07] p-4">

              <div className="flex items-start gap-3">

                <FaCheckCircle className="mt-0.5 text-emerald-400" />

                <div>

                  <div className="text-xs font-black text-emerald-300">
                    Canlı kontenjan kontrolü
                  </div>

                  <div className="mt-1 text-[10px] leading-5 text-emerald-300/60">
                    Rezervasyon doğrudan bu slota bağlanır. Kişi sayısı müsait kontenjandan fazla olamaz.
                  </div>

                </div>

              </div>

            </div>


            {error && (

              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-black text-red-300">
                {error}
              </div>

            )}


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void saveBooking()
              }
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-fuchsia-500 text-sm font-black shadow-xl disabled:opacity-50"
            >

              <FaPlus />

              {saving
                ? "Rezervasyon kaydediliyor..."
                : `${quantity} Kişilik Rezervasyonu Kaydet`}

            </button>

          </div>

        </div>

      )}

    </>
  );

}


function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {

  return (
    <label>

      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
        {label}
      </span>

      {children}

    </label>
  );

}


const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition focus:border-orange-500/60";
