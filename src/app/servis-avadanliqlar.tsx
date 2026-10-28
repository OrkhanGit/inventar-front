import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SERVICE_TEMPLATES, ServiceProduct, getServiceProducts } from '../api/servisApi';
import BackButton from '../components/BackButton';

const COMPANY_NAMES: Record<string, string> = {
  skaner: 'Skaner MMC',
  soliton: 'Soliton LTD MMC',
};

const pad = (n: number) => String(n).padStart(2, '0');

// Tarix: [2026,10,25,14,30] və ya "2026-10-25T14:30:00" -> 25.10.2026 14:30
const formatDate = (v: ServiceProduct['entryDate']): string => {
  if (!v) return '—';
  if (Array.isArray(v) && v.length >= 3) {
    const [y, mo, d, h = 0, mi = 0] = v;
    return `${pad(d)}.${pad(mo)}.${y} ${pad(h)}:${pad(mi)}`;
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [datePart, timePart = ''] = v.split('T');
    const [y, mo, d] = datePart.split('-');
    return `${d}.${mo}.${y}${timePart ? ' ' + timePart.slice(0, 5) : ''}`;
  }
  return String(v);
};

const show = (v: unknown) =>
  v === null || v === undefined || String(v).trim() === '' ? '—' : String(v);

// Balaca düzbucaqlı xana: üstdə ad, altda dəyər
function InfoBox({ label, value, grow = 1 }: { label: string; value: string; grow?: number }) {
  return (
    <View style={[styles.box, { flex: grow }]}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={styles.boxValue}>{value}</Text>
    </View>
  );
}

export default function ServisAvadanliqlarScreen() {
  const { company } = useLocalSearchParams<{ company?: string }>();
  const key = String(company);
  const companyName = COMPANY_NAMES[key] ?? 'Servis';
  const template = SERVICE_TEMPLATES[key] ?? '';

  const [items, setItems] = useState<ServiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await getServiceProducts(template));
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setItems(await getServiceProducts(template));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const listHeader =
    items.length > 0 ? (
      <Text style={styles.count}>Bütün avadanlıqlar ({items.length})</Text>
    ) : undefined;

  const listEmpty = (
    <View style={styles.empty}>
      <Ionicons
        name={error ? 'cloud-offline-outline' : 'search-outline'}
        size={36}
        color="#B4B2A9"
      />
      <Text style={styles.emptyText}>
        {error
          ? 'Avadanlıqlar yüklənmədi. Serverə qoşulmanı yoxlayın.'
          : 'Bu servisdə avadanlıq yoxdur'}
      </Text>
      {error && (
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Yenidən cəhd et</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{companyName}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#185FA5" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p, i) => `${p.barcode}-${i}`}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <InfoBox label="Avadanlığın adı" value={show(item.name)} />
              <View style={styles.boxRow}>
                <InfoBox label="Barkod" value={show(item.barcode)} grow={2} />
                <InfoBox label="Sayı" value={show(item.count)} grow={1} />
              </View>
              <View style={styles.boxRow}>
                <InfoBox label="Kim tərəfindən verilib" value={show(item.owner)} />
                <InfoBox label="Daxil olma tarixi" value={formatDate(item.entryDate)} />
              </View>
              <InfoBox label="Qeyd" value={show(item.description)} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 64 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  count: { fontSize: 12, color: '#6B6B66', marginBottom: 10 },

  card: {
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
    gap: 6,
  },
  boxRow: { flexDirection: 'row', gap: 6 },
  box: {
    backgroundColor: '#F4F3EE',
    borderWidth: 1,
    borderColor: '#E6E4DC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  boxLabel: { fontSize: 11, color: '#6B6B66', marginBottom: 2 },
  boxValue: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },

  empty: { alignItems: 'center', paddingTop: 50, gap: 10 },
  emptyText: { fontSize: 14, color: '#6B6B66', textAlign: 'center' },
  retry: {
    marginTop: 6,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#185FA5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});