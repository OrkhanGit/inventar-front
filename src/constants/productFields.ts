import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type FieldDef = {
  key: string; // ProductDto-dakı field adı
  label: string; // ekranda görünən ad
  required?: boolean; // məcburi xana
  type?: 'text' | 'number' | 'integer'; // integer = tam ədəd (Long)
  icon?: IconName;
  scan?: boolean; // yanında scan düyməsi olsun
  multiline?: boolean; // uzun mətn xanası
  auto?: 'now'; // yazılmır, yaddaşa verilən an avtomatik qoyulur
};

export const PRODUCT_FIELDS: FieldDef[] = [
  { key: 'barcode', label: 'Barkod', icon: 'barcode-outline', scan: true },
  { key: 'name', label: 'Avadanlığın adı', required: true, icon: 'laptop-outline' },
  { key: 'count', label: 'Sayı', required: true, type: 'integer', icon: 'layers-outline' },
  { key: 'fromUser', label: 'Kimdən gəlib', icon: 'person-outline' },
  { key: 'entryDate', label: 'Daxil olma tarixi', icon: 'calendar-outline', auto: 'now' },
  { key: 'location', label: 'Yerləşdiyi yer', required: true, icon: 'storefront-outline' },
  { key: 'description', label: 'Qeyd', icon: 'document-text-outline', multiline: true },
];