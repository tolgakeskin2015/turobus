"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaHotel,
  FaLink,
  FaRedo,
  FaServer,
  FaShieldAlt,
  FaSync,
  FaWifi,
} from "react-icons/fa";

import {
  getCurrentUser,
  getCurrentMembership,
  CurrentMembership,
} from "@/lib/current-user";

import {
  ChannelConnection,
  ChannelLog,
  ChannelQueueItem,
  getChannelManagerData,
  simulateQueueItem,
} from "@/lib/hotel/channel-manager/channel-manager-service";

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "Henüz yok";

  return new Date(value).toLocaleString(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}

function channelLabel(code: string) {
  const labels: Record<string, string> = {
    booking: "Booking.com",
    expedia: "Expedia",
    hotelbeds: "Hotelbeds",
    airbnb: "Airbnb",
    ets: "ETS",
    jolly: "Jolly",
    tatilliyoruz: "Tatilliyoruz",
    website: "Direct Web",
    custom: "Custom Channel",
  };

  return labels[code] ?? code;
}

function operationLabel(type: string) {
  const labels: Record<string, string> = {
    rate_update: "Fiyat Güncelleme",
    inventory_update: "Kontenjan Güncelleme",
    restriction_update: "Kısıtlama Güncelleme",
    reservation_import: "Rezervasyon Aktarımı",
    full_sync: "Tam Senkronizasyon",
    connection_test: "Bağlantı Testi",
  };

  return labels[type] ?? type;
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    pending: "Bekliyor",
    processing: "İşleniyor",
    completed: "Başarılı",
    failed: "Hatalı",
    cancelled: "İptal",
    active: "Aktif",
    paused: "Duraklatıldı",
    draft: "Taslak",
    error: "Hata",
    disconnected: "Bağlantısız",
    success: "Başarılı",
    warning: "Uyarı",
  };

  return labels[status] ?? status;
}

export default function ChannelOperationsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [connections, setConnections] =
    useState<ChannelConnection[]>([]);

  const [queue, setQueue] =
    useState<ChannelQueueItem[]>([]);

  const [logs, setLogs] =
    useState<ChannelLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getChannelManagerData(
          companyId
        );

      setConnections(
        data.connections
      );

      setQueue(
        data.queue
      );

      setLogs(
        data.logs
      );
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const user =
          await getCurrentUser();

        if (!mounted || !user) return;

        const current =
          await getCurrentMembership(
            user.id
          );

        if (!mounted || !current) return;

        setMembership(current);

        await loadData(
          current.company_id
        );
      } catch (error) {
        if (!mounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Channel Operations yüklenemedi."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  const stats = useMemo(() => {
    const pending =
      queue.filter(
        (x) => x.status === "pending"
      ).length;

    const processing =
      queue.filter(
        (x) => x.status === "processing"
      ).length;

    const completed =
      queue.filter(
        (x) => x.status === "completed"
      ).length;

    const failed =
      queue.filter(
        (x) => x.status === "failed"
      ).length;

    const activeConnections =
      connections.filter(
        (x) => x.status === "active"
      ).length;

    const totalConnections =
      connections.length;

    const healthScore =
      totalConnections === 0
        ? 100
        : Math.max(
            0,
            Math.round(
              (activeConnections /
                totalConnections) *
                100 -
                failed * 5
            )
          );

    return {
      pending,
      processing,
      completed,
      failed,
      activeConnections,
      healthScore,
    };
  }, [queue, connections]);

  async function refresh() {
    if (!membership || refreshing) return;

    setRefreshing(true);
    setErrorMessage("");

    try {
      await loadData(
        membership.company_id
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Veriler yenilenemedi."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function retry(
    item: ChannelQueueItem
  ) {
    if (!membership || processingId) return;

    setProcessingId(item.id);
    setErrorMessage("");

    try {
      await simulateQueueItem(
        membership.company_id,
        item.id
      );

      await loadData(
        membership.company_id
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "İşlem yeniden çalıştırılamadı."
      );
    } finally {
      setProcessingId("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b12]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-6 text-sm font-bold text-slate-300 shadow-2xl backdrop-blur-xl">
            Turobus Channel Intelligence yükleniyor...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#080b12] text-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at 15% 0%, rgba(249,115,22,.16), transparent 26%), radial-gradient(circle at 85% 15%, rgba(59,130,246,.10), transparent 30%), linear-gradient(180deg,#0b0f17 0%,#080b12 100%)",
      }}
    >
      <div className="mx-auto max-w-[1680px] space-y-6 p-4 pb-16 md:p-7 lg:p-9">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl md:p-8">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

            <div className="max-w-4xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-orange-400">
                <FaServer />
                TUROBUS CHANNEL INTELLIGENCE
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Channel Operations
                <span className="text-orange-400">
                  {" "}Center
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
                OTA bağlantıları, fiyat, kontenjan,
                rezervasyon, senkronizasyon kuyruğu ve
                kanal sağlığını tek merkezden yönetin.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Sistem Modu
                </div>

                <div className="mt-1 flex items-center gap-2 font-black text-emerald-200">
                  <FaShieldAlt />
                  Güvenli Simülasyon
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void refresh()
                }
                disabled={refreshing}
                className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400 disabled:opacity-50"
              >
                <FaSync
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Yenileniyor"
                  : "Şimdi Yenile"}
              </button>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle />
              {errorMessage}
            </div>
          </div>
        )}

        {/* KPI */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <MetricCard
            title="Channel Health"
            value={`%${stats.healthScore}`}
            subtitle="Sistem sağlık skoru"
            icon={<FaWifi />}
            emphasis
          />

          <MetricCard
            title="Aktif Kanal"
            value={stats.activeConnections}
            subtitle="Bağlı satış kanalı"
            icon={<FaLink />}
          />

          <MetricCard
            title="Bekleyen"
            value={stats.pending}
            subtitle="Queue içerisinde"
            icon={<FaClock />}
          />

          <MetricCard
            title="İşleniyor"
            value={stats.processing}
            subtitle="Worker üzerinde"
            icon={<FaBolt />}
          />

          <MetricCard
            title="Başarılı"
            value={stats.completed}
            subtitle="Tamamlanan işlem"
            icon={<FaCheckCircle />}
          />

          <MetricCard
            title="Hatalı"
            value={stats.failed}
            subtitle="Müdahale gerekli"
            icon={<FaExclamationTriangle />}
            danger={stats.failed > 0}
          />
        </section>

        {/* CHANNEL HEALTH */}
        <Panel
          eyebrow="CHANNEL NETWORK"
          title="Kanal Sağlığı"
          description="Bağlı OTA ve satış kanallarının operasyonel durumu."
        >
          {connections.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">

              {connections.map(
                (connection) => (
                  <div
                    key={connection.id}
                    className="group rounded-[24px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-orange-400/30 hover:bg-white/[0.055]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 text-lg text-orange-400">
                          <FaHotel />
                        </div>

                        <div>
                          <div className="text-lg font-black text-white">
                            {channelLabel(
                              connection.channel_code
                            )}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            {connection.connection_name}
                          </div>
                        </div>
                      </div>

                      <StatusBadge
                        status={
                          connection.status
                        }
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <MiniInfo
                        label="Son Senkron"
                        value={formatDate(
                          connection.last_sync_at
                        )}
                      />

                      <MiniInfo
                        label="Son Başarı"
                        value={formatDate(
                          connection.last_success_at
                        )}
                      />

                    </div>

                    {connection.last_error_message && (
                      <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
                        {connection.last_error_message}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyState text="Henüz kanal bağlantısı bulunmuyor." />
          )}
        </Panel>

        {/* QUEUE */}
        <Panel
          eyebrow="REAL-TIME PIPELINE"
          title="Senkronizasyon Kuyruğu"
          description="Worker tarafından işlenen son kanal görevleri."
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">

              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-4">
                    İşlem
                  </th>

                  <th className="px-4 py-4">
                    Kanal
                  </th>

                  <th className="px-4 py-4">
                    Durum
                  </th>

                  <th className="px-4 py-4">
                    Deneme
                  </th>

                  <th className="px-4 py-4">
                    Oluşturuldu
                  </th>

                  <th className="px-4 py-4">
                    Sistem Mesajı
                  </th>

                  <th className="px-4 py-4 text-right">
                    Aksiyon
                  </th>
                </tr>
              </thead>

              <tbody>
                {queue
                  .slice(0, 50)
                  .map((item) => {
                    const relation =
                      Array.isArray(
                        item.connection
                      )
                        ? item.connection[0]
                        : item.connection;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-white/[0.06] transition hover:bg-white/[0.025]"
                      >
                        <td className="px-4 py-5 font-bold text-slate-200">
                          {operationLabel(
                            item.operation_type
                          )}
                        </td>

                        <td className="px-4 py-5 text-slate-400">
                          {relation
                            ? channelLabel(
                                relation.channel_code
                              )
                            : "-"}
                        </td>

                        <td className="px-4 py-5">
                          <StatusBadge
                            status={item.status}
                          />
                        </td>

                        <td className="px-4 py-5">
                          <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-slate-300">
                            {item.attempt_count}
                            /
                            {item.max_attempts}
                          </span>
                        </td>

                        <td className="px-4 py-5 text-xs text-slate-500">
                          {formatDate(
                            item.created_at
                          )}
                        </td>

                        <td className="max-w-[350px] px-4 py-5 text-xs text-slate-400">
                          {item.error_message ?? "—"}
                        </td>

                        <td className="px-4 py-5 text-right">
                          {item.status ===
                            "failed" && (
                            <button
                              type="button"
                              disabled={Boolean(
                                processingId
                              )}
                              onClick={() =>
                                void retry(item)
                              }
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 text-xs font-black text-orange-300 transition hover:bg-orange-400/20 disabled:opacity-40"
                            >
                              <FaRedo />
                              Yeniden Dene
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {queue.length === 0 && (
              <EmptyState text="Senkronizasyon kuyruğunda işlem bulunmuyor." />
            )}
          </div>
        </Panel>

        {/* LOGS */}
        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">

          <Panel
            eyebrow="ACTIVITY STREAM"
            title="Sistem Aktivitesi"
            description="Channel Engine tarafından oluşturulan son kayıtlar."
          >
            <div className="space-y-2">

              {logs
                .slice(0, 20)
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">

                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-orange-400">
                        <FaServer />
                      </div>

                      <div>
                        <div className="font-black text-slate-200">
                          {operationLabel(
                            log.event_type
                          )}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {log.message ??
                            "Sistem işlemi"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={log.status}
                      />

                      <span className="whitespace-nowrap text-[11px] text-slate-600">
                        {formatDate(
                          log.created_at
                        )}
                      </span>
                    </div>
                  </div>
                ))}

              {logs.length === 0 && (
                <EmptyState text="Henüz sistem logu bulunmuyor." />
              )}
            </div>
          </Panel>

          <Panel
            eyebrow="ENGINE STATUS"
            title="Turobus Sync Engine"
            description="Channel Manager çalışma modu ve altyapı durumu."
          >
            <div className="space-y-3">

              <EngineRow
                title="Queue Engine"
                value="Aktif"
              />

              <EngineRow
                title="Auto Worker"
                value="15 sn"
              />

              <EngineRow
                title="Retry Engine"
                value="Hazır"
              />

              <EngineRow
                title="Mapping Engine"
                value="Hazır"
              />

              <EngineRow
                title="Revenue Sync"
                value="Hazır"
              />

              <EngineRow
                title="Live OTA Mode"
                value="Kapalı"
                warning
              />

            </div>

            <div className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-400/[0.07] p-4">

              <div className="flex gap-3">
                <FaShieldAlt className="mt-0.5 shrink-0 text-orange-400" />

                <div>
                  <div className="text-sm font-black text-orange-200">
                    Güvenli entegrasyon modu
                  </div>

                  <p className="mt-1 text-xs leading-5 text-orange-200/60">
                    OTA anlaşmaları yapılana kadar dış kanallara
                    gerçek fiyat, kontenjan veya rezervasyon verisi
                    gönderilmez.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>

      </div>
    </main>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-2xl backdrop-blur-2xl">

      <div className="border-b border-white/[0.07] px-5 py-5 md:px-6">

        <div className="text-[10px] font-black uppercase tracking-[0.23em] text-orange-400">
          {eyebrow}
        </div>

        <h2 className="mt-1.5 text-xl font-black text-white md:text-2xl">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="p-4 md:p-6">
        {children}
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  emphasis,
  danger,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  emphasis?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 shadow-xl backdrop-blur-xl ${
        danger
          ? "border-red-500/25 bg-red-500/[0.07]"
          : emphasis
            ? "border-orange-400/25 bg-orange-400/[0.07]"
            : "border-white/10 bg-white/[0.035]"
      }`}
    >
      <div className="flex items-center justify-between">

        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </span>

        <span
          className={
            danger
              ? "text-red-400"
              : emphasis
                ? "text-orange-400"
                : "text-slate-500"
          }
        >
          {icon}
        </span>
      </div>

      <div className="mt-5 text-3xl font-black tracking-tight text-white">
        {value}
      </div>

      <div className="mt-1 text-[11px] text-slate-600">
        {subtitle}
      </div>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-black/20 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-xs font-bold text-slate-300">
        {value}
      </div>
    </div>
  );
}

function EngineRow({
  title,
  value,
  warning,
}: {
  title: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/10 px-4 py-3">

      <span className="text-sm font-bold text-slate-400">
        {title}
      </span>

      <span
        className={`text-xs font-black ${
          warning
            ? "text-orange-400"
            : "text-emerald-400"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="py-12 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-600">
        <FaServer />
      </div>

      <div className="mt-3 text-sm font-bold text-slate-500">
        {text}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const good =
    status === "active" ||
    status === "completed" ||
    status === "success";

  const danger =
    status === "failed" ||
    status === "error" ||
    status === "disconnected";

  const processing =
    status === "processing";

  const classes = good
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : danger
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : processing
        ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
        : "border-orange-400/20 bg-orange-400/10 text-orange-300";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-black ${classes}`}
    >
      {statusText(status)}
    </span>
  );
}
