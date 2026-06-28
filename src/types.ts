export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number | string;
  sale_price?: string;
  specs?: string;
  category: string;
  image: string;
  images?: string[];
  labelEn?: string;
  labelAr?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  colorEn: string;
  colorAr: string;
  specsEn: string[];
  specsAr: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  shippingDetails: ShippingDetails;
  status: 'placed' | 'processing' | 'shipped' | 'delivered';
  date: string;
  time?: string;
  createdAt?: string;
  trackingNumber: string;
}

export type Language = 'ar' | 'en';
export type Currency = 'SAR' | 'YER';

export interface Dictionary {
  shop: string;
  search: string;
  orders: string;
  account: string;
  addToCart: string;
  quantity: string;
  cart: string;
  checkout: string;
  subtotal: string;
  total: string;
  discount: string;
  shipping: string;
  free: string;
  applyPromo: string;
  promoCode: string;
  promoSuccess: string;
  invalidPromo: string;
  placeOrder: string;
  orderCompleted: string;
  tracking: string;
  searchPlaceholder: string;
  categoryAll: string;
  categoryWatch: string;
  categoryAudio: string;
  categoryAccessory: string;
  categoryLiving: string;
  signIn: string;
  signOut: string;
  shippingInfo: string;
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  paymentDetails: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  orderStatusPlaced: string;
  orderStatusProcessing: string;
  orderStatusShipped: string;
  orderStatusDelivered: string;
  emptyCart: string;
  emptyOrders: string;
  goShopping: string;
  newArrival: string;
  ofTheWeek: string;
  exclusiveHeroTitleEn: string;
  exclusiveHeroTitleAr: string;
  heroButtonEn: string;
  heroButtonAr: string;
  shippingFeatureTitleEn: string;
  shippingFeatureTitleAr: string;
}
