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
  FaBus,
  FaChartLine,
  FaExclamationTriangle,
  FaHotel,
  FaMoneyBillWave,
  FaPlane,
  FaPlus,
  FaReceipt,
  FaSave,
  FaTrash,
  FaUserTie,
  FaWallet,
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


type TransportMode =
  | "air"
  | "bus"
  | "other";


type CostGroup =
  | "flight"
  | "bus"
  | "hotel"
  | "guide"
  | "driver"
  | "activity"
  | "transfer"
  | "food"
  | "commission"
  | "payment_fee"
  | "refund"
  | "other";


type ExpenseCategory =
  | "fuel"
  | "vehicle_rental"
  | "hotel"
  | "activity_supplier"
  | "guide_fee"
  | "driver_fee"
  | "food"
  | "drink"
  | "parking"
  | "highway"
  | "maintenance"
  | "washing"
  | "commission"
  | "payment_fee"
  | "advertising"
  | "insurance"
  | "tax"
  | "club_payment"
  | "marketplace_payment"
  | "refund"
  | "other";


type PaymentStatus =
  | "pending"
  | "paid"
  | "partial"
  | "cancelled";


type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "iyzico"
  | "company_account"
  | "other";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    TransportMode;
};


type Departure = {
  id: string;
  tour_id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
  status: string;
};


type Reservation = {
  id: string;
  reservation_code:
    string | null;
  full_name: string;
  guests: number;
  status: string;
  payment_status:
    string | null;
};


type Sale = {
  id?: string;
  reservation_id:
    string | null;
  grand_total: number;
  total_cost: number;
  total_guide_commission: number;
  company_gross_profit: number;
  payment_status: string;
};


type Supplier = {
  id: string;
  name: string;
};


type Expense = {
  id: string;
  company_id: string;
  reservation_id:
    string | null;
  supplier_id:
    string | null;
  tour_id:
    string | null;
  departure_id:
    string | null;
  tour_cost_group:
    CostGroup;
  expense_category:
    ExpenseCategory;
  description: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  tax_rate: number;
  tax_amount: number;
  payment_status:
    PaymentStatus;
  payment_method:
    PaymentMethod | null;
  paid_amount: number;
  expense_date: string;
  receipt_number:
    string | null;
  invoice_number:
    string | null;
  notes:
    string | null;
};


type ExpenseForm = {
  costGroup:
    CostGroup;
  description:
    string;
  amount:
    string;
  supplierId:
    string;
  reservationId:
    string;
  paymentStatus:
    PaymentStatus;
  paymentMethod:
    PaymentMethod;
  paidAmount:
    string;
  expenseDate:
    string;
  invoiceNumber:
    string;
  receiptNumber:
    string;
  notes:
    string;
};


const today =
  new Date()
    .toISOString()
    .slice(
      0,
      10
    );


const EMPTY_FORM:
  ExpenseForm = {
    costGroup:
      "other",

    description:
      "",

    amount:
      "",

    supplierId:
      "",

    reservationId:
      "",

    paymentStatus:
      "pending",

    paymentMethod:
      "company_account",

    paidAmount:
      "0",

    expenseDate:
      today,

    invoiceNumber:
      "",

    receiptNumber:
      "",

    notes:
      "",
  };


const costLabels:
  Record<
    CostGroup,
    string
  > = {
    flight:
      "Uçuş / Havayolu",

    bus:
      "Otobüs / Araç",

    hotel:
      "Otel / Konaklama",

    guide:
      "Rehber",

    driver:
      "Şoför",

    activity:
      "Aktivite / Tur",

    transfer:
      "Transfer",

    food:
      "Yemek",

    commission:
      "Komisyon",

    payment_fee:
      "Ödeme Kesintisi",

    refund:
      "İade",

    other:
      "Diğer",
  };


const paymentLabels:
  Record<
    PaymentStatus,
    string
  > = {
    pending:
      "Bekliyor",

    paid:
      "Ödendi",

    partial:
      "Kısmi",

    cancelled:
      "İptal",
  };


function expenseCategoryForGroup(
  group:
    CostGroup
):
  ExpenseCategory {

  if (
    group ===
    "bus" ||
    group ===
    "transfer"
  ) {
    return "vehicle_rental";
  }

  if (
    group ===
    "hotel"
  ) {
    return "hotel";
  }

  if (
    group ===
    "guide"
  ) {
    return "guide_fee";
  }

  if (
    group ===
    "driver"
  ) {
    return "driver_fee";
  }

  if (
    group ===
    "activity"
  ) {
    return "activity_supplier";
  }

  if (
    group ===
    "food"
  ) {
    return "food";
  }

  if (
    group ===
    "commission"
  ) {
    return "commission";
  }

  if (
    group ===
    "payment_fee"
  ) {
    return "payment_fee";
  }

  if (
    group ===
    "refund"
  ) {
    return "refund";
  }

  /*
   * operation_expenses mevcut enum/check yapısını
   * değiştirmiyoruz.
   *
   * Flight maliyeti mevcut gider motorunda özel
   * bir kategori olmadığı için expense_category=other,
   * Tour OS raporlama sınıfı ise tour_cost_group=flight.
   */
  return "other";
}


function parseMoney(
  value:
    string | number | null | undefined
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return 0;
  }

  const normalized =
    String(value)
      .trim()
      .replace(
        /\s/g,
        ""
      )
      .replace(
        ",",
        "."
      );

  const parsed =
    Number(
      normalized
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}


function money(
  value:
    number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency:
        "TRY",
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function formatDate(
  value:
    string
) {
  const date =
    new Date(
      `${value}T00:00:00`
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
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
    }
  ).format(
    date
  );
}


function statusClass(
  value:
    PaymentStatus
) {
  if (
    value ===
    "paid"
  ) {
    return "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300";
  }

  if (
    value ===
    "pending"
  ) {
    return "border-red-500/20 bg-red-500/[.06] text-red-300";
  }

  if (
    value ===
    "partial"
  ) {
    return "border-amber-500/20 bg-amber-500/[.06] text-amber-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-500";
}


export default function TourFinancePage() {
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
    sales,
    setSales,
  ] =
    useState<Sale[]>(
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
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>(
      []
    );


  const [
    form,
    setForm,
  ] =
    useState<ExpenseForm>(
      EMPTY_FORM
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


  const loadDepartureFinance =
    useCallback(
      async (
        currentCompanyId:
          string,

        departureId:
          string
      ) => {

        if (
          !departureId
        ) {
          setReservations([]);
          setSales([]);
          setExpenses([]);
          return;
        }


        const reservationResult =
          await supabase
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
                "payment_status",
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
            );


        if (
          reservationResult.error
        ) {
          throw reservationResult.error;
        }


        const loadedReservations =
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[];


        const reservationIds =
          loadedReservations.map(
            item =>
              item.id
          );


        let loadedSales:
          Sale[] = [];


        if (
          reservationIds.length >
          0
        ) {
          const saleResult =
            await supabase
              .from(
                "sales"
              )
              .select(
                [
                  "reservation_id",
                  "grand_total",
                  "total_cost",
                  "total_guide_commission",
                  "company_gross_profit",
                  "payment_status",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .in(
                "reservation_id",
                reservationIds
              )
              .neq(
                "payment_status",
                "cancelled"
              );


          if (
            saleResult.error
          ) {
            throw saleResult.error;
          }


          loadedSales =
            (
              saleResult.data ??
              []
            ) as unknown as
              Sale[];
        }


        const expenseResult =
          await supabase
            .from(
              "operation_expenses"
            )
            .select(
              [
                "id",
                "company_id",
                "reservation_id",
                "supplier_id",
                "tour_id",
                "departure_id",
                "tour_cost_group",
                "expense_category",
                "description",
                "quantity",
                "unit_cost",
                "total_amount",
                "tax_rate",
                "tax_amount",
                "payment_status",
                "payment_method",
                "paid_amount",
                "expense_date",
                "receipt_number",
                "invoice_number",
                "notes",
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
              "payment_status",
              "cancelled"
            )
            .order(
              "expense_date",
              {
                ascending:
                  false,
              }
            );


        if (
          expenseResult.error
        ) {
          throw expenseResult.error;
        }


        setReservations(
          loadedReservations
        );


        setSales(
          loadedSales
        );


        setExpenses(
          (
            expenseResult.data ??
            []
          ) as unknown as
            Expense[]
        );

      },
      []
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
                    "tour_id",
                    "departure_date",
                    "capacity",
                    "reserved_count",
                    "status",
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
                  "suppliers"
                )
                .select(
                  "id,name"
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
                  "name",
                  {
                    ascending:
                      true,
                  }
                ),
            ]);


          if (
            tourResult.error
          ) {
            throw tourResult.error;
          }


          if (
            !tourResult.data
          ) {
            throw new Error(
              "Tur bulunamadı."
            );
          }


          if (
            departureResult.error
          ) {
            throw departureResult.error;
          }


          if (
            supplierResult.error
          ) {
            throw supplierResult.error;
          }


          const loadedTour =
            tourResult.data as unknown as
              Tour;


          const loadedDepartures =
            (
              departureResult.data ??
              []
            ) as unknown as
              Departure[];


          setTour(
            loadedTour
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


          if (
            loadedDepartures.length >
            0
          ) {
            const departureId =
              loadedDepartures[0].id;


            setSelectedDepartureId(
              departureId
            );


            await loadDepartureFinance(
              currentCompanyId,
              departureId
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
        loadDepartureFinance,
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


    if (
      !companyId ||
      !departureId
    ) {
      return;
    }


    setBusy(
      true
    );


    try {

      await loadDepartureFinance(
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


  async function saveExpense(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !companyId ||
      !selectedDepartureId ||
      !tour
    ) {
      return;
    }


    if (
      !form.description.trim()
    ) {
      setError(
        "Gider açıklaması zorunlu."
      );
      return;
    }


    const amount =
      Math.max(
        0,
        parseMoney(
          form.amount
        )
      );


    if (
      amount <=
      0
    ) {
      setError(
        "Gider tutarı sıfırdan büyük olmalı."
      );
      return;
    }


    const paidAmount =
      Math.min(
        amount,
        Math.max(
          0,
          parseMoney(
            form.paidAmount
          )
        )
      );


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
        data:
          authData,
      } =
        await supabase
          .auth
          .getUser();


      const payload = {
        company_id:
          companyId,

        tour_id:
          tour.id,

        departure_id:
          selectedDepartureId,

        reservation_id:
          form.reservationId ||
          null,

        supplier_id:
          form.supplierId ||
          null,

        assignment_id:
          null,

        vehicle_id:
          null,

        staff_id:
          null,

        tour_cost_group:
          form.costGroup,

        expense_category:
          expenseCategoryForGroup(
            form.costGroup
          ),

        description:
          form.description.trim(),

        quantity:
          1,

        unit_cost:
          amount,

        total_amount:
          amount,

        tax_rate:
          0,

        tax_amount:
          0,

        payment_status:
          form.paymentStatus,

        payment_method:
          form.paymentMethod,

        paid_amount:
          form.paymentStatus ===
          "paid"
            ? amount
            : paidAmount,

        expense_date:
          form.expenseDate,

        invoice_number:
          form.invoiceNumber.trim() ||
          null,

        receipt_number:
          form.receiptNumber.trim() ||
          null,

        notes:
          form.notes.trim() ||
          null,

        created_by:
          authData.user?.id ??
          null,

        updated_at:
          new Date()
            .toISOString(),
      };


      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "operation_expenses"
          )
          .insert(
            payload
          );


      if (
        insertError
      ) {
        throw insertError;
      }


      await loadDepartureFinance(
        companyId,
        selectedDepartureId
      );


      setForm(
        EMPTY_FORM
      );


      setNotice(
        "Tur gideri mevcut gider motoruna kaydedildi."
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


  async function cancelExpense(
    expenseId:
      string
  ) {

    if (
      !companyId ||
      !selectedDepartureId
    ) {
      return;
    }


    if (
      !window.confirm(
        "Bu gider kaydını iptal etmek istediğinize emin misiniz? Kayıt finans geçmişinde korunacaktır."
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


    try {

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "operation_expenses"
          )
          .update({
            payment_status:
              "cancelled",
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
            expenseId
          );


      if (
        updateError
      ) {
        throw updateError;
      }


      await loadDepartureFinance(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Gider iptal edildi. Finans geçmişi korundu."
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


  const revenue =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.grand_total ??
          0
        ),
      0
    );


  const recordedSaleCost =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.total_cost ??
          0
        ) +
        Number(
          sale.total_guide_commission ??
          0
        ),
      0
    );


  const salesGrossProfit =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.company_gross_profit ??
          0
        ),
      0
    );


  const activeExpenses =
    expenses.filter(
      expense =>
        expense.payment_status !==
        "cancelled"
    );


  const operationExpenseTotal =
    activeExpenses.reduce(
      (
        total,
        expense
      ) =>
        total +
        Number(
          expense.total_amount ??
          0
        ),
      0
    );


  const operationPaidTotal =
    activeExpenses.reduce(
      (
        total,
        expense
      ) =>
        total +
        Number(
          expense.paid_amount ??
          0
        ),
      0
    );


  const supplierPayable =
    activeExpenses
      .filter(
        expense =>
          Boolean(
            expense.supplier_id
          ) &&
          [
            "pending",
            "partial",
          ].includes(
            expense.payment_status
          )
      )
      .reduce(
        (
          total,
          expense
        ) =>
          total +
          Math.max(
            0,
            Number(
              expense.total_amount ??
              0
            ) -
            Number(
              expense.paid_amount ??
              0
            )
          ),
        0
      );


  /*
   * sales.company_gross_profit mevcut satış motorunun
   * kendi brüt kâr verisidir.
   *
   * operation_expenses ayrıca gerçek operasyon gideridir.
   *
   * Burada muhasebe net kârı iddiası yapmıyoruz.
   * "Operasyon Sonrası Katkı" gösteriyoruz.
   */
  const operationalContribution =
    salesGrossProfit -
    operationExpenseTotal;


  const grossMargin =
    revenue >
      0
      ? (
          salesGrossProfit /
          revenue
        ) *
        100
      : 0;


  const contributionMargin =
    revenue >
      0
      ? (
          operationalContribution /
          revenue
        ) *
        100
      : 0;


  const categoryTotals =
    useMemo(
      () => {

        const result:
          Record<
            CostGroup,
            number
          > = {
            flight:
              0,
            bus:
              0,
            hotel:
              0,
            guide:
              0,
            driver:
              0,
            activity:
              0,
            transfer:
              0,
            food:
              0,
            commission:
              0,
            payment_fee:
              0,
            refund:
              0,
            other:
              0,
          };


        for (
          const expense
          of activeExpenses
        ) {

          const group =
            expense.tour_cost_group ||
            "other";


          result[group] +=
            Number(
              expense.total_amount ??
              0
            );

        }


        return result;

      },
      [
        activeExpenses,
      ]
    );


  const selectedDeparture =
    departures.find(
      departure =>
        departure.id ===
        selectedDepartureId
    ) ??
    null;


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Tur finansmanı hazırlanıyor...
      </main>
    );

  }


  return (
    <main data-tour-os-screen="finance-center" className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1700px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/turlar"
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Yönetimi
        </Link>


        <section className="mt-4 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,.12),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-emerald-300">
                <FaChartLine />
                TUR FİNANSMANI
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-3 flex flex-wrap gap-2 text-[8px] text-slate-500">

                <span>
                  {tour?.transport_mode ===
                    "air"
                    ? "Uçaklı Tur"
                    : tour?.transport_mode ===
                        "bus"
                      ? "Otobüslü Tur"
                      : "Ulaşım Belirlenmedi"}
                </span>

                <span>•</span>

                <span>
                  Çıkış:{" "}
                  {selectedDeparture
                    ? formatDate(
                        selectedDeparture.departure_date
                      )
                    : "—"}
                </span>

                <span>•</span>

                <span>
                  Gerçek sales + operation_expenses verisi
                </span>

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
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[8px] font-black"
            >

              {departures.length ===
              0 ? (
                <option value="">
                  Çıkış bulunamadı
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
                      {formatDate(
                        departure.departure_date
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


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">
            <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
              Ciro
            </div>

            <div className="mt-3 text-2xl font-black text-white">
              {money(
                revenue
              )}
            </div>
          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">
            <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
              Satış Kayıt Maliyeti
            </div>

            <div className="mt-3 text-2xl font-black text-amber-300">
              {money(
                recordedSaleCost
              )}
            </div>
          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">
            <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
              Satış Brüt Kârı
            </div>

            <div className="mt-3 text-2xl font-black text-emerald-300">
              {money(
                salesGrossProfit
              )}
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              %{grossMargin.toFixed(
                1
              )} marj
            </div>
          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">
            <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
              Operasyon Gideri
            </div>

            <div className="mt-3 text-2xl font-black text-red-300">
              {money(
                operationExpenseTotal
              )}
            </div>
          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">
            <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
              Tedarikçi Borcu
            </div>

            <div className="mt-3 text-2xl font-black text-orange-300">
              {money(
                supplierPayable
              )}
            </div>
          </article>


          <article
            className={`rounded-[22px] border p-5 ${
              operationalContribution >=
              0
                ? "border-emerald-500/20 bg-emerald-500/[.05]"
                : "border-red-500/20 bg-red-500/[.05]"
            }`}
          >

            <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-500">
              Operasyon Sonrası Katkı
            </div>

            <div
              className={`mt-3 text-2xl font-black ${
                operationalContribution >=
                0
                  ? "text-emerald-300"
                  : "text-red-300"
              }`}
            >
              {money(
                operationalContribution
              )}
            </div>

            <div className="mt-2 text-[7px] text-slate-600">
              %{contributionMargin.toFixed(
                1
              )}
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[430px_1fr]">

          <aside>

            <form
              onSubmit={
                saveExpense
              }
              className="rounded-[26px] border border-white/10 bg-[#07131f] p-5"
            >

              <div className="flex items-center gap-2 text-[9px] font-black">
                <FaPlus className="text-orange-300" />
                Tur Gideri Ekle
              </div>


              <div className="mt-1 text-[7px] leading-5 text-slate-600">
                Yeni gider ayrı sisteme değil mevcut operation_expenses motoruna kaydedilir.
              </div>


              <div className="mt-5 grid gap-3">

                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    MALİYET GRUBU
                  </span>

                  <select
                    value={
                      form.costGroup
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          costGroup:
                            event.target.value as
                              CostGroup,
                        })
                      )
                    }
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                  >

                    {(
                      Object.keys(
                        costLabels
                      ) as
                        CostGroup[]
                    ).map(
                      group => (
                        <option
                          key={
                            group
                          }
                          value={
                            group
                          }
                        >
                          {costLabels[group]}
                        </option>
                      )
                    )}

                  </select>

                </label>


                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    AÇIKLAMA
                  </span>

                  <input
                    value={
                      form.description
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          description:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Örn. THY grup bilet maliyeti"
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                  />

                </label>


                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    TUTAR
                  </span>

                  <input
                    value={
                      form.amount
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          amount:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="0"
                    inputMode="decimal"
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-black"
                  />

                </label>


                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    TEDARİKÇİ
                  </span>

                  <select
                    value={
                      form.supplierId
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          supplierId:
                            event.target.value,
                        })
                      )
                    }
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                  >

                    <option value="">
                      Tedarikçi seçilmedi
                    </option>

                    {suppliers.map(
                      supplier => (
                        <option
                          key={
                            supplier.id
                          }
                          value={
                            supplier.id
                          }
                        >
                          {supplier.name}
                        </option>
                      )
                    )}

                  </select>

                </label>


                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    REZERVASYON
                  </span>

                  <select
                    value={
                      form.reservationId
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          reservationId:
                            event.target.value,
                        })
                      )
                    }
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                  >

                    <option value="">
                      Tur geneli
                    </option>

                    {reservations.map(
                      reservation => (
                        <option
                          key={
                            reservation.id
                          }
                          value={
                            reservation.id
                          }
                        >
                          {reservation.reservation_code ||
                            reservation.id.slice(
                              0,
                              8
                            )}
                          {" · "}
                          {reservation.full_name}
                        </option>
                      )
                    )}

                  </select>

                </label>


                <div className="grid grid-cols-2 gap-3">

                  <label className="space-y-1">

                    <span className="text-[7px] font-black text-slate-600">
                      ÖDEME DURUMU
                    </span>

                    <select
                      value={
                        form.paymentStatus
                      }
                      onChange={event =>
                        setForm(
                          current => ({
                            ...current,
                            paymentStatus:
                              event.target.value as
                                PaymentStatus,
                          })
                        )
                      }
                      className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-2 text-[7px]"
                    >
                      <option value="pending">
                        Bekliyor
                      </option>

                      <option value="partial">
                        Kısmi
                      </option>

                      <option value="paid">
                        Ödendi
                      </option>
                    </select>

                  </label>


                  <label className="space-y-1">

                    <span className="text-[7px] font-black text-slate-600">
                      ÖDENEN
                    </span>

                    <input
                      value={
                        form.paidAmount
                      }
                      onChange={event =>
                        setForm(
                          current => ({
                            ...current,
                            paidAmount:
                              event.target.value,
                          })
                        )
                      }
                      inputMode="decimal"
                      className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                    />

                  </label>

                </div>


                <label className="space-y-1">

                  <span className="text-[7px] font-black text-slate-600">
                    ÖDEME YÖNTEMİ
                  </span>

                  <select
                    value={
                      form.paymentMethod
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          paymentMethod:
                            event.target.value as
                              PaymentMethod,
                        })
                      )
                    }
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                  >

                    <option value="company_account">
                      Şirket Cari Hesabı
                    </option>

                    <option value="cash">
                      Nakit
                    </option>

                    <option value="card">
                      Kart
                    </option>

                    <option value="bank_transfer">
                      Havale / EFT
                    </option>

                    <option value="iyzico">
                      İyzico
                    </option>

                    <option value="other">
                      Diğer
                    </option>

                  </select>

                </label>


                <input
                  type="date"
                  value={
                    form.expenseDate
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        expenseDate:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />


                <div className="grid grid-cols-2 gap-3">

                  <input
                    value={
                      form.invoiceNumber
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          invoiceNumber:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Fatura No"
                    className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                  />


                  <input
                    value={
                      form.receiptNumber
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          receiptNumber:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Fiş / Makbuz"
                    className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                  />

                </div>


                <textarea
                  rows={3}
                  value={
                    form.notes
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        notes:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Finans / operasyon notu"
                  className="rounded-xl border border-white/10 bg-[#030a11] p-3 text-[8px]"
                />


                <button
                  type="submit"
                  disabled={
                    busy
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black disabled:opacity-40"
                >
                  <FaSave />
                  Gideri Kaydet
                </button>

              </div>

            </form>

          </aside>


          <section className="space-y-5">

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

              {[
                {
                  label:
                    "Uçuş",
                  value:
                    categoryTotals.flight,
                  icon:
                    <FaPlane />,
                },

                {
                  label:
                    "Otobüs / Araç",
                  value:
                    categoryTotals.bus +
                    categoryTotals.transfer,
                  icon:
                    <FaBus />,
                },

                {
                  label:
                    "Otel",
                  value:
                    categoryTotals.hotel,
                  icon:
                    <FaHotel />,
                },

                {
                  label:
                    "Rehber / Şoför",
                  value:
                    categoryTotals.guide +
                    categoryTotals.driver,
                  icon:
                    <FaUserTie />,
                },
              ].map(
                item => (
                  <article
                    key={
                      item.label
                    }
                    className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
                  >

                    <div className="flex items-center justify-between">

                      <div className="text-[7px] font-black uppercase text-slate-600">
                        {item.label}
                      </div>

                      <div className="text-slate-500">
                        {item.icon}
                      </div>

                    </div>


                    <div className="mt-3 text-xl font-black">
                      {money(
                        item.value
                      )}
                    </div>

                  </article>
                )
              )}

            </div>


            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

              <div className="flex items-center justify-between border-b border-white/[.06] p-5">

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black">
                    <FaReceipt className="text-orange-300" />
                    Tur Giderleri
                  </div>

                  <div className="mt-1 text-[7px] text-slate-600">
                    Mevcut operation_expenses kayıtları
                  </div>

                </div>


                <Link
                  href="/dashboard/giderler"
                  className="rounded-lg border border-white/10 px-3 py-2 text-[7px] font-black text-slate-400"
                >
                  Genel Gider Merkezi
                </Link>

              </div>


              <div className="overflow-auto">

                <table className="min-w-[1200px] w-full">

                  <thead className="bg-[#081522]">

                    <tr className="text-left text-[7px] font-black uppercase tracking-[.08em] text-slate-600">

                      <th className="px-4 py-4">
                        Tarih
                      </th>

                      <th className="px-4 py-4">
                        Grup
                      </th>

                      <th className="px-4 py-4">
                        Açıklama
                      </th>

                      <th className="px-4 py-4">
                        Tedarikçi
                      </th>

                      <th className="px-4 py-4">
                        Tutar
                      </th>

                      <th className="px-4 py-4">
                        Ödenen
                      </th>

                      <th className="px-4 py-4">
                        Kalan
                      </th>

                      <th className="px-4 py-4">
                        Durum
                      </th>

                      <th className="px-4 py-4">
                        Belge
                      </th>

                      <th className="px-4 py-4 text-right">
                        İşlem
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {expenses.length ===
                    0 ? (
                      <tr>

                        <td
                          colSpan={10}
                          className="px-5 py-14 text-center"
                        >

                          <FaWallet className="mx-auto text-3xl text-slate-800" />

                          <div className="mt-4 text-[10px] font-black">
                            Bu çıkış için gider kaydı yok
                          </div>

                          <div className="mt-2 text-[8px] text-slate-600">
                            Gerçek gider girildiğinde burada görünür.
                          </div>

                        </td>

                      </tr>
                    ) : (
                      expenses.map(
                        expense => {

                          const supplier =
                            suppliers.find(
                              item =>
                                item.id ===
                                expense.supplier_id
                            );


                          const remaining =
                            Math.max(
                              0,
                              Number(
                                expense.total_amount ??
                                0
                              ) -
                              Number(
                                expense.paid_amount ??
                                0
                              )
                            );


                          return (
                            <tr
                              key={
                                expense.id
                              }
                              className="border-t border-white/[.045] hover:bg-white/[.02]"
                            >

                              <td className="px-4 py-4 text-[8px]">
                                {formatDate(
                                  expense.expense_date
                                )}
                              </td>


                              <td className="px-4 py-4">

                                <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[7px] font-black">
                                  {costLabels[
                                    expense.tour_cost_group ||
                                    "other"
                                  ]}
                                </span>

                              </td>


                              <td className="px-4 py-4">

                                <div className="text-[8px] font-black">
                                  {expense.description}
                                </div>

                                {expense.notes && (
                                  <div className="mt-1 max-w-[260px] truncate text-[7px] text-slate-600">
                                    {expense.notes}
                                  </div>
                                )}

                              </td>


                              <td className="px-4 py-4 text-[8px] text-slate-400">
                                {supplier?.name ||
                                  "—"}
                              </td>


                              <td className="px-4 py-4 text-[9px] font-black">
                                {money(
                                  expense.total_amount
                                )}
                              </td>


                              <td className="px-4 py-4 text-[8px] text-emerald-300">
                                {money(
                                  expense.paid_amount
                                )}
                              </td>


                              <td className="px-4 py-4 text-[8px] font-black text-orange-300">
                                {money(
                                  remaining
                                )}
                              </td>


                              <td className="px-4 py-4">

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${statusClass(
                                    expense.payment_status
                                  )}`}
                                >
                                  {paymentLabels[
                                    expense.payment_status
                                  ]}
                                </span>

                              </td>


                              <td className="px-4 py-4 text-[7px] text-slate-500">
                                {expense.invoice_number ||
                                  expense.receipt_number ||
                                  "—"}
                              </td>


                              <td className="px-4 py-4 text-right">

                                <button
                                  type="button"
                                  disabled={
                                    busy ||
                                    expense.payment_status ===
                                      "cancelled"
                                  }
                                  title={
                                    expense.payment_status ===
                                    "cancelled"
                                      ? "Bu gider daha önce iptal edilmiş."
                                      : "Gideri iptal et ve geçmişte koru"
                                  }
                                  onClick={() =>
                                    void cancelExpense(
                                      expense.id
                                    )
                                  }
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.05] text-red-300 disabled:opacity-40"
                                >
                                  <FaTrash />
                                </button>

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


            <section className="rounded-[26px] border border-white/10 bg-[#07131f]">

              <div className="border-b border-white/[.06] p-5">

                <div className="flex items-center gap-2 text-[9px] font-black">
                  <FaMoneyBillWave className="text-emerald-300" />
                  Rezervasyon Satış Finansmanı
                </div>


                <div className="mt-1 text-[7px] text-slate-600">
                  sales tablosundaki mevcut gerçek satış kayıtları
                </div>

              </div>


              <div className="overflow-auto">

                <table className="min-w-[950px] w-full">

                  <thead className="bg-[#081522]">

                    <tr className="text-left text-[7px] font-black uppercase text-slate-600">

                      <th className="px-4 py-4">
                        Rezervasyon
                      </th>

                      <th className="px-4 py-4">
                        Yolcu
                      </th>

                      <th className="px-4 py-4">
                        Kişi
                      </th>

                      <th className="px-4 py-4">
                        Ciro
                      </th>

                      <th className="px-4 py-4">
                        Satış Maliyeti
                      </th>

                      <th className="px-4 py-4">
                        Rehber Kom.
                      </th>

                      <th className="px-4 py-4">
                        Brüt Kâr
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {reservations.map(
                      reservation => {

                        const reservationSales =
                          sales.filter(
                            sale =>
                              sale.reservation_id ===
                              reservation.id
                          );


                        const rowRevenue =
                          reservationSales.reduce(
                            (
                              total,
                              sale
                            ) =>
                              total +
                              Number(
                                sale.grand_total ??
                                0
                              ),
                            0
                          );


                        const rowCost =
                          reservationSales.reduce(
                            (
                              total,
                              sale
                            ) =>
                              total +
                              Number(
                                sale.total_cost ??
                                0
                              ),
                            0
                          );


                        const rowCommission =
                          reservationSales.reduce(
                            (
                              total,
                              sale
                            ) =>
                              total +
                              Number(
                                sale.total_guide_commission ??
                                0
                              ),
                            0
                          );


                        const rowProfit =
                          reservationSales.reduce(
                            (
                              total,
                              sale
                            ) =>
                              total +
                              Number(
                                sale.company_gross_profit ??
                                0
                              ),
                            0
                          );


                        return (
                          <tr
                            key={
                              reservation.id
                            }
                            className="border-t border-white/[.045]"
                          >

                            <td className="px-4 py-4 font-mono text-[8px] font-black text-orange-300">
                              {reservation.reservation_code ||
                                reservation.id.slice(
                                  0,
                                  8
                                )}
                            </td>


                            <td className="px-4 py-4 text-[8px] font-black">
                              {reservation.full_name}
                            </td>


                            <td className="px-4 py-4 text-[8px]">
                              {reservation.guests}
                            </td>


                            <td className="px-4 py-4 text-[8px] font-black">
                              {money(
                                rowRevenue
                              )}
                            </td>


                            <td className="px-4 py-4 text-[8px] text-amber-300">
                              {money(
                                rowCost
                              )}
                            </td>


                            <td className="px-4 py-4 text-[8px] text-slate-400">
                              {money(
                                rowCommission
                              )}
                            </td>


                            <td
                              className={`px-4 py-4 text-[8px] font-black ${
                                rowProfit >=
                                0
                                  ? "text-emerald-300"
                                  : "text-red-300"
                              }`}
                            >
                              {money(
                                rowProfit
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

          </section>

        </section>


        <section className="mt-5 grid gap-4 lg:grid-cols-3">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black">
              <FaWallet className="text-emerald-300" />
              Gider Ödeme Durumu
            </div>


            <div className="mt-4 text-3xl font-black">
              {money(
                operationPaidTotal
              )}
            </div>


            <div className="mt-1 text-[7px] text-slate-600">
              Toplam {money(
                operationExpenseTotal
              )} operasyon giderinin ödenen kısmı
            </div>

          </article>


          <article className="rounded-[24px] border border-orange-500/15 bg-orange-500/[.04] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black text-orange-300">
              <FaExclamationTriangle />
              Açık Tedarikçi Borcu
            </div>


            <div className="mt-4 text-3xl font-black">
              {money(
                supplierPayable
              )}
            </div>


            <div className="mt-1 text-[7px] text-slate-600">
              Bekleyen ve kısmi ödenmiş tedarikçi giderleri
            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black">
              <FaChartLine className="text-blue-300" />
              Finans Tanımı
            </div>


            <div className="mt-4 text-[8px] leading-6 text-slate-500">
              “Operasyon Sonrası Katkı” muhasebe net kârı değildir.
              Mevcut satış motorundaki şirket brüt kârından bu çıkışa
              bağlı gerçek operasyon giderleri düşülerek hesaplanır.
            </div>

          </article>

        </section>

      </div>

    </main>
  );
}
