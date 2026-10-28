// Java backend-in ünvanı.
// Port 8080 Spring Boot-un standart portudur. application.properties-də
// server.port fərqlidirsə, onu bura yaz.
export const BASE_URL = 'https://desktop-si2t5up.tailc28ac7.ts.net:8443';
// export const BASE_URL = 'http://192.168.1.4:8080';


export const ENDPOINTS = {
  receiveProduct: '/act/receiveProduct', // avadanlıq qəbul akti (DB-yə active daxil olur)
  sentProduct: '/act/sentProduct',       // avadanlıq təhvil akti (inactive olur)
  getAllActs: '/act/getAllAct',
  createProduct: '/product/createProduct',
  allProducts: '/product/allProducts',
  serviceProducts: '/product/service',
  entryDates: '/product/entryDates',
  productByBarcode: '/product/byBarcode',
};