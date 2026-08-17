"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  FaArrowRight,
  FaCheckCircle,
  FaClock,
  FaLock,
  FaShieldAlt,
  FaSuitcase,
  FaTicketAlt,
  FaUser,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import {
  activeTicketProvider,
} from "@/lib/tickets/provider";

import {
  ticketSearchFromParams,
  ticketSearchToParams,
} from "@/lib/tickets/query";

import type {
  TicketBookingDraft,
  TicketOffer,
  TicketPassenger,
  TicketSearchInput,
} from "@/lib/tickets/types";


function money(
  value: number,
  currency: string
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
  ).format(value);
}


function emptyPassenger(
  type:
    TicketPassenger["type"]
): TicketPassenger {
  return {
    type,
    firstName:
      "",
    lastName:
      "",
    birthDate:
      "",
    identityType:
      "tc",
    identityNumber:
      "",
    gender:
      "",
    seatPreference:
      "any",
  };
}


export default function TicketBookingPage() {
  const router =
    useRouter();

  const [
    search,
    setSearch,
  ] =
    useState<TicketSearchInput | null>(
      null
    );

  const [
    offer,
    setOffer,
  ] =
    useState<TicketOffer | null>(
      null
    );

  const [
    passengers,
    setPassengers,
  ] =
    useState<TicketPassenger[]>(
      []
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    phone,
    setPhone,
  ] =
    useState("");

  const [
    terms,
    setTerms,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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
      const params =
        new URLSearchParams(
          window.location.search
        );

      const nextSearch =
        ticketSearchFromParams(
          params
        );

      const offerId =
        params.get(
          "offerId"
        );

      setSearch(
        nextSearch
      );

      const people:
        TicketPassenger[] =
          [];

      for (
        let i = 0;
        i <
        nextSearch.adults;
        i += 1
      ) {
        people.push(
          emptyPassenger(
            "adult"
          )
        );
      }

      for (
        let i = 0;
        i <
        nextSearch.children;
        i += 1
      ) {
        people.push(
          emptyPassenger(
            "child"
          )
        );
      }

      for (
        let i = 0;
        i <
        nextSearch.infants;
        i += 1
      ) {
        people.push(
          emptyPassenger(
            "infant"
          )
        );
      }

      setPassengers(
        people
      );

      async function load() {
        if (!offerId) {
          setLoading(
            false
          );

          return;
        }

        const found =
          await activeTicketProvider.getOffer(
            nextSearch,
            offerId
          );

        setOffer(
          found
        );

        setLoading(
          false
        );
      }

      void load();
    },
    []
  );


  const total =
    useMemo(
      () => {
        if (
          !offer ||
          !search
        ) {
          return 0;
        }

        const weighted =
          search.adults +
          search.children *
            0.8 +
          search.infants *
            0.15;

        return Math.round(
          offer.price *
          weighted
        );
      },
      [
        offer,
        search,
      ]
    );


  function updatePassenger(
    index: number,
    patch:
      Partial<TicketPassenger>
  ) {
    setPassengers(
      (current) =>
        current.map(
          (
            passenger,
            currentIndex
          ) =>
            currentIndex ===
            index
              ? {
                  ...passenger,
                  ...patch,
                }
              : passenger
        )
    );
  }


  async function submit() {
    setError("");

    if (
      !search ||
      !offer
    ) {
      setError(
        "Sefer bilgisi bulunamadı."
      );

      return;
    }

    for (
      let i = 0;
      i <
      passengers.length;
      i += 1
    ) {
      const passenger =
        passengers[i];

      if (
        !passenger.firstName.trim() ||
        !passenger.lastName.trim() ||
        !passenger.birthDate ||
        !passenger.identityNumber.trim()
      ) {
        setError(
          `${i + 1}. yolcunun zorunlu bilgilerini tamamlayın.`
        );

        return;
      }
    }

    if (
      !email.trim() ||
      !phone.trim()
    ) {
      setError(
        "İletişim bilgilerini tamamlayın."
      );

      return;
    }

    if (!terms) {
      setError(
        "Rezervasyon ve sağlayıcı koşullarını kabul edin."
      );

      return;
    }

    setSaving(
      true
    );

    const hold =
      await activeTicketProvider.createHold(
        search,
        offer
      );

    const code =
      `TKT-${Date.now()
        .toString()
        .slice(-8)}`;

    const draft:
      TicketBookingDraft = {
        code,
        createdAt:
          new Date().toISOString(),

        search,
        offer,
        passengers,

        contact: {
          email:
            email.trim(),
          phone:
            phone.trim(),
        },

        hold,

        status:
          "provider_pending",
      };

    window.localStorage.setItem(
      `turobus_ticket_${code}`,
      JSON.stringify(
        draft
      )
    );

    setSaving(
      false
    );

    router.push(
      `/biletler/onay?code=${encodeURIComponent(
        code
      )}`
    );
  }


  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-[#040b12] text-white">
        <Navbar />

        <div className="mx-auto max-w-[1200px] px-5 pt-32">
          <div className="h-72 animate-pulse rounded-[30px] bg-white/[.04]" />
        </div>
      </main>
    );
  }


  if (
    !offer ||
    !search
  ) {
    return (
      <main className="min-h-screen bg-[#040b12] text-white">
        <Navbar />

        <div className="mx-auto max-w-[900px] px-5 pt-40 text-center">
          <h1 className="text-3xl font-black">
            Sefer bulunamadı.
          </h1>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/biletler"
              )
            }
            className="mt-6 rounded-xl bg-orange-500 px-6 py-4 font-black"
          >
            Bilet Aramaya Dön
          </button>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#040b12] text-white">
      <Navbar />

      <section className="border-b border-white/10 bg-[#07131f] px-5 pb-8 pt-28 lg:px-8">
        <div className="mx-auto max-w-[1250px]">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-400">
            <FaTicketAlt className="mr-2 inline" />
            BİLET REZERVASYONU
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Yolcu ve rezervasyon bilgileri
          </h1>
        </div>
      </section>

      <section className="px-5 py-10 lg:px-8">
        <div className="mx-auto grid max-w-[1250px] gap-7 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-[26px] border border-white/10 bg-[#07131f] p-6">
              <div className="text-sm font-black">
                Seçilen Sefer
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div>
                  <div className="text-3xl font-black">
                    {offer.departureTime}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {offer.origin}
                  </div>
                </div>

                <div className="text-center">
                  <FaArrowRight className="mx-auto text-orange-500" />

                  <div className="mt-2 text-[9px] text-slate-600">
                    {offer.carrierName}
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="text-3xl font-black">
                    {offer.arrivalTime}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {offer.destination}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="flex items-center gap-2 rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-bold text-slate-400">
                  <FaClock />
                  {offer.vehicleLabel}
                </span>

                {offer.baggageLabel && (
                  <span className="flex items-center gap-2 rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-bold text-slate-400">
                    <FaSuitcase />
                    {offer.baggageLabel}
                  </span>
                )}

                {offer.refundable && (
                  <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-[9px] font-bold text-emerald-300">
                    <FaCheckCircle />
                    İade edilebilir
                  </span>
                )}
              </div>
            </div>

            {passengers.map(
              (
                passenger,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="rounded-[26px] border border-white/10 bg-[#07131f] p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                      <FaUser />
                    </div>

                    <div>
                      <div className="font-black">
                        Yolcu {index + 1}
                      </div>

                      <div className="text-[9px] uppercase text-slate-600">
                        {passenger.type ===
                        "adult"
                          ? "Yetişkin"
                          : passenger.type ===
                              "child"
                            ? "Çocuk"
                            : "Bebek"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Ad
                      </span>

                      <input
                        value={
                          passenger.firstName
                        }
                        onChange={(event) =>
                          updatePassenger(
                            index,
                            {
                              firstName:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none focus:border-orange-500/50"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Soyad
                      </span>

                      <input
                        value={
                          passenger.lastName
                        }
                        onChange={(event) =>
                          updatePassenger(
                            index,
                            {
                              lastName:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none focus:border-orange-500/50"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Doğum tarihi
                      </span>

                      <input
                        type="date"
                        value={
                          passenger.birthDate
                        }
                        onChange={(event) =>
                          updatePassenger(
                            index,
                            {
                              birthDate:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Kimlik tipi
                      </span>

                      <select
                        value={
                          passenger.identityType
                        }
                        onChange={(event) =>
                          updatePassenger(
                            index,
                            {
                              identityType:
                                event.target.value as
                                  | "tc"
                                  | "passport",
                            }
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none"
                      >
                        <option value="tc">
                          T.C. Kimlik
                        </option>

                        <option value="passport">
                          Pasaport
                        </option>
                      </select>
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Kimlik / Pasaport No
                      </span>

                      <input
                        value={
                          passenger.identityNumber
                        }
                        onChange={(event) =>
                          updatePassenger(
                            index,
                            {
                              identityNumber:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Koltuk tercihi
                      </span>

                      <select
                        value={
                          passenger.seatPreference
                        }
                        onChange={(event) =>
                          updatePassenger(
                            index,
                            {
                              seatPreference:
                                event.target.value as
                                  | "any"
                                  | "window"
                                  | "aisle",
                            }
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none"
                      >
                        <option value="any">
                          Fark etmez
                        </option>

                        <option value="window">
                          Cam kenarı
                        </option>

                        <option value="aisle">
                          Koridor
                        </option>
                      </select>
                    </label>
                  </div>
                </div>
              )
            )}

            <div className="rounded-[26px] border border-white/10 bg-[#07131f] p-6">
              <div className="font-black">
                İletişim Bilgileri
              </div>

              <p className="mt-1 text-[10px] text-slate-500">
                Rezervasyon ve bilet bilgileri bu iletişim bilgilerine gönderilir.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    E-posta
                  </span>

                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                    Telefon
                  </span>

                  <input
                    type="tel"
                    value={
                      phone
                    }
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    placeholder="05xx xxx xx xx"
                    className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm outline-none"
                  />
                </label>
              </div>
            </div>
          </div>

          <aside>
            <div className="sticky top-28 rounded-[26px] border border-white/10 bg-[#07131f] p-6">
              <div className="text-[10px] font-black uppercase tracking-[.15em] text-orange-400">
                FİYAT ÖZETİ
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {passengers.length} yolcu
                </span>

                <span className="font-black">
                  {money(
                    total,
                    offer.currency
                  )}
                </span>
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="text-[9px] uppercase text-slate-600">
                  Toplam
                </div>

                <div className="mt-1 text-3xl font-black text-orange-400">
                  {money(
                    total,
                    offer.currency
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <FaShieldAlt className="mt-0.5 text-blue-300" />

                  <div>
                    <div className="text-xs font-black text-blue-200">
                      Sağlayıcıya hazır ön rezervasyon
                    </div>

                    <p className="mt-1 text-[9px] leading-5 text-blue-300/70">
                      Şu an gerçek bilet sağlayıcısı bağlı olmadığı için bu aşama canlı PNR veya ödeme oluşturmaz. Akış entegrasyon öncesi uçtan uca test edilir.
                    </p>
                  </div>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    terms
                  }
                  onChange={(event) =>
                    setTerms(
                      event.target.checked
                    )
                  }
                  className="mt-1"
                />

                <span className="text-[10px] leading-5 text-slate-500">
                  Rezervasyon bilgilerinin doğru olduğunu ve sağlayıcı bağlandığında ilgili taşıyıcının değişiklik / iptal koşullarının uygulanacağını kabul ediyorum.
                </span>
              </label>

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[10px] font-bold text-red-300">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  submit
                }
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-orange-500 px-5 text-sm font-black transition hover:bg-orange-600 disabled:opacity-50"
              >
                <FaLock />

                {saving
                  ? "Rezervasyon hazırlanıyor..."
                  : "Ön Rezervasyonu Oluştur"}
              </button>

              <div className="mt-4 text-center text-[9px] text-slate-600">
                Gerçek sağlayıcı bağlandığında aynı noktadan ödeme + PNR çalışacaktır.
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
