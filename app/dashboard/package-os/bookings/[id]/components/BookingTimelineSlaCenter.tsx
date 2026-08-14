"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";


type Member = {
  user_id: string;
  full_name: string | null;
  role: string;
};


type IssueItem = {
  id: string;
  name: string;

  supplier_room_issue_status:
    | "none"
    | "open"
    | "waiting_supplier"
    | "assigned"
    | "resolved";

  supplier_room_issue_priority:
    | "low"
    | "normal"
    | "high"
    | "critical";

  supplier_room_issue_assigned_to:
    string | null;

  supplier_room_issue_sla_due_at:
    string | null;

  supplier_room_issue_opened_at:
    string | null;

  supplier_room_issue_resolved_at:
    string | null;

  supplier_room_issue_note:
    string | null;
};


type BookingEvent = {
  id: string;

  booking_item_id:
    string | null;

  event_type:
    string;

  title:
    string;

  description:
    string | null;

  metadata:
    Record<
      string,
      unknown
    > | null;

  created_by:
    string | null;

  created_at:
    string;
};


function dateTime(
  value:
    string |
    null
) {

  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(
      value
    )
  );
}


function priorityLabel(
  value:
    IssueItem[
      "supplier_room_issue_priority"
    ]
) {

  if (
    value ===
    "critical"
  ) {
    return "KRİTİK";
  }

  if (
    value ===
    "high"
  ) {
    return "YÜKSEK";
  }

  if (
    value ===
    "normal"
  ) {
    return "NORMAL";
  }

  return "DÜŞÜK";
}


function statusLabel(
  value:
    IssueItem[
      "supplier_room_issue_status"
    ]
) {

  if (
    value ===
    "waiting_supplier"
  ) {
    return "TEDARİKÇİ BEKLENİYOR";
  }

  if (
    value ===
    "assigned"
  ) {
    return "SORUMLUYA ATANDI";
  }

  if (
    value ===
    "resolved"
  ) {
    return "ÇÖZÜLDÜ";
  }

  if (
    value ===
    "open"
  ) {
    return "AÇIK";
  }

  return "AKSİYON YOK";
}


export default function
BookingTimelineSlaCenter({
  bookingId,
  companyId,
}: {
  bookingId:
    string;

  companyId:
    string;
}) {

  const [
    members,
    setMembers,
  ] =
    useState<
      Member[]
    >(
      []
    );


  const [
    items,
    setItems,
  ] =
    useState<
      IssueItem[]
    >(
      []
    );


  const [
    events,
    setEvents,
  ] =
    useState<
      BookingEvent[]
    >(
      []
    );


  const [
    editing,
    setEditing,
  ] =
    useState<
      IssueItem |
      null
    >(
      null
    );


  const [
    assignedTo,
    setAssignedTo,
  ] =
    useState(
      ""
    );


  const [
    priority,
    setPriority,
  ] =
    useState<
      IssueItem[
        "supplier_room_issue_priority"
      ]
    >(
      "high"
    );


  const [
    slaHours,
    setSlaHours,
  ] =
    useState(
      "4"
    );


  const [
    note,
    setNote,
  ] =
    useState(
      ""
    );


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  const load =
    useCallback(
      async () => {

        const [
          memberResult,
          itemResult,
          eventResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "company_members"
              )
              .select(`
                user_id,
                full_name,
                role
              `)
              .eq(
                "company_id",
                companyId
              )
              .eq(
                "is_active",
                true
              )
              .order(
                "full_name",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "package_booking_items"
              )
              .select(`
                id,
                name,
                supplier_room_issue_status,
                supplier_room_issue_priority,
                supplier_room_issue_assigned_to,
                supplier_room_issue_sla_due_at,
                supplier_room_issue_opened_at,
                supplier_room_issue_resolved_at,
                supplier_room_issue_note
              `)
              .eq(
                "booking_id",
                bookingId
              )
              .eq(
                "company_id",
                companyId
              ),

            supabase
              .from(
                "package_booking_events"
              )
              .select(`
                id,
                booking_item_id,
                event_type,
                title,
                description,
                metadata,
                created_by,
                created_at
              `)
              .eq(
                "booking_id",
                bookingId
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
              )
              .limit(
                100
              ),
          ]);


        if (
          memberResult.error ||
          itemResult.error ||
          eventResult.error
        ) {

          setErrorMessage(
            memberResult.error?.message ||
            itemResult.error?.message ||
            eventResult.error?.message ||
            "Operasyon verileri alınamadı."
          );

          return;
        }


        setMembers(
          (
            memberResult.data ||
            []
          ) as Member[]
        );


        setItems(
          (
            itemResult.data ||
            []
          ) as IssueItem[]
        );


        setEvents(
          (
            eventResult.data ||
            []
          ) as BookingEvent[]
        );


        setErrorMessage(
          ""
        );

      },
      [
        bookingId,
        companyId,
      ]
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ]
  );


  const activeIssues =
    useMemo(
      () =>
        items.filter(
          item =>
            item
              .supplier_room_issue_status !==
              "none"
        ),
      [
        items,
      ]
    );


  const overdueCount =
    activeIssues.filter(
      item =>
        item
          .supplier_room_issue_status !==
          "resolved" &&
        Boolean(
          item
            .supplier_room_issue_sla_due_at
        ) &&
        new Date(
          item
            .supplier_room_issue_sla_due_at as string
        ).getTime() <
          Date.now()
    ).length;


  function openEditor(
    item:
      IssueItem
  ) {

    setEditing(
      item
    );

    setAssignedTo(
      item
        .supplier_room_issue_assigned_to ||
        ""
    );

    setPriority(
      item
        .supplier_room_issue_priority ||
        "high"
    );

    setNote(
      item
        .supplier_room_issue_note ||
        ""
    );


    if (
      item
        .supplier_room_issue_sla_due_at
    ) {

      const hours =
        Math.max(
          1,
          Math.ceil(
            (
              new Date(
                item
                  .supplier_room_issue_sla_due_at
              ).getTime()
              -
              Date.now()
            )
            /
            3600000
          )
        );

      setSlaHours(
        String(
          hours
        )
      );

    } else {

      setSlaHours(
        priority ===
          "critical"
          ? "2"
          : "4"
      );

    }

  }


  async function save() {

    if (!editing) {
      return;
    }


    setSaving(
      true
    );

    setErrorMessage(
      ""
    );


    const hours =
      Number(
        slaHours
      );


    const {
      error,
    } =
      await supabase.rpc(
        "package_booking_room_issue_manage_v2",
        {
          p_booking_item_id:
            editing.id,

          p_assigned_to:
            assignedTo ||
            null,

          p_priority:
            priority,

          p_sla_hours:
            Number.isFinite(
              hours
            )
              ? hours
              : null,

          p_note:
            note.trim() ||
            null,
        }
      );


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setEditing(
      null
    );

    await load();

    setSaving(
      false
    );
  }


  return (
    <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-900 p-6">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-400">
            OPERASYON KONTROL
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Görev, SLA & İşlem Geçmişi
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Açık sorunların sorumlusunu, önceliğini ve çözüm süresini takip edin.
          </p>

        </div>


        <div className="flex flex-wrap gap-2">

          <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">

            <div className="text-[10px] font-black uppercase text-slate-500">
              Açık Görev
            </div>

            <div className="mt-1 text-xl font-black">
              {
                activeIssues.filter(
                  item =>
                    item
                      .supplier_room_issue_status !==
                      "resolved"
                ).length
              }
            </div>

          </div>


          <div
            className={`rounded-2xl border px-4 py-3 ${
              overdueCount >
                0
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
            }`}
          >

            <div className="text-[10px] font-black uppercase">
              SLA Geciken
            </div>

            <div className="mt-1 text-xl font-black">
              {
                overdueCount
              }
            </div>

          </div>

        </div>

      </div>


      {
        errorMessage &&
        (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {
              errorMessage
            }
          </div>
        )
      }


      {
        activeIssues.length >
          0 &&
        (
          <div className="mt-7">

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              AKTİF OPERASYON GÖREVLERİ
            </p>


            <div className="mt-4 grid gap-4 xl:grid-cols-2">

              {
                activeIssues.map(
                  item => {

                    const assigned =
                      members.find(
                        member =>
                          member.user_id ===
                          item
                            .supplier_room_issue_assigned_to
                      );


                    const overdue =
                      item
                        .supplier_room_issue_status !==
                        "resolved" &&
                      Boolean(
                        item
                          .supplier_room_issue_sla_due_at
                      ) &&
                      new Date(
                        item
                          .supplier_room_issue_sla_due_at as string
                      ).getTime() <
                        Date.now();


                    return (
                      <div
                        key={
                          item.id
                        }
                        className={`rounded-2xl border p-5 ${
                          overdue
                            ? "border-red-500/30 bg-red-500/5"
                            : item.supplier_room_issue_status ===
                                "resolved"
                              ? "border-emerald-500/20 bg-emerald-500/5"
                              : "border-white/10 bg-slate-950"
                        }`}
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <div className="font-black">
                              {
                                item.name
                              }
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">

                              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-slate-400">
                                {
                                  statusLabel(
                                    item
                                      .supplier_room_issue_status
                                  )
                                }
                              </span>

                              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-300">
                                {
                                  priorityLabel(
                                    item
                                      .supplier_room_issue_priority
                                  )
                                }
                              </span>

                              {
                                overdue &&
                                (
                                  <span className="rounded-full bg-red-500/20 px-2 py-1 text-[10px] font-black text-red-300">
                                    SLA GECİKTİ
                                  </span>
                                )
                              }

                            </div>

                          </div>


                          <button
                            type="button"
                            onClick={
                              () =>
                                openEditor(
                                  item
                                )
                            }
                            className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300"
                          >
                            Görevi Yönet
                          </button>

                        </div>


                        <div className="mt-5 grid gap-3 sm:grid-cols-2">

                          <div className="rounded-xl bg-slate-900 p-3">

                            <div className="text-[10px] font-black uppercase text-slate-500">
                              Sorumlu
                            </div>

                            <div className="mt-1 text-sm font-black">
                              {
                                assigned
                                  ?.full_name ||
                                "Atanmadı"
                              }
                            </div>

                          </div>


                          <div className="rounded-xl bg-slate-900 p-3">

                            <div className="text-[10px] font-black uppercase text-slate-500">
                              SLA Sonu
                            </div>

                            <div
                              className={`mt-1 text-sm font-black ${
                                overdue
                                  ? "text-red-300"
                                  : ""
                              }`}
                            >
                              {
                                dateTime(
                                  item
                                    .supplier_room_issue_sla_due_at
                                )
                              }
                            </div>

                          </div>

                        </div>

                      </div>
                    );

                  }
                )
              }

            </div>

          </div>
        )
      }


      <div className="mt-8 border-t border-white/10 pt-7">

        <div className="flex items-center justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              REZERVASYON TIMELINE
            </p>

            <h3 className="mt-1 text-xl font-black">
              İşlem Geçmişi
            </h3>

          </div>


          <span className="rounded-full bg-white/5 px-3 py-2 text-xs font-black text-slate-400">
            {
              events.length
            }
            {" kayıt"}
          </span>

        </div>


        <div className="mt-5 space-y-3">

          {
            events.length ===
              0
              ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-5 text-sm text-slate-500">
                    Henüz işlem geçmişi bulunmuyor.
                  </div>
                )
              : events.map(
                  event => {

                    const creator =
                      members.find(
                        member =>
                          member.user_id ===
                          event.created_by
                      );


                    return (
                      <div
                        key={
                          event.id
                        }
                        className="relative rounded-2xl border border-white/10 bg-slate-950 p-5 pl-7"
                      >

                        <div className="absolute left-3 top-6 h-2 w-2 rounded-full bg-cyan-400" />

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div>

                            <div className="font-black">
                              {
                                event.title
                              }
                            </div>

                            {
                              event.description &&
                              (
                                <div className="mt-2 text-sm leading-6 text-slate-400">
                                  {
                                    event.description
                                  }
                                </div>
                              )
                            }

                          </div>


                          <div className="text-right text-xs text-slate-500">

                            <div>
                              {
                                dateTime(
                                  event.created_at
                                )
                              }
                            </div>

                            {
                              creator &&
                              (
                                <div className="mt-1 font-bold text-slate-400">
                                  {
                                    creator.full_name ||
                                    creator.role
                                  }
                                </div>
                              )
                            }

                          </div>

                        </div>

                      </div>
                    );

                  }
                )
          }

        </div>

      </div>


      {
        editing &&
        (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">

            <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-900 p-6">

              <p className="text-xs font-black uppercase tracking-wider text-cyan-400">
                GÖREV & SLA YÖNETİMİ
              </p>

              <h3 className="mt-2 text-xl font-black">
                {
                  editing.name
                }
              </h3>


              <div className="mt-6 space-y-4">

                <label className="block">

                  <span className="text-xs font-black uppercase text-slate-500">
                    Operasyon Sorumlusu
                  </span>

                  <select
                    value={
                      assignedTo
                    }
                    onChange={
                      event =>
                        setAssignedTo(
                          event.target.value
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  >

                    <option value="">
                      Sorumlu seç
                    </option>

                    {
                      members.map(
                        member => (
                          <option
                            key={
                              member.user_id
                            }
                            value={
                              member.user_id
                            }
                          >
                            {
                              member.full_name ||
                              member.role
                            }
                          </option>
                        )
                      )
                    }

                  </select>

                </label>


                <div className="grid gap-4 sm:grid-cols-2">

                  <label>

                    <span className="text-xs font-black uppercase text-slate-500">
                      Öncelik
                    </span>

                    <select
                      value={
                        priority
                      }
                      onChange={
                        event =>
                          setPriority(
                            event.target.value as
                              IssueItem[
                                "supplier_room_issue_priority"
                              ]
                          )
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    >
                      <option value="critical">
                        Kritik
                      </option>

                      <option value="high">
                        Yüksek
                      </option>

                      <option value="normal">
                        Normal
                      </option>

                      <option value="low">
                        Düşük
                      </option>
                    </select>

                  </label>


                  <label>

                    <span className="text-xs font-black uppercase text-slate-500">
                      SLA Süresi
                    </span>

                    <select
                      value={
                        slaHours
                      }
                      onChange={
                        event =>
                          setSlaHours(
                            event.target.value
                          )
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                    >
                      <option value="1">
                        1 saat
                      </option>

                      <option value="2">
                        2 saat
                      </option>

                      <option value="4">
                        4 saat
                      </option>

                      <option value="8">
                        8 saat
                      </option>

                      <option value="12">
                        12 saat
                      </option>

                      <option value="24">
                        24 saat
                      </option>

                      <option value="48">
                        48 saat
                      </option>
                    </select>

                  </label>

                </div>


                <label className="block">

                  <span className="text-xs font-black uppercase text-slate-500">
                    Operasyon Notu
                  </span>

                  <textarea
                    rows={
                      4
                    }
                    value={
                      note
                    }
                    onChange={
                      event =>
                        setNote(
                          event.target.value
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-4"
                    placeholder="Görev veya çözüm için not..."
                  />

                </label>

              </div>


              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={
                    () =>
                      setEditing(
                        null
                      )
                  }
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-black"
                >
                  Vazgeç
                </button>


                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    () =>
                      void save()
                  }
                  className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:opacity-50"
                >
                  {
                    saving
                      ? "Kaydediliyor..."
                      : "Görevi Kaydet"
                  }
                </button>

              </div>

            </div>

          </div>
        )
      }

    </section>
  );
}
