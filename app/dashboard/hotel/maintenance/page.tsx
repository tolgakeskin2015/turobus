"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createMaintenanceRequest,
  listMaintenanceRequests,
  listMaintenanceRooms,
  updateMaintenanceStatus,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceRequest,
  type MaintenanceRoom,
  type MaintenanceStatus,
} from "@/lib/hotel/maintenance/maintenance-service";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import { supabase } from "@/lib/supabase";

type HotelOption = {
  id: string;
  name: string;
};

const priorityLabels: Record<
  MaintenancePriority,
  string
> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

const statusLabels: Record<
  MaintenanceStatus,
  string
> = {
  open: "Açık",
  assigned: "Atandı",
  in_progress: "İşlemde",
  waiting_parts: "Parça Bekliyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const categoryLabels: Record<
  MaintenanceCategory,
  string
> = {
  general: "Genel",
  electrical: "Elektrik",
  plumbing: "Tesisat",
  air_conditioning: "Klima",
  furniture: "Mobilya",
  bathroom: "Banyo",
  housekeeping: "Housekeeping",
  technical: "Teknik",
  safety: "Güvenlik",
  other: "Diğer",
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value ?? 0));
}

export default function MaintenancePage() {
  const [companyId, setCompanyId] = useState("");
  const [hotelId, setHotelId] = useState("");

  const [hotels, setHotels] = useState<
    HotelOption[]
  >([]);

  const [rooms, setRooms] = useState<
    MaintenanceRoom[]
  >([]);

  const [requests, setRequests] = useState<
    MaintenanceRequest[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [roomId, setRoomId] = useState("");

  const [category, setCategory] =
    useState<MaintenanceCategory>("general");

  const [priority, setPriority] =
    useState<MaintenancePriority>("normal");

  const [estimatedCost, setEstimatedCost] =
    useState("0");

  const load = useCallback(
    async (
      resolvedCompanyId?: string,
      resolvedHotelId?: string
    ) => {
      try {
        setLoading(true);
        setErrorMessage("");

        let cId =
          resolvedCompanyId || companyId;

        let hId =
          resolvedHotelId || hotelId;

        if (!cId) {
          const user = await getCurrentUser();

          if (!user) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(user.id);

          if (!membership) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }

          cId = membership.company_id;

          const { data, error } = await supabase
            .from("hotels")
            .select("id, name")
            .eq("company_id", cId)
            .order("created_at", {
              ascending: true,
            });

          if (error) throw error;

          const hotelList =
            (data ?? []) as HotelOption[];

          if (!hotelList.length) {
            throw new Error(
              "Otel bulunamadı."
            );
          }

          setHotels(hotelList);

          hId = hotelList[0].id;

          setCompanyId(cId);
          setHotelId(hId);
        }

        if (!cId || !hId) return;

        const [maintenanceData, roomData] =
          await Promise.all([
            listMaintenanceRequests(
              cId,
              hId
            ),
            listMaintenanceRooms(
              cId,
              hId
            ),
          ]);

        setRequests(maintenanceData);
        setRooms(roomData);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Veriler yüklenemedi."
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

  async function changeHotel(
    nextHotelId: string
  ) {
    setHotelId(nextHotelId);
    setRoomId("");

    await load(
      companyId,
      nextHotelId
    );
  }

  async function createRequest() {
    try {
      setMessage("");
      setErrorMessage("");

      if (!title.trim()) {
        throw new Error(
          "Başlık girmen gerekiyor."
        );
      }

      await createMaintenanceRequest({
        companyId,
        hotelId,
        roomId: roomId || null,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        estimatedCost: Number(
          estimatedCost || 0
        ),
      });

      setTitle("");
      setDescription("");
      setRoomId("");
      setEstimatedCost("0");
      setCategory("general");
      setPriority("normal");

      setMessage(
        "Bakım kaydı oluşturuldu."
      );

      await load(companyId, hotelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kayıt oluşturulamadı."
      );
    }
  }

  async function changeStatus(
    request: MaintenanceRequest,
    status: MaintenanceStatus
  ) {
    try {
      let actualCost: number | null =
        undefined as unknown as null;

      if (status === "completed") {
        const entered = window.prompt(
          "Gerçek maliyet (TL)",
          String(
            request.actual_cost || 0
          )
        );

        if (entered === null) return;

        actualCost =
          Number(entered || 0);
      }

      await updateMaintenanceStatus({
        maintenanceId: request.id,
        status,
        actualCost,
      });

      setMessage(
        `${request.request_no} güncellendi.`
      );

      await load(companyId, hotelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Durum güncellenemedi."
      );
    }
  }

  const stats = useMemo(() => {
    return {
      open: requests.filter(
        (item) =>
          item.status === "open" ||
          item.status === "assigned"
      ).length,

      working: requests.filter(
        (item) =>
          item.status === "in_progress" ||
          item.status === "waiting_parts"
      ).length,

      urgent: requests.filter(
        (item) =>
          item.priority === "urgent" &&
          item.status !== "completed" &&
          item.status !== "cancelled"
      ).length,

      cost: requests.reduce(
        (total, item) =>
          total +
          Number(
            item.actual_cost ||
              item.estimated_cost ||
              0
          ),
        0
      ),
    };
  }, [requests]);

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS HOTEL PMS
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Bakım & Arıza
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Oda ve tesis arızalarını,
              öncelikleri ve maliyetleri yönet.
            </p>
          </div>

          <select
            value={hotelId}
            onChange={(event) =>
              void changeHotel(
                event.target.value
              )
            }
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold"
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
        </header>

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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Açık İş"
            value={String(stats.open)}
          />

          <Stat
            label="İşlemde"
            value={String(stats.working)}
          />

          <Stat
            label="Acil"
            value={String(stats.urgent)}
          />

          <Stat
            label="Maliyet"
            value={money(stats.cost)}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              Yeni Kayıt
            </h2>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Örn: Klima çalışmıyor"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <select
                value={roomId}
                onChange={(event) =>
                  setRoomId(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              >
                <option value="">
                  Genel alan
                </option>

                {rooms.map((room) => (
                  <option
                    key={room.id}
                    value={room.id}
                  >
                    Oda {room.room_number}
                  </option>
                ))}
              </select>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target
                      .value as MaintenanceCategory
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              >
                {Object.entries(
                  categoryLabels
                ).map(([key, label]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target
                      .value as MaintenancePriority
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              >
                {Object.entries(
                  priorityLabels
                ).map(([key, label]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                value={estimatedCost}
                onChange={(event) =>
                  setEstimatedCost(
                    event.target.value
                  )
                }
                placeholder="Tahmini maliyet"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <textarea
                rows={4}
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Açıklama"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <button
                type="button"
                onClick={() =>
                  void createRequest()
                }
                className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black"
              >
                Kayıt Oluştur
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">
                Bakım İşleri
              </h2>

              <span className="text-sm text-slate-500">
                {requests.length} kayıt
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500">
                Yükleniyor...
              </div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                Henüz kayıt yok.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {requests.map((request) => {
                  const room = rooms.find(
                    (item) =>
                      item.id ===
                      request.room_id
                  );

                  return (
                    <article
                      key={request.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row">
                        <div>
                          <p className="text-xs font-black text-orange-400">
                            {request.request_no}
                          </p>

                          <h3 className="mt-2 text-lg font-black">
                            {request.title}
                          </h3>

                          <p className="mt-2 text-sm text-slate-400">
                            {room
                              ? `Oda ${room.room_number}`
                              : "Genel Alan"}
                            {" · "}
                            {
                              priorityLabels[
                                request.priority
                              ]
                            }
                            {" · "}
                            {
                              categoryLabels[
                                request.category
                              ]
                            }
                          </p>

                          {request.description && (
                            <p className="mt-3 text-sm text-slate-500">
                              {
                                request.description
                              }
                            </p>
                          )}

                          <div className="mt-4 flex gap-5 text-xs text-slate-500">
                            <span>
                              Tahmini:{" "}
                              {money(
                                request.estimated_cost
                              )}
                            </span>

                            <span>
                              Gerçek:{" "}
                              {money(
                                request.actual_cost
                              )}
                            </span>
                          </div>
                        </div>

                        <select
                          value={request.status}
                          onChange={(event) =>
                            void changeStatus(
                              request,
                              event.target
                                .value as MaintenanceStatus
                            )
                          }
                          className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 font-bold"
                        >
                          {Object.entries(
                            statusLabels
                          ).map(
                            ([key, label]) => (
                              <option
                                key={key}
                                value={key}
                              >
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}
