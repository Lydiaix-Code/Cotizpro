"use client";

import type { MoisChartPoint } from "@/actions/declaration";
import {
  Area,
  AreaChart,
  CartesianGrid,
  RadialBar,
  RadialBarChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  points: MoisChartPoint[];
  plafond: number;
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function buildCumulPoints(points: MoisChartPoint[], plafond: number) {
  let cumul = 0;
  return points.map((p) => {
    cumul += p.ca;
    return { mois: p.mois, ca_cumule: Math.round(cumul), plafond };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const cumul = payload[0]?.value ?? 0;
  const plafond = payload[0]?.payload?.plafond ?? 1;
  const pct = ((cumul / plafond) * 100).toFixed(1);
  const restant = plafond - cumul;
  const isAlert = cumul >= plafond * 0.8;

  return (
    <div className="bg-popover w-52 rounded-xl border p-4 text-sm shadow-lg">
      <p className="mb-3 border-b pb-2 font-semibold">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">CA cumulé</span>
          <span className="font-bold">{EUR.format(cumul)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Restant</span>
          <span className={`font-semibold ${restant < 0 ? "text-red-500" : ""}`}>
            {restant < 0 ? "Dépassé" : EUR.format(restant)}
          </span>
        </div>
        <div className="bg-border/50 h-px" />
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted-foreground">Progression</span>
          <span className={`font-bold ${isAlert ? "text-orange-500" : "text-[#6366f1]"}`}>
            {pct} %
          </span>
        </div>
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full ${isAlert ? "bg-orange-500" : "bg-[#6366f1]"}`}
            style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ChartPlafond({ points, plafond }: Props) {
  const hasData = points.some((p) => p.ca > 0);
  const data = buildCumulPoints(points, plafond);
  const caActuel = data[data.length - 1]?.ca_cumule ?? 0;
  const pct = Math.min(100, (caActuel / plafond) * 100);
  const alerte80 = Math.round(plafond * 0.8);
  const yMax = Math.ceil((plafond * 1.1) / 1000) * 1000;
  const isDanger = pct >= 100;
  const isAlert = pct >= 80;
  const gaugeColor = isDanger ? "#ef4444" : isAlert ? "#f59e0b" : "#6366f1";
  const restant = Math.max(0, plafond - caActuel);

  // Month-based projection — how many months remain
  const moisAvecCA = points.filter((p) => p.ca > 0).length;
  const avgMensuel = moisAvecCA > 0 ? caActuel / moisAvecCA : 0;
  const projectionAnnuelle = Math.round(avgMensuel * 12);

  // Gauge data (0-100 scale)
  const gaugeData = [{ value: pct, fill: gaugeColor }];
  const gaugeBg = [{ value: 100, fill: "#e2e8f0" }];

  return (
    <div className="space-y-5">
      {/* Gauge hero + metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Gauge */}
        <div className="bg-card flex flex-col items-center justify-center rounded-xl border p-6">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            Utilisation du plafond légal
          </p>
          <div className="flex flex-col items-center">
            {/* Gauge arc — text kept outside the SVG to avoid overlap */}
            <div className="relative" style={{ width: 220, height: 115 }}>
              <ResponsiveContainer width={220} height={115}>
                <RadialBarChart
                  cx="50%"
                  cy="92%"
                  innerRadius={70}
                  outerRadius={95}
                  startAngle={180}
                  endAngle={0}
                  data={gaugeBg}
                  barSize={14}
                >
                  <RadialBar dataKey="value" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0">
                <ResponsiveContainer width={220} height={115}>
                  <RadialBarChart
                    cx="50%"
                    cy="92%"
                    innerRadius={70}
                    outerRadius={95}
                    startAngle={180}
                    endAngle={Math.round(180 - pct * 1.8)}
                    data={gaugeData}
                    barSize={14}
                  >
                    <RadialBar dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Percentage text below the arc, in normal flow — no overlap */}
            <div className="-mt-1 flex flex-col items-center">
              <p
                className="text-3xl leading-none font-black tabular-nums"
                style={{ color: gaugeColor }}
              >
                {pct.toFixed(1)} %
              </p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                {isDanger
                  ? "Plafond dépassé ⚠"
                  : isAlert
                    ? "Zone critique ⚠"
                    : "Progression"}
              </p>
            </div>
          </div>
          <div className="text-muted-foreground mt-3 flex gap-3 text-xs">
            <span>0 €</span>
            <span className="flex-1 text-center">80% — {EUR.format(alerte80)}</span>
            <span>{EUR.format(plafond)}</span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              CA cumulé
            </p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">
              {EUR.format(caActuel)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              sur {EUR.format(plafond)}
            </p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Restant
            </p>
            <p
              className={`mt-1.5 text-xl font-bold tabular-nums ${isDanger ? "text-red-500" : ""}`}
            >
              {isDanger ? "—" : EUR.format(restant)}
            </p>
            <p
              className={`mt-0.5 text-xs ${isDanger ? "text-red-500/70" : "text-muted-foreground"}`}
            >
              {isDanger ? "Plafond dépassé" : "avant le plafond"}
            </p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Moy. mensuelle
            </p>
            <p className="mt-1.5 text-xl font-bold tabular-nums">
              {moisAvecCA > 0 ? EUR.format(Math.round(avgMensuel)) : "—"}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">sur {moisAvecCA} mois</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Projection annuelle
            </p>
            <p
              className={`mt-1.5 text-xl font-bold tabular-nums ${projectionAnnuelle > plafond ? "text-orange-500" : ""}`}
            >
              {moisAvecCA > 0 ? EUR.format(projectionAnnuelle) : "—"}
            </p>
            <p
              className={`mt-0.5 text-xs ${projectionAnnuelle > plafond ? "text-orange-500/70" : "text-muted-foreground"}`}
            >
              {projectionAnnuelle > plafond
                ? "⚠ dépasse le plafond"
                : "estimation annuelle"}
            </p>
          </div>
        </div>
      </div>

      {/* Area chart detail */}
      {!hasData ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground text-sm">
            Aucune déclaration pour cette période
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Évolution du CA cumulé
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gCumul2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gaugeColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={gaugeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <ReferenceArea
                y1={alerte80}
                y2={plafond}
                fill="#f59e0b"
                fillOpacity={0.05}
              />
              <CartesianGrid
                strokeDasharray="0"
                stroke="currentColor"
                strokeOpacity={0.05}
                vertical={false}
              />
              <XAxis
                dataKey="mois"
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
                }
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={[0, yMax]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: gaugeColor, strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <ReferenceLine
                y={alerte80}
                stroke="#f59e0b"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{
                  value: "80%",
                  fill: "#f59e0b",
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
              <ReferenceLine
                y={plafond}
                stroke="#ef4444"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{
                  value: "Plafond",
                  fill: "#ef4444",
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
              <Area
                type="monotone"
                dataKey="ca_cumule"
                stroke={gaugeColor}
                strokeWidth={2.5}
                fill={`url(#gCumul2)`}
                dot={{ r: 2.5, fill: gaugeColor, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: gaugeColor, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
