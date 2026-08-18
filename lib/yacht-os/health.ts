
import {
  supabase,
} from "@/lib/supabase";

export async function getYachtOSHealth(
  companyId: string
) {
  const tables = [
    "yacht_os_yachts",
    "yacht_os_bookings",
    "yacht_os_availability",
    "yacht_os_tasks",
    "yacht_os_suppliers",
    "yacht_os_finance_entries",
  ] as const;

  const results =
    await Promise.all(
      tables.map(
        async (
          table
        ) => {
          const {
            count,
            error,
          } =
            await supabase
              .from(table)
              .select(
                "id",
                {
                  count:
                    "exact",
                  head:
                    true,
                }
              )
              .eq(
                "company_id",
                companyId
              );

          return {
            table,
            ok:
              !error,
            count:
              count ??
              0,
            error:
              error?.message ??
              null,
          };
        }
      )
    );

  return {
    ok:
      results.every(
        (
          result
        ) =>
          result.ok
      ),

    tables:
      results,
  };
}
