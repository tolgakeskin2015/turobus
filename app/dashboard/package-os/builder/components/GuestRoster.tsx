"use client";

export type Guest = {
  id: string;

  guestType:
    | "adult"
    | "child";

  fullName: string;

  phone: string;

  email: string;

  address: string;

  childAge:
    number | null;
};

type Props = {
  guests: Guest[];

  adults: number;

  children: number;

  onChange:
    (guests: Guest[]) => void;
};

function blankGuest(
  guestType:
    | "adult"
    | "child"
): Guest {
  return {
    id:
      crypto.randomUUID(),

    guestType,

    fullName:
      "",

    phone:
      "",

    email:
      "",

    address:
      "",

    childAge:
      guestType ===
        "child"
        ? 0
        : null,
  };
}

export function createInitialGuests(
  adults: number,
  children: number
) {
  const result:
    Guest[] =
    [];

  for (
    let index = 0;
    index < adults;
    index += 1
  ) {
    result.push(
      blankGuest(
        "adult"
      )
    );
  }

  for (
    let index = 0;
    index < children;
    index += 1
  ) {
    result.push(
      blankGuest(
        "child"
      )
    );
  }

  return result;
}

export default function GuestRoster({
  guests,
  adults,
  children,
  onChange,
}: Props) {
  const expectedCount =
    Math.max(
      adults +
      children,
      1
    );

  function updateGuest(
    id: string,
    patch:
      Partial<Guest>
  ) {
    onChange(
      guests.map(
        guest =>
          guest.id ===
          id
            ? {
                ...guest,
                ...patch,
              }
            : guest
      )
    );
  }

  function syncGuestCount() {
    const next =
      [...guests];

    const desiredTypes:
      Array<
        "adult" |
        "child"
      > =
      [];

    for (
      let index = 0;
      index < adults;
      index += 1
    ) {
      desiredTypes.push(
        "adult"
      );
    }

    for (
      let index = 0;
      index < children;
      index += 1
    ) {
      desiredTypes.push(
        "child"
      );
    }

    while (
      next.length <
      expectedCount
    ) {
      next.push(
        blankGuest(
          desiredTypes[
            next.length
          ] ||
          "adult"
        )
      );
    }

    if (
      next.length >
      expectedCount
    ) {
      const removable =
        next
          .slice(
            expectedCount
          )
          .every(
            guest =>
              !guest.fullName
                .trim() &&
              !guest.phone
                .trim() &&
              !guest.email
                .trim() &&
              !guest.address
                .trim()
          );

      if (!removable) {
        window.alert(
          "Kişi sayısı azaltıldı ancak silinecek misafir satırlarında bilgi var. Önce fazla misafir bilgilerini temizleyin."
        );

        return;
      }

      next.splice(
        expectedCount
      );
    }

    next.forEach(
      (
        guest,
        index
      ) => {
        guest.guestType =
          desiredTypes[
            index
          ] ||
          "adult";
      }
    );

    onChange(
      next
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">
            Misafir Bilgileri
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Paket kişi sayısı ile misafir kayıt sayısı aynı olmalıdır.
          </p>
        </div>

        <div
          className={`rounded-xl px-4 py-3 text-sm font-black ${
            guests.length ===
            expectedCount
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-amber-500/10 text-amber-300"
          }`}
        >
          {guests.length}
          {" / "}
          {expectedCount}
          {" Misafir"}
        </div>
      </div>

      {guests.length !==
        expectedCount && (
        <button
          type="button"
          onClick={
            syncGuestCount
          }
          className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-300"
        >
          Misafir Sayısını Paketle Eşitle
        </button>
      )}

      <div className="mt-5 space-y-4">
        {guests.map(
          (
            guest,
            index
          ) => (
            <div
              key={
                guest.id
              }
              className={`rounded-2xl border p-5 ${
                index === 0
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-white/10 bg-slate-950/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black">
                    {index ===
                    0
                      ? "Ana Misafir"
                      : `${index + 1}. Misafir`}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {guest.guestType ===
                    "child"
                      ? "Çocuk"
                      : "Yetişkin"}
                  </div>
                </div>

                {index ===
                  0 && (
                  <span className="rounded-lg bg-orange-500 px-3 py-2 text-[10px] font-black text-white">
                    ANA İLETİŞİM
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Ad Soyad *
                  </span>

                  <input
                    value={
                      guest.fullName
                    }
                    onChange={
                      event =>
                        updateGuest(
                          guest.id,
                          {
                            fullName:
                              event.target.value,
                          }
                        )
                    }
                    placeholder="Ad Soyad"
                    className="input"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Telefon
                    {index ===
                    0
                      ? " *"
                      : ""}
                  </span>

                  <input
                    type="tel"
                    value={
                      guest.phone
                    }
                    onChange={
                      event =>
                        updateGuest(
                          guest.id,
                          {
                            phone:
                              event.target.value,
                          }
                        )
                    }
                    placeholder="0532 000 00 00"
                    className="input"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    E-posta
                  </span>

                  <input
                    type="email"
                    value={
                      guest.email
                    }
                    onChange={
                      event =>
                        updateGuest(
                          guest.id,
                          {
                            email:
                              event.target.value,
                          }
                        )
                    }
                    placeholder="misafir@email.com"
                    className="input"
                  />
                </label>

                {
                  guest.guestType ===
                    "child" &&
                  (
                    <label>
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                        Çocuk Yaşı *
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="17"
                        value={
                          guest.childAge ??
                          0
                        }
                        onChange={
                          event =>
                            updateGuest(
                              guest.id,
                              {
                                childAge:
                                  Math.max(
                                    0,
                                    Math.min(
                                      17,
                                      Number(
                                        event.target.value
                                      ) || 0
                                    )
                                  ),
                              }
                            )
                        }
                        className="input"
                      />
                    </label>
                  )
                }


                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Adres
                  </span>

                  <input
                    value={
                      guest.address
                    }
                    onChange={
                      event =>
                        updateGuest(
                          guest.id,
                          {
                            address:
                              event.target.value,
                          }
                        )
                    }
                    placeholder="İlçe / İl / Açık adres"
                    className="input"
                  />
                </label>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
