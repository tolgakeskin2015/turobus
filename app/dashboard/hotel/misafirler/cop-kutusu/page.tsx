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
  FaClock,
  FaDownload,
  FaExclamationTriangle,
  FaHistory,
  FaPrint,
  FaRecycle,
  FaSearch,
  FaTrash,
  FaUndo,
  FaUser,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  DeletedHotelGuest,
  emptyGuestTrash,
  getGuestTrashData,
  GuestAuditLog,
  permanentlyDeleteGuest,
  restoreGuest,
} from "@/lib/hotel/guests/guest-trash-service";

function dateTime(
  value: string | null
): string {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Date(
    value
  ).toLocaleString("tr-TR");
}

function actionLabel(
  action: string
): string {
  const labels: Record<
    string,
    string
  > = {
    created: "Oluşturuldu",
    updated: "Güncellendi",
    deleted:
      "Çöp Kutusuna Taşındı",
    restored: "Geri Yüklendi",
    permanently_deleted:
      "Kalıcı Silindi",
    reservation_attached:
      "Rezervasyona Bağlandı",
    reservation_detached:
      "Rezervasyondan Çıkarıldı",
    note_created: "Not Eklendi",
    note_deleted: "Not Silindi",
    document_created:
      "Belge Eklendi",
    document_deleted:
      "Belge Silindi",
    preferences_updated:
      "Tercihler Güncellendi",
  };

  return labels[action] ?? action;
}

export default function GuestTrashPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [guests, setGuests] =
    useState<DeletedHotelGuest[]>([]);

  const [logs, setLogs] =
    useState<GuestAuditLog[]>([]);

  const [search, setSearch] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<"trash" | "history">(
      "trash"
    );

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getGuestTrashData(
          companyId
        );

      setGuests(data.guests);
      setLogs(data.logs);
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

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Çöp kutusu yüklenemedi."
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

  const visibleGuests = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return guests;

    return guests.filter((guest) =>
      [
        guest.first_name,
        guest.last_name,
        guest.phone,
        guest.email,
        guest.identity_number,
        guest.deletion_reason,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query)
        )
    );
  }, [guests, search]);

  const visibleLogs = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return logs;

    return logs.filter((log) =>
      [
        log.guest_name,
        log.action_type,
        log.description,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query)
        )
    );
  }, [logs, search]);

  function toggleSelection(
    guestId: string
  ) {
    setSelectedIds((current) =>
      current.includes(guestId)
        ? current.filter(
            (id) => id !== guestId
          )
        : [...current, guestId]
    );
  }

  function toggleAll() {
    const ids = visibleGuests.map(
      (guest) => guest.id
    );

    const allSelected =
      ids.length > 0 &&
      ids.every((id) =>
        selectedIds.includes(id)
      );

    setSelectedIds(
      allSelected
        ? selectedIds.filter(
            (id) => !ids.includes(id)
          )
        : Array.from(
            new Set([
              ...selectedIds,
              ...ids,
            ])
          )
    );
  }

  async function restoreOne(
    guest: DeletedHotelGuest
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        `${guest.first_name} ${guest.last_name} geri yüklensin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await restoreGuest(
        membership.company_id,
        guest.id
      );

      await refresh();

      setSelectedIds((current) =>
        current.filter(
          (id) => id !== guest.id
        )
      );

      setSuccessMessage(
        "Misafir profili geri yüklendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Misafir geri yüklenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function restoreSelected() {
    if (
      !membership ||
      processing ||
      selectedIds.length === 0
    ) {
      return;
    }

    if (
      !window.confirm(
        `${selectedIds.length} misafir profili geri yüklensin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      for (const id of selectedIds) {
        await restoreGuest(
          membership.company_id,
          id
        );
      }

      const count =
        selectedIds.length;

      setSelectedIds([]);

      await refresh();

      setSuccessMessage(
        `${count} misafir profili geri yüklendi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Seçili misafirler geri yüklenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function deletePermanently(
    guest: DeletedHotelGuest
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    const typedName =
      window.prompt(
        `Kalıcı silme işlemi geri alınamaz.\n\nOnaylamak için "${guest.first_name} ${guest.last_name}" yazın.`
      );

    if (
      typedName !==
      `${guest.first_name} ${guest.last_name}`
    ) {
      setErrorMessage(
        "İsim doğrulaması başarısız. Kalıcı silme iptal edildi."
      );
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await permanentlyDeleteGuest(
        membership.company_id,
        guest.id
      );

      await refresh();

      setSelectedIds((current) =>
        current.filter(
          (id) => id !== guest.id
        )
      );

      setSuccessMessage(
        "Misafir profili kalıcı olarak silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Misafir kalıcı olarak silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function clearTrash() {
    if (
      !membership ||
      processing ||
      guests.length === 0
    ) {
      return;
    }

    const confirmation =
      window.prompt(
        `Çöp kutusundaki ${guests.length} kayıt kalıcı olarak silinecek.\n\nOnaylamak için ÇÖP KUTUSUNU TEMİZLE yazın.`
      );

    if (
      confirmation !==
      "ÇÖP KUTUSUNU TEMİZLE"
    ) {
      setErrorMessage(
        "Doğrulama başarısız. İşlem iptal edildi."
      );
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const count =
        await emptyGuestTrash(
          membership.company_id
        );

      setSelectedIds([]);

      await refresh();

      setSuccessMessage(
        `${count} misafir profili kalıcı olarak silindi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Çöp kutusu temizlenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  function exportCsv() {
    const rows =
      activeTab === "trash"
        ? visibleGuests.map(
            (guest) => ({
              Ad: guest.first_name,
              Soyad: guest.last_name,
              Telefon:
                guest.phone ?? "",
              Eposta:
                guest.email ?? "",
              Kimlik:
                guest.identity_number ??
                "",
              SilinmeTarihi:
                dateTime(
                  guest.deleted_at
                ),
              SilinmeNedeni:
                guest.deletion_reason ??
                "",
            })
          )
        : visibleLogs.map((log) => ({
            Misafir:
              log.guest_name ?? "",
            Islem:
              actionLabel(
                log.action_type
              ),
            Aciklama:
              log.description ?? "",
            Tarih: dateTime(
              log.created_at
            ),
          }));

    if (rows.length === 0) {
      setErrorMessage(
        "Dışa aktarılacak kayıt bulunmuyor."
      );
      return;
    }

    const headers =
      Object.keys(rows[0]);

    const escape = (
      value: unknown
    ) =>
      `"${String(value ?? "")
        .replaceAll('"', '""')}"`;

    const csv = [
      headers
        .map(escape)
        .join(";"),

      ...rows.map((row) =>
        headers
          .map((header) =>
            escape(
              (
                row as Record<
                  string,
                  unknown
                >
              )[header]
            )
          )
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      activeTab === "trash"
        ? "misafir-cop-kutusu.csv"
        : "misafir-islem-gecmisi.csv";

    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="p-10">
        Misafir çöp kutusu yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <Link
              href="/dashboard/hotel/misafirler"
              className="inline-flex items-center gap-2 text-sm font-black text-orange-400"
            >
              <FaArrowLeft />
              Misafir Merkezine Dön
            </Link>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS HOTEL PMS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Misafir Çöp Kutusu ve İşlem Geçmişi
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Silinen misafirleri geri
              yükleyin, kalıcı silme
              işlemlerini yönetin ve kullanıcı
              hareketlerini inceleyin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportCsv}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaDownload />
              CSV Aktar
            </button>

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaPrint />
              Yazdır
            </button>

            <button
              type="button"
              disabled={
                processing ||
                guests.length === 0
              }
              onClick={() =>
                void clearTrash()
              }
              className="flex min-h-12 items-center gap-2 rounded-xl bg-red-500/15 px-5 font-black text-red-400 disabled:opacity-40"
            >
              <FaTrash />
              Çöp Kutusunu Temizle
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

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaRecycle className="text-orange-400" />

            <p className="mt-4 text-sm text-slate-500">
              Çöp Kutusundaki Misafir
            </p>

            <p className="mt-2 text-4xl font-black">
              {guests.length}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaHistory className="text-orange-400" />

            <p className="mt-4 text-sm text-slate-500">
              İşlem Kaydı
            </p>

            <p className="mt-2 text-4xl font-black">
              {logs.length}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaUndo className="text-orange-400" />

            <p className="mt-4 text-sm text-slate-500">
              Seçili Kayıt
            </p>

            <p className="mt-2 text-4xl font-black">
              {selectedIds.length}
            </p>
          </article>

          <article className="rounded-3xl border border-red-500/20 bg-red-500/[0.06] p-6">
            <FaExclamationTriangle className="text-red-400" />

            <p className="mt-4 text-sm text-red-300/70">
              Kalıcı Silme
            </p>

            <p className="mt-2 text-sm font-black text-red-400">
              Geri alınamaz
            </p>
          </article>
        </section>

        <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveTab("trash")
                }
                className={`flex min-h-11 items-center gap-2 rounded-xl px-5 font-black ${
                  activeTab === "trash"
                    ? "bg-orange-500"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                <FaRecycle />
                Çöp Kutusu
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "history"
                  )
                }
                className={`flex min-h-11 items-center gap-2 rounded-xl px-5 font-black ${
                  activeTab ===
                  "history"
                    ? "bg-orange-500"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                <FaHistory />
                İşlem Geçmişi
              </button>
            </div>

            <label className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-white px-4 lg:max-w-xl">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Misafir, işlem veya açıklama ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>
          </div>
        </section>

        {activeTab === "trash" && (
          <>
            <section className="mt-6 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900 p-5 sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 font-black">
                <input
                  type="checkbox"
                  checked={
                    visibleGuests.length >
                      0 &&
                    visibleGuests.every(
                      (guest) =>
                        selectedIds.includes(
                          guest.id
                        )
                    )
                  }
                  onChange={toggleAll}
                  className="h-5 w-5"
                />

                Görünenleri seç
              </label>

              <button
                type="button"
                disabled={
                  processing ||
                  selectedIds.length ===
                    0
                }
                onClick={() =>
                  void restoreSelected()
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 font-black disabled:opacity-40"
              >
                <FaUndo />
                Seçilenleri Geri Yükle (
                {selectedIds.length})
              </button>
            </section>

            <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleGuests.map(
                (guest) => (
                  <article
                    key={guest.id}
                    className={`rounded-[30px] border p-6 ${
                      selectedIds.includes(
                        guest.id
                      )
                        ? "border-blue-400 bg-blue-500/[0.05]"
                        : "border-white/10 bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(
                          guest.id
                        )}
                        onChange={() =>
                          toggleSelection(
                            guest.id
                          )
                        }
                        className="mt-2 h-5 w-5"
                      />

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xl text-orange-400">
                        <FaUser />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-red-400">
                          SİLİNMİŞ PROFİL
                        </p>

                        <h2 className="mt-1 text-2xl font-black">
                          {guest.first_name}{" "}
                          {guest.last_name}
                        </h2>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 rounded-2xl bg-slate-950 p-4 text-sm">
                      <div>
                        <p className="text-slate-500">
                          Silinme Tarihi
                        </p>

                        <p className="mt-1 font-black">
                          {dateTime(
                            guest.deleted_at
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Silinme Nedeni
                        </p>

                        <p className="mt-1 font-black">
                          {guest.deletion_reason ||
                            "Neden belirtilmedi"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          İletişim
                        </p>

                        <p className="mt-1 font-black">
                          {guest.phone ||
                            guest.email ||
                            "Bilgi yok"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void restoreOne(
                            guest
                          )
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black disabled:opacity-40"
                      >
                        <FaUndo />
                        Geri Yükle
                      </button>

                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void deletePermanently(
                            guest
                          )
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400 disabled:opacity-40"
                      >
                        <FaTrash />
                        Kalıcı Sil
                      </button>
                    </div>
                  </article>
                )
              )}
            </section>

            {visibleGuests.length ===
              0 && (
              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-14 text-center text-slate-500">
                Çöp kutusunda misafir
                profili bulunmuyor.
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="space-y-3">
              {visibleLogs.map((log) => (
                <article
                  key={log.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-950 p-5 md:flex-row md:items-start"
                >
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                      <FaClock />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">
                          {log.guest_name ||
                            "Silinmiş Misafir"}
                        </h3>

                        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                          {actionLabel(
                            log.action_type
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {log.description ||
                          "Açıklama bulunmuyor."}
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-xs text-slate-600">
                    {dateTime(
                      log.created_at
                    )}
                  </p>
                </article>
              ))}

              {visibleLogs.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  İşlem geçmişi
                  bulunmuyor.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
