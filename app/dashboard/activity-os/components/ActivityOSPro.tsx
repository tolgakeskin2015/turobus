"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowRight,
  FaCalendarAlt,
  FaCashRegister,
  FaChartLine,
  FaCheck,
  FaClipboardList,
  FaCog,
  FaExternalLinkAlt,
  FaGlobe,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaStar,
  FaStore,
  FaTasks,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";


type Section =
  | "overview"
  | "calendar"
  | "bookings"
  | "products"
  | "operations"
  | "guests"
  | "partners"
  | "staff"
  | "finance"
  | "marketplace"
  | "reports"
  | "settings";


type Activity = {
  id: string;
  name: string;
  category: string;
  city: string | null;
  district: string | null;
  short_description: string | null;
  description: string | null;
  meeting_point: string | null;
  cover_image_url: string | null;
  gallery_image_urls: string[];
  highlights: string[];
  included_items: string[];
  excluded_items: string[];
  important_notes: string | null;
  min_age: number | null;
  max_age: number | null;
  min_weight: number | null;
  max_weight: number | null;
  difficulty_level: string | null;
  cancellation_policy: string | null;
  meeting_instructions: string | null;
  preparation_notes: string | null;
  pricing_unit: string;
  default_cost: number;
  default_sale_price: number | null;
  currency: string;
  duration_minutes: number | null;
  requires_slot: boolean;
  is_active: boolean;
};


type Slot = {
  id: string;
  activity_id: string;
  activity_name?: string;
  slot_date: string;
  start_time: string | null;
  end_time?: string | null;
  capacity: number;
  reserved_count: number;
  remaining_count?: number;
  occupancy_percent?: number;
  sale_price: number | null;
  currency: string;
  status: string;
  notes?: string | null;
};


type Booking = {
  id: string;
  booking_code: string;
  activity_id: string;
  slot_id: string | null;
  seller_id: string | null;

  source_channel: string;

  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;

  service_date: string;
  start_time: string | null;

  quantity: number;

  sale_total: number;
  paid_total: number;

  payment_status: string;
  status: string;

  hotel_name: string | null;
  room_no: string | null;

  pickup_required: boolean;
  pickup_location: string | null;

  special_notes: string | null;

  guest_token: string;
};


type Seller = {
  id: string;
  seller_type: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  commission_type: string;
  commission_value: number;
  is_active: boolean;
};


type Staff = {
  id: string;
  full_name: string;
  staff_type: string;
  phone: string | null;
  license_no: string | null;
  is_active: boolean;
};


type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  supplier_name: string | null;
};


type FinanceRow = {
  booking_id: string;
  gross_sale: number;
  internal_cost: number;
  seller_commission: number;
  turobus_commission: number;
  net_profit: number;
};


const menu: Array<{
  key: Section;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}> = [
  {
    key: "overview",
    label: "Genel Bakış",
    icon: FaChartLine,
  },
  {
    key: "calendar",
    label: "Takvim & Slot",
    icon: FaCalendarAlt,
  },
  {
    key: "bookings",
    label: "Rezervasyonlar",
    icon: FaClipboardList,
  },
  {
    key: "products",
    label: "Aktiviteler",
    icon: FaStar,
  },
  {
    key: "operations",
    label: "Operasyon",
    icon: FaTasks,
  },
  {
    key: "guests",
    label: "Misafirler",
    icon: FaUsers,
  },
  {
    key: "partners",
    label: "Satışçı & Partner",
    icon: FaUserPlus,
  },
  {
    key: "staff",
    label: "Personel & Ekip",
    icon: FaUsers,
  },
  {
    key: "finance",
    label: "Finans",
    icon: FaMoneyBillWave,
  },
  {
    key: "marketplace",
    label: "Marketplace",
    icon: FaStore,
  },
  {
    key: "reports",
    label: "Raporlar",
    icon: FaChartLine,
  },
  {
    key: "settings",
    label: "Ayarlar",
    icon: FaCog,
  },
];


function money(
  amount:
    | number
    | null
    | undefined,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      amount ?? 0
    )
  );
}


function today() {
  const date =
    new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}


function monthDates(
  base: Date
) {
  const year =
    base.getFullYear();

  const month =
    base.getMonth();

  const first =
    new Date(
      year,
      month,
      1
    );

  const last =
    new Date(
      year,
      month + 1,
      0
    );

  const result: Array<
    Date | null
  > = [];

  const offset =
    (
      first.getDay() +
      6
    ) %
    7;

  for (
    let i = 0;
    i < offset;
    i += 1
  ) {
    result.push(
      null
    );
  }

  for (
    let day = 1;
    day <=
    last.getDate();
    day += 1
  ) {
    result.push(
      new Date(
        year,
        month,
        day
      )
    );
  }

  while (
    result.length %
      7 !==
    0
  ) {
    result.push(
      null
    );
  }

  return result;
}


function dateKey(
  value: Date
) {
  return [
    value.getFullYear(),
    String(
      value.getMonth() +
        1
    ).padStart(
      2,
      "0"
    ),
    String(
      value.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}

function splitLines(
  value: string
) {
  return value
    .split("\n")
    .map(
      (
        item
      ) =>
        item.trim()
    )
    .filter(Boolean);
}


export default function ActivityOSPro({
  section,
}: {
  section: Section;
}) {

  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );


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
    message,
    setMessage,
  ] =
    useState("");


  const [
    activities,
    setActivities,
  ] =
    useState<Activity[]>(
      []
    );


  const [
    slots,
    setSlots,
  ] =
    useState<Slot[]>(
      []
    );


  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>(
      []
    );


  const [
    sellers,
    setSellers,
  ] =
    useState<Seller[]>(
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
    expenses,
    setExpenses,
  ] =
    useState<Expense[]>(
      []
    );


  const [
    financeRows,
    setFinanceRows,
  ] =
    useState<FinanceRow[]>(
      []
    );


  const [
    dashboard,
    setDashboard,
  ] =
    useState<Record<
      string,
      any
    >>({});


  const [
    marketResources,
    setMarketResources,
  ] =
    useState<
      Array<{
        source_id: string;
        marketplace_enabled: boolean;
      }>
    >([]);


  const [
    month,
    setMonth,
  ] =
    useState(
      new Date()
    );


  // -------------------------------------------------------
  // PRODUCT FORM
  // -------------------------------------------------------

  const [
    activityName,
    setActivityName,
  ] =
    useState("");


  const [
    activityCategory,
    setActivityCategory,
  ] =
    useState(
      "activity"
    );


  const [
    activityCity,
    setActivityCity,
  ] =
    useState("");


  const [
    activityDistrict,
    setActivityDistrict,
  ] =
    useState("");


  const [
    activityPrice,
    setActivityPrice,
  ] =
    useState("");


  const [
    activityCost,
    setActivityCost,
  ] =
    useState("");


  const [
    activityDuration,
    setActivityDuration,
  ] =
    useState("");


  const [
    activityShortDescription,
    setActivityShortDescription,
  ] =
    useState("");


  const [
    activityDescription,
    setActivityDescription,
  ] =
    useState("");


  const [
    activityMeetingPoint,
    setActivityMeetingPoint,
  ] =
    useState("");


  const [
    activityHighlights,
    setActivityHighlights,
  ] =
    useState("");


  const [
    activityIncluded,
    setActivityIncluded,
  ] =
    useState("");


  const [
    activityExcluded,
    setActivityExcluded,
  ] =
    useState("");


  const [
    activityImportantNotes,
    setActivityImportantNotes,
  ] =
    useState("");


  const [
    activityMinAge,
    setActivityMinAge,
  ] =
    useState("");


  const [
    activityMaxAge,
    setActivityMaxAge,
  ] =
    useState("");


  const [
    activityMinWeight,
    setActivityMinWeight,
  ] =
    useState("");


  const [
    activityMaxWeight,
    setActivityMaxWeight,
  ] =
    useState("");


  const [
    activityDifficulty,
    setActivityDifficulty,
  ] =
    useState("easy");


  const [
    activityCancellation,
    setActivityCancellation,
  ] =
    useState("");


  const [
    activityMeetingInstructions,
    setActivityMeetingInstructions,
  ] =
    useState("");


  const [
    activityPreparationNotes,
    setActivityPreparationNotes,
  ] =
    useState("");


  const [
    activityCoverFile,
    setActivityCoverFile,
  ] =
    useState<File | null>(
      null
    );


  const [
    activityGalleryFiles,
    setActivityGalleryFiles,
  ] =
    useState<File[]>(
      []
    );


  // -------------------------------------------------------
  // SLOT FORM
  // -------------------------------------------------------

  const [
    slotActivity,
    setSlotActivity,
  ] =
    useState("");


  const [
    slotDate,
    setSlotDate,
  ] =
    useState(
      today()
    );


  const [
    slotTime,
    setSlotTime,
  ] =
    useState(
      "09:00"
    );


  const [
    slotCapacity,
    setSlotCapacity,
  ] =
    useState(
      "10"
    );


  const [
    slotPrice,
    setSlotPrice,
  ] =
    useState("");


  const [
    slotEndTime,
    setSlotEndTime,
  ] =
    useState(
      "11:00"
    );


  const [
    slotNotes,
    setSlotNotes,
  ] =
    useState("");


  // -------------------------------------------------------
  // BOOKING FORM
  // -------------------------------------------------------

  const [
    bookingActivity,
    setBookingActivity,
  ] =
    useState("");


  const [
    bookingSlot,
    setBookingSlot,
  ] =
    useState("");


  const [
    bookingCustomer,
    setBookingCustomer,
  ] =
    useState("");


  const [
    bookingPhone,
    setBookingPhone,
  ] =
    useState("");


  const [
    bookingEmail,
    setBookingEmail,
  ] =
    useState("");


  const [
    bookingQuantity,
    setBookingQuantity,
  ] =
    useState("1");


  const [
    bookingSource,
    setBookingSource,
  ] =
    useState(
      "direct"
    );


  const [
    bookingSeller,
    setBookingSeller,
  ] =
    useState("");


  const [
    bookingSale,
    setBookingSale,
  ] =
    useState("");


  const [
    bookingPaid,
    setBookingPaid,
  ] =
    useState("");


  const [
    bookingHotel,
    setBookingHotel,
  ] =
    useState("");


  const [
    bookingPickup,
    setBookingPickup,
  ] =
    useState("");


  // -------------------------------------------------------
  // SELLER FORM
  // -------------------------------------------------------

  const [
    sellerName,
    setSellerName,
  ] =
    useState("");


  const [
    sellerType,
    setSellerType,
  ] =
    useState(
      "hotel"
    );


  const [
    sellerContact,
    setSellerContact,
  ] =
    useState("");


  const [
    sellerPhone,
    setSellerPhone,
  ] =
    useState("");


  const [
    sellerEmail,
    setSellerEmail,
  ] =
    useState("");


  const [
    sellerCommissionType,
    setSellerCommissionType,
  ] =
    useState(
      "percent"
    );


  const [
    sellerCommission,
    setSellerCommission,
  ] =
    useState("");


  const [
    inviteSeller,
    setInviteSeller,
  ] =
    useState("");


  const [
    inviteEmail,
    setInviteEmail,
  ] =
    useState("");


  const [
    inviteName,
    setInviteName,
  ] =
    useState("");


  // -------------------------------------------------------
  // STAFF FORM
  // -------------------------------------------------------

  const [
    staffName,
    setStaffName,
  ] =
    useState("");


  const [
    staffType,
    setStaffType,
  ] =
    useState(
      "pilot"
    );


  const [
    staffPhone,
    setStaffPhone,
  ] =
    useState("");


  const [
    staffLicense,
    setStaffLicense,
  ] =
    useState("");


  // -------------------------------------------------------
  // FINANCE
  // -------------------------------------------------------

  const [
    expenseCategory,
    setExpenseCategory,
  ] =
    useState(
      "operasyon"
    );


  const [
    expenseDescription,
    setExpenseDescription,
  ] =
    useState("");


  const [
    expenseAmount,
    setExpenseAmount,
  ] =
    useState("");


  const [
    paymentBooking,
    setPaymentBooking,
  ] =
    useState("");


  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState("");


  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState(
      "cash"
    );


  const canFinance =
    membership
      ? [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ].includes(
          membership.role
        )
      : false;


  const canManage =
    membership
      ? [
          "super_admin",
          "company_owner",
          "operation_manager",
        ].includes(
          membership.role
        )
      : false;


  const load =
    useCallback(
      async (
        companyId: string
      ) => {

        setLoading(
          true
        );

        setError("");


        const start =
          new Date();

        start.setDate(
          start.getDate() -
            30
        );


        const end =
          new Date();

        end.setDate(
          end.getDate() +
            90
        );


        const [
          activitiesResult,
          slotsResult,
          bookingsResult,
          sellersResult,
          staffResult,
          dashboardResult,
          networkResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "package_activities"
              )
              .select(
                "id,name,category,city,district,short_description,description,meeting_point,cover_image_url,gallery_image_urls,highlights,included_items,excluded_items,important_notes,min_age,max_age,min_weight,max_weight,difficulty_level,cancellation_policy,meeting_instructions,preparation_notes,pricing_unit,default_cost,default_sale_price,currency,duration_minutes,requires_slot,is_active"
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "name"
              ),

            supabase.rpc(
              "get_activity_os_calendar",
              {
                p_company_id:
                  companyId,

                p_from:
                  dateKey(
                    start
                  ),

                p_to:
                  dateKey(
                    end
                  ),
              }
            ),

            supabase
              .from(
                "activity_os_bookings"
              )
              .select(
                "id,booking_code,activity_id,slot_id,seller_id,source_channel,customer_name,customer_phone,customer_email,service_date,start_time,quantity,sale_total,paid_total,payment_status,status,hotel_name,room_no,pickup_required,pickup_location,special_notes,guest_token"
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "service_date",
                {
                  ascending:
                    false,
                }
              )
              .limit(
                500
              ),

            supabase
              .from(
                "activity_os_sellers"
              )
              .select(
                "id,seller_type,name,contact_name,phone,email,commission_type,commission_value,is_active"
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "name"
              ),

            supabase
              .from(
                "activity_network_staff"
              )
              .select(
                "id,full_name,staff_type,phone,license_no,is_active"
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "full_name"
              ),

            supabase.rpc(
              "get_activity_os_dashboard",
              {
                p_company_id:
                  companyId,

                p_from:
                  today(),

                p_to:
                  today(),
              }
            ),

            supabase
              .from(
                "turobus_network_resources"
              )
              .select(
                "source_id,marketplace_enabled"
              )
              .eq(
                "owner_company_id",
                companyId
              )
              .eq(
                "source_system",
                "activity_os"
              ),
          ]);


        if (
          activitiesResult.error
        ) {
          throw activitiesResult.error;
        }

        if (
          slotsResult.error
        ) {
          throw slotsResult.error;
        }

        if (
          bookingsResult.error
        ) {
          throw bookingsResult.error;
        }

        if (
          sellersResult.error
        ) {
          throw sellersResult.error;
        }

        if (
          staffResult.error
        ) {
          throw staffResult.error;
        }


        setActivities(
          (
            activitiesResult.data ??
            []
          ) as Activity[]
        );


        setSlots(
          (
            slotsResult.data ??
            []
          ).map(
            (item: any) => ({
              ...item,
              id:
                item.id,
              activity_id:
                item.activity_id,
              reserved_count:
                Number(
                  item.reserved_count ??
                  0
                ),
              remaining_count:
                Number(
                  item.remaining_count ??
                  0
                ),
              occupancy_percent:
                Number(
                  item.occupancy_percent ??
                  0
                ),
              capacity:
                Number(
                  item.capacity ??
                  0
                ),
            })
          ) as Slot[]
        );


        setBookings(
          (
            bookingsResult.data ??
            []
          ) as Booking[]
        );


        setSellers(
          (
            sellersResult.data ??
            []
          ) as Seller[]
        );


        setStaff(
          (
            staffResult.data ??
            []
          ) as Staff[]
        );


        setDashboard(
          (
            dashboardResult.data ??
            {}
          ) as Record<
            string,
            any
          >
        );


        setMarketResources(
          (
            networkResult.data ??
            []
          ) as Array<{
            source_id: string;
            marketplace_enabled: boolean;
          }>
        );


        if (
          canFinance
        ) {

          const [
            expensesResult,
            financeResult,
          ] =
            await Promise.all([
              supabase
                .from(
                  "activity_os_expenses"
                )
                .select(
                  "id,expense_date,category,description,amount,currency,supplier_name"
                )
                .eq(
                  "company_id",
                  companyId
                )
                .order(
                  "expense_date",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  200
                ),

              supabase
                .from(
                  "activity_os_booking_finance"
                )
                .select(
                  "booking_id,gross_sale,internal_cost,seller_commission,turobus_commission,net_profit"
                )
                .eq(
                  "company_id",
                  companyId
                ),
            ]);


          if (
            !expensesResult.error
          ) {
            setExpenses(
              (
                expensesResult.data ??
                []
              ) as Expense[]
            );
          }


          if (
            !financeResult.error
          ) {
            setFinanceRows(
              (
                financeResult.data ??
                []
              ) as FinanceRow[]
            );
          }

        }


        setLoading(
          false
        );

      },
      [
        canFinance,
      ]
    );


  useEffect(
    () => {

      async function init() {

        try {

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();


          if (!user) {
            return;
          }


          const current =
            await getCurrentMembership(
              user.id
            );


          if (!current) {
            return;
          }


          setMembership(
            current
          );


          await load(
            current.company_id
          );

        } catch (
          err
        ) {

          setError(
            err instanceof Error
              ? err.message
              : "Activity OS yüklenemedi."
          );

          setLoading(
            false
          );

        }

      }


      void init();

    },
    [
      load,
    ]
  );


  function activityNameById(
    id: string
  ) {
    return (
      activities.find(
        (
          item
        ) =>
          item.id === id
      )?.name ??
      "Aktivite"
    );
  }


  async function refresh() {

    if (
      membership
    ) {
      await load(
        membership.company_id
      );
    }

  }


  async function uploadActivityFile(
    file: File,
    folder: string
  ) {

    if (!membership) {
      throw new Error(
        "Firma bilgisi bulunamadı."
      );
    }


    const safeName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );


    const path =
      `${membership.company_id}/${folder}/${crypto.randomUUID()}-${safeName}`;


    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "activity-media"
        )
        .upload(
          path,
          file,
          {
            upsert:
              false,
          }
        );


    if (
      uploadError
    ) {
      throw uploadError;
    }


    const {
      data:
        publicData,
    } =
      supabase.storage
        .from(
          "activity-media"
        )
        .getPublicUrl(
          path
        );


    return publicData.publicUrl;

  }


  async function createActivity(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !activityName.trim()
    ) {
      return;
    }


    setError("");
    setMessage("");


    let coverImageUrl:
      string | null =
        null;


    const galleryImageUrls:
      string[] =
        [];


    try {

      if (
        activityCoverFile
      ) {
        coverImageUrl =
          await uploadActivityFile(
            activityCoverFile,
            "cover"
          );
      }


      for (
        const file
        of activityGalleryFiles
      ) {

        galleryImageUrls.push(
          await uploadActivityFile(
            file,
            "gallery"
          )
        );

      }

    } catch (
      uploadError
    ) {

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Fotoğraf yüklenemedi."
      );

      return;

    }


    const {
      error:
        saveError,
    } =
      await supabase
        .from(
          "package_activities"
        )
        .insert({
          company_id:
            membership.company_id,

          name:
            activityName.trim(),

          category:
            activityCategory,

          city:
            activityCity.trim() ||
            null,

          district:
            activityDistrict.trim() ||
            null,

          short_description:
            activityShortDescription.trim() ||
            null,

          description:
            activityDescription.trim() ||
            null,

          meeting_point:
            activityMeetingPoint.trim() ||
            null,

          highlights:
            splitLines(
              activityHighlights
            ),

          included_items:
            splitLines(
              activityIncluded
            ),

          excluded_items:
            splitLines(
              activityExcluded
            ),

          important_notes:
            activityImportantNotes.trim() ||
            null,

          min_age:
            activityMinAge
              ? Number(
                  activityMinAge
                )
              : null,

          max_age:
            activityMaxAge
              ? Number(
                  activityMaxAge
                )
              : null,

          min_weight:
            activityMinWeight
              ? Number(
                  activityMinWeight
                )
              : null,

          max_weight:
            activityMaxWeight
              ? Number(
                  activityMaxWeight
                )
              : null,

          difficulty_level:
            activityDifficulty ||
            null,

          cancellation_policy:
            activityCancellation.trim() ||
            null,

          meeting_instructions:
            activityMeetingInstructions.trim() ||
            null,

          preparation_notes:
            activityPreparationNotes.trim() ||
            null,

          cover_image_url:
            coverImageUrl,

          gallery_image_urls:
            galleryImageUrls,

          pricing_unit:
            "per_person",

          default_cost:
            Number(
              activityCost ||
              0
            ),

          default_sale_price:
            Number(
              activityPrice ||
              0
            ),

          currency:
            "TRY",

          duration_minutes:
            activityDuration
              ? Number(
                  activityDuration
                )
              : null,

          requires_slot:
            true,

          is_active:
            true,
        });


    if (
      saveError
    ) {

      setError(
        saveError.message
      );

      return;
    }


    setActivityName("");
    setActivityPrice("");
    setActivityCost("");
    setActivityDuration("");
    setActivityShortDescription("");
    setActivityDescription("");
    setActivityMeetingPoint("");
    setActivityHighlights("");
    setActivityIncluded("");
    setActivityExcluded("");
    setActivityImportantNotes("");
    setActivityMinAge("");
    setActivityMaxAge("");
    setActivityMinWeight("");
    setActivityMaxWeight("");
    setActivityDifficulty("easy");
    setActivityCancellation("");
    setActivityMeetingInstructions("");
    setActivityPreparationNotes("");
    setActivityCoverFile(null);
    setActivityGalleryFiles([]);

    setMessage(
      "Aktivite oluşturuldu."
    );

    await refresh();

  }


  async function createSlot(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !slotActivity ||
      !slotDate
    ) {
      return;
    }


    const activity =
      activities.find(
        (
          item
        ) =>
          item.id ===
          slotActivity
      );


    const {
      error:
        saveError,
    } =
      await supabase.rpc(
        "activity_os_save_slot",
        {
          p_company_id:
            membership.company_id,

          p_activity_id:
            slotActivity,

          p_slot_date:
            slotDate,

          p_start_time:
            slotTime,

          p_end_time:
            slotEndTime ||
            null,

          p_capacity:
            Number(
              slotCapacity ||
              0
            ),

          p_sale_price:
            slotPrice
              ? Number(
                  slotPrice
                )
              : activity?.default_sale_price ??
                0,

          p_notes:
            slotNotes.trim() ||
            null,
        }
      );


    if (
      saveError
    ) {
      setError(
        saveError.message
      );
      return;
    }


    setMessage(
      "Slot oluşturuldu / güncellendi."
    );

    await refresh();

  }


  async function createBooking(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !bookingActivity ||
      !bookingCustomer.trim()
    ) {
      return;
    }

    if (!bookingSlot) {
      setError("Rezervasyon için tarih ve saat slotu seçmek zorunludur.");
      return;
    }


    setError("");
    setMessage("");


    const {
      data,
      error:
        bookingError,
    } =
      await supabase.rpc(
        "activity_os_create_booking",
        {
          p_company_id:
            membership.company_id,

          p_activity_id:
            bookingActivity,

          p_slot_id:
            bookingSlot ||
            null,

          p_customer_name:
            bookingCustomer.trim(),

          p_customer_phone:
            bookingPhone.trim() ||
            null,

          p_customer_email:
            bookingEmail.trim() ||
            null,

          p_quantity:
            Number(
              bookingQuantity ||
              1
            ),

          p_source_channel:
            bookingSource,

          p_seller_id:
            bookingSeller ||
            null,

          p_sale_total:
            Number(
              bookingSale ||
              0
            ),

          p_paid_total:
            Number(
              bookingPaid ||
              0
            ),

          p_payment_method:
            "cash",

          p_hotel_name:
            bookingHotel.trim() ||
            null,

          p_room_no:
            null,

          p_pickup_required:
            Boolean(
              bookingPickup.trim()
            ),

          p_pickup_location:
            bookingPickup.trim() ||
            null,

          p_special_notes:
            null,
        }
      );


    if (
      bookingError
    ) {

      setError(
        bookingError.message
      );

      return;
    }


    const result =
      data as {
        booking_code?: string;
      };


    setMessage(
      `Rezervasyon oluşturuldu: ${
        result.booking_code ??
        ""
      }`
    );


    setBookingCustomer("");
    setBookingPhone("");
    setBookingEmail("");
    setBookingQuantity(
      "1"
    );
    setBookingSale("");
    setBookingPaid("");
    setBookingHotel("");
    setBookingPickup("");


    await refresh();

  }


  async function updateStatus(
    bookingId: string,
    status: string
  ) {

    if (
      !membership
    ) {
      return;
    }


    const {
      error:
        statusError,
    } =
      await supabase.rpc(
        "activity_os_update_booking_status",
        {
          p_company_id:
            membership.company_id,

          p_booking_id:
            bookingId,

          p_status:
            status,
        }
      );


    if (
      statusError
    ) {
      setError(
        statusError.message
      );
      return;
    }


    await refresh();

  }


  async function createSeller(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !sellerName.trim()
    ) {
      return;
    }


    const {
      error:
        saveError,
    } =
      await supabase
        .from(
          "activity_os_sellers"
        )
        .insert({
          company_id:
            membership.company_id,

          seller_type:
            sellerType,

          name:
            sellerName.trim(),

          contact_name:
            sellerContact.trim() ||
            null,

          phone:
            sellerPhone.trim() ||
            null,

          email:
            sellerEmail.trim() ||
            null,

          commission_type:
            sellerCommissionType,

          commission_value:
            Number(
              sellerCommission ||
              0
            ),

          is_active:
            true,
        });


    if (
      saveError
    ) {
      setError(
        saveError.message
      );
      return;
    }


    setSellerName("");
    setSellerContact("");
    setSellerPhone("");
    setSellerEmail("");
    setSellerCommission("");

    setMessage(
      "Satışçı / partner eklendi."
    );

    await refresh();

  }


  async function invitePartner(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !inviteSeller ||
      !inviteEmail.trim()
    ) {
      return;
    }


    setError("");
    setMessage("");


    const {
      data: sessionData,
    } =
      await supabase.auth.getSession();

    const response =
      await fetch(
        "/api/activity-os/invite",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${sessionData.session?.access_token ?? ""}`,
          },

          body:
            JSON.stringify({
              companyId:
                membership.company_id,

              sellerId:
                inviteSeller,

              email:
                inviteEmail.trim(),

              fullName:
                inviteName.trim(),
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      setError(
        result.error ||
          "Kullanıcı daveti oluşturulamadı."
      );

      return;
    }


    setInviteEmail("");
    setInviteName("");

    setMessage(
      "Satışçı kullanıcısı davet edildi."
    );

  }


  async function createStaff(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !staffName.trim()
    ) {
      return;
    }


    const {
      error:
        saveError,
    } =
      await supabase
        .from(
          "activity_network_staff"
        )
        .insert({
          company_id:
            membership.company_id,

          full_name:
            staffName.trim(),

          staff_type:
            staffType,

          phone:
            staffPhone.trim() ||
            null,

          license_no:
            staffLicense.trim() ||
            null,

          is_active:
            true,
        });


    if (
      saveError
    ) {
      setError(
        saveError.message
      );
      return;
    }


    setStaffName("");
    setStaffPhone("");
    setStaffLicense("");

    setMessage(
      "Personel eklendi."
    );

    await refresh();

  }


  async function createExpense(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !expenseDescription.trim() ||
      !expenseAmount
    ) {
      return;
    }


    const {
      error:
        saveError,
    } =
      await supabase
        .from(
          "activity_os_expenses"
        )
        .insert({
          company_id:
            membership.company_id,

          expense_date:
            today(),

          category:
            expenseCategory,

          description:
            expenseDescription.trim(),

          amount:
            Number(
              expenseAmount
            ),

          currency:
            "TRY",

          created_by:
            (
              await supabase.auth.getUser()
            ).data.user?.id ??
            null,
        });


    if (
      saveError
    ) {
      setError(
        saveError.message
      );
      return;
    }


    setExpenseDescription("");
    setExpenseAmount("");

    setMessage(
      "Gider kaydedildi."
    );

    await refresh();

  }


  async function addPayment(
    event: FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !paymentBooking ||
      !paymentAmount
    ) {
      return;
    }


    const {
      error:
        paymentError,
    } =
      await supabase.rpc(
        "activity_os_add_payment",
        {
          p_company_id:
            membership.company_id,

          p_booking_id:
            paymentBooking,

          p_amount:
            Number(
              paymentAmount
            ),

          p_payment_method:
            paymentMethod,

          p_note:
            null,
        }
      );


    if (
      paymentError
    ) {
      setError(
        paymentError.message
      );
      return;
    }


    setPaymentAmount("");

    setMessage(
      "Tahsilat kaydedildi."
    );

    await refresh();

  }


  async function setMarketplace(
    activityId: string,
    enabled: boolean
  ) {

    if (
      !membership
    ) {
      return;
    }


    const {
      error:
        marketError,
    } =
      await supabase.rpc(
        "activity_os_set_marketplace",
        {
          p_company_id:
            membership.company_id,

          p_activity_id:
            activityId,

          p_enabled:
            enabled,
        }
      );


    if (
      marketError
    ) {
      setError(
        marketError.message
      );
      return;
    }


    setMessage(
      enabled
        ? "Aktivite Turobus Marketplace'e açıldı."
        : "Aktivite Marketplace'ten kaldırıldı."
    );


    await refresh();

  }


  const slotOptions =
    useMemo(
      () =>
        slots.filter(
          (
            slot
          ) =>
            slot.activity_id ===
              bookingActivity &&
            slot.status ===
              "open" &&
            slot.capacity >
              slot.reserved_count
        ),
      [
        slots,
        bookingActivity,
      ]
    );


  const financeTotals =
    useMemo(
      () => {

        return financeRows.reduce(
          (
            total,
            item
          ) => ({
            revenue:
              total.revenue +
              Number(
                item.gross_sale
              ),

            cost:
              total.cost +
              Number(
                item.internal_cost
              ),

            seller:
              total.seller +
              Number(
                item.seller_commission
              ),

            turobus:
              total.turobus +
              Number(
                item.turobus_commission
              ),

            profit:
              total.profit +
              Number(
                item.net_profit
              ),
          }),
          {
            revenue: 0,
            cost: 0,
            seller: 0,
            turobus: 0,
            profit: 0,
          }
        );

      },
      [
        financeRows,
      ]
    );


  const days =
    useMemo(
      () =>
        monthDates(
          month
        ),
      [
        month,
      ]
    );


  if (
    loading
  ) {

    return (
      <div className="space-y-4 p-4">
        <div className="h-32 animate-pulse rounded-3xl bg-white/[.04]" />
        <div className="h-96 animate-pulse rounded-3xl bg-white/[.04]" />
      </div>
    );

  }


  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-[1600px]">

        {/* HEADER */}

        <section className="border-b border-white/10 bg-gradient-to-r from-orange-500/[.10] via-slate-950 to-fuchsia-500/[.06] p-5 md:p-7 lg:p-8">

          <div className="flex flex-wrap items-start justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.24em] text-fuchsia-400">
                TUROBUS · ACTIVITY OS PRO
              </div>

              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                Aktivite Operasyon & Yönetim Sistemi
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Dalış, yamaç paraşütü, ATV, rafting, safari, tekne, at safari ve tüm aktivite işletmeleri için rezervasyon, operasyon, satış, finans ve Marketplace merkezi.
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4">

              <div className="text-[9px] uppercase text-slate-500">
                Aktif İşletme
              </div>

              <div className="mt-1 font-black">
                {membership?.company.name}
              </div>

            </div>

          </div>

        </section>


        {error && (
          <div className="m-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}


        {message && (
          <div className="m-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}


        <div className="block">

          {/* LOCAL OS MENU */}

          <aside className="sticky top-20 z-30 border-b border-white/10 bg-slate-950/95 px-4 backdrop-blur-2xl md:px-6">

            <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

              <Link
                href="/dashboard/activity-control-center"
                className="flex min-w-fit items-center gap-2 whitespace-nowrap rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs font-black text-orange-300 transition hover:bg-orange-500 hover:text-white"
              >
                <FaTasks />
                Kontrol Merkezi
              </Link>

              {menu.map(
                (
                  item
                ) => {

                  const Icon =
                    item.icon;


                  return (
                    <Link
                      key={
                        item.key
                      }
                      href={
                        item.key ===
                        "overview"
                          ? "/dashboard/activity-os"
                          : `/dashboard/activity-os/${item.key}`
                      }
                      className={`flex min-w-fit items-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-black transition ${
                        section ===
                        item.key
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "border border-white/10 bg-white/[.03] text-slate-400 hover:border-orange-500/30 hover:bg-white/[.06] hover:text-white"
                      }`}
                    >

                      <Icon />

                      {item.label}

                    </Link>
                  );

                }
              )}

            </div>

          </aside>


          <section className="min-w-0 p-4 md:p-6 lg:p-8">

            {/* =================================================
                OVERVIEW
            ================================================= */}

            {section ===
              "overview" && (

              <div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                  {[
                    [
                      "Bugün Rezervasyon",
                      dashboard.booking_count ??
                        0,
                    ],

                    [
                      "Bugün Misafir",
                      dashboard.guest_count ??
                        0,
                    ],

                    [
                      "Bugün Satış",
                      money(
                        dashboard.sale_total
                      ),
                    ],

                    [
                      "Tahsilat",
                      money(
                        dashboard.paid_total
                      ),
                    ],

                    [
                      "Kalan",
                      money(
                        dashboard.receivable_total
                      ),
                    ],
                  ].map(
                    ([
                      label,
                      value,
                    ]) => (

                      <div
                        key={
                          String(
                            label
                          )
                        }
                        className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                      >

                        <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">
                          {String(
                            label
                          )}
                        </div>

                        <div className="mt-3 text-2xl font-black">
                          {String(
                            value
                          )}
                        </div>

                      </div>

                    )
                  )}

                </div>


                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.025] p-4">

                  <div className="flex flex-wrap items-center justify-between gap-3">

                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[.15em] text-orange-400">
                        HIZLI İŞLEMLER
                      </div>

                      <div className="mt-1 text-sm font-black">
                        Günlük operasyonu buradan yönet
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {[
                        {
                          href: "/dashboard/activity-os/products",
                          label: "Aktivite Ekle",
                          icon: FaPlus,
                        },
                        {
                          href: "/dashboard/activity-os/calendar",
                          label: "Slot Oluştur",
                          icon: FaCalendarAlt,
                        },
                        {
                          href: "/dashboard/activity-os/bookings",
                          label: "Rezervasyon",
                          icon: FaClipboardList,
                        },
                        {
                          href: "/dashboard/activity-os/partners",
                          label: "Partner Ekle",
                          icon: FaUserPlus,
                        },
                        {
                          href: "/dashboard/activity-os/finance",
                          label: "Finans",
                          icon: FaCashRegister,
                        },
                      ].map((action) => {

                        const ActionIcon =
                          action.icon;

                        return (
                          <Link
                            key={action.href}
                            href={action.href}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-[10px] font-black text-slate-300 transition hover:border-orange-500/30 hover:bg-orange-500 hover:text-white"
                          >
                            <ActionIcon />
                            {action.label}
                          </Link>
                        );

                      })}

                    </div>

                  </div>

                </div>


                <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">

                  <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                    <div className="flex items-center justify-between">

                      <div>

                        <div className="text-xs font-black uppercase tracking-[.14em] text-fuchsia-400">
                          Bugünkü Operasyon
                        </div>

                        <h2 className="mt-1 text-xl font-black">
                          Canlı Rezervasyon Akışı
                        </h2>

                      </div>


                      <Link
                        href="/dashboard/activity-os/bookings"
                        className="text-xs font-black text-fuchsia-400"
                      >
                        Tümünü Aç
                      </Link>

                    </div>


                    <div className="mt-5 space-y-2">

                      {bookings
                        .filter(
                          (
                            booking
                          ) =>
                            booking.service_date ===
                            today()
                        )
                        .slice(
                          0,
                          10
                        )
                        .map(
                          (
                            booking
                          ) => (

                            <div
                              key={
                                booking.id
                              }
                              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4"
                            >

                              <div>

                                <div className="font-black">
                                  {activityNameById(
                                    booking.activity_id
                                  )}
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  {booking.customer_name}
                                  {" · "}
                                  {booking.quantity} kişi
                                </div>

                              </div>


                              <div className="text-right">

                                <div className="text-sm font-black">
                                  {booking.start_time?.slice(
                                    0,
                                    5
                                  ) ??
                                    "-"}
                                </div>

                                <div className="mt-1 text-[9px] uppercase text-emerald-400">
                                  {booking.status}
                                </div>

                              </div>

                            </div>

                          )
                        )}


                      {!bookings.some(
                        (
                          booking
                        ) =>
                          booking.service_date ===
                          today()
                      ) && (

                        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                          Bugün için rezervasyon yok.
                        </div>

                      )}

                    </div>

                  </div>


                  <div className="space-y-5">

                    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-5">

                      <div className="text-[9px] font-black uppercase text-fuchsia-300">
                        TUROBUS MARKETPLACE
                      </div>

                      <div className="mt-3 text-3xl font-black">
                        {dashboard.marketplace_bookings ??
                          0}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Bugünkü Marketplace rezervasyonu
                      </div>

                      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] leading-5 text-slate-400">
                        Firma kendi satışında Turobus komisyonu ödemez. Komisyon yalnız Turobus Marketplace satışında oluşur.
                      </div>

                    </div>


                    {dashboard.finance_allowed && (

                      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                        <div className="text-[9px] font-black uppercase text-slate-500">
                          Bugünkü Net Kâr
                        </div>

                        <div className="mt-3 text-3xl font-black text-emerald-400">
                          {money(
                            dashboard.profit_total
                          )}
                        </div>

                      </div>

                    )}

                  </div>

                </div>

              </div>

            )}


            {/* =================================================
                CALENDAR
            ================================================= */}

            {section ===
              "calendar" && (

              <div>

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div>

                    <div className="text-xs font-black uppercase tracking-[.15em] text-fuchsia-400">
                      Canlı Takvim
                    </div>

                    <h2 className="mt-1 text-2xl font-black">
                      Slot & Kapasite Takvimi
                    </h2>

                  </div>


                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setMonth(
                          new Date(
                            month.getFullYear(),
                            month.getMonth() -
                              1,
                            1
                          )
                        )
                      }
                      className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
                    >
                      Önceki
                    </button>

                    <div className="min-w-[160px] text-center font-black">
                      {month.toLocaleDateString(
                        "tr-TR",
                        {
                          month:
                            "long",
                          year:
                            "numeric",
                        }
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setMonth(
                          new Date(
                            month.getFullYear(),
                            month.getMonth() +
                              1,
                            1
                          )
                        )
                      }
                      className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
                    >
                      Sonraki
                    </button>

                  </div>

                </div>


                <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">

                  <div className="grid grid-cols-7 border-b border-white/10 bg-white/[.03]">

                    {[
                      "Pzt",
                      "Sal",
                      "Çar",
                      "Per",
                      "Cum",
                      "Cmt",
                      "Paz",
                    ].map(
                      (
                        day
                      ) => (

                        <div
                          key={
                            day
                          }
                          className="p-3 text-center text-[9px] font-black uppercase text-slate-500"
                        >
                          {day}
                        </div>

                      )
                    )}

                  </div>


                  <div className="grid grid-cols-7">

                    {days.map(
                      (
                        day,
                        index
                      ) => {

                        if (
                          !day
                        ) {

                          return (
                            <div
                              key={
                                `empty-${index}`
                              }
                              className="min-h-[230px] border-b border-r border-white/5 bg-black/10"
                            />
                          );

                        }


                        const key =
                          dateKey(
                            day
                          );


                        const daySlots =
                          slots.filter(
                            (
                              slot
                            ) =>
                              slot.slot_date ===
                              key
                          );


                        const dayBookings =
                          bookings.filter(
                            (
                              booking
                            ) =>
                              booking.service_date ===
                              key &&
                              booking.status !==
                                "cancelled"
                          );


                        return (
                          <div
                            key={
                              key
                            }
                            className={`min-h-[230px] border-b border-r border-white/5 p-3 ${
                              key ===
                              today()
                                ? "bg-fuchsia-500/[.08]"
                                : ""
                            }`}
                          >

                            <div className="text-xs font-black">
                              {day.getDate()}
                            </div>


                            <div className="mt-2 space-y-2">

                              {daySlots
                                .slice(
                                  0,
                                  4
                                )
                                .map(
                                  (
                                    slot
                                  ) => {

                                    const reserved =
                                      Number(
                                        slot.reserved_count ??
                                        0
                                      );

                                    const remaining =
                                      Number(
                                        slot.remaining_count ??
                                        Math.max(
                                          slot.capacity -
                                          reserved,
                                          0
                                        )
                                      );

                                    const occupancy =
                                      Number(
                                        slot.occupancy_percent ??
                                        (
                                          slot.capacity > 0
                                            ? (
                                                reserved /
                                                slot.capacity
                                              ) * 100
                                            : 0
                                        )
                                      );


                                    return (

                                      <div
                                        key={
                                          slot.id
                                        }
                                        className={`rounded-xl border p-2.5 text-[8px] ${
                                          remaining <= 0
                                            ? "border-red-500/20 bg-red-500/10"
                                            : remaining <= Math.max(
                                                2,
                                                slot.capacity *
                                                0.2
                                              )
                                              ? "border-orange-500/20 bg-orange-500/10"
                                              : "border-white/10 bg-white/[.05]"
                                        }`}
                                      >

                                        <div className="flex items-center justify-between gap-2">

                                          <div className="truncate font-black text-white">
                                            {slot.start_time?.slice(
                                              0,
                                              5
                                            ) ??
                                              "-"}
                                            {" · "}
                                            {activityNameById(
                                              slot.activity_id
                                            )}
                                          </div>


                                          <div className={`rounded-full px-2 py-1 font-black ${
                                            remaining <= 0
                                              ? "bg-red-500/20 text-red-300"
                                              : "bg-emerald-500/10 text-emerald-300"
                                          }`}>
                                            {remaining <= 0
                                              ? "DOLU"
                                              : `${remaining} BOŞ`}
                                          </div>

                                        </div>


                                        <div className="mt-2 grid grid-cols-3 gap-1">

                                          <div className="rounded-lg bg-slate-950/70 p-1.5 text-center">
                                            <div className="text-slate-600">
                                              Kap.
                                            </div>
                                            <div className="mt-0.5 font-black text-white">
                                              {slot.capacity}
                                            </div>
                                          </div>

                                          <div className="rounded-lg bg-slate-950/70 p-1.5 text-center">
                                            <div className="text-slate-600">
                                              Satılan
                                            </div>
                                            <div className="mt-0.5 font-black text-orange-300">
                                              {reserved}
                                            </div>
                                          </div>

                                          <div className="rounded-lg bg-slate-950/70 p-1.5 text-center">
                                            <div className="text-slate-600">
                                              Doluluk
                                            </div>
                                            <div className="mt-0.5 font-black text-fuchsia-300">
                                              %{Math.round(
                                                occupancy
                                              )}
                                            </div>
                                          </div>

                                        </div>


                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">

                                          <div
                                            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-500"
                                            style={{
                                              width:
                                                `${Math.min(
                                                  occupancy,
                                                  100
                                                )}%`,
                                            }}
                                          />

                                        </div>

                                      </div>

                                    );

                                  }
                                )}


                              {daySlots.length ===
                                0 && (

                                <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[8px] text-slate-700">
                                  Slot yok
                                </div>

                              )}


                              {dayBookings.length >
                                0 && (

                                <div className="rounded-lg bg-emerald-500/10 p-2 text-[8px] font-black text-emerald-300">
                                  {dayBookings.reduce(
                                    (
                                      sum,
                                      booking
                                    ) =>
                                      sum +
                                      booking.quantity,
                                    0
                                  )} aktif misafir
                                </div>

                              )}

                            </div>

                          </div>
                        );

                      }
                    )}

                  </div>

                </div>


                <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-5">

                  <h3 className="text-xl font-black">
                    Yeni Slot Oluştur
                  </h3>


                  <form
                    onSubmit={
                      createSlot
                    }
                    className="mt-5 grid gap-4 md:grid-cols-5"
                  >

                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Aktivite
                      </span>

                      <select
                        value={
                          slotActivity
                        }
                        onChange={(event) =>
                          setSlotActivity(
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                      >

                        <option value="">
                          Aktivite seç
                        </option>

                        {activities.map(
                          (
                            activity
                          ) => (

                            <option
                              key={
                                activity.id
                              }
                              value={
                                activity.id
                              }
                            >
                              {activity.name}
                            </option>

                          )
                        )}

                      </select>

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Tarih
                      </span>

                      <input
                        type="date"
                        value={
                          slotDate
                        }
                        onChange={(event) =>
                          setSlotDate(
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Saat
                      </span>

                      <input
                        type="time"
                        value={
                          slotTime
                        }
                        onChange={(event) =>
                          setSlotTime(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Bitiş Saati
                      </span>

                      <input
                        type="time"
                        value={
                          slotEndTime
                        }
                        onChange={(event) =>
                          setSlotEndTime(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Kapasite
                      </span>

                      <input
                        type="number"
                        min="1"
                        value={
                          slotCapacity
                        }
                        onChange={(event) =>
                          setSlotCapacity(
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Satış Fiyatı
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          slotPrice
                        }
                        onChange={(event) =>
                          setSlotPrice(
                            event.target.value
                          )
                        }
                        placeholder="Opsiyonel"
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                      />

                    </label>


                    <label className="md:col-span-5">

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Slot / Operasyon Notu
                      </span>

                      <textarea
                        value={
                          slotNotes
                        }
                        onChange={(event) =>
                          setSlotNotes(
                            event.target.value
                          )
                        }
                        placeholder="Hava durumu, ekip, araç, özel operasyon notu..."
                        className="min-h-[90px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                      />

                    </label>


                    <button
                      type="submit"
                      className="md:col-span-5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-orange-500 px-5 py-4 font-black"
                    >
                      Slot Oluştur / Güncelle
                    </button>

                  </form>

                </div>

              </div>

            )}


            {/* =================================================
                PRODUCTS
            ================================================= */}

            {section ===
              "products" && (

              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">

                <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                  <h2 className="text-xl font-black">
                    Yeni Aktivite
                  </h2>


                  <form
                    onSubmit={
                      createActivity
                    }
                    className="mt-5 space-y-4"
                  >

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Aktivite Adı
                      </span>

                      <input
                        value={
                          activityName
                        }
                        onChange={(event) =>
                          setActivityName(
                            event.target.value
                          )
                        }
                        placeholder="Örn. Babadağ Yamaç Paraşütü"
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Kategori
                      </span>

                      <select
                        value={
                          activityCategory
                        }
                        onChange={(event) =>
                          setActivityCategory(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      >
                        <option value="paragliding">
                          Yamaç Paraşütü
                        </option>
                        <option value="diving">
                          Dalış
                        </option>
                        <option value="atv">
                          ATV
                        </option>
                        <option value="rafting">
                          Rafting
                        </option>
                        <option value="jeep_safari">
                          Jeep Safari
                        </option>
                        <option value="boat">
                          Tekne
                        </option>
                        <option value="horse">
                          At Safari
                        </option>
                        <option value="watersport">
                          Su Sporları
                        </option>
                        <option value="activity">
                          Diğer Aktivite
                        </option>
                      </select>
                    </label>


                    <div className="grid grid-cols-2 gap-3">

                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Şehir
                        </span>

                        <input
                          value={
                            activityCity
                          }
                          onChange={(event) =>
                            setActivityCity(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Bölge
                        </span>

                        <input
                          value={
                            activityDistrict
                          }
                          onChange={(event) =>
                            setActivityDistrict(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>

                    </div>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Kısa Açıklama
                      </span>

                      <textarea
                        value={
                          activityShortDescription
                        }
                        onChange={(event) =>
                          setActivityShortDescription(
                            event.target.value
                          )
                        }
                        placeholder="Marketplace kartında görünecek kısa açıklama"
                        className="min-h-[80px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Detaylı Açıklama
                      </span>

                      <textarea
                        value={
                          activityDescription
                        }
                        onChange={(event) =>
                          setActivityDescription(
                            event.target.value
                          )
                        }
                        placeholder="Aktivitenin tüm detayları, deneyim akışı, güvenlik vb."
                        className="min-h-[130px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Buluşma Noktası
                      </span>

                      <input
                        value={
                          activityMeetingPoint
                        }
                        onChange={(event) =>
                          setActivityMeetingPoint(
                            event.target.value
                          )
                        }
                        placeholder="Örn. Babadağ Teleferik Alt İstasyon"
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <div className="grid grid-cols-2 gap-3">

                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Satış Fiyatı
                        </span>

                        <input
                          type="number"
                          value={
                            activityPrice
                          }
                          onChange={(event) =>
                            setActivityPrice(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          İç Maliyet
                        </span>

                        <input
                          type="number"
                          value={
                            activityCost
                          }
                          onChange={(event) =>
                            setActivityCost(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>

                    </div>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Süre (Dakika)
                      </span>

                      <input
                        type="number"
                        value={
                          activityDuration
                        }
                        onChange={(event) =>
                          setActivityDuration(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <div className="grid grid-cols-2 gap-3">

                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Min. Yaş
                        </span>

                        <input
                          type="number"
                          value={
                            activityMinAge
                          }
                          onChange={(event) =>
                            setActivityMinAge(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Maks. Yaş
                        </span>

                        <input
                          type="number"
                          value={
                            activityMaxAge
                          }
                          onChange={(event) =>
                            setActivityMaxAge(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Min. Kilo
                        </span>

                        <input
                          type="number"
                          value={
                            activityMinWeight
                          }
                          onChange={(event) =>
                            setActivityMinWeight(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Maks. Kilo
                        </span>

                        <input
                          type="number"
                          value={
                            activityMaxWeight
                          }
                          onChange={(event) =>
                            setActivityMaxWeight(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>

                    </div>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Zorluk Seviyesi
                      </span>

                      <select
                        value={
                          activityDifficulty
                        }
                        onChange={(event) =>
                          setActivityDifficulty(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      >
                        <option value="easy">Kolay</option>
                        <option value="medium">Orta</option>
                        <option value="hard">Zor</option>
                        <option value="expert">Uzman</option>
                      </select>

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Öne Çıkan Özellikler
                      </span>

                      <textarea
                        value={
                          activityHighlights
                        }
                        onChange={(event) =>
                          setActivityHighlights(
                            event.target.value
                          )
                        }
                        placeholder={"Profesyonel ekip\nSigorta\nTransfer opsiyonu"}
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Dahil Olanlar
                      </span>

                      <textarea
                        value={
                          activityIncluded
                        }
                        onChange={(event) =>
                          setActivityIncluded(
                            event.target.value
                          )
                        }
                        placeholder={"Ekipman\nEğitmen\nSigorta"}
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Hariç Olanlar
                      </span>

                      <textarea
                        value={
                          activityExcluded
                        }
                        onChange={(event) =>
                          setActivityExcluded(
                            event.target.value
                          )
                        }
                        placeholder={"Fotoğraf / video\nKişisel harcamalar"}
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Hazırlık Notları
                      </span>

                      <textarea
                        value={
                          activityPreparationNotes
                        }
                        onChange={(event) =>
                          setActivityPreparationNotes(
                            event.target.value
                          )
                        }
                        placeholder="Yanında ne getirmeli, nasıl giyinmeli..."
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Buluşma Talimatı
                      </span>

                      <textarea
                        value={
                          activityMeetingInstructions
                        }
                        onChange={(event) =>
                          setActivityMeetingInstructions(
                            event.target.value
                          )
                        }
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        İptal Koşulları
                      </span>

                      <textarea
                        value={
                          activityCancellation
                        }
                        onChange={(event) =>
                          setActivityCancellation(
                            event.target.value
                          )
                        }
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <label>

                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Önemli Notlar
                      </span>

                      <textarea
                        value={
                          activityImportantNotes
                        }
                        onChange={(event) =>
                          setActivityImportantNotes(
                            event.target.value
                          )
                        }
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />

                    </label>


                    <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">

                      <div className="text-sm font-black">
                        Aktivite Fotoğrafları
                      </div>


                      <label className="mt-4 block">

                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Kapak Fotoğrafı
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            setActivityCoverFile(
                              event.target.files?.[0] ??
                              null
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs"
                        />

                      </label>


                      <label className="mt-4 block">

                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Galeri Fotoğrafları
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) =>
                            setActivityGalleryFiles(
                              Array.from(
                                event.target.files ??
                                []
                              )
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs"
                        />

                      </label>


                      <div className="mt-3 text-[9px] leading-5 text-slate-600">
                        Kapak fotoğrafı Marketplace kartında kullanılır. Galeriye birden fazla fotoğraf yüklenebilir.
                      </div>

                    </div>


                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-orange-500 px-5 py-4 font-black shadow-lg shadow-fuchsia-500/10"
                    >
                      Aktivite Oluştur
                    </button>

                  </form>

                </div>


                <div>

                  <div className="grid gap-4 md:grid-cols-2">

                    {activities.map(
                      (
                        activity
                      ) => {

                        const resource =
                          marketResources.find(
                            (
                              item
                            ) =>
                              item.source_id ===
                              activity.id
                          );


                        return (
                          <div
                            key={
                              activity.id
                            }
                            className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                          >

                            <div className="flex items-start justify-between gap-4">

                              <div>

                                <div className="text-[9px] font-black uppercase text-fuchsia-400">
                                  {activity.category}
                                </div>

                                <h3 className="mt-1 text-xl font-black">
                                  {activity.name}
                                </h3>

                                <div className="mt-2 text-xs text-slate-500">
                                  {activity.city}
                                  {activity.district
                                    ? ` · ${activity.district}`
                                    : ""}
                                </div>

                              </div>


                              <span className={`rounded-full px-3 py-1 text-[9px] font-black ${
                                activity.is_active
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-red-500/10 text-red-300"
                              }`}>
                                {activity.is_active
                                  ? "AKTİF"
                                  : "PASİF"}
                              </span>

                            </div>


                            <div className="mt-5 grid grid-cols-3 gap-2">

                              <div className="rounded-xl bg-slate-950 p-3">
                                <div className="text-[8px] uppercase text-slate-600">
                                  Satış
                                </div>

                                <div className="mt-1 text-sm font-black">
                                  {money(
                                    activity.default_sale_price,
                                    activity.currency
                                  )}
                                </div>
                              </div>


                              {canFinance && (
                                <div className="rounded-xl bg-slate-950 p-3">
                                  <div className="text-[8px] uppercase text-slate-600">
                                    Maliyet
                                  </div>

                                  <div className="mt-1 text-sm font-black">
                                    {money(
                                      activity.default_cost,
                                      activity.currency
                                    )}
                                  </div>
                                </div>
                              )}


                              <div className="rounded-xl bg-slate-950 p-3">
                                <div className="text-[8px] uppercase text-slate-600">
                                  Süre
                                </div>

                                <div className="mt-1 text-sm font-black">
                                  {activity.duration_minutes
                                    ? `${activity.duration_minutes} dk`
                                    : "-"}
                                </div>
                              </div>

                            </div>


                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">

                              <span className="text-[10px] text-slate-500">
                                Marketplace
                              </span>

                              <button
                                type="button"
                                disabled={
                                  !canManage
                                }
                                onClick={() =>
                                  void setMarketplace(
                                    activity.id,
                                    !Boolean(
                                      resource?.marketplace_enabled
                                    )
                                  )
                                }
                                className={`rounded-xl px-4 py-2 text-[10px] font-black ${
                                  resource?.marketplace_enabled
                                    ? "bg-emerald-500 text-slate-950"
                                    : "bg-white/[.06] text-slate-400"
                                }`}
                              >
                                {resource?.marketplace_enabled
                                  ? "YAYINDA"
                                  : "KAPALI"}
                              </button>

                            </div>

                          </div>
                        );

                      }
                    )}

                  </div>

                </div>

              </div>

            )}


            {/* =================================================
                BOOKINGS
            ================================================= */}

            {section ===
              "bookings" && (

              <div>

                <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                  <h2 className="text-xl font-black">
                    Yeni Rezervasyon
                  </h2>


                  <form
                    onSubmit={
                      createBooking
                    }
                    className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                  >

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Aktivite
                      </span>

                      <select
                        value={
                          bookingActivity
                        }
                        onChange={(event) => {
                          setBookingActivity(
                            event.target.value
                          );
                          setBookingSlot("");
                        }}
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      >
                        <option value="">
                          Aktivite seç
                        </option>

                        {activities.map(
                          (
                            activity
                          ) => (
                            <option
                              key={
                                activity.id
                              }
                              value={
                                activity.id
                              }
                            >
                              {activity.name}
                            </option>
                          )
                        )}
                      </select>
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Slot / Saat
                      </span>

                      <select
                        value={
                          bookingSlot
                        }
                        onChange={(event) =>
                          setBookingSlot(
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      >
                        <option value="">
                          Slot seç
                        </option>

                        {slotOptions.map(
                          (
                            slot
                          ) => (
                            <option
                              key={
                                slot.id
                              }
                              value={
                                slot.id
                              }
                            >
                              {slot.slot_date}
                              {" · "}
                              {slot.start_time?.slice(
                                0,
                                5
                              )}
                              {" · "}
                              {slot.capacity -
                                slot.reserved_count} boş
                            </option>
                          )
                        )}
                      </select>
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Misafir Ad Soyad
                      </span>

                      <input
                        value={
                          bookingCustomer
                        }
                        onChange={(event) =>
                          setBookingCustomer(
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Telefon
                      </span>

                      <input
                        value={
                          bookingPhone
                        }
                        onChange={(event) =>
                          setBookingPhone(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        E-posta
                      </span>

                      <input
                        type="email"
                        value={
                          bookingEmail
                        }
                        onChange={(event) =>
                          setBookingEmail(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Kişi Sayısı
                      </span>

                      <input
                        type="number"
                        min="1"
                        value={
                          bookingQuantity
                        }
                        onChange={(event) =>
                          setBookingQuantity(
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Satış Kanalı
                      </span>

                      <select
                        value={
                          bookingSource
                        }
                        onChange={(event) =>
                          setBookingSource(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      >
                        <option value="direct">
                          Direkt
                        </option>
                        <option value="phone">
                          Telefon
                        </option>
                        <option value="whatsapp">
                          WhatsApp
                        </option>
                        <option value="instagram">
                          Instagram
                        </option>
                        <option value="hotel">
                          Otel
                        </option>
                        <option value="agency">
                          Acente
                        </option>
                        <option value="external_seller">
                          Dış Satışçı
                        </option>
                        <option value="turobus_marketplace">
                          Turobus Marketplace
                        </option>
                      </select>
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Satışçı / Partner
                      </span>

                      <select
                        value={
                          bookingSeller
                        }
                        onChange={(event) =>
                          setBookingSeller(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      >
                        <option value="">
                          Direkt satış
                        </option>

                        {sellers
                          .filter(
                            (
                              seller
                            ) =>
                              seller.is_active
                          )
                          .map(
                            (
                              seller
                            ) => (
                              <option
                                key={
                                  seller.id
                                }
                                value={
                                  seller.id
                                }
                              >
                                {seller.name}
                              </option>
                            )
                          )}
                      </select>
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Toplam Satış
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          bookingSale
                        }
                        onChange={(event) =>
                          setBookingSale(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Alınan Ödeme
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          bookingPaid
                        }
                        onChange={(event) =>
                          setBookingPaid(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Otel
                      </span>

                      <input
                        value={
                          bookingHotel
                        }
                        onChange={(event) =>
                          setBookingHotel(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Pickup Noktası
                      </span>

                      <input
                        value={
                          bookingPickup
                        }
                        onChange={(event) =>
                          setBookingPickup(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <button
                      type="submit"
                      className="md:col-span-2 xl:col-span-4 rounded-xl bg-fuchsia-500 px-5 py-4 font-black"
                    >
                      Rezervasyon Oluştur
                    </button>

                  </form>

                </div>


                <div className="mt-6 space-y-3">

                  {bookings.map(
                    (
                      booking
                    ) => (

                      <div
                        key={
                          booking.id
                        }
                        className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                      >

                        <div className="grid gap-5 xl:grid-cols-[1.1fr_.8fr_.7fr_auto] xl:items-center">

                          <div>

                            <div className="text-[9px] font-black uppercase text-fuchsia-400">
                              {booking.booking_code}
                            </div>

                            <div className="mt-1 text-lg font-black">
                              {activityNameById(
                                booking.activity_id
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {booking.customer_name}
                              {" · "}
                              {booking.quantity} kişi
                            </div>

                          </div>


                          <div>

                            <div className="text-sm font-black">
                              {booking.service_date}
                              {" · "}
                              {booking.start_time?.slice(
                                0,
                                5
                              ) ??
                                "-"}
                            </div>

                            <div className="mt-1 text-[9px] uppercase text-slate-500">
                              {booking.source_channel}
                            </div>

                          </div>


                          <div>

                            <div className="text-sm font-black">
                              {money(
                                booking.sale_total
                              )}
                            </div>

                            <div className="mt-1 text-[9px] text-slate-500">
                              Ödenen:
                              {" "}
                              {money(
                                booking.paid_total
                              )}
                            </div>

                          </div>


                          <div className="flex flex-wrap gap-2">

                            <select
                              value={
                                booking.status
                              }
                              onChange={(event) =>
                                void updateStatus(
                                  booking.id,
                                  event.target.value
                                )
                              }
                              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-[10px] font-black"
                            >
                              <option value="pending">
                                Bekliyor
                              </option>
                              <option value="confirmed">
                                Onaylı
                              </option>
                              <option value="ready">
                                Hazır
                              </option>
                              <option value="picked_up">
                                Pickup
                              </option>
                              <option value="checked_in">
                                Check-in
                              </option>
                              <option value="in_progress">
                                Başladı
                              </option>
                              <option value="completed">
                                Tamamlandı
                              </option>
                              <option value="no_show">
                                No Show
                              </option>
                              <option value="cancelled">
                                İptal
                              </option>
                            </select>


                            <Link
                              href={`/activity-misafir/${booking.guest_token}`}
                              target="_blank"
                              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black"
                            >
                              Misafir
                              <FaExternalLinkAlt />
                            </Link>

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}


            {/* =================================================
                OPERATIONS
            ================================================= */}

            {section ===
              "operations" && (

              <div>

                <div className="grid gap-4 md:grid-cols-4">

                  {[
                    [
                      "Onaylı",
                      bookings.filter(
                        (
                          b
                        ) =>
                          b.status ===
                          "confirmed"
                      ).length,
                    ],
                    [
                      "Pickup",
                      bookings.filter(
                        (
                          b
                        ) =>
                          b.status ===
                          "picked_up"
                      ).length,
                    ],
                    [
                      "Devam Ediyor",
                      bookings.filter(
                        (
                          b
                        ) =>
                          b.status ===
                          "in_progress"
                      ).length,
                    ],
                    [
                      "Tamamlandı",
                      bookings.filter(
                        (
                          b
                        ) =>
                          b.status ===
                          "completed"
                      ).length,
                    ],
                  ].map(
                    ([
                      label,
                      value,
                    ]) => (
                      <div
                        key={
                          String(
                            label
                          )
                        }
                        className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                      >
                        <div className="text-[9px] uppercase text-slate-500">
                          {String(
                            label
                          )}
                        </div>
                        <div className="mt-2 text-3xl font-black">
                          {String(
                            value
                          )}
                        </div>
                      </div>
                    )
                  )}

                </div>


                <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-5">

                  <h2 className="text-xl font-black">
                    Günlük Operasyon Panosu
                  </h2>


                  <div className="mt-5 space-y-3">

                    {bookings
                      .filter(
                        (
                          booking
                        ) =>
                          booking.service_date ===
                          today() &&
                          booking.status !==
                            "cancelled"
                      )
                      .map(
                        (
                          booking
                        ) => (
                          <div
                            key={
                              booking.id
                            }
                            className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 md:grid-cols-5 md:items-center"
                          >

                            <div>
                              <div className="font-black">
                                {booking.start_time?.slice(
                                  0,
                                  5
                                ) ??
                                  "-"}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                Saat
                              </div>
                            </div>

                            <div>
                              <div className="font-black">
                                {activityNameById(
                                  booking.activity_id
                                )}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                Aktivite
                              </div>
                            </div>

                            <div>
                              <div className="font-black">
                                {booking.customer_name}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                {booking.quantity} kişi
                              </div>
                            </div>

                            <div>
                              <div className="font-black">
                                {booking.pickup_location ??
                                  "-"}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                Pickup
                              </div>
                            </div>

                            <select
                              value={
                                booking.status
                              }
                              onChange={(event) =>
                                void updateStatus(
                                  booking.id,
                                  event.target.value
                                )
                              }
                              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-xs font-black"
                            >
                              <option value="confirmed">
                                Onaylı
                              </option>
                              <option value="ready">
                                Hazır
                              </option>
                              <option value="picked_up">
                                Alındı
                              </option>
                              <option value="checked_in">
                                Check-in
                              </option>
                              <option value="in_progress">
                                Aktivite Başladı
                              </option>
                              <option value="completed">
                                Tamamlandı
                              </option>
                            </select>

                          </div>
                        )
                      )}

                  </div>

                </div>

              </div>

            )}


            {/* =================================================
                GUESTS
            ================================================= */}

            {section ===
              "guests" && (

              <div>

                <div className="grid gap-4 md:grid-cols-3">

                  <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
                    <div className="text-[9px] uppercase text-slate-500">
                      Toplam Rezervasyon
                    </div>
                    <div className="mt-2 text-3xl font-black">
                      {bookings.length}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
                    <div className="text-[9px] uppercase text-slate-500">
                      Toplam Misafir
                    </div>
                    <div className="mt-2 text-3xl font-black">
                      {bookings.reduce(
                        (
                          sum,
                          item
                        ) =>
                          sum +
                          item.quantity,
                        0
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
                    <div className="text-[9px] uppercase text-slate-500">
                      Misafir Portalı
                    </div>
                    <div className="mt-2 text-xl font-black text-emerald-400">
                      Aktif
                    </div>
                  </div>

                </div>


                <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">

                  <table className="w-full min-w-[900px] text-left">

                    <thead className="bg-white/[.04] text-[9px] uppercase text-slate-500">
                      <tr>
                        <th className="p-4">Misafir</th>
                        <th className="p-4">Aktivite</th>
                        <th className="p-4">Tarih</th>
                        <th className="p-4">Otel</th>
                        <th className="p-4">Ödeme</th>
                        <th className="p-4">Portal</th>
                      </tr>
                    </thead>

                    <tbody>

                      {bookings.map(
                        (
                          booking
                        ) => (
                          <tr
                            key={
                              booking.id
                            }
                            className="border-t border-white/10"
                          >
                            <td className="p-4">
                              <div className="font-black">
                                {booking.customer_name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {booking.customer_phone}
                              </div>
                            </td>

                            <td className="p-4 text-sm">
                              {activityNameById(
                                booking.activity_id
                              )}
                            </td>

                            <td className="p-4 text-sm">
                              {booking.service_date}
                            </td>

                            <td className="p-4 text-sm">
                              {booking.hotel_name ??
                                "-"}
                            </td>

                            <td className="p-4">
                              <div className="font-black">
                                {money(
                                  booking.paid_total
                                )}
                              </div>
                              <div className="text-[9px] uppercase text-slate-500">
                                {booking.payment_status}
                              </div>
                            </td>

                            <td className="p-4">
                              <Link
                                target="_blank"
                                href={`/activity-misafir/${booking.guest_token}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-500 px-3 py-2 text-[10px] font-black"
                              >
                                Aç
                                <FaExternalLinkAlt />
                              </Link>
                            </td>
                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            )}


            {/* =================================================
                PARTNERS
            ================================================= */}

            {section ===
              "partners" && (

              <div className="space-y-6">

                <div className="grid gap-6 xl:grid-cols-2">

                  <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                    <h2 className="text-xl font-black">
                      Yeni Satışçı / Partner
                    </h2>

                    <form
                      onSubmit={
                        createSeller
                      }
                      className="mt-5 grid gap-4 md:grid-cols-2"
                    >

                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Partner Adı
                        </span>

                        <input
                          value={
                            sellerName
                          }
                          onChange={(event) =>
                            setSellerName(
                              event.target.value
                            )
                          }
                          required
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Tip
                        </span>

                        <select
                          value={
                            sellerType
                          }
                          onChange={(event) =>
                            setSellerType(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        >
                          <option value="hotel">Otel</option>
                          <option value="agency">Acente</option>
                          <option value="salesperson">Satışçı</option>
                          <option value="reception">Resepsiyon</option>
                          <option value="guide">Rehber</option>
                          <option value="affiliate">Affiliate</option>
                          <option value="other">Diğer</option>
                        </select>
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Yetkili
                        </span>

                        <input
                          value={
                            sellerContact
                          }
                          onChange={(event) =>
                            setSellerContact(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Telefon
                        </span>

                        <input
                          value={
                            sellerPhone
                          }
                          onChange={(event) =>
                            setSellerPhone(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          E-posta
                        </span>

                        <input
                          type="email"
                          value={
                            sellerEmail
                          }
                          onChange={(event) =>
                            setSellerEmail(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Komisyon Tipi
                        </span>

                        <select
                          value={
                            sellerCommissionType
                          }
                          onChange={(event) =>
                            setSellerCommissionType(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        >
                          <option value="percent">
                            Yüzde
                          </option>
                          <option value="fixed">
                            Sabit
                          </option>
                          <option value="none">
                            Komisyonsuz
                          </option>
                        </select>
                      </label>


                      <label className="md:col-span-2">
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Komisyon Değeri
                        </span>

                        <input
                          type="number"
                          min="0"
                          value={
                            sellerCommission
                          }
                          onChange={(event) =>
                            setSellerCommission(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <button
                        type="submit"
                        className="md:col-span-2 rounded-xl bg-fuchsia-500 px-5 py-4 font-black"
                      >
                        Partner Oluştur
                      </button>

                    </form>

                  </div>


                  <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                    <h2 className="text-xl font-black">
                      Kullanıcı / Şifre Daveti
                    </h2>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Otel resepsiyonu, satışçı veya acenteye Turobus hesabı daveti gönder. Kullanıcı kendi şifresini güvenli şekilde belirler.
                    </p>


                    <form
                      onSubmit={
                        invitePartner
                      }
                      className="mt-5 space-y-4"
                    >

                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Partner
                        </span>

                        <select
                          value={
                            inviteSeller
                          }
                          onChange={(event) =>
                            setInviteSeller(
                              event.target.value
                            )
                          }
                          required
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        >
                          <option value="">
                            Partner seç
                          </option>

                          {sellers.map(
                            (
                              seller
                            ) => (
                              <option
                                key={
                                  seller.id
                                }
                                value={
                                  seller.id
                                }
                              >
                                {seller.name}
                              </option>
                            )
                          )}
                        </select>
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          Kullanıcı Adı
                        </span>

                        <input
                          value={
                            inviteName
                          }
                          onChange={(event) =>
                            setInviteName(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                          E-posta
                        </span>

                        <input
                          type="email"
                          value={
                            inviteEmail
                          }
                          onChange={(event) =>
                            setInviteEmail(
                              event.target.value
                            )
                          }
                          required
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                        />
                      </label>


                      <button
                        type="submit"
                        className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black"
                      >
                        Turobus Daveti Gönder
                      </button>

                    </form>

                  </div>

                </div>


                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                  {sellers.map(
                    (
                      seller
                    ) => (
                      <div
                        key={
                          seller.id
                        }
                        className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                      >

                        <div className="text-[9px] font-black uppercase text-fuchsia-400">
                          {seller.seller_type}
                        </div>

                        <div className="mt-1 text-lg font-black">
                          {seller.name}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          {seller.contact_name ??
                            seller.email ??
                            "-"}
                        </div>


                        <div className="mt-5 rounded-xl bg-slate-950 p-3">

                          <div className="text-[8px] uppercase text-slate-600">
                            Komisyon
                          </div>

                          <div className="mt-1 font-black">
                            {seller.commission_type ===
                            "percent"
                              ? `%${seller.commission_value}`
                              : seller.commission_type ===
                                  "fixed"
                                ? money(
                                    seller.commission_value
                                  )
                                : "Yok"}
                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>

            )}


            {/* =================================================
                STAFF
            ================================================= */}

            {section ===
              "staff" && (

              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">

                <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                  <h2 className="text-xl font-black">
                    Personel Ekle
                  </h2>


                  <form
                    onSubmit={
                      createStaff
                    }
                    className="mt-5 space-y-4"
                  >

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Ad Soyad
                      </span>

                      <input
                        value={
                          staffName
                        }
                        onChange={(event) =>
                          setStaffName(
                            event.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Görev
                      </span>

                      <select
                        value={
                          staffType
                        }
                        onChange={(event) =>
                          setStaffType(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      >
                        <option value="pilot">Pilot</option>
                        <option value="divemaster">Divemaster</option>
                        <option value="instructor">Eğitmen</option>
                        <option value="captain">Kaptan</option>
                        <option value="guide">Rehber</option>
                        <option value="driver">Şoför</option>
                        <option value="crew">Ekip</option>
                        <option value="operator">Operatör</option>
                      </select>
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Telefon
                      </span>

                      <input
                        value={
                          staffPhone
                        }
                        onChange={(event) =>
                          setStaffPhone(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                        Lisans / Belge No
                      </span>

                      <input
                        value={
                          staffLicense
                        }
                        onChange={(event) =>
                          setStaffLicense(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                      />
                    </label>


                    <button
                      type="submit"
                      className="w-full rounded-xl bg-fuchsia-500 px-5 py-4 font-black"
                    >
                      Personel Ekle
                    </button>

                  </form>

                </div>


                <div className="grid gap-4 md:grid-cols-2">

                  {staff.map(
                    (
                      person
                    ) => (
                      <div
                        key={
                          person.id
                        }
                        className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                      >

                        <div className="text-[9px] font-black uppercase text-fuchsia-400">
                          {person.staff_type}
                        </div>

                        <div className="mt-1 text-lg font-black">
                          {person.full_name}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          {person.phone ??
                            "-"}
                        </div>

                        {person.license_no && (
                          <div className="mt-3 rounded-xl bg-slate-950 p-3 text-[10px]">
                            Belge:
                            {" "}
                            {person.license_no}
                          </div>
                        )}

                      </div>
                    )
                  )}

                </div>

              </div>

            )}


            {/* =================================================
                FINANCE
            ================================================= */}

            {section ===
              "finance" && (

              !canFinance ? (

                <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-8">

                  <h2 className="text-2xl font-black">
                    Finans Yetkisi Gerekli
                  </h2>

                  <p className="mt-3 text-sm text-orange-200/70">
                    Satış kullanıcıları maliyet, kâr ve şirket içi finans bilgilerini göremez.
                  </p>

                </div>

              ) : (

                <div>

                  <div className="grid gap-4 md:grid-cols-5">

                    {[
                      [
                        "Brüt Satış",
                        financeTotals.revenue,
                      ],
                      [
                        "İç Maliyet",
                        financeTotals.cost,
                      ],
                      [
                        "Satışçı Kom.",
                        financeTotals.seller,
                      ],
                      [
                        "Turobus Kom.",
                        financeTotals.turobus,
                      ],
                      [
                        "Net Kâr",
                        financeTotals.profit,
                      ],
                    ].map(
                      ([
                        label,
                        value,
                      ]) => (
                        <div
                          key={
                            String(
                              label
                            )
                          }
                          className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                        >
                          <div className="text-[9px] uppercase text-slate-500">
                            {String(
                              label
                            )}
                          </div>

                          <div className="mt-2 text-xl font-black">
                            {money(
                              Number(
                                value
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}

                  </div>


                  <div className="mt-6 grid gap-6 xl:grid-cols-2">

                    <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                      <h3 className="text-xl font-black">
                        Tahsilat Ekle
                      </h3>

                      <form
                        onSubmit={
                          addPayment
                        }
                        className="mt-5 space-y-4"
                      >

                        <label>
                          <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                            Rezervasyon
                          </span>

                          <select
                            value={
                              paymentBooking
                            }
                            onChange={(event) =>
                              setPaymentBooking(
                                event.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                          >
                            <option value="">
                              Rezervasyon seç
                            </option>

                            {bookings.map(
                              (
                                booking
                              ) => (
                                <option
                                  key={
                                    booking.id
                                  }
                                  value={
                                    booking.id
                                  }
                                >
                                  {booking.booking_code}
                                  {" · "}
                                  {booking.customer_name}
                                  {" · Kalan "}
                                  {money(
                                    booking.sale_total -
                                      booking.paid_total
                                  )}
                                </option>
                              )
                            )}
                          </select>
                        </label>


                        <label>
                          <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                            Tutar
                          </span>

                          <input
                            type="number"
                            value={
                              paymentAmount
                            }
                            onChange={(event) =>
                              setPaymentAmount(
                                event.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                          />
                        </label>


                        <label>
                          <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                            Ödeme Yöntemi
                          </span>

                          <select
                            value={
                              paymentMethod
                            }
                            onChange={(event) =>
                              setPaymentMethod(
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                          >
                            <option value="cash">Nakit</option>
                            <option value="card">Kart</option>
                            <option value="bank_transfer">Havale</option>
                            <option value="online">Online</option>
                            <option value="partner_account">Partner Cari</option>
                          </select>
                        </label>


                        <button
                          type="submit"
                          className="w-full rounded-xl bg-emerald-500 px-5 py-4 font-black text-slate-950"
                        >
                          Tahsilatı Kaydet
                        </button>

                      </form>

                    </div>


                    <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

                      <h3 className="text-xl font-black">
                        Gider Ekle
                      </h3>

                      <form
                        onSubmit={
                          createExpense
                        }
                        className="mt-5 space-y-4"
                      >

                        <label>
                          <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                            Kategori
                          </span>

                          <select
                            value={
                              expenseCategory
                            }
                            onChange={(event) =>
                              setExpenseCategory(
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                          >
                            <option value="operasyon">Operasyon</option>
                            <option value="personel">Personel</option>
                            <option value="yakıt">Yakıt</option>
                            <option value="ekipman">Ekipman</option>
                            <option value="bakım">Bakım</option>
                            <option value="pazarlama">Pazarlama</option>
                            <option value="diğer">Diğer</option>
                          </select>
                        </label>


                        <label>
                          <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                            Açıklama
                          </span>

                          <input
                            value={
                              expenseDescription
                            }
                            onChange={(event) =>
                              setExpenseDescription(
                                event.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                          />
                        </label>


                        <label>
                          <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
                            Tutar
                          </span>

                          <input
                            type="number"
                            value={
                              expenseAmount
                            }
                            onChange={(event) =>
                              setExpenseAmount(
                                event.target.value
                              )
                            }
                            required
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                          />
                        </label>


                        <button
                          type="submit"
                          className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black"
                        >
                          Gider Kaydet
                        </button>

                      </form>

                    </div>

                  </div>


                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-5">

                    <h3 className="text-xl font-black">
                      Son Giderler
                    </h3>

                    <div className="mt-4 space-y-2">

                      {expenses.slice(
                        0,
                        20
                      ).map(
                        (
                          expense
                        ) => (
                          <div
                            key={
                              expense.id
                            }
                            className="flex items-center justify-between gap-4 rounded-xl bg-slate-950 p-4"
                          >
                            <div>
                              <div className="font-black">
                                {expense.description}
                              </div>
                              <div className="mt-1 text-[9px] uppercase text-slate-500">
                                {expense.category}
                                {" · "}
                                {expense.expense_date}
                              </div>
                            </div>

                            <div className="font-black text-orange-400">
                              {money(
                                expense.amount,
                                expense.currency
                              )}
                            </div>
                          </div>
                        )
                      )}

                    </div>

                  </div>

                </div>

              )

            )}


            {/* =================================================
                MARKETPLACE
            ================================================= */}

            {section ===
              "marketplace" && (

              <div>

                <div className="rounded-3xl border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 to-transparent p-6">

                  <div className="text-[9px] font-black uppercase tracking-[.16em] text-fuchsia-300">
                    TUROBUS MARKETPLACE
                  </div>

                  <h2 className="mt-2 text-3xl font-black">
                    Ürünlerini Turobus müşterilerine aç.
                  </h2>

                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                    Direkt, WhatsApp, Instagram, otel, acente ve dış satışçı rezervasyonlarında Turobus komisyonu yoktur. Turobus komisyonu yalnızca Marketplace tarafından üretilen rezervasyonda oluşur.
                  </p>

                </div>


                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                  {activities.map(
                    (
                      activity
                    ) => {

                      const resource =
                        marketResources.find(
                          (
                            item
                          ) =>
                            item.source_id ===
                            activity.id
                        );


                      return (
                        <div
                          key={
                            activity.id
                          }
                          className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                        >

                          <div className="text-lg font-black">
                            {activity.name}
                          </div>

                          <div className="mt-2 text-xs text-slate-500">
                            {activity.city}
                            {" · "}
                            {money(
                              activity.default_sale_price,
                              activity.currency
                            )}
                          </div>


                          <button
                            type="button"
                            onClick={() =>
                              void setMarketplace(
                                activity.id,
                                !Boolean(
                                  resource?.marketplace_enabled
                                )
                              )
                            }
                            className={`mt-5 w-full rounded-xl px-4 py-3 text-xs font-black ${
                              resource?.marketplace_enabled
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-fuchsia-500 text-white"
                            }`}
                          >
                            {resource?.marketplace_enabled
                              ? "Marketplace'te Yayında"
                              : "Marketplace'e Aç"}
                          </button>

                        </div>
                      );

                    }
                  )}

                </div>

              </div>

            )}


            {/* =================================================
                REPORTS
            ================================================= */}

            {section ===
              "reports" && (

              <div>

                <h2 className="text-2xl font-black">
                  Yönetim Raporları
                </h2>


                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                  {activities.map(
                    (
                      activity
                    ) => {

                      const activityBookings =
                        bookings.filter(
                          (
                            booking
                          ) =>
                            booking.activity_id ===
                              activity.id &&
                            booking.status !==
                              "cancelled"
                        );


                      const totalGuests =
                        activityBookings.reduce(
                          (
                            sum,
                            booking
                          ) =>
                            sum +
                            booking.quantity,
                          0
                        );


                      const totalSales =
                        activityBookings.reduce(
                          (
                            sum,
                            booking
                          ) =>
                            sum +
                            Number(
                              booking.sale_total
                            ),
                          0
                        );


                      return (
                        <div
                          key={
                            activity.id
                          }
                          className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                        >

                          <div className="font-black">
                            {activity.name}
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-2">

                            <div className="rounded-xl bg-slate-950 p-3">
                              <div className="text-[8px] uppercase text-slate-600">
                                Misafir
                              </div>
                              <div className="mt-1 text-lg font-black">
                                {totalGuests}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-950 p-3">
                              <div className="text-[8px] uppercase text-slate-600">
                                Satış
                              </div>
                              <div className="mt-1 text-sm font-black">
                                {money(
                                  totalSales
                                )}
                              </div>
                            </div>

                          </div>

                        </div>
                      );

                    }
                  )}

                </div>

              </div>

            )}


            {/* =================================================
                SETTINGS
            ================================================= */}

            {section ===
              "settings" && (

              <div className="max-w-4xl">

                <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">

                  <h2 className="text-2xl font-black">
                    Activity OS Ayarları
                  </h2>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">

                    <div className="rounded-2xl bg-slate-950 p-5">
                      <div className="text-[9px] uppercase text-slate-500">
                        Para Birimi
                      </div>
                      <div className="mt-2 font-black">
                        TRY
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-5">
                      <div className="text-[9px] uppercase text-slate-500">
                        Marketplace Komisyonu
                      </div>
                      <div className="mt-2 font-black">
                        %10
                      </div>
                      <div className="mt-1 text-[9px] text-slate-600">
                        Yalnız Turobus Marketplace satışlarında.
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-5">
                      <div className="text-[9px] uppercase text-slate-500">
                        Misafir Portalı
                      </div>
                      <div className="mt-2 font-black text-emerald-400">
                        Aktif
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-5">
                      <div className="text-[9px] uppercase text-slate-500">
                        Partner Satış
                      </div>
                      <div className="mt-2 font-black text-emerald-400">
                        Aktif
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            )}

          </section>

        </div>

      </div>

    </main>
  );
}
