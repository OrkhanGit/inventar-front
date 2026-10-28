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
import { Act, getAllActs, isoToDisplay } from '../api';
import BackButton from '../components/BackButton';

export default function AktlarScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [allActs, setAllActs] = useState<Act[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setAllActs(await getAllActs());
    } catch {
      setError(true);
      setAllActs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setAllActs(await getAllActs());
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

  // Sənəd nömrəsinə görə süz
  const acts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allActs.filter((a) => a.actNumber.toLowerCase().includes(q)) : allActs;
  }, [allActs, query]);

  const openAct = (act: Act) => {
    router.push({ pathname: '/akt-detal', params: { data: JSON.stringify(act) } });
  };

  const emptyText = error
    ? 'Aktlar yüklənmədi. Serverə qoşulmanı yoxlayın.'
    : query.trim()
      ? 'Bu nömrə ilə akt tapılmadı'
      : 'Hələ yaddaşa verilmiş akt yoxdur';

  const listHeader =
    acts.length > 0 ? (
      <Text style={styles.count}>
        {query.trim() ? `${acts.length} akt tapıldı` : `Bütün aktlar (${acts.length})`}
      </Text>
    ) : undefined;

  const listEmpty = (
    <View style={styles.empty}>
      <Ionicons name={error ? 'cloud-offline-outline' : 'document-outline'} size={36} color="#B4B2A9" />
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
        <Text style={styles.title}>Aktlar</Text>
      </View>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color="#8A8A85" />
        <TextInput
          style={styles.searchInput}
          placeholder="Sənəd nömrəsi ilə axtar"
          placeholderTextColor="#8A8A85"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
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
          data={acts}
          keyExtractor={(a) => a.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openAct(item)}>
              <Text style={styles.cardNo}>№ {item.actNumber}</Text>
              <Text style={styles.cardDate}>{isoToDisplay(item.date)}</Text>
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
  count: { fontSize: 12, color: '#6B6B66', marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  cardNo: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  cardDate: { fontSize: 12, color: '#6B6B66', marginRight: 8 },
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