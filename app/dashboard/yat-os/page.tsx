"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaAnchor,
  FaBell,
  FaCalendarAlt,
  FaChartLine,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaCopy,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaFilter,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaShip,
  FaTasks,
  FaTimes,
  FaUserTie,
  FaUsers,
  FaWallet,
  FaWhatsapp,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  createYacht,
  createYachtBooking,
  createYachtSupplier,
  createYachtTask,
  loadYachtOS,
  setYachtStatus,
  setYachtBookingOperationStatus,
  toggleYachtTask,
  updateYachtBookingStatus,
  upsertYachtAvailability,
} from "@/lib/yacht-os/repository";

import type {
  YachtOSAvailability,
  YachtOSBooking,
  YachtOSSupplier,
  YachtOSTask,
  YachtOSYacht,
} from "@/lib/yacht-os/types";


type Section =
  | "overview"
  | "fleet"
  | "bookings"
  | "calendar"
  | "operations"
  | "finance"
  | "suppliers";


type Modal =
  | "yacht"
  | "booking"
  | "task"
  | "supplier"
  | null;


type FormState = {
  yachtName: string;
  yachtType: string;
  city: string;
  marina: string;
  maxGuests: string;
  cabins: string;
  dailyPrice: string;
  captainName: string;

  bookingYachtId: string;
  guestName: string;
  guestPhone: string;
  guestCount: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  paidAmount: string;
  commissionAmount: string;

  taskTitle: string;
  taskYachtId: string;
  taskAssignee: string;
  taskDueAt: string;
  taskPriority: string;

  supplierName: string;
  supplierContact: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierCommission: string;
};


const emptyForm: FormState = {
  yachtName: "",
  yachtType: "motor_yacht",
  city: "Fethiye",
  marina: "",
  maxGuests: "8",
  cabins: "2",
  dailyPrice: "",
  captainName: "",

  bookingYachtId: "",
  guestName: "",
  guestPhone: "",
  guestCount: "2",
  startDate: "",
  endDate: "",
  totalAmount: "",
  paidAmount: "0",
  commissionAmount: "0",

  taskTitle: "",
  taskYachtId: "",
  taskAssignee: "",
  taskDueAt: "",
  taskPriority: "medium",

  supplierName: "",
  supplierContact: "",
  supplierPhone: "",
  supplierEmail: "",
  supplierCommission: "15",
};


const yachtTypes = [
  ["motor_yacht", "Motor Yat"],
  ["gulet", "Gulet"],
  ["catamaran", "Katamaran"],
  ["sailing", "Yelkenli"],
  ["daily_boat", "Günlük Özel Tekne"],
];


function money(
  value: number,
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
      value || 0
    )
  );
}


function shortDate(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

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
      day: "2-digit",
      month: "short",
    }
  ).format(date);
}


function yachtStatusLabel(
  value:
    YachtOSYacht["status"]
) {
  if (
    value ===
    "available"
  ) {
    return "Müsait";
  }

  if (
    value === "trip"
  ) {
    return "Seferde";
  }

  if (
    value ===
    "maintenance"
  ) {
    return "Bakımda";
  }

  return "Pasif";
}


function yachtStatusTone(
  value:
    YachtOSYacht["status"]
) {
  if (
    value ===
    "available"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value === "trip"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    value ===
    "maintenance"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


function bookingStatusLabel(
  value:
    YachtOSBooking["status"]
) {
  if (
    value ===
    "confirmed"
  ) {
    return "Onaylandı";
  }

  if (
    value ===
    "completed"
  ) {
    return "Tamamlandı";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "İptal";
  }

  return "Onay Bekliyor";
}



function operationStatusLabel(
  value:
    YachtOSBooking[
      "operation_status"
    ]
) {
  if (value === "ready") {
    return "Tekne Hazır";
  }

  if (
    value ===
    "guest_arrived"
  ) {
    return "Misafir Geldi";
  }

  if (
    value ===
    "departed"
  ) {
    return "Çıkış Yapıldı";
  }

  if (
    value ===
    "cruising"
  ) {
    return "Seyirde";
  }

  if (
    value ===
    "returning"
  ) {
    return "Dönüşte";
  }

  if (
    value ===
    "completed"
  ) {
    return "Tamamlandı";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "İptal";
  }

  return "Hazırlanıyor";
}


function bookingStatusTone(
  value:
    YachtOSBooking["status"]
) {
  if (
    value ===
    "confirmed"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value ===
    "completed"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}


function availabilityTone(
  value:
    YachtOSAvailability[
      "status"
    ]
) {
  if (
    value ===
    "booked"
  ) {
    return "border-blue-500/20 bg-blue-500/[.08] text-blue-300";
  }

  if (
    value ===
    "option"
  ) {
    return "border-amber-500/20 bg-amber-500/[.08] text-amber-300";
  }

  if (
    value ===
      "maintenance" ||
    value ===
      "blocked"
  ) {
    return "border-red-500/20 bg-red-500/[.08] text-red-300";
  }

  return "border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300";
}


function availabilityLabel(
  value:
    YachtOSAvailability[
      "status"
    ]
) {
  if (
    value ===
    "booked"
  ) {
    return "Dolu";
  }

  if (
    value ===
    "option"
  ) {
    return "Opsiyon";
  }

  if (
    value ===
    "maintenance"
  ) {
    return "Bakım";
  }

  if (
    value ===
    "blocked"
  ) {
    return "Kapalı";
  }

  return "Müsait";
}


function daysFromToday(
  count: number
) {
  const rows:
    string[] = [];

  for (
    let i = 0;
    i < count;
    i += 1
  ) {
    const date =
      new Date();

    date.setHours(
      12,
      0,
      0,
      0
    );

    date.setDate(
      date.getDate() +
        i
    );

    rows.push(
      date
        .toISOString()
        .slice(
          0,
          10
        )
    );
  }

  return rows;
}


function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.18em] text-slate-600">
            {title}
          </div>

          <div className="mt-3 text-2xl font-black tracking-tight">
            {value}
          </div>

          <div className="mt-2 text-[10px] text-slate-500">
            {detail}
          </div>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
          {icon}
        </div>
      </div>
    </div>
  );
}


function NavButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children:
    React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-[10px] font-black transition ${
        active
          ? "bg-orange-500 text-white"
          : "border border-white/10 bg-white/[.025] text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}


export default function YachtOSPage() {
  const [
    section,
    setSection,
  ] =
    useState<Section>(
      "overview"
    );

  const [
    modal,
    setModal,
  ] =
    useState<Modal>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    yachtFilter,
    setYachtFilter,
  ] =
    useState("all");

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    companyName,
    setCompanyName,
  ] =
    useState("");

  const [
    yachts,
    setYachts,
  ] =
    useState<
      YachtOSYacht[]
    >([]);

  const [
    bookings,
    setBookings,
  ] =
    useState<
      YachtOSBooking[]
    >([]);

  const [
    availability,
    setAvailability,
  ] =
    useState<
      YachtOSAvailability[]
    >([]);

  const [
    tasks,
    setTasks,
  ] =
    useState<
      YachtOSTask[]
    >([]);

  const [
    suppliers,
    setSuppliers,
  ] =
    useState<
      YachtOSSupplier[]
    >([]);

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      emptyForm
    );


  const days =
    useMemo(
      () =>
        daysFromToday(
          8
        ),
      []
    );


  const refresh =
    useCallback(
      async (
        nextCompanyId:
          string
      ) => {
        const data =
          await loadYachtOS(
            nextCompanyId
          );

        setYachts(
          data.yachts
        );

        setBookings(
          data.bookings
        );

        setAvailability(
          data.availability
        );

        setTasks(
          data.tasks
        );

        setSuppliers(
          data.suppliers
        );
      },
      []
    );


  useEffect(
    () => {
      async function boot() {
        setLoading(true);
        setError("");

        try {
          const user =
            await getCurrentUser();

          if (!user) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              user.id
            );

          if (
            !membership
          ) {
            throw new Error(
              "Aktif firma üyeliği bulunamadı."
            );
          }

          setUserId(
            user.id
          );

          setCompanyId(
            membership.company_id
          );

          setCompanyName(
            membership.company
              .name
          );

          await refresh(
            membership.company_id
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
          setLoading(
            false
          );
        }
      }

      void boot();
    },
    [
      refresh,
    ]
  );


  function toast(
    message: string
  ) {
    setNotice(
      message
    );

    window.setTimeout(
      () =>
        setNotice(""),
      2300
    );
  }


  function patchForm(
    patch:
      Partial<FormState>
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        ...patch,
      })
    );
  }


  function closeModal() {
    setModal(null);

    setForm(
      emptyForm
    );
  }


  async function runMutation(
    callback:
      () =>
        Promise<void>,
    message: string
  ) {
    if (
      !companyId ||
      !userId
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await callback();

      await refresh(
        companyId
      );

      closeModal();

      toast(
        message
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
      setSaving(
        false
      );
    }
  }


  async function saveYacht() {
    if (
      !form.yachtName.trim() ||
      !form.city.trim()
    ) {
      setError(
        "Tekne adı ve şehir zorunlu."
      );

      return;
    }

    await runMutation(
      async () => {
        await createYacht({
          companyId,
          userId,
          name:
            form.yachtName.trim(),
          yachtType:
            form.yachtType,
          city:
            form.city.trim(),
          marina:
            form.marina.trim(),
          maxGuests:
            Math.max(
              1,
              Number(
                form.maxGuests
              ) || 1
            ),
          cabins:
            Math.max(
              0,
              Number(
                form.cabins
              ) || 0
            ),
          dailyPrice:
            Math.max(
              0,
              Number(
                form.dailyPrice
              ) || 0
            ),
          captainName:
            form.captainName.trim(),
        });
      },
      "Tekne filoya eklendi."
    );
  }


  async function saveBooking() {
    if (
      !form.bookingYachtId ||
      !form.guestName.trim() ||
      !form.startDate ||
      !form.endDate
    ) {
      setError(
        "Tekne, misafir ve tarihler zorunlu."
      );

      return;
    }

    if (
      form.endDate <
      form.startDate
    ) {
      setError(
        "Dönüş tarihi başlangıç tarihinden önce olamaz."
      );

      return;
    }

    await runMutation(
      async () => {
        const booking =
          await createYachtBooking({
            companyId,
            userId,

            yachtId:
              form.bookingYachtId,

            bookingCode:
              `YAT-${Date.now()
                .toString()
                .slice(-7)}`,

            guestName:
              form.guestName.trim(),

            guestPhone:
              form.guestPhone.trim(),

            guestCount:
              Math.max(
                1,
                Number(
                  form.guestCount
                ) || 1
              ),

            startDate:
              form.startDate,

            endDate:
              form.endDate,

            totalAmount:
              Math.max(
                0,
                Number(
                  form.totalAmount
                ) || 0
              ),

            paidAmount:
              Math.max(
                0,
                Number(
                  form.paidAmount
                ) || 0
              ),

            commissionAmount:
              Math.max(
                0,
                Number(
                  form.commissionAmount
                ) || 0
              ),
          });

        const start =
          new Date(
            `${form.startDate}T12:00:00`
          );

        const end =
          new Date(
            `${form.endDate}T12:00:00`
          );

        const cursor =
          new Date(start);

        while (
          cursor <= end
        ) {
          const day =
            cursor
              .toISOString()
              .slice(
                0,
                10
              );

          await upsertYachtAvailability({
            companyId,
            yachtId:
              form.bookingYachtId,
            day,
            status:
              "booked",
            bookingId:
              booking.id,
          });

          cursor.setDate(
            cursor.getDate() +
              1
          );
        }
      },
      "Rezervasyon oluşturuldu ve takvim kapatıldı."
    );
  }


  async function saveTask() {
    if (
      !form.taskTitle.trim()
    ) {
      setError(
        "Görev başlığı zorunlu."
      );

      return;
    }

    await runMutation(
      async () => {
        await createYachtTask({
          companyId,
          userId,

          yachtId:
            form.taskYachtId ||
            undefined,

          title:
            form.taskTitle.trim(),

          assignedTo:
            form.taskAssignee.trim(),

          dueAt:
            form.taskDueAt
              ? new Date(
                  form.taskDueAt
                ).toISOString()
              : undefined,

          priority:
            form.taskPriority as
              YachtOSTask[
                "priority"
              ],
        });
      },
      "Operasyon görevi oluşturuldu."
    );
  }


  async function saveSupplier() {
    if (
      !form.supplierName.trim()
    ) {
      setError(
        "Tedarikçi adı zorunlu."
      );

      return;
    }

    await runMutation(
      async () => {
        await createYachtSupplier({
          companyId,
          userId,

          name:
            form.supplierName.trim(),

          contactName:
            form.supplierContact.trim(),

          phone:
            form.supplierPhone.trim(),

          email:
            form.supplierEmail.trim(),

          commissionRate:
            Math.max(
              0,
              Math.min(
                100,
                Number(
                  form.supplierCommission
                ) || 0
              )
            ),
        });
      },
      "Tedarikçi kaydedildi."
    );
  }


  async function cycleYachtStatus(
    yacht:
      YachtOSYacht
  ) {
    const order:
      YachtOSYacht[
        "status"
      ][] = [
        "available",
        "trip",
        "maintenance",
        "passive",
      ];

    const index =
      order.indexOf(
        yacht.status
      );

    const next =
      order[
        (
          index +
          1
        ) %
          order.length
      ];

    setSaving(true);

    try {
      await setYachtStatus(
        yacht.id,
        next
      );

      await refresh(
        companyId
      );

      toast(
        "Tekne durumu güncellendi."
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
      setSaving(
        false
      );
    }
  }


  async function toggleTask(
    task:
      YachtOSTask
  ) {
    setSaving(true);

    try {
      await toggleYachtTask(
        task
      );

      await refresh(
        companyId
      );

      toast(
        "Görev güncellendi."
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
      setSaving(
        false
      );
    }
  }



  function publicUrl(
    path: string
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return path;
    }

    return (
      `${window.location.origin}${path}`
    );
  }


  async function copyLink(
    path: string,
    success:
      string
  ) {
    const url =
      publicUrl(path);

    try {
      await navigator
        .clipboard
        .writeText(url);

      toast(success);
    } catch {
      window.prompt(
        "Bağlantıyı kopyala:",
        url
      );
    }
  }


  function openPublicPage(
    path: string
  ) {
    window.open(
      publicUrl(path),
      "_blank",
      "noopener,noreferrer"
    );
  }


  function shareWhatsapp(
    booking:
      YachtOSBooking
  ) {
    const tracking =
      publicUrl(
        `/yat-takip/${booking.tracking_token}`
      );

    const voucher =
      publicUrl(
        `/yat-voucher/${booking.voucher_token}`
      );

    const message = [
      "Turobus Yat & Tekne Rezervasyonu",
      "",
      `Rezervasyon: ${booking.booking_code}`,
      `Misafir: ${booking.guest_name}`,
      "",
      `Canlı takip: ${tracking}`,
      `Voucher: ${voucher}`,
    ].join("\\n");

    const phone =
      (
        booking.guest_phone ??
        ""
      ).replace(
        /\\D/g,
        ""
      );

    const target =
      phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(
      target,
      "_blank",
      "noopener,noreferrer"
    );
  }


  async function changeOperationStatus(
    booking:
      YachtOSBooking,
    next:
      YachtOSBooking[
        "operation_status"
      ]
  ) {
    if (!companyId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await setYachtBookingOperationStatus(
        booking.id,
        next
      );

      await refresh(
        companyId
      );

      toast(
        `Operasyon: ${operationStatusLabel(next)}`
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
      setSaving(false);
    }
  }


  async function confirmBooking(
    booking:
      YachtOSBooking
  ) {
    setSaving(true);

    try {
      await updateYachtBookingStatus(
        booking.id,
        "confirmed"
      );

      await refresh(
        companyId
      );

      toast(
        "Rezervasyon onaylandı."
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
      setSaving(
        false
      );
    }
  }


  function availabilityFor(
    yachtId: string,
    day: string
  ) {
    return (
      availability.find(
        (
          item
        ) =>
          item.yacht_id ===
            yachtId &&
          item.day === day
      )?.status ??
      "available"
    );
  }


  async function cycleAvailability(
    yachtId: string,
    day: string
  ) {
    const current =
      availabilityFor(
        yachtId,
        day
      );

    const order:
      YachtOSAvailability[
        "status"
      ][] = [
        "available",
        "option",
        "booked",
        "maintenance",
        "blocked",
      ];

    const index =
      order.indexOf(
        current
      );

    const next =
      order[
        (
          index +
          1
        ) %
          order.length
      ];

    setSaving(true);

    try {
      await upsertYachtAvailability({
        companyId,
        yachtId,
        day,
        status:
          next,
      });

      await refresh(
        companyId
      );

      toast(
        "Müsaitlik güncellendi."
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
      setSaving(
        false
      );
    }
  }


  const filteredYachts =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );

        return yachts.filter(
          (
            yacht
          ) => {
            const text =
              `${yacht.name} ${yacht.city} ${yacht.marina ?? ""} ${yacht.yacht_type}`
                .toLocaleLowerCase(
                  "tr"
                );

            const matchesText =
              !needle ||
              text.includes(
                needle
              );

            const matchesStatus =
              yachtFilter ===
                "all" ||
              yacht.status ===
                yachtFilter;

            return (
              matchesText &&
              matchesStatus
            );
          }
        );
      },
      [
        yachts,
        query,
        yachtFilter,
      ]
    );


  const filteredBookings =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );

        return bookings.filter(
          (
            booking
          ) => {
            const yacht =
              yachts.find(
                (
                  item
                ) =>
                  item.id ===
                  booking.yacht_id
              );

            const text =
              `${booking.booking_code} ${booking.guest_name} ${yacht?.name ?? ""} ${booking.source}`
                .toLocaleLowerCase(
                  "tr"
                );

            return (
              !needle ||
              text.includes(
                needle
              )
            );
          }
        );
      },
      [
        bookings,
        yachts,
        query,
      ]
    );


  const totalSales =
    bookings
      .filter(
        (
          booking
        ) =>
          booking.status !==
          "cancelled"
      )
      .reduce(
        (
          total,
          booking
        ) =>
          total +
          Number(
            booking.total_amount
          ),
        0
      );


  const totalPaid =
    bookings.reduce(
      (
        total,
        booking
      ) =>
        total +
        Number(
          booking.paid_amount
        ),
      0
    );


  const totalCommission =
    bookings.reduce(
      (
        total,
        booking
      ) =>
        total +
        Number(
          booking.commission_amount
        ),
      0
    );


  const openBalance =
    Math.max(
      0,
      totalSales -
        totalPaid
    );


  const activeTasks =
    tasks.filter(
      (
        task
      ) =>
        task.status !==
          "completed" &&
        task.status !==
          "cancelled"
    );


  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <div className="text-center">
          <FaShip className="mx-auto animate-pulse text-3xl text-orange-400" />

          <div className="mt-4 text-sm font-black">
            Yat & Tekne OS yükleniyor...
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">
          <FaCheckCircle className="text-emerald-400" />

          <span className="text-xs font-black">
            {notice}
          </span>
        </div>
      )}


      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                  TUROBUS YACHT OS
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-300">
                  ● Supabase canlı
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Yat & Tekne{" "}
                <span className="text-orange-400">
                  Operasyon Merkezi
                </span>
              </h1>

              <p className="mt-3 text-xs text-slate-400">
                {companyName || "Aktif firma"}
                {" · "}
                Filo, rezervasyon, müsaitlik,
                operasyon ve finans tek merkezde.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <Link
                href="/dashboard/yat-os/sales-commission"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
              >
                <FaCoins />
                Prim & Komisyon Merkezi
              </Link>

              <Link
                href="/dashboard/yat-os/sales-team"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 text-xs font-black text-cyan-300 transition hover:bg-cyan-500 hover:text-white"
              >
                <FaUsers />
                Satış Ekibi & Hedefler
              </Link>

              <Link
                href="/dashboard/yat-os/sales-performance"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 text-xs font-black text-blue-300 transition hover:bg-blue-500 hover:text-white"
              >
                <FaChartLine />
                Satış Performans Merkezi
              </Link>

              <Link
                href="/dashboard/yat-os/crm-automation"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-xs font-black text-red-300 transition hover:bg-red-500 hover:text-white"
              >
                <FaBell />
                CRM Otomasyon & Alarm
              </Link>

              <Link
                href="/dashboard/yat-os/crm-center"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 text-xs font-black text-orange-300 transition hover:bg-orange-500 hover:text-white"
              >
                <FaUsers />
                CRM & Lead Center
              </Link>

              <Link
                href="/dashboard/yat-os/revenue-intelligence"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 text-xs font-black text-violet-300 transition hover:bg-violet-500 hover:text-white"
              >
                <FaChartLine />
                Revenue Intelligence
              </Link>

              <Link
                href="/dashboard/yat-os/revenue-center"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
              >
                <FaChartLine />
                Revenue & Fiyat Merkezi
              </Link>

              <Link
                href="/dashboard/yat-os/fleet-maintenance"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 text-xs font-black text-amber-300 transition hover:bg-amber-500 hover:text-white"
              >
                <FaShip />
                Filo Bakım & Evrak
              </Link>

              <Link
                href="/dashboard/yat-os/dispatch-center"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-xs font-black text-red-300 transition hover:bg-red-500 hover:text-white"
              >
                <FaExclamationTriangle />
                Sefer Çıkış Kontrol
              </Link>

              <Link
                href="/dashboard/yat-os/operation-center"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 text-xs font-black text-blue-300 transition hover:bg-blue-500 hover:text-white"
              >
                <FaTasks />
                Operasyon Merkezi
              </Link>

              <Link
                href="/dashboard/yat-os/finance-center"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
              >
                <FaWallet />
                Finans & Tahsilat
              </Link>

              <Link
                href="/dashboard/yat-os/sales-center"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
              >
                <FaCoins />
                Satış & Teklif
              </Link>

              <Link
                href="/dashboard/yat-os/control-tower"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-xs font-black text-red-300 transition hover:bg-red-500 hover:text-white"
              >
                <FaBell />
                Control Tower
              </Link>

              <Link
                href="/dashboard/yat-os/partner-center"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 text-xs font-black text-orange-300 transition hover:bg-orange-500 hover:text-white"
              >
                <FaUserTie />
                Partner Control
              </Link>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "task"
                  )
                }
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 text-xs font-black"
              >
                <FaTasks />
                Görev
              </button>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "booking"
                  )
                }
                disabled={
                  yachts.length ===
                  0
                }
                className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaPlus />
                Yeni Rezervasyon
              </button>
            </div>
          </div>
        </section>


        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-400" />

            <div className="min-w-0 flex-1 text-xs font-bold text-red-200">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-red-300"
            >
              <FaTimes />
            </button>
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Aktif Filo"
            value={String(
              yachts.filter(
                (
                  yacht
                ) =>
                  yacht.status !==
                  "passive"
              ).length
            )}
            detail={`${yachts.length} kayıtlı tekne`}
            icon={<FaShip />}
          />

          <StatCard
            title="Rezervasyon"
            value={String(
              bookings.length
            )}
            detail="Toplam yat rezervasyonu"
            icon={<FaCalendarAlt />}
          />

          <StatCard
            title="Açık Görev"
            value={String(
              activeTasks.length
            )}
            detail="Operasyon takibi"
            icon={<FaTasks />}
          />

          <StatCard
            title="Tahsilat"
            value={money(
              totalPaid
            )}
            detail={`${money(
              openBalance
            )} açık bakiye`}
            icon={<FaWallet />}
          />

          <StatCard
            title="Komisyon"
            value={money(
              totalCommission
            )}
            detail="Turobus brüt komisyon"
            icon={<FaCoins />}
          />
        </section>


        <section className="mt-5 overflow-x-auto rounded-[22px] border border-white/10 bg-[#07131f] p-2">
          <div className="flex min-w-max gap-2">
            <NavButton
              active={
                section ===
                "overview"
              }
              onClick={() =>
                setSection(
                  "overview"
                )
              }
            >
              Genel Bakış
            </NavButton>

            <NavButton
              active={
                section ===
                "fleet"
              }
              onClick={() =>
                setSection(
                  "fleet"
                )
              }
            >
              Filo
            </NavButton>

            <NavButton
              active={
                section ===
                "bookings"
              }
              onClick={() =>
                setSection(
                  "bookings"
                )
              }
            >
              Rezervasyonlar
            </NavButton>

            <NavButton
              active={
                section ===
                "calendar"
              }
              onClick={() =>
                setSection(
                  "calendar"
                )
              }
            >
              Müsaitlik Takvimi
            </NavButton>

            <NavButton
              active={
                section ===
                "operations"
              }
              onClick={() =>
                setSection(
                  "operations"
                )
              }
            >
              Operasyon
            </NavButton>

            <NavButton
              active={
                section ===
                "finance"
              }
              onClick={() =>
                setSection(
                  "finance"
                )
              }
            >
              Finans
            </NavButton>

            <NavButton
              active={
                section ===
                "suppliers"
              }
              onClick={() =>
                setSection(
                  "suppliers"
                )
              }
            >
              Tedarikçiler
            </NavButton>
          </div>
        </section>


        {section ===
          "overview" && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">

            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-black">
                    Filo Durumu
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    Canlı Supabase kayıtları
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModal(
                      "yacht"
                    )
                  }
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black"
                >
                  <FaPlus />
                  Tekne Ekle
                </button>
              </div>

              {yachts.length ===
              0 ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-white/10 p-10 text-center">
                  <FaShip className="mx-auto text-3xl text-slate-700" />

                  <div className="mt-4 text-sm font-black">
                    Henüz filoda tekne yok
                  </div>

                  <div className="mt-2 text-[10px] text-slate-500">
                    İlk tekneyi ekleyerek Yat OS operasyonunu başlat.
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {yachts
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (
                        yacht
                      ) => (
                        <button
                          type="button"
                          key={
                            yacht.id
                          }
                          onClick={() =>
                            void cycleYachtStatus(
                              yacht
                            )
                          }
                          className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-orange-500/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-black">
                                {
                                  yacht.name
                                }
                              </div>

                              <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-500">
                                <FaMapMarkerAlt />
                                {
                                  yacht.city
                                }
                                {yacht.marina
                                  ? ` · ${yacht.marina}`
                                  : ""}
                              </div>
                            </div>

                            <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${yachtStatusTone(
                              yacht.status
                            )}`}>
                              {yachtStatusLabel(
                                yacht.status
                              )}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-white/[.06] pt-3">
                            <span className="text-[9px] text-slate-500">
                              {
                                yacht.max_guests
                              } kişi · {
                                yacht.cabins
                              } kabin
                            </span>

                            <span className="text-[10px] font-black text-orange-300">
                              {money(
                                yacht.base_daily_price,
                                yacht.currency
                              )}
                            </span>
                          </div>
                        </button>
                      )
                    )}
                </div>
              )}
            </section>


            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-400">
                  <FaBell />
                </div>

                <div>
                  <div className="text-sm font-black">
                    Kontrol Merkezi
                  </div>

                  <div className="text-[9px] text-slate-500">
                    Anlık operasyon riskleri
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[.05] p-4">
                  <div className="text-xs font-black">
                    {
                      bookings.filter(
                        (
                          booking
                        ) =>
                          booking.payment_status !==
                          "paid"
                      ).length
                    } ödeme açık
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Tam tahsil edilmemiş rezervasyonlar.
                  </div>
                </div>

                <div className="rounded-2xl border border-red-500/20 bg-red-500/[.05] p-4">
                  <div className="text-xs font-black">
                    {
                      activeTasks.filter(
                        (
                          task
                        ) =>
                          task.priority ===
                            "high" ||
                          task.priority ===
                            "critical"
                      ).length
                    } kritik görev
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Operasyon öncesi kontrol edilmeli.
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[.05] p-4">
                  <div className="text-xs font-black">
                    {
                      yachts.filter(
                        (
                          yacht
                        ) =>
                          yacht.status ===
                          "maintenance"
                      ).length
                    } tekne bakımda
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Müsaitlik takvimini etkileyebilir.
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}


        {section ===
          "fleet" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

                <input
                  value={
                    query
                  }
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Tekne, şehir, marina ara..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.03] pl-10 pr-4 text-xs outline-none focus:border-orange-500/40"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto">
                <FaFilter className="my-auto text-slate-600" />

                {[
                  ["all", "Tümü"],
                  ["available", "Müsait"],
                  ["trip", "Seferde"],
                  ["maintenance", "Bakım"],
                ].map(
                  (
                    [
                      value,
                      label,
                    ]
                  ) => (
                    <button
                      type="button"
                      key={
                        value
                      }
                      onClick={() =>
                        setYachtFilter(
                          value
                        )
                      }
                      className={`rounded-xl px-3 py-3 text-[9px] font-black ${
                        yachtFilter ===
                        value
                          ? "bg-orange-500"
                          : "border border-white/10 text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() =>
                    setModal(
                      "yacht"
                    )
                  }
                  className="rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black"
                >
                  + Tekne
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredYachts.map(
                (
                  yacht
                ) => (
                  <div
                    key={
                      yacht.id
                    }
                    className="rounded-[24px] border border-white/10 bg-white/[.025] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="grid h-13 w-13 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                          <FaShip />
                        </div>

                        <div>
                          <div className="text-base font-black">
                            {
                              yacht.name
                            }
                          </div>

                          <div className="mt-1 text-[9px] text-slate-500">
                            {
                              yacht.yacht_type
                            }
                            {" · "}
                            {
                              yacht.city
                            }
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void cycleYachtStatus(
                            yacht
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-[8px] font-black ${yachtStatusTone(
                          yacht.status
                        )}`}
                      >
                        {yachtStatusLabel(
                          yacht.status
                        )}
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Info
                        title="Kapasite"
                        value={`${yacht.max_guests} kişi`}
                      />

                      <Info
                        title="Kabin"
                        value={String(
                          yacht.cabins
                        )}
                      />

                      <Info
                        title="Kaptan"
                        value={
                          yacht.captain_name ||
                          "—"
                        }
                      />

                      <Info
                        title="Günlük"
                        value={money(
                          yacht.base_daily_price,
                          yacht.currency
                        )}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}


        {section ===
          "bookings" && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center">
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

                <input
                  value={
                    query
                  }
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Rezervasyon veya misafir ara..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.03] pl-10 pr-4 text-xs outline-none"
                />
              </div>

              <button
                type="button"
                disabled={
                  yachts.length ===
                  0
                }
                onClick={() =>
                  setModal(
                    "booking"
                  )
                }
                className="h-12 rounded-xl bg-orange-500 px-5 text-[9px] font-black disabled:opacity-40"
              >
                + Rezervasyon
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-left">
                <thead className="bg-white/[.025]">
                  <tr className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    <th className="px-5 py-4">
                      Misafir
                    </th>
                    <th className="px-5 py-4">
                      Tekne
                    </th>
                    <th className="px-5 py-4">
                      Tarih
                    </th>
                    <th className="px-5 py-4">
                      Kişi
                    </th>
                    <th className="px-5 py-4">
                      Satış
                    </th>
                    <th className="px-5 py-4">
                      Tahsil
                    </th>
                    <th className="px-5 py-4">
                      Rezervasyon
                    </th>
                    <th className="px-5 py-4">
                      Operasyon
                    </th>
                    <th className="px-5 py-4">
                      Paylaşım
                    </th>
                    <th className="px-5 py-4">
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map(
                    (
                      booking
                    ) => {
                      const yacht =
                        yachts.find(
                          (
                            item
                          ) =>
                            item.id ===
                            booking.yacht_id
                        );

                      return (
                        <tr
                          key={
                            booking.id
                          }
                          className="border-t border-white/[.06] text-[10px]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-black">
                              {
                                booking.guest_name
                              }
                            </div>

                            <div className="mt-1 text-[8px] text-slate-600">
                              {
                                booking.booking_code
                              }
                            </div>
                          </td>

                          <td className="px-5 py-4 font-bold">
                            {
                              yacht?.name ??
                              "—"
                            }
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {shortDate(
                              booking.start_date
                            )}
                            {" → "}
                            {shortDate(
                              booking.end_date
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {
                              booking.guest_count
                            }
                          </td>

                          <td className="px-5 py-4 font-black">
                            {money(
                              booking.total_amount,
                              booking.currency
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-black text-emerald-300">
                              {money(
                                booking.paid_amount,
                                booking.currency
                              )}
                            </div>

                            <div className="mt-1 text-[8px] text-slate-600">
                              Kalan{" "}
                              {money(
                                Math.max(
                                  0,
                                  booking.total_amount -
                                    booking.paid_amount
                                ),
                                booking.currency
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${bookingStatusTone(
                              booking.status
                            )}`}>
                              {bookingStatusLabel(
                                booking.status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={
                                booking.operation_status
                              }
                              disabled={
                                saving
                              }
                              onChange={(
                                event
                              ) =>
                                void changeOperationStatus(
                                  booking,
                                  event.target.value as
                                    YachtOSBooking[
                                      "operation_status"
                                    ]
                                )
                              }
                              className="h-9 min-w-[130px] rounded-lg border border-white/10 bg-[#0b1723] px-2 text-[8px] font-black outline-none focus:border-orange-500/40"
                            >
                              <option value="preparing">
                                Hazırlanıyor
                              </option>

                              <option value="ready">
                                Tekne Hazır
                              </option>

                              <option value="guest_arrived">
                                Misafir Geldi
                              </option>

                              <option value="departed">
                                Çıkış Yapıldı
                              </option>

                              <option value="cruising">
                                Seyirde
                              </option>

                              <option value="returning">
                                Dönüşte
                              </option>

                              <option value="completed">
                                Tamamlandı
                              </option>

                              <option value="cancelled">
                                İptal
                              </option>
                            </select>

                            <div className="mt-1 text-[7px] font-bold text-orange-300">
                              {operationStatusLabel(
                                booking.operation_status
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">

                              <button
                                type="button"
                                title="Takip linkini kopyala"
                                onClick={() =>
                                  void copyLink(
                                    `/yat-takip/${booking.tracking_token}`,
                                    "Takip linki kopyalandı."
                                  )
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-slate-300 transition hover:border-orange-500/30 hover:text-orange-300"
                              >
                                <FaCopy />
                              </button>

                              <button
                                type="button"
                                title="Canlı takibi aç"
                                onClick={() =>
                                  openPublicPage(
                                    `/yat-takip/${booking.tracking_token}`
                                  )
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg border border-blue-500/20 bg-blue-500/[.06] text-blue-300"
                              >
                                <FaExternalLinkAlt />
                              </button>

                              <button
                                type="button"
                                title="Voucher aç"
                                onClick={() =>
                                  openPublicPage(
                                    `/yat-voucher/${booking.voucher_token}`
                                  )
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg border border-orange-500/20 bg-orange-500/[.07] text-orange-300"
                              >
                                <FaAnchor />
                              </button>

                              <button
                                type="button"
                                title="WhatsApp ile gönder"
                                onClick={() =>
                                  shareWhatsapp(
                                    booking
                                  )
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300"
                              >
                                <FaWhatsapp />
                              </button>

                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {booking.status ===
                            "pending" ? (
                              <button
                                type="button"
                                disabled={
                                  saving
                                }
                                onClick={() =>
                                  void confirmBooking(
                                    booking
                                  )
                                }
                                className="rounded-lg bg-orange-500 px-3 py-2 text-[8px] font-black"
                              >
                                Onayla
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 text-[8px] font-black text-emerald-400">
                                <FaCheck />
                                Onaylı
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}


        {section ===
          "calendar" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
            <div>
              <div className="text-lg font-black">
                Müsaitlik Takvimi
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                Hücreye tıklayarak Müsait → Opsiyon → Dolu → Bakım → Kapalı durumları arasında geçiş yap.
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[220px_repeat(8,1fr)] gap-2">

                  <div />

                  {days.map(
                    (
                      day
                    ) => (
                      <div
                        key={
                          day
                        }
                        className="pb-2 text-center text-[8px] font-black text-slate-500"
                      >
                        {shortDate(
                          day
                        )}
                      </div>
                    )
                  )}

                  {yachts.flatMap(
                    (
                      yacht
                    ) => [
                      <div
                        key={`${yacht.id}-name`}
                        className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3"
                      >
                        <FaShip className="text-orange-400" />

                        <div>
                          <div className="text-[9px] font-black">
                            {
                              yacht.name
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              yacht.marina ||
                              yacht.city
                            }
                          </div>
                        </div>
                      </div>,

                      ...days.map(
                        (
                          day
                        ) => {
                          const status =
                            availabilityFor(
                              yacht.id,
                              day
                            );

                          return (
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              key={`${yacht.id}-${day}`}
                              onClick={() =>
                                void cycleAvailability(
                                  yacht.id,
                                  day
                                )
                              }
                              className={`min-h-14 rounded-xl border text-[8px] font-black ${availabilityTone(
                                status
                              )}`}
                            >
                              {availabilityLabel(
                                status
                              )}
                            </button>
                          );
                        }
                      ),
                    ]
                  )}
                </div>
              </div>
            </div>
          </section>
        )}


        {section ===
          "operations" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black">
                  Operasyon Görevleri
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  Personel, hazırlık, bakım ve çıkış kontrolleri
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "task"
                  )
                }
                className="rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black"
              >
                + Görev
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {tasks.length ===
              0 && (
                <EmptyState
                  icon={<FaTasks />}
                  title="Henüz görev yok"
                  text="İlk operasyon görevini oluştur."
                />
              )}

              {tasks.map(
                (
                  task
                ) => {
                  const yacht =
                    yachts.find(
                      (
                        item
                      ) =>
                        item.id ===
                        task.yacht_id
                    );

                  const done =
                    task.status ===
                    "completed";

                  return (
                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      key={
                        task.id
                      }
                      onClick={() =>
                        void toggleTask(
                          task
                        )
                      }
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                        done
                          ? "border-emerald-500/10 bg-emerald-500/[.03] opacity-60"
                          : "border-white/10 bg-white/[.025]"
                      }`}
                    >
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        done
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-orange-500/10 text-orange-400"
                      }`}>
                        {done
                          ? <FaCheckCircle />
                          : <FaTasks />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-black ${
                          done
                            ? "line-through"
                            : ""
                        }`}>
                          {
                            task.title
                          }
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          {
                            yacht?.name ??
                            "Genel görev"
                          }
                          {task.assigned_to_name
                            ? ` · ${task.assigned_to_name}`
                            : ""}
                        </div>
                      </div>

                      <div className="text-right text-[8px]">
                        <div className="font-black uppercase text-orange-300">
                          {
                            task.priority
                          }
                        </div>

                        <div className="mt-1 text-slate-600">
                          {task.due_at
                            ? new Intl.DateTimeFormat(
                                "tr-TR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              ).format(
                                new Date(
                                  task.due_at
                                )
                              )
                            : "Tarih yok"}
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}


        {section ===
          "finance" && (
          <div className="mt-5 space-y-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Satış Hacmi"
                value={money(
                  totalSales
                )}
                detail="İptal hariç"
                icon={<FaChartLine />}
              />

              <StatCard
                title="Tahsilat"
                value={money(
                  totalPaid
                )}
                detail="Alınan ödeme"
                icon={<FaWallet />}
              />

              <StatCard
                title="Açık Bakiye"
                value={money(
                  openBalance
                )}
                detail="Takip edilecek"
                icon={<FaClock />}
              />

              <StatCard
                title="Komisyon"
                value={money(
                  totalCommission
                )}
                detail="Turobus geliri"
                icon={<FaCoins />}
              />
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
              <div className="text-lg font-black">
                Rezervasyon Finans Takibi
              </div>

              <div className="mt-5 space-y-3">
                {bookings.map(
                  (
                    booking
                  ) => {
                    const yacht =
                      yachts.find(
                        (
                          item
                        ) =>
                          item.id ===
                          booking.yacht_id
                      );

                    const ratio =
                      booking.total_amount >
                      0
                        ? Math.min(
                            100,
                            Math.round(
                              (
                                booking.paid_amount /
                                booking.total_amount
                              ) *
                                100
                            )
                          )
                        : 0;

                    return (
                      <div
                        key={
                          booking.id
                        }
                        className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-5">
                          <div>
                            <div className="text-xs font-black">
                              {
                                booking.booking_code
                              }
                              {" · "}
                              {
                                booking.guest_name
                              }
                            </div>

                            <div className="mt-1 text-[8px] text-slate-600">
                              {
                                yacht?.name ??
                                "—"
                              }
                            </div>
                          </div>

                          <div className="flex gap-6 text-right">
                            <Amount
                              label="Satış"
                              value={booking.total_amount}
                            />

                            <Amount
                              label="Tahsil"
                              value={booking.paid_amount}
                            />

                            <Amount
                              label="Komisyon"
                              value={booking.commission_amount}
                            />
                          </div>
                        </div>

                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                          <div
                            className="h-full rounded-full bg-orange-500"
                            style={{
                              width:
                                `${ratio}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          </div>
        )}


        {section ===
          "suppliers" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black">
                  Tedarikçi & Partnerler
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  Tekne sahibi ve filo partner ağı
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "supplier"
                  )
                }
                className="rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black"
              >
                + Tedarikçi
              </button>
            </div>

            {suppliers.length ===
            0 ? (
              <div className="mt-5">
                <EmptyState
                  icon={<FaUserTie />}
                  title="Henüz tedarikçi yok"
                  text="Tekne sahibi veya filo partnerini ekle."
                />
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {suppliers.map(
                  (
                    supplier
                  ) => (
                    <div
                      key={
                        supplier.id
                      }
                      className="rounded-[24px] border border-white/10 bg-white/[.025] p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                          <FaUserTie />
                        </div>

                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-black text-emerald-300">
                          {
                            supplier.status
                          }
                        </span>
                      </div>

                      <div className="mt-5 text-sm font-black">
                        {
                          supplier.name
                        }
                      </div>

                      <div className="mt-1 text-[9px] text-slate-500">
                        {
                          supplier.contact_name ||
                          "Yetkili belirtilmedi"
                        }
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Info
                          title="Komisyon"
                          value={`%${supplier.commission_rate}`}
                        />

                        <Info
                          title="Bakiye"
                          value={money(
                            supplier.current_balance
                          )}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[.07] pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            void copyLink(
                              `/yat-tedarikci/${supplier.portal_token}`,
                              "Partner portal linki kopyalandı."
                            )
                          }
                          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] text-[8px] font-black text-slate-300 hover:border-orange-500/30"
                        >
                          <FaCopy />
                          Linki Kopyala
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openPublicPage(
                              `/yat-tedarikci/${supplier.portal_token}`
                            )
                          }
                          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black"
                        >
                          <FaExternalLinkAlt />
                          Portalı Aç
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}

      </div>


      {modal && (
        <ModalShell
          title={
            modal === "yacht"
              ? "Yeni Tekne"
              : modal ===
                "booking"
                ? "Yeni Rezervasyon"
                : modal ===
                  "task"
                  ? "Yeni Operasyon Görevi"
                  : "Yeni Tedarikçi"
          }
          saving={
            saving
          }
          onClose={
            closeModal
          }
          onSave={() => {
            if (
              modal ===
              "yacht"
            ) {
              void saveYacht();
            }

            if (
              modal ===
              "booking"
            ) {
              void saveBooking();
            }

            if (
              modal ===
              "task"
            ) {
              void saveTask();
            }

            if (
              modal ===
              "supplier"
            ) {
              void saveSupplier();
            }
          }}
        >
          {modal ===
            "yacht" && (
            <>
              <Field
                label="Tekne Adı"
                value={
                  form.yachtName
                }
                onChange={(
                  value
                ) =>
                  patchForm({
                    yachtName:
                      value,
                  })
                }
              />

              <SelectField
                label="Tekne Tipi"
                value={
                  form.yachtType
                }
                options={
                  yachtTypes
                }
                onChange={(
                  value
                ) =>
                  patchForm({
                    yachtType:
                      value,
                  })
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Şehir"
                  value={
                    form.city
                  }
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      city:
                        value,
                    })
                  }
                />

                <Field
                  label="Marina"
                  value={
                    form.marina
                  }
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      marina:
                        value,
                    })
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Kapasite"
                  value={
                    form.maxGuests
                  }
                  type="number"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      maxGuests:
                        value,
                    })
                  }
                />

                <Field
                  label="Kabin"
                  value={
                    form.cabins
                  }
                  type="number"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      cabins:
                        value,
                    })
                  }
                />

                <Field
                  label="Günlük Fiyat"
                  value={
                    form.dailyPrice
                  }
                  type="number"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      dailyPrice:
                        value,
                    })
                  }
                />
              </div>

              <Field
                label="Kaptan"
                value={
                  form.captainName
                }
                onChange={(
                  value
                ) =>
                  patchForm({
                    captainName:
                      value,
                  })
                }
              />
            </>
          )}


          {modal ===
            "booking" && (
            <>
              <SelectField
                label="Tekne"
                value={
                  form.bookingYachtId
                }
                options={[
                  [
                    "",
                    "Tekne seç",
                  ],
                  ...yachts.map(
                    (
                      yacht
                    ) => [
                      yacht.id,
                      yacht.name,
                    ]
                  ),
                ]}
                onChange={(
                  value
                ) => {
                  const yacht =
                    yachts.find(
                      (
                        item
                      ) =>
                        item.id ===
                        value
                    );

                  patchForm({
                    bookingYachtId:
                      value,

                    totalAmount:
                      yacht
                        ? String(
                            yacht.base_daily_price
                          )
                        : "",
                  });
                }}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Misafir"
                  value={
                    form.guestName
                  }
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      guestName:
                        value,
                    })
                  }
                />

                <Field
                  label="Telefon"
                  value={
                    form.guestPhone
                  }
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      guestPhone:
                        value,
                    })
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Kişi"
                  value={
                    form.guestCount
                  }
                  type="number"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      guestCount:
                        value,
                    })
                  }
                />

                <Field
                  label="Başlangıç"
                  value={
                    form.startDate
                  }
                  type="date"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      startDate:
                        value,
                    })
                  }
                />

                <Field
                  label="Bitiş"
                  value={
                    form.endDate
                  }
                  type="date"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      endDate:
                        value,
                    })
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Toplam"
                  value={
                    form.totalAmount
                  }
                  type="number"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      totalAmount:
                        value,
                    })
                  }
                />

                <Field
                  label="Tahsil"
                  value={
                    form.paidAmount
                  }
                  type="number"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      paidAmount:
                        value,
                    })
                  }
                />

                <Field
                  label="Komisyon"
                  value={
                    form.commissionAmount
                  }
                  type="number"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      commissionAmount:
                        value,
                    })
                  }
                />
              </div>
            </>
          )}


          {modal ===
            "task" && (
            <>
              <Field
                label="Görev"
                value={
                  form.taskTitle
                }
                onChange={(
                  value
                ) =>
                  patchForm({
                    taskTitle:
                      value,
                  })
                }
              />

              <SelectField
                label="Tekne"
                value={
                  form.taskYachtId
                }
                options={[
                  [
                    "",
                    "Genel görev",
                  ],
                  ...yachts.map(
                    (
                      yacht
                    ) => [
                      yacht.id,
                      yacht.name,
                    ]
                  ),
                ]}
                onChange={(
                  value
                ) =>
                  patchForm({
                    taskYachtId:
                      value,
                  })
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Personel"
                  value={
                    form.taskAssignee
                  }
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      taskAssignee:
                        value,
                    })
                  }
                />

                <Field
                  label="Tarih / Saat"
                  value={
                    form.taskDueAt
                  }
                  type="datetime-local"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      taskDueAt:
                        value,
                    })
                  }
                />
              </div>

              <SelectField
                label="Öncelik"
                value={
                  form.taskPriority
                }
                options={[
                  ["low", "Düşük"],
                  ["medium", "Normal"],
                  ["high", "Yüksek"],
                  ["critical", "Kritik"],
                ]}
                onChange={(
                  value
                ) =>
                  patchForm({
                    taskPriority:
                      value,
                  })
                }
              />
            </>
          )}


          {modal ===
            "supplier" && (
            <>
              <Field
                label="Tedarikçi / Firma"
                value={
                  form.supplierName
                }
                onChange={(
                  value
                ) =>
                  patchForm({
                    supplierName:
                      value,
                  })
                }
              />

              <Field
                label="Yetkili"
                value={
                  form.supplierContact
                }
                onChange={(
                  value
                ) =>
                  patchForm({
                    supplierContact:
                      value,
                  })
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Telefon"
                  value={
                    form.supplierPhone
                  }
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      supplierPhone:
                        value,
                    })
                  }
                />

                <Field
                  label="E-posta"
                  value={
                    form.supplierEmail
                  }
                  type="email"
                  onChange={(
                    value
                  ) =>
                    patchForm({
                      supplierEmail:
                        value,
                    })
                  }
                />
              </div>

              <Field
                label="Komisyon %"
                value={
                  form.supplierCommission
                }
                type="number"
                onChange={(
                  value
                ) =>
                  patchForm({
                    supplierCommission:
                      value,
                  })
                }
              />
            </>
          )}
        </ModalShell>
      )}
    </main>
  );
}


function Info({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-black/10 p-3">
      <div className="text-[7px] font-black uppercase text-slate-600">
        {title}
      </div>

      <div className="mt-1.5 truncate text-[9px] font-black">
        {value}
      </div>
    </div>
  );
}


function Amount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="text-[7px] uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-[9px] font-black">
        {money(
          value
        )}
      </div>
    </div>
  );
}


function EmptyState({
  icon,
  title,
  text,
}: {
  icon:
    React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-white/10 p-9 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[.03] text-xl text-slate-700">
        {icon}
      </div>

      <div className="mt-4 text-sm font-black">
        {title}
      </div>

      <div className="mt-2 text-[9px] text-slate-500">
        {text}
      </div>
    </div>
  );
}


function Field({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange:
    (
      value: string
    ) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[8px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-xs outline-none focus:border-orange-500/40"
      />
    </label>
  );
}


function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options:
    string[][];
  onChange:
    (
      value: string
    ) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[8px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <select
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-xs outline-none focus:border-orange-500/40"
      >
        {options.map(
          (
            option
          ) => (
            <option
              key={
                option[0]
              }
              value={
                option[0]
              }
            >
              {
                option[1]
              }
            </option>
          )
        )}
      </select>
    </label>
  );
}


function ModalShell({
  title,
  saving,
  children,
  onClose,
  onSave,
}: {
  title: string;
  saving: boolean;
  children:
    React.ReactNode;
  onClose:
    () => void;
  onSave:
    () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#07131f] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
              YAT & TEKNE OS
            </div>

            <div className="mt-2 text-xl font-black">
              {title}
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
          >
            <FaTimes />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {children}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={
              saving
            }
            onClick={
              onClose
            }
            className="h-12 flex-1 rounded-xl border border-white/10 text-xs font-black text-slate-400"
          >
            Vazgeç
          </button>

          <button
            type="button"
            disabled={
              saving
            }
            onClick={
              onSave
            }
            className="h-12 flex-1 rounded-xl bg-orange-500 text-xs font-black disabled:opacity-50"
          >
            {saving
              ? "Kaydediliyor..."
              : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
