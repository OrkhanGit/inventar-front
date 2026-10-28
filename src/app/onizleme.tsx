import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import BackButton from '../components/BackButton';
import { ActPrintData, buildActHtml } from '../utils/actHtml';

export default function OnizlemeScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();

  const html = useMemo(() => {
    const act: ActPrintData = JSON.parse(String(data));
    return buildActHtml(act);
  }, [data]);

  // PDF yaradir va paylasma penceresini acir. Orada HP Smart secilir.
  const handlePrint = async () => {
    try {
            // 595x842 = A4 (pt). Evvelki chap ile eyni olchu
      const { uri } = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Xəta', 'Bu cihazda paylaşma dəstəklənmir.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'HP Smart ilə çap et',
      });
    } catch (e: any) {
      Alert.alert('Xəta', 'Çap zamanı xəta baş verdi.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Akt önizləməsi</Text>
      </View>

      <WebView
        style={styles.web}
        originWhitelist={['*']}
        source={{ html }}
        scalesPageToFit
      />

      <View style={styles.bottom}>
        <Pressable style={styles.printBtn} onPress={handlePrint}>
          <Ionicons name="print-outline" size={20} color="#FFFFFF" />
          <Text style={styles.printText}>Çap et</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  web: { flex: 1, backgroundColor: '#F4F3EE' },
  bottom: { padding: 16, paddingBottom: 32, backgroundColor: '#FFFFFF' },
  printBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#185FA5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  printText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});