"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBolt,
  FaCheck,
  FaClock,
  FaEdit,
  FaEnvelope,
  FaPaperPlane,
  FaPause,
  FaPlay,
  FaPlus,
  FaSms,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaWhatsapp,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

import {
  createWhatsAppUrl,
  renderMessageTemplate,
} from "@/lib/crm/communications/template-renderer";

type Channel =
  | "whatsapp"
  | "email"
  | "sms";

type Template = {
  id: string;
  name: string;
  channel: Channel;
  category: string;
  language_code: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
};

type AutomationRule = {
  id: string;
  name: string;
  channel: Channel;
  trigger_type: string;
  template_id: string | null;
  timing_value: number;
  timing_unit: string;
  require_marketing_consent: boolean;
  require_channel_consent: boolean;
  is_active: boolean;
  created_at: string;
};

type OutboxMessage = {
  id: string;
  customer_id: string | null;
  channel: Channel;
  recipient: string;
  rendered_body: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  whatsapp_consent: boolean;
  email_consent: boolean;
  marketing_consent: boolean;
};

const triggerLabels: Record<
  string,
  string
> = {
  reservation_created:
    "Rezervasyon Oluşturulunca",

  before_check_in:
    "Check-in Öncesi",

  after_check_in:
    "Check-in Sonrası",

  before_check_out:
    "Check-out Öncesi",

  after_check_out:
    "Check-out Sonrası",

  payment_reminder:
    "Ödeme Hatırlatma",

  birthday:
    "Doğum Günü",

  anniversary:
    "Yıl Dönümü",

  manual:
    "Manuel",
};

const statusLabels: Record<
  string,
  string
> = {
  queued: "Kuyrukta",
  processing: "İşleniyor",
  sent: "Gönderildi",
  delivered: "Teslim Edildi",
  read: "Okundu",
  failed: "Başarısız",
  cancelled: "İptal",
};

function errorText(
  error: unknown
): string {
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
      ).message ??
        "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

function dateTime(
  value: string | null
): string {
  if (!value) return "—";

  return new Date(
    value
  ).toLocaleString(
    "tr-TR"
  );
}

export default function CrmAutomationCenterPage() {
  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    templates,
    setTemplates,
  ] =
    useState<Template[]>([]);

  const [rules, setRules] =
    useState<AutomationRule[]>([]);

  const [
    outbox,
    setOutbox,
  ] =
    useState<OutboxMessage[]>([]);

  const [
    customers,
    setCustomers,
  ] =
    useState<Customer[]>([]);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      "templates" |
      "rules" |
      "outbox"
    >("templates");

  const [
    showTemplateForm,
    setShowTemplateForm,
  ] = useState(false);

  const [
    editingTemplateId,
    setEditingTemplateId,
  ] = useState("");

  const [
    templateForm,
    setTemplateForm,
  ] = useState({
    name: "",
    channel:
      "whatsapp" as Channel,
    category:
      "general",
    language_code: "tr",
    subject: "",
    body: "",
  });

  const [
    showRuleForm,
    setShowRuleForm,
  ] = useState(false);

  const [
    ruleForm,
    setRuleForm,
  ] = useState({
    name: "",
    channel:
      "whatsapp" as Channel,
    trigger_type:
      "reservation_created",
    template_id: "",
    timing_value: "0",
    timing_unit: "hour",
    require_marketing_consent:
      false,
    require_channel_consent:
      true,
  });

  const [
    showManualSend,
    setShowManualSend,
  ] = useState(false);

  const [
    manualForm,
    setManualForm,
  ] = useState({
    customer_id: "",
    template_id: "",
    message: "",
  });

  const [loading, setLoading] =
    useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (
      companyId: string
    ) => {
      const [
        templateResult,
        ruleResult,
        outboxResult,
        customerResult,
      ] = await Promise.all([
        supabase
          .from(
            "crm_message_templates"
          )
          .select("*")
          .eq(
            "company_id",
            companyId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "crm_automation_rules"
          )
          .select("*")
          .eq(
            "company_id",
            companyId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "crm_message_outbox"
          )
          .select(`
            id,
            customer_id,
            channel,
            recipient,
            rendered_body,
            status,
            scheduled_at,
            sent_at,
            error_message,
            created_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(200),

        supabase
          .from(
            "crm_customers"
          )
          .select(`
            id,
            full_name,
            phone,
            whatsapp_phone,
            email,
            whatsapp_consent,
            email_consent,
            marketing_consent
          `)
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "full_name"
          ),
      ]);

      const error =
        templateResult.error ??
        ruleResult.error ??
        outboxResult.error ??
        customerResult.error;

      if (error) {
        throw error;
      }

      setTemplates(
        (templateResult.data ??
          []) as Template[]
      );

      setRules(
        (ruleResult.data ??
          []) as AutomationRule[]
      );

      setOutbox(
        (outboxResult.data ??
          []) as OutboxMessage[]
      );

      setCustomers(
        (customerResult.data ??
          []) as Customer[]
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          currentMembership
        );

        await supabase.rpc(
          "seed_crm_message_templates",
          {
            p_company_id:
              currentMembership.company_id,
          }
        );

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          errorText(error)
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  const stats = useMemo(
    () => ({
      templates:
        templates.filter(
          (item) =>
            item.is_active
        ).length,

      activeRules:
        rules.filter(
          (item) =>
            item.is_active
        ).length,

      queued:
        outbox.filter(
          (item) =>
            item.status ===
            "queued"
        ).length,

      sent:
        outbox.filter(
          (item) =>
            [
              "sent",
              "delivered",
              "read",
            ].includes(
              item.status
            )
        ).length,

      failed:
        outbox.filter(
          (item) =>
            item.status ===
            "failed"
        ).length,
    }),
    [
      templates,
      rules,
      outbox,
    ]
  );

  function resetTemplate() {
    setEditingTemplateId("");

    setTemplateForm({
      name: "",
      channel: "whatsapp",
      category: "general",
      language_code: "tr",
      subject: "",
      body: "",
    });
  }

  function editTemplate(
    item: Template
  ) {
    setEditingTemplateId(
      item.id
    );

    setTemplateForm({
      name: item.name,
      channel: item.channel,
      category:
        item.category,
      language_code:
        item.language_code,
      subject:
        item.subject ?? "",
      body: item.body,
    });

    setShowTemplateForm(true);
  }

  async function saveTemplate(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing
    ) {
      return;
    }

    if (
      !templateForm.name.trim() ||
      !templateForm.body.trim()
    ) {
      setErrorMessage(
        "Şablon adı ve mesaj metni zorunludur."
      );

      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const variables =
        Array.from(
          templateForm.body.matchAll(
            /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
          )
        ).map(
          (match) =>
            match[1]
        );

      const payload = {
        company_id:
          membership.company_id,

        name:
          templateForm.name.trim(),

        channel:
          templateForm.channel,

        category:
          templateForm.category,

        language_code:
          templateForm.language_code,

        subject:
          templateForm.subject.trim() ||
          null,

        body:
          templateForm.body.trim(),

        variables:
          Array.from(
            new Set(
              variables
            )
          ),

        updated_at:
          new Date().toISOString(),
      };

      if (
        editingTemplateId
      ) {
        const { error } =
          await supabase
            .from(
              "crm_message_templates"
            )
            .update(payload)
            .eq(
              "company_id",
              membership.company_id
            )
            .eq(
              "id",
              editingTemplateId
            );

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from(
              "crm_message_templates"
            )
            .insert({
              ...payload,

              created_by:
                user?.id ??
                null,
            });

        if (error) {
          throw error;
        }
      }

      resetTemplate();

      setShowTemplateForm(false);

      await refresh();

      setSuccessMessage(
        "Mesaj şablonu kaydedildi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function toggleTemplate(
    item: Template
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { error } =
        await supabase
          .from(
            "crm_message_templates"
          )
          .update({
            is_active:
              !item.is_active,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            item.id
          );

      if (error) {
        throw error;
      }

      await refresh();
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function deleteTemplate(
    item: Template
  ) {
    if (
      !membership ||
      !window.confirm(
        `"${item.name}" şablonu silinsin mi?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "crm_message_templates"
        )
        .delete()
        .eq(
          "company_id",
          membership.company_id
        )
        .eq(
          "id",
          item.id
        );

    if (error) {
      setErrorMessage(
        error.message
      );
      return;
    }

    await refresh();
  }

  async function saveRule(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing
    ) {
      return;
    }

    if (
      !ruleForm.name.trim() ||
      !ruleForm.template_id
    ) {
      setErrorMessage(
        "Kural adı ve şablon zorunludur."
      );

      return;
    }

    setProcessing(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const { error } =
        await supabase
          .from(
            "crm_automation_rules"
          )
          .insert({
            company_id:
              membership.company_id,

            name:
              ruleForm.name.trim(),

            channel:
              ruleForm.channel,

            trigger_type:
              ruleForm.trigger_type,

            template_id:
              ruleForm.template_id,

            timing_value:
              Number(
                ruleForm.timing_value
              ) || 0,

            timing_unit:
              ruleForm.timing_unit,

            require_marketing_consent:
              ruleForm.require_marketing_consent,

            require_channel_consent:
              ruleForm.require_channel_consent,

            created_by:
              user?.id ??
              null,
          });

      if (error) {
        throw error;
      }

      setRuleForm({
        name: "",
        channel: "whatsapp",
        trigger_type:
          "reservation_created",
        template_id: "",
        timing_value: "0",
        timing_unit: "hour",
        require_marketing_consent:
          false,
        require_channel_consent:
          true,
      });

      setShowRuleForm(false);

      await refresh();

      setSuccessMessage(
        "Otomasyon kuralı oluşturuldu."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function toggleRule(
    rule: AutomationRule
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { error } =
        await supabase
          .from(
            "crm_automation_rules"
          )
          .update({
            is_active:
              !rule.is_active,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            rule.id
          );

      if (error) {
        throw error;
      }

      await refresh();
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function deleteRule(
    rule: AutomationRule
  ) {
    if (
      !membership ||
      !window.confirm(
        `"${rule.name}" otomasyonu silinsin mi?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "crm_automation_rules"
        )
        .delete()
        .eq(
          "company_id",
          membership.company_id
        )
        .eq(
          "id",
          rule.id
        );

    if (error) {
      setErrorMessage(
        error.message
      );
      return;
    }

    await refresh();
  }

  function selectManualTemplate(
    templateId: string
  ) {
    const template =
      templates.find(
        (item) =>
          item.id ===
          templateId
      );

    setManualForm(
      (current) => ({
        ...current,
        template_id:
          templateId,

        message:
          template?.body ??
          "",
      })
    );
  }

  async function manualWhatsAppSend(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing
    ) {
      return;
    }

    const customer =
      customers.find(
        (item) =>
          item.id ===
          manualForm.customer_id
      );

    if (!customer) {
      setErrorMessage(
        "Müşteri seçmelisiniz."
      );
      return;
    }

    const recipient =
      customer.whatsapp_phone ||
      customer.phone;

    if (!recipient) {
      setErrorMessage(
        "Müşterinin WhatsApp veya telefon numarası bulunmuyor."
      );
      return;
    }

    if (
      !customer.whatsapp_consent
    ) {
      if (
        !window.confirm(
          "Bu müşterinin WhatsApp iletişim izni işaretli değil. Yine de manuel görüşme açılsın mı?"
        )
      ) {
        return;
      }
    }

    const rendered =
      renderMessageTemplate(
        manualForm.message,
        {
          customer_name:
            customer.full_name,

          reservation_no:
            "",

          check_in: "",

          check_out: "",

          balance: "",
        }
      );

    if (
      !rendered.trim()
    ) {
      setErrorMessage(
        "Mesaj boş olamaz."
      );
      return;
    }

    setProcessing(true);

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const {
        data: queueItem,
        error,
      } =
        await supabase
          .from(
            "crm_message_outbox"
          )
          .insert({
            company_id:
              membership.company_id,

            customer_id:
              customer.id,

            template_id:
              manualForm.template_id ||
              null,

            channel:
              "whatsapp",

            recipient,

            rendered_body:
              rendered,

            status:
              "queued",

            scheduled_at:
              new Date().toISOString(),

            created_by:
              user?.id ??
              null,
          })
          .select(
            "id"
          )
          .single();

      if (error) {
        throw error;
      }

      window.open(
        createWhatsAppUrl(
          recipient,
          rendered
        ),
        "_blank",
        "noopener,noreferrer"
      );

      if (queueItem) {
        await supabase
          .from(
            "crm_message_outbox"
          )
          .update({
            status:
              "sent",

            sent_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            queueItem.id
          );
      }

      await supabase
        .from(
          "crm_timeline"
        )
        .insert({
          company_id:
            membership.company_id,

          customer_id:
            customer.id,

          event_type:
            "whatsapp",

          title:
            "WhatsApp mesajı hazırlandı",

          description:
            rendered,

          created_by:
            user?.id ??
            null,
        });

      setShowManualSend(false);

      setManualForm({
        customer_id: "",
        template_id: "",
        message: "",
      });

      await refresh();

      setSuccessMessage(
        "WhatsApp görüşmesi açıldı ve işlem geçmişine kaydedildi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10">
        Otomasyon merkezi yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1900px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-400">
              TUROS COMMUNICATIONS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              WhatsApp & Otomasyon Merkezi
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Mesaj şablonlarını,
              otomasyon kurallarını,
              gönderim kuyruğunu ve
              müşteri iletişimlerini
              tek merkezden yönetin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void refresh()
              }
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaSyncAlt />
              Yenile
            </button>

            <button
              type="button"
              onClick={() =>
                setShowManualSend(
                  true
                )
              }
              className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-6 font-black"
            >
              <FaWhatsapp />
              WhatsApp Gönder
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            [
              "Aktif Şablon",
              stats.templates,
            ],
            [
              "Aktif Otomasyon",
              stats.activeRules,
            ],
            [
              "Kuyrukta",
              stats.queued,
            ],
            [
              "Gönderildi",
              stats.sent,
            ],
            [
              "Başarısız",
              stats.failed,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <article
                key={label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-xs text-slate-500">
                  {label}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {value}
                </p>
              </article>
            )
          )}
        </section>

        <section className="mt-7 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
          {[
            [
              "templates",
              `Şablonlar (${templates.length})`,
            ],
            [
              "rules",
              `Otomasyonlar (${rules.length})`,
            ],
            [
              "outbox",
              `Gönderim Geçmişi (${outbox.length})`,
            ],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setActiveTab(
                    value as
                      | "templates"
                      | "rules"
                      | "outbox"
                  )
                }
                className={`rounded-xl px-5 py-3 font-black ${
                  activeTab === value
                    ? "bg-orange-500"
                    : "text-slate-400"
                }`}
              >
                {label}
              </button>
            )
          )}
        </section>

        {activeTab ===
          "templates" && (
          <section className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  Mesaj Şablonları
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Dinamik değişkenler:
                  {" "}
                  {"{{customer_name}}"},
                  {" "}
                  {"{{reservation_no}}"},
                  {" "}
                  {"{{check_in}}"},
                  {" "}
                  {"{{check_out}}"},
                  {" "}
                  {"{{balance}}"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetTemplate();
                  setShowTemplateForm(
                    true
                  );
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black"
              >
                <FaPlus />
                Yeni Şablon
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {templates.map(
                (item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-400">
                          {item.channel.toUpperCase()}
                        </span>

                        <h3 className="mt-3 text-xl font-black">
                          {item.name}
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.is_active
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-slate-500/15 text-slate-500"
                        }`}
                      >
                        {item.is_active
                          ? "Aktif"
                          : "Pasif"}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                      {item.body}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          editTemplate(
                            item
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500"
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void toggleTemplate(
                            item
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400"
                      >
                        {item.is_active
                          ? <FaPause />
                          : <FaPlay />}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteTemplate(
                            item
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

        {activeTab ===
          "rules" && (
          <section className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  Otomasyon Kuralları
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Otomatik gönderimin ne
                  zaman ve hangi şablonla
                  yapılacağını belirler.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowRuleForm(
                    true
                  )
                }
                className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black"
              >
                <FaBolt />
                Otomasyon Ekle
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {rules.map(
                (rule) => {
                  const template =
                    templates.find(
                      (item) =>
                        item.id ===
                        rule.template_id
                    );

                  return (
                    <article
                      key={rule.id}
                      className="flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-slate-950 p-5 lg:flex-row lg:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-black text-violet-400">
                            {triggerLabels[
                              rule.trigger_type
                            ] ??
                              rule.trigger_type}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              rule.is_active
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-slate-500/15 text-slate-500"
                            }`}
                          >
                            {rule.is_active
                              ? "Aktif"
                              : "Pasif"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black">
                          {rule.name}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          Şablon:{" "}
                          {template?.name ??
                            "Şablon bulunamadı"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void toggleRule(
                              rule
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400"
                        >
                          {rule.is_active
                            ? <FaPause />
                            : <FaPlay />}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteRule(
                              rule
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </article>
                  );
                }
              )}

              {rules.length ===
                0 && (
                <p className="p-10 text-center text-slate-500">
                  Henüz otomasyon kuralı yok.
                </p>
              )}
            </div>
          </section>
        )}

        {activeTab ===
          "outbox" && (
          <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-slate-950 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-4">
                      Kanal
                    </th>
                    <th className="p-4">
                      Alıcı
                    </th>
                    <th className="p-4">
                      Mesaj
                    </th>
                    <th className="p-4">
                      Durum
                    </th>
                    <th className="p-4">
                      Planlanan
                    </th>
                    <th className="p-4">
                      Gönderim
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {outbox.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-t border-white/10"
                      >
                        <td className="p-4">
                          <FaWhatsapp className="text-emerald-400" />
                        </td>

                        <td className="p-4 font-black">
                          {item.recipient}
                        </td>

                        <td className="max-w-xl p-4 text-sm text-slate-400">
                          {item.rendered_body}
                        </td>

                        <td className="p-4">
                          <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-400">
                            {statusLabels[
                              item.status
                            ] ??
                              item.status}
                          </span>
                        </td>

                        <td className="p-4 text-sm">
                          {dateTime(
                            item.scheduled_at
                          )}
                        </td>

                        <td className="p-4 text-sm">
                          {dateTime(
                            item.sent_at
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
      </div>

      {showTemplateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <form
            onSubmit={saveTemplate}
            className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-slate-950 p-7"
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-black">
                {editingTemplateId
                  ? "Şablonu Düzenle"
                  : "Yeni Mesaj Şablonu"}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowTemplateForm(
                    false
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                required
                value={
                  templateForm.name
                }
                onChange={(event) =>
                  setTemplateForm(
                    (current) => ({
                      ...current,
                      name:
                        event.target.value,
                    })
                  )
                }
                placeholder="Şablon adı"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              />

              <select
                value={
                  templateForm.category
                }
                onChange={(event) =>
                  setTemplateForm(
                    (current) => ({
                      ...current,
                      category:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="general">Genel</option>
                <option value="reservation">Rezervasyon</option>
                <option value="pre_arrival">Giriş Öncesi</option>
                <option value="check_in">Check-in</option>
                <option value="check_out">Check-out</option>
                <option value="payment">Ödeme</option>
                <option value="birthday">Doğum Günü</option>
                <option value="anniversary">Yıl Dönümü</option>
                <option value="campaign">Kampanya</option>
              </select>

              <textarea
                required
                rows={8}
                value={
                  templateForm.body
                }
                onChange={(event) =>
                  setTemplateForm(
                    (current) => ({
                      ...current,
                      body:
                        event.target.value,
                    })
                  )
                }
                placeholder="Merhaba {{customer_name}}..."
                className="rounded-xl bg-white p-4 font-bold text-slate-950 md:col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
            >
              <FaCheck />
              Şablonu Kaydet
            </button>
          </form>
        </div>
      )}

      {showRuleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <form
            onSubmit={saveRule}
            className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-slate-950 p-7"
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-black">
                Yeni Otomasyon Kuralı
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowRuleForm(
                    false
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                required
                value={
                  ruleForm.name
                }
                onChange={(event) =>
                  setRuleForm(
                    (current) => ({
                      ...current,
                      name:
                        event.target.value,
                    })
                  )
                }
                placeholder="Örn: Check-in 24 saat önce"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950 md:col-span-2"
              />

              <select
                value={
                  ruleForm.trigger_type
                }
                onChange={(event) =>
                  setRuleForm(
                    (current) => ({
                      ...current,
                      trigger_type:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  triggerLabels
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <select
                required
                value={
                  ruleForm.template_id
                }
                onChange={(event) =>
                  setRuleForm(
                    (current) => ({
                      ...current,
                      template_id:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Şablon seç
                </option>

                {templates
                  .filter(
                    (item) =>
                      item.is_active
                  )
                  .map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    )
                  )}
              </select>

              <input
                type="number"
                value={
                  ruleForm.timing_value
                }
                onChange={(event) =>
                  setRuleForm(
                    (current) => ({
                      ...current,
                      timing_value:
                        event.target.value,
                    })
                  )
                }
                placeholder="Süre"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              />

              <select
                value={
                  ruleForm.timing_unit
                }
                onChange={(event) =>
                  setRuleForm(
                    (current) => ({
                      ...current,
                      timing_unit:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="minute">Dakika</option>
                <option value="hour">Saat</option>
                <option value="day">Gün</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="mt-6 min-h-12 w-full rounded-xl bg-orange-500 font-black"
            >
              Otomasyonu Kaydet
            </button>
          </form>
        </div>
      )}

      {showManualSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <form
            onSubmit={manualWhatsAppSend}
            className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-slate-950 p-7"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-black text-emerald-400">
                  WHATSAPP
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Müşteriye Mesaj Gönder
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowManualSend(
                    false
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <select
                required
                value={
                  manualForm.customer_id
                }
                onChange={(event) =>
                  setManualForm(
                    (current) => ({
                      ...current,
                      customer_id:
                        event.target.value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Müşteri seç
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.full_name}
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  manualForm.template_id
                }
                onChange={(event) =>
                  selectManualTemplate(
                    event.target.value
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Şablon seç
                </option>

                {templates
                  .filter(
                    (item) =>
                      item.channel ===
                        "whatsapp" &&
                      item.is_active
                  )
                  .map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    )
                  )}
              </select>

              <textarea
                required
                rows={8}
                value={
                  manualForm.message
                }
                onChange={(event) =>
                  setManualForm(
                    (current) => ({
                      ...current,
                      message:
                        event.target.value,
                    })
                  )
                }
                className="w-full rounded-xl bg-white p-4 font-bold text-slate-950"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black"
            >
              <FaPaperPlane />
              WhatsApp'ı Aç ve Kaydet
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
