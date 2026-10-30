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
const PRESET_NAMES = ['Orxan Məmmədov', 'Təvəkkül Məmmədov'];
const PRESET_PLACES = ['Skaner_MMC', 'Soliton_LTD_MMC', 'Sumqayit ofis', 'Dərnəgül ofis'];

// Ekranın başlığı: daxil olunan bölmənin adı (bölmə adları fərqlidirsə, bura yaz)
const ACT_TITLES: Record<ActMode, string> = {
  send: 'Avadanlıq təhvil akti',
  receive: 'Avadanlıq qəbul akti',
};

type PickerTarget = 'giver' | 'receiver' | 'source' | 'dest';

const PICKER_TITLES: Record<PickerTarget, string> = {
  giver: 'Təhvil verən',
  receiver: 'Təhvil alan',
  source: 'Aid olduğu yer',
  dest: 'Təhvil veriləcək yer',
};

// Avadanlığın vəziyyəti: yararlı / yararsız (yalnız biri seçilir).
// Service isə ayrıca qutucuqdur, onlardan asılı deyil.
type ItemState = 'good' | 'bad';

const STATE_OPTIONS: { key: ItemState; label: string; color: string }[] = [
  { key: 'good', label: 'Yararlı', color: '#2E7D32' },
  { key: 'bad', label: 'Yararsız', color: '#C62828' },
];

const SERVICE_COLOR = '#EF6C00';

const stateMeta = (s: ItemState | '') => STATE_OPTIONS.find((o) => o.key === s);

type Item = {
  id: string;
  barcode: string;
  name: string;
  count: string;
  state: ItemState | '';
  service: boolean;
  note: string;
  fromDb: boolean; // bazadan tapılıb -> ad bloklanır
};
type Draft = {
  barcode: string;
  name: string;
  count: string;
  state: ItemState | '';
  service: boolean;
  note: string;
  fromDb: boolean;
};

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

// Nöqtəli (radio) seçim + ayrıca Service qutucuğu + avadanlığın öz qeydi
function StateSelector({
  value,
  onChange,
  service,
  onServiceChange,
  note,
  onNoteChange,
}: {
  value: ItemState | '';
  onChange: (v: ItemState) => void;
  service: boolean;
  onServiceChange: (v: boolean) => void;
  note: string;
  onNoteChange: (v: string) => void;
}) {
  return (
    <View>
      <View style={styles.stateRow}>
        {STATE_OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <Pressable
              key={o.key}
              style={styles.stateOption}
              onPress={() => onChange(o.key)}
              hitSlop={6}
            >
              <View style={[styles.radioOuter, { borderColor: selected ? o.color : '#B8B6AC' }]}>
                {selected && <View style={[styles.radioInner, { backgroundColor: o.color }]} />}
              </View>
              <Text style={[styles.stateLabel, selected && { color: o.color, fontWeight: '700' }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Service: sərbəst qutucuq, istənilən vaxt seçilir / götürülür */}
        <Pressable
          style={styles.stateOption}
          onPress={() => onServiceChange(!service)}
          hitSlop={6}
        >
          <View
            style={[
              styles.radioOuter,
              {
                borderRadius: 4,
                borderColor: service ? SERVICE_COLOR : '#B8B6AC',
                backgroundColor: service ? SERVICE_COLOR : '#FFFFFF',
              },
            ]}
          >
            {service && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text style={[styles.stateLabel, service && { color: SERVICE_COLOR, fontWeight: '700' }]}>
            Service
          </Text>
        </Pressable>
      </View>

      {/* Qeyd: bu avadanlığa aiddir, vəziyyətin altında */}
      <TextInput
        style={styles.itemNoteInput}
        placeholder="Qeyd (bu avadanlıq üçün)"
        placeholderTextColor="#8A8A85"
        value={note}
        onChangeText={onNoteChange}
        multiline
        textAlignVertical="top"
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

export default function TehvilScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const actMode: ActMode = mode === 'receive' ? 'receive' : 'send';
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const [items, setItems] = useState<Item[]>([]);
  const [nb, setNb] = useState(''); // barkod (yalnız scan / axtarışdan düşür)
  const [nn, setNn] = useState(''); // ad
  const [nc, setNc] = useState(''); // say (ilkin olaraq boşdur)
  const [ns, setNs] = useState<ItemState | ''>(''); // vəziyyət (yalnız əl ilə seçilir)
  const [nsv, setNsv] = useState(false); // Service qutucuğu
  const [nnote, setNnote] = useState(''); // yeni avadanlığın qeydi
  const [nameLocked, setNameLocked] = useState(false); // bazadan tapılıbsa ad bloklanır

  // Əl ilə barkod axtarışı
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);

  // Redaktə rejimi
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    barcode: '',
    name: '',
    count: '',
    state: '',
    service: false,
    note: '',
    fromDb: false,
  });

  const [sourceLocation, setSourceLocation] = useState(''); // Aid olduğu yer
  const [fromLocation, setFromLocation] = useState(''); // Təhvil veriləcək yer
  const [giver, setGiver] = useState(''); // Təhvil verən (fromUser)
  const [receiver, setReceiver] = useState(''); // Təhvil alan (toUser)

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

  // Aktdakı qeydlərin birləşmiş mətni (çap və köhnə backend üçün).
  // Avadanlığın adı YOXDUR, yalnız yazılan qeydlər.
  const joinedNotes = () =>
    items
      .map((i) => i.note.trim())
      .filter(Boolean)
      .join('; ');

  // ---------- Barkod axtarışı (scan və əl ilə axtarış üçün ortaq məntiq) ----------
  const lookupBarcode = async (data: string) => {
    setNb(data);
    setNc('1'); // Scan / axtarış edildikdə avtomatik 1 düşür
    setNs(''); // Vəziyyət avtomatik DOLMUR, istifadəçi özü seçir
    setNsv(false);
    setNnote('');
    setNameLocked(false);
    try {
      const product = await findProductByBarcode(data);
      if (product) {
        console.log('PRODUCT RAW', JSON.stringify(product.raw));

        setNb(product.barcode); // bazadakı dəqiq barkod
        setNn(product.name);
        setNameLocked(true); // bazada tapıldı -> ad dəyişdirilə bilməz
        setNc('1');
        // DİQQƏT: raw.condition və raw.toService BİLƏRƏKDƏN oxunmur.

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
        setNameLocked(false); // tapılmadı -> ad əl ilə yazılır
        setNc('1');
        Alert.alert('Tapılmadı', 'Bu barkod bazada yoxdur. Avadanlığın adını əl ilə yazın.');
      }
    } catch {
      Alert.alert('Xəta', 'Barkod axtarılarkən xəta baş verdi.');
    }
  };

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
    // Scan zamanı qabaqdakı sıfırlar atılır (yalnız sıfırlardan ibarətdirsə '0' qalır)
    const cleaned = data.trim().replace(/^0+(?=.)/, '');
    await lookupBarcode(cleaned);
  };

  // ---------- Əl ilə axtarış ----------
  const handleSearch = async () => {
    const code = searchCode.trim();
    if (!code) {
      Alert.alert('Diqqət', 'Axtarmaq üçün barkodu yazın.');
      return;
    }
    Keyboard.dismiss();
    setSearching(true);
    try {
      await lookupBarcode(code);
    } finally {
      setSearching(false);
      setSearchCode('');
    }
  };

  // ---------- Əlavə et / Sil ----------
  const addItem = () => {
    if (items.length >= MAX_ITEMS) {
      Alert.alert('Limit', `Bir aktda ən çox ${MAX_ITEMS} avadanlıq ola bilər.`);
      return;
    }
    if (!nb.trim()) {
      Alert.alert('Diqqət', 'Əvvəlcə barkodu scan edin və ya axtarın.');
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
    if (!ns && !nsv) {
      Alert.alert('Diqqət', 'Vəziyyəti seçin: Yararlı, Yararsız və ya Service.');
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
        state: ns,
        service: nsv,
        note: nnote.trim(),
        fromDb: nameLocked,
      },
    ]);
    setNb('');
    setNn('');
    setNc('');
    setNs('');
    setNsv(false);
    setNnote('');
    setNameLocked(false);
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
    setDraft({
      barcode: it.barcode,
      name: it.name,
      count: it.count,
      state: it.state,
      service: it.service,
      note: it.note,
      fromDb: it.fromDb,
    });
    setConflictIds((prev) => prev.filter((x) => x !== it.id));
  };

  const saveEdit = () => {
    if (!draft.barcode.trim()) {
      Alert.alert('Diqqət', 'Barkod boş ola bilməz.');
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
    if (!draft.state && !draft.service) {
      Alert.alert('Diqqət', 'Vəziyyəti seçin: Yararlı, Yararsız və ya Service.');
      return;
    }
    if (items.some((i) => i.id !== editingId && i.barcode.trim() === draft.barcode.trim())) {
      Alert.alert('Diqqət', 'Bu barkod aktda artıq var.');
      return;
    }
    const newState = draft.state;
    setItems(
      items.map((i) =>
        i.id === editingId
          ? {
              ...i,
              barcode: draft.barcode.trim(),
              name: draft.name.trim(),
              count: String(parsedCount),
              state: newState,
              service: draft.service,
              note: draft.note.trim(),
            }
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
      // Yararlı / Yararsız -> condition (heç biri seçilməyibsə null)
      // Service -> ayrıca toService true/false
      condition: items.map((i) =>
        i.state === 'good' ? 'YARARLI' : i.state === 'bad' ? 'YARARSIZ' : null
      ),
      toService: items.map((i) => i.service),
      date: nowIso(),
      // Hər avadanlığın öz qeydi (barcode/name ilə eyni sıra)
      descriptions: items.map((i) => i.note),
      // Köhnə backend üçün uyğunluq: qeydlər birləşdirilib
      description: joinedNotes(),
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
    setNs('');
    setNsv(false);
    setNnote('');
    setNameLocked(false);
    setSearchCode('');
    setSourceLocation('');
    setFromLocation('');
    setGiver('');
    setReceiver('');
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
      description: joinedNotes(),
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
          <Text style={styles.title}>{ACT_TITLES[actMode]}</Text>
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

        {/* ---------- Əl ilə barkod axtarışı (scan ilə eyni məntiq) ---------- */}
        <Text style={styles.label}>Barkodu əl ilə axtar</Text>
        <View style={styles.searchRow}>
          <View style={[styles.field, styles.searchField]}>
            <Ionicons name="search-outline" size={19} color="#8A8A85" />
            <TextInput
              style={styles.input}
              placeholder="Barkodu yazın"
              placeholderTextColor="#8A8A85"
              value={searchCode}
              onChangeText={setSearchCode}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              underlineColorAndroid="transparent"
            />
          </View>
          <Pressable
            style={[styles.searchBtn, searching && { opacity: 0.7 }]}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#FFFFFF" />
                <Text style={styles.searchBtnText}>Axtar</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.label}>Avadanlıqlar</Text>

        {/* ---------- Yeni avadanlıq əlavə etmə bloku ---------- */}
        <View style={styles.newCard}>
          <View style={styles.newRow}>
            <View style={{ flex: 28 }}>
              <Text style={styles.colLabel}>Barkod</Text>
              {/* Barkod əl ilə yazılmır: yalnız scan / axtarışdan düşür */}
              <View style={styles.cellReadonly}>
                <Text
                  style={[styles.cellReadonlyText, !nb && styles.cellReadonlyPlaceholder]}
                  numberOfLines={1}
                >
                  {nb || 'Scan / Axtar'}
                </Text>
              </View>
            </View>
            <View style={{ flex: 34 }}>
              <Text style={styles.colLabel}>Ad</Text>
              <TextInput
                style={[styles.cellInput, nameLocked && styles.cellInputLocked]}
                editable={!nameLocked}
                placeholder="Ad"
                placeholderTextColor="#8A8A85"
                value={nn}
                onChangeText={setNn}
                underlineColorAndroid="transparent"
              />
            </View>
            <View style={{ flex: 16 }}>
              <Text style={styles.colLabel}>Say</Text>
              <TextInput
                style={styles.cellInput}
                placeholder="Say"
                placeholderTextColor="#8A8A85"
                value={nc}
                onChangeText={setNc}
                keyboardType="numeric"
                underlineColorAndroid="transparent"
              />
            </View>
          </View>

          <Text style={[styles.colLabel, { marginTop: 12 }]}>Vəziyyət</Text>
          <StateSelector
            value={ns}
            onChange={setNs}
            service={nsv}
            onServiceChange={setNsv}
            note={nnote}
            onNoteChange={setNnote}
          />
        </View>

        <Pressable style={styles.addBtn} onPress={addItem}>
          <Ionicons name="add" size={18} color="#0C447C" />
          <Text style={styles.addBtnText}>Əlavə et</Text>
        </Pressable>

        {/* ---------- Əlavə olunmuş avadanlıqlar ---------- */}
        {items.length > 0 && (
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
              const meta = stateMeta(it.state);
              return (
                <View
                  key={it.id}
                  style={[
                    styles.itemBlock,
                    editing && styles.trEditing,
                    conflict && styles.trConflict,
                  ]}
                >
                  <View style={styles.tr}>
                    {editing ? (
                      <>
                        {/* Redaktədə də barkod dəyişdirilmir */}
                        <View style={[styles.cellReadonly, { flex: 28 }]}>
                          <Text style={styles.cellReadonlyText} numberOfLines={1}>
                            {draft.barcode}
                          </Text>
                        </View>
                        <TextInput
                          style={[
                            styles.cellInput,
                            { flex: 30 },
                            draft.fromDb && styles.cellInputLocked,
                          ]}
                          editable={!draft.fromDb}
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
                        <Text style={[styles.td, { flex: 28 }, conflict && styles.tdConflict]}>
                          {it.barcode}
                        </Text>
                        <Text style={[styles.td, { flex: 30 }, conflict && styles.tdConflict]}>
                          {it.name}
                        </Text>
                        <Text style={[styles.td, { flex: 18 }, conflict && styles.tdConflict]}>
                          {it.count}
                        </Text>
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

                  {/* Vəziyyət sətri */}
                  {editing ? (
                    <View style={styles.stateEditWrap}>
                      <StateSelector
                        value={draft.state}
                        onChange={(v) => setDraft({ ...draft, state: v })}
                        service={draft.service}
                        onServiceChange={(v) => setDraft({ ...draft, service: v })}
                        note={draft.note}
                        onNoteChange={(v) => setDraft({ ...draft, note: v })}
                      />
                    </View>
                  ) : (
                    (meta || it.service) && (
                      <View style={styles.stateBadgeRow}>
                        {meta && (
                          <>
                            <View style={[styles.stateDot, { backgroundColor: meta.color }]} />
                            <Text style={[styles.stateBadgeText, { color: meta.color }]}>
                              {meta.label}
                            </Text>
                          </>
                        )}
                        {it.service && (
                          <>
                            <View style={[styles.stateDot, { backgroundColor: SERVICE_COLOR }]} />
                            <Text style={[styles.stateBadgeText, { color: SERVICE_COLOR }]}>
                              Service
                            </Text>
                          </>
                        )}
                      </View>
                    )
                  )}

                  {/* Avadanlığın öz qeydi */}
                  {!editing && !!it.note && (
                    <Text style={styles.itemNoteText}>Qeyd: {it.note}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

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
    marginBottom: 14,
  },
  scanBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Əl ilə axtarış
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  searchField: { flex: 1, marginBottom: 14 },
  searchBtn: {
    height: 50,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#185FA5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  searchBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Yeni avadanlıq kartı (başlıqlar xanaların üstündə)
  newCard: {
    borderWidth: 1,
    borderColor: '#85B7EB',
    backgroundColor: '#E6F1FB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  newRow: { flexDirection: 'row', gap: 8 },
  colLabel: { fontSize: 12, fontWeight: '600', color: '#4A4A46', marginBottom: 5, marginLeft: 2 },

  // Nöqtəli seçim
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  stateOption: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  stateLabel: { fontSize: 14, color: '#4A4A46' },

  // Avadanlığın öz qeydi
  itemNoteInput: {
    minHeight: 60,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#85B7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    fontSize: 13,
    color: '#1A1A1A',
  },
  itemNoteText: {
    fontSize: 12,
    color: '#4A4A46',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },

  // Cədvəl
  table: {
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 18,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemBlock: {
    borderTopWidth: 1,
    borderTopColor: '#E6E4DC',
  },
  trEditing: { backgroundColor: '#E6F1FB', paddingHorizontal: 4 },
  thead: { backgroundColor: '#F4F3EE', paddingVertical: 0 },
  th: { fontSize: 12, fontWeight: '600', color: '#6B6B66', padding: 10 },
  td: { fontSize: 13, color: '#1A1A1A', padding: 10 },

  stateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 8,
    marginTop: -4,
  },
  stateDot: { width: 9, height: 9, borderRadius: 5 },
  stateBadgeText: { fontSize: 12, fontWeight: '600' },
  stateEditWrap: { paddingHorizontal: 6, paddingBottom: 8, paddingTop: 4 },

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

  cellInput: {
    height: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#85B7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1A1A1A',
  },

  // Bloklanmış (bazadan gələn) ad xanası
  cellInputLocked: {
    backgroundColor: '#F4F3EE',
    borderColor: '#D3D1C7',
    color: '#6B6B66',
  },

  // Barkod xanası: boz, dəyişdirilə bilməz ("Təhvil vaxtı" kimi)
  cellReadonly: {
    height: 38,
    backgroundColor: '#F4F3EE',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cellReadonlyText: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  cellReadonlyPlaceholder: { color: '#8A8A85', fontWeight: '400' },

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