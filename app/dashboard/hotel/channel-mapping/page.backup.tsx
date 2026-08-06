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
  FaEdit,
  FaExclamationTriangle,
  FaLink,
  FaPlus,
  FaSearch,
  FaSync,
  FaTimes,
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

const pricingModelLabels = {
  per_room: "Oda Bazlı",
  per_person: "Kişi Bazlı",
  occupancy_based:
    "Doluluk Bazlı",
};

type MappingFormState = {
  connectionId: string;
  roomTypeId: string;
  ratePlanId: string;

  externalRoomId: string;
  externalRoomName: string;

  externalRatePlanId: string;
  externalRatePlanName: string;

  occupancyCode: string;

  pricingModel:
    | "per_room"
    | "per_person"
    | "occupancy_based";

  currency: string;

  markupPercent: string;
  commissionPercent: string;

  isActive: boolean;
};

function emptyForm(): MappingFormState {
  return {
    connectionId: "",
    roomTypeId: "",
    ratePlanId: "",

    externalRoomId: "",
    externalRoomName: "",

    externalRatePlanId: "",
    externalRatePlanName: "",

    occupancyCode: "",

    pricingModel: "per_room",

    currency: "TRY",

    markupPercent: "0",
    commissionPercent: "0",

    isActive: true,
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
  ] = useState<MappingConnection[]>(
    []
  );

  const [roomTypes, setRoomTypes] =
    useState<MappingRoomType[]>([]);

  const [ratePlans, setRatePlans] =
    useState<MappingRatePlan[]>([]);

  const [mappings, setMappings] =
    useState<ChannelRoomMapping[]>(
      []
    );

  const [form, setForm] =
    useState<MappingFormState>(
      emptyForm()
    );

  const [editingId, setEditingId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    connectionFilter,
    setConnectionFilter,
  ] = useState("");

  const [validation, setValidation] =
    useState<MappingValidation | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

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
            form.connectionId
        ) ?? null,
      [
        connections,
        form.connectionId,
      ]
    );

  const availableRoomTypes =
    useMemo(
      () =>
        roomTypes.filter(
          (roomType) =>
            selectedConnection &&
            roomType.hotel_id ===
              selectedConnection.hotel_id &&
            roomType.is_active !== false
        ),
      [
        roomTypes,
        selectedConnection,
      ]
    );

  const availableRatePlans =
    useMemo(
      () =>
        ratePlans.filter(
          (ratePlan) => {
            if (
              !selectedConnection ||
              ratePlan.hotel_id !==
                selectedConnection.hotel_id ||
              ratePlan.is_active === false
            ) {
              return false;
            }

            if (
              !form.roomTypeId
            ) {
              return true;
            }

            return (
              !ratePlan.room_type_id ||
              ratePlan.room_type_id ===
                form.roomTypeId
            );
          }
        ),
      [
        form.roomTypeId,
        ratePlans,
        selectedConnection,
      ]
    );

  const visibleMappings =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      return mappings.filter(
        (mapping) => {
          if (
            connectionFilter &&
            mapping.connection_id !==
              connectionFilter
          ) {
            return false;
          }

          if (!query) return true;

          const roomType =
            firstRelation(
              mapping.room_type
            );

          const ratePlan =
            firstRelation(
              mapping.rate_plan
            );

          const connection =
            firstRelation(
              mapping.connection
            );

          return [
            roomType?.name,
            ratePlan?.name,
            connection?.connection_name,
            mapping.external_room_id,
            mapping.external_room_name,
            mapping.external_rate_plan_id,
            mapping.external_rate_plan_name,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            );
        }
      );
    }, [
      connectionFilter,
      mappings,
      search,
    ]);

  function resetForm() {
    setForm(emptyForm());
    setEditingId("");
  }

  function editMapping(
    mapping: ChannelRoomMapping
  ) {
    setEditingId(mapping.id);

    setForm({
      connectionId:
        mapping.connection_id,

      roomTypeId:
        mapping.room_type_id,

      ratePlanId:
        mapping.rate_plan_id ?? "",

      externalRoomId:
        mapping.external_room_id,

      externalRoomName:
        mapping.external_room_name ??
        "",

      externalRatePlanId:
        mapping.external_rate_plan_id ??
        "",

      externalRatePlanName:
        mapping.external_rate_plan_name ??
        "",

      occupancyCode:
        mapping.occupancy_code ?? "",

      pricingModel:
        mapping.pricing_model,

      currency: mapping.currency,

      markupPercent: String(
        mapping.markup_percent ?? 0
      ),

      commissionPercent: String(
        mapping.commission_percent ??
          0
      ),

      isActive: mapping.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submitMapping(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing
    ) {
      return;
    }

    const connection =
      connections.find(
        (item) =>
          item.id ===
          form.connectionId
      );

    if (!connection) {
      setErrorMessage(
        "Kanal bağlantısı seçilmelidir."
      );

      return;
    }

    if (!form.roomTypeId) {
      setErrorMessage(
        "TurOS oda tipi seçilmelidir."
      );

      return;
    }

    if (
      !form.externalRoomId.trim()
    ) {
      setErrorMessage(
        "Kanal oda tipi ID bilgisi girilmelidir."
      );

      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      if (editingId) {
        await updateChannelMapping({
          companyId:
            membership.company_id,

          mappingId: editingId,

          ratePlanId:
            form.ratePlanId || null,

          externalRoomId:
            form.externalRoomId.trim(),

          externalRoomName:
            form.externalRoomName.trim() ||
            null,

          externalRatePlanId:
            form.externalRatePlanId.trim() ||
            null,

          externalRatePlanName:
            form.externalRatePlanName.trim() ||
            null,

          occupancyCode:
            form.occupancyCode.trim() ||
            null,

          pricingModel:
            form.pricingModel,

          currency: form.currency,

          markupPercent:
            Number(
              form.markupPercent
            ) || 0,

          commissionPercent:
            Number(
              form.commissionPercent
            ) || 0,

          isActive:
            form.isActive,
        });
      } else {
        await createChannelMapping({
          companyId:
            membership.company_id,

          hotelId:
            connection.hotel_id,

          connectionId:
            connection.id,

          roomTypeId:
            form.roomTypeId,

          ratePlanId:
            form.ratePlanId || null,

          externalRoomId:
            form.externalRoomId.trim(),

          externalRoomName:
            form.externalRoomName.trim() ||
            null,

          externalRatePlanId:
            form.externalRatePlanId.trim() ||
            null,

          externalRatePlanName:
            form.externalRatePlanName.trim() ||
            null,

          occupancyCode:
            form.occupancyCode.trim() ||
            null,

          pricingModel:
            form.pricingModel,

          currency: form.currency,

          markupPercent:
            Number(
              form.markupPercent
            ) || 0,

          commissionPercent:
            Number(
              form.commissionPercent
            ) || 0,
        });
      }

      const wasEditing =
        Boolean(editingId);

      resetForm();

      await refresh();

      setSuccessMessage(
        wasEditing
          ? "Kanal eşleştirmesi güncellendi."
          : "Kanal eşleştirmesi oluşturuldu."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Eşleştirme kaydedilemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function removeMapping(
    mapping: ChannelRoomMapping
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        "Bu kanal eşleştirmesi kalıcı olarak silinsin mi?"
      )
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");
    setValidation(null);

    try {
      await deleteChannelMapping(
        membership.company_id,
        mapping.id
      );

      if (editingId === mapping.id) {
        resetForm();
      }

      await refresh();

      setSuccessMessage(
        "Kanal eşleştirmesi silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Eşleştirme silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function runValidation(
    connectionId: string
  ) {
    if (
      !membership ||
      !connectionId ||
      processing
    ) {
      return;
    }

    setProcessing(true);
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
          : "Kanal eşleştirmesi doğrulanamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function startFullSync(
    connectionId: string
  ) {
    if (
      !membership ||
      !connectionId ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await enqueueValidatedFullSync(
        membership.company_id,
        connectionId
      );

      setSuccessMessage(
        "Doğrulanmış tam senkronizasyon kuyruğa eklendi."
      );

      const result =
        await validateChannelMapping(
          membership.company_id,
          connectionId
        );

      setValidation(result);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tam senkronizasyon başlatılamadı."
      );
    } finally {
      setProcessing(false);
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
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS HOTEL PMS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Kanal Eşleştirmeleri
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              TurOS oda tiplerini ve fiyat
              planlarını dış satış
              kanallarındaki kayıtlarla
              eşleştirin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={connectionFilter}
              onChange={(event) => {
                setConnectionFilter(
                  event.target.value
                );

                setValidation(null);
              }}
              className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950"
            >
              <option value="">
                Tüm bağlantılar
              </option>

              {connections.map(
                (connection) => (
                  <option
                    key={connection.id}
                    value={connection.id}
                  >
                    {
                      connection.connection_name
                    }
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              disabled={
                processing ||
                !connectionFilter
              }
              onClick={() =>
                void runValidation(
                  connectionFilter
                )
              }
              className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 font-black disabled:opacity-50"
            >
              <FaCheckCircle />
              Eşleştirmeleri Kontrol Et
            </button>

            <button
              type="button"
              disabled={
                processing ||
                !connectionFilter ||
                validation?.ready !==
                  true
              }
              onClick={() =>
                void startFullSync(
                  connectionFilter
                )
              }
              className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-black disabled:opacity-50"
            >
              <FaCloudUploadAlt />
              Tam Senkron Başlat
            </button>
          </div>
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

        {validation && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Hazır",
                value: validation.ready
                  ? "EVET"
                  : "HAYIR",
              },
              {
                label:
                  "Toplam Oda Tipi",
                value:
                  validation.total_room_types,
              },
              {
                label:
                  "Aktif Eşleştirme",
                value:
                  validation.active_mappings,
              },
              {
                label:
                  "Eksik Oda Tipi",
                value:
                  validation.missing_room_types,
              },
              {
                label:
                  "Eksik Fiyat Planı",
                value:
                  validation.missing_rate_plans,
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-xs text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {item.value}
                </p>
              </article>
            ))}
          </section>
        )}

        {connections.length === 0 && (
          <div className="mt-8 rounded-[30px] border border-amber-500/20 bg-amber-500/10 p-6 text-amber-300">
            <p className="text-lg font-black">
              Henüz kanal bağlantısı bulunmuyor.
            </p>

            <p className="mt-2 text-sm">
              Önce Channel Manager ekranından Booking.com, Expedia veya başka bir kanal bağlantısı oluşturmalısınız.
            </p>

            <a
              href="/dashboard/hotel/channel-manager"
              className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-orange-500 px-5 font-black text-white"
            >
              Channel Manager’a Git
            </a>
          </div>
        )}

        <form
          onSubmit={submitMapping}
          className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-3 text-2xl font-black">
              <FaPlus className="text-orange-400" />

              {editingId
                ? "Eşleştirmeyi Düzenle"
                : "Yeni Kanal Eşleştirmesi"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select
              required
              disabled={Boolean(editingId)}
              value={
                form.connectionId
              }
              onChange={(event) => {
                const connectionId =
                  event.target.value;

                setForm(
                  (current) => ({
                    ...current,
                    connectionId,
                    roomTypeId: "",
                    ratePlanId: "",
                  })
                );

                setValidation(null);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950 disabled:opacity-60"
            >
              <option value="">
                Kanal bağlantısı
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

            <select
              required
              disabled={
                !selectedConnection ||
                Boolean(editingId)
              }
              value={form.roomTypeId}
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    roomTypeId:
                      event.target.value,
                    ratePlanId: "",
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950 disabled:opacity-60"
            >
              <option value="">
                TurOS oda tipi
              </option>

              {availableRoomTypes.map(
                (roomType) => (
                  <option
                    key={roomType.id}
                    value={roomType.id}
                  >
                    {roomType.name}
                    {" · "}
                    {roomType.total_rooms ??
                      0}{" "}
                    oda
                  </option>
                )
              )}
            </select>

            <select
              value={form.ratePlanId}
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    ratePlanId:
                      event.target.value,
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                TurOS fiyat planı
              </option>

              {availableRatePlans.map(
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

            <select
              value={
                form.pricingModel
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    pricingModel:
                      event.target
                        .value as
                        MappingFormState["pricingModel"],
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              {Object.entries(
                pricingModelLabels
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
                form.externalRoomId
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    externalRoomId:
                      event.target.value,
                  })
                )
              }
              placeholder="Kanal oda tipi ID"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={
                form.externalRoomName
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    externalRoomName:
                      event.target.value,
                  })
                )
              }
              placeholder="Kanal oda tipi adı"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={
                form.externalRatePlanId
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    externalRatePlanId:
                      event.target.value,
                  })
                )
              }
              placeholder="Kanal fiyat planı ID"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={
                form.externalRatePlanName
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    externalRatePlanName:
                      event.target.value,
                  })
                )
              }
              placeholder="Kanal fiyat planı adı"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={
                form.occupancyCode
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    occupancyCode:
                      event.target.value,
                  })
                )
              }
              placeholder="Doluluk kodu"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <select
              value={form.currency}
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    currency:
                      event.target.value,
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
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

            <input
              type="number"
              step="0.01"
              value={
                form.markupPercent
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    markupPercent:
                      event.target.value,
                  })
                )
              }
              placeholder="Fiyat artışı %"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.commissionPercent
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    commissionPercent:
                      event.target.value,
                  })
                )
              }
              placeholder="Komisyon %"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />
          </div>

          {editingId && (
            <label className="mt-5 flex items-center gap-3 font-black">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      isActive:
                        event.target
                          .checked,
                    })
                  )
                }
                className="h-5 w-5"
              />

              Eşleştirme aktif
            </label>
          )}

          <button
            type="submit"
            disabled={processing}
            className="mt-6 min-h-14 w-full rounded-2xl bg-orange-500 font-black disabled:opacity-50"
          >
            {processing
              ? "İşleniyor..."
              : editingId
                ? "Eşleştirmeyi Güncelle"
                : "Eşleştirmeyi Kaydet"}
          </button>
        </form>

        <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4">
            <FaSearch className="text-orange-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Oda tipi, fiyat planı veya kanal ID ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleMappings.map(
            (mapping) => {
              const roomType =
                firstRelation(
                  mapping.room_type
                );

              const ratePlan =
                firstRelation(
                  mapping.rate_plan
                );

              const connection =
                firstRelation(
                  mapping.connection
                );

              return (
                <article
                  key={mapping.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                        {connection
                          ? channelLabels[
                              connection
                                .channel_code
                            ]
                          : "Kanal"}
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        {roomType?.name ??
                          "Oda tipi"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        {
                          connection?.connection_name
                        }
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${
                        mapping.is_active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-500/15 text-slate-400"
                      }`}
                    >
                      {mapping.is_active
                        ? "Aktif"
                        : "Pasif"}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 rounded-2xl bg-slate-950 p-4 text-sm">
                    <div>
                      <p className="text-slate-500">
                        Kanal Oda ID
                      </p>

                      <p className="mt-1 font-black">
                        {
                          mapping.external_room_id
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        TurOS Fiyat Planı
                      </p>

                      <p className="mt-1 font-black">
                        {ratePlan?.name ??
                          "Seçilmedi"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Kanal Fiyat Planı
                      </p>

                      <p className="mt-1 font-black">
                        {
                          mapping.external_rate_plan_id ??
                          "Eksik"
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Fiyatlandırma
                      </p>

                      <p className="mt-1 font-black">
                        {
                          pricingModelLabels[
                            mapping.pricing_model
                          ]
                        }
                        {" · "}
                        {mapping.currency}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Artış / Komisyon
                      </p>

                      <p className="mt-1 font-black">
                        %
                        {
                          mapping.markup_percent
                        }
                        {" / %"}
                        {
                          mapping.commission_percent
                        }
                      </p>
                    </div>
                  </div>

                  {mapping.last_error_message && (
                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
                      {
                        mapping.last_error_message
                      }
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        editMapping(mapping)
                      }
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                    >
                      <FaEdit />
                      Düzenle
                    </button>

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void removeMapping(
                          mapping
                        )
                      }
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400"
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

        {visibleMappings.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500">
            Henüz kanal oda tipi
            eşleştirmesi bulunmuyor.
          </div>
        )}
      </div>
    </main>
  );
}
