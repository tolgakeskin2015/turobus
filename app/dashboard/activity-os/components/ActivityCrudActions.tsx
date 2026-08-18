"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  FaEdit,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Kind =
  | "activity"
  | "slot"
  | "booking";


export default function ActivityCrudActions({
  kind,
  companyId,
  record,
}: {
  kind: Kind;
  companyId: string;
  record: any;
}) {

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState<any>({});

  const [
    slotOptions,
    setSlotOptions,
  ] =
    useState<any[]>([]);


  useEffect(
    () => {
      setForm({
        ...record,

        default_sale_price:
          record.default_sale_price ??
          "",

        default_cost:
          record.default_cost ??
          "",

        duration_minutes:
          record.duration_minutes ??
          "",

        capacity:
          record.capacity ??
          1,

        sale_price:
          record.sale_price ??
          "",

        quantity:
          record.quantity ??
          1,

        sale_total:
          record.sale_total ??
          0,

        paid_total:
          record.paid_total ??
          0,
      });
    },
    [
      record,
    ]
  );


  useEffect(
    () => {

      if (
        !open ||
        kind !== "booking" ||
        !companyId ||
        !record.activity_id
      ) {
        return;
      }


      async function loadSlots() {

        const {
          data,
        } =
          await supabase
            .from(
              "package_activity_slots"
            )
            .select(
              "id,slot_date,start_time,capacity,reserved_count,status"
            )
            .eq(
              "company_id",
              companyId
            )
            .eq(
              "activity_id",
              record.activity_id
            )
            .order(
              "slot_date"
            )
            .order(
              "start_time"
            );


        setSlotOptions(
          data ??
          []
        );

      }


      void loadSlots();

    },
    [
      open,
      kind,
      companyId,
      record.activity_id,
    ]
  );


  function change(
    key: string,
    value: any
  ) {

    setForm(
      (
        current: any
      ) => ({
        ...current,
        [key]:
          value,
      })
    );

  }


  async function save() {

    setSaving(
      true
    );

    setError("");


    try {

      if (
        kind ===
        "activity"
      ) {

        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "package_activities"
            )
            .update({
              name:
                form.name,

              category:
                form.category,

              city:
                form.city ||
                null,

              district:
                form.district ||
                null,

              short_description:
                form.short_description ||
                null,

              description:
                form.description ||
                null,

              meeting_point:
                form.meeting_point ||
                null,

              default_sale_price:
                Number(
                  form.default_sale_price ||
                  0
                ),

              default_cost:
                Number(
                  form.default_cost ||
                  0
                ),

              duration_minutes:
                form.duration_minutes
                  ? Number(
                      form.duration_minutes
                    )
                  : null,

              min_age:
                form.min_age
                  ? Number(
                      form.min_age
                    )
                  : null,

              max_age:
                form.max_age
                  ? Number(
                      form.max_age
                    )
                  : null,

              min_weight:
                form.min_weight
                  ? Number(
                      form.min_weight
                    )
                  : null,

              max_weight:
                form.max_weight
                  ? Number(
                      form.max_weight
                    )
                  : null,

              difficulty_level:
                form.difficulty_level ||
                null,

              cancellation_policy:
                form.cancellation_policy ||
                null,

              preparation_notes:
                form.preparation_notes ||
                null,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              record.id
            )
            .eq(
              "company_id",
              companyId
            );


        if (
          updateError
        ) {
          throw updateError;
        }

      }


      if (
        kind ===
        "slot"
      ) {

        const {
          error:
            updateError,
        } =
          await supabase.rpc(
            "activity_os_update_slot",
            {
              p_company_id:
                companyId,

              p_slot_id:
                record.id,

              p_slot_date:
                form.slot_date,

              p_start_time:
                form.start_time,

              p_end_time:
                form.end_time ||
                null,

              p_capacity:
                Number(
                  form.capacity ||
                  1
                ),

              p_sale_price:
                Number(
                  form.sale_price ||
                  0
                ),

              p_notes:
                form.notes ||
                null,
            }
          );


        if (
          updateError
        ) {
          throw updateError;
        }

      }


      if (
        kind ===
        "booking"
      ) {

        const {
          error:
            updateError,
        } =
          await supabase.rpc(
            "activity_os_update_booking",
            {
              p_company_id:
                companyId,

              p_booking_id:
                record.id,

              p_slot_id:
                form.slot_id,

              p_customer_name:
                form.customer_name,

              p_customer_phone:
                form.customer_phone ||
                null,

              p_customer_email:
                form.customer_email ||
                null,

              p_quantity:
                Number(
                  form.quantity ||
                  1
                ),

              p_sale_total:
                Number(
                  form.sale_total ||
                  0
                ),

              p_paid_total:
                Number(
                  form.paid_total ||
                  0
                ),

              p_hotel_name:
                form.hotel_name ||
                null,

              p_pickup_location:
                form.pickup_location ||
                null,

              p_status:
                form.status,
            }
          );


        if (
          updateError
        ) {
          throw updateError;
        }

      }


      setOpen(
        false
      );

      window.location.reload();

    } catch (
      saveError
    ) {

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Kayıt güncellenemedi."
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  async function remove() {

    const confirmed =
      window.confirm(
        kind === "activity"
          ? "Bu aktiviteyi silmek istediğinize emin misiniz?"
          : kind === "slot"
            ? "Bu slotu silmek istediğinize emin misiniz?"
            : "Bu rezervasyonu silmek istediğinize emin misiniz?"
      );


    if (!confirmed) {
      return;
    }


    setError("");


    const rpc =
      kind === "activity"
        ? "activity_os_delete_activity"
        : kind === "slot"
          ? "activity_os_delete_slot"
          : "activity_os_delete_booking";


    const params =
      kind === "activity"
        ? {
            p_company_id:
              companyId,

            p_activity_id:
              record.id,
          }
        : kind === "slot"
          ? {
              p_company_id:
                companyId,

              p_slot_id:
                record.id,
            }
          : {
              p_company_id:
                companyId,

              p_booking_id:
                record.id,
            };


    const {
      error:
        deleteError,
    } =
      await supabase.rpc(
        rpc,
        params
      );


    if (
      deleteError
    ) {

      window.alert(
        deleteError.message
      );

      return;

    }


    window.location.reload();

  }


  return (
    <>
      <div className="flex flex-wrap gap-2">

        <button
          type="button"
          onClick={() =>
            setOpen(
              true
            )
          }
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-black text-slate-300 transition hover:border-orange-500/30 hover:text-white"
        >
          <FaEdit />
          Düzenle
        </button>


        <button
          type="button"
          onClick={() =>
            void remove()
          }
          className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-300 transition hover:bg-red-500 hover:text-white"
        >
          <FaTrash />
          Sil
        </button>

      </div>


      {open && (

        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">

            <div className="flex items-center justify-between">

              <div>

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-400">
                  TUROBUS ACTIVITY OS
                </div>

                <h3 className="mt-1 text-2xl font-black">
                  {kind === "activity"
                    ? "Aktiviteyi Düzenle"
                    : kind === "slot"
                      ? "Slotu Düzenle"
                      : "Rezervasyonu Düzenle"}
                </h3>

              </div>


              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"
              >
                <FaTimes />
              </button>

            </div>


            {kind ===
              "activity" && (

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                <Field label="Aktivite Adı">
                  <input
                    value={
                      form.name ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "name",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Kategori">
                  <input
                    value={
                      form.category ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "category",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Şehir">
                  <input
                    value={
                      form.city ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "city",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Bölge">
                  <input
                    value={
                      form.district ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "district",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Satış Fiyatı">
                  <input
                    type="number"
                    value={
                      form.default_sale_price ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "default_sale_price",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="İç Maliyet">
                  <input
                    type="number"
                    value={
                      form.default_cost ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "default_cost",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Süre (Dakika)">
                  <input
                    type="number"
                    value={
                      form.duration_minutes ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "duration_minutes",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Buluşma Noktası">
                  <input
                    value={
                      form.meeting_point ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "meeting_point",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <div className="md:col-span-2">
                  <Field label="Kısa Açıklama">
                    <textarea
                      value={
                        form.short_description ??
                        ""
                      }
                      onChange={(e) =>
                        change(
                          "short_description",
                          e.target.value
                        )
                      }
                      className={`${inputClass} min-h-[90px]`}
                    />
                  </Field>
                </div>


                <div className="md:col-span-2">
                  <Field label="Detaylı Açıklama">
                    <textarea
                      value={
                        form.description ??
                        ""
                      }
                      onChange={(e) =>
                        change(
                          "description",
                          e.target.value
                        )
                      }
                      className={`${inputClass} min-h-[120px]`}
                    />
                  </Field>
                </div>

              </div>

            )}


            {kind ===
              "slot" && (

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                <Field label="Tarih">
                  <input
                    type="date"
                    value={
                      form.slot_date ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "slot_date",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Başlangıç">
                  <input
                    type="time"
                    value={
                      form.start_time?.slice(
                        0,
                        5
                      ) ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "start_time",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Bitiş">
                  <input
                    type="time"
                    value={
                      form.end_time?.slice(
                        0,
                        5
                      ) ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "end_time",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Kapasite">
                  <input
                    type="number"
                    min="1"
                    value={
                      form.capacity ??
                      1
                    }
                    onChange={(e) =>
                      change(
                        "capacity",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Satış Fiyatı">
                  <input
                    type="number"
                    value={
                      form.sale_price ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "sale_price",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <div className="md:col-span-2">
                  <Field label="Not">
                    <textarea
                      value={
                        form.notes ??
                        ""
                      }
                      onChange={(e) =>
                        change(
                          "notes",
                          e.target.value
                        )
                      }
                      className={`${inputClass} min-h-[90px]`}
                    />
                  </Field>
                </div>

              </div>

            )}


            {kind ===
              "booking" && (

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                <Field label="Misafir">
                  <input
                    value={
                      form.customer_name ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "customer_name",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Telefon">
                  <input
                    value={
                      form.customer_phone ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "customer_phone",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="E-posta">
                  <input
                    value={
                      form.customer_email ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "customer_email",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Slot">
                  <select
                    value={
                      form.slot_id ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "slot_id",
                        e.target.value
                      )
                    }
                    className={inputClass}
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
                          {slot.reserved_count}
                          /
                          {slot.capacity}
                        </option>
                      )
                    )}

                  </select>
                </Field>


                <Field label="Kişi">
                  <input
                    type="number"
                    min="1"
                    value={
                      form.quantity ??
                      1
                    }
                    onChange={(e) =>
                      change(
                        "quantity",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Toplam Satış">
                  <input
                    type="number"
                    value={
                      form.sale_total ??
                      0
                    }
                    onChange={(e) =>
                      change(
                        "sale_total",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Ödenen · Ödeme Merkezi">
                  <input
                    type="number"
                    value={
                      form.paid_total ??
                      0
                    }
                    disabled
                    className={`${inputClass} cursor-not-allowed opacity-60`}
                  />

                  <div className="mt-2 text-[9px] leading-4 text-slate-600">
                    Tahsilat tutarı rezervasyon düzenleme ekranından değiştirilemez.
                    Ödeme Merkezi veya Finans ekranını kullanın.
                  </div>
                </Field>


                <Field label="Durum">
                  <select
                    value={
                      form.status ??
                      "confirmed"
                    }
                    onChange={(e) =>
                      change(
                        "status",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  >
                    <option value="pending">Bekliyor</option>
                    <option value="confirmed">Onaylı</option>
                    <option value="ready">Hazır</option>
                    <option value="picked_up">Pickup</option>
                    <option value="checked_in">Check-in</option>
                    <option value="in_progress">Başladı</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                    <option value="no_show">No Show</option>
                  </select>
                </Field>


                <Field label="Otel">
                  <input
                    value={
                      form.hotel_name ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "hotel_name",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>


                <Field label="Pickup">
                  <input
                    value={
                      form.pickup_location ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "pickup_location",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  />
                </Field>

              </div>

            )}


            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                {error}
              </div>
            )}


            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() =>
                  void save()
                }
                disabled={
                  saving
                }
                className="flex-1 rounded-xl bg-orange-500 px-5 py-4 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : "Değişiklikleri Kaydet"}
              </button>


              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="rounded-xl border border-white/10 px-5 py-4 font-black"
              >
                Vazgeç
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );

}


function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {

  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );

}


const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm text-white outline-none focus:border-orange-500/50";
