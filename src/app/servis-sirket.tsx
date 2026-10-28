import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import BackButton from '../components/BackButton';

// Servisdə olan avadanlıqlar: 2-ci addım. Skaner MMC və Soliton LTD MMC üçün eyni səhifədir.
// Hansı şirkət olduğu "company" parametrindən gəlir (skaner / soliton)
const COMPANY_NAMES: Record<string, string> = {
  skaner: 'Skaner MMC',
  soliton: 'Soliton LTD MMC',
};

export default function ServisSirketScreen() {
  const router = useRouter();
  const { company } = useLocalSearchParams<{ company?: string }>();
  const companyName = COMPANY_NAMES[String(company)] ?? 'Servis';

  // Sonradan buraya real səhifələrə keçid əlavə olunacaq
  const comingSoon = (what: string) => {
    Alert.alert(what, 'Bu hissəni sonra əlavə edəcəyik.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{companyName}</Text>
      </View>

      <View style={styles.grid}>
        <Pressable
          style={[styles.tile, styles.tileGreen]}
          onPress={() =>
            router.push({ pathname: '/servis-avadanliqlar', params: { company: String(company) } })
          }
        >
          <Ionicons name="laptop-outline" size={42} color="#27500A" />
          <Text style={[styles.tileText, { color: '#27500A' }]}>Avadanlıqlar</Text>
        </Pressable>

        <Pressable
          style={[styles.tile, styles.tileAmber]}
          onPress={() => comingSoon('Ehtiyat hissələri')}
        >
          <Ionicons name="cog-outline" size={42} color="#633806" />
          <Text style={[styles.tileText, { color: '#633806' }]}>Ehtiyat hissələri</Text>
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
  tileGreen: { backgroundColor: '#EAF3DE', borderColor: '#97C459' },
  tileAmber: { backgroundColor: '#FAEEDA', borderColor: '#EF9F27' },
  tileText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});