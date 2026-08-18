import {
  getTicketProviderHealth,
} from "@/lib/tickets/provider";

function statusClass(
  status: string
) {
  if (status === "healthy") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "degraded") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (status === "offline") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/[.04] text-slate-400";
}

function dateLabel(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleString(
    "tr-TR"
  );
}

export default function TicketProviderHealthPage() {
  const providers =
    getTicketProviderHealth();

  const activeCount =
    providers.filter(
      (provider) =>
        provider.enabled
    ).length;

  const healthyCount =
    providers.filter(
      (provider) =>
        provider.status ===
        "healthy"
    ).length;

  const totalRequests =
    providers.reduce(
      (total, provider) =>
        total +
        provider.totalRequests,
      0
    );

  const errorCount =
    providers.reduce(
      (total, provider) =>
        total +
        provider.errorCount,
      0
    );

  const fallbackEvents =
    providers.reduce(
      (total, provider) =>
        total +
        provider.fallbackEvents,
      0
    );

  return (
    <main className="min-h-screen bg-[#040b12] px-5 py-10 text-white lg:px-8">
      <div className="mx-auto max-w-[1500px]">

        <div className="rounded-[32px] border border-white/10 bg-[#07131f] p-7 md:p-10">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-orange-400">
            TUROBUS TICKET INFRASTRUCTURE
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Provider Health Center
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            Otobüs, uçak, feribot ve tren sağlayıcılarının
            çalışma durumu, gecikme süresi, hata oranı ve
            fallback olaylarını tek merkezden takip eder.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <Stat
              label="Aktif Provider"
              value={activeCount}
            />

            <Stat
              label="Healthy"
              value={healthyCount}
            />

            <Stat
              label="Toplam İstek"
              value={totalRequests}
            />

            <Stat
              label="Hata"
              value={errorCount}
            />

            <Stat
              label="Failover"
              value={fallbackEvents}
            />

          </div>
        </div>

        <div className="mt-7 grid gap-5 xl:grid-cols-2">

          {providers.map(
            (provider) => (

              <div
                key={
                  provider.providerId
                }
                className="rounded-[26px] border border-white/10 bg-[#07131f] p-6"
              >

                <div className="flex flex-wrap items-start justify-between gap-4">

                  <div>
                    <div className="text-xl font-black">
                      {provider.name}
                    </div>

                    <div className="mt-1 font-mono text-[10px] text-slate-600">
                      {provider.providerId}
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${statusClass(
                      provider.status
                    )}`}
                  >
                    {provider.status}
                  </span>

                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">

                  <Metric
                    label="Latency"
                    value={
                      provider.latencyMs ===
                      null
                        ? "-"
                        : `${provider.latencyMs} ms`
                    }
                  />

                  <Metric
                    label="İstek"
                    value={
                      provider.totalRequests
                    }
                  />

                  <Metric
                    label="Başarılı"
                    value={
                      provider.successCount
                    }
                  />

                  <Metric
                    label="Hata"
                    value={
                      provider.errorCount
                    }
                  />

                  <Metric
                    label="Ardışık Hata"
                    value={
                      provider.consecutiveErrors
                    }
                  />

                  <Metric
                    label="Failover"
                    value={
                      provider.fallbackEvents
                    }
                  />

                  <Metric
                    label="Priority"
                    value={
                      provider.priority
                    }
                  />

                  <Metric
                    label="Fallback"
                    value={
                      provider.fallback
                        ? "Evet"
                        : "Hayır"
                    }
                  />

                </div>

                <div className="mt-5 grid gap-3 text-xs md:grid-cols-2">

                  <Info
                    label="Son Başarı"
                    value={
                      dateLabel(
                        provider.lastSuccessAt
                      )
                    }
                  />

                  <Info
                    label="Son Hata"
                    value={
                      dateLabel(
                        provider.lastErrorAt
                      )
                    }
                  />

                  <Info
                    label="Son İşlem"
                    value={
                      provider.lastOperation ??
                      "-"
                    }
                  />

                  <Info
                    label="Aktif"
                    value={
                      provider.enabled
                        ? "Evet"
                        : "Hayır"
                    }
                  />

                </div>

                <div className="mt-5">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                    Modlar
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {provider.modes.map(
                      (mode) => (
                        <span
                          key={mode}
                          className="rounded-lg border border-white/10 bg-[#030a11] px-3 py-1.5 text-[10px] font-bold uppercase text-slate-300"
                        >
                          {mode}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {provider.lastError && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-[#030a11] p-4">

                    <div className="text-[9px] font-black uppercase text-slate-600">
                      Son Sistem Mesajı
                    </div>

                    <div className="mt-2 text-xs leading-6 text-slate-400">
                      {provider.lastError}
                    </div>

                  </div>
                )}

              </div>
            )
          )}

        </div>

      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#030a11] p-5">
      <div className="text-[9px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black">
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white/[.035] p-3">

      <div className="text-[9px] uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 font-black">
        {value}
      </div>

    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#030a11] p-3">

      <div className="text-[9px] uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-xs font-semibold text-slate-300">
        {value}
      </div>

    </div>
  );
}
