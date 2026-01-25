
import React, { useState } from 'react';
import { TimeEntry, AppSettings } from '../types';
import { calculateWorkHours, formatDisplayDate, formatDisplayTime } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import { Edit2, Trash2, Search, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react';

interface HistoryViewProps {
  entries: TimeEntry[];
  settings: AppSettings;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
  onAdd?: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ entries, settings, onEdit, onDelete, onAdd }) => {
  const [search, setSearch] = useState('');
  const t = translations[settings.language || 'en'];
  const displayCurrency = (settings.currency || '').toUpperCase();

  const filteredEntries = entries.filter(e => 
    e.date.includes(search) || e.notes.toLowerCase().includes(search.toLowerCase())
  );

  const getStartOfWeek = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day;
    const start = new Date(d.setDate(diff));
    return start.toISOString().split('T')[0];
  };

  const getWeekStats = (weekStartDate: string, allEntries: TimeEntry[]) => {
    const start = new Date(weekStartDate + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weekEntries = allEntries.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return d >= start && d <= end;
    });

    const hours = weekEntries.reduce((acc, curr) => 
      acc + calculateWorkHours(curr, settings), 0
    );
    const earnings = weekEntries.reduce((acc, curr) => {
      const h = calculateWorkHours(curr, settings);
      const baseRate = curr.hourlyRate ?? settings.hourlyRate;
      const rate = (curr.isHoliday && curr.holidayWorked) ? baseRate * settings.holidayRateMultiplier : baseRate;
      return acc + (h * rate);
    }, 0);

    return { hours, earnings };
  };

  const groupedEntries = React.useMemo(() => {
    const groups: { [key: string]: TimeEntry[] } = {};
    filteredEntries.forEach(e => {
      const locale = settings.language === 'pt' ? 'pt-BR' : 'en-US';
      const month = new Date(e.date + 'T12:00:00').toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(e);
    });
    return Object.entries(groups);
  }, [filteredEntries, settings.language]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.history}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t.reviewLogs}</p>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <input 
          type="text" 
          placeholder={t.searchPlaceholder} 
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-8 pb-12">
        {groupedEntries.map(([month, monthEntries]) => (
          <div key={month} className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 capitalize">{month}</h3>
            <div className="space-y-3">
              {monthEntries.map((entry, index) => {
                const hours = calculateWorkHours(entry, settings);
                const baseRate = entry.hourlyRate ?? settings.hourlyRate;
                const finalRate = (entry.isHoliday && entry.holidayWorked) ? baseRate * settings.holidayRateMultiplier : baseRate;
                const earnings = hours * finalRate;
                const locale = settings.language === 'pt' ? 'pt-BR' : 'en-US';

                const currentWeek = getStartOfWeek(entry.date);
                const prevEntry = monthEntries[index - 1];
                const isNewWeek = !prevEntry || getStartOfWeek(prevEntry.date) !== currentWeek;

                const weekStats = isNewWeek ? getWeekStats(currentWeek, entries) : null;

                return (
                  <React.Fragment key={entry.id}>
                    {isNewWeek && weekStats && (
                      <div className="pt-6 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t.weekStart} {formatDisplayDate(currentWeek, settings.dateFormat)}
                          </span>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                        </div>
                        <div className="flex flex-col items-center">
                          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                             <TrendingUp className="w-3 h-3" />
                             {displayCurrency} {weekStats.earnings.toFixed(2)}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase">
                             {weekStats.hours.toFixed(1)} {t.hrs} Total
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden active:bg-slate-50 dark:active:bg-slate-800/50 transition-all group hover:border-indigo-100 dark:hover:border-indigo-900/30">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {new Date(entry.date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long' })}, {formatDisplayDate(entry.date, settings.dateFormat)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${entry.isHoliday ? (entry.holidayWorked ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20') : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                              {entry.isHoliday ? (entry.holidayWorked ? t.holidayWorked : t.holiday) : `${formatDisplayTime(entry.startTime, settings.timeFormat)} - ${formatDisplayTime(entry.endTime, settings.timeFormat)}`}
                            </span>
                            {entry.lunchEnabled && entry.lunchStart && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.lunch}: {formatDisplayTime(entry.lunchStart, settings.timeFormat)}-{formatDisplayTime(entry.lunchEnd, settings.timeFormat)}</span>
                            )}
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {displayCurrency} {finalRate.toFixed(2)}/h
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 bg-indigo-50 dark:bg-indigo-900/20 inline-block px-2 py-1 rounded-md italic">
                              "{entry.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            {hours.toFixed(1)}h
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {displayCurrency} {earnings.toFixed(2)}
                          </p>
                          <div className="flex gap-1">
                            <button onClick={() => onEdit(entry)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors active:scale-90">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(entry.id)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors active:scale-90">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-center py-20 text-slate-400 dark:text-slate-600 flex flex-col items-center gap-4">
             <Calendar className="w-12 h-12 opacity-10" />
             <p>{t.noEntries}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
