
import React, { useState } from 'react';
import { TimeEntry, AppSettings } from '../types';
import { calculateWorkHours, calculateEarnings, getLocalDateString } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import { TrendingUp, Zap, Target, ChevronLeft, ChevronRight, RotateCcw, LayoutList, Flame, BarChart, Scale, DollarSign, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface StatsViewProps {
  entries: TimeEntry[];
  settings: AppSettings;
}

const StatsView: React.FC<StatsViewProps> = ({ entries, settings }) => {
  const t = translations[settings.language || 'en'];
  const locale = settings.language === 'pt' ? 'pt-BR' : 'en-US';
  const displayCurrency = (settings.currency || '').toUpperCase();
  
  const [pivotDate, setPivotDate] = useState(new Date());
  
  // Estados para o filtro de período
  const [customStart, setCustomStart] = useState(getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(getLocalDateString(new Date()));

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
    return { start, end };
  };

  const currentRange = getWeekRange(pivotDate);

  const navigateWeek = (offset: number) => {
    const next = new Date(pivotDate);
    next.setDate(next.getDate() + (offset * 7));
    setPivotDate(next);
  };

  const resetToToday = () => setPivotDate(new Date());

  const stats = React.useMemo(() => {
    const weekEntries = entries.filter(e => {
        const entryDate = new Date(e.date + 'T12:00:00');
        return entryDate >= currentRange.start && entryDate <= currentRange.end;
    });

    const chartData = t.daysShort.map((dayName, index) => {
      const d = new Date(currentRange.start);
      d.setDate(d.getDate() + index);
      const dateStr = getLocalDateString(d);
      const dayEntries = weekEntries.filter(e => e.date === dateStr);
      const dayHours = dayEntries.reduce((acc, curr) => acc + calculateWorkHours(curr, settings), 0);
      return { name: dayName, hours: parseFloat(dayHours.toFixed(1)) };
    });

    const weekHours = weekEntries.reduce((acc, curr) => acc + calculateWorkHours(curr, settings), 0);
    const weekEarnings = weekEntries.reduce((acc, curr) => {
        return acc + calculateEarnings(curr, settings);
    }, 0);

    const goalPercentage = Math.min(100, (weekHours / (settings.weeklyGoalHours || 40)) * 100);

    const prevWeekStart = new Date(currentRange.start);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
    prevWeekEnd.setHours(23, 59, 59, 999);

    const prevWeekEarnings = entries
        .filter(e => {
            const d = new Date(e.date + 'T12:00:00');
            return d >= prevWeekStart && d <= prevWeekEnd;
        })
        .reduce((acc, curr) => acc + calculateEarnings(curr, settings), 0);

    const targetMonth = pivotDate.getMonth();
    const targetYear = pivotDate.getFullYear();
    const monthlyEntries = entries.filter(e => {
        const d = new Date(e.date + 'T12:00:00');
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const monthlyEarnings = monthlyEntries.reduce((acc, curr) => {
        return acc + calculateEarnings(curr, settings);
    }, 0);

    // Cálculo do período customizado
    const customEntries = entries.filter(e => e.date >= customStart && e.date <= customEnd);
    const customTotalHours = customEntries.reduce((acc, curr) => acc + calculateWorkHours(curr, settings), 0);
    const customTotalEarnings = customEntries.reduce((acc, curr) => acc + calculateEarnings(curr, settings), 0);

    const weeksOfMonthMap: { [key: string]: { start: Date, end: Date, earnings: number, hours: number } } = {};
    monthlyEntries.forEach(e => {
        const d = new Date(e.date + 'T12:00:00');
        const day = d.getDay();
        const diff = d.getDate() - day;
        const wStart = new Date(d.setDate(diff));
        wStart.setHours(0,0,0,0);
        const key = getLocalDateString(wStart);
        if (!weeksOfMonthMap[key]) {
            const wEnd = new Date(wStart);
            wEnd.setDate(wStart.getDate() + 6);
            weeksOfMonthMap[key] = { start: wStart, end: wEnd, earnings: 0, hours: 0 };
        }
        const h = calculateWorkHours(e, settings);
        weeksOfMonthMap[key].hours += h;
        weeksOfMonthMap[key].earnings += calculateEarnings(e, settings);
    });

    const monthlyWeeksBreakdown = Object.values(weeksOfMonthMap).sort((a, b) => b.start.getTime() - a.start.getTime());

    return {
      weekHours,
      weekEarnings,
      monthlyEarnings,
      monthlyWeeksBreakdown,
      goalPercentage,
      prevWeekEarnings,
      chartData,
      customTotalHours,
      customTotalEarnings,
      activeDays: new Set(weekEntries.map(e => e.date)).size
    };
  }, [entries, settings, currentRange, pivotDate, customStart, customEnd, t.daysShort]);

  const rangeDisplay = `${currentRange.start.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} - ${currentRange.end.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}`;

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.analytics}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">{t.trackingTrends}</p>
        </div>
        <button onClick={resetToToday} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 active:scale-90 transition-all">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
        <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-indigo-600 transition-colors">
            <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.weekStart}</p>
            <p className="font-bold text-slate-800 dark:text-slate-200">{rangeDisplay}</p>
        </div>
        <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-indigo-600 transition-colors">
            <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-20 h-20" /></div>
          <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">{t.weekEarnings}</p>
          <h3 className="text-4xl font-black mt-1">{displayCurrency} {stats.weekEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          <div className="mt-4 flex items-center gap-2 text-indigo-100 font-semibold text-sm">
            <Zap className="w-4 h-4" />
            <span>{stats.weekHours.toFixed(1)} {t.loggedWeek}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 px-1">
          <BarChart className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wide">{t.last7Days}</h3>
        </div>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontStretch: 'condensed', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
              <Tooltip contentStyle={{ backgroundColor: settings.theme === 'dark' ? '#0f172a' : '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }} cursor={{ stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '5 5' }} />
              <Area type="monotone" dataKey="hours" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{t.prevWeekEarnings}</p>
          <div>
            <div className="flex items-center gap-2">
                <p className="text-xl font-black text-emerald-600">
                   {displayCurrency} {stats.prevWeekEarnings.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </p>
                <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">
              {t.history}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{t.goalProgress}</p>
          <div>
            <div className="flex justify-between items-end mb-1">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.goalPercentage.toFixed(0)}%</p>
                <Target className="w-4 h-4 text-indigo-300 mb-1" />
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all" style={{ width: `${stats.goalPercentage}%` }}></div>
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-bold">{t.weeklyGoal}: {settings.weeklyGoalHours}h</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
            <LayoutList className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.monthBreakdown}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
            {stats.monthlyWeeksBreakdown.map(w => (
                <div key={w.start.toISOString()} className="p-4 flex justify-between items-center active:bg-slate-50 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {w.start.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} - {w.end.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}
                        </p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{w.hours.toFixed(1)} {t.hrs}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight">{displayCurrency} {w.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Week Total</p>
                    </div>
                </div>
            ))}
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 dark:shadow-none">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{pivotDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</p>
            <div className="flex justify-between items-end mt-1">
                <h4 className="text-xl font-bold">{t.monthlyRevenue}</h4>
                <p className="text-2xl font-black">{displayCurrency} {stats.monthlyEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
        </div>
      </div>

      {/* Mover Relatório por Período para o final (Última Informação) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 px-1">
          <Filter className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wide">{t.periodReport}</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.startDate}</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-200" 
              value={customStart} 
              onChange={(e) => setCustomStart(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.endDate}</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-200" 
              value={customEnd} 
              onChange={(e) => setCustomEnd(e.target.value)} 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/50">
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{t.totalPeriodHours}</p>
                <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">{stats.customTotalHours.toFixed(1)}h</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/50">
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{t.totalPeriodEarnings}</p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{displayCurrency} {stats.customTotalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView;
