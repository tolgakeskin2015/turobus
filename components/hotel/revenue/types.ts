export type AdjustmentType =
  | "percentage"
  | "fixed_amount"
  | "multiplier";

export type OccupancyPricingMethod =
  | "multiplier"
  | "percentage"
  | "fixed_amount"
  | "override_price";

export type ChildPricingMethod =
  | "free"
  | "percentage"
  | "fixed_amount"
  | "adult_price"
  | "override_price";

export type SeasonFormState = {
  hotel_id: string;
  name: string;
  start_date: string;
  end_date: string;
  adjustment_type: AdjustmentType;
  adjustment_value: string;
  priority: string;
  is_active: boolean;
};

export type OccupancyRuleFormState = {
  hotel_id: string;
  room_type_id: string;
  adults: string;
  children: string;
  pricing_method: OccupancyPricingMethod;
  pricing_value: string;
  extra_adult_price: string;
  extra_child_price: string;
  minimum_occupancy: string;
  maximum_occupancy: string;
  priority: string;
  is_active: boolean;
};

export type ChildRuleFormState = {
  hotel_id: string;
  room_type_id: string;
  rate_plan_id: string;
  name: string;
  minimum_age: string;
  maximum_age: string;
  pricing_method: ChildPricingMethod;
  pricing_value: string;
  maximum_children: string;
  priority: string;
  is_active: boolean;
};

export const emptySeasonForm: SeasonFormState = {
  hotel_id: "",
  name: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  adjustment_type: "percentage",
  adjustment_value: "0",
  priority: "100",
  is_active: true,
};

export const emptyOccupancyRuleForm: OccupancyRuleFormState = {
  hotel_id: "",
  room_type_id: "",
  adults: "2",
  children: "0",
  pricing_method: "multiplier",
  pricing_value: "1",
  extra_adult_price: "",
  extra_child_price: "",
  minimum_occupancy: "1",
  maximum_occupancy: "2",
  priority: "100",
  is_active: true,
};

export const emptyChildRuleForm: ChildRuleFormState = {
  hotel_id: "",
  room_type_id: "",
  rate_plan_id: "",
  name: "",
  minimum_age: "0",
  maximum_age: "6",
  pricing_method: "free",
  pricing_value: "0",
  maximum_children: "",
  priority: "100",
  is_active: true,
};

export const adjustmentTypeLabels: Record<
  AdjustmentType,
  string
> = {
  percentage: "Yüzde",
  fixed_amount: "Sabit Tutar",
  multiplier: "Çarpan",
};

export const occupancyPricingMethodLabels: Record<
  OccupancyPricingMethod,
  string
> = {
  multiplier: "Çarpan",
  percentage: "Yüzde",
  fixed_amount: "Sabit Tutar",
  override_price: "Fiyatı Değiştir",
};

export const childPricingMethodLabels: Record<
  ChildPricingMethod,
  string
> = {
  free: "Ücretsiz",
  percentage: "Yüzde",
  fixed_amount: "Sabit Tutar",
  adult_price: "Yetişkin Fiyatı",
  override_price: "Fiyatı Değiştir",
};
