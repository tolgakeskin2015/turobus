"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaHistory,
  FaLock,
  FaShieldAlt,
  FaTimesCircle,
} from "react-icons/fa";

import {
  loadCustomer360PrivacyDetail,
  revealCustomer360Identity,
  setCustomer360Consent,
} from "@/lib/customer-360/repository";

import type {
  Customer360PrivacyDetailSnapshot,
} from "@/lib/customer-360/repository";


type Props = {
  companyId: string;
  customerId: string;
  identityType: string | null;
  maskedIdentity: string | null;
  kvkkConsent: boolean;
  marketingConsent: boolean;
  onChanged: () =>
    Promise<void>;
};


function dateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
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
  ).format(date);
}


export default function CustomerPrivacySecurityCenter({
  companyId,
  customerId,
  identityType,
  maskedIdentity,
  kvkkConsent,
  marketingConsent,
  onChanged,
}: Props) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      Customer360PrivacyDetailSnapshot | null
    >(null);

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
    error,
    setError,
  ] =
    useState("");

  const [
    channel,
    setChannel,
  ] =
    useState(
      "manual"
    );

  const [
    statementVersion,
    setStatementVersion,
  ] =
    useState("");

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    revealReason,
    setRevealReason,
  ] =
    useState("");

  const [
    revealedIdentity,
    setRevealedIdentity,
  ] =
    useState<string | null>(
      null
    );


  const refresh =
    useCallback(
      async () => {
        if (
          !companyId ||
          !customerId
        ) {
          return;
        }

        const result =
          await loadCustomer360PrivacyDetail(
            companyId,
            customerId
          );

        setSnapshot(
          result
        );
      },
      [
        companyId,
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
          setLoading(false);
        }
      }
    )();
  }, [
    refresh,
  ]);


  async function changeConsent(
    consentType:
      | "kvkk"
      | "marketing",
    granted:
      boolean
  ) {
    setSaving(true);
    setError("");

    try {
      await setCustomer360Consent(
        {
          companyId,
          customerId,
          consentType,
          granted,
          sourceChannel:
            channel,
          statementVersion:
            statementVersion.trim(),
          note:
            note.trim(),
        }
      );

      await onChanged();
      await refresh();

      setNote("");

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
      setSaving(false);
    }
  }


  async function revealIdentity() {
    if (
      revealReason
        .trim()
        .length <
      5
    ) {
      setError(
        "Kimlik görüntüleme gerekçesi en az 5 karakter olmalıdır."
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      const result =
        await revealCustomer360Identity(
          {
            companyId,
            subjectType:
              "customer",
            subjectId:
              customerId,
            reason:
              revealReason.trim(),
          }
        );

      setRevealedIdentity(
        result.identity_number
      );

      setRevealReason("");

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
      setSaving(false);
    }
  }


  return (
    <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

      <div className="border-b border-white/[.07] p-5 lg:p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div>

            <div className="flex items-center gap-2 text-sm font-black">
              <FaShieldAlt className="text-orange-300" />
              KVKK & Kimlik Güvenliği
            </div>

            <div className="mt-2 max-w-2xl text-[9px] leading-5 text-slate-600">
              İzin kayıtları değişiklik geçmişiyle tutulur. Kimlik ve pasaport numarası normal müşteri kayıtlarında maskelidir; tam görüntüleme yetki ve gerekçe gerektirir.
            </div>

          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[.045] px-3 py-2 text-[8px] font-black text-emerald-300">
            <FaLock />
            Korunan veri alanı
          </div>

        </div>

      </div>


      {error && (
        <div className="border-b border-red-500/15 bg-red-500/[.04] px-5 py-3 text-[9px] font-bold text-red-200">
          {error}
        </div>
      )}


      <div className="grid gap-5 p-5 lg:grid-cols-2 lg:p-6">

        <div className="space-y-4">

          <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

            <div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-600">
              KİMLİK / PASAPORT
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">

              <div>

                <div className="text-[9px] font-black text-slate-400">
                  {identityType
                    ?.toUpperCase() ||
                    "Kimlik türü yok"}
                </div>

                <div className="mt-1 font-mono text-sm font-black tracking-[.08em]">
                  {revealedIdentity ||
                    maskedIdentity ||
                    "—"}
                </div>

              </div>

              {revealedIdentity && (
                <button
                  type="button"
                  onClick={() =>
                    setRevealedIdentity(
                      null
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[8px] font-black text-slate-400"
                >
                  <FaEyeSlash />
                  Gizle
                </button>
              )}

            </div>


            {snapshot?.can_reveal_identity &&
              maskedIdentity &&
              !revealedIdentity && (
              <div className="mt-4">

                <input
                  value={
                    revealReason
                  }
                  onChange={(
                    event
                  ) =>
                    setRevealReason(
                      event.target.value
                    )
                  }
                  placeholder="Tam kimliği görüntüleme gerekçesi..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px] font-bold outline-none focus:border-orange-500/30"
                />

                <button
                  type="button"
                  disabled={
                    saving ||
                    revealReason
                      .trim()
                      .length <
                      5
                  }
                  onClick={() =>
                    void revealIdentity()
                  }
                  className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.06] text-[8px] font-black text-orange-300 disabled:opacity-40"
                >
                  <FaEye />
                  Yetkili Kimlik Görüntüle
                </button>

              </div>
            )}


            {!snapshot?.can_reveal_identity &&
              maskedIdentity && (
              <div className="mt-4 rounded-xl border border-white/[.06] bg-white/[.025] p-3 text-[8px] leading-5 text-slate-600">
                Tam kimlik bilgisi yalnızca yetkili operasyon/yönetim rolleri tarafından gerekçe kaydıyla görüntülenebilir.
              </div>
            )}

          </div>


          <div className="grid gap-3 sm:grid-cols-2">

            {[
              {
                type:
                  "kvkk" as const,

                title:
                  "KVKK Kaydı",

                active:
                  kvkkConsent,
              },

              {
                type:
                  "marketing" as const,

                title:
                  "Pazarlama İzni",

                active:
                  marketingConsent,
              },
            ].map(
              (
                item
              ) => (
                <div
                  key={
                    item.type
                  }
                  className="rounded-2xl border border-white/[.07] bg-black/20 p-4"
                >

                  <div className="flex items-center justify-between gap-2">

                    <div className="text-[9px] font-black">
                      {item.title}
                    </div>

                    <div
                      className={
                        item.active
                          ? "text-emerald-300"
                          : "text-slate-600"
                      }
                    >
                      {item.active
                        ? <FaCheckCircle />
                        : <FaTimesCircle />}
                    </div>

                  </div>

                  <div className="mt-2 text-[8px] font-bold text-slate-500">
                    {item.active
                      ? "Kayıt: izin mevcut"
                      : "Kayıt: izin yok"}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void changeConsent(
                          item.type,
                          true
                        )
                      }
                      className="rounded-lg border border-emerald-500/15 bg-emerald-500/[.05] px-2 py-2 text-[7px] font-black text-emerald-300 disabled:opacity-40"
                    >
                      İzin Verildi
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void changeConsent(
                          item.type,
                          false
                        )
                      }
                      className="rounded-lg border border-red-500/15 bg-red-500/[.04] px-2 py-2 text-[7px] font-black text-red-300 disabled:opacity-40"
                    >
                      İzin Geri Alındı
                    </button>

                  </div>

                </div>
              )
            )}

          </div>


          <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

            <div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">
              İZİN KAYIT DETAYI
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">

              <select
                value={
                  channel
                }
                onChange={(
                  event
                ) =>
                  setChannel(
                    event.target.value
                  )
                }
                className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] font-bold outline-none"
              >
                <option value="manual">
                  Manuel
                </option>

                <option value="written">
                  Yazılı
                </option>

                <option value="web">
                  Web
                </option>

                <option value="phone">
                  Telefon
                </option>

                <option value="whatsapp">
                  WhatsApp
                </option>

                <option value="email">
                  E-posta
                </option>

                <option value="other">
                  Diğer
                </option>
              </select>

              <input
                value={
                  statementVersion
                }
                onChange={(
                  event
                ) =>
                  setStatementVersion(
                    event.target.value
                  )
                }
                placeholder="Metin / form versiyonu"
                className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] font-bold outline-none"
              />

            </div>

            <textarea
              value={
                note
              }
              onChange={(
                event
              ) =>
                setNote(
                  event.target.value
                )
              }
              placeholder="İzin kaydı notu..."
              className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-[#030a11] p-3 text-[8px] font-bold outline-none"
            />

          </div>

        </div>


        <div className="space-y-4">

          <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaHistory className="text-orange-300" />
              İzin Değişiklik Geçmişi
            </div>

            {loading ? (
              <div className="mt-4 text-[8px] text-slate-600">
                Yükleniyor...
              </div>
            ) : (
              <div className="mt-4 max-h-[340px] space-y-2 overflow-auto">

                {(
                  snapshot?.consent_history ??
                  []
                ).length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[8px] text-slate-600">
                    İzin geçmişi bulunmuyor.
                  </div>
                ) : (
                  snapshot
                    ?.consent_history
                    .slice(
                      0,
                      30
                    )
                    .map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"
                        >

                          <div className="flex items-center justify-between gap-2">

                            <div className="text-[8px] font-black uppercase text-slate-400">
                              {item.consent_type ===
                              "kvkk"
                                ? "KVKK"
                                : "Pazarlama"}
                            </div>

                            <div
                              className={
                                item.granted
                                  ? "text-[7px] font-black text-emerald-300"
                                  : "text-[7px] font-black text-red-300"
                              }
                            >
                              {item.granted
                                ? "İzin mevcut"
                                : "İzin yok"}
                            </div>

                          </div>

                          <div className="mt-2 text-[7px] text-slate-600">
                            {dateTime(
                              item.created_at
                            )} · {item.source_channel}
                          </div>

                          {item.statement_version && (
                            <div className="mt-1 text-[7px] text-slate-600">
                              Versiyon: {item.statement_version}
                            </div>
                          )}

                          {item.note && (
                            <div className="mt-2 text-[8px] leading-5 text-slate-500">
                              {item.note}
                            </div>
                          )}

                        </div>
                      )
                    )
                )}

              </div>
            )}

          </div>


          {snapshot?.can_reveal_identity && (
            <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

              <div className="flex items-center gap-2 text-[9px] font-black">
                <FaEye className="text-violet-300" />
                Kimlik Görüntüleme Audit
              </div>

              <div className="mt-4 max-h-[260px] space-y-2 overflow-auto">

                {snapshot.identity_access_log.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[8px] text-slate-600">
                    Henüz tam kimlik görüntüleme kaydı yok.
                  </div>
                ) : (
                  snapshot.identity_access_log.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-xl border border-violet-500/10 bg-violet-500/[.025] p-3"
                      >
                        <div className="text-[8px] font-black text-violet-300">
                          Kimlik görüntülendi
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          {dateTime(
                            item.created_at
                          )}
                        </div>

                        <div className="mt-2 text-[8px] leading-5 text-slate-500">
                          Gerekçe: {item.reason}
                        </div>
                      </div>
                    )
                  )
                )}

              </div>

            </div>
          )}

        </div>

      </div>

    </section>
  );
}
