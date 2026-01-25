
import React from 'react';
import { TimeEntry, AppSettings } from '../types';
import { calculateWorkHours, calculateEarnings, getLocalDateString } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import { TrendingUp, Clock, Calendar, Briefcase, PlusCircle, Umbrella } from 'lucide-react';

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
    
    const todayEntries = entries.filter(e => e.date === today);
    const todayHours = todayEntries.reduce((acc, curr) => 
      acc + calculateWorkHours(curr, settings), 0
    );
    
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

    return {
      todayHours,
      weekHours: totalWeekHours,
      earnings,
      activeDays: new Set(weekEntries.map(e => e.date)).size,
      weekRange,
      recentActivity,
      hasEntryToday: todayEntries.length > 0
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
        <div className="flex items-center gap-2 px-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            {t.actualWeek}
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all"></div>
            <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
                <p className="text-indigo-100 text-sm font-medium opacity-80 uppercase tracking-widest">{stats.weekRange}</p>
                <h3 className="text-4xl font-bold mt-1 tracking-tight">{stats.weekHours.toFixed(1)} <span className="text-xl font-normal opacity-70">{t.hrs}</span></h3>
            </div>
            <button onClick={onStatsClick} className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md hover:bg-white/30 transition-colors active:scale-95">
                <TrendingUp className="w-6 h-6" />
            </button>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                <p className="text-xs text-indigo-100 opacity-70">{t.activeDays}</p>
                <p className="text-xl font-bold">{stats.activeDays}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                <p className="text-xs text-indigo-100 opacity-70">{t.estEarnings}</p>
                <p className="text-xl font-bold">{displayCurrency} {stats.earnings.toFixed(2)}</p>
            </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatSmallCard icon={<Clock className="w-5 h-5 text-blue-600" />} label={t.today} value={`${stats.todayHours.toFixed(1)} h`} bgColor="bg-blue-50 dark:bg-blue-900/20" />
        <StatSmallCard icon={<Calendar className="w-5 h-5 text-emerald-600" />} label={t.avgDaily} value={`${(stats.weekHours / (stats.activeDays || 1)).toFixed(1)} h`} bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
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
          {stats.recentActivity.map(entry => (
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
          ))}
        </div>
      </div>
    </div>
  );
};

const StatSmallCard: React.FC<{ icon: React.ReactNode, label: string, value: string, bgColor: string }> = ({ icon, label, value, bgColor }) => (
  <div className={`${bgColor} p-5 rounded-3xl flex flex-col gap-2 shadow-sm border border-white/5`}>
    {icon}
    <div>
      <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

export default Dashboard;
