"use client";

import type { ChartData, MoisChartPoint } from "@/actions/declaration";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  repartition: ChartData["repartition"];
  points: MoisChartPoint[];
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const SEGMENTS = [
  {
    key: "net_total" as const,
    label: "Revenu net",
    color: "#10b981",
    bgClass: "bg-[#10b981]",
  },
  {
    key: "cotisations_total" as const,
    label: "Cotisations URSSAF",
    color: "#f59e0b",
    bgClass: "bg-[#f59e0b]",
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-popover w-44 rounded-xl border p-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold">{name}</p>
      <p className="text-lg font-bold">{EUR.format(value)}</p>
      <p className="text-muted-foreground text-xs">
        {((value / p.ca_total) * 100).toFixed(1)} % du CA
      </p>
    </div>
  );
}

export function ChartRepartition({ repartition, points }: Props) {
  const { ca_total, cotisations_total, net_total } = repartition;

  if (ca_total === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground text-sm">
          Aucune déclaration pour cette période
        </p>
      </div>
    );
  }

  const data = SEGMENTS.map(({ key, label, color }) => ({
    name: label,
    value: repartition[key],
    color,
    ca_total,
  }));

  const tauxCharges = (cotisations_total / ca_total) * 100;
  const tauxNet = (net_total / ca_total) * 100;
  const avgMensuel =
    points.filter((p) => p.ca > 0).reduce((s, p) => s + p.net, 0) /
    Math.max(1, points.filter((p) => p.ca > 0).length);

  // Score de rentabilité: taux net vs seuils
  const score = tauxNet;
  const scoreColor =
    score >= 80
      ? "#10b981"
      : score >= 65
        ? "#6366f1"
        : score >= 50
          ? "#f59e0b"
          : "#ef4444";
  const scoreLabel =
    score >= 80
      ? "Excellent"
      : score >= 65
        ? "Très bon"
        : score >= 50
          ? "Correct"
          : "À surveiller";

  return (
    <div className="space-y-5">
      {/* Top KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            CA total
          </p>
          <p className="mt-1.5 text-lg font-bold tabular-nums">{EUR.format(ca_total)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Revenu net
          </p>
          <p className="mt-1.5 text-lg font-bold text-[#10b981] tabular-nums">
            {EUR.format(net_total)}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Net / mois
          </p>
          <p className="mt-1.5 text-lg font-bold tabular-nums">
            {EUR.format(Math.round(avgMensuel))}
          </p>
        </div>
      </div>

      {/* Donut + breakdown */}
      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
        {/* Donut */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={100}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Taux net
              </p>
              <p
                className="text-2xl font-black tabular-nums"
                style={{ color: scoreColor }}
              >
                {tauxNet.toFixed(0)} %
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          {SEGMENTS.map(({ key, label, color }) => {
            const val = repartition[key];
            const pct = (val / ca_total) * 100;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </span>
                  <div className="text-right">
                    <span className="font-bold">{EUR.format(val)}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      {pct.toFixed(1)} %
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}

          {/* Score card */}
          <div className="bg-card mt-2 rounded-xl border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Score de rentabilité
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ color: scoreColor, backgroundColor: scoreColor + "20" }}
              >
                {scoreLabel}
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1">
                <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, score)}%`,
                      backgroundColor: scoreColor,
                    }}
                  />
                </div>
                <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
                  <span>0 %</span>
                  <span>50 %</span>
                  <span>100 %</span>
                </div>
              </div>
              <p
                className="shrink-0 text-xl font-black tabular-nums"
                style={{ color: scoreColor }}
              >
                {score.toFixed(0)} %
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-muted/60 rounded-lg p-2.5">
              <p className="text-muted-foreground">Taux de charges</p>
              <p className="mt-0.5 text-sm font-bold text-[#f59e0b]">
                {tauxCharges.toFixed(1)} %
              </p>
            </div>
            <div className="bg-muted/60 rounded-lg p-2.5">
              <p className="text-muted-foreground">Taux net retenu</p>
              <p className="mt-0.5 text-sm font-bold text-[#10b981]">
                {tauxNet.toFixed(1)} %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
