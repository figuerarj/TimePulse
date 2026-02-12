import React from 'react';
import { TimeEntry, AppSettings } from '../types';
import { calculateWorkHours, calculateEarnings, getLocalDateString, calculateOvertimeMinutes, getRoundedTimeRange, formatDisplayTime } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import { TrendingUp, Clock, Calendar, Briefcase, PlusCircle, Umbrella, Target, Wallet, ArrowUpRight, Zap } from 'lucide-react';

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
      acc + calculateWorkHours(curr, settings, false), 0
    );

    const totalOvertimeMin = weekEntries.reduce((acc, curr) => 
      acc + calculateOvertimeMinutes(curr, settings), 0
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
      weekOT: totalOvertimeMin / 60,
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
          <p className="text-slate-500 dark:text-slate-400 text-sm italic font-medium">{t.focus}</p>
        </div>
        <button onClick={onAddClick} className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-90">
          <PlusCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              <Wallet className="w-3 h-3" />
              {t.weekEarnings}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stats.weekRange}</span>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[32px] p-7 text-white shadow-2xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/15 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                  <h3 className="text-4xl font-black mt-1 tracking-tight drop-shadow-sm">
                    <span className="text-xl font-medium opacity-70 mr-1.5">{displayCurrency}</span>
                    {stats.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold backdrop-blur-sm border border-white/10">
                      {stats.weekHours.toFixed(1)} {t.hrs}
                    </span>
                    {stats.weekOT > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-[10px] font-black backdrop-blur-sm border border-amber-400/30 flex items-center gap-1">
                        <Zap className="w-2 h-2" />
                        {stats.weekOT.toFixed(1)} {t.overtime}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold backdrop-blur-sm border border-white/10">
                      {stats.activeDays} {t.activeDays}
                    </span>
                  </div>
              </div>
              <button 
                onClick={onStatsClick} 
                className="bg-white/20 p-3 rounded-2xl backdrop-blur-md hover:bg-white/30 transition-all active:scale-95 group/btn border border-white/20"
              >
                  <ArrowUpRight className="w-6 h-6 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            
            <div className="mt-8 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <p className="text-[10px] font-bold text-indigo-100/80 uppercase tracking-widest">{t.goalProgress}</p>
                <p className="text-xs font-black">{stats.goalProgress.toFixed(0)}%</p>
              </div>
              <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm p-0.5">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                  style={{ width: `${stats.goalProgress}%` }}
                ></div>
              </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatSmallCard 
          icon={<Target className="w-5 h-5 text-indigo-600" />} 
          label={t.weeklyGoal} 
          value={`${settings.weeklyGoalHours}h`} 
          bgColor="bg-white dark:bg-slate-900" 
          subValue={`${Math.max(0, settings.weeklyGoalHours - stats.weekHours).toFixed(1)}h remaining`}
        />
        <StatSmallCard 
          icon={<Calendar className="w-5 h-5 text-indigo-600" />} 
          label={t.avgDaily} 
          value={`${(stats.weekHours / (stats.activeDays || 1)).toFixed(1)} h`} 
          bgColor="bg-white dark:bg-slate-900" 
          subValue={t.actualWeek}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            {t.recentActivity}
          </h3>
          <button onClick={onSeeAll} className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline active:opacity-60 transition-opacity">{t.seeAll}</button>
        </div>
        <div className="space-y-3">
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map(entry => {
              const otHours = calculateOvertimeMinutes(entry, settings) / 60;
              
              // Lógica de exibição de tempo arredondado vs real
              const roundedRange = settings.roundingEnabled ? getRoundedTimeRange(entry, settings) : null;
              const timeDisplay = roundedRange 
                ? `${roundedRange.start} - ${roundedRange.end}` 
                : `${formatDisplayTime(entry.startTime, settings.timeFormat)} - ${formatDisplayTime(entry.endTime, settings.timeFormat)}`;

              return (
              <div key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] group/entry">
                <div className={`p-3 rounded-xl border transition-colors ${entry.isHoliday ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                  {entry.isHoliday ? <Umbrella className="w-5 h-5 text-orange-500" /> : <Clock className="w-5 h-5 text-indigo-600" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString(settings.language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                     <p className="text-[11px] text-slate-500 font-medium">
                      {entry.isHoliday && !entry.holidayWorked ? t.holiday : timeDisplay}
                    </p>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {calculateWorkHours(entry, settings, true).toFixed(1)}h
                    </p>
                    {otHours > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1 rounded">
                        <Zap className="w-2 h-2" />
                        {otHours.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                        {displayCurrency} {calculateEarnings(entry, settings).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
              </div>
            )})
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
              <Briefcase className="w-10 h-10 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">{t.noEntries}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatSmallCard: React.FC<{ icon: React.ReactNode, label: string, value: string, bgColor: string, subValue?: string }> = ({ icon, label, value, bgColor, subValue }) => (
  <div className={`${bgColor} p-5 rounded-[24px] flex flex-col gap-2 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow`}>
    <div className="flex justify-between items-start">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
      {subValue && <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-bold">{subValue}</p>}
    </div>
  </div>
);

export default Dashboard;