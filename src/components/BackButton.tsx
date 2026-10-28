import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

export default function BackButton() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back(); // bir əvvəlki səhifə
    } else {
      router.replace('/home');
    }
  };

  return (
    <Pressable style={styles.btn} onPress={goBack} hitSlop={8}>
      <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});