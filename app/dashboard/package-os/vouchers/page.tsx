"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type VoucherRow = {
  id: string;

  voucher_code: string;
  qr_token: string;

  status:
    | "active"
    | "used"
    | "cancelled"
    | "expired";

  used_at: string | null;

  package_bookings:
    | {
        booking_code: string;
        customer_name: string;
      }
    | {
        booking_code: string;
        customer_name: string;
      }[]
    | null;

  package_booking_items:
    | {
        name: string;
        service_date: string | null;
        service_time: string | null;
        customer_status: string;
      }
    | {
        name: string;
        service_date: string | null;
        service_time: string | null;
        customer_status: string;
      }[]
    | null;
};

function relationOne<T>(
  value: T | T[] | null
) {
  if (
    Array.isArray(value)
  ) {
    return value[0] || null;
  }

  return value;
}

export default function PackageVoucherCenter() {
  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    vouchers,
    setVouchers,
  ] =
    useState<VoucherRow[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [
    redeemToken,
    setRedeemToken,
  ] = useState("");

  const [redeeming, setRedeeming] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadVouchers =
    useCallback(
      async (
        companyId: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "package_vouchers"
            )
            .select(`
              id,
              voucher_code,
              qr_token,
              status,
              used_at,
              package_bookings (
                booking_code,
                customer_name
              ),
              package_booking_items (
                name,
                service_date,
                service_time,
                customer_status
              )
            `)
            .eq(
              "company_id",
              companyId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        if (error) {
          throw new Error(
            error.message
          );
        }

        setVouchers(
          (data ?? []) as VoucherRow[]
        );
      },
      []
    );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setErrorMessage(
            "Kullanıcı oturumu bulunamadı."
          );
          return;
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );
          return;
        }

        setMembership(
          currentMembership
        );

        await loadVouchers(
          currentMembership.company_id
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Voucherlar yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadVouchers]);

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            "tr-TR"
          );

      if (!query) {
        return vouchers;
      }

      return vouchers.filter(
        (voucher) => {
          const booking =
            relationOne(
              voucher.package_bookings
            );

          const item =
            relationOne(
              voucher.package_booking_items
            );

          return [
            voucher.voucher_code,
            booking?.booking_code,
            booking?.customer_name,
            item?.name,
            voucher.status,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            );
        }
      );
    }, [
      vouchers,
      search,
    ]);

  async function redeem(
    token?: string
  ) {
    const value =
      String(
        token ||
        redeemToken
      )
        .trim()
        .replace(
          /^.*\/voucher\//,
          ""
        );

    if (!value) {
      setErrorMessage(
        "QR token veya voucher bağlantısı girin."
      );
      return;
    }

    setRedeeming(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "redeem_package_voucher",
          {
            p_token:
              value,
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const result =
        data as {
          voucher_code?: string;
          service_name?: string;
          already_used?: boolean;
        };

      setSuccessMessage(
        result.already_used
          ? `${result.voucher_code ?? "Voucher"} daha önce kullanılmış.`
          : `${result.service_name ?? "Hizmet"} başarıyla kullanıldı.`
      );

      setRedeemToken("");

      if (membership) {
        await loadVouchers(
          membership.company_id
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Voucher doğrulanamadı."
      );
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Voucherlar yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Voucher & QR Merkezi
            </h1>

            <p className="mt-3 text-slate-400">
              Paket hizmetlerini QR
              veya güvenli voucher
              tokenı ile doğrulayın.
            </p>
          </div>

          <Link
            href="/dashboard/package-os"
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
          >
            Paket Merkezi
          </Link>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            {successMessage}
          </div>
        )}

        <section className="mt-7 rounded-[28px] border border-orange-500/20 bg-slate-900 p-6">
          <p className="text-xs font-black uppercase tracking-wider text-orange-400">
            HİZMET DOĞRULAMA
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Voucher Kullan
          </h2>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              value={redeemToken}
              onChange={(event) =>
                setRedeemToken(
                  event.target.value
                )
              }
              placeholder="QR token veya /voucher/... bağlantısı"
              className="flex-1 rounded-xl border border-white/10 bg-slate-950 p-4"
            />

            <button
              type="button"
              disabled={redeeming}
              onClick={() =>
                void redeem()
              }
              className="rounded-xl bg-orange-500 px-6 py-4 font-black text-black disabled:opacity-50"
            >
              {redeeming
                ? "Doğrulanıyor..."
                : "Hizmeti Kullan"}
            </button>
          </div>
        </section>

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Voucher, müşteri, rezervasyon veya hizmet ara..."
          className="mt-7 w-full rounded-xl border border-white/10 bg-slate-900 p-4"
        />

        <div className="mt-5 overflow-x-auto rounded-[28px] border border-white/10 bg-slate-900">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">
                  Voucher
                </th>

                <th className="p-4">
                  Müşteri
                </th>

                <th className="p-4">
                  Hizmet
                </th>

                <th className="p-4">
                  Tarih
                </th>

                <th className="p-4">
                  Durum
                </th>

                <th className="p-4">
                  İşlem
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (voucher) => {
                  const booking =
                    relationOne(
                      voucher.package_bookings
                    );

                  const item =
                    relationOne(
                      voucher.package_booking_items
                    );

                  return (
                    <tr
                      key={voucher.id}
                      className="border-t border-white/5"
                    >
                      <td className="p-4 font-black">
                        {
                          voucher.voucher_code
                        }
                      </td>

                      <td className="p-4">
                        <p className="font-bold">
                          {
                            booking?.customer_name ??
                            "-"
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            booking?.booking_code ??
                            "-"
                          }
                        </p>
                      </td>

                      <td className="p-4 font-bold">
                        {
                          item?.name ??
                          "-"
                        }
                      </td>

                      <td className="p-4 text-slate-400">
                        {
                          item?.service_date ??
                          "Planlanacak"
                        }

                        {item?.service_time
                          ? ` · ${item.service_time.slice(
                              0,
                              5
                            )}`
                          : ""}
                      </td>

                      <td className="p-4">
                        <span
                          className={
                            voucher.status ===
                            "used"
                              ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400"
                              : "rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-400"
                          }
                        >
                          {voucher.status ===
                          "used"
                            ? "Kullanıldı"
                            : voucher.status ===
                                "active"
                              ? "Aktif"
                              : voucher.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          <a
                            href={`/voucher/${voucher.qr_token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black"
                          >
                            Aç
                          </a>

                          {voucher.status ===
                            "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                void redeem(
                                  voucher.qr_token
                                )
                              }
                              className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-black"
                            >
                              Kullan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
