"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaShip,
  FaTasks,
  FaTimes,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  addYachtCrew,
  addYachtManifestGuest,
  addYachtOperationService,
  loadYachtOperationCenter,
  runYachtOperationAction,
  setYachtCrewStatus,
  setYachtManifestGuestStatus,
  setYachtOperationServiceStatus,
  updateYachtOperationPlan,

  type YachtOperationBooking,
  type YachtOperationCrew,
  type YachtOperationEvent,
  type YachtOperationGuest,
  type YachtOperationService,
} from "@/lib/yacht-os/operation-center";


function dateTime(
  value:
    string | null
) {

  if (!value) {
    return "—";
  }


  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}


function money(
  value: number,
  currency = "TRY"
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
      value || 0
    )
  );
}


function operationLabel(
  value: string
) {

  const map:
    Record<
      string,
      string
    > = {
      preparing:
        "Hazırlanıyor",

      ready:
        "Hazır",

      guest_arrived:
        "Misafir Geldi",

      departed:
        "Hareket Etti",

      cruising:
        "Seyirde",

      returning:
        "Dönüşte",

      completed:
        "Tamamlandı",

      cancelled:
        "İptal",
    };


  return (
    map[value] ||
    value
  );
}


function checkInLabel(
  value: string
) {

  const map:
    Record<
      string,
      string
    > = {
      pending:
        "Bekleniyor",

      arrived:
        "Geldi",

      checked_in:
        "Check-in",

      boarded:
        "Teknede",

      no_show:
        "No-show",
    };


  return (
    map[value] ||
    value
  );
}


function statusTone(
  value: string
) {

  if (
    [
      "completed",
      "checked_in",
      "boarded",
      "ready",
    ].includes(
      value
    )
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }


  if (
    [
      "departed",
      "cruising",
      "returning",
    ].includes(
      value
    )
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }


  if (
    [
      "no_show",
      "cancelled",
    ].includes(
      value
    )
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }


  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}


export default function YachtOperationCenterPage() {

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
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    companyName,
    setCompanyName,
  ] =
    useState("");

  const [
    bookings,
    setBookings,
  ] =
    useState<
      YachtOperationBooking[]
    >([]);

  const [
    yachts,
    setYachts,
  ] =
    useState<any[]>(
      []
    );

  const [
    guests,
    setGuests,
  ] =
    useState<
      YachtOperationGuest[]
    >([]);

  const [
    crew,
    setCrew,
  ] =
    useState<
      YachtOperationCrew[]
    >([]);

  const [
    services,
    setServices,
  ] =
    useState<
      YachtOperationService[]
    >([]);

  const [
    events,
    setEvents,
  ] =
    useState<
      YachtOperationEvent[]
    >([]);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  const [
    selected,
    setSelected,
  ] =
    useState<
      YachtOperationBooking |
      null
    >(null);

  const [
    tab,
    setTab,
  ] =
    useState<
      "overview" |
      "manifest" |
      "crew" |
      "services" |
      "timeline"
    >(
      "overview"
    );

  const [
    meetingPoint,
    setMeetingPoint,
  ] =
    useState("");

  const [
    meetingTime,
    setMeetingTime,
  ] =
    useState("");

  const [
    operationNote,
    setOperationNote,
  ] =
    useState("");

  const [
    guestName,
    setGuestName,
  ] =
    useState("");

  const [
    guestPhone,
    setGuestPhone,
  ] =
    useState("");

  const [
    guestNationality,
    setGuestNationality,
  ] =
    useState("");

  const [
    crewName,
    setCrewName,
  ] =
    useState("");

  const [
    crewRole,
    setCrewRole,
  ] =
    useState(
      "captain"
    );

  const [
    crewPhone,
    setCrewPhone,
  ] =
    useState("");

  const [
    serviceTitle,
    setServiceTitle,
  ] =
    useState("");

  const [
    serviceType,
    setServiceType,
  ] =
    useState(
      "catering"
    );

  const [
    serviceSupplier,
    setServiceSupplier,
  ] =
    useState("");

  const [
    serviceCost,
    setServiceCost,
  ] =
    useState("0");

  const [
    serviceSale,
    setServiceSale,
  ] =
    useState("0");

  const [
    serviceDue,
    setServiceDue,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");


  const refresh =
    useCallback(
      async (
        activeCompany:
          string
      ) => {

        const data =
          await loadYachtOperationCenter(
            activeCompany
          );


        setBookings(
          data.bookings
        );

        setYachts(
          data.yachts
        );

        setGuests(
          data.guests
        );

        setCrew(
          data.crew
        );

        setServices(
          data.services
        );

        setEvents(
          data.events
        );
      },
      []
    );


  useEffect(
    () => {

      async function boot() {

        try {

          const user =
            await getCurrentUser();


          if (!user) {
            throw new Error(
              "Aktif oturum bulunamadı."
            );
          }


          const membership =
            await getCurrentMembership(
              user.id
            );


          if (!membership) {
            throw new Error(
              "Aktif firma bulunamadı."
            );
          }


          setCompanyId(
            membership.company_id
          );

          setCompanyName(
            membership.company.name
          );


          await refresh(
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


      void boot();

    },
    [
      refresh,
    ]
  );


  function toast(
    message: string
  ) {

    setNotice(
      message
    );


    window.setTimeout(
      () =>
        setNotice(""),
      2200
    );
  }


  function openBooking(
    booking:
      YachtOperationBooking
  ) {

    setSelected(
      booking
    );

    setTab(
      "overview"
    );

    setMeetingPoint(
      booking.meeting_point ||
      ""
    );

    setMeetingTime(
      booking.meeting_time
        ? new Date(
            booking.meeting_time
          )
            .toISOString()
            .slice(
              0,
              16
            )
        : ""
    );

    setOperationNote(
      booking.operation_note ||
      ""
    );
  }


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  const todayBookings =
    bookings.filter(
      (
        booking
      ) =>
        booking.start_date ===
        today
    );


  const waitingCheckIn =
    todayBookings.filter(
      (
        booking
      ) =>
        booking.check_in_status ===
        "pending"
    );


  const ready =
    todayBookings.filter(
      (
        booking
      ) =>
        booking.operation_status ===
        "ready"
    );


  const activeCruises =
    bookings.filter(
      (
        booking
      ) =>
        [
          "departed",
          "cruising",
          "returning",
        ].includes(
          booking.operation_status
        )
    );


  const completedToday =
    todayBookings.filter(
      (
        booking
      ) =>
        booking.operation_status ===
        "completed"
    );


  const noShows =
    todayBookings.filter(
      (
        booking
      ) =>
        booking.check_in_status ===
        "no_show"
    );


  const filtered =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return bookings.filter(
          (
            booking
          ) => {

            const yacht =
              yachts.find(
                (
                  item
                ) =>
                  item.id ===
                  booking.yacht_id
              );


            const text =
              `${booking.booking_code} ${booking.guest_name} ${booking.guest_phone || ""} ${yacht?.name || ""} ${booking.meeting_point || ""}`
                .toLocaleLowerCase(
                  "tr"
                );


            const searchOk =
              !needle ||
              text.includes(
                needle
              );


            const statusOk =
              statusFilter ===
                "all" ||
              booking.operation_status ===
                statusFilter;


            return (
              searchOk &&
              statusOk
            );
          }
        );

      },
      [
        bookings,
        yachts,
        query,
        statusFilter,
      ]
    );


  const selectedGuests =
    selected
      ? guests.filter(
          (
            item
          ) =>
            item.booking_id ===
            selected.id
        )
      : [];


  const selectedCrew =
    selected
      ? crew.filter(
          (
            item
          ) =>
            item.booking_id ===
            selected.id
        )
      : [];


  const selectedServices =
    selected
      ? services.filter(
          (
            item
          ) =>
            item.booking_id ===
            selected.id
        )
      : [];


  const selectedEvents =
    selected
      ? events.filter(
          (
            item
          ) =>
            item.booking_id ===
            selected.id
        )
      : [];


  async function action(
    actionName: string
  ) {

    if (!selected) {
      return;
    }


    setSaving(true);
    setError("");


    try {

      await runYachtOperationAction(
        selected.id,
        actionName,
        operationNote ||
        undefined
      );


      await refresh(
        companyId
      );


      const updated =
        (
          await loadYachtOperationCenter(
            companyId
          )
        ).bookings.find(
          (
            item
          ) =>
            item.id ===
            selected.id
        );


      if (updated) {
        setSelected(
          updated
        );
      }


      toast(
        "Operasyon durumu güncellendi."
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

      setSaving(
        false
      );
    }
  }


  async function savePlan() {

    if (!selected) {
      return;
    }


    setSaving(true);


    try {

      await updateYachtOperationPlan({
        bookingId:
          selected.id,

        meetingPoint:
          meetingPoint ||
          undefined,

        meetingTime:
          meetingTime ||
          undefined,

        note:
          operationNote ||
          undefined,
      });


      await refresh(
        companyId
      );


      toast(
        "Operasyon planı kaydedildi."
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

      setSaving(
        false
      );
    }
  }


  async function addGuest() {

    if (
      !selected ||
      !guestName.trim()
    ) {
      return;
    }


    setSaving(true);


    try {

      await addYachtManifestGuest({
        companyId,

        bookingId:
          selected.id,

        fullName:
          guestName.trim(),

        phone:
          guestPhone ||
          undefined,

        nationality:
          guestNationality ||
          undefined,
      });


      await refresh(
        companyId
      );


      setGuestName("");
      setGuestPhone("");
      setGuestNationality("");


      toast(
        "Misafir manifestoya eklendi."
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

      setSaving(
        false
      );
    }
  }


  async function guestStatus(
    guestId: string,
    status: string
  ) {

    await setYachtManifestGuestStatus(
      guestId,
      status
    );

    await refresh(
      companyId
    );

    toast(
      "Misafir durumu güncellendi."
    );
  }


  async function addCrew() {

    if (
      !selected ||
      !crewName.trim()
    ) {
      return;
    }


    setSaving(true);


    try {

      await addYachtCrew({
        companyId,

        bookingId:
          selected.id,

        yachtId:
          selected.yacht_id,

        fullName:
          crewName.trim(),

        role:
          crewRole,

        phone:
          crewPhone ||
          undefined,
      });


      await refresh(
        companyId
      );


      setCrewName("");
      setCrewPhone("");


      toast(
        "Crew ataması yapıldı."
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

      setSaving(
        false
      );
    }
  }


  async function addService() {

    if (
      !selected ||
      !serviceTitle.trim()
    ) {
      return;
    }


    setSaving(true);


    try {

      await addYachtOperationService({
        companyId,

        bookingId:
          selected.id,

        serviceType,

        title:
          serviceTitle.trim(),

        supplierName:
          serviceSupplier ||
          undefined,

        quantity:
          1,

        costAmount:
          Number(
            serviceCost
          ) ||
          0,

        saleAmount:
          Number(
            serviceSale
          ) ||
          0,

        dueAt:
          serviceDue ||
          undefined,
      });


      await refresh(
        companyId
      );


      setServiceTitle("");
      setServiceSupplier("");
      setServiceCost("0");
      setServiceSale("0");
      setServiceDue("");


      toast(
        "Operasyon hizmeti eklendi."
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

      setSaving(
        false
      );
    }
  }


  if (loading) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaShip className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[160] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">

          <FaCheckCircle className="text-emerald-400" />

          <span className="text-xs font-black">
            {notice}
          </span>

        </div>
      )}


      <div className="mx-auto max-w-[1850px] px-5 py-7 lg:px-8">


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_34%),radial-gradient(circle_at_70%_0%,rgba(59,130,246,.10),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            YAT & TEKNE OS
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.22em] text-orange-300">
                  OPERATION CENTER
                </span>

                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[8px] font-black text-blue-300">
                  ● Canlı Sefer Yönetimi
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Yat Operasyon{" "}
                <span className="text-orange-400">
                  Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Check-in, manifesto, crew, marina,
                hazırlık hizmetleri ve canlı sefer timeline yönetimi.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">

              <HeaderMetric
                label="Bugün"
                value={String(
                  todayBookings.length
                )}
              />

              <HeaderMetric
                label="Check-in Bekliyor"
                value={String(
                  waitingCheckIn.length
                )}
                danger={
                  waitingCheckIn.length >
                  0
                }
              />

              <HeaderMetric
                label="Hazır"
                value={String(
                  ready.length
                )}
              />

              <HeaderMetric
                label="Denizde"
                value={String(
                  activeCruises.length
                )}
              />

              <HeaderMetric
                label="No-show"
                value={String(
                  noShows.length
                )}
                danger={
                  noShows.length >
                  0
                }
              />

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <FaTimes />
            </button>

          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <Kpi
            label="Bugünkü Sefer"
            value={String(
              todayBookings.length
            )}
            detail="Başlangıç tarihi bugün"
          />

          <Kpi
            label="Check-in Bekleyen"
            value={String(
              waitingCheckIn.length
            )}
            detail="Misafir gelişi bekleniyor"
            danger={
              waitingCheckIn.length >
              0
            }
          />

          <Kpi
            label="Aktif Seyir"
            value={String(
              activeCruises.length
            )}
            detail="Hareket / seyir / dönüş"
          />

          <Kpi
            label="Tamamlandı"
            value={String(
              completedToday.length
            )}
            detail="Bugünkü kapanan operasyon"
            success
          />

          <Kpi
            label="Açık Hazırlık"
            value={String(
              services.filter(
                (
                  item
                ) =>
                  ![
                    "completed",
                    "cancelled",
                  ].includes(
                    item.status
                  )
              ).length
            )}
            detail="İkram, yakıt, transfer vb."
          />

        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">


          <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center">

            <div className="relative flex-1">

              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

              <input
                value={
                  query
                }
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Rezervasyon, müşteri, telefon, tekne veya buluşma noktası ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-600" />

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >

                <option value="all">
                  Tüm Operasyonlar
                </option>

                <option value="preparing">
                  Hazırlanıyor
                </option>

                <option value="ready">
                  Hazır
                </option>

                <option value="guest_arrived">
                  Misafir Geldi
                </option>

                <option value="departed">
                  Hareket Etti
                </option>

                <option value="cruising">
                  Seyirde
                </option>

                <option value="returning">
                  Dönüşte
                </option>

                <option value="completed">
                  Tamamlandı
                </option>

              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1850px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Misafir
                  </th>

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Buluşma
                  </th>

                  <th className="px-5 py-4">
                    Kişi
                  </th>

                  <th className="px-5 py-4">
                    Manifest
                  </th>

                  <th className="px-5 py-4">
                    Crew
                  </th>

                  <th className="px-5 py-4">
                    Hazırlık
                  </th>

                  <th className="px-5 py-4">
                    Check-in
                  </th>

                  <th className="px-5 py-4">
                    Operasyon
                  </th>

                  <th className="px-5 py-4">
                    Ödeme
                  </th>

                  <th className="px-5 py-4">
                    Aksiyon
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map(
                  (
                    booking
                  ) => {

                    const yacht =
                      yachts.find(
                        (
                          item
                        ) =>
                          item.id ===
                          booking.yacht_id
                      );


                    const manifestCount =
                      guests.filter(
                        (
                          item
                        ) =>
                          item.booking_id ===
                          booking.id
                      ).length;


                    const crewCount =
                      crew.filter(
                        (
                          item
                        ) =>
                          item.booking_id ===
                          booking.id &&
                          item.status !==
                          "cancelled"
                      ).length;


                    const openServices =
                      services.filter(
                        (
                          item
                        ) =>
                          item.booking_id ===
                            booking.id &&
                          ![
                            "completed",
                            "cancelled",
                          ].includes(
                            item.status
                          )
                      ).length;


                    return (
                      <tr
                        key={
                          booking.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
                      >

                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              booking.booking_code
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              booking.status
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              booking.guest_name
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              booking.guest_phone ||
                              "—"
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <FaShip className="text-orange-400" />

                            <div>

                              <div className="text-[9px] font-black">
                                {
                                  yacht?.name ||
                                  "—"
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {
                                  yacht?.marina ||
                                  yacht?.city ||
                                  "—"
                                }
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {
                            booking.start_date
                          }
                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[8px] font-black">
                            {
                              booking.meeting_point ||
                              "Belirlenmedi"
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {dateTime(
                              booking.meeting_time
                            )}
                          </div>

                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {
                            booking.guest_count
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                            manifestCount >=
                            booking.guest_count
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}>
                            {manifestCount}
                            /
                            {
                              booking.guest_count
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            crewCount
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                            openServices > 0
                              ? "bg-orange-500/10 text-orange-300"
                              : "bg-emerald-500/10 text-emerald-300"
                          }`}>
                            {
                              openServices
                            } açık
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                            booking.check_in_status
                          )}`}>
                            {checkInLabel(
                              booking.check_in_status
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                            booking.operation_status
                          )}`}>
                            {operationLabel(
                              booking.operation_status
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black text-emerald-300">
                            {money(
                              booking.paid_amount
                            )}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              booking.payment_status
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              openBooking(
                                booking
                              )
                            }
                            className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3 text-[8px] font-black"
                          >
                            <FaTasks />
                            Operasyonu Aç
                          </button>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>


      {selected && (
        <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">

          <div className="mx-auto my-5 max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#07131f] shadow-2xl">


            <div className="flex items-start justify-between border-b border-white/10 p-6">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  CANLI OPERASYON DOSYASI
                </div>

                <div className="mt-2 text-2xl font-black">
                  {
                    selected.booking_code
                  }
                  {" · "}
                  {
                    selected.guest_name
                  }
                </div>

                <div className="mt-2 flex flex-wrap gap-2">

                  <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                    selected.check_in_status
                  )}`}>
                    {checkInLabel(
                      selected.check_in_status
                    )}
                  </span>

                  <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                    selected.operation_status
                  )}`}>
                    {operationLabel(
                      selected.operation_status
                    )}
                  </span>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelected(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-6 py-3">

              {[
                [
                  "overview",
                  "Operasyon",
                ],
                [
                  "manifest",
                  "Manifest",
                ],
                [
                  "crew",
                  "Crew",
                ],
                [
                  "services",
                  "Hazırlık & Ekstralar",
                ],
                [
                  "timeline",
                  "Timeline",
                ],
              ].map(
                (
                  item
                ) => (
                  <button
                    key={
                      item[0]
                    }
                    type="button"
                    onClick={() =>
                      setTab(
                        item[0] as
                          typeof tab
                      )
                    }
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-[8px] font-black ${
                      tab ===
                      item[0]
                        ? "bg-orange-500 text-white"
                        : "border border-white/10 text-slate-500"
                    }`}
                  >
                    {
                      item[1]
                    }
                  </button>
                )
              )}

            </div>


            <div className="p-6">


              {tab ===
                "overview" && (
                <div className="grid gap-5 xl:grid-cols-[1fr_.85fr]">

                  <div className="space-y-5">

                    <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                      <div className="text-sm font-black">
                        Buluşma & Marina Planı
                      </div>


                      <div className="mt-4 grid gap-3 md:grid-cols-2">

                        <label>

                          <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                            Buluşma Noktası
                          </span>

                          <input
                            value={
                              meetingPoint
                            }
                            onChange={(
                              event
                            ) =>
                              setMeetingPoint(
                                event.target.value
                              )
                            }
                            placeholder="Örn. Ece Marina C Kapısı"
                            className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
                          />

                        </label>


                        <label>

                          <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                            Buluşma Saati
                          </span>

                          <input
                            type="datetime-local"
                            value={
                              meetingTime
                            }
                            onChange={(
                              event
                            ) =>
                              setMeetingTime(
                                event.target.value
                              )
                            }
                            className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
                          />

                        </label>

                      </div>


                      <textarea
                        value={
                          operationNote
                        }
                        onChange={(
                          event
                        ) =>
                          setOperationNote(
                            event.target.value
                          )
                        }
                        placeholder="Operasyon notu..."
                        className="mt-3 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
                      />


                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void savePlan()
                        }
                        className="mt-3 h-11 rounded-xl border border-orange-500/20 bg-orange-500/[.08] px-5 text-[9px] font-black text-orange-300"
                      >
                        Planı Kaydet
                      </button>

                    </section>


                    <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                      <div className="text-sm font-black">
                        Canlı Operasyon Aksiyonları
                      </div>


                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">

                        <ActionButton
                          label="Misafir Geldi"
                          onClick={() =>
                            void action(
                              "guest_arrived"
                            )
                          }
                        />

                        <ActionButton
                          label="Check-in Tamamla"
                          onClick={() =>
                            void action(
                              "check_in"
                            )
                          }
                        />

                        <ActionButton
                          label="Tekneye Alındı"
                          onClick={() =>
                            void action(
                              "boarded"
                            )
                          }
                        />

                        <ActionButton
                          label="Hareket Ettir"
                          onClick={() =>
                            void action(
                              "depart"
                            )
                          }
                        />

                        <ActionButton
                          label="Seyir"
                          onClick={() =>
                            void action(
                              "cruising"
                            )
                          }
                        />

                        <ActionButton
                          label="Dönüş"
                          onClick={() =>
                            void action(
                              "returning"
                            )
                          }
                        />

                        <ActionButton
                          label="Seferi Kapat"
                          success
                          onClick={() =>
                            void action(
                              "complete"
                            )
                          }
                        />

                        <ActionButton
                          label="No-show"
                          danger
                          onClick={() =>
                            void action(
                              "no_show"
                            )
                          }
                        />

                      </div>

                    </section>

                  </div>


                  <div className="grid gap-3 sm:grid-cols-2">

                    <Mini
                      label="Planlanan Misafir"
                      value={`${selected.guest_count} kişi`}
                    />

                    <Mini
                      label="Manifest"
                      value={`${selectedGuests.length} kişi`}
                    />

                    <Mini
                      label="Crew"
                      value={`${selectedCrew.length} kişi`}
                    />

                    <Mini
                      label="Açık Hazırlık"
                      value={String(
                        selectedServices.filter(
                          (
                            item
                          ) =>
                            ![
                              "completed",
                              "cancelled",
                            ].includes(
                              item.status
                            )
                        ).length
                      )}
                    />

                    <Mini
                      label="Check-in"
                      value={checkInLabel(
                        selected.check_in_status
                      )}
                    />

                    <Mini
                      label="Operasyon"
                      value={operationLabel(
                        selected.operation_status
                      )}
                    />

                    <Mini
                      label="Gerçek Çıkış"
                      value={dateTime(
                        selected.actual_departure_at
                      )}
                    />

                    <Mini
                      label="Gerçek Dönüş"
                      value={dateTime(
                        selected.actual_return_at
                      )}
                    />

                  </div>

                </div>
              )}


              {tab ===
                "manifest" && (
                <div>

                  <div className="grid gap-3 md:grid-cols-4">

                    <Field
                      label="Ad Soyad"
                      value={
                        guestName
                      }
                      onChange={
                        setGuestName
                      }
                    />

                    <Field
                      label="Telefon"
                      value={
                        guestPhone
                      }
                      onChange={
                        setGuestPhone
                      }
                    />

                    <Field
                      label="Uyruk"
                      value={
                        guestNationality
                      }
                      onChange={
                        setGuestNationality
                      }
                    />


                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void addGuest()
                      }
                      className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[9px] font-black"
                    >
                      <FaPlus />
                      Manifestoya Ekle
                    </button>

                  </div>


                  <div className="mt-5 overflow-x-auto">

                    <table className="w-full min-w-[900px] text-left">

                      <thead>
                        <tr className="text-[8px] font-black uppercase text-slate-600">

                          <th className="px-4 py-3">
                            Misafir
                          </th>

                          <th className="px-4 py-3">
                            Telefon
                          </th>

                          <th className="px-4 py-3">
                            Uyruk
                          </th>

                          <th className="px-4 py-3">
                            Durum
                          </th>

                          <th className="px-4 py-3">
                            Aksiyon
                          </th>

                        </tr>
                      </thead>

                      <tbody>

                        {selectedGuests.map(
                          (
                            guest
                          ) => (
                            <tr
                              key={
                                guest.id
                              }
                              className="border-t border-white/[.06]"
                            >

                              <td className="px-4 py-3 text-[9px] font-black">
                                {
                                  guest.full_name
                                }
                              </td>

                              <td className="px-4 py-3 text-[8px] text-slate-500">
                                {
                                  guest.phone ||
                                  "—"
                                }
                              </td>

                              <td className="px-4 py-3 text-[8px]">
                                {
                                  guest.nationality ||
                                  "—"
                                }
                              </td>

                              <td className="px-4 py-3">
                                <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                                  guest.check_in_status
                                )}`}>
                                  {checkInLabel(
                                    guest.check_in_status
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3">

                                <div className="flex gap-1.5">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void guestStatus(
                                        guest.id,
                                        "checked_in"
                                      )
                                    }
                                    className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[8px] font-black text-emerald-300"
                                  >
                                    Check-in
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void guestStatus(
                                        guest.id,
                                        "boarded"
                                      )
                                    }
                                    className="rounded-lg bg-blue-500/10 px-3 py-2 text-[8px] font-black text-blue-300"
                                  >
                                    Teknede
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void guestStatus(
                                        guest.id,
                                        "no_show"
                                      )
                                    }
                                    className="rounded-lg bg-red-500/10 px-3 py-2 text-[8px] font-black text-red-300"
                                  >
                                    No-show
                                  </button>

                                </div>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}


              {tab ===
                "crew" && (
                <div>

                  <div className="grid gap-3 md:grid-cols-4">

                    <Field
                      label="Ad Soyad"
                      value={
                        crewName
                      }
                      onChange={
                        setCrewName
                      }
                    />


                    <label>

                      <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                        Görev
                      </span>

                      <select
                        value={
                          crewRole
                        }
                        onChange={(
                          event
                        ) =>
                          setCrewRole(
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-xs outline-none"
                      >

                        <option value="captain">
                          Kaptan
                        </option>

                        <option value="deckhand">
                          Gemici
                        </option>

                        <option value="hostess">
                          Hostes
                        </option>

                        <option value="chef">
                          Şef
                        </option>

                        <option value="guide">
                          Rehber
                        </option>

                        <option value="photographer">
                          Fotoğrafçı
                        </option>

                        <option value="other">
                          Diğer
                        </option>

                      </select>

                    </label>


                    <Field
                      label="Telefon"
                      value={
                        crewPhone
                      }
                      onChange={
                        setCrewPhone
                      }
                    />


                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void addCrew()
                      }
                      className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[9px] font-black"
                    >
                      <FaPlus />
                      Crew Ata
                    </button>

                  </div>


                  <div className="mt-5 overflow-x-auto">

                    <table className="w-full min-w-[850px] text-left">

                      <thead>
                        <tr className="text-[8px] font-black uppercase text-slate-600">

                          <th className="px-4 py-3">
                            Personel
                          </th>

                          <th className="px-4 py-3">
                            Görev
                          </th>

                          <th className="px-4 py-3">
                            Telefon
                          </th>

                          <th className="px-4 py-3">
                            Durum
                          </th>

                          <th className="px-4 py-3">
                            Aksiyon
                          </th>

                        </tr>
                      </thead>

                      <tbody>

                        {selectedCrew.map(
                          (
                            person
                          ) => (
                            <tr
                              key={
                                person.id
                              }
                              className="border-t border-white/[.06]"
                            >

                              <td className="px-4 py-3 text-[9px] font-black">
                                {
                                  person.full_name
                                }
                              </td>

                              <td className="px-4 py-3 text-[8px]">
                                {
                                  person.role
                                }
                              </td>

                              <td className="px-4 py-3 text-[8px] text-slate-500">
                                {
                                  person.phone ||
                                  "—"
                                }
                              </td>

                              <td className="px-4 py-3 text-[8px] font-black">
                                {
                                  person.status
                                }
                              </td>

                              <td className="px-4 py-3">

                                <button
                                  type="button"
                                  onClick={async () => {

                                    await setYachtCrewStatus(
                                      person.id,
                                      person.status ===
                                      "confirmed"
                                        ? "on_board"
                                        : "confirmed"
                                    );

                                    await refresh(
                                      companyId
                                    );

                                  }}
                                  className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[8px] font-black text-emerald-300"
                                >
                                  {person.status ===
                                  "confirmed"
                                    ? "Teknede"
                                    : "Onayla"}
                                </button>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}


              {tab ===
                "services" && (
                <div>

                  <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">

                    <label>

                      <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                        Tür
                      </span>

                      <select
                        value={
                          serviceType
                        }
                        onChange={(
                          event
                        ) =>
                          setServiceType(
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-xs outline-none"
                      >

                        <option value="fuel">
                          Yakıt
                        </option>

                        <option value="catering">
                          Catering
                        </option>

                        <option value="decoration">
                          Süsleme
                        </option>

                        <option value="transfer">
                          Transfer
                        </option>

                        <option value="cleaning">
                          Temizlik
                        </option>

                        <option value="ice">
                          Buz
                        </option>

                        <option value="beverage">
                          İçecek
                        </option>

                        <option value="equipment">
                          Ekipman
                        </option>

                        <option value="photography">
                          Fotoğraf
                        </option>

                        <option value="activity">
                          Aktivite
                        </option>

                        <option value="other">
                          Diğer
                        </option>

                      </select>

                    </label>


                    <Field
                      label="Hizmet"
                      value={
                        serviceTitle
                      }
                      onChange={
                        setServiceTitle
                      }
                    />

                    <Field
                      label="Tedarikçi"
                      value={
                        serviceSupplier
                      }
                      onChange={
                        setServiceSupplier
                      }
                    />

                    <Field
                      label="Maliyet"
                      type="number"
                      value={
                        serviceCost
                      }
                      onChange={
                        setServiceCost
                      }
                    />

                    <Field
                      label="Satış"
                      type="number"
                      value={
                        serviceSale
                      }
                      onChange={
                        setServiceSale
                      }
                    />

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void addService()
                      }
                      className="mt-auto h-12 rounded-xl bg-orange-500 text-[9px] font-black"
                    >
                      Hizmet Ekle
                    </button>

                  </div>


                  <label className="mt-3 block max-w-sm">

                    <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                      Hazır Olması Gereken Saat
                    </span>

                    <input
                      type="datetime-local"
                      value={
                        serviceDue
                      }
                      onChange={(
                        event
                      ) =>
                        setServiceDue(
                          event.target.value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
                    />

                  </label>


                  <div className="mt-5 overflow-x-auto">

                    <table className="w-full min-w-[1050px] text-left">

                      <thead>
                        <tr className="text-[8px] font-black uppercase text-slate-600">

                          <th className="px-4 py-3">
                            Hizmet
                          </th>

                          <th className="px-4 py-3">
                            Tedarikçi
                          </th>

                          <th className="px-4 py-3">
                            Maliyet
                          </th>

                          <th className="px-4 py-3">
                            Satış
                          </th>

                          <th className="px-4 py-3">
                            Termin
                          </th>

                          <th className="px-4 py-3">
                            Durum
                          </th>

                          <th className="px-4 py-3">
                            Aksiyon
                          </th>

                        </tr>
                      </thead>

                      <tbody>

                        {selectedServices.map(
                          (
                            service
                          ) => (
                            <tr
                              key={
                                service.id
                              }
                              className="border-t border-white/[.06]"
                            >

                              <td className="px-4 py-3">

                                <div className="text-[9px] font-black">
                                  {
                                    service.title
                                  }
                                </div>

                                <div className="mt-1 text-[7px] text-slate-600">
                                  {
                                    service.service_type
                                  }
                                </div>

                              </td>

                              <td className="px-4 py-3 text-[8px]">
                                {
                                  service.supplier_name ||
                                  "—"
                                }
                              </td>

                              <td className="px-4 py-3 text-[9px] font-black text-slate-400">
                                {money(
                                  service.cost_amount,
                                  service.currency
                                )}
                              </td>

                              <td className="px-4 py-3 text-[9px] font-black text-emerald-300">
                                {money(
                                  service.sale_amount,
                                  service.currency
                                )}
                              </td>

                              <td className="px-4 py-3 text-[8px] text-slate-500">
                                {dateTime(
                                  service.due_at
                                )}
                              </td>

                              <td className="px-4 py-3 text-[8px] font-black">
                                {
                                  service.status
                                }
                              </td>

                              <td className="px-4 py-3">

                                <button
                                  type="button"
                                  onClick={async () => {

                                    const next =
                                      service.status ===
                                      "pending"
                                        ? "ordered"
                                        : service.status ===
                                          "ordered"
                                          ? "ready"
                                          : service.status ===
                                            "ready"
                                            ? "delivered"
                                            : "completed";


                                    await setYachtOperationServiceStatus(
                                      service.id,
                                      next
                                    );


                                    await refresh(
                                      companyId
                                    );

                                  }}
                                  className="rounded-lg bg-blue-500/10 px-3 py-2 text-[8px] font-black text-blue-300"
                                >
                                  İlerle
                                </button>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}


              {tab ===
                "timeline" && (
                <div className="space-y-3">

                  {selectedEvents.map(
                    (
                      event
                    ) => (
                      <div
                        key={
                          event.id
                        }
                        className="flex gap-4 rounded-2xl border border-white/[.07] bg-white/[.02] p-4"
                      >

                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                          <FaClock />
                        </div>


                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center justify-between gap-3">

                            <div className="text-[10px] font-black">
                              {
                                event.event_label
                              }
                            </div>

                            <div className="text-[8px] text-slate-600">
                              {dateTime(
                                event.created_at
                              )}
                            </div>

                          </div>


                          {event.note && (
                            <div className="mt-2 text-[9px] leading-5 text-slate-400">
                              {
                                event.note
                              }
                            </div>
                          )}

                        </div>

                      </div>
                    )
                  )}


                  {selectedEvents.length ===
                    0 && (
                    <div className="rounded-2xl border border-white/[.07] p-10 text-center text-[9px] text-slate-600">
                      Henüz operasyon hareketi yok.
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </main>
  );
}


function HeaderMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {

  return (
    <div className={`min-w-[112px] rounded-xl border px-4 py-3 ${
      danger
        ? "border-red-500/20 bg-red-500/[.07]"
        : "border-white/10 bg-black/10"
    }`}>

      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className={`mt-1 text-sm font-black ${
        danger
          ? "text-red-300"
          : "text-white"
      }`}>
        {value}
      </div>

    </div>
  );
}


function Kpi({
  label,
  value,
  detail,
  success = false,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  success?: boolean;
  danger?: boolean;
}) {

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
        {label}
      </div>

      <div className={`mt-3 text-2xl font-black ${
        success
          ? "text-emerald-300"
          : danger
            ? "text-red-300"
            : "text-white"
      }`}>
        {value}
      </div>

      <div className="mt-2 text-[8px] text-slate-500">
        {detail}
      </div>

    </div>
  );
}


function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange:
    (
      value: string
    ) => void;
  type?: string;
}) {

  return (
    <label>

      <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
        {label}
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
      />

    </label>
  );
}


function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-xl border border-white/[.07] bg-black/10 p-4">

      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-2 text-[10px] font-black">
        {value}
      </div>

    </div>
  );
}


function ActionButton({
  label,
  onClick,
  success = false,
  danger = false,
}: {
  label: string;
  onClick:
    () => void;
  success?: boolean;
  danger?: boolean;
}) {

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`h-11 rounded-xl border text-[8px] font-black transition ${
        success
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white"
          : danger
            ? "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"
            : "border-white/10 bg-white/[.03] text-slate-300 hover:border-orange-500/30 hover:text-orange-300"
      }`}
    >
      {label}
    </button>
  );
}
