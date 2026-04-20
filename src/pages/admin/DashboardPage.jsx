import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Plus,
  AlertCircle,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowRight,
  PieChart,
  Activity,
  MoreVertical,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { getAdminProducts } from '@/services/adminProductService';
import { getAdminOrders } from '@/services/adminOrderService';
import { getAdminSalesTrend, getAdminSalesTrendDaily } from '@/services/adminAnalyticsService';

const QUICK_ACTIONS = [
  {
    to: '/admin/products/new',
    label: 'Add Product',
    icon: Plus,
    color: 'bg-primary text-white',
  },
  {
    to: '/admin/orders',
    label: 'View Orders',
    icon: ShoppingCart,
    color: 'bg-white border border-border text-primary hover:bg-gray-50',
  },
];

function formatPrice(value) {
  if (typeof value !== 'number') return '—';
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthPeriod(period) {
  if (!period || typeof period !== 'string' || !period.includes('-')) return period ?? '';
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function formatDayPeriod(period) {
  if (!period || typeof period !== 'string') return period ?? '';
  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMonthInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultMonthlyRange() {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const toDate = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: formatMonthInput(fromDate), to: formatMonthInput(toDate) };
}

function getDefaultDailyRange() {
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(now.getDate() - 29);
  return { from: formatDateInput(fromDate), to: formatDateInput(now) };
}

function formatCompactNu(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `Nu ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `Nu ${(n / 1_000).toFixed(1)}K`;
  return `Nu ${formatPrice(n)}`;
}

function formatDayShort(period) {
  if (!period || typeof period !== 'string') return '';
  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Builds paired series for diverging bars: YoY when two calendar years exist in monthly data,
 * otherwise prior month / prior day as the “down” series.
 */
function prepareDivergingSeries(points, mode) {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      labels: [],
      up: [],
      down: [],
      periods: [],
      kind: 'empty',
      legendUp: '',
      legendDown: '',
    };
  }

  if (mode === 'daily') {
    const sorted = [...points].sort((a, b) => String(a.period).localeCompare(String(b.period)));
    const up = sorted.map((p) => Number(p.value ?? 0));
    const down = sorted.map((_, i) => (i > 0 ? Number(sorted[i - 1].value ?? 0) : 0));
    const labels = sorted.map((p) => formatDayShort(p.period));
    const periods = sorted.map((p) => String(p.period ?? ''));
    return {
      labels,
      periods,
      up,
      down,
      kind: 'dod',
      legendUp: 'Period',
      legendDown: 'Prior day',
    };
  }

  const parsed = points
    .map((p) => {
      const parts = String(p.period ?? '').split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      return {
        year,
        month,
        value: Number(p.value ?? 0),
        period: p.period,
      };
    })
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.month));

  if (parsed.length === 0) {
    return { labels: [], up: [], down: [], periods: [], kind: 'empty', legendUp: '', legendDown: '' };
  }

  const years = [...new Set(parsed.map((p) => p.year))].sort((a, b) => a - b);
  const byKey = new Map();
  parsed.forEach((p) => {
    byKey.set(`${p.year}-${p.month}`, p.value);
  });

  if (years.length >= 2) {
    const yearUp = years[years.length - 1];
    const yearDown = yearUp - 1;
    const monthsUp = [...new Set(parsed.filter((p) => p.year === yearUp).map((p) => p.month))].sort(
      (a, b) => a - b
    );
    const labels = [];
    const periods = [];
    const up = [];
    const down = [];
    for (const m of monthsUp) {
      up.push(byKey.get(`${yearUp}-${m}`) ?? 0);
      down.push(byKey.get(`${yearDown}-${m}`) ?? 0);
      labels.push(new Date(yearUp, m - 1, 1).toLocaleDateString(undefined, { month: 'short' }));
      periods.push(`${yearUp}-${String(m).padStart(2, '0')}`);
    }
    return {
      labels,
      periods,
      up,
      down,
      kind: 'yoy',
      legendUp: String(yearUp),
      legendDown: String(yearDown),
    };
  }

  const sorted = [...parsed].sort((a, b) => a.year - b.year || a.month - b.month);
  const up = sorted.map((p) => p.value);
  const down = sorted.map((_, i) => (i > 0 ? sorted[i - 1].value : 0));
  const labels = sorted.map((p) =>
    new Date(p.year, p.month - 1, 1).toLocaleDateString(undefined, { month: 'short' })
  );
  const y = sorted[0]?.year ?? '';
  const periods = sorted.map((p) => `${p.year}-${String(p.month).padStart(2, '0')}`);
  return {
    labels,
    periods,
    up,
    down,
    kind: 'mom',
    legendUp: String(y),
    legendDown: 'Prior mo.',
  };
}

function roundNice(n) {
  if (!Number.isFinite(n) || n <= 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const f = n / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

/** Area chart + metric tabs (reference: minimalist dashboard card) */
function RevenueAreaChart({
  labels = [],
  periods = [],
  up = [],
  down = [],
  legendUp = '',
  legendDown = '',
  mode = 'monthly',
  totalUp = 0,
  totalDown = 0,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const fillGradId = `areaFill-${useId().replace(/:/g, '')}`;
  const ease = [0.22, 1, 0.36, 1];

  const n = labels.length;
  const values = activeTab === 0 ? up : down;
  const activeLegend = activeTab === 0 ? legendUp : legendDown;

  if (n === 0) {
    return <p className="text-sm text-gray-500">No data for this range.</p>;
  }

  const isDaily = mode === 'daily';
  const width = 640;
  const height = 260;
  const padL = 48;
  const padR = 20;
  const padT = 16;
  const padB = isDaily ? 22 : 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxRaw = Math.max(1e-9, ...values.map((v) => Number(v ?? 0)));
  const yMax = roundNice(maxRaw);

  const points = values.map((raw, i) => {
    const v = Number(raw ?? 0);
    const x = n === 1 ? padL + plotW / 2 : padL + (i / Math.max(n - 1, 1)) * plotW;
    const y = padT + plotH - (v / yMax) * plotH;
    return { x, y, v };
  });

  const bottomY = padT + plotH;
  const lineD =
    n === 1
      ? `M ${points[0].x} ${points[0].y}`
      : points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const band = Math.min(6, plotW * 0.02);
  const areaD =
    n === 1
      ? `M ${points[0].x - band} ${bottomY} L ${points[0].x - band} ${points[0].y} L ${points[0].x + band} ${points[0].y} L ${points[0].x + band} ${bottomY} Z`
      : `${lineD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => (yMax * i) / (yTickCount - 1));

  const labelStep = Math.max(1, Math.ceil(n / 9));

  const chartKey = `${activeTab}-${periods.join('|')}`;

  const onSvgPointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    points.forEach((pt, i) => {
      const d = Math.abs(pt.x - mx);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoveredIndex(nearest);
  };

  const hi = hoveredIndex != null ? points[hoveredIndex] : null;
  const hiPeriod = hoveredIndex != null ? periods[hoveredIndex] : null;

  return (
    <motion.div
      key={chartKey}
      className="w-full rounded-xl border border-gray-100 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease }}
    >
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab(0)}
          className={`min-w-0 flex-1 px-4 pb-3 pt-4 text-left transition-colors ${
            activeTab === 0 ? 'border-b-[3px] border-gray-900' : 'border-b-[3px] border-transparent hover:bg-gray-50/80'
          }`}
        >
          <p className="text-xs text-gray-500">{legendUp}</p>
          <p className="mt-0.5 truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {formatCompactNu(totalUp)}
          </p>
        </button>
        <div className="my-3 w-px shrink-0 bg-gray-200" aria-hidden />
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`min-w-0 flex-1 px-4 pb-3 pt-4 text-left transition-colors ${
            activeTab === 1 ? 'border-b-[3px] border-gray-900' : 'border-b-[3px] border-transparent hover:bg-gray-50/80'
          }`}
        >
          <p className="text-xs text-gray-500">{legendDown}</p>
          <p className="mt-0.5 truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {formatCompactNu(totalDown)}
          </p>
        </button>
      </div>

      <div className="w-full overflow-x-auto px-2 pb-3 pt-2 sm:px-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[240px] w-full min-w-[340px]"
          role="img"
          aria-label={`Revenue trend — ${activeLegend}`}
          onMouseMove={onSvgPointer}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#14b8a6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tv, gi) => {
            const y = padT + plotH - (tv / yMax) * plotH;
            return (
              <g key={`yt-${gi}`}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="3 6"
                />
                <text x={padL - 10} y={y + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
                  {tv >= 1000 ? `${(tv / 1000).toFixed(0)}k` : Math.round(tv)}
                </text>
              </g>
            );
          })}

          <motion.path
            d={areaD}
            fill={`url(#${fillGradId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease }}
          />
          <motion.path
            d={lineD}
            fill="none"
            stroke="#0f766e"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.85, ease }}
          />

          {labels.map((lab, i) => {
            if (i % labelStep !== 0 && i !== n - 1) return null;
            const x = points[i].x;
            return (
              <text
                key={`xlab-${periods[i] || lab}-${i}`}
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-gray-500 text-[10px]"
              >
                {lab}
              </text>
            );
          })}

          {hi ? (
            <g>
              <line
                x1={hi.x}
                y1={padT}
                x2={hi.x}
                y2={bottomY}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <circle cx={hi.x} cy={hi.y} r="5" fill="#fff" stroke="#0f766e" strokeWidth="2" />
              <rect
                x={Math.min(Math.max(hi.x - 78, 8), width - 164)}
                y={10}
                width="156"
                height="48"
                rx="8"
                fill="#111827"
              />
              {hiPeriod ? (
                <text x={hi.x} y={28} textAnchor="middle" className="fill-white text-[10px] font-semibold">
                  {isDaily ? formatDayPeriod(hiPeriod) : formatMonthPeriod(hiPeriod)}
                </text>
              ) : null}
              <text x={hi.x} y={44} textAnchor="middle" className="fill-gray-200 text-[10px]">
                {activeLegend} · Nu {formatPrice(Number(values[hoveredIndex] ?? 0))}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </motion.div>
  );
}

function formatGrowthPercentLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10) / 10;
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${s}%`;
}

/**
 * Growth from the latest chart point vs. its comparison bar (daily: last day vs. prior day;
 * monthly MoM: last month vs. prior month; YoY: last month vs. same month last year).
 */
function growthFromLatestVersusPreviousPair(up, down) {
  if (!Array.isArray(up) || !Array.isArray(down) || up.length === 0) return null;
  const i = up.length - 1;
  const cur = Number(up[i]);
  const prev = Number(down[i]);
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function RevenueGrowthGauge({ percent }) {
  const gradId = `gaugeArcGrad-${useId().replace(/:/g, '')}`;
  const negGradId = `gaugeArcGradNeg-${useId().replace(/:/g, '')}`;
  const p = percent == null ? NaN : Number(percent);
  const isFinitePct = Number.isFinite(p);
  const isNeg = isFinitePct && p < 0;
  const magnitude = isFinitePct ? Math.min(100, Math.abs(p)) : 0;
  const r = 52;
  const cx = 70;
  const cy = 70;
  const endAngle = Math.PI + (magnitude / 100) * Math.PI;

  const polar = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const describeArc = (from, to) => {
    const p1 = polar(from);
    const p2 = polar(to);
    const large = to - from > Math.PI ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
  };

  const gaugeEase = [0.22, 1, 0.36, 1];
  const ticks = 24;
  const tickEls = [];
  for (let i = 0; i < ticks; i += 1) {
    const a0 = Math.PI + (i / ticks) * Math.PI;
    const a1 = a0 + (Math.PI / ticks) * 0.55;
    const inner = 58;
    const outer = 64;
    const i1 = {
      x: cx + inner * Math.cos(a0),
      y: cy + inner * Math.sin(a0),
    };
    const i2 = {
      x: cx + outer * Math.cos(a0),
      y: cy + outer * Math.sin(a0),
    };
    const o2 = {
      x: cx + outer * Math.cos(a1),
      y: cy + outer * Math.sin(a1),
    };
    const o1 = {
      x: cx + inner * Math.cos(a1),
      y: cy + inner * Math.sin(a1),
    };
    const t = i / (ticks - 1);
    const gray = Math.round(220 - t * 180);
    const op = 0.35 + t * 0.55;
    tickEls.push(
      <motion.path
        key={`tk-${i}`}
        d={`M ${i1.x} ${i1.y} L ${i2.x} ${i2.y} L ${o2.x} ${o2.y} L ${o1.x} ${o1.y} Z`}
        fill={`rgb(${gray},${gray},${gray})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: op }}
        transition={{ delay: 0.04 + i * 0.016, duration: 0.4, ease: gaugeEase }}
      />
    );
  }

  const pctLabel = formatGrowthPercentLabel(p);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: gaugeEase, delay: 0.06 }}
    >
      <div className="relative h-[92px] w-40 shrink-0">
        <svg
          viewBox="0 0 140 88"
          className="absolute inset-0 h-full w-full text-gray-900"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <linearGradient id={negGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
          {tickEls}
          <motion.path
            d={describeArc(Math.PI, 2 * Math.PI)}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          />
          <motion.path
            d={describeArc(Math.PI, endAngle)}
            fill="none"
            stroke={isNeg ? `url(#${negGradId})` : `url(#${gradId})`}
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.05, ease: gaugeEase, delay: 0.2 }}
          />
        </svg>
        <div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end pb-1 pt-5"
          aria-live="polite"
        >
          <motion.span
            className={`text-sm font-semibold leading-none tracking-tight tabular-nums ${
              isNeg ? 'text-red-600' : 'text-gray-900'
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease: gaugeEase }}
          >
            {pctLabel}
          </motion.span>
          <motion.span
            className="mt-1.5 text-[11px] font-medium text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.35 }}
          >
            Growth
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

/** Skeleton placeholder while sales trend / revenue chart data loads */
function RevenueChartSkeleton() {
  return (
    <div
      className="flex flex-col lg:flex-row lg:divide-x lg:divide-gray-200"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading revenue chart"
    >
      <div className="min-w-0 flex-1 p-5 sm:p-6 lg:pr-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="w-full max-w-md space-y-2 animate-pulse">
            <div className="h-5 w-36 rounded-md bg-gray-200" />
            <div className="h-3 w-52 rounded bg-gray-100" />
          </div>
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-100" />
        </div>

        <div className="animate-pulse rounded-xl border border-gray-100 bg-white">
          <div className="flex border-b border-gray-100 px-2">
            <div className="flex-1 space-y-2 px-3 py-4">
              <div className="h-3 w-16 rounded bg-gray-100" />
              <div className="h-8 w-24 rounded-md bg-gray-200" />
            </div>
            <div className="my-4 w-px shrink-0 bg-gray-200" />
            <div className="flex-1 space-y-2 px-3 py-4">
              <div className="h-3 w-20 rounded bg-gray-100" />
              <div className="h-8 w-28 rounded-md bg-gray-200" />
            </div>
          </div>
          <div className="flex h-[240px] min-w-[300px] gap-2 px-3 py-3">
            <div className="flex w-8 shrink-0 flex-col justify-between py-2">
              {[1, 2, 3, 4, 5].map((k) => (
                <div key={k} className="h-2 w-5 rounded bg-gray-200" />
              ))}
            </div>
            <div className="relative min-w-0 flex-1 rounded-md bg-gray-50">
              <div className="absolute inset-x-2 bottom-8 top-6 rounded-[40%_40%_0_0] bg-gradient-to-b from-teal-200/50 to-gray-100" />
              <div className="absolute inset-x-2 bottom-8 top-10 border-b-2 border-teal-300/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col border-t border-gray-200 p-5 sm:p-6 lg:w-[280px] lg:border-t-0 lg:pl-8">
        <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-gray-100" />
        <div className="mx-auto flex w-full max-w-[160px] flex-col items-center animate-pulse">
          <div className="h-20 w-40 rounded-t-full bg-gray-200" />
          <div className="-mt-1 h-4 w-16 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-28 rounded bg-gray-100" />
        </div>
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-20 rounded bg-gray-100" />
              <div className="h-5 w-28 rounded-md bg-gray-200" />
            </div>
          </div>
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-gray-100" />
              <div className="h-5 w-24 rounded-md bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusLower = (status || '').toLowerCase();
  let styles = 'bg-gray-50 text-gray-700 border-gray-100';
  
  if (statusLower === 'cancelled' || statusLower === 'returned') {
    styles = 'bg-red-50 text-red-700 border-red-100';
  } else if (statusLower === 'delivered') {
    styles = 'bg-green-50 text-green-700 border-green-100';
  } else if (statusLower === 'shipped') {
    styles = 'bg-blue-50 text-blue-700 border-blue-100';
  } else if (statusLower === 'confirmed' || statusLower === 'processing') {
    styles = 'bg-amber-50 text-amber-700 border-amber-100';
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {status || 'Unknown'}
    </span>
  );
}

export default function DashboardPage() {
  const defaultMonthlyRange = getDefaultMonthlyRange();
  const defaultDailyRange = getDefaultDailyRange();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    analyzedOrdersCount: 0,
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockItemsAll, setLowStockItemsAll] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [outOfStockItemsAll, setOutOfStockItemsAll] = useState([]);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState({ points: [], summary: { total: 0, changePctVsPreviousPeriod: null } });
  const [salesTrendLoading, setSalesTrendLoading] = useState(true);
  const [salesTrendError, setSalesTrendError] = useState(null);
  const [salesTrendMode, setSalesTrendMode] = useState('monthly');
  const [monthlyRange, setMonthlyRange] = useState(defaultMonthlyRange);
  const [dailyRange, setDailyRange] = useState(defaultDailyRange);

  const loadSalesTrend = useCallback(async (mode, range) => {
    setSalesTrendLoading(true);
    setSalesTrendError(null);
    try {
      const trendResult = mode === 'daily'
        ? await getAdminSalesTrendDaily({ from: range.from, to: range.to })
        : await getAdminSalesTrend({ from: range.from, to: range.to });
      setSalesTrend(trendResult);
    } catch (err) {
      setSalesTrendError(err?.message ?? 'Failed to load sales trend.');
    } finally {
      setSalesTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [productsResult, ordersResult] = await Promise.all([
          getAdminProducts({ page: 0, size: 20 }),
          getAdminOrders({ page: 0, size: 50 })
        ]);

        if (cancelled) return;

        // Process Products
        const products = Array.isArray(productsResult.content) ? productsResult.content : [];
        let lowStock = 0;
        let outOfStock = 0;
        const lowStockList = [];
        const lowStockListAll = [];
        const outOfStockList = [];
        const outOfStockListAll = [];

        for (const p of products) {
          // New model: variantGroups[].sizeOptions[]
          const groups = Array.isArray(p.variantGroups) ? p.variantGroups : [];
          if (groups.length > 0) {
            for (const g of groups) {
              const sizeOptions = Array.isArray(g?.sizeOptions) ? g.sizeOptions : [];
              for (const s of sizeOptions) {
                const qty = Number(s?.stockQuantity ?? 0);
                if (qty === 0) {
                  outOfStock++;
                  outOfStockListAll.push({
                    id: s?.id,
                    name: p?.name,
                    sku: s?.sku,
                    quantity: qty,
                    slug: p?.slug,
                    color: g?.color,
                    size: s?.size,
                    categoryName: p?.categoryName,
                  });
                  if (outOfStockList.length < 5) {
                    outOfStockList.push({
                      id: s?.id,
                      name: p?.name,
                      sku: s?.sku,
                      quantity: qty,
                      slug: p?.slug,
                      color: g?.color,
                      size: s?.size,
                      categoryName: p?.categoryName,
                    });
                  }
                } else if (qty < 4) {
                  lowStock++;
                  lowStockListAll.push({
                    id: s?.id,
                    name: p?.name,
                    sku: s?.sku,
                    quantity: qty,
                    slug: p?.slug,
                    color: g?.color,
                    size: s?.size,
                    categoryName: p?.categoryName,
                  });
                  if (lowStockList.length < 5) {
                    lowStockList.push({
                      id: s?.id,
                      name: p?.name,
                      sku: s?.sku,
                      quantity: qty,
                      slug: p?.slug,
                      color: g?.color,
                      size: s?.size,
                      categoryName: p?.categoryName,
                    });
                  }
                }
              }
            }
            continue;
          }

          // Legacy fallback: variants[]
          const variants = Array.isArray(p.variants) ? p.variants : [];
          for (const v of variants) {
            const qty = Number(v.stockQuantity ?? 0);
            if (qty === 0) {
              outOfStock++;
              outOfStockListAll.push({
                id: v?.id,
                name: p?.name,
                sku: v?.sku,
                quantity: qty,
                slug: p?.slug,
                categoryName: p?.categoryName,
              });
              if (outOfStockList.length < 5) {
                outOfStockList.push({
                  id: v?.id,
                  name: p?.name,
                  sku: v?.sku,
                  quantity: qty,
                  slug: p?.slug,
                  categoryName: p?.categoryName,
                });
              }
            } else if (qty < 4) {
              lowStock++;
                  lowStockListAll.push({
                    id: v?.id,
                    name: p?.name,
                    sku: v?.sku,
                    quantity: qty,
                    slug: p?.slug,
                    categoryName: p?.categoryName,
                  });
                  if (lowStockList.length < 5) {
                lowStockList.push({
                  id: v.id,
                  name: p.name,
                  sku: v.sku,
                  quantity: qty,
                  slug: p.slug,
                      categoryName: p?.categoryName,
                });
              }
            }
          }
        }

        // Process Orders
        const orders = Array.isArray(ordersResult.content) ? ordersResult.content : [];
        const totalOrders = ordersResult.totalElements ?? orders.length;
        
        let revenue = 0;
        let pending = 0;
        let delivered = 0;
        let cancelledCount = 0;

        for (const o of orders) {
          revenue += Number(o.total ?? 0);
          const s = (o.status || '').toUpperCase();
          if (s === 'PENDING' || s === 'PROCESSING' || s === 'CONFIRMED') pending++;
          else if (s === 'DELIVERED') delivered++;
          else if (s === 'CANCELLED') cancelledCount++;
        }

        setStats({
          totalProducts: productsResult.totalElements ?? products.length,
          lowStockCount: lowStock,
          outOfStockCount: outOfStock,
          totalOrders,
          totalRevenue: revenue,
          pendingOrders: pending,
          deliveredOrders: delivered,
          cancelledOrders: cancelledCount,
          analyzedOrdersCount: orders.length,
        });

        setRecentOrders(orders.slice(0, 5));
        setLowStockItems(lowStockList);
        setLowStockItemsAll(lowStockListAll);
        setOutOfStockItems(outOfStockList);
        setOutOfStockItemsAll(outOfStockListAll);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Refetch when switching Daily ↔ Monthly. Date range edits require Apply.
  useEffect(() => {
    const range = salesTrendMode === 'daily' ? dailyRange : monthlyRange;
    if (!range.from || !range.to) return;
    if (range.from > range.to) return;
    loadSalesTrend(salesTrendMode, range);
  }, [salesTrendMode, loadSalesTrend]); // eslint-disable-line react-hooks/exhaustive-deps -- omit dailyRange/monthlyRange

  const activeRange = salesTrendMode === 'daily' ? dailyRange : monthlyRange;

  const handleApplySalesTrend = () => {
    const range = salesTrendMode === 'daily' ? dailyRange : monthlyRange;
    if (!range.from || !range.to) {
      setSalesTrendError('Please select both from and to dates.');
      return;
    }
    if (range.from > range.to) {
      setSalesTrendError('"From" date must be before or equal to "To" date.');
      return;
    }
    loadSalesTrend(salesTrendMode, range);
  };

  const statCards = [
    {
      label: 'Total Revenue',
      value: `Nu ${formatPrice(stats.totalRevenue)}`,
      sub: 'Based on recent orders',
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/5 border-primary/20'
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      sub: `${stats.pendingOrders} pending processing`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100'
    },
    {
      label: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      sub: `${stats.outOfStockCount} out of stock`,
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100'
    },
    {
      label: 'Inventory Alert',
      value: stats.lowStockCount.toLocaleString(),
      sub: 'Items with low stock',
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100'
    },
  ];

  const getPercent = (count) => {
    if (!stats.analyzedOrdersCount) return 0;
    return (count / stats.analyzedOrdersCount) * 100;
  };

  const revenueSeries = prepareDivergingSeries(salesTrend?.points ?? [], salesTrendMode);
  const changePctRaw = salesTrend?.summary?.changePctVsPreviousPeriod;
  const growthPctFromApi =
    changePctRaw != null && Number.isFinite(Number(changePctRaw)) ? Number(changePctRaw) : null;
  const totalSeriesUp = revenueSeries.up.reduce((a, b) => a + b, 0);
  const totalSeriesDown = revenueSeries.down.reduce((a, b) => a + b, 0);
  const growthPctFromLatestPair = growthFromLatestVersusPreviousPair(
    revenueSeries.up,
    revenueSeries.down
  );
  const displayGrowthPct = growthPctFromLatestPair ?? growthPctFromApi;

  const growthGaugeCaption =
    displayGrowthPct == null
      ? null
      : growthPctFromLatestPair != null
        ? salesTrendMode === 'daily'
          ? 'Latest day vs. previous day sales'
          : revenueSeries.kind === 'yoy'
            ? 'Latest month vs. same month last year'
            : 'Latest month vs. previous month'
        : growthPctFromApi != null
          ? 'vs. previous period (summary)'
          : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-secondary">
            Welcome back. Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all hover:shadow-md ${action.color}`}
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-xl border p-6 ${stat.bg}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">{stat.label}</p>
                <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h3>
              </div>
              <div className={`rounded-full p-2.5 bg-white shadow-sm ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium opacity-80">
              {stat.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total Revenue — split layout (chart + gauge) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-auto sm:min-w-[140px]">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">View</label>
              <select
                value={salesTrendMode}
                onChange={(e) => setSalesTrendMode(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div className="w-full min-w-0 sm:min-w-[160px] sm:flex-1">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">From</label>
              <input
                type={salesTrendMode === 'daily' ? 'date' : 'month'}
                value={salesTrendMode === 'daily' ? dailyRange.from : monthlyRange.from}
                onChange={(e) => {
                  const value = e.target.value;
                  if (salesTrendMode === 'daily') setDailyRange((prev) => ({ ...prev, from: value }));
                  else setMonthlyRange((prev) => ({ ...prev, from: value }));
                }}
                disabled={salesTrendMode === 'daily'}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div className="w-full min-w-0 sm:min-w-[160px] sm:flex-1">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">To</label>
              <input
                type={salesTrendMode === 'daily' ? 'date' : 'month'}
                value={salesTrendMode === 'daily' ? dailyRange.to : monthlyRange.to}
                onChange={(e) => {
                  const value = e.target.value;
                  if (salesTrendMode === 'daily') setDailyRange((prev) => ({ ...prev, to: value }));
                  else setMonthlyRange((prev) => ({ ...prev, to: value }));
                }}
                disabled={salesTrendMode === 'daily'}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <button
              type="button"
              onClick={handleApplySalesTrend}
              disabled={salesTrendLoading}
              className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[96px]"
            >
              Apply
            </button>
          </div>
        </div>

        {salesTrendLoading ? (
          <RevenueChartSkeleton />
        ) : salesTrendError ? (
          <div className="p-6">
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{salesTrendError}</div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:divide-x lg:divide-gray-200">
            <div className="min-w-0 flex-1 p-5 sm:p-6 lg:pr-8">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-gray-900">Total Revenue</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {salesTrendMode === 'daily' ? 'Daily' : 'Monthly'} • {activeRange.from} → {activeRange.to}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Chart options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
              <RevenueAreaChart
                labels={revenueSeries.labels}
                periods={revenueSeries.periods ?? []}
                up={revenueSeries.up}
                down={revenueSeries.down}
                legendUp={revenueSeries.legendUp}
                legendDown={revenueSeries.legendDown}
                mode={salesTrendMode}
                totalUp={totalSeriesUp}
                totalDown={totalSeriesDown}
              />
            </div>

            <div className="flex flex-shrink-0 flex-col border-t border-gray-200 p-5 sm:p-6 lg:w-[280px] lg:border-t-0 lg:pl-8">
              <div className="relative mb-4 w-full">
                <select
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-xs font-medium text-gray-800 shadow-sm"
                  defaultValue="revenue"
                  aria-label="Report type"
                >
                  <option value="revenue">Report · Revenue</option>
                  <option value="sales">Report · Sales trend</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>

              <RevenueGrowthGauge percent={displayGrowthPct} />

              <p
                className={`mt-2 text-center text-xs leading-snug ${
                  displayGrowthPct != null && displayGrowthPct < 0 ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {growthGaugeCaption ?? 'Growth vs. previous period'}
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <DollarSign className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{revenueSeries.legendUp}</p>
                    <p className="truncate text-base font-semibold text-gray-900">{formatCompactNu(totalSeriesUp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <Wallet className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{revenueSeries.legendDown}</p>
                    <p className="truncate text-base font-semibold text-gray-900">{formatCompactNu(totalSeriesDown)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Orders - Takes up 2 columns */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h2 className="font-brand text-lg text-primary">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-sm text-secondary">Loading orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-secondary">No orders found.</div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 text-primary">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-primary">
                          #{order.orderNumber || order.id}
                        </span>
                        <span className="text-xs text-secondary">• {order.items?.length || 0} items</span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-primary">
                      Nu {formatPrice(order.total)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inventory / Insights - Takes up 1 column */}
        <div className="space-y-6">
          {/* Order Status Breakdown */}
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-brand text-lg text-primary">Order Status</h2>
              <div className="p-2 bg-gray-50 rounded-lg">
                <PieChart className="h-4 w-4 text-secondary" />
              </div>
            </div>

            {/* Summary Stat */}
            <div className="mb-8 flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="p-3 bg-white rounded-full text-primary shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-secondary/80">Total Analyzed</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-primary">{stats.analyzedOrdersCount}</p>
                  <span className="text-xs font-medium text-secondary">orders</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Pending */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 ring-4 ring-amber-50"></div>
                    <span className="text-sm font-medium text-gray-700">Pending & Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{stats.pendingOrders}</span>
                    <span className="text-[10px] font-bold text-secondary bg-gray-100 px-1.5 py-0.5 rounded-md">
                      {getPercent(stats.pendingOrders).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercent(stats.pendingOrders)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-amber-400 rounded-full group-hover:bg-amber-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Delivered */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
                    <span className="text-sm font-medium text-gray-700">Delivered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{stats.deliveredOrders}</span>
                    <span className="text-[10px] font-bold text-secondary bg-gray-100 px-1.5 py-0.5 rounded-md">
                      {getPercent(stats.deliveredOrders).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercent(stats.deliveredOrders)}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full group-hover:bg-emerald-600 transition-colors" 
                  />
                </div>
              </div>

              {/* Cancelled */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500 ring-4 ring-rose-50"></div>
                    <span className="text-sm font-medium text-gray-700">Cancelled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{stats.cancelledOrders}</span>
                    <span className="text-[10px] font-bold text-secondary bg-gray-100 px-1.5 py-0.5 rounded-md">
                      {getPercent(stats.cancelledOrders).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercent(stats.cancelledOrders)}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="absolute top-0 left-0 h-full bg-rose-500 rounded-full group-hover:bg-rose-600 transition-colors" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Alerts */}
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-brand text-lg text-primary">Inventory Alerts</h2>
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(true)}
                className="text-xs font-bold uppercase tracking-wider text-secondary hover:text-primary"
              >
                View All
              </button>
            </div>
            
            {loading ? (
               <div className="text-xs text-secondary">Loading...</div>
            ) : lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                <CheckCircle2 className="h-4 w-4" />
                <span>Inventory looks healthy!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {outOfStockItems.map((item) => (
                  <div key={`${item.id}-${item.sku}`} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary truncate">{item.name}</p>
                      <p className="text-xs text-secondary truncate">
                        SKU: {item.sku}
                        {item.color ? ` • ${item.color}` : ''}
                        {item.size ? ` • ${item.size}` : ''}
                      </p>
                      {item.categoryName ? (
                        <p className="mt-0.5 text-[11px] text-secondary/80 truncate">
                          Category: {item.categoryName}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-red-700">0</span>
                      <span className="text-[10px] font-bold text-red-600 uppercase">Out</span>
                    </div>
                  </div>
                ))}
                {lowStockItems.map((item) => (
                  <div key={`${item.id}-${item.sku}`} className="flex items-start gap-3 p-3 rounded-lg bg-red-50/50 border border-red-100">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary truncate">{item.name}</p>
                      <p className="text-xs text-secondary truncate">
                        SKU: {item.sku}
                        {item.color ? ` • ${item.color}` : ''}
                        {item.size ? ` • ${item.size}` : ''}
                      </p>
                      {item.categoryName ? (
                        <p className="mt-0.5 text-[11px] text-secondary/80 truncate">
                          Category: {item.categoryName}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-red-600">{item.quantity}</span>
                      <span className="text-[10px] text-red-500 uppercase">Left</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Alerts Modal */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsLowStockModalOpen(false)}
            role="presentation"
          />
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border bg-gray-50/50 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Inventory alert items</h3>
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(false)}
                className="rounded-full p-2 text-secondary hover:bg-gray-100 hover:text-primary"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              {loading ? (
                <div className="text-xs text-secondary">Loading...</div>
              ) : lowStockItemsAll.length === 0 && outOfStockItemsAll.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Inventory looks healthy!
                </div>
              ) : (
                <div className="space-y-2">
                  {outOfStockItemsAll.map((item) => (
                    <div
                      key={`${item.id}-${item.sku}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">{item.name}</p>
                        <p className="mt-0.5 text-[12px] text-secondary truncate">
                          {item.sku ? `SKU: ${item.sku}` : 'SKU: —'}
                          {item.color ? ` • ${item.color}` : ''}
                          {item.size ? ` • ${item.size}` : ''}
                        </p>
                        {item.categoryName ? (
                          <p className="mt-0.5 text-[11px] text-secondary/80 truncate">
                            Category: {item.categoryName}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="block text-sm font-bold text-red-700">0</span>
                        <span className="text-[10px] font-bold uppercase text-red-600">Out</span>
                      </div>
                    </div>
                  ))}
                  {lowStockItemsAll.map((item) => (
                    <div
                      key={`${item.id}-${item.sku}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">{item.name}</p>
                        <p className="mt-0.5 text-[12px] text-secondary truncate">
                          {item.sku ? `SKU: ${item.sku}` : 'SKU: —'}
                          {item.color ? ` • ${item.color}` : ''}
                          {item.size ? ` • ${item.size}` : ''}
                        </p>
                        {item.categoryName ? (
                          <p className="mt-0.5 text-[11px] text-secondary/80 truncate">
                            Category: {item.categoryName}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="block text-sm font-bold text-red-600">{item.quantity}</span>
                        <span className="text-[10px] font-bold uppercase text-red-500">Left</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
