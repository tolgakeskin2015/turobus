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
  FaCopy,
  FaExclamationTriangle,
  FaHotel,
  FaLink,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUndo,
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
};

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

const channelLabels: Record<string, string> = {
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
      mapping?.external_rate_plan_id ?? "",

    externalRatePlanName:
      mapping?.external_rate_plan_name ?? "",

    occupancyCode:
      mapping?.occupancy_code ?? "",

    pricingModel:
      mapping?.pricing_model ?? "per_room",

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
  };
}

function comparableRow(
  row: MappingRow
): string {
  return JSON.stringify({
    mappingId: row.mappingId,
    ratePlanId: row.ratePlanId,

    externalRoomId:
      row.externalRoomId.trim(),

    externalRoomName:
      row.externalRoomName.trim(),

    externalRatePlanId:
      row.externalRatePlanId.trim(),

    externalRatePlanName:
      row.externalRatePlanName.trim(),

    occupancyCode:
      row.occupancyCode.trim(),

    pricingModel:
      row.pricingModel,

    currency:
      row.currency,

    markupPercent:
      Number(row.markupPercent) || 0,

    commissionPercent:
      Number(row.commissionPercent) || 0,

    isActive:
      row.isActive,
  });
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

  const [
    originalRows,
    setOriginalRows,
  ] = useState<MappingRow[]>([]);

  const [
    selectedRoomTypeIds,
    setSelectedRoomTypeIds,
  ] = useState<string[]>([]);

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
    processingRowId,
    setProcessingRowId,
  ] = useState("");

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

      setRoomTypes(
        data.roomTypes
      );

      setRatePlans(
        data.ratePlans
      );

      setMappings(
        data.mappings
      );
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
      setOriginalRows([]);
      setSelectedRoomTypeIds([]);
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

    setOriginalRows(
      nextRows.map((row) => ({
        ...row,
      }))
    );

    setSelectedRoomTypeIds([]);
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

  function getOriginalRow(
    roomTypeId: string
  ): MappingRow | undefined {
    return originalRows.find(
      (row) =>
        row.roomTypeId === roomTypeId
    );
  }

  function isRowDirty(
    row: MappingRow
  ): boolean {
    const original =
      getOriginalRow(
        row.roomTypeId
      );

    if (!original) {
      return true;
    }

    return (
      comparableRow(row) !==
      comparableRow(original)
    );
  }

  const dirtyRows = useMemo(
    () =>
      rows.filter((row) => {
        const original =
          originalRows.find(
            (item) =>
              item.roomTypeId ===
              row.roomTypeId
          );

        if (!original) {
          return true;
        }

        return (
          comparableRow(row) !==
          comparableRow(original)
        );
      }),
    [originalRows, rows]
  );

  const hasUnsavedChanges =
    dirtyRows.length > 0;

  useEffect(() => {
    function warnBeforeUnload(
      event: BeforeUnloadEvent
    ) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      warnBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        warnBeforeUnload
      );
    };
  }, [hasUnsavedChanges]);

  const visibleRows = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) {
      return rows;
    }

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
              (
                completed /
                rows.length
              ) * 100
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
            }
          : row
      )
    );

    setValidation(null);
    setSuccessMessage("");
  }

  function toggleRowSelection(
    roomTypeId: string
  ) {
    setSelectedRoomTypeIds(
      (current) =>
        current.includes(roomTypeId)
          ? current.filter(
              (id) =>
                id !== roomTypeId
            )
          : [
              ...current,
              roomTypeId,
            ]
    );
  }

  function toggleAllVisibleRows() {
    const visibleIds =
      visibleRows.map(
        (row) =>
          row.roomTypeId
      );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedRoomTypeIds.includes(
          id
        )
      );

    if (allSelected) {
      setSelectedRoomTypeIds(
        (current) =>
          current.filter(
            (id) =>
              !visibleIds.includes(id)
          )
      );

      return;
    }

    setSelectedRoomTypeIds(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...visibleIds,
          ])
        )
    );
  }

  function cancelRowChanges(
    roomTypeId: string
  ) {
    const original =
      getOriginalRow(
        roomTypeId
      );

    if (!original) {
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.roomTypeId === roomTypeId
          ? {
              ...original,
            }
          : row
      )
    );

    setErrorMessage("");
    setSuccessMessage(
      "Satırdaki değişiklikler geri alındı."
    );
  }

  function revertAllChanges() {
    if (!hasUnsavedChanges) {
      setSuccessMessage(
        "Geri alınacak değişiklik bulunmuyor."
      );
      return;
    }

    const approved =
      window.confirm(
        "Kaydedilmemiş tüm değişiklikler geri alınsın mı?"
      );

    if (!approved) {
      return;
    }

    setRows(
      originalRows.map((row) => ({
        ...row,
      }))
    );

    setSelectedRoomTypeIds([]);
    setErrorMessage("");
    setSuccessMessage(
      "Tüm kaydedilmemiş değişiklikler geri alındı."
    );
  }

  function copyRowSettings(
    sourceRow: MappingRow
  ) {
    const targetIds =
      selectedRoomTypeIds.filter(
        (id) =>
          id !==
          sourceRow.roomTypeId
      );

    const applyToIds =
      targetIds.length > 0
        ? targetIds
        : rows
            .filter(
              (row) =>
                row.roomTypeId !==
                sourceRow.roomTypeId
            )
            .map(
              (row) =>
                row.roomTypeId
            );

    if (applyToIds.length === 0) {
      setErrorMessage(
        "Ayarların kopyalanacağı başka oda tipi bulunmuyor."
      );
      return;
    }

    const approved =
      window.confirm(
        targetIds.length > 0
          ? `Fiyatlandırma ayarları seçili ${targetIds.length} satıra kopyalansın mı?`
          : "Fiyatlandırma ayarları diğer tüm satırlara kopyalansın mı?"
      );

    if (!approved) {
      return;
    }

    setRows((current) =>
      current.map((row) =>
        applyToIds.includes(
          row.roomTypeId
        )
          ? {
              ...row,

              pricingModel:
                sourceRow.pricingModel,

              currency:
                sourceRow.currency,

              markupPercent:
                sourceRow.markupPercent,

              commissionPercent:
                sourceRow.commissionPercent,

              occupancyCode:
                sourceRow.occupancyCode,
            }
          : row
      )
    );

    setSuccessMessage(
      "Fiyatlandırma ayarları kopyalandı."
    );
  }

  async function refresh() {
    if (!membership) {
      return;
    }

    await loadData(
      membership.company_id
    );
  }

  function validateRow(
    row: MappingRow
  ): string | null {
    if (
      !row.externalRoomId.trim()
    ) {
      return `${row.roomTypeName}: Kanal oda ID bilgisi girilmelidir.`;
    }

    if (!row.ratePlanId) {
      return `${row.roomTypeName}: TurOS fiyat planı seçilmelidir.`;
    }

    if (
      !row.externalRatePlanId.trim()
    ) {
      return `${row.roomTypeName}: Kanal fiyat planı ID bilgisi girilmelidir.`;
    }

    return null;
  }

  async function persistRow(
    row: MappingRow
  ) {
    if (
      !membership ||
      !selectedConnection
    ) {
      throw new Error(
        "Kanal bağlantısı bulunamadı."
      );
    }

    const validationMessage =
      validateRow(row);

    if (validationMessage) {
      throw new Error(
        validationMessage
      );
    }

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

      currency:
        row.currency,

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

      return "updated";
    }

    await createChannelMapping({
      ...payload,

      hotelId:
        selectedConnection.hotel_id,

      connectionId:
        selectedConnection.id,

      roomTypeId:
        row.roomTypeId,
    });

    return "created";
  }

  async function saveSingleRow(
    row: MappingRow
  ) {
    if (
      !membership ||
      !selectedConnection ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setProcessingRowId(
      row.roomTypeId
    );
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      await persistRow(row);

      await refresh();

      setSuccessMessage(
        `${row.roomTypeName} eşleştirmesi kaydedildi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Satır kaydedilemedi."
      );
    } finally {
      setSaving(false);
      setProcessingRowId("");
    }
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
      dirtyRows.filter(
        (row) =>
          row.externalRoomId.trim()
            .length > 0 ||
          Boolean(row.mappingId)
      );

    if (
      rowsToSave.length === 0
    ) {
      setSuccessMessage(
        "Kaydedilecek değişiklik bulunmuyor."
      );
      return;
    }

    for (const row of rowsToSave) {
      const validationMessage =
        validateRow(row);

      if (validationMessage) {
        setErrorMessage(
          validationMessage
        );
        return;
      }
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      let created = 0;
      let updated = 0;

      for (const row of rowsToSave) {
        setProcessingRowId(
          row.roomTypeId
        );

        const result =
          await persistRow(row);

        if (result === "created") {
          created += 1;
        } else {
          updated += 1;
        }
      }

      await refresh();

      setSelectedRoomTypeIds([]);

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
      setProcessingRowId("");
    }
  }

  async function deleteRowMapping(
    row: MappingRow
  ) {
    if (
      !membership ||
      saving
    ) {
      return;
    }

    if (!row.mappingId) {
      cancelRowChanges(
        row.roomTypeId
      );

      return;
    }

    const approved =
      window.confirm(
        `${row.roomTypeName} eşleştirmesi kalıcı olarak silinsin mi?`
      );

    if (!approved) {
      return;
    }

    setSaving(true);
    setProcessingRowId(
      row.roomTypeId
    );
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      await deleteChannelMapping(
        membership.company_id,
        row.mappingId
      );

      await refresh();

      setSelectedRoomTypeIds(
        (current) =>
          current.filter(
            (id) =>
              id !== row.roomTypeId
          )
      );

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
      setProcessingRowId("");
    }
  }

  async function deleteSelectedMappings() {
    if (
      !membership ||
      saving
    ) {
      return;
    }

    const selectedRows =
      rows.filter((row) =>
        selectedRoomTypeIds.includes(
          row.roomTypeId
        )
      );

    if (
      selectedRows.length === 0
    ) {
      setErrorMessage(
        "Silmek için en az bir satır seçilmelidir."
      );
      return;
    }

    const savedRows =
      selectedRows.filter(
        (row) =>
          Boolean(row.mappingId)
      );

    const approved =
      window.confirm(
        `${selectedRows.length} seçili satır temizlensin mi? Kaydedilmiş ${savedRows.length} eşleştirme veritabanından tamamen silinecektir.`
      );

    if (!approved) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      for (const row of savedRows) {
        if (!row.mappingId) {
          continue;
        }

        setProcessingRowId(
          row.roomTypeId
        );

        await deleteChannelMapping(
          membership.company_id,
          row.mappingId
        );
      }

      await refresh();

      setSelectedRoomTypeIds([]);

      setSuccessMessage(
        `${selectedRows.length} satır temizlendi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Seçili eşleştirmeler silinemedi."
      );
    } finally {
      setSaving(false);
      setProcessingRowId("");
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

    if (hasUnsavedChanges) {
      setErrorMessage(
        "Kontrol işleminden önce kaydedilmemiş değişiklikleri kaydedin veya geri alın."
      );
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

    if (hasUnsavedChanges) {
      setErrorMessage(
        "Senkronizasyon öncesinde değişiklikleri kaydedin."
      );
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
        Kanal eşleştirmeleri yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1950px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS CHANNEL MANAGER
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Oda & Fiyat Planı Eşleştirme
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            TurOS oda tiplerini ve fiyat
            planlarını satış kanallarındaki
            kayıtlarla güvenli biçimde
            eşleştirin, düzenleyin ve yönetin.
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

        {hasUnsavedChanges && (
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-300 md:flex-row md:items-center">
            <div>
              <p className="font-black">
                {dirtyRows.length} satırda kaydedilmemiş değişiklik var.
              </p>

              <p className="mt-1 text-sm">
                Sayfadan ayrılmadan önce kaydedin veya geri alın.
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={revertAllChanges}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500/15 px-5 font-black"
            >
              <FaUndo />
              Tümünü Geri Al
            </button>
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
                onChange={(event) => {
                  const nextId =
                    event.target.value;

                  if (
                    hasUnsavedChanges &&
                    !window.confirm(
                      "Kaydedilmemiş değişiklikler var. Kanal değiştirilsin ve değişiklikler iptal edilsin mi?"
                    )
                  ) {
                    return;
                  }

                  setConnectionId(nextId);
                }}
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
                  placeholder="Oda tipi, kanal ID veya fiyat planı ara"
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
                Otelin oda tipleri seçilen
                bağlantıya göre getirilecektir.
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
                        selectedConnection
                          .connection_name
                      }
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedHotel?.name ??
                        "Otel"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    {
                      label: "Oda Tipi",
                      value: stats.total,
                    },
                    {
                      label: "Tamamlanan",
                      value:
                        stats.completed,
                    },
                    {
                      label: "Eksik",
                      value: stats.missing,
                    },
                    {
                      label: "Hazırlık",
                      value: `%${stats.percent}`,
                    },
                    {
                      label: "Değişiklik",
                      value:
                        dirtyRows.length,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl bg-slate-950 px-5 py-3 text-center"
                    >
                      <p className="text-xs text-slate-500">
                        {item.label}
                      </p>

                      <p className="mt-1 text-xl font-black">
                        {item.value}
                      </p>
                    </div>
                  ))}
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

            <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <label className="flex items-center gap-3 font-black">
                  <input
                    type="checkbox"
                    checked={
                      visibleRows.length > 0 &&
                      visibleRows.every(
                        (row) =>
                          selectedRoomTypeIds.includes(
                            row.roomTypeId
                          )
                      )
                    }
                    onChange={
                      toggleAllVisibleRows
                    }
                    className="h-5 w-5"
                  />

                  Görünen satırların tümünü seç
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={
                      saving ||
                      selectedRoomTypeIds.length ===
                        0
                    }
                    onClick={() =>
                      void deleteSelectedMappings()
                    }
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500/15 px-5 font-black text-red-400 disabled:opacity-50"
                  >
                    <FaTrash />
                    Seçilenleri Sil (
                    {
                      selectedRoomTypeIds.length
                    }
                    )
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      !hasUnsavedChanges
                    }
                    onClick={
                      revertAllChanges
                    }
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 font-black disabled:opacity-50"
                  >
                    <FaUndo />
                    Tümünü Geri Al
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-5 space-y-5">
              {visibleRows.map(
                (row) => {
                  const rowRatePlans =
                    connectionRatePlans.filter(
                      (ratePlan) =>
                        !ratePlan.room_type_id ||
                        ratePlan.room_type_id ===
                          row.roomTypeId
                    );

                  const dirty =
                    isRowDirty(row);

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

                  const selected =
                    selectedRoomTypeIds.includes(
                      row.roomTypeId
                    );

                  const processing =
                    processingRowId ===
                    row.roomTypeId;

                  return (
                    <article
                      key={row.roomTypeId}
                      className={`rounded-[30px] border p-6 transition ${
                        selected
                          ? "border-orange-400 bg-orange-500/[0.05]"
                          : dirty
                            ? "border-amber-500/30 bg-amber-500/[0.03]"
                            : "border-white/10 bg-slate-900"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleRowSelection(
                                row.roomTypeId
                              )
                            }
                            className="mt-2 h-5 w-5"
                          />

                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-2xl font-black">
                                {row.roomTypeName}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                  complete
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-amber-500/15 text-amber-400"
                                }`}
                              >
                                {complete
                                  ? "Eşleştirme Tamam"
                                  : "Eksik Bilgi"}
                              </span>

                              {dirty && (
                                <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-400">
                                  Kaydedilmedi
                                </span>
                              )}

                              {row.mappingId && (
                                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-black text-violet-400">
                                  Kayıtlı
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                              Toplam {row.totalRooms} fiziksel oda
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={
                              saving ||
                              !dirty
                            }
                            onClick={() =>
                              void saveSingleRow(
                                row
                              )
                            }
                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 font-black disabled:opacity-40"
                          >
                            <FaSave />

                            {processing
                              ? "Kaydediliyor..."
                              : "Satırı Kaydet"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              saving ||
                              !dirty
                            }
                            onClick={() =>
                              cancelRowChanges(
                                row.roomTypeId
                              )
                            }
                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 font-black disabled:opacity-40"
                          >
                            <FaTimes />
                            İptal
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              copyRowSettings(
                                row
                              )
                            }
                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500/15 px-4 font-black text-blue-400 disabled:opacity-40"
                          >
                            <FaCopy />
                            Ayarları Kopyala
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void deleteRowMapping(
                                row
                              )
                            }
                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 font-black text-red-400 disabled:opacity-40"
                          >
                            <FaTrash />
                            {row.mappingId
                              ? "Eşleştirmeyi Sil"
                              : "Satırı Temizle"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            TurOS Fiyat Planı *
                          </span>

                          <select
                            value={
                              row.ratePlanId
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  ratePlanId:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          >
                            <option value="">
                              Fiyat planı seçin
                            </option>

                            {rowRatePlans.map(
                              (ratePlan) => (
                                <option
                                  key={
                                    ratePlan.id
                                  }
                                  value={
                                    ratePlan.id
                                  }
                                >
                                  {
                                    ratePlan.name
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Kanal Oda ID *
                          </span>

                          <input
                            value={
                              row.externalRoomId
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  externalRoomId:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            placeholder="Örn: 54321678"
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Kanal Oda Adı
                          </span>

                          <input
                            value={
                              row.externalRoomName
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  externalRoomName:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            placeholder="Örn: Standard Double Room"
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Kanal Fiyat Planı ID *
                          </span>

                          <input
                            value={
                              row.externalRatePlanId
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  externalRatePlanId:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            placeholder="Örn: 998877"
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Kanal Fiyat Planı Adı
                          </span>

                          <input
                            value={
                              row.externalRatePlanName
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  externalRatePlanName:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            placeholder="Örn: Non Refundable"
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Fiyatlandırma Modeli
                          </span>

                          <select
                            value={
                              row.pricingModel
                            }
                            onChange={(
                              event
                            ) =>
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
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
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
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Doluluk Kodu
                          </span>

                          <input
                            value={
                              row.occupancyCode
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  occupancyCode:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            placeholder="Opsiyonel"
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Para Birimi
                          </span>

                          <select
                            value={
                              row.currency
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  currency:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
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
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Fiyat Artışı / Markup %
                          </span>

                          <input
                            type="number"
                            step="0.01"
                            value={
                              row.markupPercent
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  markupPercent:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-black text-slate-400">
                            Kanal Komisyonu %
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              row.commissionPercent
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  commissionPercent:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                          />
                        </label>

                        <label className="flex min-h-12 items-center gap-3 self-end rounded-xl bg-slate-950 px-4 font-black">
                          <input
                            type="checkbox"
                            checked={
                              row.isActive
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.roomTypeId,
                                {
                                  isActive:
                                    event.target
                                      .checked,
                                }
                              )
                            }
                            className="h-5 w-5"
                          />

                          Eşleştirme aktif
                        </label>
                      </div>
                    </article>
                  );
                }
              )}
            </section>

            {visibleRows.length === 0 && (
              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500">
                Eşleştirilecek oda tipi bulunmuyor.
              </div>
            )}

            <section className="sticky bottom-4 z-20 mt-6 flex flex-col justify-between gap-4 rounded-[26px] border border-orange-500/30 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-xl md:flex-row md:items-center">
              <div>
                <p className="font-black">
                  {stats.completed}/{stats.total} oda tipi tamamlandı
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {hasUnsavedChanges
                    ? `${dirtyRows.length} satırda kaydedilmemiş değişiklik var.`
                    : "Tüm değişiklikler kayıtlı."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    saving ||
                    !hasUnsavedChanges
                  }
                  onClick={revertAllChanges}
                  className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/10 px-7 font-black disabled:opacity-40"
                >
                  <FaUndo />
                  Tümünü Geri Al
                </button>

                <button
                  type="button"
                  disabled={
                    saving ||
                    !hasUnsavedChanges
                  }
                  onClick={() =>
                    void saveAllMappings()
                  }
                  className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-8 font-black disabled:opacity-40"
                >
                  <FaSave />

                  {saving
                    ? "Kaydediliyor..."
                    : `Tümünü Kaydet (${dirtyRows.length})`}
                </button>

                <button
                  type="button"
                  disabled={
                    saving ||
                    hasUnsavedChanges ||
                    validation?.ready !==
                      true
                  }
                  onClick={() =>
                    void startFullSync()
                  }
                  className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 font-black disabled:opacity-40"
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
