import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BackButton from '../components/BackButton';

export default function AktNovuScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Yeni akt yarat</Text>
      </View>

      <View style={styles.grid}>
        <Pressable
          style={[styles.tile, styles.tileGreen]}
          onPress={() => router.push({ pathname: '/tehvil', params: { mode: 'receive' } })}
        >
          <Ionicons name="download-outline" size={42} color="#27500A" />
          <Text style={[styles.tileText, { color: '#27500A' }]}>Avadanlıq qəbul akti</Text>
        </Pressable>

        <Pressable
          style={[styles.tile, styles.tileBlue]}
          onPress={() => router.push({ pathname: '/tehvil', params: { mode: 'send' } })}
        >
          <Ionicons name="share-outline" size={42} color="#0C447C" />
          <Text style={[styles.tileText, { color: '#0C447C' }]}>Avadanlıq təhvil akti</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 64 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
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