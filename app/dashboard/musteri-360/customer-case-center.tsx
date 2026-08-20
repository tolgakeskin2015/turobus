"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBell,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUserCheck,
} from "react-icons/fa";

import {
  addCustomer360Case,
  loadCustomer360CaseSnapshot,
  updateCustomer360Case,
} from "@/lib/customer-360/repository";

import type {
  Customer360CasePriority,
  Customer360CaseRow,
  Customer360CaseSnapshot,
  Customer360CaseStatus,
  Customer360CaseType,
} from "@/lib/customer-360/repository";


type Props = {
  customerId:
    string;
};


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

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}


function caseTypeLabel(
  value:
    Customer360CaseType
) {
  return value ===
    "complaint"
      ? "Şikâyet"
      : "Talep";
}


function statusLabel(
  value:
    Customer360CaseStatus
) {
  const map:
    Record<
      Customer360CaseStatus,
      string
    > = {
      open:
        "Açık",

      in_progress:
        "İşlemde",

      resolved:
        "Çözüldü",

      closed:
        "Kapalı",
    };


  return map[
    value
  ];
}


function priorityLabel(
  value:
    Customer360CasePriority
) {
  const map:
    Record<
      Customer360CasePriority,
      string
    > = {
      low:
        "Düşük",

      medium:
        "Orta",

      high:
        "Yüksek",

      critical:
        "Kritik",
    };


  return map[
    value
  ];
}


function priorityClass(
  value:
    Customer360CasePriority
) {
  if (
    value ===
      "critical"
  ) {
    return "border-red-500/20 bg-red-500/[.07] text-red-300";
  }


  if (
    value ===
      "high"
  ) {
    return "border-orange-500/20 bg-orange-500/[.07] text-orange-300";
  }


  if (
    value ===
      "medium"
  ) {
    return "border-amber-500/20 bg-amber-500/[.06] text-amber-300";
  }


  return "border-white/10 bg-white/[.03] text-slate-400";
}


function slaLabel(
  row:
    Customer360CaseRow
) {
  if (
    row.sla_state ===
      "overdue"
  ) {
    return "SLA GECİKMİŞ";
  }


  if (
    row.sla_state ===
      "due_soon"
  ) {
    return "24 SAAT İÇİNDE";
  }


  if (
    row.sla_state ===
      "on_track"
  ) {
    return "ZAMANINDA";
  }


  if (
    row.sla_state ===
      "completed"
  ) {
    return "TAMAMLANDI";
  }


  return "SÜRE YOK";
}


function slaClass(
  row:
    Customer360CaseRow
) {
  if (
    row.sla_state ===
      "overdue"
  ) {
    return "border-red-500/20 bg-red-500/[.07] text-red-300";
  }


  if (
    row.sla_state ===
      "due_soon"
  ) {
    return "border-amber-500/20 bg-amber-500/[.06] text-amber-300";
  }


  if (
    row.sla_state ===
      "on_track"
  ) {
    return "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300";
  }


  return "border-white/10 bg-white/[.03] text-slate-500";
}


export default function CustomerCaseCenter({
  customerId,
}: Props) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      Customer360CaseSnapshot | null
    >(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


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
    notice,
    setNotice,
  ] =
    useState("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<
      "all" |
      Customer360CaseType
    >(
      "all"
    );


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "all" |
      Customer360CaseStatus
    >(
      "all"
    );


  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<
      "all" |
      Customer360CasePriority
    >(
      "all"
    );


  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(
      false
    );


  const [
    formType,
    setFormType,
  ] =
    useState<
      Customer360CaseType
    >(
      "request"
    );


  const [
    formTitle,
    setFormTitle,
  ] =
    useState("");


  const [
    formDetail,
    setFormDetail,
  ] =
    useState("");


  const [
    formPriority,
    setFormPriority,
  ] =
    useState<
      Customer360CasePriority
    >(
      "medium"
    );


  const [
    formDueAt,
    setFormDueAt,
  ] =
    useState("");


  const [
    takeOwnership,
    setTakeOwnership,
  ] =
    useState(
      true
    );


  const refresh =
    useCallback(
      async () => {
        const result =
          await loadCustomer360CaseSnapshot(
            customerId
          );


        setSnapshot(
          result
        );
      },
      [
        customerId,
      ]
    );


  useEffect(() => {
    void (
      async () => {
        try {
          await refresh();

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
    refresh,
  ]);


  const rows =
    snapshot?.cases ??
    [];


  const filtered =
    useMemo(
      () => {
        const needle =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return rows.filter(
          (
            row
          ) => {
            if (
              typeFilter !==
                "all" &&
              row.case_type !==
                typeFilter
            ) {
              return false;
            }


            if (
              statusFilter !==
                "all" &&
              row.status !==
                statusFilter
            ) {
              return false;
            }


            if (
              priorityFilter !==
                "all" &&
              row.priority !==
                priorityFilter
            ) {
              return false;
            }


            if (!needle) {
              return true;
            }


            return [
              row.title,
              row.detail,
              row.resolution_note,
              caseTypeLabel(
                row.case_type
              ),
              priorityLabel(
                row.priority
              ),
              statusLabel(
                row.status
              ),
            ]
              .filter(
                Boolean
              )
              .join(" ")
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
        rows,
        search,
        typeFilter,
        statusFilter,
        priorityFilter,
      ]
    );


  const stats =
    useMemo(
      () => ({
        total:
          rows.length,

        open:
          rows.filter(
            (
              row
            ) =>
              row.status ===
              "open"
          ).length,

        active:
          rows.filter(
            (
              row
            ) =>
              row.status ===
              "in_progress"
          ).length,

        critical:
          rows.filter(
            (
              row
            ) =>
              row.priority ===
                "critical" &&
              ![
                "resolved",
                "closed",
              ].includes(
                row.status
              )
          ).length,

        overdue:
          rows.filter(
            (
              row
            ) =>
              row.sla_state ===
              "overdue"
          ).length,

        resolved:
          rows.filter(
            (
              row
            ) =>
              [
                "resolved",
                "closed",
              ].includes(
                row.status
              )
          ).length,
      }),
      [
        rows,
      ]
    );


  async function createCase() {
    if (
      !formTitle.trim()
    ) {
      setError(
        "Talep veya şikâyet başlığı gerekli."
      );

      return;
    }


    setBusyId(
      "create"
    );

    setError("");
    setNotice("");


    try {
      await addCustomer360Case(
        {
          customerId,

          caseType:
            formType,

          title:
            formTitle.trim(),

          detail:
            formDetail.trim(),

          priority:
            formPriority,

          dueAt:
            formDueAt
              ? new Date(
                  formDueAt
                ).toISOString()
              : undefined,

          takeOwnership,
        }
      );


      await refresh();


      setFormTitle("");
      setFormDetail("");
      setFormDueAt("");
      setFormPriority(
        "medium"
      );
      setFormType(
        "request"
      );
      setTakeOwnership(
        true
      );

      setModalOpen(
        false
      );

      setNotice(
        "Yeni kayıt Customer 360 operasyon merkezine eklendi."
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
      setBusyId("");
    }
  }


  async function applyAction(
    row:
      Customer360CaseRow,
    action:
      "take"
      | "progress"
      | "resolve"
      | "close"
  ) {
    setBusyId(
      row.id
    );

    setError("");
    setNotice("");


    try {
      if (
        action ===
          "take"
      ) {
        await updateCustomer360Case(
          {
            caseId:
              row.id,

            takeOwnership:
              true,
          }
        );
      }


      if (
        action ===
          "progress"
      ) {
        await updateCustomer360Case(
          {
            caseId:
              row.id,

            status:
              "in_progress",

            takeOwnership:
              true,
          }
        );
      }


      if (
        action ===
          "resolve"
      ) {
        await updateCustomer360Case(
          {
            caseId:
              row.id,

            status:
              "resolved",

            takeOwnership:
              true,
          }
        );
      }


      if (
        action ===
          "close"
      ) {
        await updateCustomer360Case(
          {
            caseId:
              row.id,

            status:
              "closed",

            takeOwnership:
              true,
          }
        );
      }


      await refresh();


      setNotice(
        "Talep / şikâyet durumu güncellendi."
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
      setBusyId("");
    }
  }


  if (
    loading
  ) {
    return (
      <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-10 text-center text-[10px] text-slate-600">
        Talep ve şikâyet merkezi yükleniyor...
      </section>
    );
  }


  return (
    <>
      <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

        <div className="border-b border-white/[.07] p-5">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-orange-300" />

                <h2 className="text-sm font-black">
                  Talepler & Şikâyetler Merkezi
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-[9px] leading-5 text-slate-600">
                Müşteri taleplerini, şikâyetleri, öncelikleri, sorumluluğu ve SLA sürelerini tek operasyon görünümünden takip edin.
              </p>
            </div>


            <button
              type="button"
              onClick={() =>
                setModalOpen(
                  true
                )
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[9px] font-black text-white"
            >
              <FaPlus />
              Yeni Talep / Şikâyet
            </button>

          </div>


          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-6">

            {[
              [
                "Toplam",
                stats.total,
              ],

              [
                "Açık",
                stats.open,
              ],

              [
                "İşlemde",
                stats.active,
              ],

              [
                "Kritik",
                stats.critical,
              ],

              [
                "SLA Gecikmiş",
                stats.overdue,
              ],

              [
                "Çözülen",
                stats.resolved,
              ],
            ].map(
              (
                item
              ) => (
                <div
                  key={
                    String(
                      item[0]
                    )
                  }
                  className="rounded-xl border border-white/[.07] bg-black/20 p-4"
                >
                  <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                    {item[0]}
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {item[1]}
                  </div>
                </div>
              )
            )}

          </div>


          <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_160px_160px_160px]">

            <div className="relative">

              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600" />

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
                placeholder="Başlık, detay veya çözüm notu ara..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] outline-none focus:border-orange-500/40"
              />

            </div>


            <select
              value={
                typeFilter
              }
              onChange={(
                event
              ) =>
                setTypeFilter(
                  event.target.value as
                    | "all"
                    | Customer360CaseType
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="all">
                Tüm Tipler
              </option>

              <option value="request">
                Talepler
              </option>

              <option value="complaint">
                Şikâyetler
              </option>
            </select>


            <select
              value={
                priorityFilter
              }
              onChange={(
                event
              ) =>
                setPriorityFilter(
                  event.target.value as
                    | "all"
                    | Customer360CasePriority
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="all">
                Tüm Öncelikler
              </option>

              <option value="critical">
                Kritik
              </option>

              <option value="high">
                Yüksek
              </option>

              <option value="medium">
                Orta
              </option>

              <option value="low">
                Düşük
              </option>
            </select>


            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | Customer360CaseStatus
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="all">
                Tüm Durumlar
              </option>

              <option value="open">
                Açık
              </option>

              <option value="in_progress">
                İşlemde
              </option>

              <option value="resolved">
                Çözüldü
              </option>

              <option value="closed">
                Kapalı
              </option>
            </select>

          </div>

        </div>


        {error && (
          <div className="border-b border-red-500/10 bg-red-500/[.05] px-5 py-4 text-[9px] font-bold text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="border-b border-emerald-500/10 bg-emerald-500/[.04] px-5 py-4 text-[9px] font-bold text-emerald-300">
            {notice}
          </div>
        )}


        {filtered.length ===
        0 ? (
          <div className="p-12 text-center">

            <FaCheckCircle className="mx-auto text-4xl text-slate-800" />

            <div className="mt-4 text-xs font-black">
              Kayıt bulunamadı
            </div>

            <div className="mt-2 text-[9px] text-slate-600">
              Müşteriye ait gerçek talep veya şikâyet kayıtları burada görünür.
            </div>

          </div>
        ) : (
          <div className="max-h-[760px] overflow-auto">

            <table className="min-w-[1450px] w-full">

              <thead className="sticky top-0 z-10 bg-[#091725]">

                <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">

                  <th className="px-5 py-4">
                    Tip / Başlık
                  </th>

                  <th className="px-5 py-4">
                    Öncelik
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                  <th className="px-5 py-4">
                    SLA
                  </th>

                  <th className="px-5 py-4">
                    Sorumlu
                  </th>

                  <th className="px-5 py-4">
                    Açılış
                  </th>

                  <th className="px-5 py-4">
                    Son Tarih
                  </th>

                  <th className="px-5 py-4">
                    Hızlı İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map(
                  (
                    row
                  ) => (
                    <tr
                      key={
                        row.id
                      }
                      className="border-b border-white/[.045] align-top hover:bg-white/[.02]"
                    >

                      <td className="max-w-[380px] px-5 py-4">

                        <div className="text-[7px] font-black uppercase tracking-[.12em] text-orange-300">
                          {caseTypeLabel(
                            row.case_type
                          )}
                        </div>

                        <div className="mt-2 text-[10px] font-black text-slate-200">
                          {row.title}
                        </div>

                        {row.detail && (
                          <div className="mt-2 line-clamp-2 text-[8px] leading-4 text-slate-600">
                            {row.detail}
                          </div>
                        )}

                        {row.resolution_note && (
                          <div className="mt-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[.03] px-3 py-2 text-[8px] leading-4 text-emerald-200/70">
                            {row.resolution_note}
                          </div>
                        )}

                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${priorityClass(
                            row.priority
                          )}`}
                        >
                          {priorityLabel(
                            row.priority
                          )}
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[7px] font-black text-slate-300">
                          {statusLabel(
                            row.status
                          )}
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${slaClass(
                            row
                          )}`}
                        >
                          {row.sla_state ===
                          "overdue"
                            ? <FaBell />
                            : <FaClock />}

                          {slaLabel(
                            row
                          )}
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400">
                          <FaUserCheck />

                          {row.assigned_to
                            ? "Atandı"
                            : "Atanmadı"}
                        </div>

                      </td>


                      <td className="px-5 py-4 text-[8px] text-slate-500">
                        {formatDate(
                          row.created_at
                        )}
                      </td>


                      <td className="px-5 py-4 text-[8px] text-slate-500">
                        {formatDate(
                          row.due_at
                        )}
                      </td>


                      <td className="px-5 py-4">

                        <div className="flex flex-wrap gap-2">

                          {!row.assigned_to && (
                            <button
                              type="button"
                              disabled={
                                busyId ===
                                row.id
                              }
                              onClick={() =>
                                void applyAction(
                                  row,
                                  "take"
                                )
                              }
                              className="rounded-lg border border-white/10 px-2.5 py-2 text-[7px] font-black text-slate-400 hover:text-white disabled:opacity-40"
                            >
                              Üzerime Al
                            </button>
                          )}


                          {row.status ===
                          "open" && (
                            <button
                              type="button"
                              disabled={
                                busyId ===
                                row.id
                              }
                              onClick={() =>
                                void applyAction(
                                  row,
                                  "progress"
                                )
                              }
                              className="rounded-lg border border-blue-500/20 bg-blue-500/[.05] px-2.5 py-2 text-[7px] font-black text-blue-300 disabled:opacity-40"
                            >
                              İşleme Al
                            </button>
                          )}


                          {[
                            "open",
                            "in_progress",
                          ].includes(
                            row.status
                          ) && (
                            <button
                              type="button"
                              disabled={
                                busyId ===
                                row.id
                              }
                              onClick={() =>
                                void applyAction(
                                  row,
                                  "resolve"
                                )
                              }
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/[.05] px-2.5 py-2 text-[7px] font-black text-emerald-300 disabled:opacity-40"
                            >
                              Çözüldü
                            </button>
                          )}


                          {row.status ===
                          "resolved" && (
                            <button
                              type="button"
                              disabled={
                                busyId ===
                                row.id
                              }
                              onClick={() =>
                                void applyAction(
                                  row,
                                  "close"
                                )
                              }
                              className="rounded-lg border border-white/10 px-2.5 py-2 text-[7px] font-black text-slate-400 disabled:opacity-40"
                            >
                              Kapat
                            </button>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>


      {modalOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f] shadow-2xl">

            <div className="flex items-center justify-between border-b border-white/[.07] p-5">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
                  CUSTOMER 360
                </div>

                <div className="mt-1 text-lg font-black">
                  Yeni Talep / Şikâyet
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-500"
              >
                <FaTimes />
              </button>

            </div>


            <div className="grid gap-4 p-5">

              <div className="grid gap-4 sm:grid-cols-2">

                <label>

                  <span className="text-[8px] font-black uppercase text-slate-600">
                    Kayıt Tipi
                  </span>

                  <select
                    value={
                      formType
                    }
                    onChange={(
                      event
                    ) =>
                      setFormType(
                        event.target.value as
                          Customer360CaseType
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                  >
                    <option value="request">
                      Talep
                    </option>

                    <option value="complaint">
                      Şikâyet
                    </option>
                  </select>

                </label>


                <label>

                  <span className="text-[8px] font-black uppercase text-slate-600">
                    Öncelik
                  </span>

                  <select
                    value={
                      formPriority
                    }
                    onChange={(
                      event
                    ) =>
                      setFormPriority(
                        event.target.value as
                          Customer360CasePriority
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
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

              </div>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Başlık
                </span>

                <input
                  value={
                    formTitle
                  }
                  onChange={(
                    event
                  ) =>
                    setFormTitle(
                      event.target.value
                    )
                  }
                  placeholder="Örn. Transfer saati değişiklik talebi"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px] outline-none focus:border-orange-500/40"
                />

              </label>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Detay
                </span>

                <textarea
                  value={
                    formDetail
                  }
                  onChange={(
                    event
                  ) =>
                    setFormDetail(
                      event.target.value
                    )
                  }
                  rows={
                    5
                  }
                  placeholder="Talep veya şikâyetin gerçek operasyon detayını yazın..."
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#030a11] p-4 text-[10px] leading-5 outline-none focus:border-orange-500/40"
                />

              </label>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  SLA / Son Çözüm Tarihi
                </span>

                <input
                  type="datetime-local"
                  value={
                    formDueAt
                  }
                  onChange={(
                    event
                  ) =>
                    setFormDueAt(
                      event.target.value
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                />

              </label>


              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">

                <input
                  type="checkbox"
                  checked={
                    takeOwnership
                  }
                  onChange={(
                    event
                  ) =>
                    setTakeOwnership(
                      event.target.checked
                    )
                  }
                />

                <div>

                  <div className="text-[9px] font-black">
                    Kaydı üzerime al
                  </div>

                  <div className="mt-1 text-[8px] text-slate-600">
                    Yeni kayıt doğrudan işlemi yapan kullanıcıya atanır.
                  </div>

                </div>

              </label>


              <button
                type="button"
                disabled={
                  busyId ===
                    "create" ||
                  !formTitle.trim()
                }
                onClick={() =>
                  void createCase()
                }
                className="h-11 rounded-xl bg-orange-500 text-[10px] font-black text-white disabled:opacity-40"
              >
                {busyId ===
                "create"
                  ? "Kaydediliyor..."
                  : "Kaydı Oluştur"}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}
