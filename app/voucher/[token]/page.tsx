"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";
import { generateQRCode } from "@/lib/qrcode";

type Voucher = {
  voucher_code: string;
  voucher_token: string;

  voucher_status: string;
  used_at: string | null;

  booking_code: string;
  customer_name: string;

  destination: string | null;

  service_name: string | null;
  item_type: string | null;

  service_date: string | null;
  service_time: string | null;

  quantity: number | null;

  customer_status: string | null;
  supplier_status: string | null;

  room_plan: Array<{
    adults: number;
    children: number;
  }>;

  guests: Array<{
    guest_order: number;
    guest_type: "adult" | "child";
    full_name: string;
    child_age: number | null;
    is_primary: boolean;
  }>;
};

function formatDate(
  value: string | null
) {
  if (!value) return "Planlanacak";

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
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

export default function PackageVoucherPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    String(
      params?.token || ""
    );

  const [
    voucher,
    setVoucher,
  ] =
    useState<Voucher | null>(
      null
    );

  const [qrCode, setQrCode] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadVoucher =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_voucher_public_v2",
            {
              p_token:
                token,
            }
          );

        if (
          error ||
          !data
        ) {
          setErrorMessage(
            error?.message ||
              "Voucher bulunamadı."
          );

          setLoading(false);
          return;
        }

        const loaded =
          data as Voucher;

        setVoucher(
          loaded
        );

        const verificationUrl =
          `${window.location.origin}` +
          `/voucher/${loaded.voucher_token}`;

        const generated =
          await generateQRCode(
            verificationUrl
          );

        setQrCode(
          generated
        );

        setLoading(false);
      },
      [token]
    );

  useEffect(() => {
    if (token) {
      void loadVoucher();
    }
  }, [
    token,
    loadVoucher,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Voucher hazırlanıyor...
      </main>
    );
  }

  if (!voucher) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="rounded-[28px] border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black">
            Voucher bulunamadı
          </h1>

          <p className="mt-4 text-red-300">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  const used =
    voucher.voucher_status ===
    "used";

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-900">
          <div className="bg-orange-500 p-7 text-black">
            <p className="text-xs font-black uppercase tracking-[0.3em]">
              TUROBUS VOUCHER
            </p>

            <h1 className="mt-3 text-3xl font-black">
              {voucher.service_name ||
                "Paket Hizmeti"}
            </h1>

            <p className="mt-2 font-bold">
              {
                voucher.voucher_code
              }
            </p>
          </div>

          <div className="p-7">
            <p className="text-xs text-slate-500">
              Misafir
            </p>

            <p className="mt-1 text-xl font-black">
              {
                voucher.customer_name
              }
            </p>

            <div className="mt-6 grid grid-cols-2 gap-5">
              <div>
                <p className="text-xs text-slate-500">
                  Rezervasyon
                </p>

                <p className="mt-1 font-black">
                  {
                    voucher.booking_code
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Destinasyon
                </p>

                <p className="mt-1 font-black">
                  {voucher.destination ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Tarih
                </p>

                <p className="mt-1 font-black">
                  {formatDate(
                    voucher.service_date
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Saat
                </p>

                <p className="mt-1 font-black">
                  {voucher.service_time
                    ? voucher.service_time.slice(
                        0,
                        5
                      )
                    : "Planlanacak"}
                </p>
              </div>
            </div>

            {
              voucher.room_plan &&
              voucher.room_plan.length >
                0 &&
              (
                <div className="mt-7 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">

                  <p className="text-xs font-black uppercase tracking-wider text-orange-300">
                    ODA DAĞILIMI
                  </p>

                  <div className="mt-4 space-y-3">

                    {
                      voucher.room_plan.map(
                        (
                          room,
                          index
                        ) => {

                          const occupancy =
                            Number(
                              room.adults ||
                              0
                            ) +
                            Number(
                              room.children ||
                              0
                            );

                          return (
                            <div
                              key={
                                index
                              }
                              className="flex items-center justify-between rounded-xl bg-slate-950 p-4"
                            >

                              <div>

                                <div className="font-black">
                                  {
                                    index +
                                    1
                                  }
                                  . Oda · {
                                    occupancy === 1
                                      ? "Single"
                                      : occupancy === 2
                                        ? "Double"
                                        : occupancy === 3
                                          ? "Triple"
                                          : `${occupancy} Kişilik`
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  {
                                    room.adults
                                  }
                                  {" yetişkin"}

                                  {
                                    room.children >
                                      0
                                      ? ` · ${room.children} çocuk`
                                      : ""
                                  }
                                </div>

                              </div>

                              <span className="font-black text-orange-300">
                                {
                                  occupancy
                                }
                                {" kişi"}
                              </span>

                            </div>
                          );
                        }
                      )
                    }

                  </div>

                </div>
              )
            }


            {
              voucher.guests &&
              voucher.guests.length >
                0 &&
              (
                <div className="mt-5">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    MİSAFİR LİSTESİ
                  </p>

                  <div className="mt-3 space-y-2">

                    {
                      voucher.guests.map(
                        guest => (
                          <div
                            key={
                              guest.guest_order
                            }
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 p-3"
                          >

                            <span className="font-bold">
                              {
                                guest.full_name
                              }
                            </span>

                            <span className="text-xs text-slate-400">
                              {
                                guest.guest_type ===
                                "child"
                                  ? `Çocuk${guest.child_age !== null ? ` · ${guest.child_age} yaş` : ""}`
                                  : "Yetişkin"
                              }
                            </span>

                          </div>
                        )
                      )
                    }

                  </div>

                </div>
              )
            }


            <div className="mt-7 flex justify-center rounded-[24px] bg-white p-6">
              {qrCode && (
                <img
                  src={qrCode}
                  alt="Voucher QR kodu"
                  className="h-[260px] w-[260px]"
                />
              )}
            </div>

            {used ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <p className="font-black text-emerald-400">
                  ✓ Voucher Kullanıldı
                </p>

                {voucher.used_at && (
                  <p className="mt-2 text-sm text-slate-400">
                    {new Intl.DateTimeFormat(
                      "tr-TR",
                      {
                        dateStyle:
                          "short",
                        timeStyle:
                          "short",
                      }
                    ).format(
                      new Date(
                        voucher.used_at
                      )
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5 text-center">
                <p className="font-black text-orange-300">
                  Aktif Voucher
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Hizmet kullanımı
                  sırasında QR kodu
                  görevliye gösterin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
