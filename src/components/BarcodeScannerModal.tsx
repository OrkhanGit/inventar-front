import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
};

export default function BarcodeScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const doneRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    doneRef.current = false;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleScan = ({ data }: { data: string }) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onScanned(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
              }}
              onBarcodeScanned={handleScan}
            />
            <View style={styles.frame} />
            <Text style={styles.hint}>Barkodu çərçivənin içinə gətirin</Text>
          </>
        ) : (
          <Text style={styles.noPerm}>
            Kameraya icazə verilməyib. Telefonun ayarlarından icazə verin.
          </Text>
        )}
        <Pressable style={styles.close} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 280,
    height: 160,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
  },
  hint: { position: 'absolute', bottom: 100, color: '#FFFFFF', fontSize: 14 },
  noPerm: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  close: {
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