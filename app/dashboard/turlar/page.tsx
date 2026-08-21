"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaBus,
  FaCalendarAlt,
  FaChartLine,
  FaEdit,
  FaEye,
  FaExclamationTriangle,
  FaFilter,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPlane,
  FaPlus,
  FaSearch,
  FaThLarge,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type TransportMode =
  | "air"
  | "bus"
  | "other";


type OperationStatus =
  | "draft"
  | "sales"
  | "confirmed"
  | "preparing"
  | "ready"
  | "active"
  | "returning"
  | "completed"
  | "cancelled";


type Tour = {
  id: string;
  slug: string;
  title: string;
  city: string;
  district: string | null;
  category: string | null;
  duration: string | null;
  adult_price: number;
  old_price: number;
  agency_name: string | null;
  status: string;
  created_at: string;

  transport_mode:
    TransportMode;

  departure_city:
    string | null;

  arrival_city:
    string | null;

  capacity:
    number | null;

  operation_status:
    OperationStatus;

  departure_date:
    string | null;

  return_date:
    string | null;
};


function transportLabel(
  value:
    TransportMode
) {
  if (
    value ===
    "air"
  ) {
    return "Uçaklı";
  }

  if (
    value ===
    "bus"
  ) {
    return "Otobüslü";
  }

  return "Belirlenmedi";
}


function operationLabel(
  value:
    OperationStatus
) {
  const labels:
    Record<
      OperationStatus,
      string
    > = {
      draft:
        "Taslak",

      sales:
        "Satışta",

      confirmed:
        "Kesinleşti",

      preparing:
        "Hazırlanıyor",

      ready:
        "Çıkışa Hazır",

      active:
        "Tur Devam Ediyor",

      returning:
        "Dönüş",

      completed:
        "Tamamlandı",

      cancelled:
        "İptal",
    };

  return labels[value];
}


function operationClass(
  value:
    OperationStatus
) {
  if (
    value ===
    "active"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    value ===
      "ready" ||
    value ===
      "completed"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value ===
      "preparing" ||
    value ===
      "confirmed"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/[.04] text-slate-400";
}


function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(
    date
  );
}


function money(
  value:
    number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "TRY",

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value ||
      0
    )
  );
}


export default function DashboardToursPage() {
  const [
    tours,
    setTours,
  ] =
    useState<Tour[]>(
      []
    );

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busyId,
    setBusyId,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    transport,
    setTransport,
  ] =
    useState<
      | "all"
      | TransportMode
    >(
      "all"
    );

  const [
    operation,
    setOperation,
  ] =
    useState<
      | "all"
      | OperationStatus
    >(
      "all"
    );


  const loadTours =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {
        const {
          data,
          error:
            loadError,
        } =
          await supabase
            .from(
              "tours"
            )
            .select(
              [
                "id",
                "slug",
                "title",
                "city",
                "district",
                "category",
                "duration",
                "adult_price",
                "old_price",
                "agency_name",
                "status",
                "created_at",
                "transport_mode",
                "departure_city",
                "arrival_city",
                "capacity",
                "operation_status",
                "departure_date",
                "return_date",
              ].join(
                ","
              )
            )
            .eq(
              "company_id",
              currentCompanyId
            )
            .order(
              "departure_date",
              {
                ascending:
                  true,

                nullsFirst:
                  false,
              }
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        if (
          loadError
        ) {
          throw loadError;
        }

        setTours(
          (
            data ??
            []
          ) as unknown as
            Tour[]
        );
      },
      []
    );


  useEffect(() => {
    void (
      async () => {
        setLoading(
          true
        );

        setError(
          ""
        );

        try {
          const {
            data:
              userData,

            error:
              userError,
          } =
            await supabase
              .auth
              .getUser();

          if (
            userError ||
            !userData.user
          ) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              userData.user.id
            );

          if (
            !membership
          ) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }

          setCompanyId(
            membership.company_id
          );

          await loadTours(
            membership.company_id
          );

        } catch (
          currentError
        ) {
          setError(
            currentError instanceof
              Error
              ? currentError.message
              : String(
                  currentError
                )
          );

        } finally {
          setLoading(
            false
          );
        }
      }
    )();
  }, [
    loadTours,
  ]);


  async function updateTransport(
    tourId:
      string,

    value:
      TransportMode
  ) {
    if (
      !companyId
    ) {
      return;
    }

    setBusyId(
      tourId
    );

    setError(
      ""
    );

    try {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "tours"
          )
          .update(
            {
              transport_mode:
                value,
            }
          )
          .eq(
            "id",
            tourId
          )
          .eq(
            "company_id",
            companyId
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      setTours(
        current =>
          current.map(
            tour =>
              tour.id ===
              tourId
                ? {
                    ...tour,
                    transport_mode:
                      value,
                  }
                : tour
          )
      );

    } catch (
      currentError
    ) {
      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );

    } finally {
      setBusyId(
        ""
      );
    }
  }


  const filtered =
    useMemo(
      () => {
        const needle =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );

        return tours.filter(
          tour => {
            if (
              transport !==
                "all" &&
              tour.transport_mode !==
                transport
            ) {
              return false;
            }

            if (
              operation !==
                "all" &&
              tour.operation_status !==
                operation
            ) {
              return false;
            }

            if (
              !needle
            ) {
              return true;
            }

            return [
              tour.title,
              tour.city,
              tour.district,
              tour.category,
              tour.agency_name,
              tour.departure_city,
              tour.arrival_city,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                needle
              );
          }
        );
      },
      [
        tours,
        search,
        transport,
        operation,
      ]
    );


  const airCount =
    tours.filter(
      tour =>
        tour.transport_mode ===
        "air"
    ).length;


  const busCount =
    tours.filter(
      tour =>
        tour.transport_mode ===
        "bus"
    ).length;


  const activeCount =
    tours.filter(
      tour =>
        [
          "confirmed",
          "preparing",
          "ready",
          "active",
          "returning",
        ].includes(
          tour.operation_status
        )
    ).length;


  const capacityTotal =
    tours.reduce(
      (
        total,
        tour
      ) =>
        total +
        Number(
          tour.capacity ??
          0
        ),
      0
    );


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Tur operasyon sistemi yükleniyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1650px] px-5 py-7 lg:px-8">

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.14),transparent_34%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-orange-300">
                  TUROBUS TOUR OS
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[.06] px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Gerçek tur verisi
                </span>

              </div>


              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Tur
                <span className="text-orange-400">
                  {" "}
                  Yönetim Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">
                Uçaklı ve otobüslü turları satıştan operasyona kadar tek profesyonel tabloda yönetin.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <Link
                href="/dashboard/operasyon"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 text-[9px] font-black text-slate-300"
              >
                <FaArrowLeft />
                Operasyon Merkezi
              </Link>


              <Link
                href="/dashboard/turlar/control-tower"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.07] px-4 text-[9px] font-black text-orange-300"
              >
                <FaChartLine />
                Control Tower
              </Link>


              <Link
                href="/dashboard/tur-ekle"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-[9px] font-black text-white"
              >
                <FaPlus />
                Yeni Tur
              </Link>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[.05] px-5 py-4 text-[9px] font-bold text-red-300">
            {error}
          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

          {[
            {
              title:
                "Toplam Tur",

              value:
                tours.length,

              detail:
                "Sistemdeki tur",

              icon:
                <FaMapMarkerAlt />,
            },

            {
              title:
                "Uçaklı Tur",

              value:
                airCount,

              detail:
                "Havayolu operasyonu",

              icon:
                <FaPlane />,
            },

            {
              title:
                "Otobüslü Tur",

              value:
                busCount,

              detail:
                "Karayolu operasyonu",

              icon:
                <FaBus />,
            },

            {
              title:
                "Aktif Operasyon",

              value:
                activeCount,

              detail:
                "Hazırlık / aktif",

              icon:
                <FaCalendarAlt />,
            },

            {
              title:
                "Tanımlı Kapasite",

              value:
                capacityTotal,

              detail:
                "Toplam kontenjan",

              icon:
                <FaUsers />,
            },
          ].map(
            item => (
              <article
                key={
                  item.title
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
                      {item.title}
                    </div>

                    <div className="mt-3 text-3xl font-black">
                      {item.value}
                    </div>

                    <div className="mt-2 text-[8px] text-slate-600">
                      {item.detail}
                    </div>

                  </div>


                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-orange-500/15 bg-orange-500/[.06] text-orange-300">
                    {item.icon}
                  </div>

                </div>

              </article>
            )
          )}

        </section>


        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

          <div className="border-b border-white/[.07] p-4 lg:p-5">

            <div className="grid gap-3 xl:grid-cols-[1fr_190px_210px_auto]">

              <div className="relative">

                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tur, şehir, rota veya acente ara..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[9px] font-bold outline-none focus:border-orange-500/30"
                />

              </div>


              <select
                value={
                  transport
                }
                onChange={(
                  event
                ) =>
                  setTransport(
                    event.target.value as
                      | "all"
                      | TransportMode
                  )
                }
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px] font-bold outline-none"
              >
                <option value="all">
                  Tüm Ulaşım Tipleri
                </option>

                <option value="air">
                  ✈ Uçaklı Turlar
                </option>

                <option value="bus">
                  🚌 Otobüslü Turlar
                </option>

                <option value="other">
                  Belirlenmemiş
                </option>
              </select>


              <select
                value={
                  operation
                }
                onChange={(
                  event
                ) =>
                  setOperation(
                    event.target.value as
                      | "all"
                      | OperationStatus
                  )
                }
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px] font-bold outline-none"
              >
                <option value="all">
                  Tüm Operasyon Durumları
                </option>

                <option value="draft">
                  Taslak
                </option>

                <option value="sales">
                  Satışta
                </option>

                <option value="confirmed">
                  Kesinleşti
                </option>

                <option value="preparing">
                  Hazırlanıyor
                </option>

                <option value="ready">
                  Çıkışa Hazır
                </option>

                <option value="active">
                  Tur Devam Ediyor
                </option>

                <option value="returning">
                  Dönüş
                </option>

                <option value="completed">
                  Tamamlandı
                </option>

                <option value="cancelled">
                  İptal
                </option>
              </select>


              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-4 text-[8px] font-black text-slate-500">
                <FaFilter />
                {filtered.length} kayıt
              </div>

            </div>

          </div>


          <div className="overflow-auto">

            <table className="min-w-[1450px] w-full">

              <thead className="sticky top-0 z-10 bg-[#081522]">

                <tr className="border-b border-white/[.07] text-left text-[7px] font-black uppercase tracking-[.11em] text-slate-600">

                  <th className="px-5 py-4">
                    Tur
                  </th>

                  <th className="px-5 py-4">
                    Ulaşım
                  </th>

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Rota
                  </th>

                  <th className="px-5 py-4">
                    Süre
                  </th>

                  <th className="px-5 py-4">
                    Kapasite
                  </th>

                  <th className="px-5 py-4">
                    Satış Fiyatı
                  </th>

                  <th className="px-5 py-4">
                    Operasyon
                  </th>

                  <th className="px-5 py-4">
                    Acente
                  </th>

                  <th className="px-5 py-4 text-right">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.length ===
                0 ? (
                  <tr>

                    <td
                      colSpan={10}
                      className="px-5 py-14 text-center"
                    >

                      <div className="text-sm font-black">
                        Tur kaydı bulunamadı
                      </div>

                      <div className="mt-2 text-[9px] text-slate-600">
                        Filtreleri değiştirin veya yeni tur oluşturun.
                      </div>

                    </td>

                  </tr>
                ) : (
                  filtered.map(
                    tour => (
                      <tr
                        key={
                          tour.id
                        }
                        className="border-b border-white/[.045] transition hover:bg-white/[.02]"
                      >

                        <td className="px-5 py-4">

                          <div className="max-w-[260px]">

                            <div className="text-[10px] font-black">
                              {tour.title}
                            </div>

                            <div className="mt-1 text-[7px] text-slate-600">
                              {tour.category ||
                                "Kategori yok"}
                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <select
                            disabled={
                              busyId ===
                              tour.id
                            }
                            value={
                              tour.transport_mode
                            }
                            onChange={(
                              event
                            ) =>
                              void updateTransport(
                                tour.id,
                                event.target.value as
                                  TransportMode
                              )
                            }
                            className={`h-9 rounded-xl border px-3 text-[8px] font-black outline-none ${
                              tour.transport_mode ===
                                "air"
                                ? "border-blue-500/20 bg-blue-500/[.06] text-blue-300"
                                : tour.transport_mode ===
                                    "bus"
                                  ? "border-orange-500/20 bg-orange-500/[.06] text-orange-300"
                                  : "border-white/10 bg-[#030a11] text-slate-500"
                            }`}
                          >
                            <option value="other">
                              Belirlenmedi
                            </option>

                            <option value="air">
                              ✈ Uçaklı
                            </option>

                            <option value="bus">
                              🚌 Otobüslü
                            </option>
                          </select>

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {formatDate(
                              tour.departure_date
                            )}
                          </div>

                          {tour.return_date && (
                            <div className="mt-1 text-[7px] text-slate-600">
                              Dönüş{" "}
                              {formatDate(
                                tour.return_date
                              )}
                            </div>
                          )}

                        </td>


                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2 text-[8px] font-bold">

                            {tour.transport_mode ===
                            "air"
                              ? <FaPlane className="text-blue-300" />
                              : tour.transport_mode ===
                                  "bus"
                                ? <FaBus className="text-orange-300" />
                                : <FaMapMarkerAlt className="text-slate-600" />}

                            <span>
                              {tour.departure_city ||
                                tour.city ||
                                "—"}
                              {" → "}
                              {tour.arrival_city ||
                                tour.city ||
                                "—"}
                            </span>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-bold text-slate-400">
                          {tour.duration ||
                            "—"}
                        </td>


                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2 text-[9px] font-black">

                            <FaUsers className="text-slate-600" />

                            {tour.capacity ??
                              "—"}

                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black text-orange-300">
                            {money(
                              tour.adult_price
                            )}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            kişi başı
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black ${operationClass(
                              tour.operation_status
                            )}`}
                          >
                            {operationLabel(
                              tour.operation_status
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {tour.agency_name ||
                            "—"}
                        </td>


                        <td className="px-5 py-4">

                          <div className="flex justify-end gap-2">

                            <Link
                              href={`/dashboard/turlar/${tour.id}`}
                              title="Tur operasyon merkezi"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-orange-500/20 bg-orange-500/[.07] text-orange-300 transition hover:bg-orange-500 hover:text-white"
                            >
                              <FaThLarge />
                            </Link>


                            <Link
                              href={`/turlar/${tour.slug}`}
                              title="Tur önizleme"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-400 transition hover:text-white"
                            >
                              <FaEye />
                            </Link>


                            {tour.transport_mode ===
                              "air" && (
                              <Link
                                href={`/dashboard/turlar/${tour.id}/ucus`}
                                title="Uçuş operasyonu"
                                className="grid h-9 w-9 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/[.06] text-blue-300 transition hover:bg-blue-500 hover:text-white"
                              >
                                <FaPlane />
                              </Link>
                            )}


                            {tour.transport_mode ===
                              "bus" && (
                              <Link
                                href={`/dashboard/turlar/${tour.id}/otobus`}
                                title="Otobüs operasyonu"
                                className="grid h-9 w-9 place-items-center rounded-xl border border-orange-500/20 bg-orange-500/[.06] text-orange-300 transition hover:bg-orange-500 hover:text-white"
                              >
                                <FaBus />
                              </Link>
                            )}


                            <Link
                              href={`/dashboard/turlar/${tour.id}/yolcular`}
                              title="Yolcu operasyonu"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
                            >
                              <FaUsers />
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${tour.id}/hazirlik`}
                              title="Operasyon hazırlığı"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/[.06] text-amber-300 transition hover:bg-amber-500 hover:text-white"
                            >
                              <FaExclamationTriangle />
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${tour.id}/finans`}
                              title="Tur finansmanı"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
                            >
                              <FaMoneyBillWave />
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${tour.id}/mobil`}
                              title="Mobil saha operasyonu"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-orange-500/20 bg-orange-500/[.06] text-orange-300 transition hover:bg-orange-500 hover:text-white"
                            >
                              <FaUserCheck />
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${tour.id}/takvim`}
                              title="Tur takvimi"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-400 transition hover:text-emerald-300"
                            >
                              <FaCalendarAlt />
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${tour.id}/duzenle`}
                              title="Turu düzenle"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-orange-500/20 bg-orange-500/[.06] text-orange-300"
                            >
                              <FaEdit />
                            </Link>

                          </div>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>


        <div className="mt-4 text-[8px] leading-5 text-slate-700">
          {transportLabel(
            transport ===
              "all"
              ? "other"
              : transport
          )}
          {" · "}
          Mevcut tur kayıtları korunur. Ulaşım tipi tanımlanmamış eski turlar otomatik olarak silinmez veya değiştirilmez.
        </div>

      </div>

    </main>
  );
}
