"use client";

export type RoomPlan = {
  id: string;

  adults: number;
  children: number;
};


type Props = {
  rooms: RoomPlan[];

  totalAdults: number;
  totalChildren: number;

  onChange:
    (rooms: RoomPlan[]) => void;
};


function createRoom(
  adults = 2,
  children = 0
): RoomPlan {
  return {
    id:
      crypto.randomUUID(),

    adults,

    children,
  };
}


export function
createAutomaticRoomPlan(
  adults: number,
  children: number
): RoomPlan[] {

  const result:
    RoomPlan[] =
    [];

  let remainingAdults =
    Math.max(
      adults,
      0
    );

  let remainingChildren =
    Math.max(
      children,
      0
    );


  while (
    remainingAdults >
    0
  ) {

    if (
      remainingAdults >=
      3
    ) {
      result.push(
        createRoom(
          3,
          0
        )
      );

      remainingAdults -=
        3;

      continue;
    }


    if (
      remainingAdults ===
      2
    ) {
      result.push(
        createRoom(
          2,
          0
        )
      );

      remainingAdults -=
        2;

      continue;
    }


    result.push(
      createRoom(
        1,
        0
      )
    );

    remainingAdults -=
      1;
  }


  if (
    result.length ===
    0
  ) {
    result.push(
      createRoom(
        1,
        0
      )
    );
  }


  let roomIndex =
    0;

  while (
    remainingChildren >
    0
  ) {

    const room =
      result[
        roomIndex %
        result.length
      ];

    room.children +=
      1;

    remainingChildren -=
      1;

    roomIndex +=
      1;
  }


  return result;
}


export default function
RoomPlanManager({
  rooms,
  totalAdults,
  totalChildren,
  onChange,
}: Props) {

  const assignedAdults =
    rooms.reduce(
      (
        sum,
        room
      ) =>
        sum +
        Number(
          room.adults ||
          0
        ),
      0
    );

  const assignedChildren =
    rooms.reduce(
      (
        sum,
        room
      ) =>
        sum +
        Number(
          room.children ||
          0
        ),
      0
    );


  const valid =
    assignedAdults ===
      totalAdults &&
    assignedChildren ===
      totalChildren;


  function updateRoom(
    id: string,
    patch:
      Partial<RoomPlan>
  ) {

    onChange(
      rooms.map(
        room =>
          room.id ===
          id
            ? {
                ...room,
                ...patch,
              }
            : room
      )
    );
  }


  function addRoom() {

    onChange([
      ...rooms,
      createRoom(
        1,
        0
      ),
    ]);
  }


  function removeRoom(
    id: string
  ) {

    if (
      rooms.length <=
      1
    ) {
      return;
    }

    onChange(
      rooms.filter(
        room =>
          room.id !==
          id
      )
    );
  }


  function autoPlan() {

    onChange(
      createAutomaticRoomPlan(
        totalAdults,
        totalChildren
      )
    );
  }


  return (
    <div>

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>

          <h3 className="text-lg font-black">
            Oda Dağılımı
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Misafirleri single, double ve triple odalara dağıtın.
          </p>

        </div>


        <div
          className={`rounded-xl px-4 py-3 text-sm font-black ${
            valid
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-amber-500/10 text-amber-300"
          }`}
        >

          {
            rooms.length
          }
          {" oda · "}

          {
            assignedAdults
          }
          /
          {
            totalAdults
          }
          {" yetişkin · "}

          {
            assignedChildren
          }
          /
          {
            totalChildren
          }
          {" çocuk"}

        </div>

      </div>


      <div className="mt-4 flex flex-wrap gap-2">

        <button
          type="button"
          onClick={
            autoPlan
          }
          className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-300"
        >
          Otomatik Oda Dağıt
        </button>


        <button
          type="button"
          onClick={
            addRoom
          }
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
        >
          + Oda Ekle
        </button>

      </div>


      <div className="mt-5 space-y-3">

        {
          rooms.map(
            (
              room,
              index
            ) => {

              const occupancy =
                room.adults +
                room.children;

              return (
                <div
                  key={
                    room.id
                  }
                  className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 md:grid-cols-[1fr_150px_150px_auto]"
                >

                  <div>

                    <div className="font-black">
                      {
                        index +
                        1
                      }
                      . Oda
                    </div>

                    <div className="mt-1 text-xs text-slate-500">

                      {
                        occupancy ===
                          1
                          ? "Single"
                          : occupancy ===
                            2
                            ? "Double"
                            : occupancy ===
                              3
                              ? "Triple"
                              : `${occupancy} kişilik`
                      }

                    </div>

                  </div>


                  <label>

                    <span className="mb-2 block text-xs font-black uppercase text-slate-500">
                      Yetişkin
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={
                        room.adults
                      }
                      onChange={
                        event =>
                          updateRoom(
                            room.id,
                            {
                              adults:
                                Math.max(
                                  0,
                                  Number(
                                    event.target.value
                                  ) || 0
                                ),
                            }
                          )
                      }
                      className="input"
                    />

                  </label>


                  <label>

                    <span className="mb-2 block text-xs font-black uppercase text-slate-500">
                      Çocuk
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={
                        room.children
                      }
                      onChange={
                        event =>
                          updateRoom(
                            room.id,
                            {
                              children:
                                Math.max(
                                  0,
                                  Number(
                                    event.target.value
                                  ) || 0
                                ),
                            }
                          )
                      }
                      className="input"
                    />

                  </label>


                  <button
                    type="button"
                    disabled={
                      rooms.length <=
                      1
                    }
                    onClick={
                      () =>
                        removeRoom(
                          room.id
                        )
                    }
                    className="self-end rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 disabled:opacity-30"
                  >
                    Sil
                  </button>

                </div>
              );
            }
          )
        }

      </div>


      {
        !valid &&
        (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">

            Oda dağılımındaki kişi sayısı paket misafir sayısıyla aynı olmalıdır.

          </div>
        )
      }

    </div>
  );
}
