import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
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
import { ActMode, ApiError, findProductByBarcode, saveAct } from '../api';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';
import { ActPrintData } from '../utils/actHtml';

const MAX_ITEMS = 34; // Excel formasında 34 sətir var

// Hazır adlar. Gələcəkdə yeni ad lazım olsa, bura vergüllə əlavə et
const PRESET_NAMES = ['Orxan Məmmədov', 'Abdulla Cəlilov'];
const PRESET_PLACES = ['Skaner_MMC', 'Soliton_LTD_MMC', 'Sumqayit ofis', 'Dərnəgül ofis'];

type PickerTarget = 'giver' | 'receiver' | 'source' | 'dest';

const PICKER_TITLES: Record<PickerTarget, string> = {
  giver: 'Təhvil verən',
  receiver: 'Təhvil alan',
  source: 'Aid olduğu yer',
  dest: 'Təhvil veriləcək yer',
};

type Item = { id: string; barcode: string; name: string; count: string };
type Draft = { barcode: string; name: string; count: string };

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

export default function TehvilScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const actMode: ActMode = mode === 'receive' ? 'receive' : 'send';
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const [items, setItems] = useState<Item[]>([]);
  const [nb, setNb] = useState(''); // barkod
  const [nn, setNn] = useState(''); // ad
  const [nc, setNc] = useState(''); // say (ilkin olaraq boşdur)

  // Redaktə rejimi
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ barcode: '', name: '', count: '' });

  const [sourceLocation, setSourceLocation] = useState(''); // Aid olduğu yer
  const [fromLocation, setFromLocation] = useState(''); // Təhvil veriləcək yer
  const [giver, setGiver] = useState(''); // Təhvil verən (fromUser)
  const [receiver, setReceiver] = useState(''); // Təhvil alan (toUser)
  const [note, setNote] = useState(''); // Qeyd

  // Hazır ad / yer menyusu
  const [pickerFor, setPickerFor] = useState<PickerTarget | null>(null);

  const openPicker = (target: PickerTarget) => {
    Keyboard.dismiss();
    setPickerFor(target);
  };

  const pickValue = (value: string) => {
    if (pickerFor === 'giver') setGiver(value);
    else if (pickerFor === 'receiver') setReceiver(value);
    else if (pickerFor === 'source') setSourceLocation(value);
    else if (pickerFor === 'dest') setFromLocation(value);
    setPickerFor(null);
  };

  const isPlacePicker = pickerFor === 'source' || pickerFor === 'dest';
  const pickerList = isPlacePicker ? PRESET_PLACES : PRESET_NAMES;
  const pickerCurrent =
    pickerFor === 'giver'
      ? giver
      : pickerFor === 'receiver'
        ? receiver
        : pickerFor === 'source'
          ? sourceLocation
          : fromLocation;

  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [conflictIds, setConflictIds] = useState<string[]>([]);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // ---------- Scan ----------
  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('İcazə lazımdır', 'Barkod oxumaq üçün kameraya icazə verin.');
        return;
      }
    }
    scannedRef.current = false;
    setScannerOpen(true);
  };

  const onScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScannerOpen(false);
    setNb(data);
    setNc('1'); // Scan edildikdə avtomatik 1 düşür
    try {
      const product = await findProductByBarcode(data);
      if (product) {
        console.log('PRODUCT RAW', JSON.stringify(product.raw));

        setNb(product.barcode); // bazadakı dəqiq barkod
        setNn(product.name);
        setNc('1');

        // Avadanlığın qeydiyyatda olduğu yer -> "Aid olduğu yer"
        const raw: any = product.raw ?? {};
        const location = String(raw.location ?? raw.Location ?? '').trim();
        if (location) {
          const current = sourceLocation.trim();
          if (items.length === 0 || !current) {
            setSourceLocation(location);
          } else if (location !== current) {
            Alert.alert(
              'Diqqət',
              `Bu avadanlıq "${location}" yerində qeydiyyatdadır, aktdakı yer isə "${current}".`
            );
          }
        } else {
          Alert.alert(
            'Diqqət',
            'Bu avadanlığın qeydiyyat yeri bazada boşdur. "Aid olduğu yer"i əl ilə yazın.'
          );
        }
      } else {
        setNn('');
        setNc('1');
        Alert.alert('Tapılmadı', 'Bu barkod bazada yoxdur. Avadanlığın adını əl ilə yazın.');
      }
    } catch {
      Alert.alert('Xəta', 'Barkod axtarılarkən xəta baş verdi.');
    }
  };

  // ---------- Əlavə et / Sil ----------
  const addItem = () => {
    if (items.length >= MAX_ITEMS) {
      Alert.alert('Limit', `Bir aktda ən çox ${MAX_ITEMS} avadanlıq ola bilər.`);
      return;
    }
    if (!nb.trim()) {
      Alert.alert('Diqqət', 'Barkodu yazın və ya scan edin.');
      return;
    }
    if (!nn.trim()) {
      Alert.alert('Diqqət', 'Avadanlığın adını yazın.');
      return;
    }
    const parsedCount = nc.trim() === '' ? 1 : parseInt(nc, 10);
    if (isNaN(parsedCount) || parsedCount <= 0) {
      Alert.alert('Diqqət', 'Düzgün say daxil edin.');
      return;
    }
    if (items.some((i) => i.barcode.trim() === nb.trim())) {
      Alert.alert('Diqqət', 'Bu barkod aktda artıq var.');
      return;
    }
    setItems([
      ...items,
      {
        id: `${Date.now()}-${Math.random()}`,
        barcode: nb.trim(),
        name: nn.trim(),
        count: String(parsedCount),
      },
    ]);
    setNb('');
    setNn('');
    setNc('');
  };

  const removeItem = (id: string) => {
    setConflictIds((prev) => prev.filter((x) => x !== id));
    if (editingId === id) setEditingId(null);
    setItems(items.filter((i) => i.id !== id));
  };

  // ---------- Redaktə et ----------
  const startEdit = (it: Item) => {
    if (editingId && editingId !== it.id) {
      Alert.alert('Diqqət', 'Əvvəlcə açıq redaktəni təsdiqləyin (✓).');
      return;
    }
    setEditingId(it.id);
    setDraft({ barcode: it.barcode, name: it.name, count: it.count });
    setConflictIds((prev) => prev.filter((x) => x !== it.id));
  };

  const saveEdit = () => {
    if (!draft.barcode.trim()) {
      Alert.alert('Diqqət', 'Barkodu yazın.');
      return;
    }
    if (!draft.name.trim()) {
      Alert.alert('Diqqət', 'Avadanlığın adını yazın.');
      return;
    }
    const parsedCount = draft.count.trim() === '' ? 1 : parseInt(draft.count, 10);
    if (isNaN(parsedCount) || parsedCount <= 0) {
      Alert.alert('Diqqət', 'Düzgün say daxil edin.');
      return;
    }
    if (items.some((i) => i.id !== editingId && i.barcode.trim() === draft.barcode.trim())) {
      Alert.alert('Diqqət', 'Bu barkod aktda artıq var.');
      return;
    }
    setItems(
      items.map((i) =>
        i.id === editingId
          ? { ...i, barcode: draft.barcode.trim(), name: draft.name.trim(), count: String(parsedCount) }
          : i
      )
    );
    setEditingId(null);
  };

  // ---------- Yaddaşa ver / Çap et ----------
  const validate = () => {
    if (editingId) {
      Alert.alert('Diqqət', 'Açıq redaktəni təsdiqləyin (✓).');
      return false;
    }
    if (items.length === 0) {
      Alert.alert('Diqqət', 'Ən azı bir avadanlıq əlavə edin.');
      return false;
    }
    if (!sourceLocation.trim()) {
      Alert.alert('Diqqət', 'Aid olduğu yeri yazın.');
      return false;
    }
    if (!fromLocation.trim()) {
      Alert.alert('Diqqət', 'Təhvil veriləcək yeri yazın.');
      return false;
    }
    if (!giver.trim()) {
      Alert.alert('Diqqət', 'Təhvil verənin adını yazın.');
      return false;
    }
    if (!receiver.trim()) {
      Alert.alert('Diqqət', 'Təhvil alanın adını yazın.');
      return false;
    }
    return true;
  };

  // Backend-dəki ActDto strukturuna uyğun payload (siyahı şəklində)
  const buildActPayload = () => {
    return {
      actNumber: sourceLocation.trim(),
      location: sourceLocation.trim(),
      toLocation: fromLocation.trim(),
      barcode: items.map((i) => i.barcode.trim()),
      name: items.map((i) => i.name),
      count: items.map((i) => parseInt(i.count, 10) || 1), // List<Long> — daxil edilən say
      date: nowIso(),
      description: note.trim(),
      fromUser: giver.trim(),
      toUser: receiver.trim(),
    };
  };

  const submit = async (): Promise<boolean> => {
    setConflictIds([]);
    if (!validate()) return false;
    setLoading(true);
    try {
      if (actMode === 'receive') {
        const seen = new Set<string>();
        const dupInAct = new Set<string>();
        for (const i of items) {
          const b = i.barcode.trim();
          if (!b) continue;
          if (seen.has(b)) dupInAct.add(b);
          seen.add(b);
        }
        const bad = items.filter((i) => dupInAct.has(i.barcode.trim()));
        if (bad.length > 0) {
          setConflictIds(bad.map((i) => i.id));
          Alert.alert(
            'Təkrarlanan barkod',
            `${Array.from(dupInAct).join(', ')} barkodu aktda təkrarlanır. Akt yaddaşa verilmədi.`
          );
          return false;
        }
      }

      await saveAct(buildActPayload(), actMode);
      return true;
    } catch (e) {
      console.log('SAVE ERROR', e);

      if (e instanceof ApiError) {
        if (actMode === 'receive' && e.status === 409) {
          Alert.alert('Xəta', e.message || 'Aktda təkrarlanan barkod var. Akt yaddaşa verilmədi.');
          return false;
        }
        Alert.alert('Xəta (server)', `Status: ${e.status}\n${e.message}`);
        return false;
      }

      const err = e as Error;
      Alert.alert('Xəta (şəbəkə)', `${err?.name}: ${err?.message ?? String(e)}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItems([]);
    setEditingId(null);
    setNb('');
    setNn('');
    setNc('');
    setSourceLocation('');
    setFromLocation('');
    setGiver('');
    setReceiver('');
    setNote('');
    setConflictIds([]);
  };

  const handleSave = async () => {
    if (await submit()) {
      resetForm();
      setToast('Akt yaddaşa verildi');
    }
  };

  const handlePrint = async () => {
    const printData: ActPrintData = {
      sourceLocation: sourceLocation.trim(),
      fromLocation: fromLocation.trim(),
      date: todayDisplay(),
      description: note.trim(),
      fromUser: giver.trim(),
      toUser: receiver.trim(),
      items: items.map(({ barcode, name, count }) => ({ barcode, name, count })),
    };
    if (await submit()) {
      resetForm();
      router.replace({ pathname: '/onizleme', params: { data: JSON.stringify(printData) } });
    }
  };

  // ---------- Ekran ----------
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
          <Text style={styles.title}>Yeni akt</Text>
        </View>

        <Text style={styles.label}>Sənəd nömrəsi</Text>
        <View style={[styles.field, styles.fieldReadonly]}>
          <Ionicons name="document-outline" size={19} color="#8A8A85" />
          <Text style={[styles.readonlyText, sourceLocation.trim() ? styles.readonlyFilled : null]}>
            {sourceLocation.trim()}
          </Text>
        </View>

        <Pressable style={styles.scanBtn} onPress={openScanner}>
          <Ionicons name="barcode-outline" size={22} color="#FFFFFF" />
          <Text style={styles.scanBtnText}>Scan et</Text>
        </Pressable>

        <Text style={styles.label}>Avadanlıqlar</Text>
        <View style={styles.table}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, { flex: 28 }]}>Barkod</Text>
            <Text style={[styles.th, { flex: 30 }]}>Ad</Text>
            <Text style={[styles.th, { flex: 18 }]}>Say</Text>
            <View style={{ flex: 24 }} />
          </View>

          {items.map((it) => {
            const editing = editingId === it.id;
            const conflict = conflictIds.includes(it.id);
            return (
              <View
                key={it.id}
                style={[styles.tr, editing && styles.trEditing, conflict && styles.trConflict]}
              >
                {editing ? (
                  <>
                    <TextInput
                      style={[styles.cellInput, { flex: 28 }]}
                      value={draft.barcode}
                      onChangeText={(v) => setDraft({ ...draft, barcode: v })}
                      autoCapitalize="none"
                      underlineColorAndroid="transparent"
                    />
                    <TextInput
                      style={[styles.cellInput, { flex: 30 }]}
                      value={draft.name}
                      onChangeText={(v) => setDraft({ ...draft, name: v })}
                      underlineColorAndroid="transparent"
                    />
                    <TextInput
                      style={[styles.cellInput, { flex: 18 }]}
                      value={draft.count}
                      onChangeText={(v) => setDraft({ ...draft, count: v })}
                      keyboardType="numeric"
                      underlineColorAndroid="transparent"
                    />
                  </>
                ) : (
                  <>
                    <Text style={[styles.td, { flex: 28 }, conflict && styles.tdConflict]}>{it.barcode}</Text>
                    <Text style={[styles.td, { flex: 30 }, conflict && styles.tdConflict]}>{it.name}</Text>
                    <Text style={[styles.td, { flex: 18 }, conflict && styles.tdConflict]}>{it.count}</Text>
                  </>
                )}

                <View style={styles.rowActions}>
                  <Pressable
                    style={[styles.iconBtn, editing ? styles.okBtn : styles.editBtn]}
                    onPress={() => (editing ? saveEdit() : startEdit(it))}
                    hitSlop={4}
                  >
                    <Ionicons
                      name={editing ? 'checkmark' : 'create-outline'}
                      size={16}
                      color={editing ? '#27500A' : '#0C447C'}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, styles.delBtn]}
                    onPress={() => removeItem(it.id)}
                    hitSlop={4}
                  >
                    <Ionicons name="trash-outline" size={16} color="#A32D2D" />
                  </Pressable>
                </View>
              </View>
            );
          })}

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.cellInput, { flex: 28 }]}
              placeholder="Barkod"
              placeholderTextColor="#8A8A85"
              value={nb}
              onChangeText={setNb}
              autoCapitalize="none"
              underlineColorAndroid="transparent"
            />
            <TextInput
              style={[styles.cellInput, { flex: 30 }]}
              placeholder="Ad"
              placeholderTextColor="#8A8A85"
              value={nn}
              onChangeText={setNn}
              underlineColorAndroid="transparent"
            />
            <TextInput
              style={[styles.cellInput, { flex: 18 }]}
              placeholder="Say"
              placeholderTextColor="#8A8A85"
              value={nc}
              onChangeText={setNc}
              keyboardType="numeric"
              underlineColorAndroid="transparent"
            />
          </View>
        </View>

        <Pressable style={styles.addBtn} onPress={addItem}>
          <Ionicons name="add" size={18} color="#0C447C" />
          <Text style={styles.addBtnText}>Əlavə et</Text>
        </Pressable>

        <Text style={styles.label}>Təhvil vaxtı</Text>
        <View style={[styles.field, styles.fieldReadonly]}>
          <Ionicons name="calendar-outline" size={19} color="#8A8A85" />
          <Text style={[styles.readonlyText, styles.readonlyFilled]}>{todayDisplay()}</Text>
        </View>

        <Text style={styles.label}>Aid olduğu yer</Text>
        <View style={styles.field}>
          <Ionicons name="storefront-outline" size={19} color="#8A8A85" />
          <TextInput
            style={styles.input}
            placeholder="Aid olduğu yer"
            placeholderTextColor="#8A8A85"
            value={sourceLocation}
            onChangeText={setSourceLocation}
            autoCapitalize="none"
            underlineColorAndroid="transparent"
          />
          <Pressable style={styles.dropBtn} onPress={() => openPicker('source')} hitSlop={8}>
            <Ionicons name="chevron-down" size={20} color="#0C447C" />
          </Pressable>
        </View>

        <Text style={styles.label}>Təhvil veriləcək yer</Text>
        <View style={styles.field}>
          <Ionicons name="location-outline" size={19} color="#8A8A85" />
          <TextInput
            style={styles.input}
            placeholder="Təhvil veriləcək yer"
            placeholderTextColor="#8A8A85"
            value={fromLocation}
            onChangeText={setFromLocation}
            underlineColorAndroid="transparent"
          />
          <Pressable style={styles.dropBtn} onPress={() => openPicker('dest')} hitSlop={8}>
            <Ionicons name="chevron-down" size={20} color="#0C447C" />
          </Pressable>
        </View>

        <Text style={styles.label}>Təhvil verən və təhvil alan</Text>
        <View style={styles.field}>
          <Ionicons name="person-outline" size={19} color="#8A8A85" />
          <TextInput
            style={styles.input}
            placeholder="Təhvil verən"
            placeholderTextColor="#8A8A85"
            value={giver}
            onChangeText={setGiver}
            underlineColorAndroid="transparent"
          />
          <Pressable style={styles.dropBtn} onPress={() => openPicker('giver')} hitSlop={8}>
            <Ionicons name="chevron-down" size={20} color="#0C447C" />
          </Pressable>
        </View>
        <View style={styles.field}>
          <Ionicons name="person-outline" size={19} color="#8A8A85" />
          <TextInput
            style={styles.input}
            placeholder="Təhvil alan"
            placeholderTextColor="#8A8A85"
            value={receiver}
            onChangeText={setReceiver}
            underlineColorAndroid="transparent"
          />
          <Pressable style={styles.dropBtn} onPress={() => openPicker('receiver')} hitSlop={8}>
            <Ionicons name="chevron-down" size={20} color="#0C447C" />
          </Pressable>
        </View>

        <Text style={styles.label}>Qeyd</Text>
        <View style={[styles.field, styles.noteField]}>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Qeyd yazın"
            placeholderTextColor="#8A8A85"
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
            underlineColorAndroid="transparent"
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.saveBtn]}
            onPress={handleSave}
            disabled={loading}
          >
            <Ionicons name="save-outline" size={19} color="#1A1A1A" />
            <Text style={styles.saveText}>Yaddaşa ver</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, styles.printBtn]}
            onPress={handlePrint}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="print-outline" size={19} color="#FFFFFF" />
                <Text style={styles.printText}>Çap et</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Kamera ilə barkod oxuma */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={styles.scanner}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
            }}
            onBarcodeScanned={onScanned}
          />
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Barkodu çərçivənin içinə gətirin</Text>
          <Pressable style={styles.scanClose} onPress={() => setScannerOpen(false)}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>

      {/* Hazır ad seçimi */}
      <Modal
        visible={pickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerFor(null)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <Text style={styles.pickerTitle}>{pickerFor ? PICKER_TITLES[pickerFor] : ''}</Text>
            <ScrollView style={styles.pickerList} contentContainerStyle={{ gap: 8 }}>
              {pickerList.map((name) => {
                const selected = pickerCurrent === name;
                return (
                  <Pressable
                    key={name}
                    style={[styles.pickerItem, selected && styles.pickerItemActive]}
                    onPress={() => pickValue(name)}
                  >
                    <Ionicons
                      name={isPlacePicker ? 'business-outline' : 'person-outline'}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
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
    marginBottom: 14,
  },
  fieldReadonly: { backgroundColor: '#F4F3EE' },
  readonlyText: { flex: 1, fontSize: 14, color: '#8A8A85' },
  readonlyFilled: { color: '#1A1A1A', fontWeight: '500' },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#1A1A1A' },
  noteField: { height: 90, alignItems: 'flex-start', paddingTop: 10 },
  noteInput: { paddingTop: 0 },

  // Hazır ad menyusu
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

  scanBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#185FA5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  scanBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  table: {
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E6E4DC',
    paddingVertical: 2,
  },
  trEditing: { backgroundColor: '#E6F1FB', paddingHorizontal: 4, gap: 4 },
  thead: { backgroundColor: '#F4F3EE', borderTopWidth: 0, paddingVertical: 0 },
  th: { fontSize: 12, fontWeight: '600', color: '#6B6B66', padding: 10 },
  td: { fontSize: 13, color: '#1A1A1A', padding: 10 },

  rowActions: {
    flex: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: { backgroundColor: '#E6F1FB', borderColor: '#85B7EB' },
  okBtn: { backgroundColor: '#EAF3DE', borderColor: '#97C459' },
  delBtn: { backgroundColor: '#FCEBEB', borderColor: '#F7C1C1' },

  inputRow: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    backgroundColor: '#E6F1FB',
    borderTopWidth: 1,
    borderTopColor: '#E6E4DC',
  },
  cellInput: {
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#85B7EB',
    borderRadius: 8,
    paddingHorizontal: 6,
    fontSize: 13,
    color: '#1A1A1A',
  },

  addBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E6F1FB',
    borderWidth: 1,
    borderColor: '#85B7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  addBtnText: { color: '#0C447C', fontSize: 14, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtn: { borderWidth: 1, borderColor: '#D3D1C7' },
  saveText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  printBtn: { backgroundColor: '#185FA5' },
  printText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  scanner: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 280,
    height: 160,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
  },
  trConflict: { backgroundColor: '#FCEBEB' },
  tdConflict: { color: '#D32F2F', fontWeight: '700' },
  scanHint: { position: 'absolute', bottom: 100, color: '#FFFFFF', fontSize: 14 },
  scanClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});