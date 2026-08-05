export type PriceAdjustmentType =
  | "percentage"
  | "fixed_amount"
  | "multiplier"
  | "override_price";

export type PricingRuleSource =
  | "season"
  | "weekday"
  | "occupancy"
  | "child"
  | "event"
  | "early_booking"
  | "last_minute"
  | "length_of_stay"
  | "channel"
  | "promotion"
  | "coupon"
  | "manual";

export type PricingRule = {
  id: string;
  name: string;
  source: PricingRuleSource;
  adjustmentType: PriceAdjustmentType;
  adjustmentValue: number;
  priority: number;
  isActive: boolean;
  stopAfterApply?: boolean;
};

export type PricingStep = {
  ruleId: string;
  ruleName: string;
  source: PricingRuleSource;
  adjustmentType: PriceAdjustmentType;
  adjustmentValue: number;
  priceBefore: number;
  priceAfter: number;
  difference: number;
};

export type PricingEngineInput = {
  basePrice: number;
  currency: string;
  rules: PricingRule[];
  minimumPrice?: number | null;
  maximumPrice?: number | null;
  taxPercentage?: number;
};

export type PricingEngineResult = {
  basePrice: number;
  subtotal: number;
  taxAmount: number;
  finalPrice: number;
  currency: string;
  appliedRules: PricingStep[];
  skippedRules: PricingRule[];
  minimumPriceApplied: boolean;
  maximumPriceApplied: boolean;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ensureFiniteNumber(
  value: number,
  fallback = 0
): number {
  return Number.isFinite(value) ? value : fallback;
}

function applyAdjustment(
  currentPrice: number,
  type: PriceAdjustmentType,
  value: number
): number {
  const safePrice = ensureFiniteNumber(currentPrice);
  const safeValue = ensureFiniteNumber(value);

  switch (type) {
    case "percentage":
      return safePrice * (1 + safeValue / 100);

    case "fixed_amount":
      return safePrice + safeValue;

    case "multiplier":
      return safePrice * safeValue;

    case "override_price":
      return safeValue;

    default:
      return safePrice;
  }
}

export function calculateHotelPrice(
  input: PricingEngineInput
): PricingEngineResult {
  const basePrice = Math.max(
    0,
    ensureFiniteNumber(input.basePrice)
  );

  const activeRules = input.rules
    .filter((rule) => rule.isActive)
    .sort((first, second) => {
      if (first.priority !== second.priority) {
        return first.priority - second.priority;
      }

      return first.name.localeCompare(
        second.name,
        "tr-TR"
      );
    });

  const skippedRules = input.rules.filter(
    (rule) => !rule.isActive
  );

  const appliedRules: PricingStep[] = [];

  let currentPrice = basePrice;

  for (const rule of activeRules) {
    const priceBefore = currentPrice;

    currentPrice = Math.max(
      0,
      applyAdjustment(
        currentPrice,
        rule.adjustmentType,
        rule.adjustmentValue
      )
    );

    currentPrice = roundMoney(currentPrice);

    appliedRules.push({
      ruleId: rule.id,
      ruleName: rule.name,
      source: rule.source,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
      priceBefore: roundMoney(priceBefore),
      priceAfter: currentPrice,
      difference: roundMoney(
        currentPrice - priceBefore
      ),
    });

    if (rule.stopAfterApply) {
      break;
    }
  }

  let minimumPriceApplied = false;
  let maximumPriceApplied = false;

  const minimumPrice =
    input.minimumPrice == null
      ? null
      : Math.max(
          0,
          ensureFiniteNumber(input.minimumPrice)
        );

  const maximumPrice =
    input.maximumPrice == null
      ? null
      : Math.max(
          0,
          ensureFiniteNumber(input.maximumPrice)
        );

  if (
    minimumPrice !== null &&
    currentPrice < minimumPrice
  ) {
    currentPrice = minimumPrice;
    minimumPriceApplied = true;
  }

  if (
    maximumPrice !== null &&
    currentPrice > maximumPrice
  ) {
    currentPrice = maximumPrice;
    maximumPriceApplied = true;
  }

  const subtotal = roundMoney(currentPrice);

  const taxPercentage = Math.max(
    0,
    ensureFiniteNumber(
      input.taxPercentage ?? 0
    )
  );

  const taxAmount = roundMoney(
    subtotal * (taxPercentage / 100)
  );

  const finalPrice = roundMoney(
    subtotal + taxAmount
  );

  return {
    basePrice,
    subtotal,
    taxAmount,
    finalPrice,
    currency: input.currency,
    appliedRules,
    skippedRules,
    minimumPriceApplied,
    maximumPriceApplied,
  };
}

export function formatPricingRuleValue(
  rule: Pick<
    PricingRule,
    "adjustmentType" | "adjustmentValue"
  >
): string {
  switch (rule.adjustmentType) {
    case "percentage":
      return `${rule.adjustmentValue}%`;

    case "fixed_amount":
      return `${rule.adjustmentValue}`;

    case "multiplier":
      return `×${rule.adjustmentValue}`;

    case "override_price":
      return `${rule.adjustmentValue}`;

    default:
      return String(rule.adjustmentValue);
  }
}
