"use client";

import type { MoisChartPoint } from "@/actions/declaration";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  points: MoisChartPoint[];
  pointsN1?: MoisChartPoint[];
}

// Merge N-1 CA into current-year points for ComposedChart
function mergeN1(
  points: MoisChartPoint[],
  pointsN1?: MoisChartPoint[]
): Array<MoisChartPoint & { ca_n1?: number }> {
  if (!pointsN1 || pointsN1.every((p) => p.ca === 0)) return points;
  const n1Map = new Map(pointsN1.map((p) => [p.mois_num, p.ca]));
  return points.map((p) => ({
    ...p,
    ca_n1: n1Map.get(p.mois_num) ?? 0,
  }));
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type TooltipPayloadItem = { dataKey: string; value: number };
type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  anneeN1?: number;
};

function CustomTooltip({ active, payload, label, anneeN1 }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const net = payload.find((p) => p.dataKey === "net")?.value ?? 0;
  const cotisations = payload.find((p) => p.dataKey === "cotisations")?.value ?? 0;
  const ca = net + cotisations;
  const caN1 = payload.find((p) => p.dataKey === "ca_n1")?.value;
  const tauxCharge = ca > 0 ? ((cotisations / ca) * 100).toFixed(1) : "—";
  const diff =
    caN1 !== undefined && caN1 > 0 && ca > 0
      ? (((ca - caN1) / caN1) * 100).toFixed(0)
      : null;

  return (
    <div className="bg-popover w-52 rounded-xl border p-4 text-sm shadow-lg">
      <p className="text-foreground mb-3 border-b pb-2 font-semibold">{label}</p>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#6366f1]" />
            CA déclaré
          </span>
          <span className="text-sm font-semibold">{EUR.format(ca)}</span>
        </div>
        {caN1 !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2 text-xs">
              <span
                className="inline-block h-px w-4"
                style={{ background: "#a78bfa", borderTop: "2px dashed #a78bfa" }}
              />
              CA {anneeN1}
            </span>
            <span className="text-xs font-medium text-[#a78bfa]">
              {caN1 > 0 ? EUR.format(caN1) : "—"}
              {diff && (
                <span
                  className={`ml-1 ${parseFloat(diff) >= 0 ? "text-emerald-500" : "text-red-400"}`}
                >
                  ({parseFloat(diff) >= 0 ? "+" : ""}
                  {diff} %)
                </span>
              )}
            </span>
          </div>
        )}
        <div className="bg-border/50 h-px" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#10b981]" />
            Revenu net
          </span>
          <span className="text-xs font-medium text-[#10b981]">{EUR.format(net)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#f59e0b]" />
            Cotisations
          </span>
          <span className="text-xs font-medium text-[#f59e0b]">
            {EUR.format(cotisations)}
          </span>
        </div>
        <div className="bg-border/50 h-px" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Taux de charges</span>
          <span className="bg-muted rounded px-1.5 py-0.5 font-semibold">
            {tauxCharge} %
          </span>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarLabel({ x, y, width, value }: any) {
  if (!value || value <= 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      textAnchor="middle"
      fontSize={9}
      fill="currentColor"
      opacity={0.5}
    >
      {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
    </text>
  );
}

export function ChartCA({ points, pointsN1 }: Props) {
  const hasN1 = pointsN1 && pointsN1.some((p) => p.ca > 0);
  const mergedPoints = mergeN1(points, pointsN1);
  const anneeN1 = hasN1 ? new Date().getFullYear() - 1 : undefined;

  const hasData = points.some((p) => p.ca > 0);
  const activePoints = points.filter((p) => p.ca > 0);

  const totalCA = points.reduce((s, p) => s + p.ca, 0);
  const totalCotis = points.reduce((s, p) => s + p.cotisations, 0);
  const totalNet = points.reduce((s, p) => s + p.net, 0);
  const avgNet = activePoints.length > 0 ? Math.round(totalNet / activePoints.length) : 0;
  const avgCA = activePoints.length > 0 ? Math.round(totalCA / activePoints.length) : 0;
  const tauxMoyen = totalCA > 0 ? ((totalCotis / totalCA) * 100).toFixed(1) : "—";
  const moisMax = points.reduce((best, p) => (p.ca > best.ca ? p : best), points[0]);
  const moisActifs = activePoints.length;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            CA total
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums">{EUR.format(totalCA)}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {moisActifs} mois déclarés
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Revenu net
          </p>
          <p className="mt-1.5 text-xl font-bold text-[#10b981] tabular-nums">
            {EUR.format(totalNet)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Moy. {EUR.format(avgNet)} / mois
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Taux de charges
          </p>
          <p className="mt-1.5 text-xl font-bold text-[#f59e0b] tabular-nums">
            {tauxMoyen} %
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {EUR.format(totalCotis)} de cotisations
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Meilleur mois
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums">
            {moisActifs > 0 ? moisMax.mois : "—"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {moisActifs > 0 ? EUR.format(moisMax.ca) : "Aucune donnée"}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed">
          <div className="text-center">
            <p className="text-muted-foreground text-sm font-medium">
              Aucune déclaration
            </p>
            <p className="text-muted-foreground/60 mt-1 text-xs">
              Déclarez votre premier CA pour voir les graphiques
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Légende inline */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-5 text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#10b981]" /> Revenu
              net
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#f59e0b]" />{" "}
              Cotisations URSSAF
            </span>
            {hasN1 && (
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className="inline-block h-px w-5"
                  style={{ borderTop: "2px dashed #a78bfa" }}
                />
                CA {anneeN1}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5 font-medium">
              <span className="border-muted-foreground/50 inline-block h-px w-5 border-t-2 border-dashed" />
              Moyenne mensuelle
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={mergedPoints}
              margin={{ top: 16, right: 6, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <defs>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="gCotis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="0"
                stroke="currentColor"
                strokeOpacity={0.06}
                vertical={false}
              />
              <XAxis
                dataKey="mois"
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
                }
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip anneeN1={anneeN1} />}
                cursor={{ fill: "currentColor", fillOpacity: 0.03, radius: 6 }}
              />
              <ReferenceLine
                y={avgCA}
                stroke="currentColor"
                strokeOpacity={0.3}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              {/* Stacked: net (bottom) + cotisations (top) = CA total */}
              <Bar
                dataKey="net"
                name="Net"
                stackId="ca"
                fill="url(#gNet)"
                radius={[0, 0, 0, 0]}
                maxBarSize={52}
              >
                {points.map((p, i) => (
                  <Cell key={i} fill={p.ca > 0 ? "url(#gNet)" : "transparent"} />
                ))}
              </Bar>
              <Bar
                dataKey="cotisations"
                name="Cotisations"
                stackId="ca"
                fill="url(#gCotis)"
                radius={[4, 4, 0, 0]}
                maxBarSize={52}
                label={<BarLabel />}
              >
                {points.map((p, i) => (
                  <Cell key={i} fill={p.ca > 0 ? "url(#gCotis)" : "transparent"} />
                ))}
              </Bar>
              {/* Overlay N-1 CA comme ligne en pointillés */}
              {hasN1 && (
                <Line
                  type="monotone"
                  dataKey="ca_n1"
                  name={`CA ${anneeN1}`}
                  stroke="#a78bfa"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, fill: "#a78bfa" }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
