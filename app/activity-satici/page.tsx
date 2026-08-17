"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowRight,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaExternalLinkAlt,
  FaMoneyBillWave,
  FaPlus,
  FaSignOutAlt,
  FaStore,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Product = {
  id: string;
  name: string;
  category: string;
  city: string | null;
  district: string | null;
  cover_image_url: string | null;
  duration_minutes: number | null;
  currency: string;
  sale_price: number;
};


type Slot = {
  id: string;
  activity_id: string;
  slot_date: string;
  start_time: string | null;
  capacity: number;
  reserved_count: number;
  available_capacity: number;
  status: string;
  sale_price: number;
  currency: string;
};


type Booking = {
  id: string;
  booking_code: string;
  activity_id: string;
  activity_name: string;
  customer_name: string;
  customer_phone: string | null;
  service_date: string;
  start_time: string | null;
  quantity: number;
  sale_total: number;
  paid_total: number;
  payment_status: string;
  status: string;
  hotel_name: string | null;
  guest_token: string;
};


type PortalData = {
  seller: {
    id: string;
    name: string;
    type: string;
    commission_type: string;
    commission_value: number;
  };

  company: {
    id: string;
    name: string;
    logo_url: string | null;
  };

  products: Product[];
  slots: Slot[];
  bookings: Booking[];

  summary: {
    booking_count: number;
    guest_count: number;
    sales_total: number;
    commission_total: number;
  };
};


type PayoutData = {
  earned: number;
  paid: number;
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    payout_date: string;
    payment_method: string | null;
    reference_no: string | null;
    note: string | null;
  }>;
};


function money(
  value:
    | number
    | null
    | undefined,
  currency =
    "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency,
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value ?? 0
    )
  );
}


export default function ActivitySellerPortal() {

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    data,
    setData,
  ] =
    useState<PortalData | null>(
      null
    );


  const [
    payout,
    setPayout,
  ] =
    useState<PayoutData | null>(
      null
    );


  const [
    activityId,
    setActivityId,
  ] =
    useState("");


  const [
    slotId,
    setSlotId,
  ] =
    useState("");


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
    useState(
      "1"
    );


  const [
    hotelName,
    setHotelName,
  ] =
    useState("");


  const [
    roomNo,
    setRoomNo,
  ] =
    useState("");


  const [
    pickup,
    setPickup,
  ] =
    useState("");


  const [
    note,
    setNote,
  ] =
    useState("");


  async function load() {

    setLoading(
      true
    );

    setError("");


    const {
      data:
        userData,
    } =
      await supabase.auth.getUser();


    if (
      !userData.user
    ) {

      window.location.href =
        "/giris?next=/activity-satici";

      return;
    }


    const [
      portalResult,
      payoutResult,
    ] =
      await Promise.all([
        supabase.rpc(
          "get_my_activity_seller_portal"
        ),

        supabase.rpc(
          "get_my_activity_seller_payouts"
        ),
      ]);


    if (
      portalResult.error
    ) {

      setError(
        portalResult.error.message
      );

      setLoading(
        false
      );

      return;
    }


    setData(
      portalResult.data as PortalData
    );


    if (
      !payoutResult.error
    ) {
      setPayout(
        payoutResult.data as PayoutData
      );
    }


    setLoading(
      false
    );

  }


  useEffect(
    () => {
      void load();
    },
    []
  );


  const availableSlots =
    useMemo(
      () =>
        (
          data?.slots ??
          []
        ).filter(
          (
            slot
          ) =>
            slot.activity_id ===
              activityId &&
            slot.available_capacity >
              0
        ),
      [
        data,
        activityId,
      ]
    );


  const selectedSlot =
    availableSlots.find(
      (
        slot
      ) =>
        slot.id ===
        slotId
    );


  const estimatedTotal =
    selectedSlot
      ? Number(
          selectedSlot.sale_price
        ) *
        Math.max(
          Number(
            quantity ||
              1
          ),
          1
        )
      : 0;


  async function createBooking(
    event:
      FormEvent
  ) {

    event.preventDefault();

    setError("");
    setMessage("");


    if (
      !activityId ||
      !slotId ||
      !customerName.trim()
    ) {

      setError(
        "Aktivite, slot ve misafir adı zorunludur."
      );

      return;
    }


    const {
      data:
        booking,
      error:
        bookingError,
    } =
      await supabase.rpc(
        "activity_seller_create_booking",
        {
          p_activity_id:
            activityId,

          p_slot_id:
            slotId,

          p_customer_name:
            customerName.trim(),

          p_customer_phone:
            customerPhone.trim() ||
            null,

          p_customer_email:
            customerEmail.trim() ||
            null,

          p_quantity:
            Math.max(
              Number(
                quantity ||
                  1
              ),
              1
            ),

          p_hotel_name:
            hotelName.trim() ||
            null,

          p_room_no:
            roomNo.trim() ||
            null,

          p_pickup_location:
            pickup.trim() ||
            null,

          p_special_notes:
            note.trim() ||
            null,
        }
      );


    if (
      bookingError
    ) {

      setError(
        bookingError.message
      );

      return;
    }


    const result =
      booking as {
        booking_code?: string;
      };


    setMessage(
      `Rezervasyon oluşturuldu: ${
        result.booking_code ??
        ""
      }`
    );


    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setQuantity(
      "1"
    );
    setHotelName("");
    setRoomNo("");
    setPickup("");
    setNote("");
    setSlotId("");


    await load();

  }


  async function logout() {

    await supabase.auth.signOut();

    window.location.href =
      "/giris";

  }


  if (
    loading
  ) {

    return (
      <main className="min-h-screen bg-[#050b12] p-6 text-white">

        <div className="mx-auto max-w-7xl">

          <div className="h-36 animate-pulse rounded-3xl bg-white/[.04]" />

          <div className="mt-5 h-96 animate-pulse rounded-3xl bg-white/[.04]" />

        </div>

      </main>
    );

  }


  if (
    !data
  ) {

    return (
      <main className="min-h-screen bg-[#050b12] px-6 py-20 text-white">

        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8">

          <h1 className="text-2xl font-black">
            Activity Seller Portal erişimi bulunamadı.
          </h1>

          <p className="mt-3 text-sm text-red-200/70">
            Bu hesabın aktif bir satışçı, otel veya acente kaydıyla eşleşmesi gerekiyor.
          </p>

          <button
            type="button"
            onClick={
              logout
            }
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
          >
            Güvenli Çıkış
          </button>

        </div>

      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#050b12] text-white">

      <header className="border-b border-white/10 bg-[#07131f] px-5 py-5">

        <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            {data.company.logo_url ? (

              <img
                src={
                  data.company.logo_url
                }
                alt={
                  data.company.name
                }
                className="h-12 w-12 rounded-xl object-cover"
              />

            ) : (

              <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-500 text-lg font-black">
                T
              </div>

            )}


            <div>

              <div className="text-[9px] font-black uppercase tracking-[.18em] text-orange-400">
                TUROBUS ACTIVITY SELLER
              </div>

              <div className="mt-1 font-black">
                {data.company.name}
              </div>

              <div className="text-[10px] text-slate-500">
                {data.seller.name}
              </div>

            </div>

          </div>


          <button
            type="button"
            onClick={
              logout
            }
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-slate-400"
          >
            <FaSignOutAlt />
            Çıkış
          </button>

        </div>

      </header>


      <section className="px-5 py-8">

        <div className="mx-auto max-w-[1450px]">

          {error && (

            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>

          )}


          {message && (

            <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              {message}
            </div>

          )}


          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

            {[
              [
                "Rezervasyon",
                data.summary.booking_count,
                FaCalendarAlt,
              ],

              [
                "Misafir",
                data.summary.guest_count,
                FaUsers,
              ],

              [
                "Satış",
                money(
                  data.summary.sales_total
                ),
                FaChartLine,
              ],

              [
                "Hak Edilen",
                money(
                  payout?.earned ??
                  data.summary.commission_total
                ),
                FaMoneyBillWave,
              ],

              [
                "Kalan Hakediş",
                money(
                  Math.max(
                    Number(
                      payout?.earned ??
                      0
                    ) -
                    Number(
                      payout?.paid ??
                      0
                    ),
                    0
                  )
                ),
                FaStore,
              ],
            ].map(
              (
                [
                  label,
                  value,
                  Icon,
                ]
              ) => {

                const CardIcon =
                  Icon as typeof FaCalendarAlt;


                return (
                  <div
                    key={
                      String(
                        label
                      )
                    }
                    className="rounded-3xl border border-white/10 bg-[#07131f] p-5"
                  >

                    <CardIcon className="text-orange-400" />

                    <div className="mt-4 text-[9px] font-black uppercase text-slate-500">
                      {String(
                        label
                      )}
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      {String(
                        value
                      )}
                    </div>

                  </div>
                );

              }
            )}

          </div>


          <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">

            <section className="rounded-3xl border border-white/10 bg-[#07131f] p-5">

              <div className="flex items-center gap-3">

                <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                  <FaPlus />
                </div>

                <div>
                  <h2 className="font-black">
                    Yeni Rezervasyon
                  </h2>

                  <p className="text-[9px] text-slate-500">
                    Yetkili olduğun ürün ve gerçek kapasite üzerinden.
                  </p>
                </div>

              </div>


              <form
                onSubmit={
                  createBooking
                }
                className="mt-6 space-y-4"
              >

                <label>

                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    Aktivite
                  </span>

                  <select
                    value={
                      activityId
                    }
                    onChange={(event) => {
                      setActivityId(
                        event.target.value
                      );

                      setSlotId("");
                    }}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  >

                    <option value="">
                      Aktivite seç
                    </option>

                    {data.products.map(
                      (
                        product
                      ) => (
                        <option
                          key={
                            product.id
                          }
                          value={
                            product.id
                          }
                        >
                          {product.name}
                          {" · "}
                          {money(
                            product.sale_price,
                            product.currency
                          )}
                        </option>
                      )
                    )}

                  </select>

                </label>


                <label>

                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    Tarih / Saat
                  </span>

                  <select
                    value={
                      slotId
                    }
                    onChange={(event) =>
                      setSlotId(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  >

                    <option value="">
                      Slot seç
                    </option>

                    {availableSlots.map(
                      (
                        slot
                      ) => (
                        <option
                          key={
                            slot.id
                          }
                          value={
                            slot.id
                          }
                        >
                          {slot.slot_date}
                          {" · "}
                          {slot.start_time?.slice(
                            0,
                            5
                          ) ??
                            "-"}
                          {" · "}
                          {slot.available_capacity} yer
                          {" · "}
                          {money(
                            slot.sale_price,
                            slot.currency
                          )}
                        </option>
                      )
                    )}

                  </select>

                </label>


                <div className="grid grid-cols-2 gap-3">

                  <label>

                    <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                      Misafir
                    </span>

                    <input
                      value={
                        customerName
                      }
                      onChange={(event) =>
                        setCustomerName(
                          event.target.value
                        )
                      }
                      required
                      placeholder="Ad soyad"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    />

                  </label>


                  <label>

                    <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                      Kişi
                    </span>

                    <input
                      type="number"
                      min="1"
                      max={
                        selectedSlot?.available_capacity ??
                        undefined
                      }
                      value={
                        quantity
                      }
                      onChange={(event) =>
                        setQuantity(
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    />

                  </label>

                </div>


                <label>

                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    Telefon
                  </span>

                  <input
                    value={
                      customerPhone
                    }
                    onChange={(event) =>
                      setCustomerPhone(
                        event.target.value
                      )
                    }
                    placeholder="05xx xxx xx xx"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    E-posta
                  </span>

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
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  />

                </label>


                <div className="grid grid-cols-2 gap-3">

                  <label>

                    <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                      Otel
                    </span>

                    <input
                      value={
                        hotelName
                      }
                      onChange={(event) =>
                        setHotelName(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    />

                  </label>


                  <label>

                    <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                      Oda
                    </span>

                    <input
                      value={
                        roomNo
                      }
                      onChange={(event) =>
                        setRoomNo(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    />

                  </label>

                </div>


                <label>

                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    Pickup Noktası
                  </span>

                  <input
                    value={
                      pickup
                    }
                    onChange={(event) =>
                      setPickup(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    Not
                  </span>

                  <textarea
                    value={
                      note
                    }
                    onChange={(event) =>
                      setNote(
                        event.target.value
                      )
                    }
                    rows={
                      3
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  />

                </label>


                <div className="rounded-xl border border-white/10 bg-slate-950 p-4">

                  <div className="text-[9px] uppercase text-slate-600">
                    Rezervasyon Toplamı
                  </div>

                  <div className="mt-1 text-2xl font-black text-orange-400">
                    {money(
                      estimatedTotal,
                      selectedSlot?.currency ??
                      "TRY"
                    )}
                  </div>

                </div>


                <button
                  type="submit"
                  className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black transition hover:bg-orange-600"
                >
                  Rezervasyonu Oluştur
                </button>

              </form>

            </section>


            <section>

              <div className="flex flex-wrap items-end justify-between gap-4">

                <div>

                  <div className="text-[9px] font-black uppercase tracking-[.16em] text-orange-400">
                    BENİM SATIŞLARIM
                  </div>

                  <h2 className="mt-1 text-2xl font-black">
                    Rezervasyonlar
                  </h2>

                </div>


                <div className="rounded-xl border border-white/10 bg-[#07131f] px-4 py-3 text-[10px] text-slate-400">
                  Firma içi maliyet ve kâr bilgileri bu portalda gösterilmez.
                </div>

              </div>


              <div className="mt-5 space-y-3">

                {data.bookings.map(
                  (
                    booking
                  ) => (

                    <div
                      key={
                        booking.id
                      }
                      className="rounded-3xl border border-white/10 bg-[#07131f] p-5"
                    >

                      <div className="grid gap-4 lg:grid-cols-[1fr_.8fr_.6fr_auto] lg:items-center">

                        <div>

                          <div className="text-[9px] font-black uppercase text-orange-400">
                            {booking.booking_code}
                          </div>

                          <div className="mt-1 font-black">
                            {booking.activity_name}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {booking.customer_name}
                            {" · "}
                            {booking.quantity} kişi
                          </div>

                        </div>


                        <div>

                          <div className="flex items-center gap-2 text-sm font-black">
                            <FaCalendarAlt className="text-slate-600" />
                            {booking.service_date}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                            <FaClock />
                            {booking.start_time?.slice(
                              0,
                              5
                            ) ??
                              "-"}
                          </div>

                        </div>


                        <div>

                          <div className="font-black">
                            {money(
                              booking.sale_total
                            )}
                          </div>

                          <div className="mt-1 text-[9px] uppercase text-slate-500">
                            {booking.payment_status}
                          </div>

                        </div>


                        <div className="flex items-center gap-2">

                          <span className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[9px] font-black uppercase text-emerald-300">
                            {booking.status}
                          </span>


                          <Link
                            href={`/activity-misafir/${booking.guest_token}`}
                            target="_blank"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"
                          >
                            <FaExternalLinkAlt />
                          </Link>

                        </div>

                      </div>

                    </div>

                  )
                )}


                {data.bookings.length ===
                  0 && (

                  <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">

                    <FaCheckCircle className="mx-auto text-2xl text-slate-700" />

                    <div className="mt-4 font-black">
                      Henüz satış yok.
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      İlk rezervasyonunu soldaki formdan oluştur.
                    </div>

                  </div>

                )}

              </div>

            </section>

          </div>


          {payout &&
            payout.payouts.length >
              0 && (

            <section className="mt-8 rounded-3xl border border-white/10 bg-[#07131f] p-5">

              <h2 className="text-xl font-black">
                Komisyon Ödemelerim
              </h2>


              <div className="mt-5 overflow-x-auto">

                <table className="w-full min-w-[650px]">

                  <thead className="text-left text-[9px] uppercase text-slate-500">

                    <tr>
                      <th className="pb-3">
                        Tarih
                      </th>
                      <th className="pb-3">
                        Tutar
                      </th>
                      <th className="pb-3">
                        Yöntem
                      </th>
                      <th className="pb-3">
                        Referans
                      </th>
                    </tr>

                  </thead>


                  <tbody>

                    {payout.payouts.map(
                      (
                        item
                      ) => (

                        <tr
                          key={
                            item.id
                          }
                          className="border-t border-white/10"
                        >

                          <td className="py-4 text-sm">
                            {item.payout_date}
                          </td>

                          <td className="py-4 font-black">
                            {money(
                              item.amount,
                              item.currency
                            )}
                          </td>

                          <td className="py-4 text-sm text-slate-400">
                            {item.payment_method ??
                              "-"}
                          </td>

                          <td className="py-4 text-sm text-slate-400">
                            {item.reference_no ??
                              "-"}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          )}


          <section className="mt-8 rounded-[32px] border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent p-7">

            <div className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">
              TUROBUS NETWORK
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Müşterine daha fazlasını sun.
            </h2>

            <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-400">
              Misafir rezervasyonunu Turobus üzerinden takip ederken diğer aktiviteleri, transferleri, yat & tekne seçeneklerini ve konaklamaları keşfedebilir.
            </p>


            <Link
              href="/aktiviteler"
              target="_blank"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black"
            >
              Marketplace&apos;i Aç
              <FaArrowRight />
            </Link>

          </section>

        </div>

      </section>

    </main>
  );
}
