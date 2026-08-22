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
  FaBuilding,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaLink,
  FaMoneyBillWave,
  FaPhone,
  FaPlus,
  FaReceipt,
  FaSave,
  FaSearch,
  FaTrash,
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


type ServiceType =
  | "flight"
  | "hotel"
  | "bus"
  | "transfer"
  | "activity"
  | "restaurant"
  | "guide"
  | "boat"
  | "spa"
  | "photography"
  | "insurance"
  | "other";


type ConfirmationStatus =
  | "pending"
  | "requested"
  | "confirmed"
  | "rejected"
  | "cancelled";


type OperationalStatus =
  | "pending"
  | "ready"
  | "in_service"
  | "completed"
  | "issue"
  | "cancelled";


type Tour = {
  id: string;
  title: string;
};


type Departure = {
  id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
};


type Supplier = {
  id: string;
  name: string;
  legal_name:
    string | null;
  supplier_type: string;
  contact_name:
    string | null;
  phone:
    string | null;
  whatsapp_phone:
    string | null;
  email:
    string | null;
  iban:
    string | null;
  payment_term_days: number;
  default_commission_rate: number;
};


type Expense = {
  id: string;
  supplier_id:
    string | null;
  departure_id:
    string | null;
  description: string;
  total_amount: number;
  paid_amount: number;
  payment_status:
    string;
  expense_date: string;
  invoice_number:
    string | null;
  receipt_number:
    string | null;
};


type Commitment = {
  id: string;
  supplier_id: string;
  operation_expense_id:
    string | null;
  service_type:
    ServiceType;
  service_title: string;
  confirmation_status:
    ConfirmationStatus;
  operational_status:
    OperationalStatus;
  contract_amount:
    number | null;
  currency:
    string | null;
  payment_due_at:
    string | null;
  confirmation_reference:
    string | null;
  voucher_reference:
    string | null;
  supplier_confirmation_note:
    string | null;
  internal_note:
    string | null;
  confirmed_at:
    string | null;
};


type FormState = {
  supplierId: string;
  serviceType:
    ServiceType;
  serviceTitle: string;
  confirmationStatus:
    ConfirmationStatus;
  operationalStatus:
    OperationalStatus;
  contractAmount: string;
  currency: string;
  paymentDueAt: string;
  operationExpenseId: string;
  confirmationReference: string;
  voucherReference: string;
  supplierConfirmationNote: string;
  internalNote: string;
};


const EMPTY_FORM:
  FormState = {

    supplierId:
      "",

    serviceType:
      "other",

    serviceTitle:
      "",

    confirmationStatus:
      "pending",

    operationalStatus:
      "pending",

    contractAmount:
      "",

    currency:
      "",

    paymentDueAt:
      "",

    operationExpenseId:
      "",

    confirmationReference:
      "",

    voucherReference:
      "",

    supplierConfirmationNote:
      "",

    internalNote:
      "",
  };


const serviceLabels:
  Record<
    ServiceType,
    string
  > = {

    flight:
      "Havayolu / Uçuş",

    hotel:
      "Otel",

    bus:
      "Otobüs",

    transfer:
      "Transfer",

    activity:
      "Aktivite",

    restaurant:
      "Restoran",

    guide:
      "Rehber",

    boat:
      "Tekne",

    spa:
      "Spa",

    photography:
      "Fotoğraf / Video",

    insurance:
      "Sigorta",

    other:
      "Diğer",
  };


const confirmationLabels:
  Record<
    ConfirmationStatus,
    string
  > = {

    pending:
      "Bekliyor",

    requested:
      "Teyit İstendi",

    confirmed:
      "Teyitli",

    rejected:
      "Reddedildi",

    cancelled:
      "İptal",
  };


function numberValue(
  value:
    string | number | null | undefined
) {
  const result =
    Number(
      String(
        value ?? 0
      )
        .replace(
          ",",
          "."
        )
    );

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}


function formatAmount(
  amount:
    number,
  currency:
    string | null
) {

  if (!currency) {
    return amount.toLocaleString(
      "tr-TR",
      {
        maximumFractionDigits:
          2,
      }
    );
  }


  try {

    return new Intl.NumberFormat(
      "tr-TR",
      {
        style:
          "currency",
        currency,
        maximumFractionDigits:
          2,
      }
    ).format(amount);

  } catch {

    return `${amount.toLocaleString(
      "tr-TR"
    )} ${currency}`;

  }

}


function formatTry(
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
  ).format(value);

}


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
    }
  ).format(date);

}


function isPastDue(
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


export default function TourSupplierCurrentPage() {

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
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>(
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
    commitments,
    setCommitments,
  ] =
    useState<Commitment[]>(
      []
    );


  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      EMPTY_FORM
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


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

        if (
          !departureId
        ) {
          setExpenses([]);
          setCommitments([]);
          return;
        }


        const [
          expenseResult,
          commitmentResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "operation_expenses"
              )
              .select(
                [
                  "id",
                  "supplier_id",
                  "departure_id",
                  "description",
                  "total_amount",
                  "paid_amount",
                  "payment_status",
                  "expense_date",
                  "invoice_number",
                  "receipt_number",
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
              ),


            supabase
              .from(
                "tour_supplier_commitments"
              )
              .select(
                [
                  "id",
                  "supplier_id",
                  "operation_expense_id",
                  "service_type",
                  "service_title",
                  "confirmation_status",
                  "operational_status",
                  "contract_amount",
                  "currency",
                  "payment_due_at",
                  "confirmation_reference",
                  "voucher_reference",
                  "supplier_confirmation_note",
                  "internal_note",
                  "confirmed_at",
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
          expenseResult.error
        ) {
          throw expenseResult.error;
        }


        if (
          commitmentResult.error
        ) {
          throw commitmentResult.error;
        }


        setExpenses(
          (
            expenseResult.data ??
            []
          ) as unknown as
            Expense[]
        );


        setCommitments(
          (
            commitmentResult.data ??
            []
          ) as unknown as
            Commitment[]
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
          ] =
            await Promise.all([

              supabase
                .from(
                  "tours"
                )
                .select(
                  "id,title"
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
                  "suppliers"
                )
                .select(
                  [
                    "id",
                    "name",
                    "legal_name",
                    "supplier_type",
                    "contact_name",
                    "phone",
                    "whatsapp_phone",
                    "email",
                    "iban",
                    "payment_term_days",
                    "default_commission_rate",
                  ].join(",")
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
            departureResult.error
          ) {
            throw departureResult.error;
          }


          if (
            supplierResult.error
          ) {
            throw supplierResult.error;
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


          if (
            loadedDepartures.length >
            0
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


  async function changeDeparture(
    departureId:
      string
  ) {

    setSelectedDepartureId(
      departureId
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


  async function saveCommitment(
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
      !form.supplierId
    ) {

      setError(
        "Tedarikçi seçimi zorunlu."
      );

      return;

    }


    if (
      !form.serviceTitle.trim()
    ) {

      setError(
        "Hizmet açıklaması zorunlu."
      );

      return;

    }


    const contractAmount =
      form.contractAmount.trim()
        ? numberValue(
            form.contractAmount
          )
        : null;


    if (
      contractAmount !==
        null &&
      contractAmount <
        0
    ) {

      setError(
        "Sözleşme tutarı negatif olamaz."
      );

      return;

    }


    if (
      contractAmount !==
        null &&
      contractAmount >
        0 &&
      !form.currency
    ) {

      setError(
        "Tutar girildiğinde para birimi seçilmelidir."
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
            "tour_supplier_commitments"
          )
          .insert({

            company_id:
              companyId,

            tour_id:
              tour.id,

            departure_id:
              selectedDepartureId,

            supplier_id:
              form.supplierId,

            operation_expense_id:
              form.operationExpenseId ||
              null,

            service_type:
              form.serviceType,

            service_title:
              form.serviceTitle.trim(),

            confirmation_status:
              form.confirmationStatus,

            operational_status:
              form.operationalStatus,

            contract_amount:
              contractAmount,

            currency:
              form.currency ||
              null,

            payment_due_at:
              form.paymentDueAt
                ? new Date(
                    form.paymentDueAt
                  ).toISOString()
                : null,

            confirmation_reference:
              form.confirmationReference.trim() ||
              null,

            voucher_reference:
              form.voucherReference.trim() ||
              null,

            supplier_confirmation_note:
              form.supplierConfirmationNote.trim() ||
              null,

            internal_note:
              form.internalNote.trim() ||
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
        "Tedarikçi operasyon kaydı oluşturuldu."
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


  async function updateConfirmation(
    commitment:
      Commitment,

    confirmationStatus:
      ConfirmationStatus
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
            "tour_supplier_commitments"
          )
          .update({
            confirmation_status:
              confirmationStatus,

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
            commitment.id
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
        "Tedarikçi teyit durumu güncellendi."
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


  async function updateOperation(
    commitment:
      Commitment,

    operationalStatus:
      OperationalStatus
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
            "tour_supplier_commitments"
          )
          .update({
            operational_status:
              operationalStatus,

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
            commitment.id
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
        "Operasyon durumu güncellendi."
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


  async function deleteCommitment(
    commitment:
      Commitment
  ) {

    if (
      !window.confirm(
        "Bu tedarikçi operasyon kaydını silmek istediğinize emin misiniz?"
      )
    ) {
      return;
    }


    setBusy(
      true
    );


    try {

      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            "tour_supplier_commitments"
          )
          .delete()
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "id",
            commitment.id
          );


      if (
        deleteError
      ) {
        throw deleteError;
      }


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Tedarikçi operasyon kaydı silindi."
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


  const supplierExpenses =
    expenses.filter(
      expense =>
        Boolean(
          expense.supplier_id
        )
    );


  const payableTotal =
    supplierExpenses.reduce(
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


  const paidTotal =
    supplierExpenses.reduce(
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


  const confirmedCount =
    commitments.filter(
      item =>
        item.confirmation_status ===
        "confirmed"
    ).length;


  const pendingConfirmationCount =
    commitments.filter(
      item =>
        [
          "pending",
          "requested",
        ].includes(
          item.confirmation_status
        )
    ).length;


  const issueCount =
    commitments.filter(
      item =>
        item.operational_status ===
        "issue"
    ).length;


  const overduePaymentCount =
    commitments.filter(
      commitment =>
        isPastDue(
          commitment.payment_due_at
        ) &&
        commitment.operation_expense_id
    ).filter(
      commitment => {

        const expense =
          expenses.find(
            item =>
              item.id ===
              commitment.operation_expense_id
          );


        if (!expense) {
          return false;
        }


        return (
          Number(
            expense.total_amount ??
            0
          ) -
          Number(
            expense.paid_amount ??
            0
          )
        ) >
          0;

      }
    ).length;


  const currencyTotals =
    useMemo(
      () => {

        const result =
          new Map<
            string,
            number
          >();


        for (
          const item
          of commitments
        ) {

          if (
            !item.currency ||
            item.contract_amount ===
              null
          ) {
            continue;
          }


          result.set(
            item.currency,

            (
              result.get(
                item.currency
              ) ??
              0
            ) +
              Number(
                item.contract_amount
              )
          );

        }


        return Array.from(
          result.entries()
        );

      },
      [
        commitments,
      ]
    );


  const visibleCommitments =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        if (!query) {
          return commitments;
        }


        return commitments.filter(
          commitment => {

            const supplier =
              suppliers.find(
                item =>
                  item.id ===
                  commitment.supplier_id
              );


            return [
              commitment.service_title,
              serviceLabels[
                commitment.service_type
              ],
              supplier?.name,
              supplier?.legal_name,
              commitment.confirmation_reference,
              commitment.voucher_reference,
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
              );

          }
        );

      },
      [
        commitments,
        search,
        suppliers,
      ]
    );


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Tedarikçi operasyon merkezi yükleniyor...
      </main>
    );

  }


  return (
    <main data-tour-os-screen="supplier-center" className="min-h-screen bg-[#030a11] text-white">

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
            href="/dashboard/tedarikciler"
            className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-2.5 text-[8px] font-black text-slate-400"
          >
            Tedarikçi Kartları
          </Link>

        </div>


        <section className="mt-4 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_36%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.14em] text-orange-300">
                <FaBuilding />
                TEDARİKÇİ & CARİ OPERASYON
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-3 text-[8px] text-slate-500">
                Tedarikçi teyidi + gerçek operation_expenses cari verisi
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


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black text-slate-600">
              TEDARİKÇİ
            </div>

            <div className="mt-3 text-3xl font-black">
              {
                new Set(
                  commitments.map(
                    item =>
                      item.supplier_id
                  )
                ).size
              }
            </div>

          </article>


          <article className="rounded-[22px] border border-emerald-500/15 bg-emerald-500/[.04] p-5">

            <div className="text-[7px] font-black text-emerald-300">
              TEYİTLİ
            </div>

            <div className="mt-3 text-3xl font-black">
              {confirmedCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-amber-500/15 bg-amber-500/[.04] p-5">

            <div className="text-[7px] font-black text-amber-300">
              TEYİT BEKLİYOR
            </div>

            <div className="mt-3 text-3xl font-black">
              {pendingConfirmationCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-red-500/15 bg-red-500/[.04] p-5">

            <div className="text-[7px] font-black text-red-300">
              OPERASYON SORUNU
            </div>

            <div className="mt-3 text-3xl font-black">
              {issueCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-orange-500/15 bg-orange-500/[.04] p-5">

            <div className="text-[7px] font-black text-orange-300">
              GERÇEK CARİ BORÇ
            </div>

            <div className="mt-3 text-xl font-black">
              {formatTry(
                payableTotal
              )}
            </div>

          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black text-slate-600">
              ÖDENEN
            </div>

            <div className="mt-3 text-xl font-black text-emerald-300">
              {formatTry(
                paidTotal
              )}
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[430px_1fr]">

          <form
            onSubmit={
              saveCommitment
            }
            className="rounded-[26px] border border-white/10 bg-[#07131f] p-5"
          >

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaPlus className="text-orange-300" />
              Tedarikçi Operasyon Kaydı
            </div>


            <div className="mt-2 text-[7px] leading-5 text-slate-600">
              Bu kayıt cari hareket değildir. Tedarikçi teyidi ve operasyon sözleşme katmanıdır.
            </div>


            <div className="mt-5 grid gap-3">

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
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              >

                <option value="">
                  Tedarikçi seç
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
                      {" · "}
                      {supplier.supplier_type}
                    </option>
                  )
                )}

              </select>


              <select
                value={
                  form.serviceType
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      serviceType:
                        event.target.value as
                          ServiceType,
                    })
                  )
                }
                className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              >

                {(
                  Object.keys(
                    serviceLabels
                  ) as
                    ServiceType[]
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
                      {serviceLabels[type]}
                    </option>
                  )
                )}

              </select>


              <input
                value={
                  form.serviceTitle
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      serviceTitle:
                        event.target.value,
                    })
                  )
                }
                placeholder="Örn. 2 gece yarım pansiyon grup konaklama"
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              />


              <div className="grid grid-cols-[1fr_110px] gap-3">

                <input
                  value={
                    form.contractAmount
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        contractAmount:
                          event.target.value,
                      })
                    )
                  }
                  inputMode="decimal"
                  placeholder="Sözleşme tutarı"
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />


                <select
                  value={
                    form.currency
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        currency:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-2 text-[8px]"
                >

                  <option value="">
                    Para
                  </option>

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

              </div>


              <div className="grid grid-cols-2 gap-3">

                <select
                  value={
                    form.confirmationStatus
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        confirmationStatus:
                          event.target.value as
                            ConfirmationStatus,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-2 text-[7px]"
                >

                  <option value="pending">
                    Teyit Bekliyor
                  </option>

                  <option value="requested">
                    Teyit İstendi
                  </option>

                  <option value="confirmed">
                    Teyitli
                  </option>

                </select>


                <select
                  value={
                    form.operationalStatus
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        operationalStatus:
                          event.target.value as
                            OperationalStatus,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-2 text-[7px]"
                >

                  <option value="pending">
                    Operasyon Bekliyor
                  </option>

                  <option value="ready">
                    Hazır
                  </option>

                  <option value="in_service">
                    Hizmette
                  </option>

                  <option value="completed">
                    Tamamlandı
                  </option>

                  <option value="issue">
                    Sorun Var
                  </option>

                </select>

              </div>


              <label className="space-y-1">

                <span className="text-[7px] font-black text-slate-600">
                  SON ÖDEME / CARİ VADESİ
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.paymentDueAt
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        paymentDueAt:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />

              </label>


              <select
                value={
                  form.operationExpenseId
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      operationExpenseId:
                        event.target.value,
                    })
                  )
                }
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[7px]"
              >

                <option value="">
                  Gerçek gider bağlantısı yok
                </option>

                {supplierExpenses.map(
                  expense => (
                    <option
                      key={
                        expense.id
                      }
                      value={
                        expense.id
                      }
                    >
                      {expense.description}
                      {" · "}
                      {formatTry(
                        expense.total_amount
                      )}
                    </option>
                  )
                )}

              </select>


              <input
                value={
                  form.confirmationReference
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      confirmationReference:
                        event.target.value,
                    })
                  )
                }
                placeholder="Teyit / rezervasyon kodu"
                className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              />


              <input
                value={
                  form.voucherReference
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      voucherReference:
                        event.target.value,
                    })
                  )
                }
                placeholder="Voucher referansı"
                className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              />


              <textarea
                rows={2}
                value={
                  form.supplierConfirmationNote
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      supplierConfirmationNote:
                        event.target.value,
                    })
                  )
                }
                placeholder="Tedarikçi teyit notu"
                className="rounded-xl border border-white/10 bg-[#030a11] p-3 text-[8px]"
              />


              <textarea
                rows={2}
                value={
                  form.internalNote
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      internalNote:
                        event.target.value,
                    })
                  )
                }
                placeholder="İç operasyon notu"
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
                Kaydet
              </button>

            </div>

          </form>


          <section className="space-y-5">

            <div className="rounded-[22px] border border-white/10 bg-[#07131f] p-4">

              <div className="relative">

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
                  placeholder="Tedarikçi, hizmet, voucher veya teyit kodu ara..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-9 pr-3 text-[8px]"
                />

              </div>

            </div>


            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

              <div className="border-b border-white/[.06] p-5">

                <div className="flex items-center gap-2 text-[9px] font-black">
                  <FaBuilding className="text-orange-300" />
                  Tur Tedarikçileri
                </div>

              </div>


              <div className="overflow-auto">

                <table className="min-w-[1500px] w-full">

                  <thead className="bg-[#081522]">

                    <tr className="text-left text-[7px] font-black uppercase text-slate-600">

                      <th className="px-4 py-4">
                        Tedarikçi
                      </th>

                      <th className="px-4 py-4">
                        Hizmet
                      </th>

                      <th className="px-4 py-4">
                        Sözleşme
                      </th>

                      <th className="px-4 py-4">
                        Teyit
                      </th>

                      <th className="px-4 py-4">
                        Operasyon
                      </th>

                      <th className="px-4 py-4">
                        Cari
                      </th>

                      <th className="px-4 py-4">
                        Vade
                      </th>

                      <th className="px-4 py-4">
                        Voucher / Teyit
                      </th>

                      <th className="px-4 py-4">
                        İletişim
                      </th>

                      <th className="px-4 py-4 text-right">
                        İşlem
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {visibleCommitments.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={10}
                          className="px-5 py-14 text-center text-[8px] text-slate-600"
                        >
                          Bu çıkış için tedarikçi operasyon kaydı yok.
                        </td>

                      </tr>

                    ) : (

                      visibleCommitments.map(
                        commitment => {

                          const supplier =
                            suppliers.find(
                              item =>
                                item.id ===
                                commitment.supplier_id
                            );


                          const linkedExpense =
                            expenses.find(
                              expense =>
                                expense.id ===
                                commitment.operation_expense_id
                            );


                          const remaining =
                            linkedExpense
                              ? Math.max(
                                  0,

                                  Number(
                                    linkedExpense.total_amount ??
                                    0
                                  ) -
                                  Number(
                                    linkedExpense.paid_amount ??
                                    0
                                  )
                                )
                              : null;


                          const overdue =
                            Boolean(
                              linkedExpense &&
                              remaining &&
                              remaining >
                                0 &&
                              isPastDue(
                                commitment.payment_due_at
                              )
                            );


                          return (
                            <tr
                              key={
                                commitment.id
                              }
                              className="border-t border-white/[.045] align-top"
                            >

                              <td className="px-4 py-4">

                                <div className="text-[8px] font-black">
                                  {supplier?.name ||
                                    "Tedarikçi"}
                                </div>

                                <div className="mt-1 text-[7px] text-slate-600">
                                  {supplier?.supplier_type ||
                                    "—"}
                                </div>

                              </td>


                              <td className="px-4 py-4">

                                <div className="text-[8px] font-black">
                                  {commitment.service_title}
                                </div>

                                <div className="mt-1 text-[7px] text-slate-600">
                                  {serviceLabels[
                                    commitment.service_type
                                  ]}
                                </div>

                              </td>


                              <td className="px-4 py-4 text-[8px] font-black">

                                {commitment.contract_amount !==
                                null
                                  ? formatAmount(
                                      commitment.contract_amount,
                                      commitment.currency
                                    )
                                  : "—"}

                              </td>


                              <td className="px-4 py-4">

                                <select
                                  value={
                                    commitment.confirmation_status
                                  }
                                  disabled={
                                    busy
                                  }
                                  onChange={event =>
                                    void updateConfirmation(
                                      commitment,

                                      event.target.value as
                                        ConfirmationStatus
                                    )
                                  }
                                  className="h-9 rounded-lg border border-white/10 bg-[#030a11] px-2 text-[7px]"
                                >

                                  {(
                                    Object.keys(
                                      confirmationLabels
                                    ) as
                                      ConfirmationStatus[]
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
                                        {confirmationLabels[
                                          status
                                        ]}
                                      </option>
                                    )
                                  )}

                                </select>

                              </td>


                              <td className="px-4 py-4">

                                <select
                                  value={
                                    commitment.operational_status
                                  }
                                  disabled={
                                    busy
                                  }
                                  onChange={event =>
                                    void updateOperation(
                                      commitment,

                                      event.target.value as
                                        OperationalStatus
                                    )
                                  }
                                  className="h-9 rounded-lg border border-white/10 bg-[#030a11] px-2 text-[7px]"
                                >

                                  <option value="pending">
                                    Bekliyor
                                  </option>

                                  <option value="ready">
                                    Hazır
                                  </option>

                                  <option value="in_service">
                                    Hizmette
                                  </option>

                                  <option value="completed">
                                    Tamamlandı
                                  </option>

                                  <option value="issue">
                                    Sorun
                                  </option>

                                  <option value="cancelled">
                                    İptal
                                  </option>

                                </select>

                              </td>


                              <td className="px-4 py-4">

                                {linkedExpense ? (

                                  <div>

                                    <div className="text-[8px] font-black">
                                      {formatTry(
                                        linkedExpense.total_amount
                                      )}
                                    </div>

                                    <div className="mt-1 text-[7px] text-emerald-300">
                                      Ödenen{" "}
                                      {formatTry(
                                        linkedExpense.paid_amount
                                      )}
                                    </div>

                                    <div
                                      className={`mt-1 text-[7px] font-black ${
                                        remaining &&
                                        remaining >
                                          0
                                          ? "text-orange-300"
                                          : "text-emerald-300"
                                      }`}
                                    >
                                      Kalan{" "}
                                      {formatTry(
                                        remaining ??
                                        0
                                      )}
                                    </div>

                                  </div>

                                ) : (

                                  <span className="text-[7px] text-slate-600">
                                    Gider bağlantısı yok
                                  </span>

                                )}

                              </td>


                              <td className="px-4 py-4">

                                <div
                                  className={`text-[7px] font-black ${
                                    overdue
                                      ? "text-red-300"
                                      : "text-slate-500"
                                  }`}
                                >

                                  {overdue && (
                                    <FaExclamationTriangle className="mr-1 inline" />
                                  )}

                                  {formatDate(
                                    commitment.payment_due_at
                                  )}

                                </div>

                              </td>


                              <td className="px-4 py-4">

                                <div className="text-[7px] font-black text-slate-300">
                                  {commitment.confirmation_reference ||
                                    "—"}
                                </div>

                                {commitment.voucher_reference && (

                                  <div className="mt-1 flex items-center gap-1 text-[7px] text-orange-300">
                                    <FaReceipt />
                                    {commitment.voucher_reference}
                                  </div>

                                )}

                              </td>


                              <td className="px-4 py-4">

                                <div className="flex gap-2">

                                  {supplier?.phone && (

                                    <a
                                      href={`tel:${supplier.phone}`}
                                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300"
                                    >
                                      <FaPhone />
                                    </a>

                                  )}


                                  {supplier?.whatsapp_phone && (

                                    <a
                                      href={`https://wa.me/${supplier.whatsapp_phone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 text-emerald-300"
                                    >
                                      <FaWhatsapp />
                                    </a>

                                  )}

                                </div>

                              </td>


                              <td className="px-4 py-4">

                                <div className="flex justify-end">

                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      void deleteCommitment(
                                        commitment
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


        <section className="mt-5 grid gap-4 xl:grid-cols-3">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black">
              <FaMoneyBillWave className="text-orange-300" />
              Gerçek Cari
            </div>


            <div className="mt-4 text-3xl font-black">
              {formatTry(
                payableTotal
              )}
            </div>


            <div className="mt-2 text-[7px] leading-5 text-slate-600">
              operation_expenses üzerindeki tedarikçi giderlerinden hesaplanır.
              Sözleşme tutarı cari borç kabul edilmez.
            </div>

          </article>


          <article className="rounded-[24px] border border-red-500/15 bg-red-500/[.04] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black text-red-300">
              <FaClock />
              Vadesi Geçen Bağlı Cari
            </div>


            <div className="mt-4 text-3xl font-black">
              {overduePaymentCount}
            </div>


            <div className="mt-2 text-[7px] text-slate-600">
              Gerçek gider bağlantısı bulunan ve açık bakiye taşıyan kayıtlar
            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black">
              <FaFileInvoiceDollar className="text-blue-300" />
              Sözleşme Tutarları
            </div>


            <div className="mt-4 space-y-2">

              {currencyTotals.length ===
              0 ? (

                <div className="text-[7px] text-slate-600">
                  Tutar girilmedi.
                </div>

              ) : (

                currencyTotals.map(
                  (
                    [
                      currency,
                      amount,
                    ]
                  ) => (
                    <div
                      key={
                        currency
                      }
                      className="flex items-center justify-between text-[8px]"
                    >

                      <span className="text-slate-500">
                        {currency}
                      </span>

                      <span className="font-black">
                        {formatAmount(
                          amount,
                          currency
                        )}
                      </span>

                    </div>
                  )
                )

              )}

            </div>


            <div className="mt-3 text-[7px] leading-5 text-slate-600">
              Farklı para birimleri birbirine çevrilmez veya TRY kabul edilmez.
            </div>

          </article>

        </section>

      </div>

    </main>
  );
}
