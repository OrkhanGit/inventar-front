import { BASE_URL, ENDPOINTS } from './config';

// Backend LocalDateTime-ı "2026-10-25T14:30:00" və ya [2026,10,25,14,30] kimi qaytara bilər
export type EntryDate = string | number[];

// Məhsulun anbara bütün daxil olma tarixləri (backend ən yenidən köhnəyə sıralayır)
export async function getEntryDates(barcode: string): Promise<EntryDate[]> {
  const res = await fetch(
    `${BASE_URL}${ENDPOINTS.entryDates}?barcode=${encodeURIComponent(barcode)}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text) return [];
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}