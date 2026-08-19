
import {
  supabase,
} from "@/lib/supabase";


export type YachtQuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted"
  | "cancelled";


export type YachtQuote = {
  id: string;
  company_id: string;
  yacht_id: string;
  supplier_id:
    string | null;
  quote_code: string;

  customer_name: string;
  customer_phone:
    string | null;
  customer_email:
    string | null;

  start_date: string;
  end_date: string;
  guest_count: number;

  currency: string;

  supplier_cost: number;
  extra_cost: number;
  total_cost: number;

  yacht_sale_price: number;
  extras_sale_price: number;
  sale_price: number;

  commission_amount: number;
  gross_profit: number;
  margin_percent: number;

  status:
    YachtQuoteStatus;

  public_token: string;

  valid_until:
    string | null;
  option_expires_at:
    string | null;

  customer_note:
    string | null;
  internal_note:
    string | null;

  sent_at:
    string | null;
  viewed_at:
    string | null;
  accepted_at:
    string | null;
  rejected_at:
    string | null;

  converted_booking_id:
    string | null;

  created_at: string;
  updated_at: string;
};


export type YachtQuoteItem = {
  id: string;
  quote_id: string;
  company_id: string;
  item_type: string;
  title: string;
  description:
    string | null;
  quantity: number;
  unit_cost: number;
  unit_sale: number;
  total_cost: number;
  total_sale: number;
  sort_order: number;
};


export async function loadYachtSalesCenter(
  companyId: string
) {
  const [
    quotes,
    items,
    yachts,
    suppliers,
    assignments,
  ] =
    await Promise.all([
      supabase
        .from(
          "yacht_os_quotes"
        )
        .select("*")
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
        ),

      supabase
        .from(
          "yacht_os_quote_items"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "sort_order"
        ),

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select(
          "id,name,yacht_type,city,marina,max_guests,base_daily_price,currency,status"
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_suppliers"
        )
        .select(
          "id,name,commission_rate,status"
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_supplier_yachts"
        )
        .select(
          "supplier_id,yacht_id"
        ),
    ]);

  const error =
    quotes.error ??
    items.error ??
    yachts.error ??
    suppliers.error ??
    assignments.error;

  if (error) {
    throw error;
  }

  return {
    quotes:
      (
        quotes.data ??
        []
      ) as
        YachtQuote[],

    items:
      (
        items.data ??
        []
      ) as
        YachtQuoteItem[],

    yachts:
      yachts.data ??
      [],

    suppliers:
      suppliers.data ??
      [],

    assignments:
      assignments.data ??
      [],
  };
}


export async function createYachtQuote(
  input: {
    companyId: string;
    userId: string;

    yachtId: string;
    supplierId?: string;

    customerName: string;
    customerPhone?: string;
    customerEmail?: string;

    startDate: string;
    endDate: string;
    guestCount: number;

    supplierCost: number;
    yachtSalePrice: number;

    commissionAmount: number;

    validUntil?: string;
    optionExpiresAt?: string;

    customerNote?: string;
    internalNote?: string;

    items: Array<{
      itemType: string;
      title: string;
      description?: string;
      quantity: number;
      unitCost: number;
      unitSale: number;
    }>;
  }
) {
  const extraCost =
    input.items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity *
        item.unitCost,
      0
    );

  const extrasSale =
    input.items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity *
        item.unitSale,
      0
    );

  const totalCost =
    input.supplierCost +
    extraCost;

  const salePrice =
    input.yachtSalePrice +
    extrasSale;

  const grossProfit =
    salePrice -
    totalCost;

  const marginPercent =
    salePrice > 0
      ? (
          grossProfit /
          salePrice
        ) *
        100
      : 0;

  const quoteCode =
    `YTK-${Date.now()
      .toString()
      .slice(-8)}`;

  const {
    data:
      quote,
    error:
      quoteError,
  } =
    await supabase
      .from(
        "yacht_os_quotes"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        yacht_id:
          input.yachtId,

        supplier_id:
          input.supplierId ??
          null,

        quote_code:
          quoteCode,

        customer_name:
          input.customerName,

        customer_phone:
          input.customerPhone ??
          null,

        customer_email:
          input.customerEmail ??
          null,

        start_date:
          input.startDate,

        end_date:
          input.endDate,

        guest_count:
          input.guestCount,

        supplier_cost:
          input.supplierCost,

        extra_cost:
          extraCost,

        total_cost:
          totalCost,

        yacht_sale_price:
          input.yachtSalePrice,

        extras_sale_price:
          extrasSale,

        sale_price:
          salePrice,

        commission_amount:
          input.commissionAmount,

        gross_profit:
          grossProfit,

        margin_percent:
          marginPercent,

        valid_until:
          input.validUntil
            ? new Date(
                input.validUntil
              ).toISOString()
            : null,

        option_expires_at:
          input.optionExpiresAt
            ? new Date(
                input.optionExpiresAt
              ).toISOString()
            : null,

        customer_note:
          input.customerNote ??
          null,

        internal_note:
          input.internalNote ??
          null,
      })
      .select("*")
      .single();

  if (quoteError) {
    throw quoteError;
  }

  if (
    input.items.length >
    0
  ) {
    const {
      error:
        itemError,
    } =
      await supabase
        .from(
          "yacht_os_quote_items"
        )
        .insert(
          input.items.map(
            (
              item,
              index
            ) => ({
              quote_id:
                quote.id,

              company_id:
                input.companyId,

              item_type:
                item.itemType,

              title:
                item.title,

              description:
                item.description ??
                null,

              quantity:
                item.quantity,

              unit_cost:
                item.unitCost,

              unit_sale:
                item.unitSale,

              total_cost:
                item.quantity *
                item.unitCost,

              total_sale:
                item.quantity *
                item.unitSale,

              sort_order:
                index + 1,
            })
          )
        );

    if (itemError) {
      throw itemError;
    }
  }

  return quote as
    YachtQuote;
}


export async function markYachtQuoteSent(
  quoteId: string
) {
  const {
    error,
  } =
    await supabase.rpc(
      "mark_yacht_quote_sent",
      {
        p_quote_id:
          quoteId,
      }
    );

  if (error) {
    throw error;
  }
}


export async function convertYachtQuote(
  quoteId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "convert_yacht_quote_to_booking",
      {
        p_quote_id:
          quoteId,
      }
    );

  if (error) {
    throw error;
  }

  return data as {
    ok: boolean;
    booking_id:
      string;
    booking_code:
      string;
  };
}


export async function cancelYachtQuote(
  quoteId: string,
  companyId: string
) {
  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_quotes"
      )
      .update({
        status:
          "cancelled",
      })
      .eq(
        "id",
        quoteId
      )
      .eq(
        "company_id",
        companyId
      );

  if (error) {
    throw error;
  }
}
