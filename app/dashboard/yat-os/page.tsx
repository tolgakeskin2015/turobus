"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaAnchor,
  FaArrowRight,
  FaBell,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaChevronRight,
  FaClock,
  FaCoins,
  FaExclamationTriangle,
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
} from "react-icons/fa";


type Section =
  | "overview"
  | "fleet"
  | "bookings"
  | "calendar"
  | "operations"
  | "finance"
  | "suppliers";


type YachtStatus =
  | "available"
  | "trip"
  | "maintenance"
  | "passive";


type BookingStatus =
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled";


type Yacht = {
  id: string;
  name: string;
  type: string;
  marina: string;
  city: string;
  capacity: number;
  cabins: number;
  length: number;
  captain: string;
  status: YachtStatus;
  dailyPrice: number;
  todayRevenue: number;
  nextTrip: string;
  occupancy: number;
};


type Booking = {
  id: string;
  code: string;
  guest: string;
  yacht: string;
  phone: string;
  date: string;
  endDate: string;
  guests: number;
  total: number;
  paid: number;
  commission: number;
  status: BookingStatus;
  source: string;
};


type OperationTask = {
  id: string;
  title: string;
  yacht: string;
  time: string;
  owner: string;
  priority:
    | "high"
    | "medium"
    | "low";
  done: boolean;
};


type Supplier = {
  id: string;
  name: string;
  category: string;
  contact: string;
  boats: number;
  commission: number;
  balance: number;
  rating: number;
  status: "active" | "pending";
};


const initialYachts: Yacht[] = [
  {
    id: "YT-001",
    name: "Azure 52",
    type: "Motor Yat",
    marina: "D-Marin",
    city: "Göcek",
    capacity: 10,
    cabins: 3,
    length: 16,
    captain: "Mert Aydın",
    status: "trip",
    dailyPrice: 42000,
    todayRevenue: 42000,
    nextTrip: "Bugün 18:30",
    occupancy: 82,
  },
  {
    id: "YT-002",
    name: "Aegean Dream",
    type: "Gulet",
    marina: "Karagözler",
    city: "Fethiye",
    capacity: 12,
    cabins: 6,
    length: 24,
    captain: "Serkan Kaya",
    status: "available",
    dailyPrice: 68000,
    todayRevenue: 0,
    nextTrip: "20 Ağustos",
    occupancy: 71,
  },
  {
    id: "YT-003",
    name: "Blue Horizon",
    type: "Katamaran",
    marina: "Yalıkavak",
    city: "Bodrum",
    capacity: 8,
    cabins: 4,
    length: 14,
    captain: "Kerem Öztürk",
    status: "maintenance",
    dailyPrice: 51000,
    todayRevenue: 0,
    nextTrip: "22 Ağustos",
    occupancy: 64,
  },
  {
    id: "YT-004",
    name: "Sunset One",
    type: "Günlük Tekne",
    marina: "Ece Saray",
    city: "Fethiye",
    capacity: 18,
    cabins: 2,
    length: 17,
    captain: "Ali Demir",
    status: "available",
    dailyPrice: 32000,
    todayRevenue: 32000,
    nextTrip: "Bugün 19:00",
    occupancy: 91,
  },
];


const initialBookings: Booking[] = [
  {
    id: "BK-1",
    code: "YAT-4821",
    guest: "Emre Yılmaz",
    yacht: "Azure 52",
    phone: "0532 *** ** 21",
    date: "18 Ağu",
    endDate: "18 Ağu",
    guests: 6,
    total: 42000,
    paid: 42000,
    commission: 6300,
    status: "confirmed",
    source: "Turobus",
  },
  {
    id: "BK-2",
    code: "YAT-4822",
    guest: "Selin Arslan",
    yacht: "Aegean Dream",
    phone: "0544 *** ** 75",
    date: "20 Ağu",
    endDate: "22 Ağu",
    guests: 10,
    total: 136000,
    paid: 68000,
    commission: 20400,
    status: "pending",
    source: "WhatsApp",
  },
  {
    id: "BK-3",
    code: "YAT-4814",
    guest: "Murat Çelik",
    yacht: "Sunset One",
    phone: "0533 *** ** 42",
    date: "17 Ağu",
    endDate: "17 Ağu",
    guests: 12,
    total: 32000,
    paid: 32000,
    commission: 4800,
    status: "completed",
    source: "Acente",
  },
  {
    id: "BK-4",
    code: "YAT-4828",
    guest: "Ayşe Korkmaz",
    yacht: "Blue Horizon",
    phone: "0505 *** ** 16",
    date: "22 Ağu",
    endDate: "24 Ağu",
    guests: 8,
    total: 102000,
    paid: 25000,
    commission: 15300,
    status: "pending",
    source: "Turobus",
  },
];


const initialTasks: OperationTask[] = [
  {
    id: "OP-1",
    title: "Yakıt kontrolü ve ikmal",
    yacht: "Azure 52",
    time: "16:00",
    owner: "Mert",
    priority: "high",
    done: false,
  },
  {
    id: "OP-2",
    title: "Misafir karşılama hazırlığı",
    yacht: "Sunset One",
    time: "17:30",
    owner: "Burak",
    priority: "high",
    done: false,
  },
  {
    id: "OP-3",
    title: "Temizlik kontrolü",
    yacht: "Aegean Dream",
    time: "14:30",
    owner: "Ece",
    priority: "medium",
    done: true,
  },
  {
    id: "OP-4",
    title: "Teknik bakım raporu",
    yacht: "Blue Horizon",
    time: "12:00",
    owner: "Kerem",
    priority: "medium",
    done: false,
  },
];


const suppliers: Supplier[] = [
  {
    id: "SP-1",
    name: "Göcek Marine Charter",
    category: "Tekne Sahibi",
    contact: "Ahmet K.",
    boats: 8,
    commission: 15,
    balance: 184000,
    rating: 4.9,
    status: "active",
  },
  {
    id: "SP-2",
    name: "Fethiye Blue Fleet",
    category: "Filo İşletmesi",
    contact: "Can D.",
    boats: 12,
    commission: 14,
    balance: 266000,
    rating: 4.8,
    status: "active",
  },
  {
    id: "SP-3",
    name: "Bodrum Yacht Network",
    category: "B2B Partner",
    contact: "Deniz T.",
    boats: 6,
    commission: 17,
    balance: 97000,
    rating: 4.7,
    status: "pending",
  },
];


const days = [
  "18 Ağu",
  "19 Ağu",
  "20 Ağu",
  "21 Ağu",
  "22 Ağu",
  "23 Ağu",
  "24 Ağu",
  "25 Ağu",
];


const money = (
  value: number
) =>
  new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(value);


function statusLabel(
  status: YachtStatus
) {
  if (status === "available")
    return "Müsait";

  if (status === "trip")
    return "Seferde";

  if (status === "maintenance")
    return "Bakımda";

  return "Pasif";
}


function bookingLabel(
  status: BookingStatus
) {
  if (status === "confirmed")
    return "Onaylandı";

  if (status === "pending")
    return "Ödeme Bekliyor";

  if (status === "completed")
    return "Tamamlandı";

  return "İptal";
}


function yachtTone(
  status: YachtStatus
) {
  if (status === "available")
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";

  if (status === "trip")
    return "bg-blue-500/10 text-blue-300 border-blue-500/20";

  if (status === "maintenance")
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";

  return "bg-slate-500/10 text-slate-400 border-white/10";
}


function bookingTone(
  status: BookingStatus
) {
  if (status === "confirmed")
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";

  if (status === "pending")
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";

  if (status === "completed")
    return "bg-blue-500/10 text-blue-300 border-blue-500/20";

  return "bg-red-500/10 text-red-300 border-red-500/20";
}


function StatCard({
  title,
  value,
  detail,
  icon,
  accent,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f] p-5 shadow-[0_20px_60px_rgba(0,0,0,.18)]">
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${
          accent ??
          "bg-orange-500/10"
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">
            {title}
          </div>

          <div className="mt-3 text-3xl font-black tracking-tight text-white">
            {value}
          </div>

          <div className="mt-2 text-[11px] font-medium text-slate-500">
            {detail}
          </div>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-orange-400">
          {icon}
        </div>
      </div>
    </div>
  );
}


function SectionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-[11px] font-black transition ${
        active
          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
          : "border border-white/10 bg-white/[.03] text-slate-400 hover:border-orange-500/30 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}


function Progress({
  value,
}: {
  value: number;
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
      <div
        className="h-full rounded-full bg-orange-500"
        style={{
          width: `${Math.max(
            0,
            Math.min(
              value,
              100
            )
          )}%`,
        }}
      />
    </div>
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
    yachts,
    setYachts,
  ] =
    useState<Yacht[]>(
      initialYachts
    );

  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>(
      initialBookings
    );

  const [
    tasks,
    setTasks,
  ] =
    useState<OperationTask[]>(
      initialTasks
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState("all");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    modal,
    setModal,
  ] =
    useState<
      | "booking"
      | "yacht"
      | "task"
      | null
    >(null);


  useEffect(
    () => {
      try {
        const saved =
          localStorage.getItem(
            "TUROBUS_YACHT_OS_STATE_V1"
          );

        if (!saved)
          return;

        const parsed =
          JSON.parse(saved);

        if (
          Array.isArray(
            parsed.yachts
          )
        ) {
          setYachts(
            parsed.yachts
          );
        }

        if (
          Array.isArray(
            parsed.bookings
          )
        ) {
          setBookings(
            parsed.bookings
          );
        }

        if (
          Array.isArray(
            parsed.tasks
          )
        ) {
          setTasks(
            parsed.tasks
          );
        }
      } catch {
        // corrupted local demo state is ignored
      }
    },
    []
  );


  useEffect(
    () => {
      localStorage.setItem(
        "TUROBUS_YACHT_OS_STATE_V1",
        JSON.stringify({
          yachts,
          bookings,
          tasks,
        })
      );
    },
    [
      yachts,
      bookings,
      tasks,
    ]
  );


  const activeYachts =
    yachts.filter(
      (item) =>
        item.status !==
        "passive"
    ).length;


  const todayTrips =
    yachts.filter(
      (item) =>
        item.nextTrip.startsWith(
          "Bugün"
        )
    ).length;


  const openBookings =
    bookings.filter(
      (item) =>
        item.status ===
          "confirmed" ||
        item.status ===
          "pending"
    ).length;


  const totalSales =
    bookings.reduce(
      (
        total,
        item
      ) =>
        item.status ===
        "cancelled"
          ? total
          : total +
            item.total,
      0
    );


  const paid =
    bookings.reduce(
      (
        total,
        item
      ) =>
        total +
        item.paid,
      0
    );


  const commission =
    bookings.reduce(
      (
        total,
        item
      ) =>
        total +
        item.commission,
      0
    );


  const receivable =
    Math.max(
      0,
      totalSales -
        paid
    );


  const filteredYachts =
    useMemo(
      () =>
        yachts.filter(
          (yacht) => {
            const text =
              `${yacht.name} ${yacht.city} ${yacht.marina} ${yacht.type}`
                .toLocaleLowerCase(
                  "tr"
                );

            const matches =
              !query ||
              text.includes(
                query.toLocaleLowerCase(
                  "tr"
                )
              );

            const status =
              filter ===
                "all" ||
              yacht.status ===
                filter;

            return (
              matches &&
              status
            );
          }
        ),
      [
        yachts,
        query,
        filter,
      ]
    );


  const filteredBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) => {
            const text =
              `${booking.code} ${booking.guest} ${booking.yacht} ${booking.source}`
                .toLocaleLowerCase(
                  "tr"
                );

            return (
              !query ||
              text.includes(
                query.toLocaleLowerCase(
                  "tr"
                )
              )
            );
          }
        ),
      [
        bookings,
        query,
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
      2500
    );
  }


  function toggleTask(
    id: string
  ) {
    setTasks(
      (current) =>
        current.map(
          (task) =>
            task.id === id
              ? {
                  ...task,
                  done:
                    !task.done,
                }
              : task
        )
    );

    toast(
      "Operasyon görevi güncellendi."
    );
  }


  function rotateYachtStatus(
    id: string
  ) {
    const order:
      YachtStatus[] = [
        "available",
        "trip",
        "maintenance",
        "passive",
      ];

    setYachts(
      (current) =>
        current.map(
          (yacht) => {
            if (
              yacht.id !== id
            ) {
              return yacht;
            }

            const index =
              order.indexOf(
                yacht.status
              );

            return {
              ...yacht,
              status:
                order[
                  (
                    index +
                    1
                  ) %
                    order.length
                ],
            };
          }
        )
    );

    toast(
      "Tekne durumu güncellendi."
    );
  }


  function confirmBooking(
    id: string
  ) {
    setBookings(
      (current) =>
        current.map(
          (booking) =>
            booking.id === id
              ? {
                  ...booking,
                  status:
                    "confirmed",
                }
              : booking
        )
    );

    toast(
      "Rezervasyon onaylandı."
    );
  }


  const availability =
    (
      yachtIndex:
        number,
      dayIndex:
        number
    ) => {
      const code =
        (
          yachtIndex *
            3 +
          dayIndex
        ) %
        7;

      if (
        code === 0
      ) {
        return "maintenance";
      }

      if (
        code === 1 ||
        code === 2
      ) {
        return "booked";
      }

      if (
        code === 3
      ) {
        return "option";
      }

      return "available";
    };


  return (
    <main className="min-h-screen bg-[#030a11] text-white">
      {notice && (
        <div className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">
          <FaCheckCircle className="text-emerald-400" />

          <div className="text-xs font-black">
            {notice}
          </div>
        </div>
      )}


      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8 lg:py-9">

        {/* HEADER */}
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 shadow-[0_30px_80px_rgba(0,0,0,.28)] lg:p-8">

          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.22em] text-orange-300">
                  TUROBUS YACHT OS
                </span>

                <span className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Sistem aktif
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] sm:text-4xl lg:text-5xl">
                Yat & Tekne
                <span className="text-orange-400">
                  {" "}
                  Operasyon Merkezi
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Filo, rezervasyon, müsaitlik, görev,
                tahsilat, komisyon ve tedarikçi süreçlerini
                tek merkezden takip et.
              </p>
            </div>


            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setModal(
                    "task"
                  )
                }
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 text-xs font-black hover:border-orange-500/30"
              >
                <FaTasks />
                Görev Oluştur
              </button>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "booking"
                  )
                }
                className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                <FaPlus />
                Yeni Rezervasyon
              </button>
            </div>

          </div>
        </section>


        {/* KPI */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Aktif Filo"
            value={String(
              activeYachts
            )}
            detail={`${yachts.length} kayıtlı tekne`}
            icon={<FaShip />}
          />

          <StatCard
            title="Bugünkü Çıkış"
            value={String(
              todayTrips
            )}
            detail="Planlanan operasyon"
            icon={<FaAnchor />}
            accent="bg-blue-500/10"
          />

          <StatCard
            title="Açık Rezervasyon"
            value={String(
              openBookings
            )}
            detail="Onay + ödeme bekleyen"
            icon={<FaCalendarAlt />}
            accent="bg-violet-500/10"
          />

          <StatCard
            title="Tahsil Edilen"
            value={money(
              paid
            )}
            detail={`${money(
              receivable
            )} açık bakiye`}
            icon={<FaWallet />}
            accent="bg-emerald-500/10"
          />

          <StatCard
            title="Komisyon"
            value={money(
              commission
            )}
            detail="Toplam beklenen gelir"
            icon={<FaCoins />}
            accent="bg-amber-500/10"
          />
        </section>


        {/* NAV */}
        <section className="mt-5 overflow-x-auto rounded-[22px] border border-white/10 bg-[#07131f] p-2">
          <div className="flex min-w-max gap-2">
            <SectionButton
              active={
                section ===
                "overview"
              }
              label="Genel Bakış"
              onClick={() =>
                setSection(
                  "overview"
                )
              }
            />

            <SectionButton
              active={
                section ===
                "fleet"
              }
              label="Filo"
              onClick={() =>
                setSection(
                  "fleet"
                )
              }
            />

            <SectionButton
              active={
                section ===
                "bookings"
              }
              label="Rezervasyonlar"
              onClick={() =>
                setSection(
                  "bookings"
                )
              }
            />

            <SectionButton
              active={
                section ===
                "calendar"
              }
              label="Müsaitlik Takvimi"
              onClick={() =>
                setSection(
                  "calendar"
                )
              }
            />

            <SectionButton
              active={
                section ===
                "operations"
              }
              label="Operasyon"
              onClick={() =>
                setSection(
                  "operations"
                )
              }
            />

            <SectionButton
              active={
                section ===
                "finance"
              }
              label="Finans"
              onClick={() =>
                setSection(
                  "finance"
                )
              }
            />

            <SectionButton
              active={
                section ===
                "suppliers"
              }
              label="Tedarikçiler"
              onClick={() =>
                setSection(
                  "suppliers"
                )
              }
            />
          </div>
        </section>


        {/* SEARCH */}
        {(section ===
          "fleet" ||
          section ===
            "bookings") && (
          <section className="mt-5 flex flex-col gap-3 rounded-[22px] border border-white/10 bg-[#07131f] p-4 md:flex-row md:items-center">

            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

              <input
                value={query}
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder={
                  section ===
                  "fleet"
                    ? "Tekne, marina, şehir veya tip ara..."
                    : "Rezervasyon, müşteri, tekne veya kanal ara..."
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.03] pl-10 pr-4 text-xs font-semibold outline-none transition placeholder:text-slate-600 focus:border-orange-500/40"
              />
            </div>

            {section ===
              "fleet" && (
              <div className="flex items-center gap-2 overflow-x-auto">
                <FaFilter className="mx-1 text-slate-600" />

                {[
                  [
                    "all",
                    "Tümü",
                  ],
                  [
                    "available",
                    "Müsait",
                  ],
                  [
                    "trip",
                    "Seferde",
                  ],
                  [
                    "maintenance",
                    "Bakımda",
                  ],
                ].map(
                  ([
                    value,
                    label,
                  ]) => (
                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          value
                        )
                      }
                      className={`rounded-xl px-4 py-3 text-[10px] font-black ${
                        filter ===
                        value
                          ? "bg-orange-500 text-white"
                          : "border border-white/10 text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            )}
          </section>
        )}


        {/* OVERVIEW */}
        {section ===
          "overview" && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">

            <div className="space-y-5">

              <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-black">
                      Bugünün Operasyonu
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Canlı çıkış ve hazırlık durumu
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSection(
                        "operations"
                      )
                    }
                    className="flex items-center gap-2 text-[10px] font-black text-orange-400"
                  >
                    Tümünü gör
                    <FaChevronRight />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {yachts
                    .filter(
                      (item) =>
                        item.nextTrip.startsWith(
                          "Bugün"
                        )
                    )
                    .map(
                      (yacht) => (
                        <div
                          key={
                            yacht.id
                          }
                          className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                        >
                          <div className="flex items-center gap-4">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                              <FaShip />
                            </div>

                            <div>
                              <div className="text-sm font-black">
                                {
                                  yacht.name
                                }
                              </div>

                              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                <FaMapMarkerAlt />
                                {
                                  yacht.marina
                                }
                                {" · "}
                                {
                                  yacht.city
                                }
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-black uppercase text-slate-600">
                              Çıkış
                            </div>
                            <div className="mt-1 text-xs font-black">
                              {
                                yacht.nextTrip
                              }
                            </div>
                          </div>

                          <span className={`w-fit rounded-full border px-3 py-1.5 text-[9px] font-black ${yachtTone(
                            yacht.status
                          )}`}>
                            {statusLabel(
                              yacht.status
                            )}
                          </span>
                        </div>
                      )
                    )}
                </div>
              </section>


              <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black">
                      Son Rezervasyonlar
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Satış ve tahsilat görünümü
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSection(
                        "bookings"
                      )
                    }
                    className="text-[10px] font-black text-orange-400"
                  >
                    Tüm rezervasyonlar
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-600">
                        <th className="pb-3">
                          Rezervasyon
                        </th>
                        <th className="pb-3">
                          Tekne
                        </th>
                        <th className="pb-3">
                          Tarih
                        </th>
                        <th className="pb-3">
                          Tutar
                        </th>
                        <th className="pb-3">
                          Durum
                        </th>
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
                            className="border-b border-white/[.06] text-xs"
                          >
                            <td className="py-4">
                              <div className="font-black">
                                {
                                  booking.guest
                                }
                              </div>
                              <div className="mt-1 text-[9px] text-slate-600">
                                {
                                  booking.code
                                }
                              </div>
                            </td>

                            <td className="py-4 font-bold text-slate-300">
                              {
                                booking.yacht
                              }
                            </td>

                            <td className="py-4 text-slate-400">
                              {
                                booking.date
                              }
                            </td>

                            <td className="py-4 font-black">
                              {money(
                                booking.total
                              )}
                            </td>

                            <td className="py-4">
                              <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${bookingTone(
                                booking.status
                              )}`}>
                                {bookingLabel(
                                  booking.status
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>


            <div className="space-y-5">

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
                      Dikkat gerektiren işlemler
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[.06] p-4">
                    <div className="flex gap-3">
                      <FaExclamationTriangle className="mt-0.5 text-amber-400" />

                      <div>
                        <div className="text-xs font-black">
                          2 ödeme bekliyor
                        </div>
                        <div className="mt-1 text-[9px] leading-4 text-slate-500">
                          Açık bakiyeleri rezervasyon öncesi kontrol et.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[.05] p-4">
                    <div className="flex gap-3">
                      <FaTasks className="mt-0.5 text-red-400" />

                      <div>
                        <div className="text-xs font-black">
                          {
                            tasks.filter(
                              (task) =>
                                !task.done &&
                                task.priority ===
                                  "high"
                            ).length
                          } kritik görev
                        </div>
                        <div className="mt-1 text-[9px] leading-4 text-slate-500">
                          Çıkış öncesi tamamlanması gereken işler var.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[.05] p-4">
                    <div className="flex gap-3">
                      <FaShip className="mt-0.5 text-blue-400" />

                      <div>
                        <div className="text-xs font-black">
                          1 tekne bakımda
                        </div>
                        <div className="mt-1 text-[9px] leading-4 text-slate-500">
                          Blue Horizon için bakım kapanışı bekleniyor.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>


              <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">
                <div className="text-sm font-black">
                  Filo Doluluk
                </div>

                <div className="mt-5 space-y-5">
                  {yachts.map(
                    (yacht) => (
                      <div
                        key={
                          yacht.id
                        }
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black">
                            {
                              yacht.name
                            }
                          </span>

                          <span className="text-[10px] font-black text-orange-400">
                            {
                              yacht.occupancy
                            }%
                          </span>
                        </div>

                        <Progress
                          value={
                            yacht.occupancy
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>
          </div>
        )}


        {/* FLEET */}
        {section ===
          "fleet" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black">
                  Filo Yönetimi
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {filteredYachts.length} tekne görüntüleniyor
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "yacht"
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-[10px] font-black"
              >
                <FaPlus />
                Tekne Ekle
              </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredYachts.map(
                (yacht) => (
                  <div
                    key={
                      yacht.id
                    }
                    className="rounded-[24px] border border-white/10 bg-white/[.025] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-xl text-orange-400">
                          <FaShip />
                        </div>

                        <div>
                          <div className="text-base font-black">
                            {
                              yacht.name
                            }
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {
                              yacht.type
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
                        onClick={() =>
                          rotateYachtStatus(
                            yacht.id
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-[9px] font-black ${yachtTone(
                          yacht.status
                        )}`}
                      >
                        {statusLabel(
                          yacht.status
                        )}
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        [
                          "Kapasite",
                          `${yacht.capacity} kişi`,
                        ],
                        [
                          "Kabin",
                          `${yacht.cabins}`,
                        ],
                        [
                          "Boy",
                          `${yacht.length} m`,
                        ],
                        [
                          "Günlük",
                          money(
                            yacht.dailyPrice
                          ),
                        ],
                      ].map(
                        ([
                          label,
                          value,
                        ]) => (
                          <div
                            key={
                              label
                            }
                            className="rounded-xl border border-white/[.07] bg-black/10 p-3"
                          >
                            <div className="text-[8px] font-black uppercase text-slate-600">
                              {
                                label
                              }
                            </div>
                            <div className="mt-1.5 text-[10px] font-black">
                              {
                                value
                              }
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[.07] pt-4">
                      <div>
                        <div className="text-[9px] text-slate-600">
                          Kaptan
                        </div>
                        <div className="mt-1 text-[10px] font-black">
                          {
                            yacht.captain
                          }
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[9px] text-slate-600">
                          Sonraki operasyon
                        </div>
                        <div className="mt-1 text-[10px] font-black text-orange-300">
                          {
                            yacht.nextTrip
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}


        {/* BOOKINGS */}
        {section ===
          "bookings" && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 lg:p-6">
              <div>
                <div className="text-lg font-black">
                  Rezervasyon Takibi
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  Satış, ödeme ve misafir operasyonları
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "booking"
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-[10px] font-black"
              >
                <FaPlus />
                Rezervasyon Ekle
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-white/[.025]">
                  <tr className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                    <th className="px-5 py-4">
                      Kod / Misafir
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
                      Tahsilat
                    </th>
                    <th className="px-5 py-4">
                      Kanal
                    </th>
                    <th className="px-5 py-4">
                      Durum
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
                    ) => (
                      <tr
                        key={
                          booking.id
                        }
                        className="border-t border-white/[.06] text-xs"
                      >
                        <td className="px-5 py-4">
                          <div className="font-black">
                            {
                              booking.guest
                            }
                          </div>
                          <div className="mt-1 text-[9px] text-slate-600">
                            {
                              booking.code
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {
                            booking.yacht
                          }
                        </td>

                        <td className="px-5 py-4 text-slate-400">
                          {
                            booking.date
                          }
                          {" → "}
                          {
                            booking.endDate
                          }
                        </td>

                        <td className="px-5 py-4">
                          {
                            booking.guests
                          }
                        </td>

                        <td className="px-5 py-4 font-black">
                          {money(
                            booking.total
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-black text-emerald-300">
                            {money(
                              booking.paid
                            )}
                          </div>
                          <div className="mt-1 text-[8px] text-slate-600">
                            Kalan{" "}
                            {money(
                              Math.max(
                                0,
                                booking.total -
                                  booking.paid
                              )
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-400">
                          {
                            booking.source
                          }
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${bookingTone(
                            booking.status
                          )}`}>
                            {bookingLabel(
                              booking.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {booking.status ===
                          "pending" ? (
                            <button
                              type="button"
                              onClick={() =>
                                confirmBooking(
                                  booking.id
                                )
                              }
                              className="rounded-lg bg-orange-500 px-3 py-2 text-[9px] font-black"
                            >
                              Onayla
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                toast(
                                  `${booking.code} kaydı açıldı.`
                                )
                              }
                              className="flex items-center gap-2 text-[9px] font-black text-slate-400"
                            >
                              Detay
                              <FaArrowRight />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}


        {/* CALENDAR */}
        {section ===
          "calendar" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-lg font-black">
                  Müsaitlik & Kontenjan
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  Filo bazında günlük operasyon görünümü
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-[8px] font-black">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Müsait
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Dolu
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Opsiyon
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Bakım
                </span>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[950px]">
                <div className="grid grid-cols-[220px_repeat(8,1fr)] gap-2">
                  <div />

                  {days.map(
                    (day) => (
                      <div
                        key={
                          day
                        }
                        className="pb-2 text-center text-[9px] font-black text-slate-500"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {yachts.flatMap(
                    (
                      yacht,
                      yachtIndex
                    ) => [
                      <div
                        key={`${yacht.id}-title`}
                        className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3"
                      >
                        <FaShip className="text-orange-400" />

                        <div>
                          <div className="text-[10px] font-black">
                            {
                              yacht.name
                            }
                          </div>
                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              yacht.marina
                            }
                          </div>
                        </div>
                      </div>,

                      ...days.map(
                        (
                          day,
                          dayIndex
                        ) => {
                          const status =
                            availability(
                              yachtIndex,
                              dayIndex
                            );

                          return (
                            <button
                              type="button"
                              key={`${yacht.id}-${day}`}
                              onClick={() =>
                                toast(
                                  `${yacht.name} · ${day} müsaitlik kaydı açıldı.`
                                )
                              }
                              className={`min-h-14 rounded-xl border text-[8px] font-black transition ${
                                status ===
                                "available"
                                  ? "border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300"
                                  : status ===
                                    "booked"
                                    ? "border-blue-500/20 bg-blue-500/[.08] text-blue-300"
                                    : status ===
                                      "option"
                                      ? "border-amber-500/20 bg-amber-500/[.08] text-amber-300"
                                      : "border-red-500/20 bg-red-500/[.08] text-red-300"
                              }`}
                            >
                              {status ===
                              "available"
                                ? "Müsait"
                                : status ===
                                  "booked"
                                  ? "Dolu"
                                  : status ===
                                    "option"
                                    ? "Opsiyon"
                                    : "Bakım"}
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


        {/* OPERATIONS */}
        {section ===
          "operations" && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-black">
                    Operasyon Görevleri
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    Çıkış öncesi kontrol ve ekip takibi
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
                {tasks.map(
                  (task) => (
                    <button
                      type="button"
                      key={
                        task.id
                      }
                      onClick={() =>
                        toggleTask(
                          task.id
                        )
                      }
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                        task.done
                          ? "border-emerald-500/10 bg-emerald-500/[.03] opacity-60"
                          : "border-white/10 bg-white/[.02] hover:border-orange-500/20"
                      }`}
                    >
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        task.done
                          ? "bg-emerald-500/10 text-emerald-400"
                          : task.priority ===
                            "high"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-orange-500/10 text-orange-400"
                      }`}>
                        {task.done
                          ? <FaCheckCircle />
                          : <FaTasks />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-black ${
                          task.done
                            ? "line-through"
                            : ""
                        }`}>
                          {
                            task.title
                          }
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          {
                            task.yacht
                          }
                          {" · "}
                          {
                            task.owner
                          }
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 text-[10px] font-black">
                          <FaClock className="text-slate-600" />
                          {
                            task.time
                          }
                        </div>

                        <div className={`mt-1 text-[8px] font-black ${
                          task.priority ===
                          "high"
                            ? "text-red-400"
                            : "text-slate-600"
                        }`}>
                          {task.priority ===
                          "high"
                            ? "KRİTİK"
                            : task.priority ===
                              "medium"
                              ? "NORMAL"
                              : "DÜŞÜK"}
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            </section>


            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">
              <div className="text-sm font-black">
                Operasyon Sağlığı
              </div>

              <div className="mt-5 space-y-4">
                {[
                  [
                    "Tamamlanan görev",
                    `${tasks.filter(
                      (task) =>
                        task.done
                    ).length}/${tasks.length}`,
                    72,
                  ],
                  [
                    "Filo hazırlığı",
                    "86%",
                    86,
                  ],
                  [
                    "Misafir bilgileri",
                    "92%",
                    92,
                  ],
                  [
                    "Tahsilat kontrolü",
                    "74%",
                    74,
                  ],
                ].map(
                  ([
                    title,
                    value,
                    progress,
                  ]) => (
                    <div
                      key={
                        String(
                          title
                        )
                      }
                    >
                      <div className="mb-2 flex justify-between text-[10px]">
                        <span className="font-bold text-slate-400">
                          {title}
                        </span>
                        <span className="font-black">
                          {value}
                        </span>
                      </div>

                      <Progress
                        value={
                          Number(
                            progress
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </section>
          </div>
        )}


        {/* FINANCE */}
        {section ===
          "finance" && (
          <div className="mt-5 space-y-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Toplam Satış"
                value={money(
                  totalSales
                )}
                detail="Aktif rezervasyon hacmi"
                icon={<FaCoins />}
              />

              <StatCard
                title="Tahsilat"
                value={money(
                  paid
                )}
                detail="Kasaya giren tutar"
                icon={<FaWallet />}
                accent="bg-emerald-500/10"
              />

              <StatCard
                title="Açık Bakiye"
                value={money(
                  receivable
                )}
                detail="Takip edilmesi gereken"
                icon={<FaClock />}
                accent="bg-red-500/10"
              />

              <StatCard
                title="Turobus Komisyon"
                value={money(
                  commission
                )}
                detail="Beklenen brüt komisyon"
                icon={<FaChartLine />}
                accent="bg-violet-500/10"
              />
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
              <div className="text-lg font-black">
                Rezervasyon Finans Takibi
              </div>

              <div className="mt-5 space-y-4">
                {bookings
                  .filter(
                    (booking) =>
                      booking.status !==
                      "cancelled"
                  )
                  .map(
                    (
                      booking
                    ) => {
                      const ratio =
                        Math.round(
                          (
                            booking.paid /
                            booking.total
                          ) *
                            100
                        );

                      return (
                        <div
                          key={
                            booking.id
                          }
                          className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-black">
                                {
                                  booking.code
                                }
                                {" · "}
                                {
                                  booking.guest
                                }
                              </div>

                              <div className="mt-1 text-[9px] text-slate-600">
                                {
                                  booking.yacht
                                }
                              </div>
                            </div>

                            <div className="flex gap-7 text-right">
                              <div>
                                <div className="text-[8px] uppercase text-slate-600">
                                  Satış
                                </div>
                                <div className="mt-1 text-[10px] font-black">
                                  {money(
                                    booking.total
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="text-[8px] uppercase text-slate-600">
                                  Tahsil
                                </div>
                                <div className="mt-1 text-[10px] font-black text-emerald-300">
                                  {money(
                                    booking.paid
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="text-[8px] uppercase text-slate-600">
                                  Komisyon
                                </div>
                                <div className="mt-1 text-[10px] font-black text-orange-300">
                                  {money(
                                    booking.commission
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <Progress
                              value={
                                ratio
                              }
                            />
                            <div className="mt-2 text-right text-[8px] font-black text-slate-600">
                              %{ratio} tahsil edildi
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>
            </section>
          </div>
        )}


        {/* SUPPLIERS */}
        {section ===
          "suppliers" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black">
                  Tedarikçi & Filo Partnerleri
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  Komisyon, bakiye ve partner performansı
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  toast(
                    "Tedarikçi davet akışı hazırlanacak."
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black"
              >
                <FaPlus />
                Tedarikçi Ekle
              </button>
            </div>

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
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                        <FaUserTie />
                      </div>

                      <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${
                        supplier.status ===
                        "active"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                      }`}>
                        {supplier.status ===
                        "active"
                          ? "Aktif"
                          : "Onay Bekliyor"}
                      </span>
                    </div>

                    <div className="mt-5 text-sm font-black">
                      {
                        supplier.name
                      }
                    </div>

                    <div className="mt-1 text-[9px] text-slate-500">
                      {
                        supplier.category
                      }
                      {" · "}
                      {
                        supplier.contact
                      }
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-white/[.06] p-3">
                        <div className="text-[8px] text-slate-600">
                          Filo
                        </div>
                        <div className="mt-1 text-xs font-black">
                          {
                            supplier.boats
                          }
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[.06] p-3">
                        <div className="text-[8px] text-slate-600">
                          Komisyon
                        </div>
                        <div className="mt-1 text-xs font-black text-orange-300">
                          %
                          {
                            supplier.commission
                          }
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[.06] p-3">
                        <div className="text-[8px] text-slate-600">
                          Puan
                        </div>
                        <div className="mt-1 text-xs font-black">
                          ⭐{" "}
                          {
                            supplier.rating
                          }
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-4">
                      <div>
                        <div className="text-[8px] text-slate-600">
                          Ödenecek
                        </div>
                        <div className="mt-1 text-xs font-black">
                          {money(
                            supplier.balance
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toast(
                            `${supplier.name} partner hesabı açıldı.`
                          )
                        }
                        className="flex items-center gap-2 text-[9px] font-black text-orange-400"
                      >
                        Partner kartı
                        <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

      </div>


      {/* QUICK MODAL */}
      {modal && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#07131f] p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.2em] text-orange-400">
                  Hızlı İşlem
                </div>

                <div className="mt-2 text-xl font-black">
                  {modal ===
                  "booking"
                    ? "Yeni Rezervasyon"
                    : modal ===
                      "yacht"
                      ? "Yeni Tekne"
                      : "Yeni Operasyon Görevi"}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(null)
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <input
                placeholder={
                  modal ===
                  "booking"
                    ? "Misafir / müşteri adı"
                    : modal ===
                      "yacht"
                      ? "Tekne adı"
                      : "Görev başlığı"
                }
                className="h-12 rounded-xl border border-white/10 bg-white/[.03] px-4 text-xs outline-none focus:border-orange-500/40"
              />

              <input
                placeholder={
                  modal ===
                  "booking"
                    ? "Tekne / tarih"
                    : modal ===
                      "yacht"
                      ? "Marina / şehir"
                      : "Tekne / personel"
                }
                className="h-12 rounded-xl border border-white/10 bg-white/[.03] px-4 text-xs outline-none focus:border-orange-500/40"
              />

              <textarea
                placeholder="Not / açıklama"
                className="min-h-24 resize-none rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs outline-none focus:border-orange-500/40"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setModal(null)
                }
                className="h-12 flex-1 rounded-xl border border-white/10 text-xs font-black text-slate-400"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={() => {
                  setModal(null);

                  toast(
                    "Kayıt taslağı oluşturuldu."
                  );
                }}
                className="h-12 flex-1 rounded-xl bg-orange-500 text-xs font-black"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
