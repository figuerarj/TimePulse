import React, { useState, useEffect, useRef } from 'react';

interface TimePickerFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  icon: React.ReactNode;
  is12h: boolean;
  colorClass?: string;
}

const TimePickerField: React.FC<TimePickerFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  icon,
  is12h,
  colorClass = "text-indigo-500"
}) => {
  const safeValue = value || "00:00";
  const [hStr, mStr] = safeValue.split(':');
  
  const [tempH, setTempH] = useState("");
  const [tempM, setTempM] = useState("");
  const [ampm, setAmpm] = useState(parseInt(hStr) >= 12 ? 'PM' : 'AM');
  
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const h24 = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;

    if (is12h) {
      const displayH = h24 % 12 || 12;
      setTempH(String(displayH));
      setAmpm(h24 >= 12 ? 'PM' : 'AM');
    } else {
      setTempH(String(h24).padStart(2, '0'));
    }
    setTempM(String(m).padStart(2, '0'));
  }, [value, is12h, hStr, mStr]);

  const pushUpdate = (h: string, min: string, period: string) => {
    if (h === "" || min === "") return;
    
    let hh = parseInt(h);
    let mm = parseInt(min);
    
    if (isNaN(hh)) hh = is12h ? 12 : 0;
    if (isNaN(mm)) mm = 0;

    let finalH = hh;
    if (is12h) {
      if (period === 'PM') {
        finalH = hh === 12 ? 12 : hh + 12;
      } else {
        finalH = hh === 12 ? 0 : hh;
      }
    } else {
      finalH = Math.min(23, Math.max(0, hh));
    }
    
    const finalM = Math.min(59, Math.max(0, mm));
    isInternalUpdate.current = true;
    onChange(`${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:border-indigo-500 transition-all shadow-sm">
      <div className={colorClass} aria-hidden="true">{icon}</div>
      <div className="flex-1">
        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 px-1 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20">
            <input 
              type="text" 
              inputMode="numeric"
              aria-label={`${label} - horas`}
              className="w-8 bg-transparent text-center font-bold text-slate-800 dark:text-slate-100 outline-none py-1"
              value={tempH}
              placeholder="00"
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                setTempH(val);
                // Não enviamos o update para o pai se for vazio ou 0 temporário para evitar loops de render
                if (val !== "") {
                  pushUpdate(val, tempM, ampm);
                }
              }}
              onBlur={() => {
                let hh = parseInt(tempH);
                if (isNaN(hh)) hh = is12h ? 12 : 0;
                let formatted = is12h ? String(Math.min(12, Math.max(1, hh))) : String(Math.min(23, Math.max(0, hh))).padStart(2, '0');
                setTempH(formatted);
                pushUpdate(formatted, tempM, ampm);
              }}
            />
            <span className="text-slate-400 font-bold" aria-hidden="true">:</span>
            <input 
              type="text" 
              inputMode="numeric"
              aria-label={`${label} - minutos`}
              className="w-10 bg-transparent text-center font-bold text-slate-800 dark:text-slate-100 outline-none py-1"
              value={tempM}
              placeholder="00"
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                setTempM(val);
                if (val !== "") {
                  pushUpdate(tempH, val, ampm);
                }
              }}
              onBlur={() => {
                const mm = parseInt(tempM) || 0;
                const formatted = String(Math.min(59, Math.max(0, mm))).padStart(2, '0');
                setTempM(formatted);
                pushUpdate(tempH, formatted, ampm);
              }}
            />
          </div>
          
          {is12h && (
            <button
              type="button"
              aria-label={`Alternar entre AM e PM. Atual: ${ampm}`}
              onClick={() => {
                const newPeriod = ampm === 'AM' ? 'PM' : 'AM';
                setAmpm(newPeriod);
                pushUpdate(tempH, tempM, newPeriod);
              }}
              className={`px-2 py-1 rounded-lg font-black text-[10px] transition-all border ${
                ampm === 'PM' 
                  ? 'bg-amber-500 border-amber-600 text-white shadow-sm' 
                  : 'bg-indigo-500 border-indigo-600 text-white shadow-sm'
              }`}
            >
              {ampm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimePickerField;