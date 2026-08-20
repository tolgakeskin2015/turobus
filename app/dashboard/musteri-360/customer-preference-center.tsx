"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBed,
  FaBullseye,
  FaCar,
  FaComments,
  FaDollarSign,
  FaGlobeEurope,
  FaHeart,
  FaHotel,
  FaPlus,
  FaSearch,
  FaStar,
  FaTimes,
  FaTrash,
  FaUtensils,
} from "react-icons/fa";

import {
  deleteCustomer360Preference,
  loadCustomer360PreferenceSnapshot,
  setCustomer360Segment,
  upsertCustomer360Preference,
} from "@/lib/customer-360/repository";

import type {
  Customer360PreferenceRow,
  Customer360PreferenceSnapshot,
  Customer360Segment,
} from "@/lib/customer-360/repository";


type Props = {
  customerId:
    string;
};


const categoryMeta:
Record<
  string,
  {
    label:
      string;

    icon:
      React.ReactNode;
  }
> = {
  accommodation: {
    label:
      "Konaklama",

    icon:
      <FaHotel />,
  },

  room: {
    label:
      "Oda",

    icon:
      <FaBed />,
  },

  destination: {
    label:
      "Destinasyon",

    icon:
      <FaGlobeEurope />,
  },

  activity: {
    label:
      "Aktivite",

    icon:
      <FaStar />,
  },

  food: {
    label:
      "Yeme & İçme",

    icon:
      <FaUtensils />,
  },

  transport: {
    label:
      "Ulaşım",

    icon:
      <FaCar />,
  },

  communication: {
    label:
      "İletişim",

    icon:
      <FaComments />,
  },

  budget: {
    label:
      "Bütçe",

    icon:
      <FaDollarSign />,
  },

  travel_style: {
    label:
      "Seyahat Tipi",

    icon:
      <FaHeart />,
  },

  special: {
    label:
      "Özel İstek",

    icon:
      <FaBullseye />,
  },
};


function categoryLabel(
  category:
    string
) {
  return categoryMeta[
    category
  ]?.label ??
    category;
}


function preferenceValue(
  row:
    Customer360PreferenceRow
) {
  const raw =
    row.preference_value;


  const value =
    raw?.value;


  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value
    );
  }


  try {
    return JSON.stringify(
      raw
    );
  } catch {
    return "—";
  }
}


function segmentLabel(
  segment:
    Customer360Segment
) {
  const map:
  Record<
    Customer360Segment,
    string
  > = {
    standard:
      "Standart",

    repeat:
      "Tekrar Gelen",

    vip:
      "VIP",

    corporate:
      "Kurumsal",

    risk:
      "Risk",
  };


  return map[
    segment
  ];
}


function segmentClass(
  segment:
    Customer360Segment
) {
  if (
    segment ===
      "vip"
  ) {
    return "border-amber-500/20 bg-amber-500/[.07] text-amber-300";
  }


  if (
    segment ===
      "repeat"
  ) {
    return "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300";
  }


  if (
    segment ===
      "corporate"
  ) {
    return "border-blue-500/20 bg-blue-500/[.06] text-blue-300";
  }


  if (
    segment ===
      "risk"
  ) {
    return "border-red-500/20 bg-red-500/[.07] text-red-300";
  }


  return "border-white/10 bg-white/[.03] text-slate-400";
}


export default function CustomerPreferenceCenter({
  customerId,
}: Props) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      Customer360PreferenceSnapshot | null
    >(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    busy,
    setBusy,
  ] =
    useState("");


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


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState(
      "all"
    );


  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(
      false
    );


  const [
    formCategory,
    setFormCategory,
  ] =
    useState(
      "accommodation"
    );


  const [
    formKey,
    setFormKey,
  ] =
    useState("");


  const [
    formValue,
    setFormValue,
  ] =
    useState("");


  const refresh =
    useCallback(
      async () => {
        const result =
          await loadCustomer360PreferenceSnapshot(
            customerId
          );


        setSnapshot(
          result
        );
      },
      [
        customerId,
      ]
    );


  useEffect(() => {
    void (
      async () => {
        try {
          await refresh();

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
    refresh,
  ]);


  const preferences =
    snapshot?.preferences ??
    [];


  const filtered =
    useMemo(
      () => {
        const needle =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return preferences.filter(
          (
            row
          ) => {
            if (
              categoryFilter !==
                "all" &&
              row.category !==
                categoryFilter
            ) {
              return false;
            }


            if (!needle) {
              return true;
            }


            return [
              categoryLabel(
                row.category
              ),
              row.preference_key,
              preferenceValue(
                row
              ),
            ]
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                needle
              );
          }
        );

      },
      [
        preferences,
        search,
        categoryFilter,
      ]
    );


  const categoryCount =
    useMemo(
      () =>
        new Set(
          preferences.map(
            (
              row
            ) =>
              row.category
          )
        ).size,
      [
        preferences,
      ]
    );


  async function savePreference() {
    if (
      !formKey.trim() ||
      !formValue.trim()
    ) {
      setError(
        "Tercih adı ve değeri gerekli."
      );

      return;
    }


    setBusy(
      "save"
    );

    setError("");
    setNotice("");


    try {
      await upsertCustomer360Preference(
        {
          customerId,

          category:
            formCategory,

          preferenceKey:
            formKey.trim(),

          preferenceValue: {
            value:
              formValue.trim(),

            source:
              "manual",
          },
        }
      );


      await refresh();


      setFormKey("");
      setFormValue("");

      setModalOpen(
        false
      );

      setNotice(
        "Müşteri tercihi kaydedildi."
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
      setBusy("");
    }
  }


  async function removePreference(
    preferenceId:
      string
  ) {
    if (
      !window.confirm(
        "Bu tercihi silmek istiyor musunuz?"
      )
    ) {
      return;
    }


    setBusy(
      preferenceId
    );

    setError("");
    setNotice("");


    try {
      await deleteCustomer360Preference(
        preferenceId
      );


      await refresh();


      setNotice(
        "Tercih kaldırıldı."
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
      setBusy("");
    }
  }


  async function changeSegment(
    segment:
      Customer360Segment
  ) {
    setBusy(
      "segment"
    );

    setError("");
    setNotice("");


    try {
      await setCustomer360Segment(
        customerId,
        segment
      );


      await refresh();


      setNotice(
        "Müşteri segmenti güncellendi."
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
      setBusy("");
    }
  }


  if (
    loading
  ) {
    return (
      <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-10 text-center text-[10px] text-slate-600">
        Tercih merkezi yükleniyor...
      </section>
    );
  }


  const customer =
    snapshot?.customer;


  return (
    <>
      <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

        <div className="border-b border-white/[.07] p-5">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <FaBullseye className="text-orange-300" />

                <h2 className="text-sm font-black">
                  Tercihler & Segmentasyon Merkezi
                </h2>

              </div>


              <p className="mt-2 max-w-2xl text-[9px] leading-5 text-slate-600">
                Konaklama, oda, destinasyon, aktivite, ulaşım, iletişim, bütçe ve seyahat tarzı tercihlerini merkezi müşteri profiline bağlar.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                setModalOpen(
                  true
                )
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[9px] font-black text-white"
            >
              <FaPlus />
              Yeni Tercih
            </button>

          </div>


          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">

            <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Segment
              </div>

              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-[8px] font-black ${segmentClass(
                    customer?.segment ??
                    "standard"
                  )}`}
                >
                  {segmentLabel(
                    customer?.segment ??
                    "standard"
                  )}
                </span>
              </div>
            </article>


            <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Toplam Tercih
              </div>

              <div className="mt-2 text-xl font-black">
                {preferences.length}
              </div>
            </article>


            <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Tercih Kategorisi
              </div>

              <div className="mt-2 text-xl font-black">
                {categoryCount}
              </div>
            </article>


            <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                KVKK / Pazarlama
              </div>

              <div className="mt-2 text-[9px] font-black text-slate-300">
                {customer?.kvkk_consent
                  ? "KVKK ✓"
                  : "KVKK —"}
                {" · "}
                {customer?.marketing_consent
                  ? "Pazarlama ✓"
                  : "Pazarlama —"}
              </div>
            </article>

          </div>


          <div className="mt-5 rounded-2xl border border-white/[.07] bg-black/20 p-4">

            <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
              Müşteri Segmenti
            </div>


            <div className="mt-3 flex flex-wrap gap-2">

              {(
                [
                  "standard",
                  "repeat",
                  "vip",
                  "corporate",
                  "risk",
                ] as
                  Customer360Segment[]
              ).map(
                (
                  segment
                ) => (
                  <button
                    key={
                      segment
                    }
                    type="button"
                    disabled={
                      busy ===
                      "segment"
                    }
                    onClick={() =>
                      void changeSegment(
                        segment
                      )
                    }
                    className={`rounded-xl border px-3 py-2 text-[8px] font-black transition disabled:opacity-40 ${
                      customer?.segment ===
                      segment
                        ? segmentClass(
                            segment
                          )
                        : "border-white/10 bg-[#030a11] text-slate-500 hover:text-white"
                    }`}
                  >
                    {segmentLabel(
                      segment
                    )}
                  </button>
                )
              )}

            </div>


            <div className="mt-3 text-[8px] leading-4 text-slate-600">
              Segment değişikliği manuel kullanıcı kararıdır. Sistem burada otomatik veya yapay risk/VIP sınıflandırması üretmez.
            </div>

          </div>


          <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_220px]">

            <div className="relative">

              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600" />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Tercih, kategori veya değer ara..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] outline-none focus:border-orange-500/40"
              />

            </div>


            <select
              value={
                categoryFilter
              }
              onChange={(
                event
              ) =>
                setCategoryFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px]"
            >

              <option value="all">
                Tüm Kategoriler
              </option>

              {Object.entries(
                categoryMeta
              ).map(
                ([
                  key,
                  meta,
                ]) => (
                  <option
                    key={
                      key
                    }
                    value={
                      key
                    }
                  >
                    {meta.label}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {error && (
          <div className="border-b border-red-500/10 bg-red-500/[.05] px-5 py-4 text-[9px] font-bold text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="border-b border-emerald-500/10 bg-emerald-500/[.04] px-5 py-4 text-[9px] font-bold text-emerald-300">
            {notice}
          </div>
        )}


        {filtered.length ===
        0 ? (
          <div className="p-12 text-center">

            <FaHeart className="mx-auto text-4xl text-slate-800" />

            <div className="mt-4 text-xs font-black">
              Tercih kaydı bulunamadı
            </div>

            <div className="mt-2 text-[9px] leading-5 text-slate-600">
              Müşteriden öğrenilen gerçek tercihler eklendikçe burada görünür.
            </div>

          </div>
        ) : (
          <div className="max-h-[620px] overflow-auto">

            <table className="min-w-[950px] w-full">

              <thead className="sticky top-0 z-10 bg-[#091725]">

                <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">

                  <th className="px-5 py-4">
                    Kategori
                  </th>

                  <th className="px-5 py-4">
                    Tercih
                  </th>

                  <th className="px-5 py-4">
                    Değer
                  </th>

                  <th className="px-5 py-4">
                    Güncelleme
                  </th>

                  <th className="px-5 py-4 text-right">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map(
                  (
                    row
                  ) => (
                    <tr
                      key={
                        row.id
                      }
                      className="border-b border-white/[.045] hover:bg-white/[.02]"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="grid h-9 w-9 place-items-center rounded-xl border border-orange-500/10 bg-orange-500/[.04] text-orange-300">
                            {categoryMeta[
                              row.category
                            ]?.icon ??
                              <FaBullseye />}
                          </div>

                          <span className="text-[9px] font-black">
                            {categoryLabel(
                              row.category
                            )}
                          </span>

                        </div>

                      </td>


                      <td className="px-5 py-4">
                        <div className="font-mono text-[9px] text-slate-400">
                          {row.preference_key}
                        </div>
                      </td>


                      <td className="max-w-[360px] px-5 py-4">
                        <div className="break-words text-[10px] font-bold text-slate-200">
                          {preferenceValue(
                            row
                          )}
                        </div>
                      </td>


                      <td className="px-5 py-4 text-[8px] text-slate-600">
                        {new Intl.DateTimeFormat(
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
                          new Date(
                            row.updated_at
                          )
                        )}
                      </td>


                      <td className="px-5 py-4 text-right">

                        <button
                          type="button"
                          disabled={
                            busy ===
                            row.id
                          }
                          onClick={() =>
                            void removePreference(
                              row.id
                            )
                          }
                          className="inline-grid h-9 w-9 place-items-center rounded-lg border border-red-500/10 text-red-300/70 hover:bg-red-500/[.05] disabled:opacity-40"
                        >
                          <FaTrash />
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>


      {modalOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f] shadow-2xl">

            <div className="flex items-center justify-between border-b border-white/[.07] p-5">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
                  CUSTOMER 360
                </div>

                <div className="mt-1 text-lg font-black">
                  Yeni Müşteri Tercihi
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-500"
              >
                <FaTimes />
              </button>

            </div>


            <div className="grid gap-4 p-5">

              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Kategori
                </span>

                <select
                  value={
                    formCategory
                  }
                  onChange={(
                    event
                  ) =>
                    setFormCategory(
                      event.target.value
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                >

                  {Object.entries(
                    categoryMeta
                  ).map(
                    ([
                      key,
                      meta,
                    ]) => (
                      <option
                        key={
                          key
                        }
                        value={
                          key
                        }
                      >
                        {meta.label}
                      </option>
                    )
                  )}

                </select>

              </label>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Tercih Adı
                </span>

                <input
                  value={
                    formKey
                  }
                  onChange={(
                    event
                  ) =>
                    setFormKey(
                      event.target.value
                    )
                  }
                  placeholder="Örn. hotel_type, room_view, destination"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px] outline-none focus:border-orange-500/40"
                />

              </label>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Tercih Değeri
                </span>

                <input
                  value={
                    formValue
                  }
                  onChange={(
                    event
                  ) =>
                    setFormValue(
                      event.target.value
                    )
                  }
                  placeholder="Örn. Deniz manzaralı, Ölüdeniz, VIP transfer..."
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px] outline-none focus:border-orange-500/40"
                />

              </label>


              <div className="rounded-xl border border-blue-500/10 bg-blue-500/[.035] p-4 text-[8px] leading-5 text-blue-200/70">
                Buraya yalnızca müşteriden öğrenilmiş gerçek tercihler kaydedilir. Otomatik tahmin veya sahte tercih oluşturulmaz.
              </div>


              <button
                type="button"
                disabled={
                  busy ===
                    "save" ||
                  !formKey.trim() ||
                  !formValue.trim()
                }
                onClick={() =>
                  void savePreference()
                }
                className="h-11 rounded-xl bg-orange-500 text-[10px] font-black text-white disabled:opacity-40"
              >
                {busy ===
                "save"
                  ? "Kaydediliyor..."
                  : "Tercihi Kaydet"}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}
