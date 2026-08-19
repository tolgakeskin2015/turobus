import {
  loadYachtOS,
} from "@/lib/yacht-os/repository";

import {
  loadYachtFinanceControlTower,
} from "@/lib/yacht-os/finance-control-tower";

import {
  loadYachtCRMAutomationCenter,
} from "@/lib/yacht-os/crm-automation";

import {
  loadYachtRevenueIntelligence,
} from "@/lib/yacht-os/revenue-intelligence";


export async function loadYachtExecutiveCenter(
  companyId: string
) {
  const [
    os,
    finance,
    crm,
    revenue,
  ] =
    await Promise.all([
      loadYachtOS(
        companyId
      ),

      loadYachtFinanceControlTower(
        companyId
      ),

      loadYachtCRMAutomationCenter(
        companyId
      ),

      loadYachtRevenueIntelligence(
        companyId
      ),
    ]);


  return {
    os,
    finance,
    crm,
    revenue,
  };
}
