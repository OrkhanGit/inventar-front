import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BackButton from '../components/BackButton';

// Servisdə olan avadanlıqlar: 1-ci addım. Şirkət seçilir, sonra /servis-sirket açılır
export default function ServisScreen() {
  const router = useRouter();

  const openCompany = (company: 'skaner' | 'soliton') => {
    router.push({ pathname: '/servis-sirket', params: { company } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Servisdə olan avadanlıqlar</Text>
      </View>

      <View style={styles.grid}>
        <Pressable
          style={[styles.tile, styles.tileBlue]}
          onPress={() => openCompany('skaner')}
        >
          <Ionicons name="business-outline" size={42} color="#0C447C" />
          <Text style={[styles.tileText, { color: '#0C447C' }]}>Skaner MMC</Text>
        </Pressable>

        <Pressable
          style={[styles.tile, styles.tileGreen]}
          onPress={() => openCompany('soliton')}
        >
          <Ionicons name="business-outline" size={42} color="#27500A" />
          <Text style={[styles.tileText, { color: '#27500A' }]}>Soliton LTD MMC</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  grid: { flexDirection: 'row', gap: 14 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 10,
  },
  tileBlue: { backgroundColor: '#E6F1FB', borderColor: '#85B7EB' },
  tileGreen: { backgroundColor: '#EAF3DE', borderColor: '#97C459' },
  tileText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});