import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BackButton from '../components/BackButton';

export default function AvadanliqMenuScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Avadanlıqlar</Text>
      </View>

      <Pressable
        style={[styles.card, styles.cardGreen]}
        onPress={() => router.push('/avadanliq-elave')}
      >
        <View style={[styles.iconBox, { backgroundColor: '#3B6D11' }]}>
          <Ionicons name="laptop-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: '#27500A' }]}>Avadanlıq əlavə et</Text>
          <Text style={[styles.cardSub, { color: '#27500A' }]}>Yeni avadanlıq qeydiyyatdan keçir</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#27500A" />
      </Pressable>

      <Pressable
        style={[styles.card, styles.cardBlue]}
        onPress={() => router.push('/avadanliqlar')}
      >
        <View style={[styles.iconBox, { backgroundColor: '#185FA5' }]}>
          <Ionicons name="list-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: '#0C447C' }]}>Avadanlıqlara bax</Text>
          <Text style={[styles.cardSub, { color: '#0C447C' }]}>Bütün avadanlıqlar</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0C447C" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 64 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  cardGreen: { backgroundColor: '#EAF3DE', borderColor: '#97C459' },
  cardBlue: { backgroundColor: '#E6F1FB', borderColor: '#85B7EB' },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardSub: { fontSize: 12, opacity: 0.8 },
});