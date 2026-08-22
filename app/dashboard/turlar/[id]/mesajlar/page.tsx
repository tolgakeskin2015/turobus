"use client";

import TourExecutiveChrome from "../../../components/TourExecutiveChrome";

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
  FaEnvelope,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaPaperPlane,
  FaPhone,
  FaPlus,
  FaSearch,
  FaSms,
  FaTrash,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
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


type Channel =
  | "whatsapp"
  | "sms"
  | "email"
  | "phone"
  | "system";


type RecipientType =
  | "customer"
  | "supplier"
  | "staff"
  | "guide"
  | "driver"
  | "internal";


type MessageType =
  | "general"
  | "tour_reminder"
  | "boarding_info"
  | "flight_info"
  | "flight_change"
  | "voucher"
  | "payment_reminder"
  | "supplier_confirmation"
  | "guide_instruction"
  | "delay"
  | "emergency"
  | "return_info"
  | "other";


type DeliveryStatus =
  | "draft"
  | "ready"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "cancelled";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    string;
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
  phone: string;
  email: string;
  guests: number;
  status: string;
};


type Supplier = {
  id: string;
  name: string;
  phone:
    string | null;
  whatsapp_phone:
    string | null;
  email:
    string | null;
};


type SupplierCommitment = {
  id: string;
  supplier_id: string;
  service_title: string;
  confirmation_status: string;
};


type Staff = {
  id: string;
  full_name: string;
  staff_role: string;
  phone:
    string | null;
};


type OperationTask = {
  id: string;
  assignee_staff_id:
    string | null;
};


type Communication = {
  id: string;
  recipient_type:
    RecipientType;
  recipient_name: string;
  recipient_phone:
    string | null;
  recipient_email:
    string | null;
  channel:
    Channel;
  message_type:
    MessageType;
  subject:
    string | null;
  message_body: string;
  delivery_status:
    DeliveryStatus;
  delivery_source: string;
  provider_message_id:
    string | null;
  provider_error:
    string | null;
  scheduled_at:
    string | null;
  sent_at:
    string | null;
  delivered_at:
    string | null;
  read_at:
    string | null;
  created_at: string;
};


type RecipientOption = {
  key: string;
  type:
    RecipientType;
  reservationId:
    string | null;
  supplierId:
    string | null;
  staffId:
    string | null;
  name: string;
  phone:
    string | null;
  email:
    string | null;
  subtitle: string;
};


const channelLabels:
  Record<
    Channel,
    string
  > = {
    whatsapp:
      "WhatsApp",

    sms:
      "SMS",

    email:
      "E-posta",

    phone:
      "Telefon",

    system:
      "Sistem",
  };


const messageTypeLabels:
  Record<
    MessageType,
    string
  > = {
    general:
      "Genel",

    tour_reminder:
      "Tur Hatırlatması",

    boarding_info:
      "Biniş Bilgisi",

    flight_info:
      "Uçuş Bilgisi",

    flight_change:
      "Uçuş Değişikliği",

    voucher:
      "Voucher",

    payment_reminder:
      "Ödeme Hatırlatması",

    supplier_confirmation:
      "Tedarikçi Teyidi",

    guide_instruction:
      "Rehber Talimatı",

    delay:
      "Gecikme",

    emergency:
      "Acil Duyuru",

    return_info:
      "Dönüş Bilgisi",

    other:
      "Diğer",
  };


const deliveryLabels:
  Record<
    DeliveryStatus,
    string
  > = {
    draft:
      "Taslak",

    ready:
      "Hazır",

    queued:
      "Kuyrukta",

    sent:
      "Gönderildi",

    delivered:
      "Teslim Edildi",

    read:
      "Okundu",

    failed:
      "Hata",

    cancelled:
      "İptal",
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


function phoneDigits(
  value:
    string | null
) {

  return String(
    value ||
    ""
  ).replace(
    /\D/g,
    ""
  );

}


export default function TourCommunicationCenterPage() {

  const params =
    useParams<{
      id: string;
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
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>(
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
    staff,
    setStaff,
  ] =
    useState<Staff[]>(
      []
    );


  const [
    tasks,
    setTasks,
  ] =
    useState<OperationTask[]>(
      []
    );


  const [
    communications,
    setCommunications,
  ] =
    useState<Communication[]>(
      []
    );


  const [
    recipientKey,
    setRecipientKey,
  ] =
    useState("");


  const [
    channel,
    setChannel,
  ] =
    useState<Channel>(
      "whatsapp"
    );


  const [
    messageType,
    setMessageType,
  ] =
    useState<MessageType>(
      "general"
    );


  const [
    subject,
    setSubject,
  ] =
    useState("");


  const [
    messageBody,
    setMessageBody,
  ] =
    useState("");


  const [
    scheduledAt,
    setScheduledAt,
  ] =
    useState("");


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
      DeliveryStatus
    >(
      "all"
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


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
          setSupplierCommitments([]);
          setTasks([]);
          setCommunications([]);

          return;

        }


        const [
          reservationResult,
          supplierCommitmentResult,
          taskResult,
          communicationResult,
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
                  "phone",
                  "email",
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
                "full_name"
              ),


            supabase
              .from(
                "tour_supplier_commitments"
              )
              .select(
                [
                  "id",
                  "supplier_id",
                  "service_title",
                  "confirmation_status",
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
                "tour_operation_tasks"
              )
              .select(
                "id,assignee_staff_id"
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
                "status",
                "cancelled"
              ),


            supabase
              .from(
                "tour_operation_communications"
              )
              .select(
                [
                  "id",
                  "recipient_type",
                  "recipient_name",
                  "recipient_phone",
                  "recipient_email",
                  "channel",
                  "message_type",
                  "subject",
                  "message_body",
                  "delivery_status",
                  "delivery_source",
                  "provider_message_id",
                  "provider_error",
                  "scheduled_at",
                  "sent_at",
                  "delivered_at",
                  "read_at",
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


        const firstError =
          reservationResult.error ||
          supplierCommitmentResult.error ||
          taskResult.error ||
          communicationResult.error;


        if (
          firstError
        ) {
          throw firstError;
        }


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );


        setSupplierCommitments(
          (
            supplierCommitmentResult.data ??
            []
          ) as unknown as
            SupplierCommitment[]
        );


        setTasks(
          (
            taskResult.data ??
            []
          ) as unknown as
            OperationTask[]
        );


        setCommunications(
          (
            communicationResult.data ??
            []
          ) as unknown as
            Communication[]
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
            supplierResult,
            staffResult,
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
                  "id,departure_date,capacity,reserved_count"
                )
                .eq(
                  "tour_id",
                  tourId
                )
                .order(
                  "departure_date"
                ),


              supabase
                .from(
                  "suppliers"
                )
                .select(
                  "id,name,phone,whatsapp_phone,email"
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "is_active",
                  true
                )
                .order(
                  "name"
                ),


              supabase
                .from(
                  "staff_profiles"
                )
                .select(
                  "id,full_name,staff_role,phone"
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "is_active",
                  true
                )
                .order(
                  "full_name"
                ),
            ]);


          const firstError =
            tourResult.error ||
            departureResult.error ||
            supplierResult.error ||
            staffResult.error;


          if (
            firstError
          ) {
            throw firstError;
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


          setSuppliers(
            (
              supplierResult.data ??
              []
            ) as unknown as
              Supplier[]
          );


          setStaff(
            (
              staffResult.data ??
              []
            ) as unknown as
              Staff[]
          );


          if (
            loadedDepartures.length
          ) {

            const today =
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                );


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


  const recipients =
    useMemo<
      RecipientOption[]
    >(
      () => {

        const customerRecipients =
          reservations.map(
            reservation => ({
              key:
                `customer:${reservation.id}`,

              type:
                "customer" as
                  RecipientType,

              reservationId:
                reservation.id,

              supplierId:
                null,

              staffId:
                null,

              name:
                reservation.full_name,

              phone:
                reservation.phone ||
                null,

              email:
                reservation.email ||
                null,

              subtitle:
                `${reservation.reservation_code || "Rezervasyon"} · ${reservation.guests} kişi`,
            })
          );


        const supplierIds =
          new Set(
            supplierCommitments.map(
              item =>
                item.supplier_id
            )
          );


        const supplierRecipients =
          suppliers
            .filter(
              supplier =>
                supplierIds.has(
                  supplier.id
                )
            )
            .map(
              supplier => ({
                key:
                  `supplier:${supplier.id}`,

                type:
                  "supplier" as
                    RecipientType,

                reservationId:
                  null,

                supplierId:
                  supplier.id,

                staffId:
                  null,

                name:
                  supplier.name,

                phone:
                  supplier.whatsapp_phone ||
                  supplier.phone ||
                  null,

                email:
                  supplier.email ||
                  null,

                subtitle:
                  "Tur tedarikçisi",
              })
            );


        const staffIds =
          new Set(
            tasks
              .map(
                item =>
                  item.assignee_staff_id
              )
              .filter(
                Boolean
              ) as string[]
          );


        const staffRecipients =
          staff
            .filter(
              person =>
                staffIds.has(
                  person.id
                )
            )
            .map(
              person => ({
                key:
                  `staff:${person.id}`,

                type:
                  "staff" as
                    RecipientType,

                reservationId:
                  null,

                supplierId:
                  null,

                staffId:
                  person.id,

                name:
                  person.full_name,

                phone:
                  person.phone,

                email:
                  null,

                subtitle:
                  person.staff_role,
              })
            );


        return [
          ...customerRecipients,
          ...supplierRecipients,
          ...staffRecipients,
        ];

      },
      [
        reservations,
        staff,
        supplierCommitments,
        suppliers,
        tasks,
      ]
    );


  const selectedRecipient =
    recipients.find(
      recipient =>
        recipient.key ===
        recipientKey
    ) ??
    null;


  async function changeDeparture(
    departureId:
      string
  ) {

    setSelectedDepartureId(
      departureId
    );


    setRecipientKey(
      ""
    );


    if (
      !companyId
    ) {
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


  function applyTemplate(
    type:
      MessageType
  ) {

    setMessageType(
      type
    );


    const departure =
      departures.find(
        item =>
          item.id ===
          selectedDepartureId
      );


    const date =
      departure
        ? new Date(
            `${departure.departure_date}T00:00:00`
          ).toLocaleDateString(
            "tr-TR"
          )
        : "tur tarihi";


    const tourTitle =
      tour?.title ||
      "turunuz";


    const recipientName =
      selectedRecipient?.name ||
      "Misafirimiz";


    const templates:
      Partial<
        Record<
          MessageType,
          string
        >
      > = {

      tour_reminder:
        `Merhaba ${recipientName}, ${tourTitle} seyahatiniz ${date} tarihinde gerçekleşecektir. Operasyon detaylarını kontrol etmenizi rica ederiz.`,

      boarding_info:
        `Merhaba ${recipientName}, ${tourTitle} için biniş noktası ve saat bilgilerinizi kontrol ediniz. Değişiklik olması halinde ayrıca bilgilendirileceksiniz.`,

      flight_info:
        `Merhaba ${recipientName}, ${tourTitle} uçuş bilgileriniz hazırdır. PNR ve uçuş detaylarını voucher/belge merkezinden kontrol edebilirsiniz.`,

      flight_change:
        `Önemli bilgilendirme: ${tourTitle} uçuş operasyonunda değişiklik bulunmaktadır. Güncel uçuş saati ve PNR bilgisini kontrol ediniz.`,

      voucher:
        `Merhaba ${recipientName}, ${tourTitle} seyahatinize ait voucher ve operasyon belgeleriniz hazırlanmıştır.`,

      supplier_confirmation:
        `${tourTitle} operasyonu için hizmet teyidinizi rica ederiz. Lütfen rezervasyon, kapasite ve hizmet detaylarını kontrol ederek teyit veriniz.`,

      guide_instruction:
        `${tourTitle} operasyonu için görev ve yolcu listesini kontrol ediniz. Biniş, iletişim ve operasyon notları Tur Operasyon Merkezi'nde bulunmaktadır.`,

      delay:
        `Bilgilendirme: ${tourTitle} operasyonunda gecikme yaşanmaktadır. Güncel saat bilgisi tarafınıza ayrıca bildirilecektir.`,

      emergency:
        `ACİL OPERASYON DUYURUSU: ${tourTitle} için önemli bir operasyon güncellemesi bulunmaktadır. Lütfen acilen operasyon ekibiyle iletişime geçiniz.`,

      return_info:
        `${tourTitle} dönüş operasyonu ile ilgili güncel saat ve buluşma bilgilerini kontrol etmenizi rica ederiz.`,
    };


    setMessageBody(
      templates[type] ||
      ""
    );

  }


  async function saveCommunication(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !companyId ||
      !tour ||
      !selectedDepartureId ||
      !selectedRecipient
    ) {

      setError(
        "Alıcı seçimi zorunlu."
      );

      return;

    }


    if (
      !messageBody.trim()
    ) {

      setError(
        "Mesaj içeriği zorunlu."
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
            "tour_operation_communications"
          )
          .insert({

            company_id:
              companyId,

            tour_id:
              tour.id,

            departure_id:
              selectedDepartureId,

            reservation_id:
              selectedRecipient.reservationId,

            supplier_id:
              selectedRecipient.supplierId,

            staff_id:
              selectedRecipient.staffId,

            recipient_type:
              selectedRecipient.type,

            recipient_name:
              selectedRecipient.name,

            recipient_phone:
              selectedRecipient.phone,

            recipient_email:
              selectedRecipient.email,

            channel,

            message_type:
              messageType,

            subject:
              subject.trim() ||
              null,

            message_body:
              messageBody.trim(),

            delivery_status:
              "ready",

            delivery_source:
              "manual",

            scheduled_at:
              scheduledAt
                ? new Date(
                    scheduledAt
                  ).toISOString()
                : null,

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


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Operasyon mesajı hazırlandı. Provider gönderimi yapılmış sayılmadı."
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


  async function markManualSent(
    communication:
      Communication
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
            "tour_operation_communications"
          )
          .update({

            delivery_status:
              "sent",

            delivery_source:
              "manual",

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
            communication.id
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
        "Mesaj manuel gönderildi olarak işaretlendi."
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


  async function deleteCommunication(
    communication:
      Communication
  ) {

    if (
      !window.confirm(
        "Bu operasyon mesaj kaydını silmek istediğinize emin misiniz?"
      )
    ) {
      return;
    }


    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "tour_operation_communications"
        )
        .delete()
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          communication.id
        );


    if (
      deleteError
    ) {

      setError(
        deleteError.message
      );

      return;

    }


    await loadDepartureData(
      companyId,
      selectedDepartureId
    );

  }


  const readyCount =
    communications.filter(
      item =>
        item.delivery_status ===
        "ready"
    ).length;


  const queuedCount =
    communications.filter(
      item =>
        item.delivery_status ===
        "queued"
    ).length;


  const sentCount =
    communications.filter(
      item =>
        [
          "sent",
          "delivered",
          "read",
        ].includes(
          item.delivery_status
        )
    ).length;


  const failedCount =
    communications.filter(
      item =>
        item.delivery_status ===
        "failed"
    ).length;


  const scheduledCount =
    communications.filter(
      item =>
        Boolean(
          item.scheduled_at
        ) &&
        ![
          "sent",
          "delivered",
          "read",
          "cancelled",
        ].includes(
          item.delivery_status
        )
    ).length;


  const visibleCommunications =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return communications.filter(
          item => {

            if (
              statusFilter !==
                "all" &&
              item.delivery_status !==
                statusFilter
            ) {
              return false;
            }


            if (
              query &&
              ![
                item.recipient_name,
                item.recipient_phone,
                item.recipient_email,
                item.message_body,
                item.subject,
                messageTypeLabels[
                  item.message_type
                ],
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
        communications,
        search,
        statusFilter,
      ]
    );


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        İletişim merkezi yükleniyor...
      </main>
    );

  }


  return (
    <main data-tour-visual-final data-tour-os-screen="communication-center" className="min-h-screen bg-[#030a11] text-white">

      <TourExecutiveChrome
        tourId={tourId}
        moduleKey="messages"
      />


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
            href="/dashboard/musteri-360"
            className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-2.5 text-[8px] font-black text-slate-400"
          >
            Customer 360
          </Link>

        </div>


        <section className="mt-4 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_36%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.14em] text-orange-300">
                <FaPaperPlane />
                TUR İLETİŞİM MERKEZİ
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-3 text-[8px] text-slate-500">
                Müşteri, tedarikçi ve operasyon personeli iletişimi
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

              {departures.map(
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


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">
            <div className="text-[7px] font-black text-slate-600">
              HAZIR
            </div>
            <div className="mt-3 text-3xl font-black">
              {readyCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-amber-500/15 bg-amber-500/[.04] p-5">
            <div className="text-[7px] font-black text-amber-300">
              KUYRUKTA
            </div>
            <div className="mt-3 text-3xl font-black">
              {queuedCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-emerald-500/15 bg-emerald-500/[.04] p-5">
            <div className="text-[7px] font-black text-emerald-300">
              GÖNDERİLEN
            </div>
            <div className="mt-3 text-3xl font-black">
              {sentCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-red-500/15 bg-red-500/[.04] p-5">
            <div className="text-[7px] font-black text-red-300">
              HATA
            </div>
            <div className="mt-3 text-3xl font-black">
              {failedCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-blue-500/15 bg-blue-500/[.04] p-5">
            <div className="text-[7px] font-black text-blue-300">
              PLANLANAN
            </div>
            <div className="mt-3 text-3xl font-black">
              {scheduledCount}
            </div>
          </article>

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[430px_1fr]">

          <form
            onSubmit={
              saveCommunication
            }
            className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaPlus className="text-orange-300" />
              Yeni Operasyon Mesajı
            </div>


            <div className="mt-2 text-[7px] leading-5 text-slate-600">
              Burada mesaj hazırlanır. Gerçek provider sonucu olmadan otomatik gönderildi kabul edilmez.
            </div>


            <div className="mt-5 grid gap-3">

              <select
                value={
                  recipientKey
                }
                onChange={event =>
                  setRecipientKey(
                    event.target.value
                  )
                }
                className="h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              >

                <option value="">
                  Alıcı seç
                </option>

                {recipients.map(
                  recipient => (
                    <option
                      key={
                        recipient.key
                      }
                      value={
                        recipient.key
                      }
                    >
                      {recipient.name}
                      {" · "}
                      {recipient.subtitle}
                    </option>
                  )
                )}

              </select>


              <div className="grid grid-cols-2 gap-3">

                <select
                  value={
                    channel
                  }
                  onChange={event =>
                    setChannel(
                      event.target.value as
                        Channel
                    )
                  }
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[8px]"
                >

                  {(
                    Object.keys(
                      channelLabels
                    ) as
                      Channel[]
                  ).map(
                    item => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {channelLabels[
                          item
                        ]}
                      </option>
                    )
                  )}

                </select>


                <select
                  value={
                    messageType
                  }
                  onChange={event =>
                    applyTemplate(
                      event.target.value as
                        MessageType
                    )
                  }
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                >

                  {(
                    Object.keys(
                      messageTypeLabels
                    ) as
                      MessageType[]
                  ).map(
                    item => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {messageTypeLabels[
                          item
                        ]}
                      </option>
                    )
                  )}

                </select>

              </div>


              <div className="grid grid-cols-2 gap-2">

                {[
                  "tour_reminder",
                  "boarding_info",
                  "flight_change",
                  "voucher",
                  "supplier_confirmation",
                  "emergency",
                ].map(
                  type => (
                    <button
                      key={
                        type
                      }
                      type="button"
                      onClick={() =>
                        applyTemplate(
                          type as
                            MessageType
                        )
                      }
                      className="rounded-lg border border-white/[.08] bg-[#03080e] px-3 py-2 text-[7px] font-black text-slate-400"
                    >
                      {messageTypeLabels[
                        type as
                          MessageType
                      ]}
                    </button>
                  )
                )}

              </div>


              <input
                value={
                  subject
                }
                onChange={event =>
                  setSubject(
                    event.target.value
                  )
                }
                placeholder="Konu (e-posta için)"
                className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />


              <textarea
                rows={7}
                value={
                  messageBody
                }
                onChange={event =>
                  setMessageBody(
                    event.target.value
                  )
                }
                placeholder="Mesaj içeriği"
                className="rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px] leading-5"
              />


              <label className="space-y-1">

                <span className="text-[7px] font-black text-slate-600">
                  PLANLANAN ZAMAN
                </span>

                <input
                  type="datetime-local"
                  value={
                    scheduledAt
                  }
                  onChange={event =>
                    setScheduledAt(
                      event.target.value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                />

              </label>


              <button
                type="submit"
                disabled={
                  busy
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black disabled:opacity-40"
              >
                <FaPaperPlane />
                Mesajı Hazırla
              </button>


              {selectedRecipient &&
                channel ===
                  "whatsapp" &&
                selectedRecipient.phone && (

                <a
                  href={`https://wa.me/${phoneDigits(
                    selectedRecipient.phone
                  )}?text=${encodeURIComponent(
                    messageBody
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] text-[8px] font-black text-emerald-300"
                >
                  <FaWhatsapp />
                  WhatsApp'ta Aç
                </a>

              )}


              {selectedRecipient &&
                channel ===
                  "email" &&
                selectedRecipient.email && (

                <a
                  href={`mailto:${selectedRecipient.email}?subject=${encodeURIComponent(
                    subject
                  )}&body=${encodeURIComponent(
                    messageBody
                  )}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[.06] text-[8px] font-black text-blue-300"
                >
                  <FaEnvelope />
                  E-postada Aç
                </a>

              )}

            </div>

          </form>


          <section className="space-y-4">

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
                    placeholder="Alıcı veya mesaj ara..."
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
                    Tüm Durumlar
                  </option>

                  {(
                    Object.keys(
                      deliveryLabels
                    ) as
                      DeliveryStatus[]
                  ).map(
                    item => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {deliveryLabels[
                          item
                        ]}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>


            <div className="space-y-3">

              {visibleCommunications.length ===
              0 ? (

                <div className="rounded-[22px] border border-dashed border-white/10 bg-[#07131f] p-10 text-center">

                  <FaPaperPlane className="mx-auto text-3xl text-slate-800" />

                  <div className="mt-4 text-[8px] font-black">
                    Operasyon mesajı yok
                  </div>

                </div>

              ) : (

                visibleCommunications.map(
                  item => {

                    const whatsappLink =
                      item.recipient_phone
                        ? `https://wa.me/${phoneDigits(
                            item.recipient_phone
                          )}?text=${encodeURIComponent(
                            item.message_body
                          )}`
                        : null;


                    const emailLink =
                      item.recipient_email
                        ? `mailto:${item.recipient_email}?subject=${encodeURIComponent(
                            item.subject ||
                            ""
                          )}&body=${encodeURIComponent(
                            item.message_body
                          )}`
                        : null;


                    return (
                      <article
                        key={
                          item.id
                        }
                        className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
                      >

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="rounded-full border border-white/10 bg-white/[.025] px-2.5 py-1 text-[7px] font-black text-slate-400">
                                {channelLabels[
                                  item.channel
                                ]}
                              </span>


                              <span className="rounded-full border border-orange-500/20 bg-orange-500/[.05] px-2.5 py-1 text-[7px] font-black text-orange-300">
                                {messageTypeLabels[
                                  item.message_type
                                ]}
                              </span>


                              <span
                                className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${
                                  item.delivery_status ===
                                  "failed"
                                    ? "border-red-500/20 bg-red-500/[.06] text-red-300"
                                    : [
                                        "sent",
                                        "delivered",
                                        "read",
                                      ].includes(
                                        item.delivery_status
                                      )
                                      ? "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300"
                                      : "border-amber-500/20 bg-amber-500/[.06] text-amber-300"
                                }`}
                              >
                                {deliveryLabels[
                                  item.delivery_status
                                ]}
                              </span>

                            </div>


                            <div className="mt-3 text-[10px] font-black">
                              {item.recipient_name}
                            </div>


                            <div className="mt-2 max-w-4xl whitespace-pre-wrap text-[8px] leading-5 text-slate-500">
                              {item.message_body}
                            </div>


                            <div className="mt-4 flex flex-wrap gap-4 text-[7px] text-slate-600">

                              <span>
                                Oluşturma:{" "}
                                {formatDate(
                                  item.created_at
                                )}
                              </span>


                              {item.scheduled_at && (
                                <span>
                                  Plan:{" "}
                                  {formatDate(
                                    item.scheduled_at
                                  )}
                                </span>
                              )}


                              {item.sent_at && (
                                <span>
                                  Gönderim:{" "}
                                  {formatDate(
                                    item.sent_at
                                  )}
                                </span>
                              )}

                            </div>


                            {item.provider_error && (
                              <div className="mt-3 flex items-center gap-2 text-[7px] font-black text-red-300">
                                <FaExclamationTriangle />
                                {item.provider_error}
                              </div>
                            )}

                          </div>


                          <div className="flex shrink-0 flex-wrap gap-2">

                            {item.channel ===
                              "whatsapp" &&
                              whatsappLink && (

                              <a
                                href={
                                  whatsappLink
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-500/20 text-emerald-300"
                              >
                                <FaWhatsapp />
                              </a>

                            )}


                            {item.channel ===
                              "email" &&
                              emailLink && (

                              <a
                                href={
                                  emailLink
                                }
                                className="grid h-9 w-9 place-items-center rounded-lg border border-blue-500/20 text-blue-300"
                              >
                                <FaEnvelope />
                              </a>

                            )}


                            {item.recipient_phone && (

                              <a
                                href={`tel:${item.recipient_phone}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400"
                              >
                                <FaPhone />
                              </a>

                            )}


                            {[
                              "ready",
                              "queued",
                            ].includes(
                              item.delivery_status
                            ) && (

                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void markManualSent(
                                    item
                                  )
                                }
                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/[.05] px-3 text-[7px] font-black text-emerald-300"
                              >
                                <FaCheckCircle />
                                Manuel Gönderildi
                              </button>

                            )}


                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void deleteCommunication(
                                  item
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.05] text-red-300"
                            >
                              <FaTrash />
                            </button>

                          </div>

                        </div>

                      </article>
                    );

                  }
                )

              )}

            </div>

          </section>

        </section>


        <section className="mt-5 grid gap-4 xl:grid-cols-3">

          <Link
            href={`/dashboard/turlar/${tourId}/belgeler`}
            className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >
            <FaExternalLinkAlt className="text-blue-300" />

            <div className="mt-4 text-[9px] font-black">
              Belge & Voucher
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Mesajda paylaşılacak voucher ve operasyon belgelerini kontrol et
            </div>
          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/gorevler`}
            className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >
            <FaUserTie className="text-orange-300" />

            <div className="mt-4 text-[9px] font-black">
              Görev & Personel
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Sorumlu operasyon personellerini kontrol et
            </div>
          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/tedarikciler`}
            className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
          >
            <FaUsers className="text-violet-300" />

            <div className="mt-4 text-[9px] font-black">
              Tedarikçiler
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              Tedarikçi teyitleri ve iletişim bilgileri
            </div>
          </Link>

        </section>

      </div>

    </main>
  );
}


<style jsx global>{`
  [data-tour-visual-final] {
    min-height: 100vh;
  }

  [data-tour-visual-final] table {
    border-collapse: separate;
    border-spacing: 0;
  }

  [data-tour-visual-final] thead {
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(14px);
  }

  [data-tour-visual-final] tbody tr {
    transition:
      background-color .16s ease,
      border-color .16s ease;
  }

  [data-tour-visual-final] tbody tr:hover {
    background: rgba(255,255,255,.025);
  }

  [data-tour-visual-final] input,
  [data-tour-visual-final] select,
  [data-tour-visual-final] textarea {
    outline: none;
  }

  [data-tour-visual-final] input:focus,
  [data-tour-visual-final] select:focus,
  [data-tour-visual-final] textarea:focus {
    border-color: rgba(249,115,22,.42);
    box-shadow:
      0 0 0 3px rgba(249,115,22,.06);
  }

  [data-tour-visual-final] button,
  [data-tour-visual-final] a {
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 768px) {
    [data-tour-visual-final] {
      padding-bottom: 86px;
    }

    [data-tour-executive-chrome] {
      border-radius: 22px;
    }
  }
`}</style>

// TOUR_VISUAL_FINAL_MESSAGES
