import { BASE_URL, ENDPOINTS } from './config';

// Backend-dəki ProductServiceDto
export type ServiceProduct = {
  barcode: string;
  name: string;
  count: number | null;
  owner: string | null; // kim tərəfindən verilib (auth qoşulandan sonra dolacaq)
  entryDate: string | number[] | null; // "2026-10-25T14:30:00" və ya [2026,10,25,14,30]
  description: string | null;
};

// Servis şablonları: backend bu sözə görə yer üzrə axtarır
export const SERVICE_TEMPLATES: Record<string, string> = {
  skaner: 'Skaner_MMC',
  soliton: 'Soliton_LTD_MMC',
};

export async function getServiceProducts(service: string): Promise<ServiceProduct[]> {
  const res = await fetch(
    `${BASE_URL}${ENDPOINTS.serviceProducts}?service=${encodeURIComponent(service)}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text) return [];
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}