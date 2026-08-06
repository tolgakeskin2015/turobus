import { supabase } from "@/lib/supabase";

export type GuestNoteType =
  | "general"
  | "front_office"
  | "housekeeping"
  | "sales"
  | "finance"
  | "security"
  | "complaint"
  | "special_request";

export type GuestNotePriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type GuestNoteVisibility =
  | "all_staff"
  | "management"
  | "front_office"
  | "finance";

export type GuestNote = {
  id: string;
  company_id: string;
  guest_id: string;
  note_type: GuestNoteType;
  priority: GuestNotePriority;
  visibility: GuestNoteVisibility;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type GuestPreference = {
  id: string;
  company_id: string;
  guest_id: string;
  room_location: string | null;
  floor_preference: string | null;
  bed_preference: string | null;
  view_preference: string | null;
  smoking_preference: string | null;
  pillow_preference: string | null;
  temperature_preference: string | null;
  meal_preference: string | null;
  allergies: string | null;
  accessibility_needs: string | null;
  arrival_preference: string | null;
  communication_channel: string | null;
  special_occasion: string | null;
  additional_preferences: string | null;
};

export type GuestDocumentType =
  | "tc_identity"
  | "passport"
  | "foreign_identity"
  | "kvkk_form"
  | "registration_card"
  | "signature_form"
  | "visa"
  | "driving_license"
  | "other";

export type GuestDocumentStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

export type GuestDocument = {
  id: string;
  company_id: string;
  guest_id: string;
  document_type: GuestDocumentType;
  document_name: string;
  document_number: string | null;
  issued_country: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  verification_status: GuestDocumentStatus;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
};

export type GuestActivity = {
  id: string;
  company_id: string;
  guest_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function message(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ?? "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export async function getGuest360Data(
  companyId: string,
  guestId: string
): Promise<{
  notes: GuestNote[];
  preference: GuestPreference | null;
  documents: GuestDocument[];
  activities: GuestActivity[];
}> {
  const [
    notesResult,
    preferenceResult,
    documentsResult,
    activitiesResult,
  ] = await Promise.all([
    supabase
      .from("hotel_guest_notes")
      .select("*")
      .eq("company_id", companyId)
      .eq("guest_id", guestId)
      .order("is_pinned", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("hotel_guest_preferences")
      .select("*")
      .eq("company_id", companyId)
      .eq("guest_id", guestId)
      .maybeSingle(),

    supabase
      .from("hotel_guest_documents")
      .select("*")
      .eq("company_id", companyId)
      .eq("guest_id", guestId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("hotel_guest_activities")
      .select("*")
      .eq("company_id", companyId)
      .eq("guest_id", guestId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100),
  ]);

  const error =
    notesResult.error ??
    preferenceResult.error ??
    documentsResult.error ??
    activitiesResult.error;

  if (error) {
    throw new Error(message(error));
  }

  return {
    notes:
      (notesResult.data ?? []) as GuestNote[],

    preference:
      (preferenceResult.data ??
        null) as GuestPreference | null,

    documents:
      (documentsResult.data ??
        []) as GuestDocument[],

    activities:
      (activitiesResult.data ??
        []) as GuestActivity[],
  };
}

export async function createGuestNote(
  input: {
    companyId: string;
    guestId: string;
    noteType: GuestNoteType;
    priority: GuestNotePriority;
    visibility: GuestNoteVisibility;
    title: string;
    content: string;
    isPinned: boolean;
    userId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_guest_notes")
    .insert({
      company_id: input.companyId,
      guest_id: input.guestId,
      note_type: input.noteType,
      priority: input.priority,
      visibility: input.visibility,
      title: input.title,
      content: input.content,
      is_pinned: input.isPinned,
      created_by: input.userId ?? null,
    });

  if (error) {
    throw new Error(message(error));
  }

  await createGuestActivity({
    companyId: input.companyId,
    guestId: input.guestId,
    activityType: "note_created",
    title: "Misafir notu eklendi",
    description: input.title,
    userId: input.userId,
  });
}

export async function deleteGuestNote(
  companyId: string,
  noteId: string
): Promise<void> {
  const { error } = await supabase
    .from("hotel_guest_notes")
    .delete()
    .eq("company_id", companyId)
    .eq("id", noteId);

  if (error) {
    throw new Error(message(error));
  }
}

export async function saveGuestPreference(
  input: {
    companyId: string;
    guestId: string;
    roomLocation?: string | null;
    floorPreference?: string | null;
    bedPreference?: string | null;
    viewPreference?: string | null;
    smokingPreference?: string | null;
    pillowPreference?: string | null;
    temperaturePreference?: string | null;
    mealPreference?: string | null;
    allergies?: string | null;
    accessibilityNeeds?: string | null;
    arrivalPreference?: string | null;
    communicationChannel?: string | null;
    specialOccasion?: string | null;
    additionalPreferences?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_guest_preferences")
    .upsert(
      {
        company_id: input.companyId,
        guest_id: input.guestId,

        room_location:
          input.roomLocation ?? null,

        floor_preference:
          input.floorPreference ?? null,

        bed_preference:
          input.bedPreference ?? null,

        view_preference:
          input.viewPreference ?? null,

        smoking_preference:
          input.smokingPreference ?? null,

        pillow_preference:
          input.pillowPreference ?? null,

        temperature_preference:
          input.temperaturePreference ??
          null,

        meal_preference:
          input.mealPreference ?? null,

        allergies:
          input.allergies ?? null,

        accessibility_needs:
          input.accessibilityNeeds ?? null,

        arrival_preference:
          input.arrivalPreference ?? null,

        communication_channel:
          input.communicationChannel ??
          null,

        special_occasion:
          input.specialOccasion ?? null,

        additional_preferences:
          input.additionalPreferences ??
          null,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "company_id,guest_id",
      }
    );

  if (error) {
    throw new Error(message(error));
  }
}

export async function createGuestDocument(
  input: {
    companyId: string;
    guestId: string;
    documentType: GuestDocumentType;
    documentName: string;
    documentNumber?: string | null;
    issuedCountry?: string | null;
    issuedAt?: string | null;
    expiresAt?: string | null;
    verificationStatus: GuestDocumentStatus;
    notes?: string | null;
    userId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_guest_documents")
    .insert({
      company_id: input.companyId,
      guest_id: input.guestId,

      document_type:
        input.documentType,

      document_name:
        input.documentName,

      document_number:
        input.documentNumber ?? null,

      issued_country:
        input.issuedCountry ?? null,

      issued_at:
        input.issuedAt ?? null,

      expires_at:
        input.expiresAt ?? null,

      verification_status:
        input.verificationStatus,

      notes:
        input.notes ?? null,

      created_by:
        input.userId ?? null,

      verified_by:
        input.verificationStatus ===
        "verified"
          ? input.userId ?? null
          : null,

      verified_at:
        input.verificationStatus ===
        "verified"
          ? new Date().toISOString()
          : null,
    });

  if (error) {
    throw new Error(message(error));
  }

  await createGuestActivity({
    companyId: input.companyId,
    guestId: input.guestId,
    activityType: "document_created",
    title: "Misafir belgesi eklendi",
    description: input.documentName,
    userId: input.userId,
  });
}

export async function deleteGuestDocument(
  companyId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from("hotel_guest_documents")
    .delete()
    .eq("company_id", companyId)
    .eq("id", documentId);

  if (error) {
    throw new Error(message(error));
  }
}

export async function createGuestActivity(
  input: {
    companyId: string;
    guestId: string;
    activityType: string;
    title: string;
    description?: string | null;
    metadata?: Record<string, unknown>;
    userId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_guest_activities")
    .insert({
      company_id: input.companyId,
      guest_id: input.guestId,
      activity_type:
        input.activityType,
      title: input.title,
      description:
        input.description ?? null,
      metadata:
        input.metadata ?? {},
      performed_by:
        input.userId ?? null,
    });

  if (error) {
    throw new Error(message(error));
  }
}
