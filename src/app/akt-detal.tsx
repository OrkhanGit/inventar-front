import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Act, isoToDisplay } from '../api';
import BackButton from '../components/BackButton';
import { ActPrintData } from '../utils/actHtml';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function AktDetalScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const act: Act = useMemo(() => JSON.parse(String(data)), [data]);

  // Köhnə aktı yenidən çap etmək: yaddaşa yazmır, yalnız önizləməni açır
  const handlePrint = () => {
    const printData: ActPrintData = {
      sourceLocation: act.sourceLocation,
      fromLocation: act.fromLocation,
      date: isoToDisplay(act.date),
      description: act.description,
      fromUser: act.fromUser,
      toUser: act.toUser,
      items: act.items.map((i) => ({
        barcode: i.barcode,
        name: i.name,
        count: String(i.count),
      })),
    };
    router.push({ pathname: '/onizleme', params: { data: JSON.stringify(printData) } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Akt məlumatları</Text>
        <Pressable style={styles.printBtn} onPress={handlePrint}>
          <Ionicons name="print-outline" size={18} color="#FFFFFF" />
          <Text style={styles.printText}>Çap et</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.box}>
          <InfoRow label="Sənəd nömrəsi" value={act.actNumber} />
          <InfoRow label="Təhvil vaxtı" value={isoToDisplay(act.date)} />
          <InfoRow label="Aid olduğu yer" value={act.sourceLocation} />
          <InfoRow label="Təhvil veriləcək yer" value={act.fromLocation} />
          <InfoRow label="Təhvil verən" value={act.fromUser} />
          <InfoRow label="Təhvil alan" value={act.toUser} />
          <InfoRow label="Qeyd" value={act.description} />
        </View>

        <Text style={styles.section}>Avadanlıqlar ({act.items.length})</Text>
        {act.items.map((it, idx) => (
          <View key={`${it.barcode}-${idx}`} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={styles.itemBarcode}>Barkod: {it.barcode || '—'}</Text>
            </View>
            <Text style={styles.itemCount}>× {it.count}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 64 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  printBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#185FA5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  printText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  box: {
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDE6',
  },
  infoLabel: { fontSize: 12, color: '#6B6B66', marginBottom: 3 },
  infoValue: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  section: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemName: { fontSize: 15, fontWeight: '500', color: '#1A1A1A', marginBottom: 2 },
  itemBarcode: { fontSize: 12, color: '#6B6B66' },
  itemCount: { fontSize: 16, fontWeight: '600', color: '#185FA5' },
});