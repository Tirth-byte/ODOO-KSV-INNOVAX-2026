'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
} from 'recharts';
import { formatINRFull, formatINRShort } from '@/lib/formatCurrency';

export const CHART_COLORS = ['#F97316', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F43F5E', '#84CC16', '#A855F7', '#0EA5E9', '#FB923C', '#22C55E'];

const CATEGORY_COLORS: Record<string, string> = {
  'IT Hardware': '#F97316',
  'IT Software': '#6366F1',
  'Furniture': '#10B981',
  'Logistics': '#F59E0B',
  'Security': '#EF4444',
  'Facility Management': '#8B5CF6',
  'Electrical': '#06B6D4',
  'Medical Supplies': '#EC4899',
  'Transportation': '#14B8A6',
  'Construction': '#84CC16',
  'Stationery': '#A855F7',
  'HVAC': '#0EA5E9',
};

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #F0E8E0',
  fontSize: '12px',
  backgroundColor: '#FFFFFF',
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
};

export function SpendBarChart({ data }: { data: { label: string; value: number; count: number }[] }) {
  const avg = data.length > 0 ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: -10, right: 8, top: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
        <YAxis 
          tickFormatter={(v) => formatINRShort(v)} 
          tick={{ fontSize: 11, fill: '#6B7280' }} 
          axisLine={false} 
          tickLine={false} 
        />
        <Tooltip 
          contentStyle={tooltipStyle} 
          cursor={{ fill: '#FFF1E6' }} 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div className="bg-white p-3 border border-brand-border rounded-xl shadow-xl text-xs">
                  <p className="font-bold text-text-primary mb-1.5 border-b border-brand-border pb-1">{label} Spend</p>
                  <p className="text-primary font-bold text-sm">{formatINRFull(d.value)}</p>
                  <p className="text-text-secondary mt-1 font-medium">{d.count} Purchase Orders</p>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine y={avg} stroke="#94A3B8" strokeDasharray="5 5" label={{ position: 'right', value: 'Avg', fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} />
        <Bar 
          dataKey="value" 
          fill="#F97316" 
          radius={[4, 4, 0, 0]} 
          maxBarSize={32} 
          isAnimationActive={true}
          animationDuration={1200}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ 
  data, 
  title = "TOTAL VENDORS", 
  type = "count" 
}: { 
  data: { label: string; value: number }[]; 
  title?: string;
  type?: 'count' | 'spend'
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return <div className="flex h-[300px] items-center justify-center text-sm text-text-secondary">No data available</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-[220px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={data} 
              dataKey="value" 
              nameKey="label" 
              cx="50%" 
              cy="50%" 
              innerRadius={60} 
              outerRadius={90} 
              paddingAngle={4}
              isAnimationActive={true}
              animationDuration={1000}
            >
              {data.map((entry, i) => (
                <Cell 
                  key={i} 
                  fill={CATEGORY_COLORS[entry.label] || CHART_COLORS[i % CHART_COLORS.length] || '#94A3B8'} 
                  stroke="rgba(255,255,255,0.2)" 
                  strokeWidth={2} 
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={tooltipStyle} 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white p-2.5 border border-brand-border rounded-xl shadow-xl text-xs">
                      <p className="font-bold text-text-primary mb-1">{d.label}</p>
                      <p className="text-primary font-bold">
                        {type === 'spend' ? formatINRFull(d.value) : `${d.value} Vendors`}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan x="50%" dy="-0.2em" fontSize={type === 'spend' ? '18' : '24'} fontWeight="800" fill="#111827">
                {type === 'spend' ? formatINRShort(total) : total}
              </tspan>
              <tspan x="50%" dy="1.6em" fontSize="10" fontWeight="600" fill="#9CA3AF" letterSpacing="0.05em">
                {title}
              </tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 px-2 max-h-[140px] overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {data.map((entry, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                  style={{ backgroundColor: CATEGORY_COLORS[entry.label] || CHART_COLORS[i % CHART_COLORS.length] || '#94A3B8' }}
                />
                <span className="text-[11px] font-medium text-gray-600 truncate group-hover:text-gray-900 transition-colors">
                  {entry.label}
                </span>
              </div>
              <span className="text-[11px] font-bold text-gray-400 group-hover:text-primary transition-colors pl-2">
                {type === 'spend' ? formatINRShort(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TopVendorsChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 30, right: 40, top: 10, bottom: 10 }}>
        <defs>
          <linearGradient id="vendorGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FB923C" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#F97316" stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E0" horizontal={false} />
        <XAxis 
          type="number" 
          tickFormatter={(v) => formatINRShort(v)}
          tick={{ fontSize: 11, fill: '#6B7280' }} 
          axisLine={false} 
          tickLine={false} 
        />
        <YAxis 
          type="category" 
          dataKey="label" 
          width={100} 
          tick={{ fontSize: 11, fontWeight: 600, fill: '#374151' }} 
          axisLine={false} 
          tickLine={false} 
        />
        <Tooltip 
          contentStyle={tooltipStyle} 
          cursor={{ fill: '#FFF1E6', opacity: 0.4 }} 
          formatter={(value: any) => [formatINRFull(value), 'Total Spend']}
        />
        <Bar 
          dataKey="value" 
          fill="url(#vendorGradient)" 
          radius={[0, 4, 4, 0]} 
          maxBarSize={30} 
          isAnimationActive={true}
          label={{ position: 'right', formatter: (v: any) => formatINRShort(v), fontSize: 10, fill: '#F97316', fontWeight: 'bold' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E0" horizontal={false} />
        <XAxis 
          type="number" 
          tickFormatter={(v) => formatINRShort(v)}
          tick={{ fontSize: 12, fill: '#6B7280' }} 
          axisLine={false} 
          tickLine={false} 
        />
        <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
        <Tooltip 
          contentStyle={tooltipStyle} 
          cursor={{ fill: '#FFF1E6' }} 
          formatter={(value: any) => [formatINRFull(value), 'Spend']}
        />
        <Bar 
          dataKey="value" 
          fill="#FB7185" 
          radius={[0, 6, 6, 0]} 
          maxBarSize={28} 
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
        <YAxis 
          tickFormatter={(v) => formatINRShort(v)}
          tick={{ fontSize: 12, fill: '#6B7280' }} 
          axisLine={false} 
          tickLine={false} 
        />
        <Tooltip 
          contentStyle={tooltipStyle} 
          formatter={(value: any) => [formatINRFull(Number(value) || 0), 'Count']}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#F97316" 
          strokeWidth={2.5} 
          dot={{ r: 3, fill: '#F97316' }} 
          isAnimationActive={true}
          animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VendorRadarChart({ data }: { data: { subject: string; A: number; B: number; fullMark: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#F0E8E0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6B7280' }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar name="Top Vendors Average" dataKey="A" stroke="#F97316" fill="#F97316" fillOpacity={0.4} />
        <Radar name="Baseline Average" dataKey="B" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function SparklineChart({ data }: { data: number[] }) {
  if (!data || data.length === 0) return <div className="text-xs text-text-secondary">—</div>;
  const chartData = data.map((v, i) => ({ index: i, value: v }));
  return (
    <ResponsiveContainer width={100} height={30}>
      <LineChart data={chartData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#F97316" 
          strokeWidth={2} 
          dot={false} 
          isAnimationActive={false} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
