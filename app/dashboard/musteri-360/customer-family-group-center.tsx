"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaAddressBook,
  FaBirthdayCake,
  FaBriefcase,
  FaChild,
  FaEnvelope,
  FaExclamationTriangle,
  FaIdCard,
  FaLink,
  FaPhone,
  FaPlus,
  FaSearch,
  FaSuitcase,
  FaTimes,
  FaTrash,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";

import {
  addCustomer360GroupMember,
  addCustomer360Relationship,
  addCustomer360Traveler,
  createCustomer360Group,
  deleteCustomer360Group,
  deleteCustomer360Relationship,
  deleteCustomer360Traveler,
  loadCustomer360FamilyGroupSnapshot,
  removeCustomer360GroupMember,
  searchCustomer360LinkCandidates,
} from "@/lib/customer-360/repository";

import type {
  Customer360FamilyGroup,
  Customer360FamilyGroupSnapshot,
} from "@/lib/customer-360/repository";


type Props = {
  companyId: string;
  customerId: string;
};


type Candidate = {
  id: string;

  customer_code:
    string;

  full_name:
    string;

  phone:
    string | null;

  email:
    string | null;

  segment:
    string;
};


function date(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
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
        "2-digit",

      year:
        "numeric",
    }
  ).format(
    parsed
  );
}


function relationLabel(
  value:
    string
) {
  const map:
    Record<
      string,
      string
    > = {
      spouse:
        "Eş",

      child:
        "Çocuk",

      parent:
        "Anne / Baba",

      sibling:
        "Kardeş",

      relative:
        "Akraba",

      friend:
        "Arkadaş",

      colleague:
        "İş Arkadaşı",

      assistant:
        "Asistan",

      companion:
        "Seyahat Arkadaşı",

      other:
        "Diğer",
    };

  return map[
    value
  ] || value;
}


function groupLabel(
  value:
    string
) {
  const map:
    Record<
      string,
      string
    > = {
      travel:
        "Seyahat Grubu",

      family:
        "Aile",

      corporate:
        "Kurumsal",

      event:
        "Etkinlik",

      other:
        "Diğer",
    };

  return map[
    value
  ] || value;
}


export default function CustomerFamilyGroupCenter({
  companyId,
  customerId,
}: Props) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      Customer360FamilyGroupSnapshot | null
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
    useState(
      false
    );


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
    tab,
    setTab,
  ] =
    useState<
      "travelers" |
      "family" |
      "groups"
    >(
      "travelers"
    );


  const [
    modal,
    setModal,
  ] =
    useState<
      "traveler" |
      "relationship" |
      "group" |
      "member" |
      null
    >(
      null
    );


  const [
    travelerName,
    setTravelerName,
  ] =
    useState("");


  const [
    travelerRelation,
    setTravelerRelation,
  ] =
    useState(
      "companion"
    );


  const [
    travelerPhone,
    setTravelerPhone,
  ] =
    useState("");


  const [
    travelerEmail,
    setTravelerEmail,
  ] =
    useState("");


  const [
    travelerBirthDate,
    setTravelerBirthDate,
  ] =
    useState("");


  const [
    travelerNationality,
    setTravelerNationality,
  ] =
    useState("");


  const [
    travelerIdentityType,
    setTravelerIdentityType,
  ] =
    useState<
      "" |
      "tc" |
      "passport" |
      "other"
    >("");


  const [
    travelerIdentityNumber,
    setTravelerIdentityNumber,
  ] =
    useState("");


  const [
    candidateSearch,
    setCandidateSearch,
  ] =
    useState("");


  const [
    candidates,
    setCandidates,
  ] =
    useState<
      Candidate[]
    >(
      []
    );


  const [
    selectedCandidate,
    setSelectedCandidate,
  ] =
    useState<
      Candidate | null
    >(
      null
    );


  const [
    relationType,
    setRelationType,
  ] =
    useState(
      "spouse"
    );


  const [
    relationNote,
    setRelationNote,
  ] =
    useState("");


  const [
    groupName,
    setGroupName,
  ] =
    useState("");


  const [
    groupType,
    setGroupType,
  ] =
    useState<
      Customer360FamilyGroup["group_type"]
    >(
      "travel"
    );


  const [
    groupNote,
    setGroupNote,
  ] =
    useState("");


  const [
    groupRole,
    setGroupRole,
  ] =
    useState(
      "primary"
    );


  const [
    targetGroup,
    setTargetGroup,
  ] =
    useState<
      Customer360FamilyGroup | null
    >(
      null
    );


  const refresh =
    useCallback(
      async () => {
        const result =
          await loadCustomer360FamilyGroupSnapshot(
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


  useEffect(() => {
    if (
      modal !==
        "relationship" &&
      modal !==
        "member"
    ) {
      return;
    }


    const timer =
      window.setTimeout(
        () => {
          void (
            async () => {
              try {
                const result =
                  await searchCustomer360LinkCandidates(
                    companyId,
                    customerId,
                    candidateSearch
                  );

                setCandidates(
                  result
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
              }
            }
          )();
        },
        250
      );


    return () => {
      window.clearTimeout(
        timer
      );
    };

  }, [
    modal,
    companyId,
    customerId,
    candidateSearch,
  ]);


  const stats =
    useMemo(
      () => {
        const travelers =
          snapshot?.travelers ??
          [];

        const family =
          snapshot?.relationships ??
          [];

        const groups =
          snapshot?.groups ??
          [];

        const uniqueGroupMembers =
          new Set(
            groups.flatMap(
              (
                group
              ) =>
                group.members.map(
                  (
                    member
                  ) =>
                    member.customer_id
                )
            )
          );


        return {
          travelers:
            travelers.length,

          family:
            family.length,

          groups:
            groups.length,

          groupMembers:
            uniqueGroupMembers.size,
        };
      },
      [
        snapshot,
      ]
    );


  function closeModal() {
    setModal(
      null
    );

    setSelectedCandidate(
      null
    );

    setCandidateSearch(
      ""
    );

    setCandidates(
      []
    );

    setTargetGroup(
      null
    );
  }


  async function runAction(
    action:
      () => Promise<unknown>,
    message:
      string
  ) {
    setBusy(
      true
    );

    setError("");
    setNotice("");


    try {
      await action();

      await refresh();

      setNotice(
        message
      );

      closeModal();

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


  async function saveTraveler() {
    if (
      !travelerName.trim()
    ) {
      setError(
        "Yolcu adı gerekli."
      );

      return;
    }


    await runAction(
      () =>
        addCustomer360Traveler(
          {
            customerId,

            fullName:
              travelerName.trim(),

            relationshipLabel:
              travelerRelation,

            phone:
              travelerPhone,

            email:
              travelerEmail,

            birthDate:
              travelerBirthDate,

            nationality:
              travelerNationality,

            identityType:
              travelerIdentityType,

            identityNumber:
              travelerIdentityNumber,
          }
        ),
      "Yolcu / aile üyesi eklendi."
    );


    setTravelerName("");
    setTravelerPhone("");
    setTravelerEmail("");
    setTravelerBirthDate("");
    setTravelerNationality("");
    setTravelerIdentityType("");
    setTravelerIdentityNumber("");
  }


  async function saveRelationship() {
    if (
      !selectedCandidate
    ) {
      setError(
        "Bağlanacak müşteri seçilmeli."
      );

      return;
    }


    await runAction(
      () =>
        addCustomer360Relationship(
          {
            customerId,

            relatedCustomerId:
              selectedCandidate.id,

            relationType,

            note:
              relationNote,
          }
        ),
      "Müşteri ilişkisi oluşturuldu."
    );


    setRelationNote("");
  }


  async function saveGroup() {
    if (
      !groupName.trim()
    ) {
      setError(
        "Grup adı gerekli."
      );

      return;
    }


    await runAction(
      () =>
        createCustomer360Group(
          {
            customerId,

            name:
              groupName.trim(),

            groupType,

            note:
              groupNote,

            memberRole:
              groupRole,
          }
        ),
      "Yeni müşteri grubu oluşturuldu."
    );


    setGroupName("");
    setGroupNote("");
    setGroupRole(
      "primary"
    );
  }


  async function saveGroupMember() {
    if (
      !targetGroup ||
      !selectedCandidate
    ) {
      setError(
        "Grup ve müşteri seçilmeli."
      );

      return;
    }


    await runAction(
      () =>
        addCustomer360GroupMember(
          {
            groupId:
              targetGroup.id,

            customerId:
              selectedCandidate.id,

            memberRole:
              groupRole,
          }
        ),
      "Gruba yeni müşteri eklendi."
    );


    setGroupRole(
      "member"
    );
  }


  if (
    loading
  ) {
    return (
      <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-8 text-center text-[10px] text-slate-600">
        Yolcu, aile ve grup bağlantıları yükleniyor...
      </section>
    );
  }


  return (
    <>
      <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

        <div className="border-b border-white/[.07] p-5 lg:p-6">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <FaUsers className="text-orange-300" />

                <h2 className="text-sm font-black">
                  Yolcu, Aile & Grup Merkezi
                </h2>

              </div>


              <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-600">
                Ana müşterinin yolcularını, gerçek Customer 360 aile ilişkilerini ve birlikte seyahat eden gruplarını tek merkezden yönetin.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  setModal(
                    "traveler"
                  )
                }
                className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 text-[9px] font-black transition hover:border-orange-500/30"
              >
                <FaPlus />
                Yolcu Ekle
              </button>


              <button
                type="button"
                onClick={() =>
                  setModal(
                    "relationship"
                  )
                }
                className="flex h-10 items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.07] px-4 text-[9px] font-black text-orange-300"
              >
                <FaLink />
                Aile / İlişki Bağla
              </button>


              <button
                type="button"
                onClick={() =>
                  setModal(
                    "group"
                  )
                }
                className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[9px] font-black text-white"
              >
                <FaUserFriends />
                Grup Oluştur
              </button>

            </div>

          </div>


          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">

            {[
              {
                title:
                  "Bağlı Yolcu",

                value:
                  stats.travelers,

                icon:
                  <FaSuitcase />,
              },

              {
                title:
                  "Aile / İlişki",

                value:
                  stats.family,

                icon:
                  <FaLink />,
              },

              {
                title:
                  "Grup",

                value:
                  stats.groups,

                icon:
                  <FaUsers />,
              },

              {
                title:
                  "Grup Kişisi",

                value:
                  stats.groupMembers,

                icon:
                  <FaAddressBook />,
              },
            ].map(
              (
                item
              ) => (
                <article
                  key={
                    item.title
                  }
                  className="rounded-xl border border-white/[.07] bg-black/20 p-4"
                >

                  <div className="flex items-start justify-between">

                    <div>

                      <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                        {item.title}
                      </div>


                      <div className="mt-2 text-xl font-black">
                        {item.value}
                      </div>

                    </div>


                    <div className="text-orange-300">
                      {item.icon}
                    </div>

                  </div>

                </article>
              )
            )}

          </div>


          <div className="mt-5 flex gap-2 overflow-x-auto">

            {[
              [
                "travelers",
                "Yolcular",
              ],

              [
                "family",
                "Aile & Bağlantılar",
              ],

              [
                "groups",
                "Gruplar",
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
                    setTab(
                      value as
                        | "travelers"
                        | "family"
                        | "groups"
                    )
                  }
                  className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-[9px] font-black transition ${
                    tab ===
                    value
                      ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                      : "border-white/[.07] bg-black/20 text-slate-500"
                  }`}
                >
                  {label}
                </button>
              )
            )}

          </div>

        </div>


        {error && (
          <div className="flex items-center gap-2 border-b border-red-500/10 bg-red-500/[.05] px-5 py-4 text-[10px] font-bold text-red-300">
            <FaExclamationTriangle />
            {error}
          </div>
        )}


        {notice && (
          <div className="border-b border-emerald-500/10 bg-emerald-500/[.04] px-5 py-4 text-[10px] font-bold text-emerald-300">
            {notice}
          </div>
        )}


        {tab ===
          "travelers" && (
          <div className="max-h-[560px] overflow-auto">

            <table className="min-w-[1100px] w-full">

              <thead className="sticky top-0 z-10 bg-[#091725]">

                <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">

                  <th className="px-5 py-4">
                    Yolcu
                  </th>

                  <th className="px-5 py-4">
                    Yakınlık
                  </th>

                  <th className="px-5 py-4">
                    Doğum
                  </th>

                  <th className="px-5 py-4">
                    İletişim
                  </th>

                  <th className="px-5 py-4">
                    Uyruk
                  </th>

                  <th className="px-5 py-4">
                    Belge
                  </th>

                  <th className="px-5 py-4 text-right">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {(snapshot?.travelers ??
                  []).length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        7
                      }
                      className="p-12 text-center text-[10px] text-slate-600"
                    >
                      Henüz bağlı yolcu bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  snapshot?.travelers.map(
                    (
                      traveler
                    ) => (
                      <tr
                        key={
                          traveler.id
                        }
                        className="border-b border-white/[.045] hover:bg-white/[.02]"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="grid h-10 w-10 place-items-center rounded-xl border border-orange-500/15 bg-orange-500/[.06] text-orange-300">
                              {traveler.relationship_label ===
                              "child"
                                ? <FaChild />
                                : <FaSuitcase />}
                            </div>


                            <div>

                              <div className="text-[10px] font-black">
                                {traveler.full_name}
                              </div>


                              <div className="mt-1 text-[8px] text-slate-700">
                                Yolcu Profili
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-bold text-slate-400">
                          {relationLabel(
                            traveler.relationship_label ||
                              "companion"
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2 text-[9px] text-slate-400">
                            <FaBirthdayCake className="text-slate-700" />

                            {date(
                              traveler.birth_date
                            )}
                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] leading-5 text-slate-500">

                          <div className="flex items-center gap-2">
                            <FaPhone />
                            {traveler.phone ||
                              "—"}
                          </div>


                          <div className="flex items-center gap-2">
                            <FaEnvelope />
                            {traveler.email ||
                              "—"}
                          </div>

                        </td>


                        <td className="px-5 py-4 text-[9px] text-slate-400">
                          {traveler.nationality ||
                            "—"}
                        </td>


                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2 text-[8px] text-slate-500">

                            <FaIdCard />

                            {traveler.identity_type
                              ?.toUpperCase() ||
                              "—"}

                          </div>

                        </td>


                        <td className="px-5 py-4 text-right">

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `${traveler.full_name} yolcu kaydı silinsin mi?`
                                )
                              ) {
                                void runAction(
                                  () =>
                                    deleteCustomer360Traveler(
                                      traveler.id
                                    ),
                                  "Yolcu kaydı kaldırıldı."
                                );
                              }
                            }}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-500/15 bg-red-500/[.05] px-3 text-[8px] font-black text-red-300"
                          >
                            <FaTrash />
                            Kaldır
                          </button>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>
        )}


        {tab ===
          "family" && (
          <div className="max-h-[560px] overflow-auto">

            <table className="min-w-[1100px] w-full">

              <thead className="sticky top-0 z-10 bg-[#091725]">

                <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">

                  <th className="px-5 py-4">
                    Bağlı Müşteri
                  </th>

                  <th className="px-5 py-4">
                    İlişki
                  </th>

                  <th className="px-5 py-4">
                    Segment
                  </th>

                  <th className="px-5 py-4">
                    İletişim
                  </th>

                  <th className="px-5 py-4">
                    Not
                  </th>

                  <th className="px-5 py-4 text-right">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {(snapshot?.relationships ??
                  []).length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                      className="p-12 text-center text-[10px] text-slate-600"
                    >
                      Henüz Customer 360 müşteri ilişkisi bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  snapshot?.relationships.map(
                    (
                      relation
                    ) => (
                      <tr
                        key={
                          relation.id
                        }
                        className="border-b border-white/[.045] hover:bg-white/[.02]"
                      >

                        <td className="px-5 py-4">

                          <div className="text-[10px] font-black">
                            {relation.other_customer_name}
                          </div>


                          <div className="mt-1 text-[8px] font-bold text-orange-300">
                            {relation.other_customer_code}
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full border border-orange-500/15 bg-orange-500/[.07] px-2.5 py-1 text-[8px] font-black text-orange-300">
                            {relationLabel(
                              relation.relation_type
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full border border-white/[.07] bg-black/20 px-2.5 py-1 text-[8px] font-black uppercase text-slate-400">
                            {relation.other_customer_segment}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[8px] leading-5 text-slate-500">

                          <div>
                            {relation.other_customer_phone ||
                              "—"}
                          </div>


                          <div>
                            {relation.other_customer_email ||
                              "—"}
                          </div>

                        </td>


                        <td className="max-w-[260px] px-5 py-4 text-[9px] text-slate-500">
                          {relation.note ||
                            "—"}
                        </td>


                        <td className="px-5 py-4 text-right">

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Bu müşteri ilişkisi kaldırılsın mı?"
                                )
                              ) {
                                void runAction(
                                  () =>
                                    deleteCustomer360Relationship(
                                      relation.id
                                    ),
                                  "Müşteri ilişkisi kaldırıldı."
                                );
                              }
                            }}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-500/15 bg-red-500/[.05] px-3 text-[8px] font-black text-red-300"
                          >
                            <FaTrash />
                            Kaldır
                          </button>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>
        )}


        {tab ===
          "groups" && (
          <div className="p-5">

            {(snapshot?.groups ??
              []).length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-[10px] text-slate-600">
                Henüz grup bağlantısı bulunmuyor.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">

                {snapshot?.groups.map(
                  (
                    group
                  ) => (
                    <article
                      key={
                        group.id
                      }
                      className="overflow-hidden rounded-[22px] border border-white/[.07] bg-black/20"
                    >

                      <div className="flex items-start justify-between border-b border-white/[.06] p-5">

                        <div>

                          <div className="flex items-center gap-2">

                            {group.group_type ===
                            "corporate"
                              ? <FaBriefcase className="text-blue-300" />
                              : <FaUsers className="text-orange-300" />}


                            <div className="text-xs font-black">
                              {group.name}
                            </div>

                          </div>


                          <div className="mt-2 flex flex-wrap gap-2">

                            <span className="rounded-full border border-orange-500/15 bg-orange-500/[.07] px-2.5 py-1 text-[7px] font-black text-orange-300">
                              {groupLabel(
                                group.group_type
                              )}
                            </span>


                            <span className="rounded-full border border-white/[.07] bg-white/[.02] px-2.5 py-1 text-[7px] font-black text-slate-400">
                              {group.member_count} ÜYE
                            </span>

                          </div>

                        </div>


                        <div className="flex gap-2">

                          <button
                            type="button"
                            onClick={() => {
                              setTargetGroup(
                                group
                              );

                              setGroupRole(
                                "member"
                              );

                              setModal(
                                "member"
                              );
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-orange-500/15 bg-orange-500/[.06] text-orange-300"
                            title="Üye ekle"
                          >
                            <FaPlus />
                          </button>


                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `${group.name} grubu silinsin mi?`
                                )
                              ) {
                                void runAction(
                                  () =>
                                    deleteCustomer360Group(
                                      group.id
                                    ),
                                  "Grup kaldırıldı."
                                );
                              }
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/15 bg-red-500/[.05] text-red-300"
                            title="Grubu sil"
                          >
                            <FaTrash />
                          </button>

                        </div>

                      </div>


                      {group.note && (
                        <div className="border-b border-white/[.05] px-5 py-3 text-[9px] leading-5 text-slate-500">
                          {group.note}
                        </div>
                      )}


                      <div className="max-h-[270px] overflow-auto">

                        <table className="w-full">

                          <thead className="sticky top-0 bg-[#08131e]">

                            <tr className="text-left text-[7px] font-black uppercase tracking-[.11em] text-slate-700">

                              <th className="px-4 py-3">
                                Üye
                              </th>

                              <th className="px-4 py-3">
                                Rol
                              </th>

                              <th className="px-4 py-3 text-right">
                                İşlem
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {group.members.map(
                              (
                                member
                              ) => (
                                <tr
                                  key={
                                    member.membership_id
                                  }
                                  className="border-t border-white/[.045]"
                                >

                                  <td className="px-4 py-3">

                                    <div className="text-[9px] font-black">
                                      {member.full_name}
                                    </div>


                                    <div className="mt-1 text-[7px] text-slate-600">
                                      {member.customer_code}
                                    </div>

                                  </td>


                                  <td className="px-4 py-3 text-[8px] font-bold text-slate-400">
                                    {member.member_role ||
                                      "Üye"}
                                  </td>


                                  <td className="px-4 py-3 text-right">

                                    <button
                                      type="button"
                                      disabled={
                                        member.customer_id ===
                                        customerId
                                      }
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `${member.full_name} gruptan çıkarılsın mı?`
                                          )
                                        ) {
                                          void runAction(
                                            () =>
                                              removeCustomer360GroupMember(
                                                member.membership_id
                                              ),
                                            "Grup üyesi çıkarıldı."
                                          );
                                        }
                                      }}
                                      className="text-[8px] font-black text-red-300 disabled:cursor-not-allowed disabled:text-slate-800"
                                    >
                                      Çıkar
                                    </button>

                                  </td>

                                </tr>
                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                    </article>
                  )
                )}

              </div>
            )}

          </div>
        )}

      </section>


      {modal && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[28px] border border-white/10 bg-[#07131f] shadow-2xl">

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[.07] bg-[#07131f] p-5">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
                  CUSTOMER 360
                </div>


                <div className="mt-1 text-lg font-black">

                  {modal ===
                  "traveler"
                    ? "Yolcu / Aile Üyesi Ekle"
                    : modal ===
                        "relationship"
                      ? "Customer 360 İlişkisi"
                      : modal ===
                          "group"
                        ? "Yeni Grup"
                        : `${targetGroup?.name || "Grup"} · Üye Ekle`}

                </div>

              </div>


              <button
                type="button"
                onClick={
                  closeModal
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-500"
              >
                <FaTimes />
              </button>

            </div>


            <div className="p-5">

              {modal ===
                "traveler" && (
                <div className="grid gap-4 sm:grid-cols-2">

                  <label className="sm:col-span-2">
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Ad Soyad
                    </span>

                    <input
                      value={
                        travelerName
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerName(
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px] outline-none focus:border-orange-500/40"
                    />
                  </label>


                  <label>
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Yakınlık
                    </span>

                    <select
                      value={
                        travelerRelation
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerRelation(
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    >
                      <option value="spouse">
                        Eş
                      </option>

                      <option value="child">
                        Çocuk
                      </option>

                      <option value="parent">
                        Anne / Baba
                      </option>

                      <option value="sibling">
                        Kardeş
                      </option>

                      <option value="relative">
                        Akraba
                      </option>

                      <option value="companion">
                        Seyahat Arkadaşı
                      </option>

                      <option value="friend">
                        Arkadaş
                      </option>

                      <option value="other">
                        Diğer
                      </option>
                    </select>
                  </label>


                  <label>
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Doğum Tarihi
                    </span>

                    <input
                      type="date"
                      value={
                        travelerBirthDate
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerBirthDate(
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    />
                  </label>


                  <label>
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Telefon
                    </span>

                    <input
                      value={
                        travelerPhone
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerPhone(
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    />
                  </label>


                  <label>
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      E-posta
                    </span>

                    <input
                      value={
                        travelerEmail
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerEmail(
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    />
                  </label>


                  <label>
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Uyruk
                    </span>

                    <input
                      value={
                        travelerNationality
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerNationality(
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    />
                  </label>


                  <label>
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Belge Türü
                    </span>

                    <select
                      value={
                        travelerIdentityType
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerIdentityType(
                          event.target.value as
                            | ""
                            | "tc"
                            | "passport"
                            | "other"
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    >
                      <option value="">
                        Seçilmedi
                      </option>

                      <option value="tc">
                        T.C.
                      </option>

                      <option value="passport">
                        Pasaport
                      </option>

                      <option value="other">
                        Diğer
                      </option>
                    </select>
                  </label>


                  <label className="sm:col-span-2">
                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Kimlik / Pasaport Numarası
                    </span>

                    <input
                      value={
                        travelerIdentityNumber
                      }
                      onChange={(
                        event
                      ) =>
                        setTravelerIdentityNumber(
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    />
                  </label>


                  <button
                    type="button"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      void saveTraveler()
                    }
                    className="h-11 rounded-xl bg-orange-500 text-[10px] font-black text-white sm:col-span-2"
                  >
                    Yolcuyu Kaydet
                  </button>

                </div>
              )}


              {(modal ===
                "relationship" ||
                modal ===
                  "member") && (
                <div>

                  <div className="relative">

                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />

                    <input
                      value={
                        candidateSearch
                      }
                      onChange={(
                        event
                      ) => {
                        setCandidateSearch(
                          event.target.value
                        );

                        setSelectedCandidate(
                          null
                        );
                      }}
                      placeholder="Müşteri adı, telefon, e-posta veya kod ara..."
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] outline-none focus:border-orange-500/40"
                    />

                  </div>


                  <div className="mt-3 max-h-[250px] overflow-auto rounded-xl border border-white/[.07]">

                    {candidates.map(
                      (
                        candidate
                      ) => (
                        <button
                          type="button"
                          key={
                            candidate.id
                          }
                          onClick={() =>
                            setSelectedCandidate(
                              candidate
                            )
                          }
                          className={`flex w-full items-center justify-between border-b border-white/[.05] p-4 text-left transition ${
                            selectedCandidate?.id ===
                            candidate.id
                              ? "bg-orange-500/10"
                              : "hover:bg-white/[.02]"
                          }`}
                        >

                          <div>

                            <div className="text-[10px] font-black">
                              {candidate.full_name}
                            </div>


                            <div className="mt-1 text-[8px] text-slate-600">
                              {candidate.customer_code}
                              {" · "}
                              {candidate.phone ||
                                candidate.email ||
                                "İletişim yok"}
                            </div>

                          </div>


                          <span className="text-[7px] font-black uppercase text-orange-300">
                            {candidate.segment}
                          </span>

                        </button>
                      )
                    )}

                  </div>


                  {modal ===
                    "relationship" ? (
                    <div className="mt-4 grid gap-4">

                      <label>

                        <span className="text-[8px] font-black uppercase text-slate-600">
                          İlişki Türü
                        </span>

                        <select
                          value={
                            relationType
                          }
                          onChange={(
                            event
                          ) =>
                            setRelationType(
                              event.target.value
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                        >
                          <option value="spouse">
                            Eş
                          </option>

                          <option value="child">
                            Çocuk
                          </option>

                          <option value="parent">
                            Anne / Baba
                          </option>

                          <option value="sibling">
                            Kardeş
                          </option>

                          <option value="relative">
                            Akraba
                          </option>

                          <option value="friend">
                            Arkadaş
                          </option>

                          <option value="colleague">
                            İş Arkadaşı
                          </option>

                          <option value="assistant">
                            Asistan
                          </option>

                          <option value="companion">
                            Seyahat Arkadaşı
                          </option>

                          <option value="other">
                            Diğer
                          </option>
                        </select>

                      </label>


                      <label>

                        <span className="text-[8px] font-black uppercase text-slate-600">
                          Not
                        </span>

                        <textarea
                          value={
                            relationNote
                          }
                          onChange={(
                            event
                          ) =>
                            setRelationNote(
                              event.target.value
                            )
                          }
                          rows={
                            3
                          }
                          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#030a11] p-4 text-[10px]"
                        />

                      </label>


                      <button
                        type="button"
                        disabled={
                          busy ||
                          !selectedCandidate
                        }
                        onClick={() =>
                          void saveRelationship()
                        }
                        className="h-11 rounded-xl bg-orange-500 text-[10px] font-black text-white disabled:opacity-40"
                      >
                        İlişkiyi Kaydet
                      </button>

                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4">

                      <label>

                        <span className="text-[8px] font-black uppercase text-slate-600">
                          Grup Rolü
                        </span>

                        <input
                          value={
                            groupRole
                          }
                          onChange={(
                            event
                          ) =>
                            setGroupRole(
                              event.target.value
                            )
                          }
                          placeholder="Üye, aile, yönetici, misafir..."
                          className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                        />

                      </label>


                      <button
                        type="button"
                        disabled={
                          busy ||
                          !selectedCandidate
                        }
                        onClick={() =>
                          void saveGroupMember()
                        }
                        className="h-11 rounded-xl bg-orange-500 text-[10px] font-black text-white disabled:opacity-40"
                      >
                        Gruba Ekle
                      </button>

                    </div>
                  )}

                </div>
              )}


              {modal ===
                "group" && (
                <div className="grid gap-4">

                  <label>

                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Grup Adı
                    </span>

                    <input
                      value={
                        groupName
                      }
                      onChange={(
                        event
                      ) =>
                        setGroupName(
                          event.target.value
                        )
                      }
                      placeholder="Örn. Keskin Ailesi · Dubai 2026"
                      className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                    />

                  </label>


                  <div className="grid gap-4 sm:grid-cols-2">

                    <label>

                      <span className="text-[8px] font-black uppercase text-slate-600">
                        Grup Türü
                      </span>

                      <select
                        value={
                          groupType
                        }
                        onChange={(
                          event
                        ) =>
                          setGroupType(
                            event.target.value as
                              Customer360FamilyGroup["group_type"]
                          )
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                      >
                        <option value="travel">
                          Seyahat
                        </option>

                        <option value="family">
                          Aile
                        </option>

                        <option value="corporate">
                          Kurumsal
                        </option>

                        <option value="event">
                          Etkinlik
                        </option>

                        <option value="other">
                          Diğer
                        </option>
                      </select>

                    </label>


                    <label>

                      <span className="text-[8px] font-black uppercase text-slate-600">
                        Ana Müşteri Rolü
                      </span>

                      <input
                        value={
                          groupRole
                        }
                        onChange={(
                          event
                        ) =>
                          setGroupRole(
                            event.target.value
                          )
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                      />

                    </label>

                  </div>


                  <label>

                    <span className="text-[8px] font-black uppercase text-slate-600">
                      Grup Notu
                    </span>

                    <textarea
                      value={
                        groupNote
                      }
                      onChange={(
                        event
                      ) =>
                        setGroupNote(
                          event.target.value
                        )
                      }
                      rows={
                        3
                      }
                      className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#030a11] p-4 text-[10px]"
                    />

                  </label>


                  <button
                    type="button"
                    disabled={
                      busy ||
                      !groupName.trim()
                    }
                    onClick={() =>
                      void saveGroup()
                    }
                    className="h-11 rounded-xl bg-orange-500 text-[10px] font-black text-white disabled:opacity-40"
                  >
                    Grubu Oluştur
                  </button>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </>
  );
}
