import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Clock, FileText, DollarSign, Umbrella, Utensils, Zap, AlertCircle, ListChecks } from 'lucide-react';
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

  const [showHolidayOptions, setShowHolidayOptions] = useState(false);

  const [formData, setFormData] = useState<Partial<TimeEntry>>({
    id: '',
    date: getLocalDateString(),
    startTime: settings.defaultStartTime,
    endTime: settings.defaultEndTime,
    scheduledStartTime: settings.defaultStartTime,
    scheduledEndTime: settings.defaultEndTime,
    isCustomShift: false,
    lunchStart: '12:00',
    lunchEnd: '13:00',
    notes: '',
    hourlyRate: settings.hourlyRate,
    unpaidBreakMinutes: settings.unpaidBreakMinutes,
    isHoliday: false,
    holidayWorked: false,
    holidayPay: false,
    lunchEnabled: settings.lunchEnabledDefault
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        hourlyRate: initialData.hourlyRate ?? settings.hourlyRate,
        unpaidBreakMinutes: initialData.unpaidBreakMinutes ?? settings.unpaidBreakMinutes,
        scheduledStartTime: initialData.scheduledStartTime || settings.defaultStartTime,
        scheduledEndTime: initialData.scheduledEndTime || settings.defaultEndTime,
        isCustomShift: initialData.isCustomShift || false,
        holidayPay: initialData.holidayPay || false,
        holidayWorked: initialData.holidayWorked || false
      });
    } else {
        const smartLunch = getSmartLunchTime(settings.defaultStartTime, settings.defaultEndTime);
        setFormData(prev => ({
            ...prev,
            id: '',
            date: getLocalDateString(),
            startTime: settings.defaultStartTime,
            endTime: settings.defaultEndTime,
            scheduledStartTime: settings.defaultStartTime,
            scheduledEndTime: settings.defaultEndTime,
            isCustomShift: false,
            lunchStart: smartLunch.lunchStart,
            lunchEnd: smartLunch.lunchEnd,
            notes: '',
            hourlyRate: settings.hourlyRate,
            unpaidBreakMinutes: settings.unpaidBreakMinutes,
            isHoliday: false,
            holidayWorked: false,
            holidayPay: false,
            lunchEnabled: settings.lunchEnabledDefault
        }));
        setShowHolidayOptions(false);
    }
  }, [initialData, settings]);

  const toggleHoliday = () => {
    const newIsHoliday = !formData.isHoliday;
    setFormData({
      ...formData,
      isHoliday: newIsHoliday,
      holidayPay: newIsHoliday ? formData.holidayPay : false,
      holidayWorked: newIsHoliday ? formData.holidayWorked : false
    });
    setShowHolidayOptions(newIsHoliday);
  };

  const validate = () => {
    if (!formData.isHoliday) {
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

  const showTimeFields = true;

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
            <div className="flex items-center gap-3">
              <h2 id="modal-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {initialData ? t.editEntry : t.newEntry}
              </h2>
              <button 
                type="button"
                onClick={toggleHoliday}
                className={`p-2 rounded-xl border transition-all ${formData.isHoliday ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200'}`}
                title={t.holiday}
              >
                <Umbrella className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={onClose} 
              aria-label="Fechar modal"
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {showHolidayOptions && (
            <div className="mb-6 p-5 bg-orange-50 dark:bg-orange-900/10 rounded-[32px] border border-orange-100 dark:border-orange-800 space-y-4 animate-in zoom-in-95 duration-300 shadow-sm">
              <div className="flex items-center gap-2 px-1 text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">
                <Umbrella className="w-3 h-3" />
                {t.holiday}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center gap-3 cursor-pointer group bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-orange-100/50 dark:border-orange-800/50 hover:bg-white transition-colors">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.holidayPay ? 'bg-orange-500 border-orange-500 shadow-sm' : 'border-slate-300 dark:border-slate-600'}`}>
                    {formData.holidayPay && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.holidayPay} 
                    onChange={() => {
                      const newVal = !formData.holidayPay;
                      setFormData({ ...formData, holidayPay: newVal });
                    }} 
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.holidayPay}</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-orange-100/50 dark:border-orange-800/50 hover:bg-white transition-colors">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.holidayWorked ? 'bg-orange-500 border-orange-500 shadow-sm' : 'border-slate-300 dark:border-slate-600'}`}>
                    {formData.holidayWorked && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.holidayWorked} 
                    onChange={() => {
                      const newVal = !formData.holidayWorked;
                      setFormData({ ...formData, holidayWorked: newVal });
                    }} 
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.holidayWorked}</span>
                </label>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-in zoom-in-95">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-bold">{error}</p>
              </div>
            )}

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
                  <div className="flex gap-3">
                    <button 
                        type="button"
                        onClick={() => setFormData({...formData, lunchEnabled: !formData.lunchEnabled})}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all font-bold text-sm ${formData.lunchEnabled ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                    >
                        <Utensils className="w-4 h-4" />
                        {t.lunch}
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFormData({...formData, isCustomShift: !formData.isCustomShift})}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all font-bold text-sm ${formData.isCustomShift ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                    >
                        <ListChecks className="w-4 h-4" />
                        {t.customShift}
                    </button>
                  </div>

                  {formData.isCustomShift && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 space-y-3 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 px-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                        <Clock className="w-3 h-3" />
                        {t.schedShift}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <TimePickerField 
                          label={t.schedStart} 
                          value={formData.scheduledStartTime || settings.defaultStartTime} 
                          onChange={(val) => setFormData({...formData, scheduledStartTime: val})} 
                          is12h={is12h}
                          icon={<Zap className="w-3 h-3" />}
                        />
                        <TimePickerField 
                          label={t.schedEnd} 
                          value={formData.scheduledEndTime || settings.defaultEndTime} 
                          onChange={(val) => setFormData({...formData, scheduledEndTime: val})} 
                          is12h={is12h}
                          icon={<Zap className="w-3 h-3" />}
                        />
                      </div>
                    </div>
                  )}

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