"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaLink,
  FaMoneyBillWave,
  FaSave,
  FaTasks,
  FaTimesCircle,
  FaUserCheck,
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


type Incident = {
  id: string;

  company_id: string;

  tour_id: string;

  departure_id:
    string | null;

  reservation_id:
    string | null;

  supplier_commitment_id:
    string | null;

  operation_task_id:
    string | null;

  linked_change_case_id:
    string | null;

  incident_number: string;

  incident_type: string;

  severity: string;

  status: string;

  source: string;

  title: string;

  description:
    string | null;

  customer_impact:
    string | null;

  operational_impact:
    string | null;

  resolution:
    string | null;

  root_cause:
    string | null;

  responsible_user_id:
    string | null;

  assigned_at:
    string | null;

  sla_due_at:
    string | null;

  estimated_loss_amount: number;

  actual_loss_amount: number;

  customer_compensation_amount: number;

  supplier_recoverable_amount: number;

  supplier_recovery_status: string;

  compensation_status: string;

  requires_customer_action: boolean;

  requires_supplier_action: boolean;

  requires_finance_action: boolean;

  requires_management_approval: boolean;

  closure_note:
    string | null;

  created_at: string;
};


type IncidentEvent = {
  id: string;

  event_type: string;

  note:
    string | null;

  payload:
    Record<
      string,
      unknown
    >;

  created_at: string;
};


type SupplierCommitment = {
  id: string;

  departure_id:
    string | null;

  supplier_id: string;

  service_title: string;

  confirmation_status: string;

  operational_status: string;
};


type OperationTask = {
  id: string;

  title: string;

  status: string;

  priority: string;

  due_at:
    string | null;
};


type ChangeCase = {
  id: string;

  case_number: string;

  case_type: string;

  status: string;

  departure_id:
    string | null;

  reservation_id:
    string | null;
};


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
        2,
    }
  ).format(
    Number(
      value ||
      0
    )
  );
}


function dateLabel(
  value:
    string | null
) {

  if (
    !value
  ) {
    return "—";
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
    new Date(
      value
    )
  );
}


export default function IncidentDetailPage() {

  const params =
    useParams<{
      id: string;
      incidentId: string;
    }>();


  const tourId =
    String(
      params.id
    );


  const incidentId =
    String(
      params.incidentId
    );


  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    incident,
    setIncident,
  ] =
    useState<Incident | null>(
      null
    );


  const [
    events,
    setEvents,
  ] =
    useState<IncidentEvent[]>(
      []
    );


  const [
    suppliers,
    setSuppliers,
  ] =
    useState<SupplierCommitment[]>(
      []
    );


  const [
    task,
    setTask,
  ] =
    useState<OperationTask | null>(
      null
    );


  const [
    changeCases,
    setChangeCases,
  ] =
    useState<ChangeCase[]>(
      []
    );


  const [
    status,
    setStatus,
  ] =
    useState("open");


  const [
    severity,
    setSeverity,
  ] =
    useState("medium");


  const [
    actualLoss,
    setActualLoss,
  ] =
    useState("0");


  const [
    compensation,
    setCompensation,
  ] =
    useState("0");


  const [
    supplierRecovery,
    setSupplierRecovery,
  ] =
    useState("0");


  const [
    compensationStatus,
    setCompensationStatus,
  ] =
    useState(
      "not_required"
    );


  const [
    supplierRecoveryStatus,
    setSupplierRecoveryStatus,
  ] =
    useState(
      "not_required"
    );


  const [
    resolution,
    setResolution,
  ] =
    useState("");


  const [
    rootCause,
    setRootCause,
  ] =
    useState("");


  const [
    note,
    setNote,
  ] =
    useState("");


  const [
    selectedSupplierId,
    setSelectedSupplierId,
  ] =
    useState("");


  const [
    taskTitle,
    setTaskTitle,
  ] =
    useState("");


  const [
    taskDue,
    setTaskDue,
  ] =
    useState("");


  const [
    selectedChangeCaseId,
    setSelectedChangeCaseId,
  ] =
    useState("");


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


  const load =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {

        const {
          data:
            incidentData,

          error:
            incidentError,
        } =
          await supabase
            .from(
              "tour_operation_incidents"
            )
            .select(
              "*"
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
              "id",
              incidentId
            )
            .maybeSingle();


        if (
          incidentError
        ) {
          throw incidentError;
        }


        if (
          !incidentData
        ) {
          throw new Error(
            "Operasyon vakası bulunamadı."
          );
        }


        const loaded =
          incidentData as unknown as
            Incident;


        const [
          eventResult,
          supplierResult,
          changeCaseResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_operation_incident_events"
              )
              .select(
                "id,event_type,note,payload,created_at"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "incident_id",
                incidentId
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
                "tour_supplier_commitments"
              )
              .select(
                "id,departure_id,supplier_id,service_title,confirmation_status,operational_status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
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
                "tour_change_cases"
              )
              .select(
                "id,case_number,case_type,status,departure_id,reservation_id"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
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
          [
            eventResult.error,
            supplierResult.error,
            changeCaseResult.error,
          ].find(
            Boolean
          );


        if (
          firstError
        ) {
          throw firstError;
        }


        let taskData:
          OperationTask | null =
            null;


        if (
          loaded.operation_task_id
        ) {

          const {
            data,
            error:
              taskError,
          } =
            await supabase
              .from(
                "tour_operation_tasks"
              )
              .select(
                "id,title,status,priority,due_at"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "id",
                loaded.operation_task_id
              )
              .maybeSingle();


          if (
            taskError
          ) {
            throw taskError;
          }


          taskData =
            data as
              OperationTask | null;
        }


        setIncident(
          loaded
        );


        setEvents(
          (
            eventResult.data ??
            []
          ) as unknown as
            IncidentEvent[]
        );


        const supplierRows =
          (
            supplierResult.data ??
            []
          ) as unknown as
            SupplierCommitment[];


        const scopedSuppliers =
          loaded.departure_id
            ? supplierRows.filter(
                item =>
                  !item.departure_id ||
                  item.departure_id ===
                    loaded.departure_id
              )
            : supplierRows;


        setSuppliers(
          scopedSuppliers
        );


        setChangeCases(
          (
            changeCaseResult.data ??
            []
          ) as unknown as
            ChangeCase[]
        );


        setTask(
          taskData
        );


        setStatus(
          loaded.status
        );


        setSeverity(
          loaded.severity
        );


        setActualLoss(
          String(
            loaded.actual_loss_amount ??
            0
          )
        );


        setCompensation(
          String(
            loaded.customer_compensation_amount ??
            0
          )
        );


        setSupplierRecovery(
          String(
            loaded.supplier_recoverable_amount ??
            0
          )
        );


        setCompensationStatus(
          loaded.compensation_status ??
          "not_required"
        );


        setSupplierRecoveryStatus(
          loaded.supplier_recovery_status ??
          "not_required"
        );


        setResolution(
          loaded.resolution ??
          ""
        );


        setRootCause(
          loaded.root_cause ??
          ""
        );


        setSelectedSupplierId(
          loaded.supplier_commitment_id ??
          ""
        );


        setSelectedChangeCaseId(
          loaded.linked_change_case_id ??
          ""
        );

      },
      [
        incidentId,
        tourId,
      ]
    );


  useEffect(() => {

    void (
      async () => {

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


          setCompanyId(
            membership.company_id
          );


          await load(
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
    )();

  }, [
    load,
  ]);


  const slaOverdue =
    Boolean(
      incident?.sla_due_at
    ) &&
    new Date(
      String(
        incident?.sla_due_at
      )
    ).getTime() <
      Date.now() &&
    ![
      "resolved",
      "closed",
      "cancelled",
    ].includes(
      incident?.status ??
      ""
    );


  const linkedChangeCase =
    useMemo(
      () =>
        changeCases.find(
          item =>
            item.id ===
            incident
              ?.linked_change_case_id
        ) ??
        null,
      [
        changeCases,
        incident,
      ]
    );


  async function runRpc(
    fn:
      string,
    args:
      Record<
        string,
        unknown
      >,
    success:
      string
  ) {

    if (
      !companyId
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
          rpcError,
      } =
        await supabase.rpc(
          fn,
          args
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId
      );


      setNotice(
        success
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


  async function assignToMe() {

    await runRpc(
      "assign_tour_incident_to_me",
      {
        p_incident_id:
          incidentId,
      },
      "Vaka tarafınıza atandı."
    );
  }


  async function saveState() {

    await runRpc(
      "update_tour_operation_incident",
      {
        p_incident_id:
          incidentId,

        p_status:
          status,

        p_severity:
          severity,

        p_responsible_user_id:
          null,

        p_resolution:
          null,

        p_root_cause:
          null,

        p_actual_loss_amount:
          null,

        p_customer_compensation_amount:
          null,

        p_supplier_recoverable_amount:
          null,

        p_note:
          note.trim() ||
          null,
      },
      "Vaka durumu güncellendi."
    );
  }


  async function saveFinance() {

    await runRpc(
      "update_tour_incident_finance_resolution",
      {
        p_incident_id:
          incidentId,

        p_actual_loss_amount:
          Math.max(
            Number(
              actualLoss
            ) ||
            0,
            0
          ),

        p_customer_compensation_amount:
          Math.max(
            Number(
              compensation
            ) ||
            0,
            0
          ),

        p_supplier_recoverable_amount:
          Math.max(
            Number(
              supplierRecovery
            ) ||
            0,
            0
          ),

        p_compensation_status:
          compensationStatus,

        p_supplier_recovery_status:
          supplierRecoveryStatus,

        p_note:
          note.trim() ||
          null,
      },
      "Finansal etki güncellendi."
    );
  }


  async function linkSupplier() {

    if (
      !selectedSupplierId
    ) {
      return;
    }


    await runRpc(
      "link_tour_incident_supplier",
      {
        p_incident_id:
          incidentId,

        p_supplier_commitment_id:
          selectedSupplierId,
      },
      "Tedarikçi taahhüdü bağlandı."
    );
  }


  async function createTask() {

    if (
      !taskTitle.trim()
    ) {

      setError(
        "Görev başlığı zorunlu."
      );

      return;
    }


    await runRpc(
      "create_tour_incident_task",
      {
        p_incident_id:
          incidentId,

        p_title:
          taskTitle.trim(),

        p_due_at:
          taskDue
            ? new Date(
                taskDue
              ).toISOString()
            : null,
      },
      "Operasyon aksiyon görevi oluşturuldu."
    );


    setTaskTitle(
      ""
    );

    setTaskDue(
      ""
    );
  }


  async function linkChangeCase() {

    if (
      !selectedChangeCaseId
    ) {
      return;
    }


    await runRpc(
      "link_tour_incident_change_case",
      {
        p_incident_id:
          incidentId,

        p_change_case_id:
          selectedChangeCaseId,
      },
      "İptal / iade vakası bağlandı."
    );
  }


  async function finalize(
    close:
      boolean
  ) {

    if (
      !resolution.trim()
    ) {

      setError(
        "Çözüm yazılmadan vaka kapatılamaz."
      );

      return;
    }


    if (
      !window.confirm(
        close
          ? "Vakayı tamamen kapatmak istiyor musunuz?"
          : "Vakayı çözüldü olarak işaretlemek istiyor musunuz?"
      )
    ) {
      return;
    }


    await runRpc(
      "finalize_tour_operation_incident",
      {
        p_incident_id:
          incidentId,

        p_resolution:
          resolution.trim(),

        p_root_cause:
          rootCause.trim() ||
          null,

        p_close:
          close,

        p_closure_note:
          note.trim() ||
          null,
      },
      close
        ? "Operasyon vakası kapatıldı."
        : "Operasyon vakası çözüldü."
    );
  }


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Operasyon vakası yükleniyor...
      </main>
    );
  }


  if (
    !incident
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        {error ||
          "Vaka bulunamadı."}
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="incident-detail"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1750px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}/hatalar`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Operasyon Hata Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-red-500/15 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.13),transparent_34%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="text-[8px] font-black uppercase tracking-[.16em] text-red-300">
                {incident.incident_number}
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
                {incident.title}
              </h1>

              <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-bold text-slate-400">

                <span>
                  {incident.incident_type}
                </span>

                <span>·</span>

                <span>
                  {incident.severity}
                </span>

                <span>·</span>

                <span>
                  {incident.status}
                </span>

              </div>

            </div>


            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () =>
                  void assignToMe()
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-[8px] font-black text-white disabled:opacity-50"
            >
              <FaUserCheck />
              Kendime Ata
            </button>

          </div>

        </section>


        {error && (

          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] font-bold text-red-300">

            <FaTimesCircle className="mr-2 inline" />
            {error}

          </div>
        )}


        {notice && (

          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] font-bold text-emerald-300">

            <FaCheckCircle className="mr-2 inline" />
            {notice}

          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

          <article className="rounded-[20px] border border-white/10 bg-[#07131f] p-4">

            <div className="text-[7px] font-black uppercase text-slate-500">
              Durum
            </div>

            <div className="mt-2 text-lg font-black">
              {incident.status}
            </div>

          </article>


          <article className="rounded-[20px] border border-white/10 bg-[#07131f] p-4">

            <div className="text-[7px] font-black uppercase text-slate-500">
              SLA
            </div>

            <div
              className={`mt-2 text-sm font-black ${
                slaOverdue
                  ? "text-red-300"
                  : ""
              }`}
            >
              {dateLabel(
                incident.sla_due_at
              )}
            </div>

          </article>


          <article className="rounded-[20px] border border-white/10 bg-[#07131f] p-4">

            <div className="text-[7px] font-black uppercase text-slate-500">
              Tahmini Zarar
            </div>

            <div className="mt-2 text-lg font-black text-amber-300">
              {money(
                incident.estimated_loss_amount
              )}
            </div>

          </article>


          <article className="rounded-[20px] border border-white/10 bg-[#07131f] p-4">

            <div className="text-[7px] font-black uppercase text-slate-500">
              Gerçek Zarar
            </div>

            <div className="mt-2 text-lg font-black text-red-300">
              {money(
                incident.actual_loss_amount
              )}
            </div>

          </article>


          <article className="rounded-[20px] border border-white/10 bg-[#07131f] p-4">

            <div className="text-[7px] font-black uppercase text-slate-500">
              Sorumlu
            </div>

            <div className="mt-2 truncate text-[9px] font-black">
              {incident.responsible_user_id
                ? incident.responsible_user_id.slice(
                    0,
                    8
                  )
                : "Atanmadı"}
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

            <h2 className="text-sm font-black">
              Vaka Yönetimi
            </h2>


            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Durum
                </span>

                <select
                  value={
                    status
                  }
                  onChange={
                    event =>
                      setStatus(
                        event.target.value
                      )
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
                >

                  {[
                    "open",
                    "investigating",
                    "action_required",
                    "waiting_supplier",
                    "waiting_customer",
                    "resolved",
                    "closed",
                    "cancelled",
                  ].map(
                    item => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}

                </select>

              </label>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Önem
                </span>

                <select
                  value={
                    severity
                  }
                  onChange={
                    event =>
                      setSeverity(
                        event.target.value
                      )
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
                >

                  {[
                    "low",
                    "medium",
                    "high",
                    "critical",
                  ].map(
                    item => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}

                </select>

              </label>

            </div>


            <textarea
              value={
                note
              }
              onChange={
                event =>
                  setNote(
                    event.target.value
                  )
              }
              rows={3}
              placeholder="Operasyon notu..."
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px]"
            />


            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () =>
                  void saveState()
              }
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-700 px-4 text-[8px] font-black"
            >
              <FaSave />
              Durumu Kaydet
            </button>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaTasks className="text-orange-300" />
              Operasyon Görevi
            </div>


            {task ? (

              <div className="mt-4 rounded-xl border border-white/10 bg-[#030a11]/70 p-4">

                <div className="text-[9px] font-black">
                  {task.title}
                </div>

                <div className="mt-2 text-[8px] text-slate-500">
                  {task.status}
                  {" · "}
                  {task.priority}
                  {" · "}
                  {dateLabel(
                    task.due_at
                  )}
                </div>


                <Link
                  href={`/dashboard/turlar/${tourId}/gorevler`}
                  className="mt-3 inline-block text-[8px] font-black text-orange-300"
                >
                  Görev Merkezini Aç
                </Link>

              </div>

            ) : (

              <>

                <input
                  value={
                    taskTitle
                  }
                  onChange={
                    event =>
                      setTaskTitle(
                        event.target.value
                      )
                  }
                  placeholder="Aksiyon görevi..."
                  className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
                />


                <input
                  type="datetime-local"
                  value={
                    taskDue
                  }
                  onChange={
                    event =>
                      setTaskDue(
                        event.target.value
                      )
                  }
                  className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
                />


                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={
                    () =>
                      void createTask()
                  }
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
                >
                  <FaTasks />
                  Görev Oluştur
                </button>

              </>
            )}

          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

            <div className="text-sm font-black">
              Tedarikçi Sorumluluğu
            </div>


            <select
              value={
                selectedSupplierId
              }
              onChange={
                event =>
                  setSelectedSupplierId(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >

              <option value="">
                Tedarikçi taahhüdü seç
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
                    {supplier.service_title}
                    {" · "}
                    {supplier.operational_status}
                  </option>
                )
              )}

            </select>


            <button
              type="button"
              disabled={
                busy ||
                !selectedSupplierId
              }
              onClick={
                () =>
                  void linkSupplier()
              }
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-500 px-4 text-[8px] font-black disabled:opacity-40"
            >
              <FaLink />
              Tedarikçiyi Bağla
            </button>


            <Link
              href={`/dashboard/turlar/${tourId}/tedarikciler`}
              className="ml-3 text-[8px] font-black text-blue-300"
            >
              Tedarikçi Merkezi
            </Link>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

            <div className="text-sm font-black">
              İptal / İade Bağlantısı
            </div>


            <select
              value={
                selectedChangeCaseId
              }
              onChange={
                event =>
                  setSelectedChangeCaseId(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >

              <option value="">
                Vaka seç
              </option>

              {changeCases.map(
                item => (

                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.case_number}
                    {" · "}
                    {item.case_type}
                    {" · "}
                    {item.status}
                  </option>
                )
              )}

            </select>


            <button
              type="button"
              disabled={
                busy ||
                !selectedChangeCaseId
              }
              onClick={
                () =>
                  void linkChangeCase()
              }
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-500 px-4 text-[8px] font-black disabled:opacity-40"
            >
              <FaLink />
              Vakayı Bağla
            </button>


            {linkedChangeCase && (

              <Link
                href={`/dashboard/turlar/${tourId}/degisiklikler/${linkedChangeCase.id}`}
                className="ml-3 text-[8px] font-black text-purple-300"
              >
                Bağlı Vakayı Aç
              </Link>
            )}


            {!linkedChangeCase && (

              <Link
                href={`/dashboard/turlar/${tourId}/degisiklikler`}
                className="ml-3 text-[8px] font-black text-purple-300"
              >
                Yeni Vaka Aç
              </Link>
            )}

          </article>

        </section>


        <section className="mt-5 rounded-[24px] border border-amber-500/15 bg-[#07131f]/80 p-5">

          <div className="flex items-center gap-2 text-sm font-black">
            <FaMoneyBillWave className="text-amber-300" />
            Finansal Etki & Tazmin
          </div>


          <div className="mt-4 grid gap-3 md:grid-cols-3">

            <label className="grid gap-1.5">

              <span className="text-[8px] font-black text-slate-400">
                Gerçek Zarar
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  actualLoss
                }
                onChange={
                  event =>
                    setActualLoss(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </label>


            <label className="grid gap-1.5">

              <span className="text-[8px] font-black text-slate-400">
                Müşteri Tazmini
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  compensation
                }
                onChange={
                  event =>
                    setCompensation(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </label>


            <label className="grid gap-1.5">

              <span className="text-[8px] font-black text-slate-400">
                Tedarikçiden Tahsil
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  supplierRecovery
                }
                onChange={
                  event =>
                    setSupplierRecovery(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </label>

          </div>


          <div className="mt-3 grid gap-3 md:grid-cols-2">

            <label className="grid gap-1.5">

              <span className="text-[8px] font-black text-slate-400">
                Müşteri Tazmin Durumu
              </span>

              <select
                value={
                  compensationStatus
                }
                onChange={
                  event =>
                    setCompensationStatus(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              >

                {[
                  "not_required",
                  "pending",
                  "linked",
                  "completed",
                  "waived",
                ].map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>


            <label className="grid gap-1.5">

              <span className="text-[8px] font-black text-slate-400">
                Tedarikçi Tahsil Durumu
              </span>

              <select
                value={
                  supplierRecoveryStatus
                }
                onChange={
                  event =>
                    setSupplierRecoveryStatus(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              >

                {[
                  "not_required",
                  "pending",
                  "claimed",
                  "recovered",
                  "waived",
                ].map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>

          </div>


          <button
            type="button"
            disabled={
              busy
            }
            onClick={
              () =>
                void saveFinance()
            }
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-[8px] font-black text-black"
          >
            <FaSave />
            Finans Etkisini Kaydet
          </button>

        </section>


        <section className="mt-5 rounded-[24px] border border-emerald-500/15 bg-[#07131f]/80 p-5">

          <div className="text-sm font-black">
            Çözüm & Kök Neden
          </div>


          <textarea
            value={
              resolution
            }
            onChange={
              event =>
                setResolution(
                  event.target.value
                )
            }
            rows={4}
            placeholder="Sorun nasıl çözüldü?"
            className="mt-4 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px]"
          />


          <textarea
            value={
              rootCause
            }
            onChange={
              event =>
                setRootCause(
                  event.target.value
                )
            }
            rows={3}
            placeholder="Kök neden nedir?"
            className="mt-3 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px]"
          />


          <div className="mt-4 flex flex-wrap gap-3">

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () =>
                  void finalize(
                    false
                  )
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-[8px] font-black"
            >
              <FaCheckCircle />
              Çözüldü
            </button>


            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () =>
                  void finalize(
                    true
                  )
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-[8px] font-black text-black"
            >
              <FaCheckCircle />
              Vakayı Tamamen Kapat
            </button>

          </div>


          <div className="mt-4 rounded-xl border border-white/[.07] bg-[#030a11]/60 p-4 text-[8px] leading-5 text-slate-500">

            Tam kapanış için çözüm zorunludur. Müşteri tazmini varsa tazmin süreci tamamlanmış veya waive edilmiş; tedarikçi tahsilatı varsa recover/waive edilmiş; bağlı görev varsa görev tamamlanmış veya iptal edilmiş olmalıdır.

          </div>

        </section>


        <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[.02] p-5">

          <div className="text-sm font-black">
            Immutable Operasyon Timeline
          </div>


          <div className="mt-4 space-y-2">

            {events.map(
              event => (

                <div
                  key={
                    event.id
                  }
                  className="flex flex-col gap-2 rounded-xl border border-white/[.07] bg-[#030a11]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div>

                    <div className="text-[8px] font-black text-slate-300">
                      {event.event_type}
                    </div>

                    <div className="mt-1 text-[8px] text-slate-500">
                      {event.note ||
                        "Operasyon hareketi"}
                    </div>

                  </div>


                  <div className="text-[7px] font-bold text-slate-600">
                    {dateLabel(
                      event.created_at
                    )}
                  </div>

                </div>
              )
            )}

          </div>

        </section>

      </div>

    </main>
  );
}
