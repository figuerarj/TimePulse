import { TimeEntry, AppSettings } from '../types';

const parseToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const cleanTime = timeStr.split(' ')[0];
  const [hours, minutes] = cleanTime.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const minutesToHHMM = (totalMinutes: number): string => {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getRoundedTimeRange = (entry: TimeEntry, settings: AppSettings): { start: string, end: string } => {
  if (!entry.startTime || !entry.endTime) return { start: '', end: '' };
  
  let realIn = parseToMinutes(entry.startTime);
  let realOut = parseToMinutes(entry.endTime);
  if (realOut < realIn) realOut += 1440;

  const schedStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
  let schedEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
  
  // Normalizar schedEnd relativo ao schedStart para turnos noturnos
  if (schedEnd < schedStart) schedEnd += 1440;

  let calcIn = realIn;
  let calcOut = realOut;

  if (settings.roundingEnabled) {
    /**
     * REGRA DE ENTRADA (CLOCK-IN)
     * Se entrou antes do previsto: usa o previsto (ignora tempo extra anterior)
     */
    if (realIn <= schedStart) {
      calcIn = schedStart;
    } else {
      // Se entrou depois do previsto, mas dentro da margem de atraso
      const delay = realIn - schedStart;
      if (delay <= (settings.clockInRoundingMinutes || 0)) {
        calcIn = schedStart;
      } else {
        calcIn = realIn;
      }
    }

    /**
     * REGRA DE SAÍDA (CLOCK-OUT)
     */
    if (realOut < schedEnd) {
      // Saiu antes do previsto: se dentro da margem, arredonda para o previsto (abono)
      if (schedEnd - realOut <= (settings.clockOutRoundingMinutes || 0)) {
        calcOut = schedEnd;
      }
    } else {
      // Saiu no horário ou depois: se dentro da margem, arredonda para baixo (previsto)
      if (realOut - schedEnd <= (settings.clockOutRoundingMinutes || 0)) {
        calcOut = schedEnd;
      }
      // Se for maior que a margem, o tempo excedente é considerado (e pode virar OT)
    }
  }

  return {
    start: formatDisplayTime(minutesToHHMM(calcIn), settings.timeFormat),
    end: formatDisplayTime(minutesToHHMM(calcOut), settings.timeFormat)
  };
};

export const calculateWorkHours = (entry: TimeEntry, settings: AppSettings, forWage: boolean = false): number => {
  if (entry.isHoliday && !entry.holidayWorked) {
    return settings.holidayDefaultHours || 0;
  }

  if (!entry.startTime || !entry.endTime) return 0;
  
  let realIn = parseToMinutes(entry.startTime);
  let realOut = parseToMinutes(entry.endTime);
  if (realOut < realIn) realOut += 1440;

  let startTotal = realIn;
  let endTotal = realOut;
  
  if (forWage && settings.roundingEnabled) {
    const schedStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
    let schedEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
    if (schedEnd < schedStart) schedEnd += 1440;

    // Aplicação rigorosa do arredondamento de entrada
    if (realIn <= schedStart) {
      startTotal = schedStart;
    } else {
      const delay = realIn - schedStart;
      if (delay <= (settings.clockInRoundingMinutes || 0)) {
        startTotal = schedStart;
      } else {
        startTotal = realIn;
      }
    }

    // Aplicação rigorosa do arredondamento de saída
    if (realOut < schedEnd) {
      if (schedEnd - realOut <= (settings.clockOutRoundingMinutes || 0)) {
        endTotal = schedEnd;
      }
    } else {
      if (realOut - schedEnd <= (settings.clockOutRoundingMinutes || 0)) {
        endTotal = schedEnd;
      }
    }
  }
  
  let totalMinutes = endTotal - startTotal;
  if (totalMinutes < 0) totalMinutes += 1440;

  const breakMinutes = entry.unpaidBreakMinutes !== undefined 
    ? entry.unpaidBreakMinutes 
    : (Number(settings.unpaidBreakMinutes) || 0);
    
  totalMinutes -= breakMinutes;
  return Math.max(0, totalMinutes / 60);
};

export const calculateOvertimeMinutes = (entry: TimeEntry, settings: AppSettings): number => {
  if (!settings.otEnabled) return 0;
  if (!entry.startTime || !entry.endTime || (entry.isHoliday && !entry.holidayWorked)) return 0;

  const schedStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
  let schedEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
  if (schedEnd < schedStart) schedEnd += 1440;

  let realIn = parseToMinutes(entry.startTime);
  let realOut = parseToMinutes(entry.endTime);
  if (realOut < realIn) realOut += 1440;

  // OT é apenas o tempo trabalhado DEPOIS do horário previsto de saída
  const diff = realOut - schedEnd;
  
  if (diff >= (settings.otThresholdMinutes || 0)) {
    return Math.max(0, diff);
  }
  
  return 0;
};

export const calculateEarnings = (entry: TimeEntry, settings: AppSettings): number => {
  const totalRoundedHours = calculateWorkHours(entry, settings, true);
  const otMinutes = calculateOvertimeMinutes(entry, settings);
  const otHours = otMinutes / 60;
  
  const regularHours = Math.max(0, totalRoundedHours - otHours);
  const baseRate = entry.hourlyRate ?? settings.hourlyRate;
  
  let rate = baseRate;
  if (entry.isHoliday && entry.holidayWorked) {
    rate = baseRate * (settings.holidayRateMultiplier || 1);
  }

  const regularPay = regularHours * rate;
  const otPay = otHours * (rate * (settings.otRateMultiplier || 1.5));
  
  return regularPay + otPay;
};

export const formatDisplayTime = (timeStr: string, format: '24h' | '12h'): string => {
  if (!timeStr) return '';
  if (format === '24h') return timeStr;
  
  let [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

export const formatDisplayDate = (dateStr: string, format: 'DD/MM/YYYY' | 'MM/DD/YYYY'): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return format === 'DD/MM/YYYY' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
};

export const getSmartLunchTime = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return { lunchStart: '12:00', lunchEnd: '13:00' };
  
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  
  let s = parse(startTime);
  let e = parse(endTime);
  if (e < s) e += 1440;
  
  const middle = Math.floor((s + e) / 2);
  const lStart = (middle - 30); 
  const lEnd = lStart + 60;
  
  const toStr = (m: number) => {
    const norm = ((m % 1440) + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const min = norm % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  
  return {
    lunchStart: toStr(lStart),
    lunchEnd: toStr(lEnd)
  };
};

export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};