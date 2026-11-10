/**
 * JALORA — Indonesian Date & Time Utilities
 * Accurate day calculation with Asia/Jakarta (WIB) timezone
 * Created by Abdul Jalil
 */

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format timestamp into standard Indonesian date-time with Day name:
 * Example: "Minggu, 1 November 2026, 07.11.25 WIB"
 */
export function formatIndonesianDateTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    // Format using Intl DateTimeFormat with Asia/Jakarta timezone
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach(p => {
      map[p.type] = p.value;
    });

    // Fallbacks in case parts are not fully filled by runtime
    const weekday = map.weekday || INDONESIAN_DAYS[d.getDay()];
    const day = map.day || String(d.getDate());
    const month = map.month || INDONESIAN_MONTHS[d.getMonth()];
    const year = map.year || String(d.getFullYear());
    const hour = map.hour || String(d.getHours()).padStart(2, '0');
    const minute = map.minute || String(d.getMinutes()).padStart(2, '0');
    const second = map.second || String(d.getSeconds()).padStart(2, '0');

    return `${weekday}, ${day} ${month} ${year}, ${hour}.${minute}.${second} WIB`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Format timestamp into Indonesian date only with Day name:
 * Example: "Minggu, 1 November 2026"
 */
export function formatIndonesianDateOnly(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach(p => {
      map[p.type] = p.value;
    });

    const weekday = map.weekday || INDONESIAN_DAYS[d.getDay()];
    const day = map.day || String(d.getDate());
    const month = map.month || INDONESIAN_MONTHS[d.getMonth()];
    const year = map.year || String(d.getFullYear());

    return `${weekday}, ${day} ${month} ${year}`;
  } catch {
    return String(dateStr);
  }
}
