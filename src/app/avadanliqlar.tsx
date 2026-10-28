import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ProductItem, getAllProducts } from '../api';
import { SERVICE_TEMPLATES, getServiceProducts } from '../api/servisApi';
import BackButton from '../components/BackButton';

export default function AvadanliqlarScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [serviceCount, setServiceCount] = useState<number | null>(null);

  // Servisdə olan avadanlıqların sayı: Skaner MMC + Soliton LTD MMC cəmi
  // Xəta olsa, qırmızı yazı sadəcə göstərilmir
  const loadServiceCount = async () => {
    try {
      const lists = await Promise.all(
        Object.values(SERVICE_TEMPLATES).map((t) => getServiceProducts(t))
      );
      setServiceCount(lists.reduce((sum, l) => sum + l.length, 0));
    } catch {
      setServiceCount(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setAll(await getAllProducts(true));
    } catch {
      setError(true);
      setAll([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadServiceCount();
    try {
      setAll(await getAllProducts(true));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    loadServiceCount();
  }, []);

  // Yazılan rəqəmlər barkodun içində keçən avadanlıqları göstərir
  const items = useMemo(() => {
    const q = query.trim();
    return q ? all.filter((p) => p.barcode.includes(q)) : all;
  }, [all, query]);

  // Eyni adlı avadanlıqları qruplaşdırır, sayları toplayır (məs. Printer (10))
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const p of items) {
      const name = (p.name ?? '').trim() || 'Adsız';
      const key = name.toLocaleLowerCase('az');
      const n = Number((p.raw as any)?.count);
      const add = n > 0 ? n : 1;
      const g = map.get(key);
      if (g) g.total += add;
      else map.set(key, { name, total: add });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.total - a.total || a.name.localeCompare(b.name)
    );
  }, [items]);

  const openItem = (item: ProductItem) => {
    router.push({ pathname: '/avadanliq-detal', params: { data: JSON.stringify(item) } });
  };

  const emptyText = error
    ? 'Avadanlıqlar yüklənmədi. Serverə qoşulmanı yoxlayın.'
    : query.trim()
      ? 'Bu barkodla avadanlıq tapılmadı'
      : 'Hələ avadanlıq əlavə olunmayıb';

  const listHeader =
    items.length > 0 ? (
      <View style={styles.headerBox}>
        <View style={styles.countRow}>
          <Text style={[styles.count, { marginBottom: 0 }]}>
            {query.trim()
              ? `${items.length} avadanlıq tapıldı`
              : `Bütün avadanlıqlar (${items.length})`}
          </Text>
          {!query.trim() && serviceCount !== null && (
            <Text style={styles.countService}>Servisdə olan avadanlıqlar ({serviceCount})</Text>
          )}
        </View>
        {groups.map((g) => (
          <Text key={g.name} style={[styles.count, { marginBottom: 2 }]}>
            {g.name} ({g.total})
          </Text>
        ))}
      </View>
    ) : undefined;

  const listEmpty = (
    <View style={styles.empty}>
      <Ionicons
        name={error ? 'cloud-offline-outline' : 'search-outline'}
        size={36}
        color="#B4B2A9"
      />
      <Text style={styles.emptyText}>{emptyText}</Text>
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
        <Text style={styles.title}>Avadanlıqlar</Text>
      </View>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color="#8A8A85" />
        <TextInput
          style={styles.searchInput}
          placeholder="Barkod ilə axtar"
          placeholderTextColor="#8A8A85"
          value={query}
          onChangeText={setQuery}
          keyboardType="number-pad"
          autoCorrect={false}
          underlineColorAndroid="transparent"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={19} color="#8A8A85" />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#185FA5" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p, i) => `${p.barcode}-${i}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openItem(item)}>
              <View style={styles.cardIcon}>
                <Ionicons name="laptop-outline" size={20} color="#27500A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name || '—'}
                </Text>
                <Text style={styles.cardBarcode}>{item.barcode || 'Barkod yoxdur'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B4B2A9" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 64 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#1A1A1A' },
  headerBox: { marginBottom: 10 },
  count: { fontSize: 12, color: '#6B6B66', marginBottom: 10 },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: 12,
    marginBottom: 4,
  },
  countService: { fontSize: 12, color: '#D32F2F' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EAF3DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  cardBarcode: { fontSize: 12, color: '#6B6B66' },
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