import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BackButton from '../components/BackButton';

export default function AktMenyuScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Təhvil təslim aktı</Text>
      </View>

      <Pressable
        style={[styles.card, styles.cardBlue]}
        onPress={() => router.push('/akt-novu')}
      >
        <View style={[styles.iconBox, { backgroundColor: '#185FA5' }]}>
          <Ionicons name="document-text-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: '#0C447C' }]}>Yeni akt yarat</Text>
          <Text style={[styles.cardSub, { color: '#0C447C' }]}>Yeni təhvil təslim aktı hazırla</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0C447C" />
      </Pressable>

      <Pressable
        style={[styles.card, styles.cardGreen]}
        onPress={() => router.push('/aktlar')}
      >
        <View style={[styles.iconBox, { backgroundColor: '#3B6D11' }]}>
          <Ionicons name="list-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: '#27500A' }]}>Aktlar</Text>
          <Text style={[styles.cardSub, { color: '#27500A' }]}>Yaddaşa verilmiş aktlar</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#27500A" />
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
  cardBlue: { backgroundColor: '#E6F1FB', borderColor: '#85B7EB' },
  cardGreen: { backgroundColor: '#EAF3DE', borderColor: '#97C459' },
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