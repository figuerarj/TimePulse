import React, { useState } from 'react';
import { TimeEntry, AppSettings } from '../types';
import { calculateWorkHours, formatDisplayDate, formatDisplayTime, calculateOvertimeMinutes, calculateEarnings } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import { Edit2, Trash2, Search, DollarSign, Calendar, TrendingUp, Clock, Zap, Target } from 'lucide-react';

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
      acc + calculateWorkHours(curr, settings, false), 0
    );
    const earnings = weekEntries.reduce((acc, curr) => acc + calculateEarnings(curr, settings), 0);

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
            <div className="space-y-4">
              {monthEntries.map((entry, index) => {
                const totalRoundedHours = calculateWorkHours(entry, settings, true);
                const otMinutes = calculateOvertimeMinutes(entry, settings);
                const otHours = otMinutes / 60;
                const regularHours = Math.max(0, totalRoundedHours - otHours);
                
                const baseRate = entry.hourlyRate ?? settings.hourlyRate;
                const effectiveRate = (entry.isHoliday && entry.holidayWorked) ? baseRate * settings.holidayRateMultiplier : baseRate;
                const otRate = effectiveRate * (settings.otRateMultiplier || 1.5);

                const regularPay = regularHours * effectiveRate;
                const otPay = otHours * otRate;
                const totalEarnings = regularPay + otPay;

                const locale = settings.language === 'pt' ? 'pt-BR' : 'en-US';
                const currentWeek = getStartOfWeek(entry.date);
                const prevEntry = monthEntries[index - 1];
                const isNewWeek = !prevEntry || getStartOfWeek(prevEntry.date) !== currentWeek;
                const weekStats = isNewWeek ? getWeekStats(currentWeek, entries) : null;

                return (
                  <React.Fragment key={entry.id}>
                    {isNewWeek && weekStats && (
                      <div className="pt-6 pb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t.weekStart} {formatDisplayDate(currentWeek, settings.dateFormat)}
                          </span>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                        </div>
                        <div className="flex justify-between px-4 bg-indigo-50 dark:bg-indigo-950/30 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                          <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                             <TrendingUp className="w-3 h-3" />
                             {displayCurrency} {weekStats.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                             {weekStats.hours.toFixed(1)} {t.hrs} Total
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden active:bg-slate-50 dark:active:bg-slate-800/50 transition-all group hover:border-indigo-200 dark:hover:border-indigo-900/40">
                      
                      {/* Top bar: Date & Actions */}
                      <div className="flex justify-between items-start mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-sm">
                            {new Date(entry.date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short' }).toUpperCase()}, {formatDisplayDate(entry.date, settings.dateFormat)}
                          </p>
                          {entry.isHoliday && (
                            <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase mt-1 inline-block tracking-tighter">
                                {entry.holidayWorked ? t.holidayWorked : t.holiday}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => onEdit(entry)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-90">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(entry.id)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all active:scale-90">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content: Calculations Grid */}
                      <div className="grid grid-cols-1 gap-4">
                        
                        {/* 1. Rounded Hours Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-lg">
                                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.roundedTime}</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-300">{regularHours.toFixed(1)}h</p>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-500">{displayCurrency} {regularPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>

                        {/* 2. Overtime Row (conditional) */}
                        {(otHours > 0 || settings.otEnabled) && (
                            <div className={`flex items-center justify-between ${otHours > 0 ? 'opacity-100' : 'opacity-30'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="bg-amber-50 dark:bg-amber-900/30 p-1.5 rounded-lg">
                                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.overtime}</p>
                                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{otHours.toFixed(1)}h</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-amber-600">{displayCurrency} {otPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        )}

                        {/* 3. Real Input Row */}
                        <div className="flex items-center justify-between opacity-60">
                            <div className="flex items-center gap-2">
                                <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.realTime}</p>
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        {formatDisplayTime(entry.startTime, settings.timeFormat)} - {formatDisplayTime(entry.endTime, settings.timeFormat)}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">({(regularHours + otHours).toFixed(1)}h total)</span>
                        </div>

                        {/* Final Sum & Total */}
                        <div className="mt-2 pt-3 border-t border-slate-50 dark:border-slate-800 flex justify-between items-end">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.breakdown}</p>
                                <p className="text-[10px] font-bold text-indigo-500">
                                    {displayCurrency} {regularPay.toFixed(2)} + {displayCurrency} {otPay.toFixed(2)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Pay</p>
                                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                                    {displayCurrency} {totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        {entry.notes && (
                            <div className="mt-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[11px] text-slate-500 italic font-medium leading-relaxed">"{entry.notes}"</p>
                            </div>
                        )}
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
             <p className="font-medium">{t.noEntries}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;