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
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaLock,
  FaPlus,
  FaSearch,
  FaShip,
  FaTimes,
  FaUnlock,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  addYachtIncident,
  authorizeYachtDepartureOverride,
  getYachtDepartureReadiness,
  loadYachtDispatchCenter,
  seedYachtDepartureChecklist,
  setYachtDeparturePaymentRequirement,
  setYachtIncidentStatus,
  toggleYachtDepartureChecklist,

  type DepartureChecklistItem,
  type DepartureReadiness,
  type YachtIncident,
} from "@/lib/yacht-os/dispatch-control";


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


function riskTone(
  value: string
) {

  if (
    value ===
    "critical"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }


  if (
    value ===
    "high"
  ) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  }


  if (
    value ===
    "medium"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }


  return "border-blue-500/20 bg-blue-500/10 text-blue-300";
}


export default function YachtDispatchCenterPage() {

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
    useState<any[]>(
      []
    );

  const [
    yachts,
    setYachts,
  ] =
    useState<any[]>(
      []
    );

  const [
    checklist,
    setChecklist,
  ] =
    useState<
      DepartureChecklistItem[]
    >([]);

  const [
    incidents,
    setIncidents,
  ] =
    useState<
      YachtIncident[]
    >([]);

  const [
    crew,
    setCrew,
  ] =
    useState<any[]>(
      []
    );

  const [
    guests,
    setGuests,
  ] =
    useState<any[]>(
      []
    );

  const [
    services,
    setServices,
  ] =
    useState<any[]>(
      []
    );

  const [
    readiness,
    setReadiness,
  ] =
    useState<
      Record<
        string,
        DepartureReadiness
      >
    >({});

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState(
      "all"
    );

  const [
    selected,
    setSelected,
  ] =
    useState<any | null>(
      null
    );

  const [
    incidentTitle,
    setIncidentTitle,
  ] =
    useState("");

  const [
    incidentDescription,
    setIncidentDescription,
  ] =
    useState("");

  const [
    incidentSeverity,
    setIncidentSeverity,
  ] =
    useState(
      "medium"
    );

  const [
    incidentCategory,
    setIncidentCategory,
  ] =
    useState(
      "operation"
    );

  const [
    overrideReason,
    setOverrideReason,
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
        activeCompanyId:
          string
      ) => {

        const data =
          await loadYachtDispatchCenter(
            activeCompanyId
          );


        setBookings(
          data.bookings
        );

        setYachts(
          data.yachts
        );

        setChecklist(
          data.checklist
        );

        setIncidents(
          data.incidents
        );

        setCrew(
          data.crew
        );

        setGuests(
          data.guests
        );

        setServices(
          data.services
        );


        const active =
          data.bookings.filter(
            (
              booking:
                any
            ) =>
              ![
                "completed",
                "cancelled",
              ].includes(
                booking.operation_status
              )
          );


        const results =
          await Promise.all(
            active.map(
              async (
                booking:
                  any
              ) => {

                try {

                  const result =
                    await getYachtDepartureReadiness(
                      booking.id
                    );


                  return [
                    booking.id,
                    result,
                  ] as const;

                } catch {

                  return null;
                }

              }
            )
          );


        const map:
          Record<
            string,
            DepartureReadiness
          > = {};


        for (
          const item
          of results
        ) {

          if (item) {
            map[
              item[0]
            ] =
              item[1];
          }
        }


        setReadiness(
          map
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


  async function reloadSelected() {

    await refresh(
      companyId
    );


    if (selected) {

      const result =
        await getYachtDepartureReadiness(
          selected.id
        );


      setReadiness(
        (
          current
        ) => ({
          ...current,
          [
            selected.id
          ]:
            result,
        })
      );
    }
  }


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  const activeBookings =
    bookings.filter(
      (
        booking
      ) =>
        ![
          "completed",
          "cancelled",
        ].includes(
          booking.operation_status
        )
    );


  const readyCount =
    activeBookings.filter(
      (
        booking
      ) =>
        readiness[
          booking.id
        ]?.ready
    ).length;


  const blockedCount =
    activeBookings.filter(
      (
        booking
      ) =>
        readiness[
          booking.id
        ] &&
        !readiness[
          booking.id
        ].ready
    ).length;


  const criticalIncidents =
    incidents.filter(
      (
        incident
      ) =>
        [
          "high",
          "critical",
        ].includes(
          incident.severity
        ) &&
        [
          "open",
          "investigating",
        ].includes(
          incident.status
        )
    );


  const todayDepartures =
    bookings.filter(
      (
        booking
      ) =>
        booking.start_date ===
        today
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


        return activeBookings.filter(
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
              `${booking.booking_code} ${booking.guest_name} ${booking.guest_phone || ""} ${yacht?.name || ""}`
                .toLocaleLowerCase(
                  "tr"
                );


            const searchOk =
              !needle ||
              text.includes(
                needle
              );


            const state =
              readiness[
                booking.id
              ];


            const filterOk =
              filter ===
                "all" ||

              (
                filter ===
                  "ready" &&
                state?.ready
              ) ||

              (
                filter ===
                  "blocked" &&
                state &&
                !state.ready
              ) ||

              (
                filter ===
                  "override" &&
                state
                  ?.departure_override_active
              );


            return (
              searchOk &&
              filterOk
            );
          }
        );

      },
      [
        activeBookings,
        yachts,
        query,
        filter,
        readiness,
      ]
    );


  const selectedReadiness =
    selected
      ? readiness[
          selected.id
        ]
      : null;


  const selectedChecklist =
    selected
      ? checklist.filter(
          (
            item
          ) =>
            item.booking_id ===
            selected.id
        )
      : [];


  const selectedIncidents =
    selected
      ? incidents.filter(
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


  async function seedChecklist() {

    if (!selected) {
      return;
    }


    setSaving(true);


    try {

      await seedYachtDepartureChecklist(
        selected.id
      );


      await reloadSelected();


      toast(
        "Profesyonel çıkış checklisti hazırlandı."
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


  async function toggleChecklist(
    item:
      DepartureChecklistItem
  ) {

    try {

      await toggleYachtDepartureChecklist(
        item.id,
        !item.is_completed
      );


      await reloadSelected();

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
    }
  }


  async function createIncident() {

    if (
      !selected ||
      !incidentTitle.trim()
    ) {
      return;
    }


    setSaving(true);


    try {

      await addYachtIncident({
        companyId,

        bookingId:
          selected.id,

        yachtId:
          selected.yacht_id,

        severity:
          incidentSeverity,

        category:
          incidentCategory,

        title:
          incidentTitle.trim(),

        description:
          incidentDescription ||
          undefined,
      });


      setIncidentTitle("");
      setIncidentDescription("");


      await reloadSelected();


      toast(
        "Operasyon olayı kaydedildi."
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


  async function resolveIncident(
    incident:
      YachtIncident
  ) {

    try {

      await setYachtIncidentStatus(
        incident.id,
        "resolved"
      );


      await reloadSelected();


      toast(
        "Olay çözüldü."
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
    }
  }


  async function setPaymentGate(
    required:
      boolean
  ) {

    if (!selected) {
      return;
    }


    try {

      await setYachtDeparturePaymentRequirement(
        selected.id,
        required
      );


      setSelected({
        ...selected,

        requires_full_payment_before_departure:
          required,
      });


      await reloadSelected();


      toast(
        required
          ? "Tam ödeme çıkış şartı aktif."
          : "Tam ödeme çıkış şartı kaldırıldı."
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
    }
  }


  async function authorizeOverride() {

    if (
      !selected ||
      !overrideReason.trim()
    ) {

      setError(
        "Override için gerekçe zorunlu."
      );

      return;
    }


    setSaving(true);


    try {

      await authorizeYachtDepartureOverride(
        selected.id,
        overrideReason.trim()
      );


      setOverrideReason("");


      await reloadSelected();


      toast(
        "Yetkili çıkış override kaydı oluşturuldu."
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
        <FaUserShield className="animate-pulse text-4xl text-orange-400" />
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


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.13),transparent_32%),radial-gradient(circle_at_70%_0%,rgba(249,115,22,.12),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os/operation-center"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            YAT OPERASYON MERKEZİ
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.22em] text-red-300">
                  DEPARTURE CONTROL
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Güvenli Çıkış Kapısı
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Sefer Çıkış &{" "}
                <span className="text-orange-400">
                  Güvenlik Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Manifest, kaptan, checklist, kritik hizmetler,
                olaylar ve ödeme şartı tamamlanmadan çıkışı engelleyen operasyon kapısı.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

              <HeaderMetric
                label="Bugün"
                value={String(
                  todayDepartures.length
                )}
              />

              <HeaderMetric
                label="Çıkışa Hazır"
                value={String(
                  readyCount
                )}
                success
              />

              <HeaderMetric
                label="Bloke"
                value={String(
                  blockedCount
                )}
                danger={
                  blockedCount >
                  0
                }
              />

              <HeaderMetric
                label="Kritik Olay"
                value={String(
                  criticalIncidents.length
                )}
                danger={
                  criticalIncidents.length >
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


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <Kpi
            label="Aktif Operasyon"
            value={String(
              activeBookings.length
            )}
            detail="Tamamlanmamış rezervasyon"
          />

          <Kpi
            label="Çıkışa Hazır"
            value={String(
              readyCount
            )}
            detail="Tüm güvenlik kontrolleri tamam"
            success
          />

          <Kpi
            label="Çıkış Blokajı"
            value={String(
              blockedCount
            )}
            detail="En az bir kritik eksik"
            danger={
              blockedCount >
              0
            }
          />

          <Kpi
            label="Açık Risk Olayı"
            value={String(
              incidents.filter(
                (
                  item
                ) =>
                  [
                    "open",
                    "investigating",
                  ].includes(
                    item.status
                  )
              ).length
            )}
            detail="Operasyon ve güvenlik olayları"
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
                placeholder="Rezervasyon, müşteri, telefon veya tekne ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-600" />

              <select
                value={
                  filter
                }
                onChange={(
                  event
                ) =>
                  setFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >

                <option value="all">
                  Tüm Operasyonlar
                </option>

                <option value="ready">
                  Çıkışa Hazır
                </option>

                <option value="blocked">
                  Bloke
                </option>

                <option value="override">
                  Override Verilen
                </option>

              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1750px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Manifest
                  </th>

                  <th className="px-5 py-4">
                    Kaptan
                  </th>

                  <th className="px-5 py-4">
                    Checklist
                  </th>

                  <th className="px-5 py-4">
                    Kritik Hizmet
                  </th>

                  <th className="px-5 py-4">
                    Risk Olayı
                  </th>

                  <th className="px-5 py-4">
                    Bakiye
                  </th>

                  <th className="px-5 py-4">
                    Skor
                  </th>

                  <th className="px-5 py-4">
                    Çıkış Durumu
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


                    const state =
                      readiness[
                        booking.id
                      ];


                    const remaining =
                      Math.max(
                        Number(
                          booking.total_amount
                        ) -
                        Number(
                          booking.paid_amount
                        ),
                        0
                      );


                    return (
                      <tr
                        key={
                          booking.id
                        }
                        className={`border-t border-white/[.06] transition hover:bg-white/[.025] ${
                          state &&
                          !state.ready
                            ? "bg-red-500/[.018]"
                            : ""
                        }`}
                      >

                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              booking.booking_code
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              booking.operation_status
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


                        <td className="px-5 py-4 text-[9px] font-black">
                          {state
                            ? `${state.manifest_checked}/${state.guest_count}`
                            : "—"}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[8px] font-black ${
                            state
                              ?.captain_ready
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-red-500/10 text-red-300"
                          }`}>
                            {state
                              ?.captain_ready
                              ? "HAZIR"
                              : "EKSİK"}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {state
                            ? `${state.required_checklist_completed}/${state.required_checklist_total}`
                            : "—"}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`text-[9px] font-black ${
                            (
                              state
                                ?.service_blockers ||
                              0
                            ) >
                            0
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}>
                            {
                              state
                                ?.service_blockers ??
                              0
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span className={`text-[9px] font-black ${
                            (
                              state
                                ?.incident_blockers ||
                              0
                            ) >
                            0
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}>
                            {
                              state
                                ?.incident_blockers ??
                              0
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <div className={`text-[9px] font-black ${
                            state
                              ?.payment_blocker
                              ? "text-red-300"
                              : "text-slate-300"
                          }`}>
                            {money(
                              remaining
                            )}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {booking
                              .requires_full_payment_before_departure
                              ? "Tam ödeme şart"
                              : "Esnek"}
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <span className={`text-lg font-black ${
                            (
                              state
                                ?.score ||
                              0
                            ) >=
                            85
                              ? "text-emerald-300"
                              : (
                                  state
                                    ?.score ||
                                  0
                                ) >=
                                60
                                ? "text-amber-300"
                                : "text-red-300"
                          }`}>
                            {
                              state
                                ?.score ??
                              0
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          {state
                            ?.departure_override_active ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[8px] font-black text-violet-300">
                              <FaUnlock />
                              OVERRIDE
                            </span>
                          ) : state
                              ?.ready ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                              <FaCheckCircle />
                              ÇIKIŞA HAZIR
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[8px] font-black text-red-300">
                              <FaLock />
                              BLOKE
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              setSelected(
                                booking
                              )
                            }
                            className="h-9 rounded-lg bg-orange-500 px-4 text-[8px] font-black"
                          >
                            Kontrol Dosyası
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
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">

          <div className="mx-auto my-5 max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#07131f] shadow-2xl">


            <div className="flex items-start justify-between border-b border-white/10 p-6">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  DEPARTURE CONTROL FILE
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


                {selectedReadiness && (
                  <div className="mt-3 flex flex-wrap gap-2">

                    <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black ${
                      selectedReadiness.ready
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                    }`}>
                      {selectedReadiness.ready
                        ? "ÇIKIŞA HAZIR"
                        : `${selectedReadiness.blocker_count} BLOKAJ`}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[8px] font-black">
                      SKOR:
                      {" "}
                      {
                        selectedReadiness.score
                      }
                    </span>

                  </div>
                )}

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


            <div className="grid gap-5 p-6 xl:grid-cols-[1.1fr_.9fr]">


              <div className="space-y-5">


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <div className="text-sm font-black">
                        Çıkış Blokajları
                      </div>

                      <div className="mt-1 text-[8px] text-slate-500">
                        Sistem tarafından gerçek zamanlı hesaplanır
                      </div>

                    </div>


                    <div className={`grid h-11 w-11 place-items-center rounded-xl ${
                      selectedReadiness
                        ?.ready
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {selectedReadiness
                        ?.ready
                        ? <FaCheckCircle />
                        : <FaExclamationTriangle />}
                    </div>

                  </div>


                  <div className="mt-4 space-y-2">

                    {selectedReadiness
                      ?.blockers
                      ?.map(
                        (
                          blocker
                        ) => (
                          <div
                            key={
                              blocker.code
                            }
                            className="flex items-start gap-3 rounded-xl border border-red-500/15 bg-red-500/[.04] p-3"
                          >

                            <FaLock className="mt-0.5 shrink-0 text-red-400" />

                            <div>

                              <div className="text-[8px] font-black uppercase text-red-300">
                                {
                                  blocker.code
                                }
                              </div>

                              <div className="mt-1 text-[9px] text-slate-300">
                                {
                                  blocker.label
                                }
                              </div>

                            </div>

                          </div>
                        )
                      )}


                    {selectedReadiness
                      ?.ready && (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] p-4 text-emerald-300">
                        <FaCheckCircle />
                        <span className="text-[10px] font-black">
                          Tüm çıkış kontrolleri tamam.
                        </span>
                      </div>
                    )}

                  </div>

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <div className="text-sm font-black">
                        Profesyonel Çıkış Checklisti
                      </div>

                      <div className="mt-1 text-[8px] text-slate-500">
                        Güvenlik, teknik, belge, crew ve misafir kontrolleri
                      </div>

                    </div>


                    {selectedChecklist.length ===
                      0 && (
                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void seedChecklist()
                        }
                        className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
                      >
                        <FaPlus />
                        Checklist Oluştur
                      </button>
                    )}

                  </div>


                  <div className="mt-4 space-y-2">

                    {selectedChecklist.map(
                      (
                        item
                      ) => (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() =>
                            void toggleChecklist(
                              item
                            )
                          }
                          className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                            item.is_completed
                              ? "border-emerald-500/20 bg-emerald-500/[.05]"
                              : "border-white/[.07] bg-black/10"
                          }`}
                        >

                          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${
                            item.is_completed
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-white/20 text-transparent"
                          }`}>
                            <FaCheck className="text-[9px]" />
                          </span>


                          <span className="min-w-0">

                            <span className="block text-[9px] font-black">
                              {
                                item.title
                              }
                            </span>

                            <span className="mt-1 block text-[8px] leading-4 text-slate-500">
                              {
                                item.description ||
                                "—"
                              }
                            </span>

                            <span className="mt-2 inline-block rounded-md bg-white/[.04] px-2 py-1 text-[7px] font-black uppercase text-slate-600">
                              {
                                item.category
                              }
                              {item.is_required
                                ? " · ZORUNLU"
                                : ""}
                            </span>

                          </span>

                        </button>
                      )
                    )}

                  </div>

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Olay & Risk Merkezi
                  </div>


                  <div className="mt-4 grid gap-3 md:grid-cols-2">

                    <label>

                      <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                        Önem
                      </span>

                      <select
                        value={
                          incidentSeverity
                        }
                        onChange={(
                          event
                        ) =>
                          setIncidentSeverity(
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] font-black"
                      >

                        <option value="low">
                          Düşük
                        </option>

                        <option value="medium">
                          Orta
                        </option>

                        <option value="high">
                          Yüksek
                        </option>

                        <option value="critical">
                          Kritik
                        </option>

                      </select>

                    </label>


                    <label>

                      <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                        Kategori
                      </span>

                      <select
                        value={
                          incidentCategory
                        }
                        onChange={(
                          event
                        ) =>
                          setIncidentCategory(
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] font-black"
                      >

                        <option value="operation">
                          Operasyon
                        </option>

                        <option value="safety">
                          Güvenlik
                        </option>

                        <option value="technical">
                          Teknik
                        </option>

                        <option value="guest">
                          Misafir
                        </option>

                        <option value="crew">
                          Crew
                        </option>

                        <option value="weather">
                          Hava
                        </option>

                        <option value="marina">
                          Marina
                        </option>

                        <option value="finance">
                          Finans
                        </option>

                        <option value="other">
                          Diğer
                        </option>

                      </select>

                    </label>

                  </div>


                  <input
                    value={
                      incidentTitle
                    }
                    onChange={(
                      event
                    ) =>
                      setIncidentTitle(
                        event.target.value
                      )
                    }
                    placeholder="Olay / risk başlığı..."
                    className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
                  />


                  <textarea
                    value={
                      incidentDescription
                    }
                    onChange={(
                      event
                    ) =>
                      setIncidentDescription(
                        event.target.value
                      )
                    }
                    placeholder="Detay..."
                    className="mt-3 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
                  />


                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void createIncident()
                    }
                    className="mt-3 h-10 rounded-xl border border-red-500/20 bg-red-500/[.07] px-4 text-[8px] font-black text-red-300"
                  >
                    Olay Kaydet
                  </button>


                  <div className="mt-5 space-y-2">

                    {selectedIncidents.map(
                      (
                        incident
                      ) => (
                        <div
                          key={
                            incident.id
                          }
                          className="rounded-xl border border-white/[.07] bg-black/10 p-4"
                        >

                          <div className="flex items-start justify-between gap-4">

                            <div>

                              <div className="flex flex-wrap gap-2">

                                <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${riskTone(
                                  incident.severity
                                )}`}>
                                  {
                                    incident.severity
                                  }
                                </span>

                                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[7px] font-black text-slate-500">
                                  {
                                    incident.status
                                  }
                                </span>

                              </div>


                              <div className="mt-3 text-[10px] font-black">
                                {
                                  incident.title
                                }
                              </div>

                              <div className="mt-1 text-[8px] text-slate-500">
                                {dateTime(
                                  incident.occurred_at
                                )}
                              </div>

                            </div>


                            {[
                              "open",
                              "investigating",
                            ].includes(
                              incident.status
                            ) && (
                              <button
                                type="button"
                                onClick={() =>
                                  void resolveIncident(
                                    incident
                                  )
                                }
                                className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[8px] font-black text-emerald-300"
                              >
                                Çözüldü
                              </button>
                            )}

                          </div>

                        </div>
                      )
                    )}

                  </div>

                </section>

              </div>


              <div className="space-y-5">


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Sefer Hazırlık Özeti
                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-3">

                    <Mini
                      label="Manifest"
                      value={`${selectedGuests.filter(
                        (
                          item
                        ) =>
                          [
                            "checked_in",
                            "boarded",
                          ].includes(
                            item.check_in_status
                          )
                      ).length}/${selected.guest_count}`}
                    />

                    <Mini
                      label="Crew"
                      value={String(
                        selectedCrew.length
                      )}
                    />

                    <Mini
                      label="Kaptan"
                      value={
                        selectedCrew.some(
                          (
                            item
                          ) =>
                            item.role ===
                              "captain" &&
                            [
                              "confirmed",
                              "on_board",
                              "completed",
                            ].includes(
                              item.status
                            )
                        )
                          ? "Hazır"
                          : "Eksik"
                      }
                    />

                    <Mini
                      label="Açık Kritik Hizmet"
                      value={String(
                        selectedServices.filter(
                          (
                            item
                          ) =>
                            item.is_departure_blocker &&
                            ![
                              "ready",
                              "delivered",
                              "completed",
                              "cancelled",
                            ].includes(
                              item.status
                            )
                        ).length
                      )}
                    />

                    <Mini
                      label="Tahsilat"
                      value={money(
                        selected.paid_amount
                      )}
                    />

                    <Mini
                      label="Kalan"
                      value={money(
                        Math.max(
                          Number(
                            selected.total_amount
                          ) -
                          Number(
                            selected.paid_amount
                          ),
                          0
                        )
                      )}
                    />

                  </div>

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Ödeme Çıkış Politikası
                  </div>


                  <div className="mt-4 rounded-xl border border-white/[.07] bg-black/10 p-4">

                    <div className="flex items-center justify-between gap-4">

                      <div>

                        <div className="text-[9px] font-black">
                          Tam ödeme olmadan çıkış
                        </div>

                        <div className="mt-1 text-[8px] text-slate-500">
                          Aktif edilirse bakiye sıfırlanmadan tekne çıkamaz.
                        </div>

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          void setPaymentGate(
                            !selected
                              .requires_full_payment_before_departure
                          )
                        }
                        className={`rounded-xl px-4 py-2 text-[8px] font-black ${
                          selected
                            .requires_full_payment_before_departure
                            ? "bg-red-500 text-white"
                            : "border border-white/10 text-slate-400"
                        }`}
                      >
                        {selected
                          .requires_full_payment_before_departure
                          ? "ZORUNLU"
                          : "ESNEK"}
                      </button>

                    </div>

                  </div>

                </section>


                <section className="rounded-[24px] border border-red-500/15 bg-red-500/[.025] p-5">

                  <div className="flex items-center gap-3">

                    <FaUserShield className="text-red-400" />

                    <div>

                      <div className="text-sm font-black">
                        Yetkili Override
                      </div>

                      <div className="mt-1 text-[8px] text-slate-500">
                        Yalnız yetkili operasyon yöneticisi kullanabilir.
                      </div>

                    </div>

                  </div>


                  {selectedReadiness
                    ?.departure_override_active && (
                    <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/[.06] p-4">

                      <div className="text-[8px] font-black text-violet-300">
                        AKTİF OVERRIDE
                      </div>

                      <div className="mt-2 text-[9px] leading-5 text-slate-300">
                        {
                          selectedReadiness.departure_override_reason ||
                          "Gerekçe kaydı mevcut."
                        }
                      </div>

                    </div>
                  )}


                  {!selectedReadiness
                    ?.departure_override_active && (
                    <>

                      <textarea
                        value={
                          overrideReason
                        }
                        onChange={(
                          event
                        ) =>
                          setOverrideReason(
                            event.target.value
                          )
                        }
                        placeholder="Override gerekçesi zorunlu..."
                        className="mt-4 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/10 p-4 text-xs outline-none"
                      />


                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void authorizeOverride()
                        }
                        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-500 text-[9px] font-black"
                      >
                        <FaUnlock />
                        Yetkili Override Ver
                      </button>

                    </>
                  )}

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Sistem Kuralı
                  </div>


                  <div className="mt-3 flex items-start gap-3 rounded-xl border border-orange-500/15 bg-orange-500/[.04] p-4">

                    <FaLock className="mt-0.5 shrink-0 text-orange-400" />

                    <div className="text-[8px] leading-5 text-slate-400">
                      Bu kontrol yalnız ekranda çalışan bir uyarı değildir.
                      Veritabanı trigger’ı herhangi bir kod yolundan
                      <b className="text-white"> departed </b>
                      durumuna geçişi kontrol eder. Böylece eski operasyon
                      ekranından veya farklı bir istemciden güvenlik kapısı
                      atlanamaz.
                    </div>

                  </div>

                </section>

              </div>

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
  success = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
}) {

  return (
    <div className={`min-w-[115px] rounded-xl border px-4 py-3 ${
      danger
        ? "border-red-500/20 bg-red-500/[.07]"
        : success
          ? "border-emerald-500/20 bg-emerald-500/[.06]"
          : "border-white/10 bg-black/10"
    }`}>

      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className={`mt-1 text-sm font-black ${
        danger
          ? "text-red-300"
          : success
            ? "text-emerald-300"
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
