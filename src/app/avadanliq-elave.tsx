import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { createProduct, productExists } from '../api';
import BackButton from '../components/BackButton';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import Toast from '../components/Toast';
import { PRODUCT_FIELDS } from '../constants/productFields';

const pad = (n: number) => String(n).padStart(2, '0');

const todayDisplay = () => {
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

// Java LocalDateTime üçün: 2026-10-25T14:30:00
const nowIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function AvadanliqElaveScreen() {
  const scrollRef = useRef<any>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const onScanned = (code: string) => {
    setValue('barcode', code);
    setScannerOpen(false);
  };

  const handleSave = async () => {
    // Yoxlama
    for (const f of PRODUCT_FIELDS) {
      if (f.auto) continue;
      const v = (values[f.key] ?? '').trim();
      if (f.required && !v) {
        Alert.alert('Diqqət', `"${f.label}" xanasını doldurun.`);
        return;
      }
      if (f.type === 'integer' && v && (!/^\d+$/.test(v) || Number(v) < 1)) {
        Alert.alert('Diqqət', `"${f.label}" 1 və ya daha böyük tam ədəd olmalıdır.`);
        return;
      }
      if (f.type === 'number' && v && isNaN(Number(v.replace(',', '.')))) {
        Alert.alert('Diqqət', `"${f.label}" rəqəm olmalıdır.`);
        return;
      }
    }

    // Backend-ə göndəriləcək məlumat
    const body: Record<string, string | number> = {};
    for (const f of PRODUCT_FIELDS) {
      if (f.auto === 'now') {
        body[f.key] = nowIso();
        continue;
      }
      const v = (values[f.key] ?? '').trim();
      if (!v) continue;
      if (f.type === 'integer') body[f.key] = parseInt(v, 10);
      else if (f.type === 'number') body[f.key] = Number(v.replace(',', '.'));
      else body[f.key] = v;
    }

    setLoading(true);
    try {
      // Barkod yazılıbsa, eyni barkodun olub-olmadığını yoxla
      if (body.barcode && (await productExists(String(body.barcode)))) {
        Alert.alert('Diqqət', 'Bu barkodla avadanlıq artıq mövcuddur.');
        return;
      }
      await createProduct(body);
      setValues({});
      setToast('Avadanlıq yaddaşa verildi');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch {
      Alert.alert('Xəta', 'Avadanlıq yaddaşa yazılmadı. Serverə qoşulmanı yoxlayın.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.title}>Avadanlıq əlavə et</Text>
        </View>

        {PRODUCT_FIELDS.map((f) => (
          <View key={f.key}>
            <Text style={styles.label}>
              {f.label}
              {f.required ? ' *' : ''}
            </Text>

            {f.auto ? (
              <View style={[styles.field, styles.fieldReadonly]}>
                <Ionicons name={f.icon ?? 'create-outline'} size={19} color="#8A8A85" />
                <Text style={styles.readonlyText}>{todayDisplay()}</Text>
              </View>
            ) : (
              <View style={[styles.field, f.multiline && styles.fieldMulti]}>
                <Ionicons name={f.icon ?? 'create-outline'} size={19} color="#8A8A85" />
                <TextInput
                  style={[styles.input, f.multiline && styles.inputMulti]}
                  placeholder={f.label}
                  placeholderTextColor="#8A8A85"
                  value={values[f.key] ?? ''}
                  onChangeText={(v) => setValue(f.key, v)}
                  keyboardType={
                    f.type === 'integer'
                      ? 'number-pad'
                      : f.type === 'number'
                        ? 'decimal-pad'
                        : 'default'
                  }
                  multiline={f.multiline}
                  textAlignVertical={f.multiline ? 'top' : 'center'}
                  autoCapitalize={f.scan ? 'none' : 'sentences'}
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                />
                {f.scan && (
                  <Pressable style={styles.scanBtn} onPress={() => setScannerOpen(true)}>
                    <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        ))}

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={19} color="#FFFFFF" />
              <Text style={styles.saveText}>Yaddaşa ver</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={onScanned}
      />
      <Toast message={toast} onHide={() => setToast('')} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  label: { fontSize: 12, color: '#6B6B66', marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  fieldReadonly: { backgroundColor: '#F4F3EE' },
  readonlyText: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  fieldMulti: { height: 100, alignItems: 'flex-start', paddingTop: 12 },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#1A1A1A' },
  inputMulti: { paddingTop: 0 },
  scanBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#185FA5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#185FA5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});