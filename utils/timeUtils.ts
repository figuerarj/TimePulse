import { TimeEntry, AppSettings } from '../types';

const parseToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  // Handle both HH:mm and HH:mm AM/PM if somehow saved incorrectly
  const cleanTime = timeStr.split(' ')[0];
  const [hours, minutes] = cleanTime.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const calculateWorkHours = (entry: TimeEntry, settings: AppSettings, forWage: boolean = false): number => {
  if (entry.isHoliday && !entry.holidayWorked) {
    return settings.holidayDefaultHours || 0;
  }

  if (!entry.startTime || !entry.endTime) return 0;
  
  let startTotal = parseToMinutes(entry.startTime);
  let endTotal = parseToMinutes(entry.endTime);
  
  // Basic duration calculation (handle overnight)
  let durationMinutes = endTotal - startTotal;
  if (durationMinutes < 0) durationMinutes += 1440;

  if (forWage && settings.roundingEnabled) {
    // Get scheduled times with robust fallbacks
    const schedStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
    let schedEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
    
    // Normalize real input relative to scheduled start to handle overnight edge cases
    let realIn = startTotal;
    let realOut = endTotal;
    if (realOut < realIn) realOut += 1440;

    let calcIn = realIn;
    let calcOut = realOut;

    /**
     * REGRA DE ENTRADA (CLOCK-IN)
     */
    if (realIn < schedStart) {
      // Entrada antecipada: sempre começa no previsto
      calcIn = schedStart;
    } else {
      // Entrada no horário ou atrasada
      const delay = realIn - schedStart;
      if (delay <= (settings.clockInRoundingMinutes || 0)) {
        // Dentro da margem de tolerância: arredonda para o previsto
        calcIn = schedStart;
      } else {
        // Fora da margem: mantém o atraso real
        calcIn = realIn;
      }
    }

    /**
     * REGRA DE SAÍDA (CLOCK-OUT)
     * Ajusta apenas se não houver OT legítima sendo calculada separadamente
     */
    // Se saiu antes do previsto
    if (realOut < schedEnd) {
      const earlyExit = schedEnd - realOut;
      if (earlyExit <= (settings.clockOutRoundingMinutes || 0)) {
        calcOut = schedEnd; // Abona saída antecipada dentro da margem
      }
    } else if (realOut > schedEnd) {
      // Se saiu depois do previsto, mas dentro da margem de arredondamento de saída
      const lateExit = realOut - schedEnd;
      if (lateExit <= (settings.clockOutRoundingMinutes || 0)) {
        calcOut = schedEnd; // Arredonda para baixo se for apenas "sobra" de saída
      }
    }

    startTotal = calcIn;
    endTotal = calcOut;
  }
  
  // Re-calculate minutes after rounding adjustments
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
  let realEnd = parseToMinutes(entry.endTime);
  
  const realStart = parseToMinutes(entry.startTime);
  if (realEnd < realStart) realEnd += 1440;
  if (schedEnd < schedStart) schedEnd += 1440;

  // OT is strictly time worked AFTER the scheduled shift ends
  const diff = realEnd - schedEnd;
  
  if (diff >= (settings.otThresholdMinutes || 0)) {
    return Math.max(0, diff);
  }
  
  return 0;
};

export const calculateEarnings = (entry: TimeEntry, settings: AppSettings): number => {
  const totalRoundedHours = calculateWorkHours(entry, settings, true);
  const otMinutes = calculateOvertimeMinutes(entry, settings);
  const otHours = otMinutes / 60;
  
  // Regular hours = Rounded period minus OT portion
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