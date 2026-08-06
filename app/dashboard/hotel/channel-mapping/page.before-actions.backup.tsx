"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaHotel,
  FaLink,
  FaSave,
  FaSearch,
  FaSync,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  ChannelRoomMapping,
  createChannelMapping,
  deleteChannelMapping,
  enqueueValidatedFullSync,
  getChannelMappingData,
  MappingConnection,
  MappingRatePlan,
  MappingRoomType,
  MappingValidation,
  updateChannelMapping,
  validateChannelMapping,
} from "@/lib/hotel/channel-mapping/channel-mapping-service";

type PricingModel =
  | "per_room"
  | "per_person"
  | "occupancy_based";

type MappingRow = {
  roomTypeId: string;
  roomTypeName: string;
  totalRooms: number;

  mappingId: string | null;

  ratePlanId: string;

  externalRoomId: string;
  externalRoomName: string;

  externalRatePlanId: string;
  externalRatePlanName: string;

  occupancyCode: string;

  pricingModel: PricingModel;

  currency: string;

  markupPercent: string;
  commissionPercent: string;

  isActive: boolean;

  saved: boolean;
};

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

const channelLabels: Record<
  string,
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

const pricingModelLabels: Record<
  PricingModel,
  string
> = {
  per_room: "Oda Bazlı",
  per_person: "Kişi Bazlı",
  occupancy_based: "Doluluk Bazlı",
};

function createRow(
  roomType: MappingRoomType,
  mapping?: ChannelRoomMapping
): MappingRow {
  return {
    roomTypeId: roomType.id,
    roomTypeName: roomType.name,
    totalRooms: Number(
      roomType.total_rooms ?? 0
    ),

    mappingId: mapping?.id ?? null,

    ratePlanId:
      mapping?.rate_plan_id ?? "",

    externalRoomId:
      mapping?.external_room_id ?? "",

    externalRoomName:
      mapping?.external_room_name ?? "",

    externalRatePlanId:
      mapping?.external_rate_plan_id ??
      "",

    externalRatePlanName:
      mapping?.external_rate_plan_name ??
      "",

    occupancyCode:
      mapping?.occupancy_code ?? "",

    pricingModel:
      mapping?.pricing_model ??
      "per_room",

    currency:
      mapping?.currency ?? "TRY",

    markupPercent: String(
      mapping?.markup_percent ?? 0
    ),

    commissionPercent: String(
      mapping?.commission_percent ?? 0
    ),

    isActive:
      mapping?.is_active ?? true,

    saved: Boolean(mapping?.id),
  };
}

export default function ChannelMappingPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    connections,
    setConnections,
  ] = useState<MappingConnection[]>([]);

  const [
    roomTypes,
    setRoomTypes,
  ] = useState<MappingRoomType[]>([]);

  const [
    ratePlans,
    setRatePlans,
  ] = useState<MappingRatePlan[]>([]);

  const [
    mappings,
    setMappings,
  ] = useState<ChannelRoomMapping[]>([]);

  const [
    connectionId,
    setConnectionId,
  ] = useState("");

  const [rows, setRows] =
    useState<MappingRow[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    validation,
    setValidation,
  ] =
    useState<MappingValidation | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getChannelMappingData(
          companyId
        );

      setConnections(
        data.connections
      );

      setRoomTypes(data.roomTypes);
      setRatePlans(data.ratePlans);
      setMappings(data.mappings);
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
            : "Kanal eşleştirmeleri yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const selectedConnection =
    useMemo(
      () =>
        connections.find(
          (connection) =>
            connection.id ===
            connectionId
        ) ?? null,
      [connectionId, connections]
    );

  useEffect(() => {
    if (!selectedConnection) {
      setRows([]);
      setValidation(null);
      return;
    }

    const hotelRoomTypes =
      roomTypes.filter(
        (roomType) =>
          roomType.hotel_id ===
            selectedConnection.hotel_id &&
          roomType.is_active !== false
      );

    const nextRows =
      hotelRoomTypes.map(
        (roomType) => {
          const mapping =
            mappings.find(
              (item) =>
                item.connection_id ===
                  selectedConnection.id &&
                item.room_type_id ===
                  roomType.id
            );

          return createRow(
            roomType,
            mapping
          );
        }
      );

    setRows(nextRows);
    setValidation(null);
    setErrorMessage("");
    setSuccessMessage("");
  }, [
    mappings,
    roomTypes,
    selectedConnection,
  ]);

  const selectedHotel =
    firstRelation(
      selectedConnection?.hotel
    );

  const connectionRatePlans =
    useMemo(
      () =>
        ratePlans.filter(
          (ratePlan) =>
            selectedConnection &&
            ratePlan.hotel_id ===
              selectedConnection.hotel_id &&
            ratePlan.is_active !== false
        ),
      [
        ratePlans,
        selectedConnection,
      ]
    );

  const visibleRows = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.roomTypeName,
        row.externalRoomId,
        row.externalRoomName,
        row.externalRatePlanId,
        row.externalRatePlanName,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query)
        )
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const completed =
      rows.filter(
        (row) =>
          Boolean(
            row.externalRoomId.trim()
          ) &&
          Boolean(
            row.ratePlanId
          ) &&
          Boolean(
            row.externalRatePlanId.trim()
          )
      ).length;

    return {
      total: rows.length,
      completed,
      missing:
        rows.length - completed,
      percent:
        rows.length > 0
          ? Math.round(
              (completed /
                rows.length) *
                100
            )
          : 0,
    };
  }, [rows]);

  function updateRow(
    roomTypeId: string,
    patch: Partial<MappingRow>
  ) {
    setRows((current) =>
      current.map((row) =>
        row.roomTypeId === roomTypeId
          ? {
              ...row,
              ...patch,
              saved: false,
            }
          : row
      )
    );

    setValidation(null);
    setSuccessMessage("");
  }

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  async function saveAllMappings() {
    if (
      !membership ||
      !selectedConnection ||
      saving
    ) {
      return;
    }

    const rowsToSave =
      rows.filter(
        (row) =>
          row.externalRoomId.trim()
            .length > 0
      );

    if (rowsToSave.length === 0) {
      setErrorMessage(
        "En az bir oda tipi için kanal oda ID bilgisi girilmelidir."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      let created = 0;
      let updated = 0;

      for (const row of rowsToSave) {
        const payload = {
          companyId:
            membership.company_id,

          ratePlanId:
            row.ratePlanId || null,

          externalRoomId:
            row.externalRoomId.trim(),

          externalRoomName:
            row.externalRoomName.trim() ||
            null,

          externalRatePlanId:
            row.externalRatePlanId.trim() ||
            null,

          externalRatePlanName:
            row.externalRatePlanName.trim() ||
            null,

          occupancyCode:
            row.occupancyCode.trim() ||
            null,

          pricingModel:
            row.pricingModel,

          currency: row.currency,

          markupPercent:
            Number(
              row.markupPercent
            ) || 0,

          commissionPercent:
            Number(
              row.commissionPercent
            ) || 0,
        };

        if (row.mappingId) {
          await updateChannelMapping({
            ...payload,

            mappingId:
              row.mappingId,

            isActive:
              row.isActive,
          });

          updated += 1;
        } else {
          await createChannelMapping({
            ...payload,

            hotelId:
              selectedConnection.hotel_id,

            connectionId:
              selectedConnection.id,

            roomTypeId:
              row.roomTypeId,
          });

          created += 1;
        }
      }

      await refresh();

      setSuccessMessage(
        `${created} yeni eşleştirme oluşturuldu, ${updated} eşleştirme güncellendi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Eşleştirmeler kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRowMapping(
    row: MappingRow
  ) {
    if (
      !membership ||
      !row.mappingId ||
      saving
    ) {
      return;
    }

    const approved =
      window.confirm(
        `${row.roomTypeName} eşleştirmesi kalıcı olarak silinsin mi?`
      );

    if (!approved) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      await deleteChannelMapping(
        membership.company_id,
        row.mappingId
      );

      await refresh();

      setSuccessMessage(
        `${row.roomTypeName} eşleştirmesi silindi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Eşleştirme silinemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function runValidation() {
    if (
      !membership ||
      !connectionId ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      const result =
        await validateChannelMapping(
          membership.company_id,
          connectionId
        );

      setValidation(result);

      if (result.ready) {
        setSuccessMessage(
          result.message
        );
      } else {
        setErrorMessage(
          result.message
        );
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Eşleştirmeler kontrol edilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function startFullSync() {
    if (
      !membership ||
      !connectionId ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await enqueueValidatedFullSync(
        membership.company_id,
        connectionId
      );

      setSuccessMessage(
        "Tam senkronizasyon kuyruğa eklendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Senkronizasyon başlatılamadı."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Kanal eşleştirmeleri
        yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1900px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS CHANNEL MANAGER
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Oda & Fiyat Planı
            Eşleştirme
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            TurOS oda tiplerini ve fiyat
            planlarını satış kanalındaki
            oda ve fiyat planlarıyla
            satır bazında eşleştirin.
          </p>
        </header>

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

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label>
              <span className="mb-2 block text-sm font-black text-slate-400">
                Kanal Bağlantısı
              </span>

              <select
                value={connectionId}
                onChange={(event) =>
                  setConnectionId(
                    event.target.value
                  )
                }
                className="min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
              >
                <option value="">
                  Kanal bağlantısı seçin
                </option>

                {connections.map(
                  (connection) => (
                    <option
                      key={connection.id}
                      value={connection.id}
                    >
                      {
                        channelLabels[
                          connection.channel_code
                        ]
                      }
                      {" · "}
                      {
                        connection.connection_name
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-slate-400">
                Eşleştirmelerde Ara
              </span>

              <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
                <FaSearch className="text-orange-500" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Oda tipi veya kanal ID ara"
                  className="w-full bg-transparent font-bold text-slate-950 outline-none"
                />
              </div>
            </label>

            <button
              type="button"
              disabled={
                !connectionId ||
                saving
              }
              onClick={() =>
                void runValidation()
              }
              className="mt-auto flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 font-black disabled:opacity-50"
            >
              <FaCheckCircle />
              Kontrol Et
            </button>
          </div>
        </section>

        {!selectedConnection && (
          <section className="mt-7 flex min-h-[420px] items-center justify-center rounded-[30px] border border-white/10 bg-slate-900 p-12 text-center">
            <div>
              <FaLink className="mx-auto text-5xl text-orange-400" />

              <h2 className="mt-5 text-2xl font-black">
                Kanal bağlantısı seçin
              </h2>

              <p className="mt-2 text-slate-500">
                Oda tipleri seçilen kanal
                bağlantısına göre
                getirilecektir.
              </p>
            </div>
          </section>
        )}

        {selectedConnection && (
          <>
            <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-6">
              <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-2xl text-orange-400">
                    <FaHotel />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      {
                        channelLabels[
                          selectedConnection
                            .channel_code
                        ]
                      }
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      {
                        selectedConnection.connection_name
                      }
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedHotel?.name ??
                        "Otel"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center">
                    <p className="text-xs text-slate-500">
                      Oda Tipi
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {stats.total}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center">
                    <p className="text-xs text-slate-500">
                      Tamamlanan
                    </p>

                    <p className="mt-1 text-xl font-black text-emerald-400">
                      {stats.completed}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center">
                    <p className="text-xs text-slate-500">
                      Eksik
                    </p>

                    <p className="mt-1 text-xl font-black text-amber-400">
                      {stats.missing}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center">
                    <p className="text-xs text-slate-500">
                      Hazırlık
                    </p>

                    <p className="mt-1 text-xl font-black text-orange-400">
                      %{stats.percent}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all"
                  style={{
                    width: `${stats.percent}%`,
                  }}
                />
              </div>
            </section>

            {validation && (
              <section
                className={`mt-5 rounded-[30px] border p-5 ${
                  validation.ready
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-amber-500/20 bg-amber-500/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  {validation.ready ? (
                    <FaCheckCircle className="text-emerald-400" />
                  ) : (
                    <FaExclamationTriangle className="text-amber-400" />
                  )}

                  <p className="font-black">
                    {validation.message}
                  </p>
                </div>
              </section>
            )}

            <section className="mt-7 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900">
              <div className="overflow-x-auto">
                <div className="min-w-[1650px]">
                  <div className="grid grid-cols-[230px_210px_210px_210px_210px_180px_130px_130px_100px] gap-3 border-b border-white/10 bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                    <div>TurOS Oda Tipi</div>
                    <div>TurOS Fiyat Planı</div>
                    <div>Kanal Oda Bilgisi</div>
                    <div>Kanal Fiyat Planı</div>
                    <div>Fiyatlandırma</div>
                    <div>Para Birimi</div>
                    <div>Fiyat Artışı</div>
                    <div>Komisyon</div>
                    <div>İşlem</div>
                  </div>

                  {visibleRows.map(
                    (row) => {
                      const rowRatePlans =
                        connectionRatePlans.filter(
                          (ratePlan) =>
                            !ratePlan.room_type_id ||
                            ratePlan.room_type_id ===
                              row.roomTypeId
                        );

                      const complete =
                        Boolean(
                          row.externalRoomId.trim()
                        ) &&
                        Boolean(
                          row.ratePlanId
                        ) &&
                        Boolean(
                          row.externalRatePlanId.trim()
                        );

                      return (
                        <div
                          key={row.roomTypeId}
                          className="grid grid-cols-[230px_210px_210px_210px_210px_180px_130px_130px_100px] gap-3 border-b border-white/10 px-5 py-5 last:border-b-0"
                        >
                          <div className="rounded-2xl bg-slate-950 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-black">
                                  {row.roomTypeName}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {row.totalRooms} oda
                                </p>
                              </div>

                              <span
                                className={`h-3 w-3 rounded-full ${
                                  complete
                                    ? "bg-emerald-400"
                                    : "bg-amber-400"
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-500">
                              TurOS Fiyat Planı
                            </label>

                            <select
                              value={row.ratePlanId}
                              onChange={(event) =>
                                updateRow(
                                  row.roomTypeId,
                                  {
                                    ratePlanId:
                                      event.target.value,
                                  }
                                )
                              }
                              className="min-h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                            >
                              <option value="">
                                Fiyat planı seçin
                              </option>

                              {rowRatePlans.map(
                                (ratePlan) => (
                                  <option
                                    key={ratePlan.id}
                                    value={ratePlan.id}
                                  >
                                    {ratePlan.name}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                                Kanal Oda ID
                              </label>

                              <input
                                value={
                                  row.externalRoomId
                                }
                                onChange={(event) =>
                                  updateRow(
                                    row.roomTypeId,
                                    {
                                      externalRoomId:
                                        event.target.value,
                                    }
                                  )
                                }
                                placeholder="Örn: 54321678"
                                className="min-h-11 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                                Kanal Oda Adı
                              </label>

                              <input
                                value={
                                  row.externalRoomName
                                }
                                onChange={(event) =>
                                  updateRow(
                                    row.roomTypeId,
                                    {
                                      externalRoomName:
                                        event.target.value,
                                    }
                                  )
                                }
                                placeholder="Standard Double Room"
                                className="min-h-11 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                                Kanal Fiyat Planı ID
                              </label>

                              <input
                                value={
                                  row.externalRatePlanId
                                }
                                onChange={(event) =>
                                  updateRow(
                                    row.roomTypeId,
                                    {
                                      externalRatePlanId:
                                        event.target.value,
                                    }
                                  )
                                }
                                placeholder="Örn: 998877"
                                className="min-h-11 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                                Kanal Fiyat Planı Adı
                              </label>

                              <input
                                value={
                                  row.externalRatePlanName
                                }
                                onChange={(event) =>
                                  updateRow(
                                    row.roomTypeId,
                                    {
                                      externalRatePlanName:
                                        event.target.value,
                                    }
                                  )
                                }
                                placeholder="Non Refundable"
                                className="min-h-11 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                                Fiyatlandırma Modeli
                              </label>

                              <select
                                value={
                                  row.pricingModel
                                }
                                onChange={(event) =>
                                  updateRow(
                                    row.roomTypeId,
                                    {
                                      pricingModel:
                                        event.target
                                          .value as
                                          PricingModel,
                                    }
                                  )
                                }
                                className="min-h-11 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                              >
                                {Object.entries(
                                  pricingModelLabels
                                ).map(
                                  ([
                                    value,
                                    label,
                                  ]) => (
                                    <option
                                      key={value}
                                      value={value}
                                    >
                                      {label}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                                Doluluk Kodu
                              </label>

                              <input
                                value={
                                  row.occupancyCode
                                }
                                onChange={(event) =>
                                  updateRow(
                                    row.roomTypeId,
                                    {
                                      occupancyCode:
                                        event.target.value,
                                    }
                                  )
                                }
                                placeholder="Opsiyonel"
                                className="min-h-11 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-500">
                              Para Birimi
                            </label>

                            <select
                              value={row.currency}
                              onChange={(event) =>
                                updateRow(
                                  row.roomTypeId,
                                  {
                                    currency:
                                      event.target.value,
                                  }
                                )
                              }
                              className="min-h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                            >
                              <option value="TRY">
                                TRY
                              </option>
                              <option value="EUR">
                                EUR
                              </option>
                              <option value="USD">
                                USD
                              </option>
                              <option value="GBP">
                                GBP
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-500">
                              Markup %
                            </label>

                            <input
                              type="number"
                              step="0.01"
                              value={
                                row.markupPercent
                              }
                              onChange={(event) =>
                                updateRow(
                                  row.roomTypeId,
                                  {
                                    markupPercent:
                                      event.target.value,
                                  }
                                )
                              }
                              className="min-h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-500">
                              Komisyon %
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                row.commissionPercent
                              }
                              onChange={(event) =>
                                updateRow(
                                  row.roomTypeId,
                                  {
                                    commissionPercent:
                                      event.target.value,
                                  }
                                )
                              }
                              className="min-h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-950"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/5 text-xs font-black">
                              <input
                                type="checkbox"
                                checked={
                                  row.isActive
                                }
                                onChange={(event) =>
                                  updateRow(
                                    row.roomTypeId,
                                    {
                                      isActive:
                                        event.target.checked,
                                    }
                                  )
                                }
                              />
                              Aktif
                            </label>

                            {row.mappingId && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void deleteRowMapping(
                                    row
                                  )
                                }
                                className="flex min-h-11 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {visibleRows.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  Eşleştirilecek oda tipi
                  bulunmuyor.
                </div>
              )}
            </section>

            <section className="sticky bottom-4 z-20 mt-6 flex flex-col justify-between gap-4 rounded-[26px] border border-orange-500/30 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-xl md:flex-row md:items-center">
              <div>
                <p className="font-black">
                  {stats.completed}/
                  {stats.total} oda tipi
                  tamamlandı
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Kanal oda ID ve fiyat
                  planı bilgilerini kontrol
                  ederek kaydedin.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    saving ||
                    rows.length === 0
                  }
                  onClick={() =>
                    void saveAllMappings()
                  }
                  className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-8 font-black disabled:opacity-50"
                >
                  <FaSave />

                  {saving
                    ? "Kaydediliyor..."
                    : "Tüm Eşleştirmeleri Kaydet"}
                </button>

                <button
                  type="button"
                  disabled={
                    saving ||
                    validation?.ready !==
                      true
                  }
                  onClick={() =>
                    void startFullSync()
                  }
                  className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 font-black disabled:opacity-50"
                >
                  <FaCloudUploadAlt />
                  Tam Senkron Başlat
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
