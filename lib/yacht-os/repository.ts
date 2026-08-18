
import {
  supabase,
} from "@/lib/supabase";

import type {
  YachtOSAvailability,
  YachtOSBooking,
  YachtOSFinanceEntry,
  YachtOSSupplier,
  YachtOSTask,
  YachtOSYacht,
} from "./types";


export async function loadYachtOS(
  companyId: string
) {
  const [
    yachts,
    bookings,
    availability,
    tasks,
    suppliers,
    finance,
  ] =
    await Promise.all([
      supabase
        .from(
          "yacht_os_yachts"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "yacht_os_bookings"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "start_date",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "yacht_os_availability"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "day",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "yacht_os_tasks"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "due_at",
          {
            ascending:
              true,
            nullsFirst:
              false,
          }
        ),

      supabase
        .from(
          "yacht_os_suppliers"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "yacht_os_finance_entries"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  const error =
    yachts.error ??
    bookings.error ??
    availability.error ??
    tasks.error ??
    suppliers.error ??
    finance.error;

  if (error) {
    throw error;
  }

  return {
    yachts:
      (yachts.data ??
        []) as YachtOSYacht[],

    bookings:
      (bookings.data ??
        []) as YachtOSBooking[],

    availability:
      (availability.data ??
        []) as YachtOSAvailability[],

    tasks:
      (tasks.data ??
        []) as YachtOSTask[],

    suppliers:
      (suppliers.data ??
        []) as YachtOSSupplier[],

    finance:
      (finance.data ??
        []) as YachtOSFinanceEntry[],
  };
}


export async function createYacht(
  input: {
    companyId: string;
    userId: string;
    name: string;
    yachtType: string;
    city: string;
    marina?: string;
    maxGuests: number;
    cabins: number;
    dailyPrice: number;
    captainName?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_yachts"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        name:
          input.name,

        yacht_type:
          input.yachtType,

        city:
          input.city,

        marina:
          input.marina ??
          null,

        max_guests:
          input.maxGuests,

        cabins:
          input.cabins,

        base_daily_price:
          input.dailyPrice,

        captain_name:
          input.captainName ??
          null,

        status:
          "available",
      })
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSYacht;
}


export async function setYachtStatus(
  yachtId: string,
  status:
    YachtOSYacht[
      "status"
    ]
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_yachts"
      )
      .update({
        status,
      })
      .eq(
        "id",
        yachtId
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSYacht;
}


export async function createYachtBooking(
  input: {
    companyId: string;
    userId: string;
    yachtId: string;
    bookingCode: string;
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    guestCount: number;
    startDate: string;
    endDate: string;
    source?: string;
    totalAmount: number;
    paidAmount?: number;
    commissionAmount?: number;
    supplierCost?: number;
  }
) {
  const paid =
    input.paidAmount ??
    0;

  const paymentStatus =
    paid <= 0
      ? "pending"
      : paid >=
        input.totalAmount
        ? "paid"
        : "partial";

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_bookings"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        yacht_id:
          input.yachtId,

        booking_code:
          input.bookingCode,

        guest_name:
          input.guestName,

        guest_phone:
          input.guestPhone ??
          null,

        guest_email:
          input.guestEmail ??
          null,

        guest_count:
          input.guestCount,

        start_date:
          input.startDate,

        end_date:
          input.endDate,

        source:
          input.source ??
          "Turobus",

        total_amount:
          input.totalAmount,

        paid_amount:
          paid,

        commission_amount:
          input.commissionAmount ??
          0,

        supplier_cost:
          input.supplierCost ??
          0,

        status:
          "pending",

        payment_status:
          paymentStatus,
      })
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSBooking;
}


export async function updateYachtBookingStatus(
  bookingId: string,
  status:
    YachtOSBooking[
      "status"
    ]
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_bookings"
      )
      .update({
        status,
      })
      .eq(
        "id",
        bookingId
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSBooking;
}


export async function createYachtTask(
  input: {
    companyId: string;
    userId: string;
    yachtId?: string;
    bookingId?: string;
    title: string;
    description?: string;
    dueAt?: string;
    assignedTo?: string;
    priority?:
      YachtOSTask[
        "priority"
      ];
  }
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_tasks"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        yacht_id:
          input.yachtId ??
          null,

        booking_id:
          input.bookingId ??
          null,

        title:
          input.title,

        description:
          input.description ??
          null,

        due_at:
          input.dueAt ??
          null,

        assigned_to_name:
          input.assignedTo ??
          null,

        priority:
          input.priority ??
          "medium",

        status:
          "open",
      })
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSTask;
}


export async function toggleYachtTask(
  task:
    YachtOSTask
) {
  const completed =
    task.status ===
    "completed";

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_tasks"
      )
      .update({
        status:
          completed
            ? "open"
            : "completed",

        completed_at:
          completed
            ? null
            : new Date()
                .toISOString(),
      })
      .eq(
        "id",
        task.id
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSTask;
}


export async function upsertYachtAvailability(
  input: {
    companyId: string;
    yachtId: string;
    day: string;
    status:
      YachtOSAvailability[
        "status"
      ];
    bookingId?: string;
    price?: number;
    note?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_availability"
      )
      .upsert(
        {
          company_id:
            input.companyId,

          yacht_id:
            input.yachtId,

          day:
            input.day,

          status:
            input.status,

          booking_id:
            input.bookingId ??
            null,

          price:
            input.price ??
            null,

          note:
            input.note ??
            null,
        },
        {
          onConflict:
            "yacht_id,day",
        }
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSAvailability;
}


export async function createYachtSupplier(
  input: {
    companyId: string;
    userId: string;
    name: string;
    category?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    commissionRate?: number;
  }
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_suppliers"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        name:
          input.name,

        category:
          input.category ??
          "yacht_owner",

        contact_name:
          input.contactName ??
          null,

        phone:
          input.phone ??
          null,

        email:
          input.email ??
          null,

        commission_rate:
          input.commissionRate ??
          0,

        status:
          "active",
      })
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSSupplier;
}


export async function createYachtFinanceEntry(
  input: {
    companyId: string;
    userId: string;
    bookingId?: string;
    supplierId?: string;
    type:
      YachtOSFinanceEntry[
        "entry_type"
      ];
    amount: number;
    currency?: string;
    dueDate?: string;
    description?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_finance_entries"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        booking_id:
          input.bookingId ??
          null,

        supplier_id:
          input.supplierId ??
          null,

        entry_type:
          input.type,

        amount:
          input.amount,

        currency:
          input.currency ??
          "TRY",

        due_date:
          input.dueDate ??
          null,

        description:
          input.description ??
          null,
      })
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSFinanceEntry;
}


export async function setYachtBookingOperationStatus(
  bookingId: string,
  operationStatus:
    YachtOSBooking[
      "operation_status"
    ]
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_bookings"
      )
      .update({
        operation_status:
          operationStatus,
      })
      .eq(
        "id",
        bookingId
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtOSBooking;
}
