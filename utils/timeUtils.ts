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

/**
 * Converte horas decimais para um formato amigável (ex: 0.3h -> 18min, 1.5h -> 1h 30m)
 */
export const formatDecimalToHuman = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes === 0) return '0min';
  
  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }
  
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/**
 * Retorna os horários exatos de Início e Fim que o sistema considerou para o cálculo de pagamento.
 */
export const getRoundedTimeRange = (entry: TimeEntry, settings: AppSettings): { start: string, end: string } => {
  if (!entry.startTime || !entry.endTime) return { start: '', end: '' };
  
  const realIn = parseToMinutes(entry.startTime);
  const realOut = parseToMinutes(entry.endTime);
  const schedStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
  let schedEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
  
  // Normalização para turnos noturnos
  let normalizedRealOut = realOut;
  if (normalizedRealOut < realIn) normalizedRealOut += 1440;

  let normalizedSchedEnd = schedEnd;
  if (normalizedSchedEnd < schedStart) normalizedSchedEnd += 1440;

  let calcIn = realIn;
  let calcOut = normalizedRealOut;

  if (settings.roundingEnabled) {
    /**
     * REGRA DE ENTRADA (MANDATÓRIA): calculationStart = max(realIn, scheduledIn)
     * Ignora completamente tempo antes do previsto.
     */
    calcIn = Math.max(realIn, schedStart);

    /**
     * ARREDONDAMENTO DE ENTRADA (APÓS REGRA ACIMA)
     * Se ainda estiver atrasado em relação ao previsto, verifica a margem.
     */
    if (calcIn > schedStart) {
      const delay = calcIn - schedStart;
      if (delay <= (settings.clockInRoundingMinutes || 0)) {
        calcIn = schedStart;
      }
    }

    /**
     * REGRA DE SAÍDA (ARREDONDAMENTO)
     */
    if (normalizedRealOut < normalizedSchedEnd) {
      // Saiu antes do previsto: se dentro da margem, abona (arredonda para o fim da escala)
      if (normalizedSchedEnd - normalizedRealOut <= (settings.clockOutRoundingMinutes || 0)) {
        calcOut = normalizedSchedEnd;
      }
    } else {
      // Saiu depois do previsto: se dentro da margem, arredonda para baixo (fim da escala)
      if (normalizedRealOut - normalizedSchedEnd <= (settings.clockOutRoundingMinutes || 0)) {
        calcOut = normalizedSchedEnd;
      }
    }
  }

  return {
    start: formatDisplayTime(minutesToHHMM(calcIn), settings.timeFormat),
    end: formatDisplayTime(minutesToHHMM(calcOut), settings.timeFormat)
  };
};

export const calculateWorkHours = (entry: TimeEntry, settings: AppSettings, forWage: boolean = false): number => {
  let workedHours = 0;

  if (entry.startTime && entry.endTime) {
    const realIn = parseToMinutes(entry.startTime);
    const realOut = parseToMinutes(entry.endTime);
    
    let startTotal = realIn;
    let endTotal = realOut;
    if (endTotal < startTotal) endTotal += 1440;

    // For regular days with rounding enabled, we apply the shift-based rounding
    if (forWage && settings.roundingEnabled && !entry.isHoliday) {
      const schedStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
      let schedEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
      if (schedEnd < schedStart) schedEnd += 1440;

      startTotal = Math.max(realIn, schedStart);

      if (startTotal > schedStart) {
        const delay = startTotal - schedStart;
        if (delay <= (settings.clockInRoundingMinutes || 0)) {
          startTotal = schedStart;
        }
      }

      if (endTotal < schedEnd) {
        if (schedEnd - endTotal <= (settings.clockOutRoundingMinutes || 0)) {
          endTotal = schedEnd;
        }
      } else {
        if (endTotal - schedEnd <= (settings.clockOutRoundingMinutes || 0)) {
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
    workedHours = Math.max(0, totalMinutes / 60);
  }

  // Holiday Pay (8h) is added to the total hours if enabled
  const holidayBase = (entry.isHoliday && entry.holidayPay) ? (settings.holidayDefaultHours || 0) : 0;
  
  return workedHours + holidayBase;
};

export const calculateOvertimeMinutes = (entry: TimeEntry, settings: AppSettings): number => {
  if (!settings.otEnabled) return 0;
  if (!entry.startTime || !entry.endTime) return 0;

  // OT calculation based on duration exceeding the scheduled shift
  const totalHours = calculateWorkHours(entry, settings, true);
  const holidayBase = (entry.isHoliday && entry.holidayPay) ? (settings.holidayDefaultHours || 0) : 0;
  const workedHours = Math.max(0, totalHours - holidayBase);
  
  let scheduledDuration = 0;
  // If it's a holiday worked, all worked hours are OT as per user request
  if (!entry.isHoliday || !entry.holidayWorked) {
    const sStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
    let sEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
    if (sEnd < sStart) sEnd += 1440;
    
    const breakMin = entry.unpaidBreakMinutes !== undefined ? entry.unpaidBreakMinutes : (settings.unpaidBreakMinutes || 0);
    scheduledDuration = Math.max(0, (sEnd - sStart - breakMin) / 60);
  }

  const diffMinutes = (workedHours - scheduledDuration) * 60;
  
  if (diffMinutes >= (settings.otThresholdMinutes || 0)) {
    return Math.max(0, diffMinutes);
  }
  
  return 0;
};

export const calculateEarnings = (entry: TimeEntry, settings: AppSettings): number => {
  const baseRate = entry.hourlyRate ?? settings.hourlyRate;
  const holidayBaseHours = (entry.isHoliday && entry.holidayPay) ? (settings.holidayDefaultHours || 0) : 0;
  const holidayPay = holidayBaseHours * baseRate;

  const totalHours = calculateWorkHours(entry, settings, true);
  const workedHours = Math.max(0, totalHours - holidayBaseHours);
  
  const otMinutes = calculateOvertimeMinutes(entry, settings);
  const otHours = otMinutes / 60;
  
  const regularWorkedHours = Math.max(0, workedHours - otHours);
  
  let rate = baseRate;
  // If it's a holiday worked, we use the specific holiday worked rate if set, 
  // otherwise fallback to the multiplier logic.
  if (entry.isHoliday && entry.holidayWorked) {
    if (settings.holidayWorkedRate > 0) {
      rate = settings.holidayWorkedRate;
    } else if (!settings.otEnabled) {
      // Only apply multiplier here if OT is disabled, otherwise OT logic handles it
      rate = baseRate * (settings.holidayRateMultiplier || 1);
    }
  }

  const regularPay = regularWorkedHours * rate;
  
  // For OT pay on holidays, if a specific holiday rate is set, we might want to use it 
  // or apply the OT multiplier to it. Usually, OT on holidays is baseRate * otMultiplier.
  // We'll stick to the existing OT logic but allow the holiday rate to influence regular hours.
  const otPay = otHours * (baseRate * (settings.otRateMultiplier || 1.5));
  
  return holidayPay + regularPay + otPay;
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