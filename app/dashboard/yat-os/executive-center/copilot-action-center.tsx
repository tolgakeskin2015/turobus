"use client";

import {
  useState,
} from "react";

import {
  FaBell,
  FaCalendarCheck,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaRobot,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Lead = {
  id: string;
  customer_name: string;
  stage: string;
  score:
    number | null;
};


type Event = {
  id: string;
  title: string;
  severity: string;
  status: string;
};


type Props = {
  companyId: string;

  leads:
    Lead[];

  events:
    Event[];

  onDone:
    () => void;
};


function futureLocal(
  hours:
    number
) {
  const date =
    new Date();

  date.setHours(
    date.getHours() +
      hours
  );

  const corrected =
    new Date(
      date.getTime() -
      date.getTimezoneOffset() *
        60000
    );

  return corrected
    .toISOString()
    .slice(
      0,
      16
    );
}


export default function CopilotActionCenter({
  companyId,
  leads,
  events,
  onDone,
}: Props) {
  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    taskTitle,
    setTaskTitle,
  ] =
    useState(
      "Yönetici kontrol görevi"
    );


  const [
    taskDue,
    setTaskDue,
  ] =
    useState(
      futureLocal(
        4
      )
    );


  const [
    leadId,
    setLeadId,
  ] =
    useState("");


  const [
    followDue,
    setFollowDue,
  ] =
    useState(
      futureLocal(
        2
      )
    );


  const [
    eventId,
    setEventId,
  ] =
    useState("");


  async function execute(
    action:
      string,

    payload:
      Record<
        string,
        unknown
      >,

    confirmation:
      string
  ) {
    if (
      !window.confirm(
        confirmation
      )
    ) {
      return;
    }


    setBusy(
      true
    );

    setMessage("");
    setError("");


    try {
      const {
        data:
          sessionData,
      } =
        await supabase.auth.getSession();


      const token =
        sessionData.session
          ?.access_token;


      if (!token) {
        throw new Error(
          "Aktif oturum yok."
        );
      }


      const response =
        await fetch(
          "/api/yacht-os/copilot/action",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                companyId,

                action,

                confirm:
                  true,

                payload,
              }),
          }
        );


      const result =
        await response.json() as {
          error?: string;
        };


      if (
        !response.ok
      ) {
        throw new Error(
          result.error ||
          "İşlem başarısız."
        );
      }


      setMessage(
        "İşlem tamamlandı ve audit kaydına işlendi."
      );


      onDone();

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
      setBusy(
        false
      );
    }
  }


  const openLeads =
    leads.filter(
      (
        lead
      ) =>
        ![
          "won",
          "lost",
        ].includes(
          lead.stage
        )
    );


  const openEvents =
    events.filter(
      (
        event
      ) =>
        event.status ===
        "open"
    );


  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-emerald-500/20 bg-[#07131f]">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300">
              <FaRobot />
            </div>

            <div>
              <div className="text-sm font-black">
                Copilot Kontrollü Aksiyon Merkezi
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                AI önerir · kullanıcı onaylar · yetki kontrol edilir · audit kaydı oluşur
              </div>
            </div>
          </div>

          <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-300">
            HUMAN APPROVAL REQUIRED
          </span>
        </div>
      </div>


      {(message || error) && (
        <div className="border-b border-white/10 p-4">
          {message && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-4 text-[10px] font-bold text-emerald-200">
              {message}
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-[10px] font-bold text-red-200">
              <FaExclamationTriangle />
              {error}
            </div>
          )}
        </div>
      )}


      <div className="grid gap-4 p-4 xl:grid-cols-3">

        <div className="rounded-2xl border border-white/10 bg-[#030a11] p-5">
          <div className="flex items-center gap-2 text-xs font-black">
            <FaClipboardCheck className="text-blue-400" />
            Görev Oluştur
          </div>

          <input
            value={
              taskTitle
            }
            onChange={(
              event
            ) =>
              setTaskTitle(
                event.target.value
              )
            }
            className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs"
          />

          <input
            type="datetime-local"
            value={
              taskDue
            }
            onChange={(
              event
            ) =>
              setTaskDue(
                event.target.value
              )
            }
            className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs"
          />

          <button
            type="button"
            disabled={
              busy ||
              !taskTitle.trim()
            }
            onClick={() =>
              void execute(
                "create_task",

                {
                  title:
                    taskTitle,

                  description:
                    "AI Copilot kontrollü yönetici görevi.",

                  dueAt:
                    new Date(
                      taskDue
                    ).toISOString(),

                  priority:
                    "medium",
                },

                "Bu görevi oluşturmak istediğinize emin misiniz?"
              )
            }
            className="mt-4 h-11 w-full rounded-xl bg-blue-500 text-xs font-black text-white disabled:opacity-40"
          >
            Onayla ve Görev Oluştur
          </button>
        </div>


        <div className="rounded-2xl border border-white/10 bg-[#030a11] p-5">
          <div className="flex items-center gap-2 text-xs font-black">
            <FaCalendarCheck className="text-orange-400" />
            Lead Takibi Planla
          </div>

          <select
            value={
              leadId
            }
            onChange={(
              event
            ) =>
              setLeadId(
                event.target.value
              )
            }
            className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs"
          >
            <option value="">
              Lead seç
            </option>

            {openLeads.map(
              (
                lead
              ) => (
                <option
                  key={
                    lead.id
                  }
                  value={
                    lead.id
                  }
                >
                  {lead.customer_name}
                  {" · "}
                  {lead.score ?? 0}
                </option>
              )
            )}
          </select>

          <input
            type="datetime-local"
            value={
              followDue
            }
            onChange={(
              event
            ) =>
              setFollowDue(
                event.target.value
              )
            }
            className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs"
          />

          <button
            type="button"
            disabled={
              busy ||
              !leadId
            }
            onClick={() =>
              void execute(
                "schedule_lead_followup",

                {
                  leadId,

                  dueAt:
                    new Date(
                      followDue
                    ).toISOString(),

                  note:
                    "AI Copilot önerisiyle planlanan takip.",
                },

                "Bu lead için takip görevi oluşturulsun mu?"
              )
            }
            className="mt-4 h-11 w-full rounded-xl bg-orange-500 text-xs font-black text-white disabled:opacity-40"
          >
            Onayla ve Takibi Planla
          </button>
        </div>


        <div className="rounded-2xl border border-white/10 bg-[#030a11] p-5">
          <div className="flex items-center gap-2 text-xs font-black">
            <FaBell className="text-red-400" />
            CRM Alarmını Kapat
          </div>

          <select
            value={
              eventId
            }
            onChange={(
              event
            ) =>
              setEventId(
                event.target.value
              )
            }
            className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs"
          >
            <option value="">
              Alarm seç
            </option>

            {openEvents.map(
              (
                event
              ) => (
                <option
                  key={
                    event.id
                  }
                  value={
                    event.id
                  }
                >
                  {event.severity}
                  {" · "}
                  {event.title}
                </option>
              )
            )}
          </select>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={
                busy ||
                !eventId
              }
              onClick={() =>
                void execute(
                  "resolve_crm_alert",

                  {
                    eventId,

                    status:
                      "resolved",
                  },

                  "Alarm çözüldü olarak kapatılsın mı?"
                )
              }
              className="h-11 rounded-xl bg-emerald-500 text-xs font-black text-white disabled:opacity-40"
            >
              Çözüldü
            </button>

            <button
              type="button"
              disabled={
                busy ||
                !eventId
              }
              onClick={() =>
                void execute(
                  "resolve_crm_alert",

                  {
                    eventId,

                    status:
                      "dismissed",
                  },

                  "Alarm dikkate alınmadı olarak kapatılsın mı?"
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-white/[.05] text-xs font-black disabled:opacity-40"
            >
              Dismiss
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
