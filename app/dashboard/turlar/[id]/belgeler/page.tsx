"use client";

import Link from "next/link";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaExternalLinkAlt,
  FaFileAlt,
  FaFileInvoice,
  FaIdCard,
  FaLink,
  FaPaperPlane,
  FaPlane,
  FaPlus,
  FaReceipt,
  FaRoute,
  FaSearch,
  FaTrash,
  FaUsers,
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

import TourModuleChrome from "../../../components/TourModuleChrome";


type DocumentType =
  | "flight_ticket"
  | "pnr_document"
  | "hotel_voucher"
  | "transfer_voucher"
  | "activity_voucher"
  | "restaurant_voucher"
  | "insurance"
  | "manifest"
  | "rooming"
  | "guide_document"
  | "bus_document"
  | "supplier_confirmation"
  | "customer_voucher"
  | "identity_list"
  | "other";


type DocumentStatus =
  | "draft"
  | "pending"
  | "ready"
  | "sent"
  | "expired"
  | "cancelled";


type RecipientScope =
  | "internal"
  | "customer"
  | "guide"
  | "supplier"
  | "customer_guide"
  | "all";


type SourceKind =
  | "manual"
  | "reservation_voucher"
  | "flight"
  | "supplier_commitment"
  | "manifest"
  | "rooming";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    "air" |
    "bus" |
    "other";
};


type Departure = {
  id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
};


type Reservation = {
  id: string;
  reservation_code:
    string | null;
  full_name: string;
  guests: number;
  status: string;
};


type Flight = {
  id: string;
  departure_id:
    string | null;
  direction:
    string;
  airline_name:
    string | null;
  flight_number:
    string | null;
  pnr:
    string | null;
  group_booking_code:
    string | null;
  status: string;
};


type FlightPassengerAssignment = {
  id: string;
  flight_id: string;
  passenger_id: string;
  passenger_pnr: string | null;
  ticket_number: string | null;
  e_ticket_number: string | null;
  ticketing_status: string;
};

type SupplierCommitment = {
  id: string;
  service_title: string;
  confirmation_status: string;
  voucher_reference:
    string | null;
  confirmation_reference:
    string | null;
};


type DocumentRecord = {
  id: string;
  reservation_id:
    string | null;
  supplier_commitment_id:
    string | null;
  document_type:
    DocumentType;
  title: string;
  document_status:
    DocumentStatus;
  recipient_scope:
    RecipientScope;
  source_kind:
    SourceKind;
  source_reference:
    string | null;
  external_url:
    string | null;
  is_required:
    boolean;
  issued_at:
    string | null;
  expires_at:
    string | null;
  sent_at:
    string | null;
  note:
    string | null;
  created_at:
    string;
};


type FormState = {
  documentType:
    DocumentType;
  title: string;
  status:
    DocumentStatus;
  recipientScope:
    RecipientScope;
  sourceKind:
    SourceKind;
  sourceReference: string;
  externalUrl: string;
  required:
    boolean;
  issuedAt: string;
  expiresAt: string;
  note: string;
};


const EMPTY_FORM:
  FormState = {
    documentType:
      "other",

    title:
      "",

    status:
      "draft",

    recipientScope:
      "internal",

    sourceKind:
      "manual",

    sourceReference:
      "",

    externalUrl:
      "",

    required:
      false,

    issuedAt:
      "",

    expiresAt:
      "",

    note:
      "",
  };


const documentLabels:
  Record<
    DocumentType,
    string
  > = {

    flight_ticket:
      "Uçak Bileti",

    pnr_document:
      "PNR Belgesi",

    hotel_voucher:
      "Otel Voucher",

    transfer_voucher:
      "Transfer Voucher",

    activity_voucher:
      "Aktivite Voucher",

    restaurant_voucher:
      "Restoran Voucher",

    insurance:
      "Sigorta",

    manifest:
      "Manifest",

    rooming:
      "Rooming List",

    guide_document:
      "Rehber Evrakı",

    bus_document:
      "Otobüs Evrakı",

    supplier_confirmation:
      "Tedarikçi Teyidi",

    customer_voucher:
      "Müşteri Voucher",

    identity_list:
      "Kimlik / Yolcu Listesi",

    other:
      "Diğer",
  };


const statusLabels:
  Record<
    DocumentStatus,
    string
  > = {

    draft:
      "Taslak",

    pending:
      "Bekliyor",

    ready:
      "Hazır",

    sent:
      "Gönderildi",

    expired:
      "Süresi Doldu",

    cancelled:
      "İptal",
  };


const recipientLabels:
  Record<
    RecipientScope,
    string
  > = {

    internal:
      "İç Operasyon",

    customer:
      "Müşteri",

    guide:
      "Rehber",

    supplier:
      "Tedarikçi",

    customer_guide:
      "Müşteri + Rehber",

    all:
      "Tümü",
  };


function formatDate(
  value:
    string | null
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
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
  ).format(
    date
  );

}


function localDateKey(
  date =
    new Date()
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}



function expired(
  value:
    string | null
) {

  if (!value) {
    return false;
  }


  const time =
    new Date(
      value
    ).getTime();


  return (
    Number.isFinite(
      time
    ) &&
    time <
      Date.now()
  );

}


export default function TourDocumentCenterPage() {

  const params =
    useParams<{
      id:
        string;
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
    currentUserId,
    setCurrentUserId,
  ] =
    useState("");


  const [
    tour,
    setTour,
  ] =
    useState<Tour | null>(
      null
    );


  const [
    departures,
    setDepartures,
  ] =
    useState<Departure[]>(
      []
    );


  const [
    selectedDepartureId,
    setSelectedDepartureId,
  ] =
    useState("");


  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );


  const [
    flights,
    setFlights,
  ] =
    useState<Flight[]>(
      []
    );


  const [
    flightPassengerAssignments,
    setFlightPassengerAssignments,
  ] =
    useState<FlightPassengerAssignment[]>(
      []
    );

  const [
    supplierCommitments,
    setSupplierCommitments,
  ] =
    useState<SupplierCommitment[]>(
      []
    );


  const [
    documents,
    setDocuments,
  ] =
    useState<DocumentRecord[]>(
      []
    );


  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      EMPTY_FORM
    );



  const departureFlights =
    useMemo(
      () =>
        flights.filter(
          flight =>
            flight.departure_id ===
            selectedDepartureId
        ),
      [
        flights,
        selectedDepartureId,
      ]
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "all" |
      DocumentStatus |
      "required"
    >(
      "all"
    );


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


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


  const loadDepartureData =
    useCallback(
      async (
        currentCompanyId:
          string,

        departureId:
          string
      ) => {

        if (!departureId) {

          setReservations([]);
          setFlightPassengerAssignments([]);
          setSupplierCommitments([]);
          setDocuments([]);

          return;

        }


        const [
          reservationResult,
          flightPassengerAssignmentResult,
          supplierResult,
          documentResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "reservations"
              )
              .select(
                [
                  "id",
                  "reservation_code",
                  "full_name",
                  "guests",
                  "status",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "departure_id",
                departureId
              )
              .neq(
                "status",
                "cancelled"
              )
              .order(
                "full_name",
                {
                  ascending:
                    true,
                }
              ),


            supabase
              .from(
                "tour_flight_passenger_assignments"
              )
              .select(
                [
                  "id",
                  "flight_id",
                  "passenger_id",
                  "passenger_pnr",
                  "ticket_number",
                  "e_ticket_number",
                  "ticketing_status",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .eq(
                "departure_id",
                departureId
              ),

            supabase
              .from(
                "tour_supplier_commitments"
              )
              .select(
                [
                  "id",
                  "service_title",
                  "confirmation_status",
                  "voucher_reference",
                  "confirmation_reference",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .eq(
                "departure_id",
                departureId
              )
              .neq(
                "confirmation_status",
                "cancelled"
              ),


            supabase
              .from(
                "tour_documents"
              )
              .select(
                [
                  "id",
                  "reservation_id",
                  "supplier_commitment_id",
                  "document_type",
                  "title",
                  "document_status",
                  "recipient_scope",
                  "source_kind",
                  "source_reference",
                  "external_url",
                  "is_required",
                  "issued_at",
                  "expires_at",
                  "sent_at",
                  "note",
                  "created_at",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .eq(
                "departure_id",
                departureId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);


        if (
          reservationResult.error
        ) {
          throw reservationResult.error;
        }


        if (
          flightPassengerAssignmentResult.error
        ) {
          throw flightPassengerAssignmentResult.error;
        }

        if (
          supplierResult.error
        ) {
          throw supplierResult.error;
        }


        if (
          documentResult.error
        ) {
          throw documentResult.error;
        }


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );


        setFlightPassengerAssignments(
          (
            flightPassengerAssignmentResult.data ??
            []
          ) as unknown as
            FlightPassengerAssignment[]
        );

        setSupplierCommitments(
          (
            supplierResult.data ??
            []
          ) as unknown as
            SupplierCommitment[]
        );


        setDocuments(
          (
            documentResult.data ??
            []
          ) as unknown as
            DocumentRecord[]
        );

      },
      [
        tourId,
      ]
    );


  const initialize =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setError(
          ""
        );


        try {

          const {
            data:
              authData,

            error:
              authError,
          } =
            await supabase
              .auth
              .getUser();


          if (
            authError ||
            !authData.user
          ) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }


          setCurrentUserId(
            authData.user.id
          );


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


          const currentCompanyId =
            membership.company_id;


          setCompanyId(
            currentCompanyId
          );


          const [
            tourResult,
            departureResult,
            flightResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "tours"
                )
                .select(
                  "id,title,transport_mode"
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "id",
                  tourId
                )
                .maybeSingle(),


              supabase
                .from(
                  "tour_departures"
                )
                .select(
                  [
                    "id",
                    "departure_date",
                    "capacity",
                    "reserved_count",
                  ].join(",")
                )
                .eq(
                  "tour_id",
                  tourId
                )
                .order(
                  "departure_date",
                  {
                    ascending:
                      true,
                  }
                ),


              supabase
                .from(
                  "tour_flights"
                )
                .select(
                  [
                    "id",
                    "departure_id",
                    "direction",
                    "airline_name",
                    "flight_number",
                    "pnr",
                    "group_booking_code",
                    "status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "tour_id",
                  tourId
                )
                .neq(
                  "status",
                  "cancelled"
                ),
            ]);


          if (
            tourResult.error
          ) {
            throw tourResult.error;
          }


          if (
            departureResult.error
          ) {
            throw departureResult.error;
          }


          if (
            flightResult.error
          ) {
            throw flightResult.error;
          }


          if (
            !tourResult.data
          ) {
            throw new Error(
              "Tur bulunamadı."
            );
          }


          const loadedDepartures =
            (
              departureResult.data ??
              []
            ) as unknown as
              Departure[];


          setTour(
            tourResult.data as unknown as
              Tour
          );


          setDepartures(
            loadedDepartures
          );


          setFlights(
            (
              flightResult.data ??
              []
            ) as unknown as
              Flight[]
          );


          if (
            loadedDepartures.length >
            0
          ) {

            const today =
              localDateKey();


            const target =
              loadedDepartures.find(
                departure =>
                  departure.departure_date >=
                  today
              ) ??
              loadedDepartures[
                loadedDepartures.length -
                1
              ];


            setSelectedDepartureId(
              target.id
            );


            await loadDepartureData(
              currentCompanyId,
              target.id
            );

          }


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

          setLoading(
            false
          );

        }

      },
      [
        loadDepartureData,
        tourId,
      ]
    );


  useEffect(() => {

    void initialize();

  }, [
    initialize,
  ]);


  async function changeDeparture(
    departureId:
      string
  ) {

    setSelectedDepartureId(
      departureId
    );


    if (!companyId) {
      return;
    }


    setBusy(
      true
    );


    try {

      await loadDepartureData(
        companyId,
        departureId
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

      setBusy(
        false
      );

    }

  }


  async function saveDocument(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !companyId ||
      !tour ||
      !selectedDepartureId
    ) {
      return;
    }


    if (
      !form.title.trim()
    ) {

      setError(
        "Belge başlığı zorunlu."
      );

      return;

    }


    if (
      form.externalUrl.trim() &&
      !/^https?:\/\//i.test(
        form.externalUrl.trim()
      )
    ) {

      setError(
        "Belge bağlantısı http:// veya https:// ile başlamalı."
      );

      return;

    }


    setBusy(
      true
    );

    setError(
      ""
    );

    setNotice(
      ""
    );


    try {

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "tour_documents"
          )
          .insert({

            company_id:
              companyId,

            tour_id:
              tour.id,

            departure_id:
              selectedDepartureId,

            document_type:
              form.documentType,

            title:
              form.title.trim(),

            document_status:
              form.status,

            recipient_scope:
              form.recipientScope,

            source_kind:
              form.sourceKind,

            source_reference:
              form.sourceReference.trim() ||
              null,

            external_url:
              form.externalUrl.trim() ||
              null,

            is_required:
              form.required,

            issued_at:
              form.issuedAt
                ? new Date(
                    form.issuedAt
                  ).toISOString()
                : null,

            expires_at:
              form.expiresAt
                ? new Date(
                    form.expiresAt
                  ).toISOString()
                : null,

            note:
              form.note.trim() ||
              null,

            created_by:
              currentUserId ||
              null,

            updated_by:
              currentUserId ||
              null,

          });


      if (
        insertError
      ) {
        throw insertError;
      }


      setForm(
        EMPTY_FORM
      );


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Belge kaydı oluşturuldu."
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

      setBusy(
        false
      );

    }

  }


  async function updateStatus(
    document:
      DocumentRecord,

    status:
      DocumentStatus
  ) {

    setBusy(
      true
    );

    setError(
      ""
    );


    try {

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "tour_documents"
          )
          .update({
            document_status:
              status,

            updated_by:
              currentUserId ||
              null,
          })
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "id",
            document.id
          );


      if (
        updateError
      ) {
        throw updateError;
      }


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Belge durumu güncellendi."
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

      setBusy(
        false
      );

    }

  }


  async function cancelDocument(
    document:
      DocumentRecord
  ) {

    if (
      document.document_status ===
      "cancelled"
    ) {
      return;
    }


    if (
      !window.confirm(
        "Bu belge kaydını iptal etmek istediğinize emin misiniz? Operasyon geçmişinden silinmeyecek."
      )
    ) {
      return;
    }


    setBusy(
      true
    );

    setError(
      ""
    );

    setNotice(
      ""
    );


    try {

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "tour_documents"
          )
          .update({
            document_status:
              "cancelled",

            updated_by:
              currentUserId ||
              null,
          })
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "tour_id",
            tourId
          )
          .eq(
            "departure_id",
            selectedDepartureId
          )
          .eq(
            "id",
            document.id
          );


      if (
        updateError
      ) {
        throw updateError;
      }


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Belge kaydı iptal edildi. Operasyon geçmişi korundu."
      );

    } catch (
      currentError
    ) {

      setError(
        currentError instanceof Error
          ? currentError.message
          : "Belge iptal edilemedi."
      );

    } finally {

      setBusy(
        false
      );

    }

  }



  const requiredCount =
    documents.filter(
      document =>
        document.is_required
    ).length;


  const requiredPendingCount =
    documents.filter(
      document =>
        document.is_required &&
        ![
          "ready",
          "sent",
          "cancelled",
        ].includes(
          document.document_status
        )
    ).length;


  const readyCount =
    documents.filter(
      document =>
        [
          "ready",
          "sent",
        ].includes(
          document.document_status
        )
    ).length;


  const sentCount =
    documents.filter(
      document =>
        document.document_status ===
        "sent"
    ).length;


  const expiredCount =
    documents.filter(
      document =>
        document.document_status !==
          "cancelled" &&
        expired(
          document.expires_at
        )
    ).length;


  const reservationVoucherCount =
    reservations.length;


  const supplierVoucherCount =
    supplierCommitments.filter(
      item =>
        Boolean(
          item.voucher_reference
        )
    ).length;


  const activeFlights =
    departureFlights.filter(
      flight =>
        flight.status !==
        "cancelled"
    );


  const activeFlightIds =
    new Set(
      activeFlights.map(
        flight => flight.id
      )
    );

  const activeFlightPassengerAssignments =
    flightPassengerAssignments.filter(
      assignment =>
        activeFlightIds.has(
          assignment.flight_id
        )
    );

  const pnrCount =
    activeFlights.filter(
      flight =>
        Boolean(
          flight.pnr ||
          flight.group_booking_code
        )
    ).length;


  const visibleDocuments =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return documents.filter(
          document => {

            if (
              statusFilter ===
                "required" &&
              !document.is_required
            ) {
              return false;
            }


            if (
              statusFilter !==
                "all" &&
              statusFilter !==
                "required" &&
              document.document_status !==
                statusFilter
            ) {
              return false;
            }


            if (
              query &&
              ![
                document.title,
                documentLabels[
                  document.document_type
                ],
                document.source_reference,
                document.note,
              ]
                .filter(Boolean)
                .some(
                  value =>
                    String(value)
                      .toLocaleLowerCase(
                        "tr-TR"
                      )
                      .includes(
                        query
                      )
                )
            ) {
              return false;
            }


            return true;

          }
        );

      },
      [
        documents,
        search,
        statusFilter,
      ]
    );


  async function copyText(
    value:
      string
  ) {

    try {

      await navigator
        .clipboard
        .writeText(
          value
        );


      setNotice(
        "Referans panoya kopyalandı."
      );


    } catch {

      setError(
        "Panoya kopyalanamadı."
      );

    }

  }


  if (
    loading
  ) {

    return (
      <main data-tour-module-screen className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">

      <TourModuleChrome
        tourId={tourId}
        moduleKey="documents"
      />

        Belge merkezi yükleniyor...
      </main>
    );

  }


  return (
    <main data-tour-os-screen="document-center" className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1750px] px-5 py-7 lg:px-8">

        <div className="flex items-center justify-between gap-3">

          <Link
            href={`/dashboard/turlar/${tourId}`}
            className="inline-flex items-center gap-2 text-[8px] font-black text-slate-500"
          >
            <FaArrowLeft />
            Tur Operasyon Merkezi
          </Link>


          <Link
            href="/dashboard/manifest"
            className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-2.5 text-[8px] font-black text-slate-400"
          >
            Manifest Merkezi
          </Link>

        </div>


        <section className="mt-4 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_36%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.14em] text-orange-300">
                <FaFileAlt />
                BELGE & VOUCHER MERKEZİ
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-3 text-[8px] text-slate-500">
                Operasyon evrakları, mevcut voucherlar, PNR ve manifest tek merkezde
              </div>

            </div>


            <select
              value={
                selectedDepartureId
              }
              disabled={
                busy
              }
              onChange={event =>
                void changeDeparture(
                  event.target.value
                )
              }
              className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-4 text-[8px] font-black"
            >

              {departures.length ===
              0 ? (
                <option value="">
                  Çıkış kaydı yok
                </option>
              ) : (
                departures.map(
                  departure => (
                    <option
                      key={
                        departure.id
                      }
                      value={
                        departure.id
                      }
                    >
                      {new Date(
                        `${departure.departure_date}T00:00:00`
                      ).toLocaleDateString(
                        "tr-TR"
                      )}
                      {" · "}
                      {departure.reserved_count}
                      {"/"}
                      {departure.capacity}
                    </option>
                  )
                )
              )}

            </select>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] px-4 py-3 text-[8px] font-black text-emerald-300">
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">

          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="text-[7px] font-black text-slate-600">
              BELGE KAYDI
            </div>

            <div className="mt-3 text-3xl font-black">
              {documents.length}
            </div>

          </article>


          <article className="rounded-[22px] border border-emerald-500/15 bg-emerald-500/[.04] p-5">

            <div className="text-[7px] font-black text-emerald-300">
              HAZIR
            </div>

            <div className="mt-3 text-3xl font-black">
              {readyCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-blue-500/15 bg-blue-500/[.04] p-5">

            <div className="text-[7px] font-black text-blue-300">
              GÖNDERİLDİ
            </div>

            <div className="mt-3 text-3xl font-black">
              {sentCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-red-500/15 bg-red-500/[.04] p-5">

            <div className="text-[7px] font-black text-red-300">
              ZORUNLU EKSİK
            </div>

            <div className="mt-3 text-3xl font-black">
              {requiredPendingCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-amber-500/15 bg-amber-500/[.04] p-5">

            <div className="text-[7px] font-black text-amber-300">
              SÜRESİ GEÇEN
            </div>

            <div className="mt-3 text-3xl font-black">
              {expiredCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="text-[7px] font-black text-slate-600">
              REZERVASYON VOUCHER
            </div>

            <div className="mt-3 text-3xl font-black">
              {reservationVoucherCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="text-[7px] font-black text-slate-600">
              PNR
            </div>

            <div className="mt-3 text-3xl font-black">
              {pnrCount}
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[420px_1fr]">

          <form
            onSubmit={
              saveDocument
            }
            className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaPlus className="text-orange-300" />
              Operasyon Belgesi Kaydet
            </div>


            <div className="mt-2 text-[7px] leading-5 text-slate-600">
              Mevcut sistem voucherını yeniden üretmez. Harici veya operasyonel belgeyi kayıt altına alır.
            </div>


            <div className="mt-5 grid gap-3">

              <select
                value={
                  form.documentType
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      documentType:
                        event.target.value as
                          DocumentType,
                    })
                  )
                }
                className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              >

                {(
                  Object.keys(
                    documentLabels
                  ) as
                    DocumentType[]
                ).map(
                  type => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {documentLabels[type]}
                    </option>
                  )
                )}

              </select>


              <input
                value={
                  form.title
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      title:
                        event.target.value,
                    })
                  )
                }
                placeholder="Belge başlığı"
                className="h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />


              <div className="grid grid-cols-2 gap-3">

                <select
                  value={
                    form.status
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        status:
                          event.target.value as
                            DocumentStatus,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                >

                  {(
                    Object.keys(
                      statusLabels
                    ) as
                      DocumentStatus[]
                  ).map(
                    status => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {statusLabels[
                          status
                        ]}
                      </option>
                    )
                  )}

                </select>


                <select
                  value={
                    form.recipientScope
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        recipientScope:
                          event.target.value as
                            RecipientScope,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                >

                  {(
                    Object.keys(
                      recipientLabels
                    ) as
                      RecipientScope[]
                  ).map(
                    scope => (
                      <option
                        key={
                          scope
                        }
                        value={
                          scope
                        }
                      >
                        {recipientLabels[
                          scope
                        ]}
                      </option>
                    )
                  )}

                </select>

              </div>


              <select
                value={
                  form.sourceKind
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      sourceKind:
                        event.target.value as
                          SourceKind,
                    })
                  )
                }
                className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[7px]"
              >

                <option value="manual">
                  Manuel / Harici
                </option>

                <option value="reservation_voucher">
                  Rezervasyon Voucher
                </option>

                <option value="flight">
                  Uçuş / PNR
                </option>

                <option value="supplier_commitment">
                  Tedarikçi
                </option>

                <option value="manifest">
                  Manifest
                </option>

                <option value="rooming">
                  Rooming
                </option>

              </select>


              <input
                value={
                  form.sourceReference
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      sourceReference:
                        event.target.value,
                    })
                  )
                }
                placeholder="Belge / PNR / voucher referansı"
                className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />


              <input
                value={
                  form.externalUrl
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      externalUrl:
                        event.target.value,
                    })
                  )
                }
                placeholder="https://... belge bağlantısı"
                className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />


              <div className="grid grid-cols-2 gap-3">

                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    DÜZENLENME
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      form.issuedAt
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          issuedAt:
                            event.target.value,
                        })
                      )
                    }
                    className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                  />

                </label>


                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    GEÇERLİLİK
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      form.expiresAt
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          expiresAt:
                            event.target.value,
                        })
                      )
                    }
                    className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                  />

                </label>

              </div>


              <label className="flex items-center gap-3 rounded-xl border border-white/[.08] bg-[#03080e] p-3">

                <input
                  type="checkbox"
                  checked={
                    form.required
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        required:
                          event.target.checked,
                      })
                    )
                  }
                />

                <div>

                  <div className="text-[8px] font-black">
                    Zorunlu operasyon belgesi
                  </div>

                  <div className="mt-1 text-[7px] text-slate-600">
                    Hazır değilse Control Tower alarmına düşer.
                  </div>

                </div>

              </label>


              <textarea
                rows={3}
                value={
                  form.note
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      note:
                        event.target.value,
                    })
                  )
                }
                placeholder="Belge notu"
                className="rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px]"
              />


              <button
                type="submit"
                disabled={
                  busy
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black disabled:opacity-40"
              >
                <FaFileAlt />
                Belgeyi Kaydet
              </button>

            </div>

          </form>


          <section className="space-y-5">

            <section className="grid gap-3 lg:grid-cols-3">

              <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

                <div className="flex items-center gap-2 text-[9px] font-black">
                  <FaReceipt className="text-orange-300" />
                  Mevcut Müşteri Voucherları
                </div>


                <div className="mt-4 max-h-56 space-y-2 overflow-auto">

                  {reservations.length ===
                  0 ? (

                    <div className="text-[7px] text-slate-600">
                      Rezervasyon yok.
                    </div>

                  ) : (

                    reservations.map(
                      reservation => (
                        <Link
                          key={
                            reservation.id
                          }
                          href={`/dashboard/rezervasyonlar/${reservation.id}/voucher`}
                          className="flex items-center justify-between rounded-xl border border-white/[.07] bg-[#030a11] px-3 py-3"
                        >

                          <div>

                            <div className="text-[8px] font-black">
                              {reservation.full_name}
                            </div>

                            <div className="mt-1 text-[7px] text-slate-600">
                              {reservation.reservation_code ||
                                reservation.id.slice(
                                  0,
                                  8
                                )}
                              {" · "}
                              {reservation.guests}
                              {" kişi"}
                            </div>

                          </div>

                          <FaExternalLinkAlt className="text-orange-300" />

                        </Link>
                      )
                    )

                  )}

                </div>

              </article>


              <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

                <div className="flex items-center gap-2 text-[9px] font-black">
                  <FaPlane className="text-blue-300" />
                  Uçuş / PNR
                </div>


                <div className="mt-4 max-h-56 space-y-2 overflow-auto">

                  {activeFlights.length ===
                  0 ? (

                    <div className="text-[7px] text-slate-600">
                      Uçuş kaydı yok.
                    </div>

                  ) : (

                    activeFlights.map(
                      flight => {

                        const ref =
                          flight.pnr ||
                          flight.group_booking_code ||
                          "PNR yok";

                        const passengerAssignments =
                          activeFlightPassengerAssignments.filter(
                            assignment =>
                              assignment.flight_id ===
                              flight.id
                          );


                        return (
                          <div
                            key={
                              flight.id
                            }
                            className="rounded-xl border border-white/[.07] bg-[#030a11] px-3 py-3"
                          >

                            <div className="flex items-center justify-between gap-2">

                              <div>

                                <div className="text-[8px] font-black">
                                  {flight.airline_name ||
                                    "Havayolu"}
                                  {" "}
                                  {flight.flight_number ||
                                    ""}
                                </div>

                                <div className="mt-1 text-[7px] text-blue-300">
                                  {ref}
                                </div>

                              </div>


                              {ref !==
                                "PNR yok" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void copyText(
                                      ref
                                    )
                                  }
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400"
                                >
                                  <FaCopy />
                                </button>
                              )}

                            </div>


                            {passengerAssignments.length >
                              0 && (
                              <div className="mt-3 space-y-2 border-t border-white/[.06] pt-3">

                                <div className="text-[7px] font-black uppercase tracking-wide text-slate-500">
                                  Yolcu PNR / Bilet
                                </div>


                                {passengerAssignments.map(
                                  assignment => {

                                    const passengerPnr =
                                      assignment.passenger_pnr ||
                                      "-";

                                    const ticketRef =
                                      assignment.e_ticket_number ||
                                      assignment.ticket_number ||
                                      "-";


                                    return (
                                      <div
                                        key={
                                          assignment.id
                                        }
                                        className="rounded-lg border border-white/[.05] bg-black/20 px-2.5 py-2"
                                      >

                                        <div className="flex items-start justify-between gap-2">

                                          <div className="min-w-0">

                                            <div className="text-[7px] font-black text-slate-300">
                                              Yolcu{" "}
                                              {assignment.passenger_id.slice(
                                                0,
                                                8
                                              )}
                                            </div>


                                            <div className="mt-1 text-[7px] text-blue-300">
                                              PNR:{" "}
                                              {passengerPnr}
                                            </div>


                                            <div className="mt-0.5 text-[7px] text-slate-500">
                                              Bilet / E-ticket:{" "}
                                              {ticketRef}
                                            </div>


                                            <div className="mt-0.5 text-[6px] uppercase tracking-wide text-slate-600">
                                              {assignment.ticketing_status}
                                            </div>

                                          </div>


                                          {(passengerPnr !==
                                            "-" ||
                                            ticketRef !==
                                              "-") && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void copyText(
                                                  [
                                                    passengerPnr !==
                                                    "-"
                                                      ? `PNR: ${passengerPnr}`
                                                      : "",
                                                    ticketRef !==
                                                    "-"
                                                      ? `Bilet: ${ticketRef}`
                                                      : "",
                                                  ]
                                                    .filter(
                                                      Boolean
                                                    )
                                                    .join(
                                                      " · "
                                                    )
                                                )
                                              }
                                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-500"
                                            >
                                              <FaCopy />
                                            </button>
                                          )}

                                        </div>

                                      </div>
                                    );

                                  }
                                )}

                              </div>
                            )}

                          </div>
                        );

                      }
                    )

                  )}

                </div>


                {tour?.transport_mode ===
                  "air" && (
                  <Link
                    href={`/dashboard/turlar/${tourId}/ucus`}
                    className="mt-3 inline-flex items-center gap-2 text-[7px] font-black text-blue-300"
                  >
                    <FaExternalLinkAlt />
                    Uçuş Merkezini Aç
                  </Link>
                )}

              </article>


              <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

                <div className="flex items-center gap-2 text-[9px] font-black">
                  <FaFileInvoice className="text-violet-300" />
                  Tedarikçi Voucherları
                </div>


                <div className="mt-4 max-h-56 space-y-2 overflow-auto">

                  {supplierCommitments.length ===
                  0 ? (

                    <div className="text-[7px] text-slate-600">
                      Tedarikçi operasyon kaydı yok.
                    </div>

                  ) : (

                    supplierCommitments.map(
                      item => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-xl border border-white/[.07] bg-[#030a11] px-3 py-3"
                        >

                          <div className="text-[8px] font-black">
                            {item.service_title}
                          </div>


                          <div className="mt-1 text-[7px] text-slate-600">
                            {item.voucher_reference
                              ? `Voucher: ${item.voucher_reference}`
                              : item.confirmation_reference
                                ? `Teyit: ${item.confirmation_reference}`
                                : "Referans yok"}
                          </div>

                        </div>
                      )
                    )

                  )}

                </div>


                <Link
                  href={`/dashboard/turlar/${tourId}/tedarikciler`}
                  className="mt-3 inline-flex items-center gap-2 text-[7px] font-black text-violet-300"
                >
                  <FaExternalLinkAlt />
                  Tedarikçi Merkezini Aç
                </Link>

              </article>

            </section>


            <div className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-4">

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                <div className="relative w-full max-w-xl">

                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-600" />

                  <input
                    value={
                      search
                    }
                    onChange={event =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Belge, referans veya not ara..."
                    className="h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] pl-9 pr-3 text-[8px]"
                  />

                </div>


                <select
                  value={
                    statusFilter
                  }
                  onChange={event =>
                    setStatusFilter(
                      event.target.value as
                        typeof statusFilter
                    )
                  }
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                >

                  <option value="all">
                    Tüm Belgeler
                  </option>

                  <option value="required">
                    Zorunlu Belgeler
                  </option>

                  <option value="draft">
                    Taslak
                  </option>

                  <option value="pending">
                    Bekliyor
                  </option>

                  <option value="ready">
                    Hazır
                  </option>

                  <option value="sent">
                    Gönderildi
                  </option>

                </select>

              </div>

            </div>


            <div className="overflow-hidden rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)]">

              <div className="overflow-auto">

                <table className="min-w-[1450px] w-full">

                  <thead className="bg-[#081522]">

                    <tr className="text-left text-[7px] font-black uppercase text-slate-600">

                      <th className="px-4 py-4">
                        Belge
                      </th>

                      <th className="px-4 py-4">
                        Tür
                      </th>

                      <th className="px-4 py-4">
                        Hedef
                      </th>

                      <th className="px-4 py-4">
                        Kaynak
                      </th>

                      <th className="px-4 py-4">
                        Durum
                      </th>

                      <th className="px-4 py-4">
                        Zorunlu
                      </th>

                      <th className="px-4 py-4">
                        Düzenlenme
                      </th>

                      <th className="px-4 py-4">
                        Geçerlilik
                      </th>

                      <th className="px-4 py-4">
                        Bağlantı
                      </th>

                      <th className="px-4 py-4 text-right">
                        İşlem
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {visibleDocuments.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={10}
                          className="px-5 py-14 text-center text-[8px] text-slate-600"
                        >
                          Bu çıkış için kayıtlı operasyon belgesi yok.
                        </td>

                      </tr>

                    ) : (

                      visibleDocuments.map(
                        document => {

                          const isExpired =
                            document.document_status !==
                              "cancelled" &&
                            expired(
                              document.expires_at
                            );


                          return (
                            <tr
                              key={
                                document.id
                              }
                              className="border-t border-white/[.045]"
                            >

                              <td className="px-4 py-4">

                                <div className="text-[8px] font-black">
                                  {document.title}
                                </div>

                                {document.source_reference && (
                                  <div className="mt-1 text-[7px] text-slate-600">
                                    {document.source_reference}
                                  </div>
                                )}

                              </td>


                              <td className="px-4 py-4 text-[7px] font-black text-slate-400">
                                {documentLabels[
                                  document.document_type
                                ]}
                              </td>


                              <td className="px-4 py-4 text-[7px] text-slate-400">
                                {recipientLabels[
                                  document.recipient_scope
                                ]}
                              </td>


                              <td className="px-4 py-4 text-[7px] text-slate-500">
                                {document.source_kind}
                              </td>


                              <td className="px-4 py-4">

                                <select
                                  value={
                                    document.document_status
                                  }
                                  disabled={
                                    busy
                                  }
                                  onChange={event =>
                                    void updateStatus(
                                      document,
                                      event.target.value as
                                        DocumentStatus
                                    )
                                  }
                                  className="h-9 rounded-lg border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                                >

                                  {(
                                    Object.keys(
                                      statusLabels
                                    ) as
                                      DocumentStatus[]
                                  ).map(
                                    status => (
                                      <option
                                        key={
                                          status
                                        }
                                        value={
                                          status
                                        }
                                      >
                                        {statusLabels[
                                          status
                                        ]}
                                      </option>
                                    )
                                  )}

                                </select>

                              </td>


                              <td className="px-4 py-4">

                                {document.is_required ? (
                                  <span className="rounded-full border border-orange-500/20 bg-orange-500/[.06] px-2.5 py-1 text-[7px] font-black text-orange-300">
                                    Zorunlu
                                  </span>
                                ) : (
                                  <span className="text-[7px] text-slate-600">
                                    Hayır
                                  </span>
                                )}

                              </td>


                              <td className="px-4 py-4 text-[7px] text-slate-500">
                                {formatDate(
                                  document.issued_at
                                )}
                              </td>


                              <td className="px-4 py-4">

                                <div
                                  className={`text-[7px] font-black ${
                                    isExpired
                                      ? "text-red-300"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {isExpired && (
                                    <FaClock className="mr-1 inline" />
                                  )}

                                  {formatDate(
                                    document.expires_at
                                  )}
                                </div>

                              </td>


                              <td className="px-4 py-4">

                                {document.external_url ? (

                                  <a
                                    href={
                                      document.external_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/[.05] px-3 py-2 text-[7px] font-black text-blue-300"
                                  >
                                    <FaExternalLinkAlt />
                                    Aç
                                  </a>

                                ) : (

                                  <span className="text-[7px] text-slate-600">
                                    —
                                  </span>

                                )}

                              </td>


                              <td className="px-4 py-4">

                                <div className="flex justify-end">

                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      void cancelDocument(
                                        document
                                      )
                                    }
                                    className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.05] text-red-300"
                                  >
                                    <FaTrash />
                                  </button>

                                </div>

                              </td>

                            </tr>
                          );

                        }
                      )

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </section>

        </section>


        <section className="mt-5 grid gap-4 xl:grid-cols-4">

          <Link
            href="/dashboard/manifest"
            className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >

            <FaRoute className="text-orange-300" />

            <div className="mt-4 text-[9px] font-black">
              Manifest
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Mevcut manifest motorunu aç
            </div>

          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/yolcular`}
            className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >

            <FaUsers className="text-emerald-300" />

            <div className="mt-4 text-[9px] font-black">
              Yolcu & Rooming
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Kimlik ve rooming bilgilerini kontrol et
            </div>

          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/tedarikciler`}
            className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >

            <FaFileInvoice className="text-violet-300" />

            <div className="mt-4 text-[9px] font-black">
              Tedarikçi Voucher
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Tedarikçi teyit ve voucher referansları
            </div>

          </Link>


          <article className="rounded-[22px] border border-orange-500/15 bg-orange-500/[.04] p-5">

            <FaIdCard className="text-orange-300" />

            <div className="mt-4 text-[9px] font-black">
              Zorunlu Evrak
            </div>

            <div className="mt-2 text-3xl font-black">
              {requiredCount}
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              {requiredPendingCount}
              {" kayıt henüz hazır değil"}
            </div>

          </article>

        </section>

      </div>

    </main>
  );
}


<style jsx global>{`
  [data-tour-module-screen] {
    min-height: 100vh;
  }

  [data-tour-module-screen] table {
    border-collapse: separate;
    border-spacing: 0;
  }

  [data-tour-module-screen] thead {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  [data-tour-module-screen] tbody tr {
    transition:
      background-color .16s ease,
      border-color .16s ease;
  }

  [data-tour-module-screen] tbody tr:hover {
    background: rgba(255,255,255,.024);
  }

  [data-tour-module-screen] input,
  [data-tour-module-screen] select,
  [data-tour-module-screen] textarea {
    outline: none;
  }

  [data-tour-module-screen] input:focus,
  [data-tour-module-screen] select:focus,
  [data-tour-module-screen] textarea:focus {
    border-color: rgba(249,115,22,.42);
    box-shadow:
      0 0 0 3px rgba(249,115,22,.06);
  }

  [data-tour-module-screen] button,
  [data-tour-module-screen] a {
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 768px) {
    [data-tour-module-screen] {
      padding-bottom: 84px;
    }

    [data-tour-module-chrome] {
      border-radius: 22px;
    }
  }
`}</style>

// TOUR_MODULE_PRO_V3_DOCUMENTS
