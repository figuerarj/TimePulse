
import React from 'react';
import { TimeEntry, AppSettings } from '../types';
import { calculateWorkHours, calculateEarnings, getLocalDateString } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import { TrendingUp, Clock, Calendar, Briefcase, PlusCircle, Umbrella, Target, Wallet } from 'lucide-react';

interface DashboardProps {
  entries: TimeEntry[];
  settings: AppSettings;
  onAddClick: () => void;
  onSeeAll: () => void;
  onStatsClick: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, settings, onAddClick, onSeeAll, onStatsClick }) => {
  const t = translations[settings.language || 'en'];
  const displayCurrency = (settings.currency || '').toUpperCase();

  const stats = React.useMemo(() => {
    const today = getLocalDateString();
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEntries = entries.filter(e => new Date(e.date + 'T12:00:00') >= weekStart);
    
    const totalWeekHours = weekEntries.reduce((acc, curr) => 
      acc + calculateWorkHours(curr, settings), 0
    );

    const earnings = weekEntries.reduce((acc, curr) => {
      return acc + calculateEarnings(curr, settings);
    }, 0);

    const formatDate = (date: Date) => date.toLocaleDateString(settings.language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit' });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekRange = `${t.week} ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

    const recentActivity = entries.slice(0, 3);
    const goalProgress = Math.min(100, (totalWeekHours / (settings.weeklyGoalHours || 40)) * 100);

    return {
      weekHours: totalWeekHours,
      earnings,
      activeDays: new Set(weekEntries.map(e => e.date)).size,
      weekRange,
      recentActivity,
      goalProgress
    };
  }, [entries, settings, t]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.hello}, {settings.userName} 👋</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">{t.focus}</p>
        </div>
        <button onClick={onAddClick} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-4 py-2 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-all active:scale-95">
          <PlusCircle className="w-4 h-4" />
          {t.newEntry}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            <Wallet className="w-3 h-3" />
            {t.weekEarnings}
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200 dark:shadow-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all"></div>
            <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
                <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest">{stats.weekRange}</p>
                <h3 className="text-4xl font-bold mt-1 tracking-tight">
                  <span className="text-xl font-normal opacity-70 mr-1">{displayCurrency}</span>
                  {stats.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
            </div>
            <button onClick={onStatsClick} className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md hover:bg-white/30 transition-colors active:scale-95">
                <TrendingUp className="w-6 h-6" />
            </button>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                <p className="text-xs text-emerald-100 opacity-70">{t.weekTotal}</p>
                <p className="text-xl font-bold">{stats.weekHours.toFixed(1)} <span className="text-xs font-normal opacity-80">hrs</span></p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                <p className="text-xs text-emerald-100 opacity-70">{t.activeDays}</p>
                <p className="text-xl font-bold">{stats.activeDays}</p>
            </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatSmallCard 
          icon={<Target className="w-5 h-5 text-indigo-600" />} 
          label={t.goalProgress} 
          value={`${stats.goalProgress.toFixed(0)}%`} 
          bgColor="bg-indigo-50 dark:bg-indigo-900/20" 
          subValue={`${stats.weekHours.toFixed(1)} / ${settings.weeklyGoalHours}h`}
        />
        <StatSmallCard 
          icon={<Calendar className="w-5 h-5 text-blue-600" />} 
          label={t.avgDaily} 
          value={`${(stats.weekHours / (stats.activeDays || 1)).toFixed(1)} h`} 
          bgColor="bg-blue-50 dark:bg-blue-900/20" 
          subValue={t.actualWeek}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            {t.recentActivity}
          </h3>
          <button onClick={onSeeAll} className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline active:opacity-60 transition-opacity">{t.seeAll}</button>
        </div>
        <div className="space-y-3">
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map(entry => (
              <div key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                <div className={`p-3 rounded-xl border ${entry.isHoliday ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                  {entry.isHoliday ? <Umbrella className="w-5 h-5 text-orange-500" /> : <Calendar className="w-5 h-5 text-slate-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString(settings.language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-2">
                     <p className="text-xs text-slate-500">
                      {entry.isHoliday ? (entry.holidayWorked ? t.holidayWorked : t.holiday) : `${entry.startTime} - ${entry.endTime}`}
                    </p>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {calculateWorkHours(entry, settings).toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm">{t.noEntries}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatSmallCard: React.FC<{ icon: React.ReactNode, label: string, value: string, bgColor: string, subValue?: string }> = ({ icon, label, value, bgColor, subValue }) => (
  <div className={`${bgColor} p-5 rounded-3xl flex flex-col gap-2 shadow-sm border border-white/5`}>
    <div className="flex justify-between items-start">
      {icon}
    </div>
    <div>
      <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      {subValue && <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{subValue}</p>}
    </div>
  </div>
);

export default Dashboard;
