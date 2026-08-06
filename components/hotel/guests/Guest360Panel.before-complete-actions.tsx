"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBell,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaFileAlt,
  FaHistory,
  FaHotel,
  FaPlus,
  FaSave,
  FaShieldAlt,
  FaStar,
  FaTimes,
  FaTrash,
  FaUtensils,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  createGuestDocument,
  createGuestNote,
  deleteGuestDocument,
  deleteGuestNote,
  getGuest360Data,
  GuestActivity,
  GuestDocument,
  GuestDocumentStatus,
  GuestDocumentType,
  GuestNote,
  GuestNotePriority,
  GuestNoteType,
  GuestNoteVisibility,
  GuestPreference,
  saveGuestPreference,
} from "@/lib/hotel/guests/guest-360-service";

type PanelTab =
  | "preferences"
  | "notes"
  | "documents"
  | "activities";

type Props = {
  companyId: string;
  guestId: string;
};

function formatDateTime(
  value: string
): string {
  return new Date(value)
    .toLocaleString("tr-TR");
}

function formatDate(
  value: string | null
): string {
  if (!value) return "Belirtilmedi";

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("tr-TR");
}

const noteTypeLabels: Record<
  GuestNoteType,
  string
> = {
  general: "Genel",
  front_office: "Ön Büro",
  housekeeping: "Housekeeping",
  sales: "Satış",
  finance: "Finans",
  security: "Güvenlik",
  complaint: "Şikâyet",
  special_request: "Özel İstek",
};

const priorityLabels: Record<
  GuestNotePriority,
  string
> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

const documentLabels: Record<
  GuestDocumentType,
  string
> = {
  tc_identity: "TC Kimlik",
  passport: "Pasaport",
  foreign_identity:
    "Yabancı Kimlik",
  kvkk_form: "KVKK Formu",
  registration_card:
    "Konaklama Belgesi",
  signature_form: "İmza Formu",
  visa: "Vize",
  driving_license:
    "Sürücü Belgesi",
  other: "Diğer",
};

function priorityClass(
  priority: GuestNotePriority
): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/15 text-red-400";

    case "high":
      return "bg-orange-500/15 text-orange-400";

    case "low":
      return "bg-slate-500/15 text-slate-400";

    default:
      return "bg-blue-500/15 text-blue-400";
  }
}

function documentStatusClass(
  status: GuestDocumentStatus
): string {
  switch (status) {
    case "verified":
      return "bg-emerald-500/15 text-emerald-400";

    case "rejected":
      return "bg-red-500/15 text-red-400";

    case "expired":
      return "bg-orange-500/15 text-orange-400";

    default:
      return "bg-amber-500/15 text-amber-400";
  }
}

export default function Guest360Panel({
  companyId,
  guestId,
}: Props) {
  const [tab, setTab] =
    useState<PanelTab>("preferences");

  const [notes, setNotes] =
    useState<GuestNote[]>([]);

  const [preference, setPreference] =
    useState<GuestPreference | null>(
      null
    );

  const [documents, setDocuments] =
    useState<GuestDocument[]>([]);

  const [activities, setActivities] =
    useState<GuestActivity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showNoteForm, setShowNoteForm] =
    useState(false);

  const [
    showDocumentForm,
    setShowDocumentForm,
  ] = useState(false);

  const [noteForm, setNoteForm] =
    useState({
      noteType:
        "general" as GuestNoteType,
      priority:
        "normal" as GuestNotePriority,
      visibility:
        "all_staff" as GuestNoteVisibility,
      title: "",
      content: "",
      isPinned: false,
    });

  const [
    documentForm,
    setDocumentForm,
  ] = useState({
    documentType:
      "tc_identity" as
        GuestDocumentType,
    documentName: "",
    documentNumber: "",
    issuedCountry: "Türkiye",
    issuedAt: "",
    expiresAt: "",
    verificationStatus:
      "pending" as
        GuestDocumentStatus,
    notes: "",
  });

  const [preferenceForm, setPreferenceForm] =
    useState({
      roomLocation: "",
      floorPreference: "",
      bedPreference: "",
      viewPreference: "",
      smokingPreference: "",
      pillowPreference: "",
      temperaturePreference: "",
      mealPreference: "",
      allergies: "",
      accessibilityNeeds: "",
      arrivalPreference: "",
      communicationChannel: "",
      specialOccasion: "",
      additionalPreferences: "",
    });

  const loadData = useCallback(
    async () => {
      const data =
        await getGuest360Data(
          companyId,
          guestId
        );

      setNotes(data.notes);
      setPreference(data.preference);
      setDocuments(data.documents);
      setActivities(data.activities);

      setPreferenceForm({
        roomLocation:
          data.preference?.room_location ??
          "",

        floorPreference:
          data.preference
            ?.floor_preference ?? "",

        bedPreference:
          data.preference
            ?.bed_preference ?? "",

        viewPreference:
          data.preference
            ?.view_preference ?? "",

        smokingPreference:
          data.preference
            ?.smoking_preference ?? "",

        pillowPreference:
          data.preference
            ?.pillow_preference ?? "",

        temperaturePreference:
          data.preference
            ?.temperature_preference ??
          "",

        mealPreference:
          data.preference
            ?.meal_preference ?? "",

        allergies:
          data.preference?.allergies ??
          "",

        accessibilityNeeds:
          data.preference
            ?.accessibility_needs ?? "",

        arrivalPreference:
          data.preference
            ?.arrival_preference ?? "",

        communicationChannel:
          data.preference
            ?.communication_channel ?? "",

        specialOccasion:
          data.preference
            ?.special_occasion ?? "",

        additionalPreferences:
          data.preference
            ?.additional_preferences ??
          "",
      });
    },
    [companyId, guestId]
  );

  useEffect(() => {
    async function initialize() {
      setLoading(true);

      try {
        await loadData();
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Misafir 360 verileri yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const pinnedNotes = useMemo(
    () =>
      notes.filter(
        (note) => note.is_pinned
      ),
    [notes]
  );

  async function savePreferences(
    event: FormEvent
  ) {
    event.preventDefault();

    if (processing) return;

    setProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      await saveGuestPreference({
        companyId,
        guestId,

        roomLocation:
          preferenceForm.roomLocation
            .trim() || null,

        floorPreference:
          preferenceForm.floorPreference
            .trim() || null,

        bedPreference:
          preferenceForm.bedPreference
            .trim() || null,

        viewPreference:
          preferenceForm.viewPreference
            .trim() || null,

        smokingPreference:
          preferenceForm.smokingPreference
            .trim() || null,

        pillowPreference:
          preferenceForm.pillowPreference
            .trim() || null,

        temperaturePreference:
          preferenceForm.temperaturePreference
            .trim() || null,

        mealPreference:
          preferenceForm.mealPreference
            .trim() || null,

        allergies:
          preferenceForm.allergies
            .trim() || null,

        accessibilityNeeds:
          preferenceForm.accessibilityNeeds
            .trim() || null,

        arrivalPreference:
          preferenceForm.arrivalPreference
            .trim() || null,

        communicationChannel:
          preferenceForm.communicationChannel
            .trim() || null,

        specialOccasion:
          preferenceForm.specialOccasion
            .trim() || null,

        additionalPreferences:
          preferenceForm.additionalPreferences
            .trim() || null,
      });

      await loadData();

      setMessage(
        "Misafir tercihleri kaydedildi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tercihler kaydedilemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function submitNote(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      processing ||
      !noteForm.title.trim() ||
      !noteForm.content.trim()
    ) {
      return;
    }

    setProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await createGuestNote({
        companyId,
        guestId,
        noteType:
          noteForm.noteType,
        priority:
          noteForm.priority,
        visibility:
          noteForm.visibility,
        title:
          noteForm.title.trim(),
        content:
          noteForm.content.trim(),
        isPinned:
          noteForm.isPinned,
        userId:
          user?.id ?? null,
      });

      setNoteForm({
        noteType: "general",
        priority: "normal",
        visibility: "all_staff",
        title: "",
        content: "",
        isPinned: false,
      });

      setShowNoteForm(false);

      await loadData();

      setMessage(
        "Misafir notu eklendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Not eklenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function removeNote(
    note: GuestNote
  ) {
    if (
      processing ||
      !window.confirm(
        `"${note.title}" notu silinsin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await deleteGuestNote(
        companyId,
        note.id
      );

      await loadData();

      setMessage("Not silindi.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Not silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function submitDocument(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      processing ||
      !documentForm.documentName.trim()
    ) {
      return;
    }

    setProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await createGuestDocument({
        companyId,
        guestId,

        documentType:
          documentForm.documentType,

        documentName:
          documentForm.documentName
            .trim(),

        documentNumber:
          documentForm.documentNumber
            .trim() || null,

        issuedCountry:
          documentForm.issuedCountry
            .trim() || null,

        issuedAt:
          documentForm.issuedAt ||
          null,

        expiresAt:
          documentForm.expiresAt ||
          null,

        verificationStatus:
          documentForm
            .verificationStatus,

        notes:
          documentForm.notes.trim() ||
          null,

        userId:
          user?.id ?? null,
      });

      setDocumentForm({
        documentType: "tc_identity",
        documentName: "",
        documentNumber: "",
        issuedCountry: "Türkiye",
        issuedAt: "",
        expiresAt: "",
        verificationStatus: "pending",
        notes: "",
      });

      setShowDocumentForm(false);

      await loadData();

      setMessage(
        "Misafir belgesi eklendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Belge eklenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function removeDocument(
    document: GuestDocument
  ) {
    if (
      processing ||
      !window.confirm(
        `"${document.document_name}" belgesi silinsin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await deleteGuestDocument(
        companyId,
        document.id
      );

      await loadData();

      setMessage("Belge silindi.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Belge silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-slate-950 p-8 text-slate-400">
        Misafir 360 verileri yükleniyor...
      </div>
    );
  }

  return (
    <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-6">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
            MİSAFİR 360°
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Tercihler, Notlar, Belgeler ve Aktivite
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Misafirin operasyonel ve kişiselleştirilmiş tüm detaylarını yönetin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            {
              value: "preferences",
              label: "Tercihler",
              icon: FaStar,
            },
            {
              value: "notes",
              label: `Notlar (${notes.length})`,
              icon: FaClipboardList,
            },
            {
              value: "documents",
              label: `Belgeler (${documents.length})`,
              icon: FaFileAlt,
            },
            {
              value: "activities",
              label: "Aktivite",
              icon: FaHistory,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setTab(
                    item.value as PanelTab
                  )
                }
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 font-black ${
                  tab === item.value
                    ? "bg-orange-500 text-white"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
          {message}
        </div>
      )}

      {pinnedNotes.length > 0 && (
        <div className="mt-5 space-y-3">
          {pinnedNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4"
            >
              <p className="flex items-center gap-2 font-black text-orange-300">
                <FaBell />
                {note.title}
              </p>

              <p className="mt-2 text-sm text-orange-100/70">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "preferences" && (
        <form
          onSubmit={savePreferences}
          className="mt-6"
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="mb-2 block text-sm font-black">
                Oda Konumu
              </span>

              <select
                value={
                  preferenceForm.roomLocation
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      roomLocation:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Tercih yok
                </option>
                <option value="quiet">
                  Sessiz bölüm
                </option>
                <option value="near_elevator">
                  Asansöre yakın
                </option>
                <option value="far_elevator">
                  Asansörden uzak
                </option>
                <option value="near_lobby">
                  Lobiye yakın
                </option>
                <option value="corner">
                  Köşe oda
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Kat Tercihi
              </span>

              <select
                value={
                  preferenceForm.floorPreference
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      floorPreference:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Tercih yok
                </option>
                <option value="low">
                  Alt kat
                </option>
                <option value="middle">
                  Orta kat
                </option>
                <option value="high">
                  Üst kat
                </option>
                <option value="ground">
                  Zemin kat
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Yatak Tercihi
              </span>

              <select
                value={
                  preferenceForm.bedPreference
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      bedPreference:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Tercih yok
                </option>
                <option value="double">
                  Çift kişilik yatak
                </option>
                <option value="twin">
                  İki ayrı yatak
                </option>
                <option value="king">
                  King yatak
                </option>
                <option value="extra_bed">
                  İlave yatak
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Manzara Tercihi
              </span>

              <select
                value={
                  preferenceForm.viewPreference
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      viewPreference:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Tercih yok
                </option>
                <option value="sea">
                  Deniz
                </option>
                <option value="pool">
                  Havuz
                </option>
                <option value="garden">
                  Bahçe
                </option>
                <option value="mountain">
                  Dağ
                </option>
                <option value="city">
                  Şehir
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Sigara Tercihi
              </span>

              <select
                value={
                  preferenceForm.smokingPreference
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      smokingPreference:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Belirtilmedi
                </option>
                <option value="non_smoking">
                  Sigara içilmeyen
                </option>
                <option value="smoking">
                  Sigara içilebilir
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Yastık Tercihi
              </span>

              <select
                value={
                  preferenceForm.pillowPreference
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      pillowPreference:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Tercih yok
                </option>
                <option value="soft">
                  Yumuşak
                </option>
                <option value="firm">
                  Sert
                </option>
                <option value="orthopedic">
                  Ortopedik
                </option>
                <option value="extra">
                  İlave yastık
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Oda Sıcaklığı
              </span>

              <input
                value={
                  preferenceForm.temperaturePreference
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      temperaturePreference:
                        event.target.value,
                    })
                  )
                }
                placeholder="Örn: 22°C"
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                İletişim Kanalı
              </span>

              <select
                value={
                  preferenceForm.communicationChannel
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      communicationChannel:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Tercih yok
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
                <option value="sms">
                  SMS
                </option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-black">
                Yemek Tercihi
              </span>

              <textarea
                rows={3}
                value={
                  preferenceForm.mealPreference
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      mealPreference:
                        event.target.value,
                    })
                  )
                }
                placeholder="Vejetaryen, vegan, glütensiz, helal vb."
                className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-red-300">
                Alerjiler
              </span>

              <textarea
                rows={3}
                value={
                  preferenceForm.allergies
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      allergies:
                        event.target.value,
                    })
                  )
                }
                placeholder="Gıda, ilaç veya diğer alerjiler"
                className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Erişilebilirlik İhtiyaçları
              </span>

              <textarea
                rows={3}
                value={
                  preferenceForm.accessibilityNeeds
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      accessibilityNeeds:
                        event.target.value,
                    })
                  )
                }
                placeholder="Tekerlekli sandalye, asansör, duş desteği vb."
                className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">
                Özel Gün
              </span>

              <textarea
                rows={3}
                value={
                  preferenceForm.specialOccasion
                }
                onChange={(event) =>
                  setPreferenceForm(
                    (current) => ({
                      ...current,
                      specialOccasion:
                        event.target.value,
                    })
                  )
                }
                placeholder="Balayı, yıl dönümü, doğum günü vb."
                className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-black">
              Ek Tercihler ve Operasyon Bilgisi
            </span>

            <textarea
              rows={4}
              value={
                preferenceForm.additionalPreferences
              }
              onChange={(event) =>
                setPreferenceForm(
                  (current) => ({
                    ...current,
                    additionalPreferences:
                      event.target.value,
                  })
                )
              }
              placeholder="Minibar, transfer, temizlik saati, karşılama veya diğer tercihler"
              className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
            />
          </label>

          <button
            type="submit"
            disabled={processing}
            className="mt-6 flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 font-black disabled:opacity-50"
          >
            <FaSave />
            Tercihleri Kaydet
          </button>
        </form>
      )}

      {tab === "notes" && (
        <div className="mt-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                setShowNoteForm(true)
              }
              className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 font-black"
            >
              <FaPlus />
              Yeni Not
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {notes.map((note) => (
              <article
                key={note.id}
                className="rounded-2xl border border-white/10 bg-slate-950 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${priorityClass(
                          note.priority
                        )}`}
                      >
                        {
                          priorityLabels[
                            note.priority
                          ]
                        }
                      </span>

                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-slate-400">
                        {
                          noteTypeLabels[
                            note.note_type
                          ]
                        }
                      </span>

                      {note.is_pinned && (
                        <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-black text-orange-400">
                          Sabitlendi
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-lg font-black">
                      {note.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void removeNote(note)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                  >
                    <FaTrash />
                  </button>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {note.content}
                </p>

                <p className="mt-4 text-xs text-slate-600">
                  {formatDateTime(
                    note.created_at
                  )}
                </p>
              </article>
            ))}

            {notes.length === 0 && (
              <div className="rounded-2xl bg-slate-950 p-10 text-center text-slate-500 lg:col-span-2">
                Kayıtlı misafir notu bulunmuyor.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="mt-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                setShowDocumentForm(true)
              }
              className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 font-black"
            >
              <FaPlus />
              Belge Ekle
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map(
              (document) => (
                <article
                  key={document.id}
                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <FaFileAlt className="text-2xl text-orange-400" />

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void removeDocument(
                          document
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <h3 className="mt-4 text-lg font-black">
                    {
                      document.document_name
                    }
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      documentLabels[
                        document.document_type
                      ]
                    }
                  </p>

                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      <span className="text-slate-500">
                        Numara:
                      </span>{" "}
                      {document.document_number ||
                        "Belirtilmedi"}
                    </p>

                    <p>
                      <span className="text-slate-500">
                        Düzenlenme:
                      </span>{" "}
                      {formatDate(
                        document.issued_at
                      )}
                    </p>

                    <p>
                      <span className="text-slate-500">
                        Geçerlilik:
                      </span>{" "}
                      {formatDate(
                        document.expires_at
                      )}
                    </p>
                  </div>

                  <span
                    className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${documentStatusClass(
                      document.verification_status
                    )}`}
                  >
                    {
                      document.verification_status
                    }
                  </span>
                </article>
              )
            )}

            {documents.length === 0 && (
              <div className="rounded-2xl bg-slate-950 p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">
                Kayıtlı misafir belgesi bulunmuyor.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "activities" && (
        <div className="mt-6 space-y-3">
          {activities.map(
            (activity) => (
              <article
                key={activity.id}
                className="flex gap-4 rounded-2xl bg-slate-950 p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                  <FaHistory />
                </div>

                <div>
                  <p className="font-black">
                    {activity.title}
                  </p>

                  {activity.description && (
                    <p className="mt-1 text-sm text-slate-500">
                      {
                        activity.description
                      }
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-600">
                    {formatDateTime(
                      activity.created_at
                    )}
                  </p>
                </div>
              </article>
            )
          )}

          {activities.length === 0 && (
            <div className="rounded-2xl bg-slate-950 p-10 text-center text-slate-500">
              Aktivite kaydı bulunmuyor.
            </div>
          )}
        </div>
      )}

      {showNoteForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitNote}
            className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-950 p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  MİSAFİR NOTU
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Yeni Operasyon Notu
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNoteForm(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <select
                value={noteForm.noteType}
                onChange={(event) =>
                  setNoteForm(
                    (current) => ({
                      ...current,
                      noteType:
                        event.target
                          .value as
                          GuestNoteType,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  noteTypeLabels
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

              <select
                value={noteForm.priority}
                onChange={(event) =>
                  setNoteForm(
                    (current) => ({
                      ...current,
                      priority:
                        event.target
                          .value as
                          GuestNotePriority,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  priorityLabels
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

              <select
                value={
                  noteForm.visibility
                }
                onChange={(event) =>
                  setNoteForm(
                    (current) => ({
                      ...current,
                      visibility:
                        event.target
                          .value as
                          GuestNoteVisibility,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="all_staff">
                  Tüm Personel
                </option>
                <option value="management">
                  Sadece Yönetim
                </option>
                <option value="front_office">
                  Ön Büro
                </option>
                <option value="finance">
                  Finans
                </option>
              </select>
            </div>

            <input
              required
              value={noteForm.title}
              onChange={(event) =>
                setNoteForm(
                  (current) => ({
                    ...current,
                    title:
                      event.target.value,
                  })
                )
              }
              placeholder="Not başlığı"
              className="mt-4 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <textarea
              required
              rows={5}
              value={noteForm.content}
              onChange={(event) =>
                setNoteForm(
                  (current) => ({
                    ...current,
                    content:
                      event.target.value,
                  })
                )
              }
              placeholder="Operasyon notunu ayrıntılı yazın"
              className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
            />

            <label className="mt-4 flex items-center gap-3 font-black">
              <input
                type="checkbox"
                checked={
                  noteForm.isPinned
                }
                onChange={(event) =>
                  setNoteForm(
                    (current) => ({
                      ...current,
                      isPinned:
                        event.target.checked,
                    })
                  )
                }
                className="h-5 w-5"
              />

              Profilin üst kısmında sabitle
            </label>

            <button
              type="submit"
              disabled={processing}
              className="mt-6 min-h-13 w-full rounded-xl bg-orange-500 font-black disabled:opacity-50"
            >
              Notu Kaydet
            </button>
          </form>
        </div>
      )}

      {showDocumentForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitDocument}
            className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-slate-950 p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  MİSAFİR BELGESİ
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Yeni Belge Kaydı
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDocumentForm(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-black">
                  Belge Türü
                </span>

                <select
                  value={
                    documentForm.documentType
                  }
                  onChange={(event) =>
                    setDocumentForm(
                      (current) => ({
                        ...current,
                        documentType:
                          event.target
                            .value as
                            GuestDocumentType,
                      })
                    )
                  }
                  className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                >
                  {Object.entries(
                    documentLabels
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
              </label>

              <label>
                <span className="mb-2 block text-sm font-black">
                  Belge Adı *
                </span>

                <input
                  required
                  value={
                    documentForm.documentName
                  }
                  onChange={(event) =>
                    setDocumentForm(
                      (current) => ({
                        ...current,
                        documentName:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Örn: Ahmet Yılmaz Pasaportu"
                  className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black">
                  Belge Numarası
                </span>

                <input
                  value={
                    documentForm.documentNumber
                  }
                  onChange={(event) =>
                    setDocumentForm(
                      (current) => ({
                        ...current,
                        documentNumber:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Kimlik veya belge numarası"
                  className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black">
                  Düzenleyen Ülke
                </span>

                <input
                  value={
                    documentForm.issuedCountry
                  }
                  onChange={(event) =>
                    setDocumentForm(
                      (current) => ({
                        ...current,
                        issuedCountry:
                          event.target.value,
                      })
                    )
                  }
                  className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black">
                  Düzenlenme Tarihi
                </span>

                <input
                  type="date"
                  value={
                    documentForm.issuedAt
                  }
                  onChange={(event) =>
                    setDocumentForm(
                      (current) => ({
                        ...current,
                        issuedAt:
                          event.target.value,
                      })
                    )
                  }
                  className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black">
                  Son Geçerlilik Tarihi
                </span>

                <input
                  type="date"
                  value={
                    documentForm.expiresAt
                  }
                  onChange={(event) =>
                    setDocumentForm(
                      (current) => ({
                        ...current,
                        expiresAt:
                          event.target.value,
                      })
                    )
                  }
                  className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black">
                  Doğrulama Durumu
                </span>

                <select
                  value={
                    documentForm.verificationStatus
                  }
                  onChange={(event) =>
                    setDocumentForm(
                      (current) => ({
                        ...current,
                        verificationStatus:
                          event.target
                            .value as
                            GuestDocumentStatus,
                      })
                    )
                  }
                  className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                >
                  <option value="pending">
                    Kontrol Bekliyor
                  </option>
                  <option value="verified">
                    Doğrulandı
                  </option>
                  <option value="rejected">
                    Reddedildi
                  </option>
                  <option value="expired">
                    Süresi Dolmuş
                  </option>
                </select>
              </label>
            </div>

            <textarea
              rows={3}
              value={documentForm.notes}
              onChange={(event) =>
                setDocumentForm(
                  (current) => ({
                    ...current,
                    notes:
                      event.target.value,
                  })
                )
              }
              placeholder="Belge ile ilgili açıklamalar"
              className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
            />

            <button
              type="submit"
              disabled={processing}
              className="mt-6 min-h-13 w-full rounded-xl bg-orange-500 font-black disabled:opacity-50"
            >
              Belgeyi Kaydet
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
