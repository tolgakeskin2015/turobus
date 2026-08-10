"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addCashierMovement,
  closeCashierShift,
  getOpenCashierShift,
  listCashierMovements,
  listCashierShifts,
  openCashierShift,
  type CashierMovement,
  type CashierShift,
} from "@/lib/hotel/cashier/cashier-service";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import { supabase } from "@/lib/supabase";

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value ?? 0));
}

type CashierHotel = {
  id: string;
  name: string;
};

export default function CashierPage() {
  const [companyId, setCompanyId] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [hotels, setHotels] = useState<CashierHotel[]>([]);

  const [shift, setShift] =
    useState<CashierShift | null>(null);

  const [shifts, setShifts] =
    useState<CashierShift[]>([]);

  const [movements, setMovements] =
    useState<CashierMovement[]>([]);

  const [openingCash, setOpeningCash] =
    useState("0");

  const [countedCash, setCountedCash] =
    useState("");

  const [movementType, setMovementType] =
    useState<"cash_in" | "cash_out">("cash_in");

  const [movementAmount, setMovementAmount] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const load = useCallback(
    async (
      resolvedCompanyId?: string,
      resolvedHotelId?: string
    ) => {
      try {
        setLoading(true);
        setErrorMessage("");

        let cId =
          resolvedCompanyId ?? companyId;

        let hId =
          resolvedHotelId ?? hotelId;

        if (!cId || !hId) {
          const user = await getCurrentUser();

          if (!user) {
            throw new Error(
              "Oturum açmış kullanıcı bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(user.id);

          if (!membership) {
            throw new Error(
              "Aktif firma üyeliği bulunamadı."
            );
          }

          cId = membership.company_id;

          const { data: hotelList, error: hotelError } =
            await supabase
              .from("hotels")
              .select("id, name")
              .eq("company_id", cId)
              .order("created_at", {
                ascending: true,
              });

          if (hotelError) {
            throw hotelError;
          }

          const availableHotels =
            (hotelList ?? []) as CashierHotel[];

          if (!availableHotels.length) {
            throw new Error(
              "Bu firmaya bağlı otel bulunamadı."
            );
          }

          setHotels(availableHotels);

          hId =
            hId &&
            availableHotels.some(
              (item) => item.id === hId
            )
              ? hId
              : availableHotels[0].id;

          setCompanyId(cId);
          setHotelId(hId);
        }

        if (!cId || !hId) {
          throw new Error(
            "Şirket veya otel bilgisi bulunamadı."
          );
        }

        const openShift =
          await getOpenCashierShift(
            cId,
            hId
          );

        setShift(openShift);

        const shiftList =
          await listCashierShifts(
            cId,
            hId,
            30
          );

        setShifts(shiftList);

        if (openShift) {
          const movementList =
            await listCashierMovements(
              openShift.id
            );

          setMovements(movementList);
        } else {
          setMovements([]);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Kasa bilgileri alınamadı."
        );
      } finally {
        setLoading(false);
      }
    },
    [companyId, hotelId]
  );

  useEffect(() => {
    void load();
  }, []);

  async function handleOpenShift() {
    try {
      setMessage("");
      setErrorMessage("");

      if (!companyId || !hotelId) return;

      const created =
        await openCashierShift({
          companyId,
          hotelId,
          openingCash:
            Number(openingCash || 0),
          currency: "TRY",
        });

      setShift(created);
      setMessage(
        `${created.shift_no} vardiyası açıldı.`
      );

      await load(companyId, hotelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Vardiya açılamadı."
      );
    }
  }

  async function handleMovement() {
    try {
      setMessage("");
      setErrorMessage("");

      if (!shift) return;

      const amount =
        Number(movementAmount);

      if (!amount || amount <= 0) {
        throw new Error(
          "Geçerli bir tutar gir."
        );
      }

      await addCashierMovement({
        shiftId: shift.id,
        movementType,
        amount,
        description:
          description || null,
      });

      setMovementAmount("");
      setDescription("");

      setMessage(
        movementType === "cash_in"
          ? "Nakit giriş kaydedildi."
          : "Nakit çıkış kaydedildi."
      );

      await load(companyId, hotelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kasa hareketi eklenemedi."
      );
    }
  }

  async function handleCloseShift() {
    try {
      setMessage("");
      setErrorMessage("");

      if (!shift) return;

      const counted =
        Number(countedCash);

      if (
        countedCash.trim() === "" ||
        Number.isNaN(counted)
      ) {
        throw new Error(
          "Sayılan kasa tutarını gir."
        );
      }

      const closed =
        await closeCashierShift({
          shiftId: shift.id,
          countedCash: counted,
        });

      setMessage(
        `${closed.shift_no} vardiyası kapatıldı. Kasa farkı: ${money(
          closed.cash_difference
        )}`
      );

      setCountedCash("");

      await load(companyId, hotelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Vardiya kapatılamadı."
      );
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-slate-300">
        Kasa bilgileri yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
            Turobus Hotel PMS
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Kasa & Vardiya
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Açılış bakiyesi, tahsilatlar, nakit
            hareketleri, kasa sayımı ve vardiya
            kapanışını tek ekrandan yönet.
          </p>

          {hotels.length > 0 && (
            <div className="mt-5 max-w-md">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Otel
              </label>

              <select
                value={hotelId}
                onChange={(e) => {
                  const nextHotelId = e.target.value;

                  setHotelId(nextHotelId);
                  setShift(null);
                  setMovements([]);
                  setMessage("");
                  setErrorMessage("");

                  void load(
                    companyId,
                    nextHotelId
                  );
                }}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold text-white outline-none"
              >
                {hotels.map((hotel) => (
                  <option
                    key={hotel.id}
                    value={hotel.id}
                  >
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {message && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        {!shift ? (
          <section className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              Yeni Vardiya Aç
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-slate-400">
                  Açılış Kasası
                </label>

                <input
                  value={openingCash}
                  onChange={(e) =>
                    setOpeningCash(
                      e.target.value
                    )
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    void handleOpenShift()
                  }
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black"
                >
                  Vardiyayı Aç
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Card
                title="Vardiya"
                value={shift.shift_no}
              />

              <Card
                title="Açılış Kasası"
                value={money(
                  shift.opening_cash
                )}
              />

              <Card
                title="Beklenen Kasa"
                value={money(
                  shift.expected_cash
                )}
              />

              <Card
                title="Durum"
                value="Açık"
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-black">
                  Kasa Hareketi
                </h2>

                <div className="mt-5 space-y-4">
                  <select
                    value={movementType}
                    onChange={(e) =>
                      setMovementType(
                        e.target.value as
                          | "cash_in"
                          | "cash_out"
                      )
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option value="cash_in">
                      Nakit Giriş
                    </option>
                    <option value="cash_out">
                      Nakit Çıkış
                    </option>
                  </select>

                  <input
                    value={movementAmount}
                    onChange={(e) =>
                      setMovementAmount(
                        e.target.value
                      )
                    }
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Tutar"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />

                  <input
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    placeholder="Açıklama"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void handleMovement()
                    }
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-black text-black"
                  >
                    Hareket Ekle
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-black">
                  Vardiya Kapat
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Kasadaki gerçek nakdi say ve
                  sisteme gir.
                </p>

                <input
                  value={countedCash}
                  onChange={(e) =>
                    setCountedCash(
                      e.target.value
                    )
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sayılan kasa"
                  className="mt-5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                />

                <button
                  type="button"
                  onClick={() =>
                    void handleCloseShift()
                  }
                  className="mt-4 w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-300"
                >
                  Vardiyayı Kapat
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-black">
                Açık Vardiya Hareketleri
              </h2>

              <div className="mt-5 space-y-3">
                {movements.length === 0 && (
                  <div className="text-sm text-slate-500">
                    Henüz kasa hareketi yok.
                  </div>
                )}

                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div>
                      <div className="font-bold">
                        {movement.description ??
                          movement.movement_type}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {
                          movement.movement_type
                        }
                      </div>
                    </div>

                    <div className="font-black">
                      {money(
                        movement.amount
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-black">
            Son Vardiyalar
          </h2>

          <div className="mt-5 space-y-3">
            {shifts.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-5"
              >
                <div>
                  <div className="text-xs text-slate-500">
                    Vardiya
                  </div>
                  <div className="font-bold">
                    {item.shift_no}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Açılış
                  </div>
                  <div className="font-bold">
                    {money(
                      item.opening_cash
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Beklenen
                  </div>
                  <div className="font-bold">
                    {money(
                      item.expected_cash
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Sayılan
                  </div>
                  <div className="font-bold">
                    {item.counted_cash === null
                      ? "-"
                      : money(
                          item.counted_cash
                        )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Fark
                  </div>
                  <div className="font-bold">
                    {item.cash_difference === null
                      ? "-"
                      : money(
                          item.cash_difference
                        )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </div>

      <div className="mt-3 text-xl font-black">
        {value}
      </div>
    </div>
  );
}
