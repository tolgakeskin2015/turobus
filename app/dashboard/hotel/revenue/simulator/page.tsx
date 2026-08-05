"use client";

import { useState } from "react";
import DatabaseRuleLoader from "@/components/hotel/revenue/simulator/DatabaseRuleLoader";
import PricingSimulator from "@/components/hotel/revenue/simulator/PricingSimulator";
import { PricingRule } from "@/lib/hotel/pricing-engine";

export default function PricingSimulatorPage() {
  const [importedRules, setImportedRules] =
    useState<PricingRule[]>([]);

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS PRICING ENGINE
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Fiyat Simülatörü
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            Veritabanındaki gerçek fiyat kurallarını
            yükleyin veya manuel kurallarla canlı
            hesaplama yapın.
          </p>
        </header>

        <div className="mt-8">
          <DatabaseRuleLoader
            onRulesLoaded={setImportedRules}
          />
        </div>

        <div className="mt-8">
          <PricingSimulator
            importedRules={importedRules}
          />
        </div>
      </div>
    </main>
  );
}
