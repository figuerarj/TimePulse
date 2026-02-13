import React, { useState } from 'react';
import { AppSettings, TimeEntry } from '../types';
import { calculateWorkHours, calculateEarnings } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import TimePickerField from './ui/TimePickerField';
import { 
  DollarSign, 
  Clock, 
  Upload, 
  FileJson, 
  FileSpreadsheet,
  Zap,
  Utensils,
  User,
  Layout,
  Scale,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  entries: TimeEntry[];
  onUpdate: (settings: AppSettings) => void;
  onImport: (data: { entries: TimeEntry[], settings: AppSettings }) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, entries, onUpdate, onImport }) => {
  const t = translations[settings.language || 'en'];
  const is12h = settings.timeFormat === '12h';
  
  // Estado para controlar quais seções estão expandidas
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    user: true,
    defaults: true,
    rounding: false,
    financials: false,
    data: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const exportData = () => {
    const data = { entries, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timepulse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Start Time', 'End Time', 'Lunch Start', 'Lunch End', 'Total Hours', 'Rate', 'Earnings', 'Notes', 'Holiday', 'Holiday Worked'];
    const rows = entries.map(e => {
      const hours = calculateWorkHours(e, settings);
      const earnings = calculateEarnings(e, settings);
      const escapedNotes = `"${(e.notes || '').replace(/"/g, '""')}"`;
      return [e.date, e.startTime, e.endTime, e.lunchStart, e.lunchEnd, hours.toFixed(2), e.hourlyRate ?? settings.hourlyRate, earnings.toFixed(2), escapedNotes, e.isHoliday, e.holidayWorked].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timepulse-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.entries && data.settings) {
          onImport(data);
          alert(t.backupRestored);
        } else {
          alert(t.invalidBackup);
        }
      } catch (err) {
        alert(t.invalidBackup);
      }
    };
    reader.readAsText(file);
  };

  // Componente Auxiliar para Seções Colapsáveis
  // Fix: Use React.FC to properly handle children in the JSX transform and avoid missing prop errors.
  // title is set to any because translations[lang] returns a generic object.
  const CollapsibleSection: React.FC<{ 
    id: string, 
    title: any, 
    icon: any, 
    children: React.ReactNode 
  }> = ({ 
    id, 
    title, 
    icon: Icon, 
    children 
  }) => {
    const isOpen = expandedSections[id];
    return (
      <section className="space-y-3">
        <button 
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-2 py-1 group active:opacity-70 transition-all"
        >
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
            {title}
          </h3>
          <div className={`p-1 rounded-full transition-all ${isOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-300'}`}>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        
        <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm mb-4">
            {children}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.setup}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm italic">{t.customize}</p>
      </div>

      <CollapsibleSection id="user" title={t.userProfile} icon={User}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
            <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 font-medium text-slate-800 dark:text-slate-100 transition-all" value={settings.userName} onChange={e => onUpdate({...settings, userName: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.language}</label>
                <div className="flex gap-2">
                    <button onClick={() => onUpdate({...settings, language: 'en'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${settings.language === 'en' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}`}>EN</button>
                    <button onClick={() => onUpdate({...settings, language: 'pt'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${settings.language === 'pt' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}`}>PT</button>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.currencyCode}</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-center text-slate-800 dark:text-slate-100 transition-all" value={settings.currency} onChange={e => onUpdate({...settings, currency: e.target.value.toUpperCase()})} maxLength={3} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="defaults" title={t.defaults} icon={Layout}>
        <div className="space-y-5">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interface Format</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Time Format</label>
                      <div className="flex gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                          <button onClick={() => onUpdate({...settings, timeFormat: '24h'})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${settings.timeFormat === '24h' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>24H</button>
                          <button onClick={() => onUpdate({...settings, timeFormat: '12h'})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${settings.timeFormat === '12h' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>12H</button>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Date Format</label>
                      <div className="flex gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                          <button onClick={() => onUpdate({...settings, dateFormat: 'DD/MM/YYYY'})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${settings.dateFormat === 'DD/MM/YYYY' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>DMY</button>
                          <button onClick={() => onUpdate({...settings, dateFormat: 'MM/DD/YYYY'})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${settings.dateFormat === 'MM/DD/YYYY' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>MDY</button>
                      </div>
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <TimePickerField 
                    label={t.startTime} 
                    value={settings.defaultStartTime} 
                    onChange={val => onUpdate({...settings, defaultStartTime: val})} 
                    is12h={is12h}
                    icon={<Clock className="w-5 h-5" />}
                />
                <TimePickerField 
                    label={t.endTime} 
                    value={settings.defaultEndTime} 
                    onChange={val => onUpdate({...settings, defaultEndTime: val})} 
                    is12h={is12h}
                    icon={<Clock className="w-5 h-5" />}
                    colorClass="text-rose-500"
                />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                    <Utensils className="text-orange-500 w-5 h-5" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.includeLunch}</span>
                </div>
                <button 
                  onClick={() => onUpdate({...settings, lunchEnabledDefault: !settings.lunchEnabledDefault})}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.lunchEnabledDefault ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.lunchEnabledDefault ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="rounding" title={`${t.rounding} & ${t.overtime}`} icon={Scale}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-2">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.rounding}</p>
              <p className="text-[10px] text-slate-400 font-medium">{t.roundingDesc}</p>
            </div>
            <button 
              onClick={() => onUpdate({...settings, roundingEnabled: !settings.roundingEnabled})}
              className={`w-12 h-6 rounded-full transition-all relative ${settings.roundingEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.roundingEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
          {settings.roundingEnabled && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.clockInRound}</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 outline-none font-bold text-slate-800 dark:text-slate-100" value={settings.clockInRoundingMinutes} onChange={e => onUpdate({...settings, clockInRoundingMinutes: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.clockOutRound}</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 outline-none font-bold text-slate-800 dark:text-slate-100" value={settings.clockOutRoundingMinutes} onChange={e => onUpdate({...settings, clockOutRoundingMinutes: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

          <div className="flex items-center justify-between p-2">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.overtime}</p>
              <p className="text-[10px] text-slate-400 font-medium">{t.otEnabled}</p>
            </div>
            <button 
              onClick={() => onUpdate({...settings, otEnabled: !settings.otEnabled})}
              className={`w-12 h-6 rounded-full transition-all relative ${settings.otEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.otEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          {settings.otEnabled && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.otThreshold}</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 outline-none font-bold text-slate-800 dark:text-slate-100" value={settings.otThresholdMinutes} onChange={e => onUpdate({...settings, otThresholdMinutes: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.otMultiplier}</label>
                  <input type="number" step="0.1" className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 outline-none font-bold text-slate-800 dark:text-slate-100" value={settings.otRateMultiplier} onChange={e => onUpdate({...settings, otRateMultiplier: parseFloat(e.target.value) || 1.0})} />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="financials" title={t.financials} icon={DollarSign}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.hourlyRate}</label>
                <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-100 transition-all" value={settings.hourlyRate} onChange={e => onUpdate({...settings, hourlyRate: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.holidayMultiplier}</label>
                <input type="number" step="0.1" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-100 transition-all" value={settings.holidayRateMultiplier} onChange={e => onUpdate({...settings, holidayRateMultiplier: parseFloat(e.target.value) || 1.0})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.unpaidBreak}</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-100 transition-all" value={settings.unpaidBreakMinutes} onChange={e => onUpdate({...settings, unpaidBreakMinutes: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.weeklyGoal}</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-100 transition-all" value={settings.weeklyGoalHours} onChange={e => onUpdate({...settings, weeklyGoalHours: parseInt(e.target.value) || 40})} />
            </div>
          </div>
          <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.holidayDefault}</label>
              <input type="number" step="0.5" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-indigo-500 transition-all outline-none font-bold text-slate-800 dark:text-slate-100" value={settings.holidayDefaultHours} onChange={e => onUpdate({...settings, holidayDefaultHours: parseFloat(e.target.value) || 8})} />
          </div>
        </div>
      </CollapsibleSection>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2 py-1">
          <Zap className="w-3.5 h-3.5" />
          {t.dataStorage}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={exportData} className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95">
            <FileJson className="w-6 h-6 text-indigo-600" />
            <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">{t.exportJson}</span>
          </button>
          <button onClick={exportCSV} className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">{t.exportCsv}</span>
          </button>
          <label className="col-span-2 flex flex-col items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[32px] border-2 border-dashed border-indigo-200 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all active:scale-[0.98]">
            <Upload className="w-6 h-6 text-indigo-600" />
            <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">{t.importBackup}</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;