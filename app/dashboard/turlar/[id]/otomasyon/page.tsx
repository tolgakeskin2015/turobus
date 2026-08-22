"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaBolt,
  FaCheckCircle,
  FaTimesCircle,
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


type Rule = {
  id: string;
  name: string;
  event_key: string;
  channel: string;
  recipient_type: string;
  active: boolean;
  requires_provider: boolean;
};


type Outbox = {
  id: string;
  event_key: string;
  channel: string;
  recipient_name: string | null;
  recipient_address: string | null;
  status: string;
  provider: string | null;
  provider_error: string | null;
  created_at: string;
};


export default function AutomationPage() {

  const params =
    useParams<{
      id: string;
    }>();

  const tourId =
    String(
      params.id
    );

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    rules,
    setRules,
  ] =
    useState<Rule[]>(
      []
    );

  const [
    outbox,
    setOutbox,
  ] =
    useState<Outbox[]>(
      []
    );

  const [
    name,
    setName,
  ] =
    useState(
      "Tur Öncesi Hatırlatma"
    );

  const [
    eventKey,
    setEventKey,
  ] =
    useState(
      "departure_24h"
    );

  const [
    channel,
    setChannel,
  ] =
    useState(
      "whatsapp"
    );

  const [
    body,
    setBody,
  ] =
    useState(
      "Turunuz için son kontrollerinizi yapmayı unutmayın."
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

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


  const load =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {

        const [
          ruleResult,
          outboxResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_automation_rules"
              )
              .select(
                "id,name,event_key,channel,recipient_type,active,requires_provider"
              )
              .eq(
                "company_id",
                currentCompanyId
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
                "tour_automation_outbox"
              )
              .select(
                "id,event_key,channel,recipient_name,recipient_address,status,provider,provider_error,created_at"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(100),
          ]);


        if (
          ruleResult.error
        ) {
          throw ruleResult.error;
        }


        if (
          outboxResult.error
        ) {
          throw outboxResult.error;
        }


        setRules(
          (
            ruleResult.data ??
            []
          ) as unknown as
            Rule[]
        );


        setOutbox(
          (
            outboxResult.data ??
            []
          ) as unknown as
            Outbox[]
        );

      },
      [
        tourId,
      ]
    );


  useEffect(() => {

    void (
      async () => {

        try {

          const {
            data:
              authData,
          } =
            await supabase
              .auth
              .getUser();


          if (
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


          setCompanyId(
            membership.company_id
          );


          await load(
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

          setLoading(false);
        }

      }
    )();

  }, [
    load,
  ]);


  async function createRule() {

    if (
      !companyId
    ) {
      return;
    }


    setBusy(true);
    setError("");
    setNotice("");


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          "create_tour_automation_rule",
          {
            p_company_id:
              companyId,

            p_name:
              name,

            p_event_key:
              eventKey,

            p_channel:
              channel,

            p_recipient_type:
              "customer",

            p_subject:
              "Turobüs Bilgilendirme",

            p_body:
              body,

            p_requires_provider:
              channel !==
              "system",
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId
      );


      setNotice(
        "Otomasyon kuralı oluşturuldu."
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

      setBusy(false);
    }
  }


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Otomasyon merkezi yükleniyor...
      </main>
    );
  }


  const blocked =
    outbox.filter(
      item =>
        item.status ===
          "blocked_no_provider"
    ).length;


  const failed =
    outbox.filter(
      item =>
        item.status ===
          "failed"
    ).length;


  return (
    <main
      data-tour-os-screen="automation-center"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-orange-500/15 bg-[#07131f] p-6 lg:p-8">

          <div className="flex items-center gap-3">

            <FaBolt className="text-2xl text-orange-300" />

            <div>
              <div className="text-[8px] font-black text-orange-300">
                AŞAMA 18
              </div>
              <h1 className="text-3xl font-black">
                Mesaj & Otomasyon Merkezi
              </h1>
            </div>

          </div>


          <p className="mt-3 text-[9px] text-slate-400">
            Provider bağlı değilse dış kanallar gönderilmiş sayılmaz; blocked_no_provider olarak bekler.
          </p>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] text-red-300">
            <FaTimesCircle className="mr-2 inline" />
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] text-emerald-300">
            <FaCheckCircle className="mr-2 inline" />
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-3 md:grid-cols-3">

          {[
            [
              "Aktif Kural",
              String(
                rules.filter(
                  item =>
                    item.active
                ).length
              ),
            ],
            [
              "Provider Bekliyor",
              String(blocked),
            ],
            [
              "Hatalı",
              String(failed),
            ],
          ].map(
            item => (
              <article
                key={item[0]}
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="text-[7px] font-black text-slate-500">
                  {item[0]}
                </div>
                <div className="mt-3 text-2xl font-black">
                  {item[1]}
                </div>
              </article>
            )
          )}

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-sm font-black">
              Yeni Otomasyon
            </div>


            <input
              value={name}
              onChange={
                event =>
                  setName(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <select
              value={eventKey}
              onChange={
                event =>
                  setEventKey(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              {[
                "reservation_created",
                "payment_pending",
                "payment_completed",
                "departure_24h",
                "departure_3h",
                "document_missing",
                "incident_created",
                "incident_critical",
                "refund_completed",
                "protection_claim_created",
                "tour_completed",
              ].map(
                item => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>


            <select
              value={channel}
              onChange={
                event =>
                  setChannel(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="system">
                Sistem İçi
              </option>
              <option value="email">
                E-posta
              </option>
              <option value="whatsapp">
                WhatsApp
              </option>
              <option value="sms">
                SMS
              </option>
            </select>


            <textarea
              value={body}
              onChange={
                event =>
                  setBody(
                    event.target.value
                  )
              }
              rows={4}
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px]"
            />


            <button
              disabled={busy}
              onClick={
                () =>
                  void createRule()
              }
              className="mt-3 min-h-11 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
            >
              Otomasyon Oluştur
            </button>

          </article>


          <div className="overflow-x-auto rounded-[22px] border border-white/10">

            <table className="min-w-[900px] text-left">

              <thead className="bg-[#07131f] text-[7px] font-black text-slate-500">
                <tr>
                  <th className="px-4 py-3">Olay</th>
                  <th className="px-4 py-3">Kanal</th>
                  <th className="px-4 py-3">Alıcı</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Provider</th>
                </tr>
              </thead>

              <tbody>

                {outbox.map(
                  item => (
                    <tr
                      key={item.id}
                      className="border-t border-white/[.06] text-[8px]"
                    >
                      <td className="px-4 py-4">
                        {item.event_key}
                      </td>
                      <td className="px-4 py-4">
                        {item.channel}
                      </td>
                      <td className="px-4 py-4">
                        {item.recipient_name ||
                          item.recipient_address ||
                          "—"}
                      </td>
                      <td className="px-4 py-4">
                        {item.status}
                      </td>
                      <td className="px-4 py-4">
                        {item.provider ||
                          "Bağlı değil"}
                      </td>
                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}
