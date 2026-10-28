import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleLogin = () => {
    // Backend qoşulana qədər birbaşa növbəti səhifəyə keçir
    router.replace('/home');
  };

  const handleForgot = () => {
    Alert.alert('Şifrəni unutdum', 'Bu hissəni sonra əlavə edəcəyik.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.main}>
        <View style={styles.top}>
          <View style={styles.logoShadow}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/inventarLogo.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.title}>Xoş gəldiniz</Text>
          <Text style={styles.subtitle}>
            Davam etmək üçün hesabınıza daxil olun
          </Text>
        </View>

        <View style={styles.field}>
          <Ionicons name="person-outline" size={19} color="#8A8A85" />
          <TextInput
            style={styles.input}
            placeholder="İstifadəçi adı"
            placeholderTextColor="#8A8A85"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
          />
        </View>

        <View style={styles.field}>
          <Ionicons name="lock-closed-outline" size={19} color="#8A8A85" />
          <TextInput
            style={styles.input}
            placeholder="Şifrə"
            placeholderTextColor="#8A8A85"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#8A8A85"
            />
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.remember} onPress={() => setRemember(!remember)}>
            <Ionicons
              name={remember ? 'checkbox' : 'square-outline'}
              size={20}
              color={remember ? '#185FA5' : '#8A8A85'}
            />
            <Text style={styles.rememberText}>Məni xatırla</Text>
          </Pressable>
          <Pressable onPress={handleForgot}>
            <Text style={styles.link}>Şifrəni unutdum?</Text>
          </Pressable>
        </View>

        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Daxil ol</Text>
        </Pressable>
        </View>

        <Text style={styles.footer}>© 2026 Bütün hüquqlar qorunur</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  main: { flex: 1, justifyContent: 'center' },
  top: { alignItems: 'center', marginBottom: 28 },

  // Loqo yumru dairənin içindədir. Kölgə xarici qatda, kəsmə (overflow) daxili qatdadır
  // (iOS-da eyni qatda olsa kölgə görünmür)
  logoShadow: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  logoCircle: {
    flex: 1,
    borderRadius: 90,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 160, height: 160 },

  title: { fontSize: 24, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B6B66', textAlign: 'center' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#1A1A1A' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberText: { fontSize: 13, color: '#6B6B66' },
  link: { fontSize: 13, color: '#185FA5' },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#185FA5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footer: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: '#8A8A85',
  },
});