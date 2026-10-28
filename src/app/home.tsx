import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  // Login səhifəsinə (index.tsx) keçir. replace istifadə olunur ki, geri qayıdanda home açılmasın
  const handleExit = () => {
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Xoş gəldiniz</Text>
          <Text style={styles.name}>Ad Soyad</Text>
        </View>

        <Pressable style={styles.exitBtn} onPress={handleExit} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
        </Pressable>
      </View>

      <View style={styles.grid}>
        <Pressable
          style={[styles.tile, styles.tileBlue]}
          onPress={() => router.push('/akt-menyu')}
        >
          <Ionicons name="document-text-outline" size={42} color="#0C447C" />
          <Text style={[styles.tileText, { color: '#0C447C' }]}>Təhvil təslim aktı</Text>
        </Pressable>

        <Pressable
          style={[styles.tile, styles.tileGreen]}
          onPress={() => router.push('/avadanliq')}
        >
          <Ionicons name="laptop-outline" size={42} color="#27500A" />
          <Text style={[styles.tileText, { color: '#27500A' }]}>Depoda olan avadanlıqlar</Text>
        </Pressable>
      </View>

      {/* İkinci sıra: boş View üçüncü kvadratın digərləri ilə eyni ölçüdə qalmasını təmin edir */}
      <View style={[styles.grid, { marginTop: 14 }]}>
        <Pressable
          style={[styles.tile, styles.tileAmber]}
          onPress={() => router.push('/servis')}
        >
          <Ionicons name="construct-outline" size={42} color="#633806" />
          <Text style={[styles.tileText, { color: '#633806' }]}>Servisdə olan avadanlıqlar</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  hello: { fontSize: 14, color: '#6B6B66' },
  name: { fontSize: 24, fontWeight: '600', color: '#1A1A1A' },
  exitBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FCEBEB',
    borderWidth: 1,
    borderColor: '#F7C1C1',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  tileAmber: { backgroundColor: '#FAEEDA', borderColor: '#EF9F27' },
  tileText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});