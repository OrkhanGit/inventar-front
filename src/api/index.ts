import { BASE_URL, ENDPOINTS } from './config';

// Backend-dəki ActDto strukturuna uyğun tam siyahı tipi
export type ActPayload = {
  actNumber: string;
  location: string;
  toLocation: string;
  barcode: string[];
  name: string[];
  count: number[];
  date: string; // 2026-10-25T14:30:00
  description: string;
  fromUser: string;
  toUser: string;
   condition?: (string | null)[]; // hər avadanlıq üçün "YARARLI" | "YARARSIZ" | null
  toService?: boolean[]; // hər avadanlıq üçün true | false
};

// Köhnə kodlar xəta verməsin deyə bu tip saxlanılıb (əgər başqa yerdə işlənmirsə silə də bilərsən)
export type ActRecord = {
  actNumber: string;
  sourceLocation: string;
  fromLocation: string;
  barcode: string;
  name: string;
  count: number;
  date: string;
  description: string;
  fromUser: string;
  toUser: string;
};

// Bir akt = eyni actNumber + eyni date olan sətirlər
export type Act = {
  key: string;
  actNumber: string;
  date: string;
  sourceLocation: string;
  fromLocation: string;
  description: string;
  fromUser: string;
  toUser: string;
  items: { barcode: string; name: string; count: number }[];
};

// Backend-dən gələn akt. barcode/name/count yeni formatda massivdir,
// köhnə yazılar isə tək dəyər ola bilər — hər ikisi dəstəklənir.
type ServerAct = {
  actNumber?: string | null;
  location?: string | null;
  toLocation?: string | null;
  barcode?: string | string[] | null;
  name?: string | string[] | null;
  count?: number | number[] | null;
  date?: string | number[] | null;
  description?: string | null;
  fromUser?: string | null;
  toUser?: string | null;
  condition?: string | string[] | null;
  toService?: boolean | boolean[] | null;
};

const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message || `Server xətası: ${status}`);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE_URL + path, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      // Backend-in mesajını (məs. ConflictException) oxuyuruq
      let message: string | undefined;
      try {
        const body = await res.text();
        if (body) {
          try {
            const json = JSON.parse(body);
            message =
              (typeof json === 'string' ? json : json?.message || json?.error) || undefined;
          } catch {
            message = body;
          }
        }
      } catch {
        // body oxunmadı — standart mesaj istifadə olunacaq
      }
      throw new ApiError(res.status, message);
    }

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Tarix köməkçiləri ----------
const pad = (n: number) => String(n).padStart(2, '0');

function normalizeDate(d: unknown): string {
  if (Array.isArray(d)) {
    const [y, mo, da, h = 0, mi = 0, s = 0] = d as number[];
    return `${y}-${pad(mo)}-${pad(da)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
  }
  return String(d ?? '');
}

export function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [datePart] = iso.split('T');
  const [y, m, d] = datePart.split('-');
  return `${d}.${m}.${y}`;
}

// ---------- Aktlar ----------
function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function groupActs(records: ServerAct[]): Act[] {
  const map = new Map<string, Act>();
  for (const r of records) {
    const actNumber = String(r.actNumber ?? '').trim();
    const date = normalizeDate(r.date);
    const key = `${actNumber}|${date}`;
    let act = map.get(key);
    if (!act) {
      act = {
        key,
        actNumber,
        date,
        sourceLocation: r.location || actNumber,
        fromLocation: r.toLocation ?? '',
        description: r.description ?? '',
        fromUser: r.fromUser ?? '',
        toUser: r.toUser ?? '',
        items: [],
      };
      map.set(key, act);
    }

    const barcodes = toArray(r.barcode);
    const names = toArray(r.name);
    const counts = toArray(r.count);
    const len = Math.max(barcodes.length, names.length, counts.length);

    for (let i = 0; i < len; i++) {
      act.items.push({
        barcode: String(barcodes[i] ?? ''),
        name: String(names[i] ?? ''),
        count: Number(counts[i] ?? 0),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
}

export async function getAllActs(): Promise<Act[]> {
  const list = await request<ServerAct[]>(ENDPOINTS.getAllActs);
  return groupActs(list ?? []);
}

export type ActMode = 'receive' | 'send';

let productsCache: ProductItem[] | null = null;

// Bütün siyahını tək bir POST sorğusu ilə backend-ə göndəririk
export async function saveAct(actData: ActPayload, mode: ActMode): Promise<void> {
  const endpoint = mode === 'receive' ? ENDPOINTS.receiveProduct : ENDPOINTS.sentProduct;

  await request(endpoint, {
    method: 'POST',
    body: JSON.stringify(actData),
  });

  // Məhsulların yeri/statusu dəyişdi — keş köhnəlib
  productsCache = null;
}

// ---------- Avadanlıqlar (product) ----------
export type ProductItem = {
  barcode: string;
  name: string;
  raw: Record<string, unknown>;
};

// force = true: həmişə serverdən təzə data çəkir (keş köhnə data göstərməsin deyə).
// Keşdən istifadə etmək üçün çağıranda getAllProducts(false) yaz.
export async function getAllProducts(force = true): Promise<ProductItem[]> {
  if (productsCache && !force) return productsCache;
  const list = (await request<Record<string, unknown>[]>(ENDPOINTS.allProducts)) ?? [];
  productsCache = list.map((raw) => ({
    barcode: String(raw.barcode ?? '').trim(),
    name: String(raw.name ?? '').trim(),
    raw,
  }));
  return productsCache;
}

const norm = (s: string) => s.trim().replace(/^0+/, '');

// Backend-dən barkodla tək məhsul (statusdan asılı olmayaraq: ACTIVE və INACTIVE)
async function fetchByBarcode(code: string): Promise<ProductItem | null> {
  try {
    const raw = await request<Record<string, unknown>>(
      `${ENDPOINTS.productByBarcode}?barcode=${encodeURIComponent(code)}`
    );
    if (!raw) return null;
    return {
      barcode: String(raw.barcode ?? '').trim(),
      name: String(raw.name ?? '').trim(),
      raw,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null; // bazada yoxdur
    throw e;
  }
}

export async function findProductByBarcode(barcode: string): Promise<ProductItem | null> {
  const original = barcode.trim();
  if (!original) return null;

  // 1) olduğu kimi axtar
  const found = await fetchByBarcode(original);
  if (found) return found;

  // 2) başındakı sıfırları atıb yenidən yoxla (köhnə norm() davranışı)
  const stripped = norm(original);
  if (stripped && stripped !== original) {
    return await fetchByBarcode(stripped);
  }
  return null;
}

export async function productExists(barcode: string): Promise<boolean> {
  const code = norm(barcode);
  if (!code) return false;
  const list = await getAllProducts(true);
  return list.some((p) => p.barcode && norm(p.barcode) === code);
}

export async function findActiveBarcodes(barcodes: string[]): Promise<string[]> {
  const list = await getAllProducts(true);
  const found: string[] = [];
  for (const b of barcodes) {
    const code = norm(b);
    if (!code) continue;
    const exists = list.some((p) => {
      if (!p.barcode || norm(p.barcode) !== code) return false;
      const st = p.raw.status;
      return st === undefined || st === null || String(st).toUpperCase() === 'ACTIVE';
    });
    if (exists) found.push(b.trim());
  }
  return found;
}

export async function createProduct(body: Record<string, string | number | boolean>): Promise<void> {
  await request(ENDPOINTS.createProduct, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  productsCache = null;
}