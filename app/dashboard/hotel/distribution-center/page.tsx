"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowsRotate,
  FaCloudArrowDown,
  FaCloudArrowUp,
  FaTriangleExclamation,
  FaHotel,
  FaLink,
  FaServer,
} from "react-icons/fa6";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  getChannelManagerData,
} from "@/lib/hotel/channel-manager/channel-manager-service";

import {
  supabase,
} from "@/lib/supabase";

import DistributionActions from "@/components/hotel/channel-manager/DistributionActions";
import ChannelConnectionActions from "@/components/hotel/channel-manager/ChannelConnectionActions";

type InboxItem = {
  id: string;
  channel_code: string;
  external_reservation_id: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  check_in: string | null;
  check_out: string | null;
  processing_status: string;
  error_message: string | null;
};

type LiveData = {
  connections: any[];
  queue: any[];
  logs: any[];
  inbox: InboxItem[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}

export default function DistributionCenterPage() {
  const [companyId, setCompanyId] =
    useState("");

  const [data, setData] =
    useState<LiveData>({
      connections: [],
      queue: [],
      logs: [],
      inbox: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData = useCallback(
    async (id: string) => {
      const manager =
        await getChannelManagerData(id);

      const {
        data: inbox,
        error: inboxError,
      } = await supabase
        .from(
          "hotel_channel_reservation_inbox"
        )
        .select(`
          id,
          channel_code,
          external_reservation_id,
          guest_first_name,
          guest_last_name,
          check_in,
          check_out,
          processing_status,
          error_message
        `)
        .eq("company_id", id)
        .order("received_at", {
          ascending: false,
        })
        .limit(20);

      if (inboxError) {
        throw inboxError;
      }

      setData({
        connections:
          manager.connections ?? [],
        queue:
          manager.queue ?? [],
        logs:
          manager.logs ?? [],
        inbox:
          (inbox ?? []) as InboxItem[],
      });
    },
    []
  );

  useEffect(() => {
    async function init() {
      try {
        const user =
          await getCurrentUser();

        if (!user) {
          throw new Error(
            "Oturum bulunamadı."
          );
        }

        const membership =
          await getCurrentMembership(
            user.id
          );

        if (!membership) {
          throw new Error(
            "Firma üyeliği bulunamadı."
          );
        }

        setCompanyId(
          membership.company_id
        );

        await loadData(
          membership.company_id
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Distribution Center yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [loadData]);

  async function refresh() {
    if (!companyId) return;

    try {
      setRefreshing(true);
      setErrorMessage("");

      await loadData(companyId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Yenileme başarısız."
      );
    } finally {
      setRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    const activeConnections =
      data.connections.filter(
        (x) => x.status === "active"
      ).length;

    const pending =
      data.queue.filter(
        (x) => x.status === "pending"
      ).length;

    const processing =
      data.queue.filter(
        (x) => x.status === "processing"
      ).length;

    const failed =
      data.queue.filter(
        (x) => x.status === "failed"
      ).length;

    const completed =
      data.queue.filter(
        (x) => x.status === "completed"
      ).length;

    const mappingRequired =
      data.inbox.filter(
        (x) =>
          x.processing_status ===
          "mapping_required"
      ).length;

    const inboundFailed =
      data.inbox.filter(
        (x) =>
          x.processing_status === "failed"
      ).length;

    const health =
      data.connections.length === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (activeConnections /
                  data.connections.length) *
                  100 -
                  failed * 5 -
                  inboundFailed * 5
              )
            )
          );

    return {
      activeConnections,
      pending,
      processing,
      failed,
      completed,
      mappingRequired,
      inboundFailed,
      health,
    };
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Distribution Center yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-[1600px]">

        <section className="rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl md:p-10">

          <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.25em] text-orange-400">
                <FaServer />
                TUROBUS DISTRIBUTION ENGINE
              </div>

              <h1 className="mt-5 text-4xl font-black md:text-5xl">
                Hotel Distribution
                <span className="block text-slate-400">
                  Control Center
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400">
                OTA rezervasyonları, kanal bağlantıları,
                stok, fiyat, mapping ve senkronizasyon
                operasyonlarının canlı merkezi.
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 xl:min-w-[280px]">

              <div className="text-sm font-black text-emerald-300">
                Sistem Sağlığı
              </div>

              <div className="mt-3 text-5xl font-black">
                %{stats.health}
              </div>

              <div className="mt-2 text-xs text-emerald-200/60">
                Canlı Distribution verisi
              </div>

            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black"
          >
            <FaArrowsRotate
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            Şimdi Yenile
          </button>
        </section>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <Metric
            title="Aktif Kanallar"
            value={`${stats.activeConnections}/${data.connections.length}`}
            text="OTA bağlantıları"
            icon={<FaHotel />}
          />

          <Metric
            title="Outbound Bekleyen"
            value={stats.pending}
            text="PMS → OTA"
            icon={<FaCloudArrowUp />}
          />

          <Metric
            title="Mapping Bekleyen"
            value={stats.mappingRequired}
            text="OTA → PMS"
            icon={<FaLink />}
          />

          <Metric
            title="Hatalar"
            value={
              stats.failed +
              stats.inboundFailed
            }
            text="Müdahale gerekli"
            icon={<FaTriangleExclamation />}
          />

        </section>


        <DistributionActions
          companyId={companyId}
          mappingRequired={stats.mappingRequired}
          inboundFailed={stats.inboundFailed}
          onCompleted={refresh}
        />

        <section className="mt-6 grid gap-6 xl:grid-cols-2">

          <Panel title="Kanal Bağlantıları">

            <div className="space-y-3">

              {data.connections.map(
                (connection) => (
                  <div
                    key={connection.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
                  >

                    <div className="flex justify-between gap-4">

                      <div>
                        <div className="text-lg font-black">
                          {
                            connection.connection_name
                          }
                        </div>

                        <div className="mt-1 text-xs uppercase text-slate-500">
                          {
                            connection.channel_code
                          }
                        </div>
                      </div>

                      <Status
                        status={
                          connection.status
                        }
                      />

                    </div>

                    <div className="mt-4 text-xs text-slate-400">
                      Son senkron:{" "}
                      {formatDate(
                        connection.last_sync_at
                      )}
                    </div>

                    {connection.last_error_message && (
                      <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
                        {
                          connection.last_error_message
                        }
                      </div>
                    )}

                    <ChannelConnectionActions
                      companyId={companyId}
                      connectionId={connection.id}
                      status={connection.status}
                      onCompleted={refresh}
                    />

                  </div>
                )
              )}

              {!data.connections.length && (
                <Empty text="Kanal bağlantısı bulunmuyor." />
              )}

            </div>
          </Panel>

          <Panel title="Inbound OTA Rezervasyonları">

            <div className="space-y-3">

              {data.inbox.slice(0, 10).map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >

                    <div className="flex justify-between gap-4">

                      <div>
                        <div className="font-black">
                          {item.guest_first_name ||
                            "OTA"}{" "}
                          {item.guest_last_name ||
                            "Rezervasyon"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.channel_code.toUpperCase()}
                          {" • "}
                          {
                            item.external_reservation_id
                          }
                        </div>
                      </div>

                      <Status
                        status={
                          item.processing_status
                        }
                      />
                    </div>

                    <div className="mt-3 text-xs text-slate-400">
                      {item.check_in ?? "-"} →{" "}
                      {item.check_out ?? "-"}
                    </div>

                    {item.error_message && (
                      <div className="mt-3 text-xs text-red-300">
                        {
                          item.error_message
                        }
                      </div>
                    )}

                  </div>
                )
              )}

              {!data.inbox.length && (
                <Empty text="Inbound rezervasyon bulunmuyor." />
              )}

            </div>
          </Panel>

        </section>

        <section className="mt-6">

          <Panel title="Outbound Queue">

            <div className="grid gap-3 lg:grid-cols-2">

              {data.queue
                .slice(0, 12)
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >

                    <div className="flex justify-between gap-4">

                      <div>
                        <div className="font-black">
                          {
                            item.operation_type
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Deneme{" "}
                          {
                            item.attempt_count
                          }
                          /
                          {
                            item.max_attempts
                          }
                        </div>
                      </div>

                      <Status
                        status={
                          item.status
                        }
                      />

                    </div>

                  </div>
                ))}

              {!data.queue.length && (
                <Empty text="Outbound queue boş." />
              )}

            </div>

          </Panel>

        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">

          <Link
            href="/dashboard/hotel/channel-manager"
            className="rounded-[24px] border border-slate-800 bg-slate-900 p-5 font-black hover:border-orange-500/40"
          >
            Kanal Bağlantıları →
          </Link>

          <Link
            href="/dashboard/hotel/channel-mapping"
            className="rounded-[24px] border border-slate-800 bg-slate-900 p-5 font-black hover:border-orange-500/40"
          >
            Kanal Eşleştirmeleri →
          </Link>

          <Link
            href="/dashboard/hotel/channel-operations"
            className="rounded-[24px] border border-slate-800 bg-slate-900 p-5 font-black hover:border-orange-500/40"
          >
            Operasyon Merkezi →
          </Link>

        </section>

      </div>
    </main>
  );
}

function Metric({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: string | number;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-slate-800 bg-slate-900 p-6">

      <div className="text-xl text-orange-400">
        {icon}
      </div>

      <div className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-black">
        {value}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {text}
      </div>

    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[30px] border border-slate-800 bg-slate-950/80 p-6">

      <h2 className="mb-5 text-xl font-black">
        {title}
      </h2>

      {children}

    </div>
  );
}

function Status({
  status,
}: {
  status: string;
}) {
  const good = [
    "active",
    "completed",
    "ready",
  ].includes(status);

  const bad = [
    "failed",
    "error",
    "disconnected",
    "mapping_required",
  ].includes(status);

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black ${
        good
          ? "bg-emerald-500/15 text-emerald-300"
          : bad
          ? "bg-red-500/15 text-red-300"
          : "bg-amber-500/15 text-amber-300"
      }`}
    >
      {status}
    </span>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
