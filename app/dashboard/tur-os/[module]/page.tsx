"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowRight,
  FaBus,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaFileAlt,
  FaHotel,
  FaMapMarkedAlt,
  FaMobileAlt,
  FaMoneyBillWave,
  FaPaperPlane,
  FaPlane,
  FaSearch,
  FaTasks,
  FaUsers,
} from "react-icons/fa";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type ModuleKey =
  | "hazirlik"
  | "yolcular"
  | "ucus"
  | "otobus"
  | "gorevler"
  | "tedarikciler"
  | "belgeler"
  | "mesajlar"
  | "finans"
  | "mobil";


type TourRow = {
  id: string;
  title: string;
  transport_mode:
    string | null;
  operation_status:
    string | null;
  departure_city:
    string | null;
  arrival_city:
    string | null;
};


type DepartureRow = {
  id: string;
  tour_id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
};


type ModuleDefinition = {
  key:
    ModuleKey;
  title:
    string;
  description:
    string;
  route:
    string;
  transport?:
    "air" |
    "bus";
};


const MODULES:
  Record<
    ModuleKey,
    ModuleDefinition
  > = {

    hazirlik: {
      key:
        "hazirlik",
      title:
        "Hazırlık & Operasyon Alarmı",
      description:
        "Çıkış hazırlığı, checklist ve gerçek operasyon riskleri",
      route:
        "hazirlik",
    },

    yolcular: {
      key:
        "yolcular",
      title:
        "Yolcu & Rooming",
      description:
        "Yolcu listesi, kimlik bilgileri, rooming ve manifest hazırlığı",
      route:
        "yolcular",
    },

    ucus: {
      key:
        "ucus",
      title:
        "Uçuş Yönetimi",
      description:
        "PNR, segment, biletleme deadline ve koltuk operasyonu",
      route:
        "ucus",
      transport:
        "air",
    },

    otobus: {
      key:
        "otobus",
      title:
        "Otobüs Operasyonu",
      description:
        "Araç, şoför, rehber, koltuk planı ve biniş noktaları",
      route:
        "otobus",
      transport:
        "bus",
    },

    gorevler: {
      key:
        "gorevler",
      title:
        "Görev & Personel",
      description:
        "Operasyon görevleri, sorumlu personel, deadline ve öncelik",
      route:
        "gorevler",
    },

    tedarikciler: {
      key:
        "tedarikciler",
      title:
        "Tedarikçi & Cari",
      description:
        "Teyit, sözleşme, voucher ve gerçek cari bağlantıları",
      route:
        "tedarikciler",
    },

    belgeler: {
      key:
        "belgeler",
      title:
        "Belge & Voucher",
      description:
        "Voucher, PNR, manifest ve operasyon evrakları",
      route:
        "belgeler",
    },

    mesajlar: {
      key:
        "mesajlar",
      title:
        "Mesajlaşma",
      description:
        "Müşteri, personel ve tedarikçi operasyon iletişimi",
      route:
        "mesajlar",
    },

    finans: {
      key:
        "finans",
      title:
        "Tur Finansmanı",
      description:
        "Ciro, maliyet, gider, açık bakiye ve operasyon katkısı",
      route:
        "finans",
    },

    mobil: {
      key:
        "mobil",
      title:
        "Mobil Operasyon",
      description:
        "Saha ekibi, biniş, check-in ve canlı operasyon",
      route:
        "mobil",
    },
  };


function moduleIcon(
  key:
    ModuleKey
) {

  if (
    key ===
    "ucus"
  ) {
    return <FaPlane />;
  }


  if (
    key ===
    "otobus"
  ) {
    return <FaBus />;
  }


  if (
    key ===
    "yolcular"
  ) {
    return <FaUsers />;
  }


  if (
    key ===
    "gorevler"
  ) {
    return <FaTasks />;
  }


  if (
    key ===
    "tedarikciler"
  ) {
    return <FaHotel />;
  }


  if (
    key ===
    "belgeler"
  ) {
    return <FaFileAlt />;
  }


  if (
    key ===
    "mesajlar"
  ) {
    return <FaPaperPlane />;
  }


  if (
    key ===
    "finans"
  ) {
    return <FaMoneyBillWave />;
  }


  if (
    key ===
    "mobil"
  ) {
    return <FaMobileAlt />;
  }


  return <FaExclamationTriangle />;
}


function operationStatusLabel(
  value:
    string | null
) {

  const map:
    Record<
      string,
      string
    > = {
    draft:
      "Taslak",
    on_sale:
      "Satışta",
    confirmed:
      "Kesinleşti",
    operation_preparation:
      "Operasyon Hazırlığı",
    departure_ready:
      "Çıkış Hazır",
    on_the_way:
      "Yolda",
    in_progress:
      "Tur Devam Ediyor",
    return:
      "Dönüş",
    completed:
      "Tamamlandı",
  };


  if (!value) {
    return "Durum Yok";
  }


  return (
    map[value] ||
    value
  );

}


export default function TourOsModuleLauncherPage() {

  const params =
    useParams<{
      module:
        string;
    }>();


  const moduleKey =
    String(
      params.module
    ) as
      ModuleKey;


  const moduleDefinition =
    MODULES[
      moduleKey
    ];


  const [
    tours,
    setTours,
  ] =
    useState<TourRow[]>(
      []
    );


  const [
    departures,
    setDepartures,
  ] =
    useState<DepartureRow[]>(
      []
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


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


  const loadData =
    useCallback(
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
              authData,

            error:
              authError,
          } =
            await supabase
              .auth
              .getUser();


          if (
            authError ||
            !authData.user
          ) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }


          const membership =
            await getCurrentMembership(
              authData.user.id
            );


          if (
            !membership
          ) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }


          const companyId =
            membership.company_id;


          const [
            tourResult,
            departureResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "tours"
                )
                .select(
                  [
                    "id",
                    "title",
                    "transport_mode",
                    "operation_status",
                    "departure_city",
                    "arrival_city",
                  ].join(",")
                )
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
                ),


              supabase
                .from(
                  "tour_departures"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "departure_date",
                    "capacity",
                    "reserved_count",
                  ].join(",")
                )
                .order(
                  "departure_date",
                  {
                    ascending:
                      true,
                  }
                ),
            ]);


          if (
            tourResult.error
          ) {
            throw tourResult.error;
          }


          if (
            departureResult.error
          ) {
            throw departureResult.error;
          }


          setTours(
            (
              tourResult.data ??
              []
            ) as unknown as
              TourRow[]
          );


          setDepartures(
            (
              departureResult.data ??
              []
            ) as unknown as
              DepartureRow[]
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

      },
      []
    );


  useEffect(() => {

    void loadData();

  }, [
    loadData,
  ]);


  const visibleTours =
    useMemo(
      () => {

        if (
          !moduleDefinition
        ) {
          return [];
        }


        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return tours.filter(
          tour => {

            if (
              moduleDefinition.transport &&
              tour.transport_mode !==
                moduleDefinition.transport
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            return [
              tour.title,
              tour.departure_city,
              tour.arrival_city,
              tour.transport_mode,
              tour.operation_status,
            ]
              .filter(Boolean)
              .some(
                value =>
                  String(value)
                    .toLocaleLowerCase(
                      "tr-TR"
                    )
                    .includes(
                      query
                    )
              );

          }
        );

      },
      [
        moduleDefinition,
        search,
        tours,
      ]
    );


  if (
    !moduleDefinition
  ) {

    return (
      <main className="min-h-screen bg-[#030a11] px-6 py-10 text-white">

        <div className="mx-auto max-w-4xl rounded-[28px] border border-red-500/20 bg-red-500/[.05] p-8">

          <div className="text-xl font-black">
            Tur OS modülü bulunamadı.
          </div>


          <Link
            href="/dashboard/turlar"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-[8px] font-black"
          >
            Tüm Turlara Dön
            <FaArrowRight />
          </Link>

        </div>

      </main>
    );

  }


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Tur OS yükleniyor...
      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1550px] px-5 py-7 lg:px-8">

        <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.14),transparent_36%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-orange-300">

                {moduleIcon(
                  moduleKey
                )}

                TUR OS
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {moduleDefinition.title}
              </h1>


              <p className="mt-3 max-w-3xl text-[8px] leading-5 text-slate-500">
                {moduleDefinition.description}
              </p>


              <p className="mt-2 text-[7px] text-slate-600">
                İşlem yapmak istediğiniz gerçek turu seçin.
              </p>

            </div>


            <Link
              href="/dashboard/turlar/control-tower"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.06] px-4 text-[8px] font-black text-orange-300"
            >
              <FaMapMarkedAlt />
              Kontrol Kulesi
            </Link>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f] p-4">

          <div className="relative">

            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-600" />

            <input
              value={
                search
              }
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Tur, rota veya durum ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-9 pr-3 text-[8px]"
            />

          </div>

        </section>


        <section className="mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

          <div className="overflow-auto">

            <table className="min-w-[1100px] w-full">

              <thead className="bg-[#081522]">

                <tr className="text-left text-[7px] font-black uppercase tracking-[.08em] text-slate-600">

                  <th className="px-5 py-4">
                    Tur
                  </th>

                  <th className="px-5 py-4">
                    Tip
                  </th>

                  <th className="px-5 py-4">
                    Rota
                  </th>

                  <th className="px-5 py-4">
                    Sonraki Çıkış
                  </th>

                  <th className="px-5 py-4">
                    Doluluk
                  </th>

                  <th className="px-5 py-4">
                    Operasyon
                  </th>

                  <th className="px-5 py-4 text-right">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {visibleTours.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-[8px] text-slate-600"
                    >
                      Bu modüle uygun tur bulunamadı.
                    </td>

                  </tr>

                ) : (

                  visibleTours.map(
                    tour => {

                      const today =
                        new Date()
                          .toISOString()
                          .slice(
                            0,
                            10
                          );


                      const tourDepartures =
                        departures
                          .filter(
                            departure =>
                              departure.tour_id ===
                              tour.id
                          )
                          .sort(
                            (
                              a,
                              b
                            ) =>
                              a.departure_date.localeCompare(
                                b.departure_date
                              )
                          );


                      const nextDeparture =
                        tourDepartures.find(
                          departure =>
                            departure.departure_date >=
                            today
                        ) ??
                        tourDepartures[
                          tourDepartures.length -
                          1
                        ];


                      const occupancy =
                        nextDeparture &&
                        Number(
                          nextDeparture.capacity
                        ) >
                          0
                          ? Math.round(
                              (
                                Number(
                                  nextDeparture.reserved_count
                                ) /
                                Number(
                                  nextDeparture.capacity
                                )
                              ) *
                                100
                            )
                          : 0;


                      return (
                        <tr
                          key={
                            tour.id
                          }
                          className="border-t border-white/[.045]"
                        >

                          <td className="px-5 py-4">

                            <div className="text-[9px] font-black">
                              {tour.title}
                            </div>

                          </td>


                          <td className="px-5 py-4">

                            <span className="rounded-full border border-white/10 bg-white/[.025] px-2.5 py-1 text-[7px] font-black text-slate-400">
                              {tour.transport_mode ===
                              "air"
                                ? "Uçaklı"
                                : tour.transport_mode ===
                                    "bus"
                                  ? "Otobüslü"
                                  : "Diğer"}
                            </span>

                          </td>


                          <td className="px-5 py-4 text-[8px] text-slate-400">

                            {tour.departure_city ||
                              "—"}

                            {" → "}

                            {tour.arrival_city ||
                              "—"}

                          </td>


                          <td className="px-5 py-4">

                            {nextDeparture ? (

                              <div>

                                <div className="flex items-center gap-2 text-[8px] font-black">
                                  <FaCalendarAlt className="text-orange-300" />

                                  {new Date(
                                    `${nextDeparture.departure_date}T00:00:00`
                                  ).toLocaleDateString(
                                    "tr-TR"
                                  )}
                                </div>

                              </div>

                            ) : (

                              <span className="text-[7px] text-slate-600">
                                Çıkış yok
                              </span>

                            )}

                          </td>


                          <td className="px-5 py-4">

                            {nextDeparture ? (

                              <div>

                                <div className="text-[8px] font-black">
                                  {nextDeparture.reserved_count}
                                  {"/"}
                                  {nextDeparture.capacity}
                                </div>

                                <div className="mt-1 text-[7px] text-slate-600">
                                  %{occupancy}
                                </div>

                              </div>

                            ) : (
                              "—"
                            )}

                          </td>


                          <td className="px-5 py-4">

                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/[.05] px-2.5 py-1 text-[7px] font-black text-blue-300">

                              <FaCheckCircle />

                              {operationStatusLabel(
                                tour.operation_status
                              )}

                            </span>

                          </td>


                          <td className="px-5 py-4">

                            <div className="flex justify-end">

                              <Link
                                href={`/dashboard/turlar/${tour.id}/${moduleDefinition.route}`}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
                              >
                                {moduleDefinition.title}
                                <FaArrowRight />
                              </Link>

                            </div>

                          </td>

                        </tr>
                      );

                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 grid gap-3 md:grid-cols-3">

          <Link
            href="/dashboard/turlar"
            className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
          >
            <FaClipboardList className="text-orange-300" />

            <div className="mt-3 text-[9px] font-black">
              Tüm Turlar
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Profesyonel tur yönetim tablosuna dön
            </div>
          </Link>


          <Link
            href="/dashboard/manifest"
            className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
          >
            <FaUsers className="text-emerald-300" />

            <div className="mt-3 text-[9px] font-black">
              Manifest
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Tüm çıkışların manifest merkezini aç
            </div>
          </Link>


          <Link
            href="/dashboard/turlar/control-tower"
            className="rounded-[22px] border border-orange-500/15 bg-orange-500/[.04] p-5"
          >
            <FaMapMarkedAlt className="text-orange-300" />

            <div className="mt-3 text-[9px] font-black">
              Control Tower
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Tüm tur operasyonlarını tek ekranda izle
            </div>
          </Link>

        </section>

      </div>

    </main>
  );
}
