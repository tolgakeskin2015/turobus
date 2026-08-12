"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";


type ActivityRow = {
  id: string;

  activity_type:
    | "status_change"
    | "note";

  previous_status:
    string | null;

  new_status:
    string | null;

  note:
    string | null;

  actor_user_id:
    string | null;

  actor_email:
    string | null;

  created_at: string;
};


function statusName(
  value:
    string | null
) {

  const labels:
    Record<
      string,
      string
    > = {

    pending:
      "Bekliyor",

    requested:
      "Talep Edildi",

    confirmed:
      "Onaylandı",

    in_service:
      "Başladı",

    completed:
      "Tamamlandı",

    cancelled:
      "İptal",

  };


  if (!value) {
    return "-";
  }


  return (
    labels[value] ??
    value
  );
}


export default function OperationActivityPage() {

  const params =
    useParams<{
      source: string;
      itemId: string;
    }>();


  const source =
    String(
      params?.source ??
      ""
    );


  const itemId =
    String(
      params?.itemId ??
      ""
    );


  const [
    rows,
    setRows,
  ] =
    useState<
      ActivityRow[]
    >([]);


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
    note,
    setNote,
  ] =
    useState("");


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");


  const loadActivity =
    useCallback(
      async () => {

        if (
          !source ||
          !itemId
        ) {
          return;
        }


        setLoading(
          true
        );

        setErrorMessage(
          ""
        );


        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_operation_activity",
            {

              p_source:
                source,

              p_item_id:
                itemId,

            }
          );


        if (error) {

          setErrorMessage(
            error.message
          );

          setRows(
            []
          );

          setLoading(
            false
          );

          return;
        }


        setRows(
          (
            data ??
            []
          ) as ActivityRow[]
        );


        setLoading(
          false
        );

      },
      [
        source,
        itemId,
      ]
    );


  useEffect(
    () => {

      void loadActivity();

    },
    [
      loadActivity,
    ]
  );


  async function saveNote() {

    const cleanNote =
      note.trim();


    if (!cleanNote) {

      setErrorMessage(
        "Not boş olamaz."
      );

      return;
    }


    setSaving(
      true
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );


    const {
      error,
    } =
      await supabase.rpc(
        "add_package_operation_note",
        {

          p_source:
            source,

          p_item_id:
            itemId,

          p_note:
            cleanNote,

        }
      );


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setNote(
      ""
    );


    setSuccessMessage(
      "Operasyon notu kaydedildi."
    );


    await loadActivity();


    setSaving(
      false
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-5xl">

        <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                TUROBUS PACKAGE OS
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-4xl">
                Operasyon Notları ve Geçmişi
              </h1>

              <p className="mt-3 text-sm text-slate-400">
                Operasyon üzerindeki durum değişikliklerini
                ve ekip içi notları takip edin.
              </p>

            </div>


            <Link
              href="/dashboard/package-os/control-tower"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              ← Kontrol Kulesi
            </Link>

          </div>

        </section>


        {
          errorMessage &&
          (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )
        }


        {
          successMessage &&
          (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
              {successMessage}
            </div>
          )
        }


        <section className="mt-6 rounded-[26px] border border-blue-500/20 bg-slate-900 p-5 md:p-6">

          <p className="text-xs font-black uppercase tracking-wider text-blue-300">
            EKİP İÇİ NOT EKLE
          </p>


          <textarea
            value={note}
            onChange={
              event =>
                setNote(
                  event.target.value
                )
            }
            maxLength={2000}
            placeholder="Operasyonla ilgili notunuzu yazın..."
            className="mt-4 min-h-32 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
          />


          <div className="mt-3 flex items-center justify-between gap-3">

            <span className="text-xs text-slate-500">
              {note.length}/2000
            </span>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void saveNote()
              }
              className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
            >
              {
                saving
                  ? "Kaydediliyor..."
                  : "Notu Kaydet"
              }
            </button>

          </div>

        </section>


        <section className="mt-6">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-xl font-black">
              Aktivite Geçmişi
            </h2>


            <button
              type="button"
              onClick={() =>
                void loadActivity()
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black"
            >
              Yenile
            </button>

          </div>


          {
            loading
              ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-slate-400">
                  Aktivite geçmişi yükleniyor...
                </div>
              )
              : rows.length === 0
                ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-slate-500">
                    Bu operasyon için henüz aktivite kaydı bulunmuyor.
                  </div>
                )
                : (
                  <div className="space-y-4">

                    {
                      rows.map(
                        row => (

                          <article
                            key={
                              row.id
                            }
                            className="rounded-[22px] border border-white/10 bg-slate-900 p-5"
                          >

                            <div className="flex flex-wrap items-center justify-between gap-3">

                              <span
                                className={
                                  row.activity_type ===
                                  "note"

                                    ? "rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300"

                                    : "rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300"
                                }
                              >
                                {
                                  row.activity_type ===
                                  "note"

                                    ? "EKİP NOTU"

                                    : "DURUM DEĞİŞİKLİĞİ"
                                }
                              </span>


                              <span className="text-xs text-slate-500">
                                {
                                  new Date(
                                    row.created_at
                                  ).toLocaleString(
                                    "tr-TR"
                                  )
                                }
                              </span>

                            </div>


                            {
                              row.activity_type ===
                              "note"

                                ? (
                                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                                    {row.note}
                                  </p>
                                )

                                : (
                                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">

                                    <span className="rounded-lg bg-slate-950 px-3 py-2">
                                      {
                                        statusName(
                                          row.previous_status
                                        )
                                      }
                                    </span>

                                    <span className="text-slate-500">
                                      →
                                    </span>

                                    <span className="rounded-lg bg-emerald-500/10 px-3 py-2 font-black text-emerald-300">
                                      {
                                        statusName(
                                          row.new_status
                                        )
                                      }
                                    </span>

                                  </div>
                                )
                            }


                            <p className="mt-4 text-xs text-slate-500">
                              İşlemi yapan:{" "}
                              {
                                row.actor_email ||
                                row.actor_user_id ||
                                "Sistem"
                              }
                            </p>

                          </article>

                        )
                      )
                    }

                  </div>
                )
          }

        </section>

      </div>

    </main>
  );
}
