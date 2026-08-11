"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaCog,
  FaExclamationTriangle,
  FaGlobe,
  FaLink,
  FaPause,
  FaPlay,
  FaPlus,
  FaRedo,
  FaServer,
  FaSync,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  activateChannelConnection,
  cancelQueueItem,
  ChannelCode,
  ChannelConnection,
  ChannelLog,
  ChannelQueueItem,
  ConnectionStatus,
  createConnection,
  deleteConnection,
  getChannelRuntimeStatus,
  saveConnectionCredentials,
  testChannelConnection,
  enqueueSync,
  getChannelManagerData,
  simulateQueueItem,
  updateConnectionStatus,
} from "@/lib/hotel/channel-manager/channel-manager-service";

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function dateTime(
  value: string | null
): string {
  if (!value) return "Henüz yok";

  return new Date(
    value
  ).toLocaleString("tr-TR");
}

const channelLabels: Record<
  ChannelCode,
  string
> = {
  booking: "Booking.com",
  expedia: "Expedia",
  hotelbeds: "Hotelbeds",
  airbnb: "Airbnb",
  ets: "ETS",
  jolly: "Jolly",
  tatilliyoruz: "Tatilliyoruz",
  website: "Web Sitesi",
  custom: "Özel API",
};

const connectionStatusLabels: Record<
  ConnectionStatus,
  string
> = {
  draft: "Taslak",
  active: "Aktif",
  paused: "Duraklatıldı",
  error: "Hata",
  disconnected: "Bağlantı Kesildi",
};

const operationLabels: Record<
  string,
  string
> = {
  inventory_update:
    "Kontenjan Güncelleme",
  rate_update: "Fiyat Güncelleme",
  restriction_update:
    "Kural Güncelleme",
  reservation_import:
    "Rezervasyon İçe Aktarma",
  reservation_acknowledge:
    "Rezervasyon Onayı",
  full_sync:
    "Tam Senkronizasyon",
  connection_test:
    "Bağlantı Testi",
};

function connectionStatusClass(
  status: ConnectionStatus
): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400";

    case "paused":
      return "bg-amber-500/15 text-amber-400";

    case "error":
    case "disconnected":
      return "bg-red-500/15 text-red-400";

    default:
      return "bg-blue-500/15 text-blue-400";
  }
}

function queueStatusClass(
  status: ChannelQueueItem["status"]
): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-400";

    case "processing":
      return "bg-blue-500/15 text-blue-400";

    case "failed":
      return "bg-red-500/15 text-red-400";

    case "cancelled":
      return "bg-slate-500/15 text-slate-400";

    default:
      return "bg-amber-500/15 text-amber-400";
  }
}

export default function ChannelManagerPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [hotels, setHotels] =
    useState<
      {
        id: string;
        name: string;
      }[]
    >([]);

  const [
    connections,
    setConnections,
  ] = useState<ChannelConnection[]>(
    []
  );

  const [queue, setQueue] =
    useState<ChannelQueueItem[]>([]);

  const [logs, setLogs] =
    useState<ChannelLog[]>([]);

  const [selectedConnectionId, setSelectedConnectionId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [runtimeMode, setRuntimeMode] =
    useState<
      "simulation" | "live"
    >("simulation");

  const [form, setForm] = useState({
    hotelId: "",
    channelCode:
      "booking" as ChannelCode,
    connectionName: "",
    externalHotelId: "",
    endpointUrl: "",
    credentialsJson: "{}",
  });

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getChannelManagerData(
          companyId
        );

      setHotels(data.hotels);
      setConnections(
        data.connections
      );
      setQueue(data.queue);
      setLogs(data.logs);

      try {
        const runtime =
          await getChannelRuntimeStatus(
            companyId
          );

        setRuntimeMode(
          runtime.mode
        );
      } catch {
        setRuntimeMode(
          "simulation"
        );
      }
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          currentMembership
        );

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Channel Manager yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  const selectedConnection =
    useMemo(
      () =>
        connections.find(
          (connection) =>
            connection.id ===
            selectedConnectionId
        ) ?? null,
      [
        connections,
        selectedConnectionId,
      ]
    );

  const selectedQueue = useMemo(
    () =>
      selectedConnectionId
        ? queue.filter(
            (item) =>
              item.connection_id ===
              selectedConnectionId
          )
        : queue,
    [
      queue,
      selectedConnectionId,
    ]
  );

  const selectedLogs = useMemo(
    () =>
      selectedConnectionId
        ? logs.filter(
            (item) =>
              item.connection_id ===
              selectedConnectionId
          )
        : logs,
    [
      logs,
      selectedConnectionId,
    ]
  );

  const stats = useMemo(
    () => ({
      active: connections.filter(
        (item) =>
          item.status === "active"
      ).length,

      pending: queue.filter(
        (item) =>
          item.status === "pending"
      ).length,

      completed: queue.filter(
        (item) =>
          item.status ===
          "completed"
      ).length,

      failed: queue.filter(
        (item) =>
          item.status === "failed"
      ).length,
    }),
    [connections, queue]
  );

  async function submitConnection(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing
    ) {
      return;
    }

    if (
      !form.hotelId ||
      !form.connectionName.trim()
    ) {
      setErrorMessage(
        "Otel ve bağlantı adı girilmelidir."
      );

      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      await createConnection({
        companyId:
          membership.company_id,
        hotelId: form.hotelId,
        channelCode:
          form.channelCode,
        connectionName:
          form.connectionName.trim(),
        externalHotelId:
          form.externalHotelId.trim() ||
          null,
        endpointUrl:
          form.endpointUrl.trim() ||
          null,
      });

      setForm({
        hotelId: "",
        channelCode: "booking",
        connectionName: "",
        externalHotelId: "",
        endpointUrl: "",
        credentialsJson: "{}",
      });

      await refresh();

      setSuccessMessage(
        "Kanal bağlantısı oluşturuldu."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Bağlantı oluşturulamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function changeConnectionStatus(
    connection: ChannelConnection,
    status: ConnectionStatus
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (
        status ===
        "active"
      ) {
        const result =
          await activateChannelConnection(
            membership.company_id,
            connection.id
          );

        await refresh();

        setSuccessMessage(
          result.mode ===
          "live"
            ? `${connection.connection_name} canlı OTA modunda aktif edildi.`
            : `${connection.connection_name} simülasyon modunda aktif edildi.`
        );

        return;
      }

      await updateConnectionStatus(
        membership.company_id,
        connection.id,
        status
      );

      await refresh();

      setSuccessMessage(
        `${connection.connection_name} durumu “${connectionStatusLabels[status]}” olarak güncellendi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Bağlantı durumu güncellenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function removeConnection(
    connection: ChannelConnection
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        `${connection.connection_name} bağlantısı ve tüm senkronizasyon geçmişi silinsin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await deleteConnection(
        membership.company_id,
        connection.id
      );

      if (
        selectedConnectionId ===
        connection.id
      ) {
        setSelectedConnectionId("");
      }

      await refresh();

      setSuccessMessage(
        "Kanal bağlantısı silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Bağlantı silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function createQueueItem(
    connection: ChannelConnection,
    operationType:
      | "inventory_update"
      | "rate_update"
      | "restriction_update"
      | "reservation_import"
      | "full_sync"
      | "connection_test"
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (
        operationType ===
        "connection_test"
      ) {
        const result =
          await testChannelConnection(
            membership.company_id,
            connection.id
          );

        await refresh();

        setSuccessMessage(
          result.simulated
            ? "Bağlantı testi simülasyon modunda başarılı."
            : "Canlı OTA bağlantı testi başarılı."
        );

        return;
      }

      const item =
        await enqueueSync({
          companyId:
            membership.company_id,
          hotelId:
            connection.hotel_id,
          connectionId:
            connection.id,
          operationType,
          payload: {
            requested_at:
              new Date().toISOString(),
          },
          priority: 100,
        });

      await simulateQueueItem(
        membership.company_id,
        item.id
      );

      await refresh();

      setSuccessMessage(
        `${operationLabels[operationType]} simülasyonu tamamlandı.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Senkronizasyon başlatılamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function retryQueue(
    item: ChannelQueueItem
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);

    try {
      await simulateQueueItem(
        membership.company_id,
        item.id
      );

      await refresh();

      setSuccessMessage(
        "Kuyruk işlemi yeniden çalıştırıldı."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "İşlem yeniden çalıştırılamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function cancelQueue(
    item: ChannelQueueItem
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);

    try {
      await cancelQueueItem(
        membership.company_id,
        item.id
      );

      await refresh();

      setSuccessMessage(
        "Kuyruk işlemi iptal edildi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kuyruk işlemi iptal edilemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Channel Manager yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS HOTEL PMS
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black md:text-5xl">
                Channel Manager
              </h1>

              <span
                className={
                  runtimeMode ===
                  "live"
                    ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-400"
                    : "rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-400"
                }
              >
                {runtimeMode ===
                "live"
                  ? "CANLI OTA MODU"
                  : "SİMÜLASYON MODU"}
              </span>
            </div>

            <p className="mt-4 max-w-4xl text-slate-400">
              Kanal bağlantılarını,
              kontenjan ve fiyat
              senkronizasyon kuyruğunu
              tek merkezden yönetin.
            </p>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={() =>
              void refresh()
            }
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
          >
            <FaSync />
            Verileri Yenile
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label:
                "Aktif Bağlantı",
              value: stats.active,
              icon: FaLink,
            },
            {
              label:
                "Bekleyen İşlem",
              value: stats.pending,
              icon:
                FaCloudUploadAlt,
            },
            {
              label:
                "Başarılı İşlem",
              value: stats.completed,
              icon:
                FaCheckCircle,
            },
            {
              label: "Hatalı İşlem",
              value: stats.failed,
              icon:
                FaExclamationTriangle,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <Icon className="text-orange-400" />

                <p className="mt-5 text-sm text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-4xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <form
          onSubmit={submitConnection}
          className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6"
        >
          <h2 className="flex items-center gap-3 text-2xl font-black">
            <FaPlus className="text-orange-400" />
            Yeni Kanal Bağlantısı
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <select
              required
              value={form.hotelId}
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    hotelId:
                      event.target.value,
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Otel seçin
              </option>

              {hotels.map((hotel) => (
                <option
                  key={hotel.id}
                  value={hotel.id}
                >
                  {hotel.name}
                </option>
              ))}
            </select>

            <select
              value={
                form.channelCode
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    channelCode:
                      event.target
                        .value as
                        ChannelCode,
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              {Object.entries(
                channelLabels
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <input
              required
              value={
                form.connectionName
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    connectionName:
                      event.target.value,
                  })
                )
              }
              placeholder="Bağlantı adı"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={
                form.externalHotelId
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    externalHotelId:
                      event.target.value,
                  })
                )
              }
              placeholder="Kanal otel ID"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <button
              type="submit"
              disabled={processing}
              className="min-h-12 rounded-xl bg-orange-500 px-5 font-black disabled:opacity-50"
            >
              Bağlantıyı Oluştur
            </button>
          </div>
        </form>
        {selectedConnection && (
          <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <h2 className="flex items-center gap-3 text-2xl font-black">
              <FaCog className="text-orange-400" />
              Güvenli OTA Credentials
            </h2>

            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Credential bilgileri yalnız sunucuya gönderilir.
              Kaydedilmiş gizli değerler tarayıcıya geri okunmaz.
            </p>

            <textarea
              value={
                form.credentialsJson
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    credentialsJson:
                      event.target.value,
                  })
                )
              }
              rows={8}
              placeholder='{"apiKey":"...","username":"...","password":"..."}'
              className="mt-5 w-full rounded-2xl bg-slate-950 p-4 font-mono text-sm text-white outline-none ring-1 ring-white/10 focus:ring-orange-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={processing}
                onClick={() => {
                  void (async () => {
                    if (
                      !membership ||
                      !selectedConnection
                    ) {
                      return;
                    }

                    setProcessing(true);
                    setErrorMessage("");
                    setSuccessMessage("");

                    try {
                      const parsed =
                        JSON.parse(
                          form.credentialsJson
                        );

                      if (
                        !parsed ||
                        typeof parsed !==
                          "object" ||
                        Array.isArray(parsed)
                      ) {
                        throw new Error(
                          "Credentials geçerli bir JSON object olmalıdır."
                        );
                      }

                      await saveConnectionCredentials({
                        companyId:
                          membership.company_id,

                        connectionId:
                          selectedConnection.id,

                        credentials:
                          parsed,

                        endpointUrl:
                          selectedConnection.endpoint_url,
                      });

                      setForm(
                        (current) => ({
                          ...current,
                          credentialsJson:
                            "{}",
                        })
                      );

                      setSuccessMessage(
                        "Credentials güvenli şekilde kaydedildi. Gizli değerler ekranda tutulmadı."
                      );
                    } catch (error) {
                      setErrorMessage(
                        error instanceof Error
                          ? error.message
                          : "Credentials kaydedilemedi."
                      );
                    } finally {
                      setProcessing(false);
                    }
                  })();
                }}
                className="rounded-2xl bg-orange-500 px-6 py-3 font-black disabled:opacity-50"
              >
                Credentials Kaydet
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={() => {
                  void createQueueItem(
                    selectedConnection,
                    "connection_test"
                  );
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-black disabled:opacity-50"
              >
                Bağlantıyı Test Et
              </button>
            </div>
          </section>
        )}



        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {connections.map(
            (connection) => {
              const hotel =
                firstRelation(
                  connection.hotel
                );

              const selected =
                selectedConnectionId ===
                connection.id;

              return (
                <article
                  key={connection.id}
                  className={`rounded-[30px] border p-6 ${
                    selected
                      ? "border-orange-400 bg-orange-500/[0.06]"
                      : "border-white/10 bg-slate-900"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedConnectionId(
                        selected
                          ? ""
                          : connection.id
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                          {
                            channelLabels[
                              connection.channel_code
                            ]
                          }
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                          {
                            connection.connection_name
                          }
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                          {hotel?.name ??
                            "Otel"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${connectionStatusClass(
                          connection.status
                        )}`}
                      >
                        {
                          connectionStatusLabels[
                            connection.status
                          ]
                        }
                      </span>
                    </div>
                  </button>

                  <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm">
                    <p className="text-slate-500">
                      Son başarılı senkronizasyon
                    </p>

                    <p className="mt-1 font-black">
                      {dateTime(
                        connection.last_success_at
                      )}
                    </p>

                    {connection.last_error_message && (
                      <p className="mt-3 text-red-400">
                        {
                          connection.last_error_message
                        }
                      </p>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {connection.status !==
                    "active" ? (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void changeConnectionStatus(
                            connection,
                            "active"
                          )
                        }
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black"
                      >
                        <FaPlay />
                        Aktifleştir
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void changeConnectionStatus(
                            connection,
                            "paused"
                          )
                        }
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 font-black"
                      >
                        <FaPause />
                        Duraklat
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void createQueueItem(
                          connection,
                          "connection_test"
                        )
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 font-black"
                    >
                      <FaServer />
                      Test Et
                    </button>

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void createQueueItem(
                          connection,
                          "full_sync"
                        )
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 font-black"
                    >
                      <FaSync />
                      Tam Senkron
                    </button>

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void removeConnection(
                          connection
                        )
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400"
                    >
                      <FaTrash />
                      Sil
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </section>

        {connections.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500">
            Henüz kanal bağlantısı
            oluşturulmadı.
          </div>
        )}

        <section className="mt-8 grid gap-7 xl:grid-cols-2">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">
              Senkronizasyon Kuyruğu
            </h2>

            <div className="mt-5 max-h-[650px] space-y-3 overflow-y-auto">
              {selectedQueue.map(
                (item) => {
                  const connection =
                    firstRelation(
                      item.connection
                    );

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-slate-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">
                            {
                              operationLabels[
                                item.operation_type
                              ]
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              connection?.connection_name
                            }
                            {" · "}
                            {dateTime(
                              item.created_at
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${queueStatusClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {item.error_message && (
                        <p className="mt-3 text-sm text-red-400">
                          {item.error_message}
                        </p>
                      )}

                      <div className="mt-4 flex gap-3">
                        {item.status ===
                          "failed" && (
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void retryQueue(
                                item
                              )
                            }
                            className="flex min-h-10 items-center gap-2 rounded-xl bg-blue-500 px-4 font-black"
                          >
                            <FaRedo />
                            Yeniden Dene
                          </button>
                        )}

                        {[
                          "pending",
                          "failed",
                        ].includes(
                          item.status
                        ) && (
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void cancelQueue(
                                item
                              )
                            }
                            className="flex min-h-10 items-center gap-2 rounded-xl bg-red-500/15 px-4 font-black text-red-400"
                          >
                            <FaTimesCircle />
                            İptal
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              {selectedQueue.length ===
                0 && (
                <p className="text-slate-500">
                  Kuyruk işlemi bulunmuyor.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">
              Senkronizasyon Logları
            </h2>

            <div className="mt-5 max-h-[650px] space-y-3 overflow-y-auto">
              {selectedLogs.map(
                (log) => {
                  const connection =
                    firstRelation(
                      log.connection
                    );

                  return (
                    <div
                      key={log.id}
                      className="rounded-2xl bg-slate-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">
                            {
                              operationLabels[
                                log.event_type
                              ]
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              connection?.connection_name
                            }
                            {" · "}
                            {log.direction}
                            {" · "}
                            {dateTime(
                              log.created_at
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            log.status ===
                            "success"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : log.status ===
                                  "error"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      {log.message && (
                        <p className="mt-3 text-sm text-slate-400">
                          {log.message}
                        </p>
                      )}

                      {log.duration_ms != null && (
                        <p className="mt-2 text-xs text-slate-600">
                          Süre:{" "}
                          {log.duration_ms} ms
                        </p>
                      )}
                    </div>
                  );
                }
              )}

              {selectedLogs.length ===
                0 && (
                <p className="text-slate-500">
                  Senkronizasyon logu
                  bulunmuyor.
                </p>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
