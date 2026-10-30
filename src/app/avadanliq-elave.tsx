import { Ionicons } from '@expo/vector-icons';
import { Fragment, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

// Hazır seçimlər. Gələcəkdə yeni variant lazım olsa, bura əlavə et.
// Açar (key) PRODUCT_FIELDS-dəki field.key ilə eyni olmalıdır.
const PRESETS: Record<string, { title: string; items: string[]; icon: any }> = {
  name: {
    title: 'Avadanlığın adı',
    items: ['X-Printer', 'G-Printer' , 'HP Printer' , 'Tərəzi' , 'Lenovo Monitor' , 'DVR Hikvision' , 'Argo' ,
            'Card Reader' , 'Lenovo PC' , 'Cash Drawer' , 'Diebold Monoblock' , 'IP Telefon Cisco'],
    icon: 'hardware-chip-outline',
  },
  location: {
    title: 'Yerləşdiyi yer',
    items: ['Dərnəgül ofis'],
    icon: 'business-outline',
  },
};

// Avadanlığın vəziyyəti seçimləri (backend-ə "value" gedir)
type Condition = 'YARARLI' | 'YARARSIZ';
const CONDITIONS: { value: Condition; label: string; color: string; bg: string; border: string }[] = [
  { value: 'YARARLI', label: 'Yararlı', color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
  { value: 'YARARSIZ', label: 'Yararsız', color: '#8A1C1C', bg: '#FCEBEB', border: '#E58A8A' },
];

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

  // Avadanlığın vəziyyəti və servisə gedəcək
  const [condition, setCondition] = useState<Condition | null>(null);
  const [toService, setToService] = useState(false);

  // Hazır seçim menyusu (hansı xana üçün açıqdır)
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const openPicker = (key: string) => {
    Keyboard.dismiss();
    setPickerFor(key);
  };

  const pickValue = (value: string) => {
    if (pickerFor) setValue(pickerFor, value);
    setPickerFor(null);
  };

  const pickerConfig = pickerFor ? PRESETS[pickerFor] : null;
  const pickerCurrent = pickerFor ? values[pickerFor] ?? '' : '';

const onScanned = (code: string) => {
  // Qabaqdakı sıfırlar atılır (yalnız sıfırlardan ibarətdirsə '0' qalır)
  const cleaned = code.trim().replace(/^0+(?=.)/, '');
  setValue('barcode', cleaned);
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

    // Vəziyyət seçilməlidir (məcburi olmasını istəmirsənsə, bu bloku sil)
    if (!condition) {
      Alert.alert('Diqqət', '"Avadanlığın vəziyyəti" seçin.');
      return;
    }

    // Backend-ə göndəriləcək məlumat
    const body: Record<string, string | number | boolean> = {};
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

    // Yeni sahələr
    body.condition = condition; // "YARARLI" | "YARARSIZ"
    body.toService = toService; // true | false

    setLoading(true);
    try {
      // Barkod yazılıbsa, eyni barkodun olub-olmadığını yoxla
      if (body.barcode && (await productExists(String(body.barcode)))) {
        Alert.alert('Diqqət', 'Bu barkodla avadanlıq artıq mövcuddur.');
        return;
      }
      await createProduct(body);
      setValues({});
      setCondition(null);
      setToService(false);
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

        {PRODUCT_FIELDS.map((f) => {
          const hasPreset = !!PRESETS[f.key];
          return (
            <Fragment key={f.key}>
              <View>
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
                    {hasPreset && (
                      <Pressable
                        style={styles.dropBtn}
                        onPress={() => openPicker(f.key)}
                        hitSlop={8}
                      >
                        <Ionicons name="chevron-down" size={20} color="#0C447C" />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              {/* "Avadanlığın adı"ndan sonra: vəziyyət + servisə gedəcək */}
              {f.key === 'name' && (
                <View>
                  <Text style={styles.label}>Avadanlığın vəziyyəti *</Text>
                  <View style={styles.conditionRow}>
                    {CONDITIONS.map((c) => {
                      const selected = condition === c.value;
                      return (
                        <Pressable
                          key={c.value}
                          style={[
                            styles.conditionItem,
                            selected && { backgroundColor: c.bg, borderColor: c.border },
                          ]}
                          onPress={() => setCondition(c.value)}
                        >
                          <View
                            style={[
                              styles.radioOuter,
                              selected && { borderColor: c.color },
                            ]}
                          >
                            {selected && (
                              <View style={[styles.radioInner, { backgroundColor: c.color }]} />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.conditionText,
                              selected && { color: c.color },
                            ]}
                          >
                            {c.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    style={[styles.serviceRow, toService && styles.serviceRowActive]}
                    onPress={() => setToService((p) => !p)}
                  >
                    <View style={[styles.checkBox, toService && styles.checkBoxActive]}>
                      {toService && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.serviceText, toService && styles.serviceTextActive]}>
                      Servisə gedəcək
                    </Text>
                  </Pressable>
                </View>
              )}
            </Fragment>
          );
        })}

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

      {/* Hazır seçim menyusu */}
      <Modal
        visible={pickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerFor(null)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <Text style={styles.pickerTitle}>{pickerConfig?.title ?? ''}</Text>
            <ScrollView style={styles.pickerList} contentContainerStyle={{ gap: 8 }}>
              {(pickerConfig?.items ?? []).map((name) => {
                const selected = pickerCurrent === name;
                return (
                  <Pressable
                    key={name}
                    style={[styles.pickerItem, selected && styles.pickerItemActive]}
                    onPress={() => pickValue(name)}
                  >
                    <Ionicons
                      name={pickerConfig?.icon ?? 'create-outline'}
                      size={18}
                      color={selected ? '#27500A' : '#0C447C'}
                    />
                    <Text
                      style={[styles.pickerItemText, selected && styles.pickerItemTextActive]}
                    >
                      {name}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color="#27500A" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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

  // Vəziyyət (yumru seçim)
  conditionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  conditionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#B4B2A9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  conditionText: { fontSize: 15, fontWeight: '600', color: '#6B6B66' },

  // Servisə gedəcək (kvadrat xana)
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  serviceRowActive: { backgroundColor: '#E6F1FB', borderColor: '#85B7EB' },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#B4B2A9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkBoxActive: { backgroundColor: '#185FA5', borderColor: '#185FA5' },
  serviceText: { fontSize: 15, fontWeight: '600', color: '#6B6B66' },
  serviceTextActive: { color: '#0C447C' },

  // Hazır seçim menyusu (tehvil ekranı ilə eyni dizayn)
  dropBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E6F1FB',
    borderWidth: 1,
    borderColor: '#85B7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  pickerTitle: { fontSize: 13, color: '#6B6B66', marginBottom: 4, paddingHorizontal: 4 },
  pickerList: { maxHeight: 300 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#85B7EB',
    backgroundColor: '#E6F1FB',
    paddingHorizontal: 14,
  },
  pickerItemActive: { backgroundColor: '#EAF3DE', borderColor: '#97C459' },
  pickerItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0C447C' },
  pickerItemTextActive: { color: '#27500A' },

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