"use client";

import { useCallback, useEffect, useState } from "react";
import { FaDatabase, FaSync } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  PriceAdjustmentType,
  PricingRule,
} from "@/lib/hotel/pricing-engine";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type SeasonRow = {
  id: string;
  name: string;
  adjustment_type:
    | "percentage"
    | "fixed_amount"
    | "multiplier";
  adjustment_value: number;
  priority: number;
  is_active: boolean;
};

type OccupancyRow = {
  id: string;
  adults: number;
  children: number;
  pricing_method:
    | "multiplier"
    | "percentage"
    | "fixed_amount"
    | "override_price";
  pricing_value: number;
  priority: number;
  is_active: boolean;
};

type ChildRow = {
  id: string;
  name: string;
  minimum_age: number;
  maximum_age: number;
  pricing_method:
    | "free"
    | "percentage"
    | "fixed_amount"
    | "adult_price"
    | "override_price";
  pricing_value: number;
  priority: number;
  is_active: boolean;
};

type Props = {
  onRulesLoaded: (rules: PricingRule[]) => void;
};

function mapOccupancyAdjustmentType(
  method: OccupancyRow["pricing_method"]
): PriceAdjustmentType {
  return method;
}

function mapChildRule(
  row: ChildRow
): PricingRule | null {
  if (row.pricing_method === "free") {
    return {
      id: row.id,
      name: row.name,
      source: "child",
      adjustmentType: "fixed_amount",
      adjustmentValue: 0,
      priority: row.priority,
      isActive: row.is_active,
    };
  }

  if (row.pricing_method === "adult_price") {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    source: "child",
    adjustmentType:
      row.pricing_method as PriceAdjustmentType,
    adjustmentValue: row.pricing_value,
    priority: row.priority,
    isActive: row.is_active,
  };
}

export default function DatabaseRuleLoader({
  onRulesLoaded,
}: Props) {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<RoomTypeOption[]>([]);

  const [hotelId, setHotelId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingRules, setLoadingRules] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Kullanıcı oturumu bulunamadı."
        );
        setLoading(false);
        return;
      }

      const currentMembership =
        await getCurrentMembership(user.id);

      if (!currentMembership) {
        setErrorMessage(
          "Aktif şirket üyeliği bulunamadı."
        );
        setLoading(false);
        return;
      }

      setMembership(currentMembership);

      const [
        { data: hotelData, error: hotelError },
        { data: roomTypeData, error: roomTypeError },
      ] = await Promise.all([
        supabase
          .from("hotels")
          .select("id, name")
          .eq(
            "company_id",
            currentMembership.company_id
          )
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_room_types")
          .select("id, hotel_id, name")
          .eq(
            "company_id",
            currentMembership.company_id
          )
          .eq("is_active", true)
          .order("name"),
      ]);

      const error = hotelError ?? roomTypeError;

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setHotels(
        (hotelData ?? []) as HotelOption[]
      );

      setRoomTypes(
        (roomTypeData ?? []) as RoomTypeOption[]
      );

      setLoading(false);
    }

    void initialize();
  }, []);

  const loadRules = useCallback(async () => {
    if (!membership || !hotelId) return;

    setLoadingRules(true);
    setErrorMessage("");

    const [
      { data: seasonData, error: seasonError },
      {
        data: occupancyData,
        error: occupancyError,
      },
      { data: childData, error: childError },
    ] = await Promise.all([
      supabase
        .from("hotel_seasons")
        .select(`
          id,
          name,
          adjustment_type,
          adjustment_value,
          priority,
          is_active
        `)
        .eq(
          "company_id",
          membership.company_id
        )
        .eq("hotel_id", hotelId)
        .eq("is_active", true),

      supabase
        .from("hotel_occupancy_rules")
        .select(`
          id,
          adults,
          children,
          pricing_method,
          pricing_value,
          priority,
          is_active
        `)
        .eq(
          "company_id",
          membership.company_id
        )
        .eq("hotel_id", hotelId)
        .eq("is_active", true)
        .match(
          roomTypeId
            ? {
                room_type_id: roomTypeId,
              }
            : {}
        ),

      supabase
        .from("hotel_child_rules")
        .select(`
          id,
          name,
          minimum_age,
          maximum_age,
          pricing_method,
          pricing_value,
          priority,
          is_active
        `)
        .eq(
          "company_id",
          membership.company_id
        )
        .eq("hotel_id", hotelId)
        .eq("is_active", true)
        .or(
          roomTypeId
            ? `room_type_id.is.null,room_type_id.eq.${roomTypeId}`
            : "room_type_id.is.null"
        ),
    ]);

    const error =
      seasonError ??
      occupancyError ??
      childError;

    if (error) {
      setErrorMessage(error.message);
      setLoadingRules(false);
      return;
    }

    const seasonRules: PricingRule[] = (
      (seasonData ?? []) as SeasonRow[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      source: "season",
      adjustmentType: row.adjustment_type,
      adjustmentValue: row.adjustment_value,
      priority: row.priority,
      isActive: row.is_active,
    }));

    const occupancyRules: PricingRule[] = (
      (occupancyData ?? []) as OccupancyRow[]
    ).map((row) => ({
      id: row.id,
      name: `${row.adults} Yetişkin · ${row.children} Çocuk`,
      source: "occupancy",
      adjustmentType:
        mapOccupancyAdjustmentType(
          row.pricing_method
        ),
      adjustmentValue: row.pricing_value,
      priority: row.priority,
      isActive: row.is_active,
    }));

    const childRules = (
      (childData ?? []) as ChildRow[]
    )
      .map(mapChildRule)
      .filter(
        (rule): rule is PricingRule =>
          Boolean(rule)
      );

    onRulesLoaded([
      ...seasonRules,
      ...occupancyRules,
      ...childRules,
    ]);

    setLoadingRules(false);
  }, [
    hotelId,
    membership,
    onRulesLoaded,
    roomTypeId,
  ]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 text-slate-400">
        Veritabanı kuralları yükleniyor...
      </div>
    );
  }

  const filteredRoomTypes = roomTypes.filter(
    (roomType) =>
      roomType.hotel_id === hotelId
  );

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <FaDatabase className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            Veritabanı Kurallarını Yükle
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Seçilen otel ve oda tipine ait kayıtlı
            sezon, kişi ve çocuk kurallarını simülatöre aktarın.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <select
          value={hotelId}
          onChange={(event) => {
            setHotelId(event.target.value);
            setRoomTypeId("");
          }}
          className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950"
        >
          <option value="">Otel seçin</option>

          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>
              {hotel.name}
            </option>
          ))}
        </select>

        <select
          disabled={!hotelId}
          value={roomTypeId}
          onChange={(event) =>
            setRoomTypeId(event.target.value)
          }
          className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
        >
          <option value="">Tüm oda tipleri</option>

          {filteredRoomTypes.map((roomType) => (
            <option
              key={roomType.id}
              value={roomType.id}
            >
              {roomType.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!hotelId || loadingRules}
          onClick={() => void loadRules()}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 font-black disabled:opacity-50"
        >
          <FaSync
            className={
              loadingRules
                ? "animate-spin"
                : ""
            }
          />

          {loadingRules
            ? "Kurallar yükleniyor..."
            : "Kuralları Simülatöre Aktar"}
        </button>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl bg-red-500/10 p-4 font-bold text-red-400">
          {errorMessage}
        </div>
      )}
    </section>
  );
}
