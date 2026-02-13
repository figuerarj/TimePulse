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
  if (entry.isHoliday && !entry.holidayWorked) {
    return settings.holidayDefaultHours || 0;
  }

  if (!entry.startTime || !entry.endTime) return 0;
  
  const realIn = parseToMinutes(entry.startTime);
  const realOut = parseToMinutes(entry.endTime);
  
  let startTotal = realIn;
  let endTotal = realOut;
  if (endTotal < startTotal) endTotal += 1440;

  if (forWage && settings.roundingEnabled) {
    const schedStart = parseToMinutes(entry.isCustomShift ? (entry.scheduledStartTime || settings.defaultStartTime) : settings.defaultStartTime);
    let schedEnd = parseToMinutes(entry.isCustomShift ? (entry.scheduledEndTime || settings.defaultEndTime) : settings.defaultEndTime);
    if (schedEnd < schedStart) schedEnd += 1440;

    /**
     * REGRA DE ENTRADA: max(realIn, scheduledIn)
     * Ignora tempo antes do turno começar.
     */
    startTotal = Math.max(realIn, schedStart);

    // Se houver atraso, aplica a margem de arredondamento de entrada
    if (startTotal > schedStart) {
      const delay = startTotal - schedStart;
      if (delay <= (settings.clockInRoundingMinutes || 0)) {
        startTotal = schedStart;
      }
    }

    /**
     * REGRA DE SAÍDA: Arredonda para o previsto se dentro da margem
     */
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

  // OT é estritamente o tempo após o fim previsto da escala
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