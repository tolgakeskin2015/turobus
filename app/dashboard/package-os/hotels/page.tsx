"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";


type Tab =
  | "general"
  | "gallery"
  | "rooms"
  | "rates"
  | "promotions"
  | "children"
  | "api";


type Hotel = {
  id: string;
  company_id: string;
  supplier_id: string | null;
  name: string;
  city: string | null;
  district: string | null;
  star_rating: number | null;
  description: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  source_type:
    | "manual"
    | "hotelrunner"
    | "elektra"
    | "booking"
    | "custom_api";
  external_hotel_id: string | null;
  external_source_name: string | null;
  last_synced_at: string | null;
  address: string | null;
};


type Supplier = {
  id: string;
  name: string;
  supplier_type: string;
};


type Media = {
  id: string;
  media_type: "image" | "video";
  url: string;
  title: string | null;
  is_cover: boolean;
  sort_order: number;
};


type RoomType = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  size_m2: number | null;
  bed_type: string | null;
  external_room_id: string | null;
};


type Rate = {
  id: string;
  room_type_id: string | null;
  room_type_name: string;
  board_type: string;
  valid_from: string;
  valid_to: string;
  occupancy_adults: number;
  occupancy_children: number;
  nightly_cost: number;
  nightly_sale_price: number | null;
  currency: string;
  allotment: number | null;
  minimum_stay: number;
  stop_sale: boolean;
  price_input_type:
    | "net"
    | "list_discount";
  list_price: number | null;
  agency_discount_percent: number | null;
  source_type: string;
  external_rate_id: string | null;
  release_days: number;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
};


type Promotion = {
  id: string;
  name: string;
  promotion_type: string;
  discount_type:
    | "percent"
    | "fixed";
  discount_value: number;
  booking_from: string | null;
  booking_to: string | null;
  stay_from: string | null;
  stay_to: string | null;
  minimum_nights: number;
  combinable: boolean;
};


type ChildPolicy = {
  id: string;
  room_type_id: string | null;
  child_order: number;
  age_from: number;
  age_to: number;
  pricing_type:
    | "free"
    | "percent"
    | "fixed";
  value: number;
};


type Integration = {
  id: string;
  provider: string;
  display_name: string;
  external_account_id: string | null;
  base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
};


type ContractData = {
  hotel: Hotel;
  media: Media[];
  room_types: RoomType[];
  rates: Rate[];
  promotions: Promotion[];
  child_policies: ChildPolicy[];
  integrations: Integration[];
};


const sourceLabels:
  Record<string, string> = {
    manual:
      "Manuel",
    hotelrunner:
      "HotelRunner",
    elektra:
      "Elektra",
    booking:
      "Booking / Connectivity",
    custom_api:
      "Özel API",
  };


const boardLabels:
  Record<string, string> = {
    room_only:
      "Sadece Oda",
    breakfast:
      "Kahvaltı Dahil",
    half_board:
      "Yarım Pansiyon",
    full_board:
      "Tam Pansiyon",
    all_inclusive:
      "Her Şey Dahil",
    ultra_all_inclusive:
      "Ultra Her Şey Dahil",
    other:
      "Diğer",
  };


const promotionLabels:
  Record<string, string> = {
    early_booking:
      "Erken Rezervasyon / EB",
    campaign:
      "Kampanya",
    long_stay:
      "Uzun Konaklama",
    last_minute:
      "Son Dakika",
    special:
      "Özel İndirim",
  };


function money(
  value:
    number |
    null |
    undefined
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(
      value ?? 0
    )
  );
}


function num(
  value: string
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}


export default function PackageHotelsPage() {

  const [
    membership,
    setMembership,
  ] =
    useState<
      CurrentMembership |
      null
    >(null);


  const [
    hotels,
    setHotels,
  ] =
    useState<Hotel[]>(
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
    selectedHotelId,
    setSelectedHotelId,
  ] =
    useState("");


  const [
    contract,
    setContract,
  ] =
    useState<
      ContractData |
      null
    >(null);


  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "general"
    );


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
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    hotelName,
    setHotelName,
  ] =
    useState("");


  const [
    hotelCity,
    setHotelCity,
  ] =
    useState("");


  const [
    hotelDistrict,
    setHotelDistrict,
  ] =
    useState("");


  const [
    hotelStars,
    setHotelStars,
  ] =
    useState("");


  const [
    hotelSupplierId,
    setHotelSupplierId,
  ] =
    useState("");


  const [
    hotelSource,
    setHotelSource,
  ] =
    useState<
      Hotel["source_type"]
    >("manual");


  const [
    hotelExternalId,
    setHotelExternalId,
  ] =
    useState("");


  const [
    hotelDescription,
    setHotelDescription,
  ] =
    useState("");


  const [
    hotelAddress,
    setHotelAddress,
  ] =
    useState("");


  const [
    hotelCoverUrl,
    setHotelCoverUrl,
  ] =
    useState("");


  const [
    hotelVideoUrl,
    setHotelVideoUrl,
  ] =
    useState("");


  const [
    mediaUrl,
    setMediaUrl,
  ] =
    useState("");


  const [
    mediaTitle,
    setMediaTitle,
  ] =
    useState("");


  const [
    mediaType,
    setMediaType,
  ] =
    useState<
      "image" |
      "video"
    >("image");


  const [
    mediaCover,
    setMediaCover,
  ] =
    useState(false);


  const [
    roomName,
    setRoomName,
  ] =
    useState("");


  const [
    roomCode,
    setRoomCode,
  ] =
    useState("");


  const [
    roomAdults,
    setRoomAdults,
  ] =
    useState("2");


  const [
    roomChildren,
    setRoomChildren,
  ] =
    useState("0");


  const [
    roomSize,
    setRoomSize,
  ] =
    useState("");


  const [
    roomBed,
    setRoomBed,
  ] =
    useState("");


  const [
    roomDescription,
    setRoomDescription,
  ] =
    useState("");


  const [
    rateRoomId,
    setRateRoomId,
  ] =
    useState("");


  const [
    rateBoard,
    setRateBoard,
  ] =
    useState(
      "half_board"
    );


  const [
    rateFrom,
    setRateFrom,
  ] =
    useState("");


  const [
    rateTo,
    setRateTo,
  ] =
    useState("");


  const [
    ratePriceType,
    setRatePriceType,
  ] =
    useState<
      "net" |
      "list_discount"
    >("net");


  const [
    rateNet,
    setRateNet,
  ] =
    useState("");


  const [
    rateList,
    setRateList,
  ] =
    useState("");


  const [
    rateDiscount,
    setRateDiscount,
  ] =
    useState("");


  const [
    rateAllotment,
    setRateAllotment,
  ] =
    useState("");


  const [
    rateMinStay,
    setRateMinStay,
  ] =
    useState("1");


  const [
    rateReleaseDays,
    setRateReleaseDays,
  ] =
    useState("0");


  const [
    rateStopSale,
    setRateStopSale,
  ] =
    useState(false);


  const [
    promotionName,
    setPromotionName,
  ] =
    useState("");


  const [
    promotionType,
    setPromotionType,
  ] =
    useState(
      "early_booking"
    );


  const [
    promotionDiscountType,
    setPromotionDiscountType,
  ] =
    useState<
      "percent" |
      "fixed"
    >("percent");


  const [
    promotionValue,
    setPromotionValue,
  ] =
    useState("");


  const [
    promotionBookingFrom,
    setPromotionBookingFrom,
  ] =
    useState("");


  const [
    promotionBookingTo,
    setPromotionBookingTo,
  ] =
    useState("");


  const [
    promotionStayFrom,
    setPromotionStayFrom,
  ] =
    useState("");


  const [
    promotionStayTo,
    setPromotionStayTo,
  ] =
    useState("");


  const [
    promotionMinNights,
    setPromotionMinNights,
  ] =
    useState("1");


  const [
    childRoomId,
    setChildRoomId,
  ] =
    useState("");


  const [
    childOrder,
    setChildOrder,
  ] =
    useState("1");


  const [
    childAgeFrom,
    setChildAgeFrom,
  ] =
    useState("0");


  const [
    childAgeTo,
    setChildAgeTo,
  ] =
    useState("11.99");


  const [
    childPricingType,
    setChildPricingType,
  ] =
    useState<
      "free" |
      "percent" |
      "fixed"
    >("free");


  const [
    childValue,
    setChildValue,
  ] =
    useState("0");


  const [
    integrationProvider,
    setIntegrationProvider,
  ] =
    useState(
      "hotelrunner"
    );


  const [
    integrationName,
    setIntegrationName,
  ] =
    useState("");


  const [
    integrationAccount,
    setIntegrationAccount,
  ] =
    useState("");


  const [
    integrationBaseUrl,
    setIntegrationBaseUrl,
  ] =
    useState("");


  const canManage =
    membership
      ? [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ].includes(
          membership.role
        )
      : false;


  const filteredHotels =
    useMemo(
      () => {

        const q =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        if (!q) {
          return hotels;
        }


        return hotels.filter(
          hotel =>
            [
              hotel.name,
              hotel.city,
              hotel.district,
            ]
              .filter(
                Boolean
              )
              .some(
                value =>
                  String(
                    value
                  )
                    .toLocaleLowerCase(
                      "tr-TR"
                    )
                    .includes(
                      q
                    )
              )
        );

      },
      [
        hotels,
        search,
      ]
    );


  const calculatedNet =
    ratePriceType ===
    "list_discount"

      ? Math.max(
          0,
          num(
            rateList
          ) *
            (
              1 -
              Math.min(
                100,
                Math.max(
                  0,
                  num(
                    rateDiscount
                  )
                )
              ) /
              100
            )
        )

      : Math.max(
          0,
          num(
            rateNet
          )
        );


  const loadHotels =
    useCallback(
      async (
        companyId:
          string
      ) => {

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "package_catalog_hotels"
            )
            .select(
              "id,company_id,supplier_id,name,city,district,star_rating,description,cover_image_url,video_url,source_type,external_hotel_id,external_source_name,last_synced_at,address"
            )
            .eq(
              "company_id",
              companyId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );


        if (error) {
          throw error;
        }


        setHotels(
          (
            data ??
            []
          ) as Hotel[]
        );
      },
      []
    );


  const loadSuppliers =
    useCallback(
      async (
        companyId:
          string
      ) => {

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "suppliers"
            )
            .select(
              "id,name,supplier_type"
            )
            .eq(
              "company_id",
              companyId
            )
            .eq(
              "is_active",
              true
            )
            .order(
              "name"
            );


        if (error) {
          console.error(
            error
          );
          return;
        }


        setSuppliers(
          (
            data ??
            []
          ) as Supplier[]
        );
      },
      []
    );


  const loadContract =
    useCallback(
      async (
        hotelId:
          string
      ) => {

        if (!hotelId) {

          setContract(
            null
          );

          return;
        }


        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_hotel_contract_admin",
            {
              p_hotel_id:
                hotelId,
            }
          );


        if (error) {

          setErrorMessage(
            error.message
          );

          return;
        }


        setContract(
          data as ContractData
        );
      },
      []
    );


  useEffect(
    () => {

      async function initialize() {

        try {

          const {
            data: {
              user,
            },
          } =
            await supabase
              .auth
              .getUser();


          if (!user) {

            setErrorMessage(
              "Kullanıcı oturumu bulunamadı."
            );

            return;
          }


          const current =
            await getCurrentMembership(
              user.id
            );


          if (!current) {

            setErrorMessage(
              "Aktif şirket üyeliği bulunamadı."
            );

            return;
          }


          setMembership(
            current
          );


          if (
            ![
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ].includes(
              current.role
            )
          ) {

            return;
          }


          await Promise.all([
            loadHotels(
              current.company_id
            ),

            loadSuppliers(
              current.company_id
            ),
          ]);

        } catch (
          error
        ) {

          console.error(
            error
          );

          setErrorMessage(
            error instanceof
            Error

              ? error.message

              : "Otel yönetimi yüklenemedi."
          );

        } finally {

          setLoading(
            false
          );
        }
      }


      void initialize();

    },
    [
      loadHotels,
      loadSuppliers,
    ]
  );


  useEffect(
    () => {

      if (
        selectedHotelId &&
        canManage
      ) {

        void loadContract(
          selectedHotelId
        );

      } else {

        setContract(
          null
        );
      }

    },
    [
      selectedHotelId,
      canManage,
      loadContract,
    ]
  );


  async function refresh() {

    if (!membership) {
      return;
    }


    await loadHotels(
      membership.company_id
    );


    if (
      selectedHotelId
    ) {

      await loadContract(
        selectedHotelId
      );
    }
  }


  function clearMessages() {

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );
  }


  async function createHotel(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (!membership) {
      return;
    }


    clearMessages();


    if (
      !hotelName.trim()
    ) {

      setErrorMessage(
        "Otel adı zorunludur."
      );

      return;
    }


    setSaving(
      true
    );


    const {
      data,
      error,
    } =
      await supabase
        .from(
          "package_catalog_hotels"
        )
        .insert({
          company_id:
            membership.company_id,

          supplier_id:
            hotelSupplierId ||
            null,

          name:
            hotelName.trim(),

          city:
            hotelCity.trim() ||
            null,

          district:
            hotelDistrict.trim() ||
            null,

          star_rating:
            hotelStars
              ? num(
                  hotelStars
                )
              : null,

          source_type:
            hotelSource,

          external_hotel_id:
            hotelExternalId.trim() ||
            null,

          external_source_name:
            sourceLabels[
              hotelSource
            ] ||
            hotelSource,

          description:
            hotelDescription.trim() ||
            null,

          address:
            hotelAddress.trim() ||
            null,

          cover_image_url:
            hotelCoverUrl.trim() ||
            null,

          video_url:
            hotelVideoUrl.trim() ||
            null,

          currency:
            "TRY",

          is_active:
            true,

          updated_at:
            new Date()
              .toISOString(),
        })
        .select(
          "id"
        )
        .single();


    if (
      error ||
      !data
    ) {

      setErrorMessage(
        error?.message ||
        "Otel kaydedilemedi."
      );

      setSaving(
        false
      );

      return;
    }


    setSuccessMessage(
      "Otel kaydedildi."
    );


    setHotelName("");
    setHotelCity("");
    setHotelDistrict("");
    setHotelStars("");
    setHotelSupplierId("");
    setHotelSource(
      "manual"
    );
    setHotelExternalId("");
    setHotelDescription("");
    setHotelAddress("");
    setHotelCoverUrl("");
    setHotelVideoUrl("");


    await loadHotels(
      membership.company_id
    );


    setSelectedHotelId(
      data.id
    );


    setSaving(
      false
    );
  }


  async function addMedia(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !selectedHotelId
    ) {
      return;
    }


    clearMessages();


    if (
      !mediaUrl.trim()
    ) {

      setErrorMessage(
        "Fotoğraf veya video URL zorunludur."
      );

      return;
    }


    setSaving(
      true
    );


    if (mediaCover) {

      await supabase
        .from(
          "package_hotel_media"
        )
        .update({
          is_cover:
            false,
        })
        .eq(
          "company_id",
          membership.company_id
        )
        .eq(
          "package_hotel_id",
          selectedHotelId
        );
    }


    const {
      error,
    } =
      await supabase
        .from(
          "package_hotel_media"
        )
        .insert({
          company_id:
            membership.company_id,

          package_hotel_id:
            selectedHotelId,

          media_type:
            mediaType,

          url:
            mediaUrl.trim(),

          title:
            mediaTitle.trim() ||
            null,

          is_cover:
            mediaCover,

          source_type:
            "manual",
        });


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    if (
      mediaCover &&
      mediaType ===
        "image"
    ) {

      await supabase
        .from(
          "package_catalog_hotels"
        )
        .update({
          cover_image_url:
            mediaUrl.trim(),

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          selectedHotelId
        )
        .eq(
          "company_id",
          membership.company_id
        );
    }


    setMediaUrl("");
    setMediaTitle("");
    setMediaCover(false);

    setSuccessMessage(
      "Medya eklendi."
    );


    await refresh();

    setSaving(
      false
    );
  }


  async function addRoom(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !selectedHotelId
    ) {
      return;
    }


    clearMessages();


    if (
      !roomName.trim()
    ) {

      setErrorMessage(
        "Oda tipi adı zorunludur."
      );

      return;
    }


    const adults =
      Math.max(
        1,
        num(
          roomAdults
        )
      );

    const children =
      Math.max(
        0,
        num(
          roomChildren
        )
      );


    setSaving(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "package_hotel_room_types"
        )
        .insert({
          company_id:
            membership.company_id,

          package_hotel_id:
            selectedHotelId,

          name:
            roomName.trim(),

          code:
            roomCode.trim() ||
            null,

          description:
            roomDescription.trim() ||
            null,

          max_adults:
            adults,

          max_children:
            children,

          max_occupancy:
            adults +
            children,

          size_m2:
            roomSize
              ? num(
                  roomSize
                )
              : null,

          bed_type:
            roomBed.trim() ||
            null,

          source_type:
            "manual",

          is_active:
            true,
        });


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setRoomName("");
    setRoomCode("");
    setRoomAdults("2");
    setRoomChildren("0");
    setRoomSize("");
    setRoomBed("");
    setRoomDescription("");


    setSuccessMessage(
      "Oda tipi eklendi."
    );


    await refresh();

    setSaving(
      false
    );
  }


  async function addRate(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !selectedHotelId ||
      !contract
    ) {
      return;
    }


    clearMessages();


    const room =
      contract.room_types
        .find(
          item =>
            item.id ===
            rateRoomId
        );


    if (
      !room ||
      !rateFrom ||
      !rateTo
    ) {

      setErrorMessage(
        "Oda tipi ve fiyat dönemi tarihleri zorunludur."
      );

      return;
    }


    if (
      rateTo <
      rateFrom
    ) {

      setErrorMessage(
        "Bitiş tarihi başlangıç tarihinden önce olamaz."
      );

      return;
    }


    setSaving(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "package_hotel_rates"
        )
        .insert({
          company_id:
            membership.company_id,

          package_hotel_id:
            selectedHotelId,

          room_type_id:
            room.id,

          room_type_name:
            room.name,

          board_type:
            rateBoard,

          valid_from:
            rateFrom,

          valid_to:
            rateTo,

          occupancy_adults:
            room.max_adults,

          occupancy_children:
            room.max_children,

          price_input_type:
            ratePriceType,

          nightly_cost:
            ratePriceType ===
            "net"
              ? calculatedNet
              : 0,

          list_price:
            ratePriceType ===
            "list_discount"
              ? num(
                  rateList
                )
              : null,

          agency_discount_percent:
            ratePriceType ===
            "list_discount"
              ? num(
                  rateDiscount
                )
              : null,

          nightly_sale_price:
            null,

          currency:
            "TRY",

          allotment:
            rateAllotment
              ? num(
                  rateAllotment
                )
              : null,

          minimum_stay:
            Math.max(
              1,
              num(
                rateMinStay
              )
            ),

          release_days:
            Math.max(
              0,
              num(
                rateReleaseDays
              )
            ),

          stop_sale:
            rateStopSale,

          closed_to_arrival:
            false,

          closed_to_departure:
            false,

          source_type:
            "manual",

          is_active:
            true,

          updated_at:
            new Date()
              .toISOString(),
        });


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setRateRoomId("");
    setRateFrom("");
    setRateTo("");
    setRateNet("");
    setRateList("");
    setRateDiscount("");
    setRateAllotment("");
    setRateMinStay("1");
    setRateReleaseDays("0");
    setRateStopSale(false);


    setSuccessMessage(
      "Kontrat fiyat dönemi eklendi."
    );


    await refresh();

    setSaving(
      false
    );
  }


  async function addPromotion(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !selectedHotelId
    ) {
      return;
    }


    clearMessages();


    if (
      !promotionName.trim()
    ) {

      setErrorMessage(
        "Kampanya adı zorunludur."
      );

      return;
    }


    setSaving(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "package_hotel_promotions"
        )
        .insert({
          company_id:
            membership.company_id,

          package_hotel_id:
            selectedHotelId,

          name:
            promotionName.trim(),

          promotion_type:
            promotionType,

          discount_type:
            promotionDiscountType,

          discount_value:
            Math.max(
              0,
              num(
                promotionValue
              )
            ),

          booking_from:
            promotionBookingFrom ||
            null,

          booking_to:
            promotionBookingTo ||
            null,

          stay_from:
            promotionStayFrom ||
            null,

          stay_to:
            promotionStayTo ||
            null,

          minimum_nights:
            Math.max(
              1,
              num(
                promotionMinNights
              )
            ),

          combinable:
            false,

          priority:
            100,

          is_active:
            true,
        });


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setPromotionName("");
    setPromotionValue("");
    setPromotionBookingFrom("");
    setPromotionBookingTo("");
    setPromotionStayFrom("");
    setPromotionStayTo("");
    setPromotionMinNights("1");


    setSuccessMessage(
      "EB / kampanya eklendi."
    );


    await refresh();

    setSaving(
      false
    );
  }


  async function addChildPolicy(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (
      !membership ||
      !selectedHotelId
    ) {
      return;
    }


    clearMessages();


    setSaving(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "package_hotel_child_policies"
        )
        .insert({
          company_id:
            membership.company_id,

          package_hotel_id:
            selectedHotelId,

          room_type_id:
            childRoomId ||
            null,

          child_order:
            Math.max(
              1,
              num(
                childOrder
              )
            ),

          age_from:
            Math.max(
              0,
              num(
                childAgeFrom
              )
            ),

          age_to:
            Math.max(
              0,
              num(
                childAgeTo
              )
            ),

          pricing_type:
            childPricingType,

          value:
            childPricingType ===
            "free"
              ? 0
              : Math.max(
                  0,
                  num(
                    childValue
                  )
                ),

          is_active:
            true,
        });


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setChildRoomId("");
    setChildOrder("1");
    setChildAgeFrom("0");
    setChildAgeTo("11.99");
    setChildPricingType(
      "free"
    );
    setChildValue("0");


    setSuccessMessage(
      "Çocuk fiyat politikası eklendi."
    );


    await refresh();

    setSaving(
      false
    );
  }


  async function addIntegration(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (!membership) {
      return;
    }


    clearMessages();


    if (
      !integrationName.trim()
    ) {

      setErrorMessage(
        "Bağlantı adı zorunludur."
      );

      return;
    }


    setSaving(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "package_hotel_integrations"
        )
        .insert({
          company_id:
            membership.company_id,

          provider:
            integrationProvider,

          display_name:
            integrationName.trim(),

          external_account_id:
            integrationAccount.trim() ||
            null,

          base_url:
            integrationBaseUrl.trim() ||
            null,

          status:
            "draft",

          settings:
            {},
        });


    if (error) {

      setErrorMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setIntegrationName("");
    setIntegrationAccount("");
    setIntegrationBaseUrl("");


    setSuccessMessage(
      "API bağlantı kaydı oluşturuldu."
    );


    if (
      selectedHotelId
    ) {

      await refresh();
    }


    setSaving(
      false
    );
  }


  if (loading) {

    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Otel yönetimi yükleniyor...
      </main>
    );
  }


  if (
    membership &&
    !canManage
  ) {

    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">

        <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-slate-900 p-8">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            TUROBUS PACKAGE OS
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Otel Kontrat Yönetimi
          </h1>

          <p className="mt-4 leading-7 text-slate-400">
            Bu alan kontrat, tedarikçi ve maliyet bilgileri içerir.
            Satış danışmanı bu verilere erişemez.
          </p>

          <Link
            href="/dashboard/package-os/builder"
            className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-3 font-black"
          >
            Paket Oluşturma Ekranına Dön
          </Link>

        </div>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-[1600px]">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS HOTEL CONTRACT ENGINE
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Otel Yönetim Merkezi
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Otelleri sisteme ekleyin; oda tiplerini, kontrat fiyatlarını,
              erken rezervasyon dönemlerini, çocuk politikalarını ve API
              bağlantılarını tek merkezden yönetin.
            </p>

          </div>

          <Link
            href="/dashboard/package-os"
            className="rounded-xl border border-white/10 px-4 py-3 font-black"
          >
            ← Paket Merkezi
          </Link>

        </div>


        {
          errorMessage &&
          (
            <div className="mt-6 rounded-xl bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )
        }


        {
          successMessage &&
          (
            <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-emerald-300">
              {successMessage}
            </div>
          )
        }


        <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">

          <aside className="space-y-5">

            <form
              onSubmit={
                createHotel
              }
              className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
            >

              <div className="flex items-start justify-between gap-3">

                <div>

                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
                    OTEL KARTI
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    Yeni Otel Oluştur
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Önce otelin temel bilgilerini kaydedin.
                    Oda, fiyat, EB ve çocuk kurallarını
                    oteli oluşturduktan sonra ekleyeceksiniz.
                  </p>

                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-lg font-black text-orange-400">
                  +
                </div>

              </div>


              <div className="mt-6 space-y-5">

                <label className="block">

                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Otel Adı *
                  </span>

                  <input
                    value={
                      hotelName
                    }
                    onChange={
                      e =>
                        setHotelName(
                          e.target.value
                        )
                    }
                    placeholder="Örn: Sunshine Hotel Ölüdeniz"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                  />

                  <span className="mt-2 block text-xs text-slate-500">
                    Satış ve paket ekranlarında görünecek otel adı.
                  </span>

                </label>


                <div className="grid grid-cols-2 gap-3">

                  <label className="block">

                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Şehir
                    </span>

                    <input
                      value={
                        hotelCity
                      }
                      onChange={
                        e =>
                          setHotelCity(
                            e.target.value
                          )
                      }
                      placeholder="Muğla"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                    />

                  </label>


                  <label className="block">

                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Bölge / İlçe
                    </span>

                    <input
                      value={
                        hotelDistrict
                      }
                      onChange={
                        e =>
                          setHotelDistrict(
                            e.target.value
                          )
                      }
                      placeholder="Ölüdeniz"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                    />

                  </label>

                </div>


                <div className="grid grid-cols-2 gap-3">

                  <label className="block">

                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Otel Yıldızı
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={
                        hotelStars
                      }
                      onChange={
                        e =>
                          setHotelStars(
                            e.target.value
                          )
                      }
                      placeholder="Örn: 4"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                    />

                  </label>


                  <label className="block">

                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Veri Kaynağı
                    </span>

                    <select
                      value={
                        hotelSource
                      }
                      onChange={
                        e =>
                          setHotelSource(
                            e.target.value as Hotel["source_type"]
                          )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                    >

                      {
                        Object.entries(
                          sourceLabels
                        ).map(
                          ([
                            value,
                            label,
                          ]) => (
                            <option
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {label}
                            </option>
                          )
                        )
                      }

                    </select>

                  </label>

                </div>


                {
                  hotelSource !==
                  "manual" &&
                  (
                    <label className="block">

                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                        Harici Otel ID
                      </span>

                      <input
                        value={
                          hotelExternalId
                        }
                        onChange={
                          e =>
                            setHotelExternalId(
                              e.target.value
                            )
                        }
                        placeholder="Örn: HR-12452 / tesis ID"
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                      />

                      <span className="mt-2 block text-xs text-slate-500">
                        HotelRunner, Elektra, Booking veya başka API sistemindeki otel kimliği.
                      </span>

                    </label>
                  )
                }


                <label className="block">

                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Kontrat / Fiyat Kaynağı
                  </span>

                  <select
                    value={
                      hotelSupplierId
                    }
                    onChange={
                      e =>
                        setHotelSupplierId(
                          e.target.value
                        )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                  >

                    <option value="">
                      Direkt Otel Kontratı
                    </option>

                    {
                      suppliers.map(
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
                      )
                    }

                  </select>

                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    Otelle doğrudan çalışıyorsanız “Direkt Otel Kontratı” bırakın.
                    Fiyat başka bir tedarikçiden geliyorsa ilgili firmayı seçin.
                  </span>

                </label>


                <label className="block">

                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Otel Adresi
                  </span>

                  <input
                    value={
                      hotelAddress
                    }
                    onChange={
                      e =>
                        setHotelAddress(
                          e.target.value
                        )
                    }
                    placeholder="Örn: Ölüdeniz Mah. Fethiye / Muğla"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                  />

                </label>


                <label className="block">

                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Otel Açıklaması
                  </span>

                  <textarea
                    value={
                      hotelDescription
                    }
                    onChange={
                      e =>
                        setHotelDescription(
                          e.target.value
                        )
                    }
                    placeholder="Örn: Denize yakın, açık havuzlu, aile konseptli, her şey dahil otel..."
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                  />

                  <span className="mt-2 block text-xs text-slate-500">
                    Satış danışmanının müşteriye anlatabileceği tesis bilgileri.
                  </span>

                </label>


                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Medya Bağlantıları
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Şimdilik URL ile ekleyebilirsiniz. Oteli kaydettikten sonra
                    Galeri bölümünden birden fazla fotoğraf ekleyebilirsiniz.
                  </p>


                  <label className="mt-4 block">

                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Kapak Fotoğrafı
                    </span>

                    <input
                      value={
                        hotelCoverUrl
                      }
                      onChange={
                        e =>
                          setHotelCoverUrl(
                            e.target.value
                          )
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                    />

                  </label>


                  <label className="mt-4 block">

                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Tanıtım Videosu
                    </span>

                    <input
                      value={
                        hotelVideoUrl
                      }
                      onChange={
                        e =>
                          setHotelVideoUrl(
                            e.target.value
                          )
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
                    />

                  </label>

                </div>


                <button
                  disabled={
                    saving
                  }
                  className="w-full rounded-xl bg-orange-500 px-4 py-4 font-black text-white transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {
                    saving
                      ? "Otel Kaydediliyor..."
                      : "Otel Kartını Oluştur"
                  }
                </button>

              </div>

            </form>


            <div className="rounded-[28px] border border-white/10 bg-slate-900 p-5">

              <div className="flex items-start justify-between gap-3">

                <div>

                  <h2 className="text-lg font-black">
                    Kayıtlı Oteller
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Düzenlemek istediğiniz oteli seçin.
                  </p>

                </div>

                <div className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-orange-400">
                  {filteredHotels.length}
                </div>

              </div>


              <input
                value={
                  search
                }
                onChange={
                  e =>
                    setSearch(
                      e.target.value
                    )
                }
                placeholder="Otel adı, şehir veya bölge ara..."
                className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
              />


              <div className="mt-4 max-h-[580px] space-y-3 overflow-auto pr-1">

                {
                  filteredHotels.length ===
                  0
                    ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm leading-6 text-slate-500">
                        Henüz kayıtlı otel bulunmuyor.
                        Yukarıdaki formdan ilk otel kartınızı oluşturun.
                      </div>
                    )
                    : filteredHotels.map(
                        hotel => (

                          <button
                            key={
                              hotel.id
                            }
                            type="button"
                            onClick={
                              () => {

                                setSelectedHotelId(
                                  hotel.id
                                );

                                setTab(
                                  "general"
                                );
                              }
                            }
                            className={`w-full overflow-hidden rounded-2xl border text-left transition ${
                              selectedHotelId ===
                              hotel.id
                                ? "border-orange-500 bg-orange-500/10"
                                : "border-white/10 bg-slate-950 hover:border-white/20"
                            }`}
                          >

                            {
                              hotel.cover_image_url &&
                              (
                                <div className="h-24 w-full overflow-hidden bg-slate-900">

                                  <img
                                    src={
                                      hotel.cover_image_url
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />

                                </div>
                              )
                            }


                            <div className="p-4">

                              <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0">

                                  <div className="truncate font-black">
                                    {hotel.name}
                                  </div>

                                  <div className="mt-1 text-xs text-slate-400">
                                    {
                                      [
                                        hotel.city,
                                        hotel.district,
                                        hotel.star_rating
                                          ? `${hotel.star_rating} ★`
                                          : null,
                                      ]
                                        .filter(
                                          Boolean
                                        )
                                        .join(
                                          " · "
                                        ) ||
                                      "Konum bilgisi girilmedi"
                                    }
                                  </div>

                                </div>

                                <span className="shrink-0 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-black text-orange-300">
                                  {
                                    sourceLabels[
                                      hotel.source_type
                                    ] ||
                                    hotel.source_type
                                  }
                                </span>

                              </div>

                            </div>

                          </button>

                        )
                      )
                }

              </div>

            </div>

          </aside>


          <section>

            {
              !contract
                ? (
                  <div className="rounded-[28px] border border-white/10 bg-slate-900 p-8 md:p-10">

                    <div className="max-w-3xl">

                      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                        BAŞLANGIÇ
                      </p>

                      <h2 className="mt-3 text-3xl font-black">
                        Otel Yönetimine Buradan Başlayın
                      </h2>

                      <p className="mt-4 text-sm leading-7 text-slate-400">
                        Soldan yeni bir otel oluşturun veya kayıtlı otellerden
                        birini seçin. Oteli seçtikten sonra oda, kontrat,
                        EB kampanyası, çocuk politikası ve API sekmeleri açılır.
                      </p>

                    </div>


                    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                      <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-black">
                          1
                        </div>

                        <h3 className="mt-4 font-black">
                          Otel Kartı
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Otel adı, konum, kaynak ve temel bilgileri kaydedin.
                        </p>

                      </div>


                      <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-black">
                          2
                        </div>

                        <h3 className="mt-4 font-black">
                          Oda & Galeri
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Oda tiplerini, kapasitelerini ve otel görsellerini ekleyin.
                        </p>

                      </div>


                      <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-black">
                          3
                        </div>

                        <h3 className="mt-4 font-black">
                          Kontrat & Fiyat
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Net alış veya liste fiyatı + acente indirimi ile dönemleri tanımlayın.
                        </p>

                      </div>


                      <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-black">
                          4
                        </div>

                        <h3 className="mt-4 font-black">
                          EB · Çocuk · API
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Kampanyaları, çocuk kurallarını ve entegrasyonları tamamlayın.
                        </p>

                      </div>

                    </div>


                    <div className="mt-8 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">

                      <p className="text-sm font-black text-orange-300">
                        Paket fiyatları burada tanımlanan kurallardan otomatik hesaplanır.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Satış danışmanı alış maliyetlerini görmez; sistem fiyatı
                        arka planda hesaplar ve satış ekranına yalnızca gerekli
                        satış bilgisini gönderir.
                      </p>

                    </div>

                  </div>
                )
                : (
                  <div>

                    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900">

                      {
                        contract.hotel
                          .cover_image_url
                          ? (
                            <div className="h-52 overflow-hidden bg-slate-800">

                              <img
                                src={
                                  contract.hotel
                                    .cover_image_url
                                }
                                alt=""
                                className="h-full w-full object-cover"
                              />

                            </div>
                          )
                          : null
                      }


                      <div className="p-6">

                        <div className="flex flex-wrap items-start justify-between gap-4">

                          <div>

                            <h2 className="text-3xl font-black">
                              {
                                contract.hotel
                                  .name
                              }
                            </h2>

                            <p className="mt-2 text-slate-400">
                              {
                                [
                                  contract.hotel
                                    .city,
                                  contract.hotel
                                    .district,
                                  contract.hotel
                                    .star_rating
                                    ? `${contract.hotel.star_rating} ★`
                                    : null,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " · "
                                  )
                              }
                            </p>

                          </div>


                          <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm">

                            <div className="text-xs text-slate-500">
                              Veri Kaynağı
                            </div>

                            <strong>
                              {
                                sourceLabels[
                                  contract.hotel
                                    .source_type
                                ] ||
                                contract.hotel
                                  .source_type
                              }
                            </strong>

                          </div>

                        </div>

                      </div>

                    </div>


                    <div className="mt-5 flex gap-2 overflow-x-auto pb-2">

                      {
                        [
                          [
                            "general",
                            "Genel",
                          ],
                          [
                            "gallery",
                            `Galeri (${contract.media.length})`,
                          ],
                          [
                            "rooms",
                            `Odalar (${contract.room_types.length})`,
                          ],
                          [
                            "rates",
                            `Fiyat Dönemleri (${contract.rates.length})`,
                          ],
                          [
                            "promotions",
                            `EB & Kampanya (${contract.promotions.length})`,
                          ],
                          [
                            "children",
                            `Çocuk (${contract.child_policies.length})`,
                          ],
                          [
                            "api",
                            "API",
                          ],
                        ].map(
                          item => (

                            <button
                              key={
                                item[0]
                              }
                              type="button"
                              onClick={
                                () =>
                                  setTab(
                                    item[0] as Tab
                                  )
                              }
                              className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-black ${
                                tab ===
                                item[0]
                                  ? "bg-orange-500"
                                  : "border border-white/10 bg-slate-900"
                              }`}
                            >
                              {item[1]}
                            </button>

                          )
                        )
                      }

                    </div>


                    {
                      tab ===
                      "general" &&
                      (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">

                          <InfoCard
                            title="Kontrat / Fiyat Kaynağı"
                            value={
                              contract.hotel
                                .supplier_id
                                ? "Tedarikçi bağlantılı"
                                : "Otel Direkt"
                            }
                          />

                          <InfoCard
                            title="Kaynak Sistemi"
                            value={
                              sourceLabels[
                                contract.hotel
                                  .source_type
                              ] ||
                              contract.hotel
                                .source_type
                            }
                          />

                          <InfoCard
                            title="Harici Otel ID"
                            value={
                              contract.hotel
                                .external_hotel_id ||
                              "Yok"
                            }
                          />

                          <InfoCard
                            title="Son API Senkronizasyonu"
                            value={
                              contract.hotel
                                .last_synced_at
                                ? new Date(
                                    contract.hotel
                                      .last_synced_at
                                  )
                                    .toLocaleString(
                                      "tr-TR"
                                    )
                                : "Henüz senkronize edilmedi"
                            }
                          />

                        </div>
                      )
                    }


                    {
                      tab ===
                      "gallery" &&
                      (
                        <div className="mt-4 grid gap-5 xl:grid-cols-[360px_1fr]">

                          <form
                            onSubmit={
                              addMedia
                            }
                            className="h-fit rounded-[24px] border border-white/10 bg-slate-900 p-5"
                          >

                            <h3 className="font-black">
                              Galeriye Ekle
                            </h3>

                            <select
                              value={
                                mediaType
                              }
                              onChange={
                                e =>
                                  setMediaType(
                                    e.target.value as "image" | "video"
                                  )
                              }
                              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >
                              <option value="image">
                                Fotoğraf
                              </option>
                              <option value="video">
                                Video
                              </option>
                            </select>

                            <input
                              value={
                                mediaUrl
                              }
                              onChange={
                                e =>
                                  setMediaUrl(
                                    e.target.value
                                  )
                              }
                              placeholder="Medya URL"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <input
                              value={
                                mediaTitle
                              }
                              onChange={
                                e =>
                                  setMediaTitle(
                                    e.target.value
                                  )
                              }
                              placeholder="Başlık"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <label className="mt-3 flex items-center gap-3 rounded-xl bg-slate-950 p-3">
                              <input
                                type="checkbox"
                                checked={
                                  mediaCover
                                }
                                onChange={
                                  e =>
                                    setMediaCover(
                                      e.target.checked
                                    )
                                }
                              />
                              Kapak fotoğrafı
                            </label>

                            <button className="mt-4 w-full rounded-xl bg-orange-500 p-3 font-black">
                              Galeriye Ekle
                            </button>

                          </form>


                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {
                              contract.media.map(
                                media => (

                                  <div
                                    key={
                                      media.id
                                    }
                                    className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-900"
                                  >

                                    {
                                      media.media_type ===
                                      "image"
                                        ? (
                                          <img
                                            src={
                                              media.url
                                            }
                                            alt=""
                                            className="h-44 w-full object-cover"
                                          />
                                        )
                                        : (
                                          <div className="flex h-44 items-center justify-center bg-slate-950 text-slate-400">
                                            VIDEO
                                          </div>
                                        )
                                    }

                                    <div className="p-4">

                                      <div className="font-black">
                                        {
                                          media.title ||
                                          "Otel görseli"
                                        }
                                      </div>

                                      {
                                        media.is_cover &&
                                        (
                                          <div className="mt-2 text-xs font-black text-orange-400">
                                            KAPAK
                                          </div>
                                        )
                                      }

                                    </div>

                                  </div>

                                )
                              )
                            }

                          </div>

                        </div>
                      )
                    }


                    {
                      tab ===
                      "rooms" &&
                      (
                        <div className="mt-4 grid gap-5 xl:grid-cols-[380px_1fr]">

                          <form
                            onSubmit={
                              addRoom
                            }
                            className="h-fit rounded-[24px] border border-white/10 bg-slate-900 p-5"
                          >

                            <h3 className="font-black">
                              Yeni Oda Tipi
                            </h3>

                            <input
                              value={
                                roomName
                              }
                              onChange={
                                e =>
                                  setRoomName(
                                    e.target.value
                                  )
                              }
                              placeholder="Standart Oda / Family / Suite"
                              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <input
                              value={
                                roomCode
                              }
                              onChange={
                                e =>
                                  setRoomCode(
                                    e.target.value
                                  )
                              }
                              placeholder="Oda kodu"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <div className="mt-3 grid grid-cols-2 gap-3">

                              <input
                                type="number"
                                min="1"
                                value={
                                  roomAdults
                                }
                                onChange={
                                  e =>
                                    setRoomAdults(
                                      e.target.value
                                    )
                                }
                                placeholder="Max yetişkin"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                              <input
                                type="number"
                                min="0"
                                value={
                                  roomChildren
                                }
                                onChange={
                                  e =>
                                    setRoomChildren(
                                      e.target.value
                                    )
                                }
                                placeholder="Max çocuk"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                            </div>

                            <input
                              type="number"
                              value={
                                roomSize
                              }
                              onChange={
                                e =>
                                  setRoomSize(
                                    e.target.value
                                  )
                              }
                              placeholder="m²"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <input
                              value={
                                roomBed
                              }
                              onChange={
                                e =>
                                  setRoomBed(
                                    e.target.value
                                  )
                              }
                              placeholder="Yatak tipi"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <textarea
                              value={
                                roomDescription
                              }
                              onChange={
                                e =>
                                  setRoomDescription(
                                    e.target.value
                                  )
                              }
                              placeholder="Oda özellikleri"
                              rows={3}
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <button className="mt-4 w-full rounded-xl bg-orange-500 p-3 font-black">
                              Oda Tipini Ekle
                            </button>

                          </form>


                          <div className="grid gap-4 md:grid-cols-2">

                            {
                              contract.room_types.map(
                                room => (

                                  <div
                                    key={
                                      room.id
                                    }
                                    className="rounded-[20px] border border-white/10 bg-slate-900 p-5"
                                  >

                                    <h4 className="text-lg font-black">
                                      {room.name}
                                    </h4>

                                    <p className="mt-2 text-sm text-slate-400">
                                      {room.max_adults} yetişkin · {room.max_children} çocuk
                                    </p>

                                    {
                                      room.size_m2 &&
                                      (
                                        <p className="mt-1 text-sm text-slate-400">
                                          {room.size_m2} m²
                                        </p>
                                      )
                                    }

                                    {
                                      room.bed_type &&
                                      (
                                        <p className="mt-1 text-sm text-slate-400">
                                          {room.bed_type}
                                        </p>
                                      )
                                    }

                                  </div>

                                )
                              )
                            }

                          </div>

                        </div>
                      )
                    }


                    {
                      tab ===
                      "rates" &&
                      (
                        <div className="mt-4 grid gap-5 xl:grid-cols-[420px_1fr]">

                          <form
                            onSubmit={
                              addRate
                            }
                            className="h-fit rounded-[24px] border border-white/10 bg-slate-900 p-5"
                          >

                            <h3 className="font-black">
                              Kontrat Fiyat Dönemi
                            </h3>

                            <select
                              value={
                                rateRoomId
                              }
                              onChange={
                                e =>
                                  setRateRoomId(
                                    e.target.value
                                  )
                              }
                              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >

                              <option value="">
                                Oda tipi seçin
                              </option>

                              {
                                contract.room_types.map(
                                  room => (
                                    <option
                                      key={
                                        room.id
                                      }
                                      value={
                                        room.id
                                      }
                                    >
                                      {room.name}
                                    </option>
                                  )
                                )
                              }

                            </select>


                            <select
                              value={
                                rateBoard
                              }
                              onChange={
                                e =>
                                  setRateBoard(
                                    e.target.value
                                  )
                              }
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >

                              {
                                Object.entries(
                                  boardLabels
                                ).map(
                                  ([
                                    value,
                                    label,
                                  ]) => (
                                    <option
                                      key={
                                        value
                                      }
                                      value={
                                        value
                                      }
                                    >
                                      {label}
                                    </option>
                                  )
                                )
                              }

                            </select>


                            <div className="mt-3 grid grid-cols-2 gap-3">

                              <label>
                                <span className="mb-1 block text-xs text-slate-500">
                                  Başlangıç
                                </span>

                                <input
                                  type="date"
                                  value={
                                    rateFrom
                                  }
                                  onChange={
                                    e =>
                                      setRateFrom(
                                        e.target.value
                                      )
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 [color-scheme:dark]"
                                />
                              </label>

                              <label>
                                <span className="mb-1 block text-xs text-slate-500">
                                  Bitiş
                                </span>

                                <input
                                  type="date"
                                  value={
                                    rateTo
                                  }
                                  min={
                                    rateFrom ||
                                    undefined
                                  }
                                  onChange={
                                    e =>
                                      setRateTo(
                                        e.target.value
                                      )
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 [color-scheme:dark]"
                                />
                              </label>

                            </div>


                            <select
                              value={
                                ratePriceType
                              }
                              onChange={
                                e =>
                                  setRatePriceType(
                                    e.target.value as "net" | "list_discount"
                                  )
                              }
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >
                              <option value="net">
                                Net Alış Fiyatı
                              </option>
                              <option value="list_discount">
                                Liste Fiyatı + Acente İndirimi %
                              </option>
                            </select>


                            {
                              ratePriceType ===
                              "net"
                                ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                      rateNet
                                    }
                                    onChange={
                                      e =>
                                        setRateNet(
                                          e.target.value
                                        )
                                    }
                                    placeholder="Gecelik net maliyet"
                                    className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                                  />
                                )
                                : (
                                  <div className="mt-3">

                                    <div className="grid grid-cols-2 gap-3">

                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                          rateList
                                        }
                                        onChange={
                                          e =>
                                            setRateList(
                                              e.target.value
                                            )
                                        }
                                        placeholder="Liste fiyatı"
                                        className="rounded-xl border border-white/10 bg-slate-950 p-3"
                                      />

                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={
                                          rateDiscount
                                        }
                                        onChange={
                                          e =>
                                            setRateDiscount(
                                              e.target.value
                                            )
                                        }
                                        placeholder="Acente indirim %"
                                        className="rounded-xl border border-white/10 bg-slate-950 p-3"
                                      />

                                    </div>

                                    <div className="mt-3 rounded-xl bg-emerald-500/10 p-3">

                                      <div className="text-xs text-emerald-300">
                                        Hesaplanan Net Maliyet
                                      </div>

                                      <strong className="text-lg text-emerald-300">
                                        {money(calculatedNet)}
                                      </strong>

                                    </div>

                                  </div>
                                )
                            }


                            <div className="mt-3 grid grid-cols-3 gap-3">

                              <input
                                type="number"
                                min="0"
                                value={
                                  rateAllotment
                                }
                                onChange={
                                  e =>
                                    setRateAllotment(
                                      e.target.value
                                    )
                                }
                                placeholder="Kontenjan"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                              <input
                                type="number"
                                min="1"
                                value={
                                  rateMinStay
                                }
                                onChange={
                                  e =>
                                    setRateMinStay(
                                      e.target.value
                                    )
                                }
                                placeholder="Min gece"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                              <input
                                type="number"
                                min="0"
                                value={
                                  rateReleaseDays
                                }
                                onChange={
                                  e =>
                                    setRateReleaseDays(
                                      e.target.value
                                    )
                                }
                                placeholder="Release"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                            </div>


                            <label className="mt-3 flex items-center gap-3 rounded-xl bg-slate-950 p-3">

                              <input
                                type="checkbox"
                                checked={
                                  rateStopSale
                                }
                                onChange={
                                  e =>
                                    setRateStopSale(
                                      e.target.checked
                                    )
                                }
                              />

                              Stop Sale

                            </label>


                            <button className="mt-4 w-full rounded-xl bg-orange-500 p-3 font-black">
                              Fiyat Dönemini Kaydet
                            </button>

                          </form>


                          <div className="space-y-3">

                            {
                              contract.rates.map(
                                rate => (

                                  <div
                                    key={
                                      rate.id
                                    }
                                    className="rounded-[20px] border border-white/10 bg-slate-900 p-5"
                                  >

                                    <div className="flex flex-wrap justify-between gap-4">

                                      <div>

                                        <h4 className="font-black">
                                          {rate.room_type_name}
                                        </h4>

                                        <p className="mt-1 text-sm text-slate-400">
                                          {
                                            boardLabels[
                                              rate.board_type
                                            ] ||
                                            rate.board_type
                                          }
                                        </p>

                                        <p className="mt-2 text-xs text-slate-500">
                                          {rate.valid_from} → {rate.valid_to}
                                        </p>

                                      </div>


                                      <div className="text-right">

                                        <div className="text-xs text-slate-500">
                                          Net Maliyet / Gece
                                        </div>

                                        <strong className="text-xl text-orange-400">
                                          {money(rate.nightly_cost)}
                                        </strong>

                                        {
                                          rate.price_input_type ===
                                          "list_discount" &&
                                          (
                                            <div className="mt-1 text-xs text-slate-500">
                                              Liste {money(rate.list_price)} · %{rate.agency_discount_percent} acente indirimi
                                            </div>
                                          )
                                        }

                                      </div>

                                    </div>


                                    <div className="mt-4 flex flex-wrap gap-2 text-xs">

                                      <Badge>
                                        Min {rate.minimum_stay} gece
                                      </Badge>

                                      <Badge>
                                        Kontenjan {rate.allotment ?? "∞"}
                                      </Badge>

                                      <Badge>
                                        Release {rate.release_days} gün
                                      </Badge>

                                      {
                                        rate.stop_sale &&
                                        (
                                          <Badge>
                                            STOP SALE
                                          </Badge>
                                        )
                                      }

                                    </div>

                                  </div>

                                )
                              )
                            }

                          </div>

                        </div>
                      )
                    }


                    {
                      tab ===
                      "promotions" &&
                      (
                        <div className="mt-4 grid gap-5 xl:grid-cols-[420px_1fr]">

                          <form
                            onSubmit={
                              addPromotion
                            }
                            className="h-fit rounded-[24px] border border-white/10 bg-slate-900 p-5"
                          >

                            <h3 className="font-black">
                              EB / Kampanya
                            </h3>

                            <input
                              value={
                                promotionName
                              }
                              onChange={
                                e =>
                                  setPromotionName(
                                    e.target.value
                                  )
                              }
                              placeholder="Örn: 31 Mart'a kadar EB %20"
                              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <select
                              value={
                                promotionType
                              }
                              onChange={
                                e =>
                                  setPromotionType(
                                    e.target.value
                                  )
                              }
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >

                              {
                                Object.entries(
                                  promotionLabels
                                ).map(
                                  ([
                                    value,
                                    label,
                                  ]) => (
                                    <option
                                      key={
                                        value
                                      }
                                      value={
                                        value
                                      }
                                    >
                                      {label}
                                    </option>
                                  )
                                )
                              }

                            </select>


                            <div className="mt-3 grid grid-cols-2 gap-3">

                              <select
                                value={
                                  promotionDiscountType
                                }
                                onChange={
                                  e =>
                                    setPromotionDiscountType(
                                      e.target.value as "percent" | "fixed"
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              >
                                <option value="percent">
                                  Yüzde %
                                </option>
                                <option value="fixed">
                                  Sabit TL
                                </option>
                              </select>

                              <input
                                type="number"
                                min="0"
                                value={
                                  promotionValue
                                }
                                onChange={
                                  e =>
                                    setPromotionValue(
                                      e.target.value
                                    )
                                }
                                placeholder="İndirim"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                            </div>


                            <p className="mt-4 text-xs font-black uppercase text-slate-500">
                              Rezervasyon Yapılabilecek Tarih
                            </p>

                            <div className="mt-2 grid grid-cols-2 gap-3">

                              <input
                                type="date"
                                value={
                                  promotionBookingFrom
                                }
                                onChange={
                                  e =>
                                    setPromotionBookingFrom(
                                      e.target.value
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-slate-950 p-3 [color-scheme:dark]"
                              />

                              <input
                                type="date"
                                value={
                                  promotionBookingTo
                                }
                                onChange={
                                  e =>
                                    setPromotionBookingTo(
                                      e.target.value
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-slate-950 p-3 [color-scheme:dark]"
                              />

                            </div>


                            <p className="mt-4 text-xs font-black uppercase text-slate-500">
                              Konaklama Tarihi
                            </p>

                            <div className="mt-2 grid grid-cols-2 gap-3">

                              <input
                                type="date"
                                value={
                                  promotionStayFrom
                                }
                                onChange={
                                  e =>
                                    setPromotionStayFrom(
                                      e.target.value
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-slate-950 p-3 [color-scheme:dark]"
                              />

                              <input
                                type="date"
                                value={
                                  promotionStayTo
                                }
                                onChange={
                                  e =>
                                    setPromotionStayTo(
                                      e.target.value
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-slate-950 p-3 [color-scheme:dark]"
                              />

                            </div>


                            <input
                              type="number"
                              min="1"
                              value={
                                promotionMinNights
                              }
                              onChange={
                                e =>
                                  setPromotionMinNights(
                                    e.target.value
                                  )
                              }
                              placeholder="Minimum gece"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />


                            <button className="mt-4 w-full rounded-xl bg-orange-500 p-3 font-black">
                              Kampanyayı Kaydet
                            </button>

                          </form>


                          <div className="space-y-3">

                            {
                              contract.promotions.map(
                                promo => (

                                  <div
                                    key={
                                      promo.id
                                    }
                                    className="rounded-[20px] border border-white/10 bg-slate-900 p-5"
                                  >

                                    <div className="flex justify-between gap-4">

                                      <div>

                                        <h4 className="font-black">
                                          {promo.name}
                                        </h4>

                                        <p className="mt-1 text-sm text-slate-400">
                                          {
                                            promotionLabels[
                                              promo.promotion_type
                                            ] ||
                                            promo.promotion_type
                                          }
                                        </p>

                                      </div>

                                      <strong className="text-xl text-emerald-400">
                                        {
                                          promo.discount_type ===
                                          "percent"
                                            ? `%${promo.discount_value}`
                                            : money(
                                                promo.discount_value
                                              )
                                        }
                                      </strong>

                                    </div>

                                    <p className="mt-3 text-xs text-slate-500">
                                      Konaklama: {promo.stay_from || "—"} → {promo.stay_to || "—"}
                                    </p>

                                  </div>

                                )
                              )
                            }

                          </div>

                        </div>
                      )
                    }


                    {
                      tab ===
                      "children" &&
                      (
                        <div className="mt-4 grid gap-5 xl:grid-cols-[420px_1fr]">

                          <form
                            onSubmit={
                              addChildPolicy
                            }
                            className="h-fit rounded-[24px] border border-white/10 bg-slate-900 p-5"
                          >

                            <h3 className="font-black">
                              Çocuk Yaş / İndirim Kuralı
                            </h3>

                            <select
                              value={
                                childRoomId
                              }
                              onChange={
                                e =>
                                  setChildRoomId(
                                    e.target.value
                                  )
                              }
                              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >

                              <option value="">
                                Tüm oda tipleri
                              </option>

                              {
                                contract.room_types.map(
                                  room => (
                                    <option
                                      key={
                                        room.id
                                      }
                                      value={
                                        room.id
                                      }
                                    >
                                      {room.name}
                                    </option>
                                  )
                                )
                              }

                            </select>


                            <div className="mt-3 grid grid-cols-3 gap-3">

                              <input
                                type="number"
                                min="1"
                                value={
                                  childOrder
                                }
                                onChange={
                                  e =>
                                    setChildOrder(
                                      e.target.value
                                    )
                                }
                                placeholder="Kaçıncı çocuk"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  childAgeFrom
                                }
                                onChange={
                                  e =>
                                    setChildAgeFrom(
                                      e.target.value
                                    )
                                }
                                placeholder="Yaş başlangıç"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  childAgeTo
                                }
                                onChange={
                                  e =>
                                    setChildAgeTo(
                                      e.target.value
                                    )
                                }
                                placeholder="Yaş bitiş"
                                className="rounded-xl border border-white/10 bg-slate-950 p-3"
                              />

                            </div>


                            <select
                              value={
                                childPricingType
                              }
                              onChange={
                                e =>
                                  setChildPricingType(
                                    e.target.value as "free" | "percent" | "fixed"
                                  )
                              }
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >
                              <option value="free">
                                Ücretsiz
                              </option>
                              <option value="percent">
                                İndirim %
                              </option>
                              <option value="fixed">
                                Sabit Çocuk Fiyatı
                              </option>
                            </select>


                            {
                              childPricingType !==
                              "free" &&
                              (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    childValue
                                  }
                                  onChange={
                                    e =>
                                      setChildValue(
                                        e.target.value
                                      )
                                  }
                                  placeholder={
                                    childPricingType ===
                                    "percent"
                                      ? "İndirim yüzdesi"
                                      : "Sabit fiyat"
                                  }
                                  className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                                />
                              )
                            }


                            <button className="mt-4 w-full rounded-xl bg-orange-500 p-3 font-black">
                              Çocuk Kuralını Kaydet
                            </button>

                          </form>


                          <div className="space-y-3">

                            {
                              contract.child_policies.map(
                                policy => {

                                  const room =
                                    contract.room_types.find(
                                      item =>
                                        item.id ===
                                        policy.room_type_id
                                    );


                                  return (

                                    <div
                                      key={
                                        policy.id
                                      }
                                      className="rounded-[20px] border border-white/10 bg-slate-900 p-5"
                                    >

                                      <div className="flex justify-between gap-4">

                                        <div>

                                          <h4 className="font-black">
                                            {policy.child_order}. Çocuk
                                          </h4>

                                          <p className="mt-1 text-sm text-slate-400">
                                            {policy.age_from} – {policy.age_to} yaş
                                          </p>

                                          <p className="mt-1 text-xs text-slate-500">
                                            {room?.name || "Tüm odalar"}
                                          </p>

                                        </div>

                                        <strong className="text-emerald-400">

                                          {
                                            policy.pricing_type ===
                                            "free"
                                              ? "ÜCRETSİZ"
                                              : policy.pricing_type ===
                                                "percent"
                                                ? `%${policy.value} indirim`
                                                : money(
                                                    policy.value
                                                  )
                                          }

                                        </strong>

                                      </div>

                                    </div>

                                  );
                                }
                              )
                            }

                          </div>

                        </div>
                      )
                    }


                    {
                      tab ===
                      "api" &&
                      (
                        <div className="mt-4 grid gap-5 xl:grid-cols-[420px_1fr]">

                          <form
                            onSubmit={
                              addIntegration
                            }
                            className="h-fit rounded-[24px] border border-white/10 bg-slate-900 p-5"
                          >

                            <h3 className="font-black">
                              API / Entegrasyon Kaynağı
                            </h3>

                            <select
                              value={
                                integrationProvider
                              }
                              onChange={
                                e =>
                                  setIntegrationProvider(
                                    e.target.value
                                  )
                              }
                              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            >
                              <option value="hotelrunner">
                                HotelRunner
                              </option>
                              <option value="elektra">
                                Elektra
                              </option>
                              <option value="booking">
                                Booking / Connectivity
                              </option>
                              <option value="custom_api">
                                Özel API
                              </option>
                            </select>

                            <input
                              value={
                                integrationName
                              }
                              onChange={
                                e =>
                                  setIntegrationName(
                                    e.target.value
                                  )
                              }
                              placeholder="Bağlantı adı"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <input
                              value={
                                integrationAccount
                              }
                              onChange={
                                e =>
                                  setIntegrationAccount(
                                    e.target.value
                                  )
                              }
                              placeholder="Harici hesap / tesis ID"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <input
                              value={
                                integrationBaseUrl
                              }
                              onChange={
                                e =>
                                  setIntegrationBaseUrl(
                                    e.target.value
                                  )
                              }
                              placeholder="API base URL (opsiyonel)"
                              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                            />

                            <div className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
                              API anahtarı ve şifre bu ekranda saklanmayacak.
                              Güvenli bağlantı bilgileri sunucu/Vault katmanında tutulacak.
                            </div>

                            <button className="mt-4 w-full rounded-xl bg-orange-500 p-3 font-black">
                              Entegrasyon Kaydı Oluştur
                            </button>

                          </form>


                          <div className="space-y-3">

                            {
                              contract.integrations.map(
                                integration => (

                                  <div
                                    key={
                                      integration.id
                                    }
                                    className="rounded-[20px] border border-white/10 bg-slate-900 p-5"
                                  >

                                    <div className="flex justify-between gap-4">

                                      <div>

                                        <h4 className="font-black">
                                          {integration.display_name}
                                        </h4>

                                        <p className="mt-1 text-sm text-slate-400">
                                          {
                                            sourceLabels[
                                              integration.provider
                                            ] ||
                                            integration.provider
                                          }
                                        </p>

                                        <p className="mt-2 text-xs text-slate-500">
                                          Hesap: {integration.external_account_id || "—"}
                                        </p>

                                      </div>

                                      <Badge>
                                        {integration.status}
                                      </Badge>

                                    </div>

                                  </div>

                                )
                              )
                            }

                          </div>

                        </div>
                      )
                    }

                  </div>
                )
            }

          </section>

        </div>

      </div>

    </main>
  );
}


function InfoCard(
  props: {
    title: string;
    value: string;
  }
) {

  return (
    <div className="rounded-[20px] border border-white/10 bg-slate-900 p-5">

      <div className="text-xs font-black uppercase tracking-wider text-slate-500">
        {props.title}
      </div>

      <div className="mt-2 font-black">
        {props.value}
      </div>

    </div>
  );
}


function Badge(
  props: {
    children:
      React.ReactNode;
  }
) {

  return (
    <span className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
      {props.children}
    </span>
  );
}
