import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProductItem } from '../api';
import { EntryDate, getEntryDates } from '../api/entryDatesApi';
import BackButton from '../components/BackButton';
import { PRODUCT_FIELDS } from '../constants/productFields';

// "serialNumber" -> "Serial Number"
const humanize = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const labelOf = (key: string) =>
  PRODUCT_FIELDS.find((f) => f.key === key)?.label ?? humanize(key);

const pad = (n: number) => String(n).padStart(2, '0');

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Bəli' : 'Xeyr';
  // Tarix: [2026,10,25,14,30] və ya "2026-10-25T14:30:00"
  if (Array.isArray(v) && v.length >= 3 && typeof v[0] === 'number' && v[0] > 1900) {
    const [y, mo, d, h = 0, mi = 0] = v as number[];
    return `${pad(d)}.${pad(mo)}.${y} ${pad(h)}:${pad(mi)}`;
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const [datePart, timePart = ''] = v.split('T');
    const [y, mo, d] = datePart.split('-');
    return `${d}.${mo}.${y} ${timePart.slice(0, 5)}`;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export default function AvadanliqDetalScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const item: ProductItem = useMemo(() => JSON.parse(String(data)), [data]);

  const [dates, setDates] = useState<EntryDate[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);
  const [datesError, setDatesError] = useState(false);

  // Məhsulun bütün daxil olma tarixlərini ayrıca yükləyir (siyahı ekranını ağırlaşdırmasın deyə)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getEntryDates(item.barcode);
        if (!cancelled) setDates(list);
      } catch {
        if (!cancelled) setDatesError(true);
      } finally {
        if (!cancelled) setDatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.barcode]);

  // Əvvəl ad və barkod, sonra API-dən gələn qalan bütün sahələr
  // entryDate gizlədilir, çünki bütün tarixlər aşağıdakı ayrıca qutuda göstərilir
  const rows = useMemo(() => {
    const hidden = new Set(['id', 'name', 'barcode', 'entryDate', 'entryDates']);
    const rest = Object.entries(item.raw ?? {})
      .filter(([k]) => !hidden.has(k))
      .map(([k, v]) => ({ label: labelOf(k), value: formatValue(v) }));
    return [
      { label: labelOf('name'), value: formatValue(item.name) },
      { label: labelOf('barcode'), value: formatValue(item.barcode) },
      ...rest,
    ];
  }, [item]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Avadanlıq məlumatları</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.box}>
          {rows.map((r, i) => (
            <View
              key={`${r.label}-${i}`}
              style={[styles.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.value}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Anbara daxil olma tarixləri: ən son tarix birincidir */}
        <View style={[styles.box, styles.datesBox]}>
          <View style={styles.datesHeader}>
            <Text style={styles.datesTitle}>Daxil olma tarixləri</Text>
            {!datesLoading && !datesError && (
              <Text style={styles.datesCount}>{dates.length} dəfə</Text>
            )}
          </View>

          {datesLoading ? (
            <ActivityIndicator style={{ marginVertical: 14 }} color="#185FA5" />
          ) : datesError ? (
            <Text style={styles.datesInfo}>Tarixlər yüklənmədi. Serverə qoşulmanı yoxlayın.</Text>
          ) : dates.length === 0 ? (
            <Text style={styles.datesInfo}>Tarix qeydi yoxdur</Text>
          ) : (
            dates.map((d, i) => (
              <View
                key={`${formatValue(d)}-${i}`}
                style={[styles.dateRow, i === dates.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.dateText}>{formatValue(d)}</Text>
                {i === 0 && (
                  <View style={styles.lastTag}>
                    <Text style={styles.lastTagText}>Son</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 64 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  box: {
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDE6',
  },
  label: { fontSize: 12, color: '#6B6B66', marginBottom: 3 },
  value: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },

  datesBox: { marginTop: 14 },
  datesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDE6',
  },
  datesTitle: { fontSize: 12, color: '#6B6B66' },
  datesCount: { fontSize: 12, fontWeight: '600', color: '#0C447C' },
  datesInfo: { fontSize: 13, color: '#6B6B66', paddingVertical: 14 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDE6',
  },
  dateText: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  lastTag: {
    backgroundColor: '#EAF3DE',
    borderWidth: 1,
    borderColor: '#97C459',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lastTagText: { fontSize: 11, fontWeight: '600', color: '#27500A' },
});