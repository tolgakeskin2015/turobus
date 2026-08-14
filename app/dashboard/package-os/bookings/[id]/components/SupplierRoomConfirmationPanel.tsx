"use client";

import {
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";


type RoomPlan = {
  adults: number;
  children: number;
};


type RoomConfirmation = {
  room_order: number;

  status:
    | "confirmed"
    | "pending"
    | "rejected";

  room_number?: string;
  note?: string;
};


type Item = {
  id: string;

  name: string;

  item_type: string;

  supplier_id:
    string | null;

  supplier_status:
    string;

  supplier_confirmation_code:
    string | null;

  supplier_note:
    string | null;

  supplier_confirmed_at:
    string | null;

  supplier_room_confirmation:
    RoomConfirmation[];

  supplier_room_issue_status:
    | "none"
    | "open"
    | "waiting_supplier"
    | "assigned"
    | "resolved";

  supplier_room_issue_note:
    string | null;

  supplier_room_issue_assigned_to:
    string | null;

  supplier_room_issue_opened_at:
    string | null;

  supplier_room_issue_resolved_at:
    string | null;
};


function roomLabel(
  room: RoomPlan
) {

  const occupancy =
    Number(
      room.adults ||
      0
    )
    +
    Number(
      room.children ||
      0
    );


  if (
    occupancy ===
    1
  ) {
    return "Single";
  }


  if (
    occupancy ===
    2
  ) {
    return "Double";
  }


  if (
    occupancy ===
    3
  ) {
    return "Triple";
  }


  return `${occupancy} Kişilik`;
}


function statusLabel(
  status: string
) {

  if (
    status ===
    "confirmed"
  ) {
    return "TEYİT EDİLDİ";
  }


  if (
    status ===
    "rejected"
  ) {
    return "UYGUN DEĞİL";
  }


  return "BEKLİYOR";
}


function issueLabel(
  status: Item[
    "supplier_room_issue_status"
  ]
) {

  if (
    status ===
    "waiting_supplier"
  ) {
    return "TEDARİKÇİ BEKLENİYOR";
  }


  if (
    status ===
    "assigned"
  ) {
    return "SORUMLUYA ATANDI";
  }


  if (
    status ===
    "resolved"
  ) {
    return "SORUN ÇÖZÜLDÜ";
  }


  if (
    status ===
    "open"
  ) {
    return "AÇIK UYUŞMAZLIK";
  }


  return "AKSİYON YOK";
}


export default function
SupplierRoomConfirmationPanel({
  roomPlan,
  items,
  onChanged,
}: {
  roomPlan:
    RoomPlan[];

  items:
    Item[];

  onChanged:
    () =>
      Promise<void>;
}) {

  const [
    savingId,
    setSavingId,
  ] =
    useState(
      ""
    );


  const [
    noteItem,
    setNoteItem,
  ] =
    useState<
      Item |
      null
    >(
      null
    );


  const [
    noteAction,
    setNoteAction,
  ] =
    useState<
      | "request_alternative"
      | "resolve"
      | null
    >(
      null
    );


  const [
    actionNote,
    setActionNote,
  ] =
    useState(
      ""
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ""
    );


  const supplierItems =
    items.filter(
      item =>
        Boolean(
          item.supplier_id
        )
    );


  const hotelItems =
    supplierItems.filter(
      item =>
        item.item_type ===
        "hotel"
    );


  const visibleItems =
    hotelItems.length >
      0
      ? hotelItems
      : supplierItems.filter(
          item =>
            (
              item
                .supplier_room_confirmation ||
              []
            ).length >
              0
        );


  if (
    roomPlan.length ===
      0 ||
    visibleItems.length ===
      0
  ) {
    return null;
  }


  const rejectedRooms =
    visibleItems.reduce(
      (
        total,
        item
      ) =>
        total +
        (
          item
            .supplier_room_confirmation ||
          []
        ).filter(
          room =>
            room.status ===
            "rejected"
        ).length,
      0
    );


  const pendingRooms =
    visibleItems.reduce(
      (
        total,
        item
      ) =>
        total +
        roomPlan.filter(
          (
            _room,
            index
          ) => {

            const confirmation =
              (
                item
                  .supplier_room_confirmation ||
                []
              ).find(
                row =>
                  Number(
                    row.room_order
                  ) ===
                  index +
                    1
              );


            return (
              !confirmation ||
              confirmation.status ===
                "pending"
            );

          }
        ).length,
      0
    );


  const mismatch =
    visibleItems.some(
      item => {

        const confirmations =
          item
            .supplier_room_confirmation ||
          [];


        return (
          confirmations.length >
            0 &&
          confirmations.length !==
            roomPlan.length
        );

      }
    );


  const critical =
    rejectedRooms >
      0 ||
    mismatch;


  async function runAction(
    item: Item,
    action:
      | "request_alternative"
      | "resend_supplier"
      | "assign_to_me"
      | "resolve"
      | "reopen",
    note:
      string |
      null =
      null
  ) {

    setSavingId(
      item.id
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
        "package_booking_room_issue_action",
        {
          p_booking_item_id:
            item.id,

          p_action:
            action,

          p_note:
            note,
        }
      );


    if (
      error
    ) {

      setErrorMessage(
        error.message
      );

      setSavingId(
        ""
      );

      return;

    }


    const message =
      action ===
        "request_alternative"
        ? "Alternatif oda talebi tedarikçiye gönderildi."
        : action ===
          "resend_supplier"
          ? "Tedarikçi talebi yeniden gönderildi."
          : action ===
            "assign_to_me"
            ? "Uyuşmazlık operasyon sorumlusu olarak üzerinize alındı."
            : action ===
              "resolve"
              ? "Oda uyuşmazlığı çözüldü olarak kapatıldı."
              : "Oda uyuşmazlığı yeniden açıldı.";


    setSuccessMessage(
      message
    );


    setNoteItem(
      null
    );

    setNoteAction(
      null
    );

    setActionNote(
      ""
    );


    await onChanged();


    setSavingId(
      ""
    );

  }


  function openNote(
    item: Item,
    action:
      | "request_alternative"
      | "resolve"
  ) {

    setNoteItem(
      item
    );

    setNoteAction(
      action
    );

    setActionNote(
      item
        .supplier_room_issue_note ||
        ""
    );

  }


  return (
    <section
      className={`mt-8 rounded-[28px] border p-6 ${
        critical
          ? "border-red-500/30 bg-red-500/5"
          : pendingRooms >
              0
            ? "border-amber-500/20 bg-slate-900"
            : "border-emerald-500/20 bg-slate-900"
      }`}
    >

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
            TEDARİKÇİ ODA TEYİT MERKEZİ
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Oda Uyuşmazlık Çözüm Merkezi
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Oda teyitlerini kontrol edin, uyuşmazlığı sorumluya atayın ve tedarikçi sürecini yönetin.
          </p>

        </div>


        <div
          className={`rounded-2xl border px-5 py-3 ${
            critical
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : pendingRooms >
                  0
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >

          <div className="text-[10px] font-black uppercase tracking-wider">
            Oda Teyit Durumu
          </div>

          <div className="mt-1 font-black">

            {
              critical
                ? "KRİTİK UYUŞMAZLIK"
                : pendingRooms >
                    0
                  ? `${pendingRooms} ODA BEKLİYOR`
                  : "TÜM ODALAR TEYİTLİ"
            }

          </div>

        </div>

      </div>


      {
        errorMessage &&
        (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {
              errorMessage
            }
          </div>
        )
      }


      {
        successMessage &&
        (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {
              successMessage
            }
          </div>
        )
      }


      {
        critical &&
        (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">

            <div className="font-black">
              ⚠ OPERASYON ALARMI
            </div>

            <div className="mt-2 text-sm leading-6">

              {
                rejectedRooms >
                  0
                  ? `${rejectedRooms} oda tedarikçi tarafından uygun değil olarak işaretlendi. `
                  : ""
              }

              {
                mismatch
                  ? "Tedarikçi teyidindeki oda sayısı satılan oda planıyla uyuşmuyor."
                  : ""
              }

            </div>

          </div>
        )
      }


      <div className="mt-6 space-y-5">

        {
          visibleItems.map(
            item => {

              const itemRejected =
                (
                  item
                    .supplier_room_confirmation ||
                  []
                ).some(
                  room =>
                    room.status ===
                    "rejected"
                );


              const itemMismatch =
                (
                  item
                    .supplier_room_confirmation ||
                  []
                ).length >
                  0 &&
                (
                  item
                    .supplier_room_confirmation ||
                  []
                ).length !==
                  roomPlan.length;


              const hasIssue =
                itemRejected ||
                itemMismatch ||
                item
                  .supplier_room_issue_status !==
                  "none";


              return (
                <div
                  key={
                    item.id
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                >

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div>

                      <div className="text-lg font-black">
                        {
                          item.name
                        }
                      </div>


                      <div className="mt-2 flex flex-wrap gap-2">

                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
                          Tedarikçi: {
                            item.supplier_status
                          }
                        </span>


                        {
                          item
                            .supplier_confirmation_code &&
                          (
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                              Teyit No: {
                                item.supplier_confirmation_code
                              }
                            </span>
                          )
                        }


                        {
                          hasIssue &&
                          (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                item.supplier_room_issue_status ===
                                  "resolved"
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-red-500/10 text-red-300"
                              }`}
                            >
                              {
                                issueLabel(
                                  item.supplier_room_issue_status
                                )
                              }
                            </span>
                          )
                        }

                      </div>

                    </div>


                    {
                      item
                        .supplier_note &&
                      (
                        <div className="max-w-md rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-300">

                          <span className="font-black">
                            Tedarikçi Notu:
                          </span>{" "}

                          {
                            item
                              .supplier_note
                          }

                        </div>
                      )
                    }

                  </div>


                  {
                    item
                      .supplier_room_issue_note &&
                    (
                      <div className="mt-4 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-300">

                        <span className="font-black text-orange-300">
                          Operasyon Notu:
                        </span>{" "}

                        {
                          item
                            .supplier_room_issue_note
                        }

                      </div>
                    )
                  }


                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

                    {
                      roomPlan.map(
                        (
                          room,
                          index
                        ) => {

                          const confirmation =
                            (
                              item
                                .supplier_room_confirmation ||
                              []
                            ).find(
                              row =>
                                Number(
                                  row.room_order
                                ) ===
                                index +
                                  1
                            );


                          const status =
                            confirmation
                              ?.status ||
                            "pending";


                          return (
                            <div
                              key={
                                index
                              }
                              className={`rounded-2xl border p-4 ${
                                status ===
                                  "rejected"
                                  ? "border-red-500/30 bg-red-500/10"
                                  : status ===
                                      "confirmed"
                                    ? "border-emerald-500/20 bg-emerald-500/5"
                                    : "border-amber-500/20 bg-amber-500/5"
                              }`}
                            >

                              <div className="flex items-start justify-between gap-3">

                                <div>

                                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    {
                                      index +
                                      1
                                    }
                                    . ODA
                                  </div>

                                  <div className="mt-2 text-lg font-black">
                                    {
                                      roomLabel(
                                        room
                                      )
                                    }
                                  </div>

                                </div>


                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                    status ===
                                      "rejected"
                                      ? "bg-red-500/20 text-red-300"
                                      : status ===
                                          "confirmed"
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {
                                    statusLabel(
                                      status
                                    )
                                  }
                                </span>

                              </div>


                              <div className="mt-3 text-xs text-slate-400">

                                {
                                  room.adults
                                }
                                {" yetişkin"}

                                {
                                  room.children >
                                    0
                                    ? ` · ${room.children} çocuk`
                                    : ""
                                }

                              </div>


                              {
                                confirmation
                                  ?.room_number &&
                                (
                                  <div className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm">

                                    <span className="text-slate-500">
                                      Oda No:
                                    </span>{" "}

                                    <span className="font-black">
                                      {
                                        confirmation.room_number
                                      }
                                    </span>

                                  </div>
                                )
                              }


                              {
                                confirmation
                                  ?.note &&
                                (
                                  <div className="mt-2 text-xs leading-5 text-slate-400">
                                    {
                                      confirmation.note
                                    }
                                  </div>
                                )
                              }

                            </div>
                          );

                        }
                      )
                    }

                  </div>


                  {
                    hasIssue &&
                    (
                      <div className="mt-5 border-t border-white/10 pt-5">

                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          UYUŞMAZLIK AKSİYONLARI
                        </p>


                        <div className="mt-3 flex flex-wrap gap-2">

                          {
                            item
                              .supplier_room_issue_status !==
                              "resolved" &&
                            (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    savingId ===
                                    item.id
                                  }
                                  onClick={
                                    () =>
                                      openNote(
                                        item,
                                        "request_alternative"
                                      )
                                  }
                                  className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                                >
                                  Alternatif Oda İste
                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    savingId ===
                                    item.id
                                  }
                                  onClick={
                                    () =>
                                      void runAction(
                                        item,
                                        "resend_supplier"
                                      )
                                  }
                                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black disabled:opacity-50"
                                >
                                  Tedarikçiye Yeniden Gönder
                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    savingId ===
                                    item.id
                                  }
                                  onClick={
                                    () =>
                                      void runAction(
                                        item,
                                        "assign_to_me"
                                      )
                                  }
                                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-300 disabled:opacity-50"
                                >
                                  Bana Ata
                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    savingId ===
                                    item.id
                                  }
                                  onClick={
                                    () =>
                                      openNote(
                                        item,
                                        "resolve"
                                      )
                                  }
                                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-300 disabled:opacity-50"
                                >
                                  Sorun Çözüldü
                                </button>
                              </>
                            )
                          }


                          {
                            item
                              .supplier_room_issue_status ===
                              "resolved" &&
                            (
                              <button
                                type="button"
                                disabled={
                                  savingId ===
                                  item.id
                                }
                                onClick={
                                  () =>
                                    void runAction(
                                      item,
                                      "reopen"
                                    )
                                }
                                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-black text-amber-300 disabled:opacity-50"
                              >
                                Sorunu Yeniden Aç
                              </button>
                            )
                          }

                        </div>

                      </div>
                    )
                  }

                </div>
              );

            }
          )
        }

      </div>


      {
        noteItem &&
        noteAction &&
        (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">

            <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-900 p-6">

              <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                {
                  noteAction ===
                    "request_alternative"
                    ? "ALTERNATİF ODA TALEBİ"
                    : "UYUŞMAZLIĞI KAPAT"
                }
              </p>


              <h3 className="mt-2 text-xl font-black">
                {
                  noteItem.name
                }
              </h3>


              <p className="mt-2 text-sm text-slate-400">
                {
                  noteAction ===
                    "request_alternative"
                    ? "Tedarikçiye gönderilecek operasyon notunu yazın."
                    : "Sorunun nasıl çözüldüğünü kısa bir notla kaydedin."
                }
              </p>


              <textarea
                value={
                  actionNote
                }
                onChange={
                  event =>
                    setActionNote(
                      event.target.value
                    )
                }
                rows={
                  5
                }
                placeholder={
                  noteAction ===
                    "request_alternative"
                    ? "Örn. Triple oda uygun değil. 1 Double + 1 Single alternatif rica ederiz."
                    : "Örn. Tedarikçi yeni oda teyidini verdi, uyuşmazlık giderildi."
                }
                className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm outline-none"
              />


              <div className="mt-5 flex gap-3">

                <button
                  type="button"
                  onClick={
                    () => {

                      setNoteItem(
                        null
                      );

                      setNoteAction(
                        null
                      );

                    }
                  }
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-black"
                >
                  Vazgeç
                </button>


                <button
                  type="button"
                  disabled={
                    savingId ===
                    noteItem.id
                  }
                  onClick={
                    () =>
                      void runAction(
                        noteItem,
                        noteAction,
                        actionNote.trim() ||
                        null
                      )
                  }
                  className="flex-1 rounded-xl bg-orange-500 px-4 py-3 font-black text-slate-950 disabled:opacity-50"
                >
                  {
                    savingId ===
                      noteItem.id
                      ? "Kaydediliyor..."
                      : noteAction ===
                          "request_alternative"
                        ? "Talebi Gönder"
                        : "Sorunu Kapat"
                  }
                </button>

              </div>

            </div>

          </div>
        )
      }

    </section>
  );
}
