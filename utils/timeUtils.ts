import { TimeEntry, AppSettings } from '../types';

const parseToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const calculateWorkHours = (entry: TimeEntry, settings: AppSettings, forWage: boolean = false): number => {
  if (entry.isHoliday && !entry.holidayWorked) {
    return settings.holidayDefaultHours || 0;
  }

  if (!entry.startTime || !entry.endTime) return 0;
  
  let startTotal = parseToMinutes(entry.startTime);
  let endTotal = parseToMinutes(entry.endTime);
  
  if (endTotal < startTotal) {
    endTotal += 1440;
  }

  if (forWage && settings.roundingEnabled) {
    const schedStart = parseToMinutes(entry.isCustomShift ? entry.scheduledStartTime! : settings.defaultStartTime);
    let schedEnd = parseToMinutes(entry.isCustomShift ? entry.scheduledEndTime! : settings.defaultEndTime);
    
    // Adjust scheduled end if shift spans midnight
    if (schedEnd < schedStart) schedEnd += 1440;

    // Apply Clock-in Rounding
    if (Math.abs(startTotal - schedStart) <= (settings.clockInRoundingMinutes || 0)) {
      startTotal = schedStart;
    }
    
    // Apply Clock-out Rounding
    if (Math.abs(endTotal - schedEnd) <= (settings.clockOutRoundingMinutes || 0)) {
      endTotal = schedEnd;
    }
  }
  
  let totalMinutes = endTotal - startTotal;
  const breakMinutes = entry.unpaidBreakMinutes !== undefined 
    ? entry.unpaidBreakMinutes 
    : (Number(settings.unpaidBreakMinutes) || 0);
    
  totalMinutes -= breakMinutes;
  return Math.max(0, totalMinutes / 60);
};

export const calculateOvertimeMinutes = (entry: TimeEntry, settings: AppSettings): number => {
  if (!entry.startTime || !entry.endTime || (entry.isHoliday && !entry.holidayWorked)) return 0;

  const schedStart = parseToMinutes(entry.isCustomShift ? entry.scheduledStartTime! : settings.defaultStartTime);
  let schedEnd = parseToMinutes(entry.isCustomShift ? entry.scheduledEndTime! : settings.defaultEndTime);
  let realEnd = parseToMinutes(entry.endTime);
  
  const realStart = parseToMinutes(entry.startTime);
  if (realEnd < realStart) realEnd += 1440;
  if (schedEnd < schedStart) schedEnd += 1440;

  const diff = realEnd - schedEnd;
  
  if (diff >= (settings.otThresholdMinutes || 0)) {
    return Math.max(0, diff);
  }
  
  return 0;
};

export const calculateEarnings = (entry: TimeEntry, settings: AppSettings): number => {
  // Earnings always use rounded hours if enabled
  const hours = calculateWorkHours(entry, settings, true);
  const baseRate = entry.hourlyRate ?? settings.hourlyRate;
  
  if (entry.isHoliday && entry.holidayWorked) {
    return hours * (baseRate * (settings.holidayRateMultiplier || 1));
  }
  
  return hours * baseRate;
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