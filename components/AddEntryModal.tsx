
import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Clock, FileText, DollarSign, Umbrella, Utensils, Briefcase, Zap, AlertCircle } from 'lucide-react';
import { TimeEntry, AppSettings } from '../types';
import { getSmartLunchTime, getLocalDateString } from '../utils/timeUtils';
import { translations } from '../utils/translations';
import TimePickerField from './ui/TimePickerField';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: TimeEntry) => void;
  settings: AppSettings;
  initialData?: TimeEntry;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({ isOpen, onClose, onSave, settings, initialData }) => {
  const t = translations[settings.language || 'en'];
  const is12h = settings.timeFormat === '12h';
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<TimeEntry>>({
    id: '',
    date: getLocalDateString(),
    startTime: settings.defaultStartTime,
    endTime: settings.defaultEndTime,
    lunchStart: '12:00',
    lunchEnd: '13:00',
    notes: '',
    hourlyRate: settings.hourlyRate,
    unpaidBreakMinutes: settings.unpaidBreakMinutes,
    isHoliday: false,
    holidayWorked: false,
    lunchEnabled: settings.lunchEnabledDefault
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        hourlyRate: initialData.hourlyRate ?? settings.hourlyRate,
        unpaidBreakMinutes: initialData.unpaidBreakMinutes ?? settings.unpaidBreakMinutes
      });
    } else {
        const smartLunch = getSmartLunchTime(settings.defaultStartTime, settings.defaultEndTime);
        setFormData(prev => ({
            ...prev,
            id: '',
            date: getLocalDateString(),
            startTime: settings.defaultStartTime,
            endTime: settings.defaultEndTime,
            lunchStart: smartLunch.lunchStart,
            lunchEnd: smartLunch.lunchEnd,
            notes: '',
            hourlyRate: settings.hourlyRate,
            unpaidBreakMinutes: settings.unpaidBreakMinutes,
            isHoliday: false,
            holidayWorked: false,
            lunchEnabled: settings.lunchEnabledDefault
        }));
    }
  }, [initialData, settings]);

  const validate = () => {
    if (!formData.isHoliday || formData.holidayWorked) {
        if (formData.startTime === formData.endTime) {
            setError(settings.language === 'pt' ? "Início e fim não podem ser iguais" : "Start and end times cannot be equal");
            return false;
        }
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !validate()) return;
    
    const finalLunchStart = formData.lunchEnabled ? formData.lunchStart : '';
    const finalLunchEnd = formData.lunchEnabled ? formData.lunchEnd : '';
    
    onSave({
      ...formData as TimeEntry,
      id: formData.id || Date.now().toString(),
      hourlyRate: Number(formData.hourlyRate) ?? settings.hourlyRate,
      unpaidBreakMinutes: Number(formData.unpaidBreakMinutes) ?? settings.unpaidBreakMinutes,
      lunchStart: finalLunchStart || '',
      lunchEnd: finalLunchEnd || ''
    });
  };

  const showTimeFields = !formData.isHoliday || formData.holidayWorked;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
        <div className="px-8 pt-10 pb-8 max-h-[90vh] overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h2 id="modal-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {initialData ? t.editEntry : t.newEntry}
            </h2>
            <button 
              onClick={onClose} 
              aria-label="Fechar modal"
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-in zoom-in-95">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setFormData({...formData, isHoliday: !formData.isHoliday, holidayWorked: false})}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all font-bold text-sm ${formData.isHoliday ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
              >
                <Umbrella className="w-4 h-4" />
                {t.holiday}
              </button>
              <button 
                type="button"
                disabled={!formData.isHoliday}
                onClick={() => setFormData({...formData, holidayWorked: !formData.holidayWorked})}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all font-bold text-sm ${!formData.isHoliday ? 'opacity-30 cursor-not-allowed' : ''} ${formData.holidayWorked ? 'bg-amber-600 border-amber-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
              >
                <Briefcase className="w-4 h-4" />
                {t.holidayWorked}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:border-indigo-500 transition-all">
                <Calendar className="text-indigo-500 w-5 h-5" />
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.date}</label>
                  <input type="date" required className="w-full bg-transparent font-semibold outline-none text-slate-800 dark:text-slate-100" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>

              {showTimeFields && (
                <>
                  <div className="flex items-center gap-4">
                    <button 
                        type="button"
                        onClick={() => setFormData({...formData, lunchEnabled: !formData.lunchEnabled})}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all font-bold text-sm ${formData.lunchEnabled ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                    >
                        <Utensils className="w-4 h-4" />
                        {t.lunch}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TimePickerField 
                      label={t.startTime} 
                      value={formData.startTime || "09:00"} 
                      onChange={(val) => setFormData({...formData, startTime: val})} 
                      is12h={is12h}
                      icon={<Clock className="w-5 h-5" />}
                    />
                    <TimePickerField 
                      label={t.endTime} 
                      value={formData.endTime || "17:30"} 
                      onChange={(val) => setFormData({...formData, endTime: val})} 
                      is12h={is12h}
                      icon={<Clock className="w-5 h-5" />}
                      colorClass="text-rose-500"
                    />
                  </div>

                  {formData.lunchEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                      <TimePickerField 
                        label={`${t.lunch} ${t.startTime}`}
                        value={formData.lunchStart || "12:00"} 
                        onChange={(val) => setFormData({...formData, lunchStart: val})} 
                        is12h={is12h}
                        icon={<Utensils className="w-5 h-5" />}
                        colorClass="text-indigo-400"
                      />
                      <TimePickerField 
                        label={`${t.lunch} ${t.endTime}`}
                        value={formData.lunchEnd || "13:00"} 
                        onChange={(val) => setFormData({...formData, lunchEnd: val})} 
                        is12h={is12h}
                        icon={<Utensils className="w-5 h-5" />}
                        colorClass="text-indigo-400"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:border-emerald-500 transition-all">
                  <DollarSign className="text-emerald-500 w-5 h-5" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.hourlyRate}</label>
                    <input type="number" step="0.01" className="w-full bg-transparent font-semibold outline-none text-slate-800 dark:text-slate-100" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:border-indigo-500 transition-all">
                  <Zap className="text-amber-500 w-5 h-5" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.unpaidBreak} (min)</label>
                    <input type="number" className="w-full bg-transparent font-semibold outline-none text-slate-800 dark:text-slate-100" value={formData.unpaidBreakMinutes} onChange={e => setFormData({...formData, unpaidBreakMinutes: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <FileText className="text-slate-400 w-5 h-5 mt-1" />
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.notes}</label>
                  <textarea rows={2} placeholder={t.notesPlaceholder} className="w-full bg-transparent font-medium outline-none text-slate-800 dark:text-slate-100 resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[25px] font-bold text-lg shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Check className="w-6 h-6" />
              {initialData ? t.updateEntry : t.saveEntry}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEntryModal;
