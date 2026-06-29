import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingCart, 
  Search, 
  User, 
  Package, 
  ArrowRight, 
  Truck, 
  Star, 
  X, 
  Plus, 
  Minus, 
  Check, 
  CheckCircle2, 
  MapPin, 
  CreditCard, 
  Globe, 
  Sparkles, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Undo2,
  ChevronLeft as ChevronLeftIcon,
  FileText,
  Phone,
  Tag,
  HelpCircle,
  Settings,
  ShieldCheck,
  Mail,
  Store,
  Gift,
  Lock,
  PhoneCall,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, ShippingDetails, Order, Language, Currency } from './types';
import { PRODUCTS, DICTIONARY, HERO_IMAGE } from './data';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signOutUser } from './lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const isOfflineOrPermission = errInfo.error.includes('offline') || 
                                errInfo.error.includes('permission') || 
                                errInfo.error.includes('Could not reach') || 
                                errInfo.error.includes('unreachable');
                                
  if (isOfflineOrPermission) {
    console.warn('Firestore Warning (Offline/Permission): ', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
}

// Immersive category visual mapping for luxury pavilion view
const CATEGORY_META = {
  all: {
    taglineAr: "المعرض الشامل للتحف والقطع الحصرية المصممة بعناية فائقة",
    taglineEn: "The full exhibition of meticulously curated luxury masterworks",
    descAr: "تصفح صالة العرض الكاملة المليئة بالتصميمات الرائدة والتحف المصقولة يدوياً تحت سقف واحد لتجربة اقتناء لا تُنسى.",
    descEn: "Explore the comprehensive atelier gallery of cutting-edge designs and hand-polished collector objects, all curated in one cohesive aesthetic.",
    bgGradient: "from-neutral-900/40 via-[#0a0f0d]/90 to-[#030605]",
    icon: "widgets",
    count: PRODUCTS.length
  },
  watch: {
    taglineAr: "تحف وميكانيكا التوقيت السويسرية متناهية الدقة",
    taglineEn: "Masterpieces of Swiss horology and micro-mechanics",
    descAr: "حيث تجتمع الفخامة الكلاسيكية مع عراقة التصنيع وموانئ الساعات المصقولة لترافق لحظاتك بحضورٍ طاغٍ.",
    descEn: "Where traditional mechanics blend seamlessly with precious metal casings to construct timepieces designed for a lifetime.",
    bgGradient: "from-amber-950/40 via-[#120f09]/95 to-[#0b0c0d]",
    icon: "watch",
    count: PRODUCTS.filter(p => p.category === 'watch').length
  },
  audio: {
    taglineAr: "نقاء الرنين الصوتي وهندسة الضوضاء المعاصرة",
    taglineEn: "Pinnacle acoustic engineering and tailored auditory sanctuary",
    descAr: "صوت نقي غامر وتوازن دقيق يفصلك تماماً عن صخب العالم لتستمع إلى تفاصيل موسيقية لم تسمعها من قبل.",
    descEn: "Unrivaled high-fidelity acoustics and precise acoustic geometry designed to immerse your senses in ultimate audiophile gold standard.",
    bgGradient: "from-[#0a1815]/50 via-[#0a0d0d]/95 to-[#050606]",
    icon: "headphones",
    count: PRODUCTS.filter(p => p.category === 'audio').length
  },
  accessory: {
    taglineAr: "جماليات وهندسة مقتنيات مساحات العمل الراقية",
    taglineEn: "Workspace desktop essentials and artisanal geometry",
    descAr: "منظمات وجلود فاخرة تم صقلها يدوياً لتضفي هالة من الرقي والتنظيم الفائق على مكتبك الشخصي وإلهامك اليومي.",
    descEn: "Handcrafted desktop foundations and storage structures designed with premium leather to breathe inspiration into your creative space.",
    bgGradient: "from-sky-950/30 via-[#090d12]/95 to-[#07080a]",
    icon: "edit_note",
    count: PRODUCTS.filter(p => p.category === 'accessory').length
  },
  living: {
    taglineAr: "مجسمات هندسية وقوارير فنية تسافر عبر العصور",
    taglineEn: "Design statements, glass vessels, and poetic furniture",
    descAr: "تحف فنية ملموسة تثري فضاء المعيشة وتمنح بيتك الفاخر طابعاً لا يُنسى يناسب أسلوب حياتك النخبوي.",
    descEn: "Striking sculptural statements, hand-blown architectural glassware, and rare objects to define living spaces with luxury.",
    bgGradient: "from-[#1b1c1c]/40 via-[#0f1010]/95 to-[#080808]",
    icon: "view_in_ar",
    count: PRODUCTS.filter(p => p.category === 'living').length
  }
};

const formatPhoneNumber = (num: string) => {
  const digits = num.replace(/\s+/g, '');
  if (digits.length === 12 && digits.startsWith('967')) {
    const main = digits.slice(3);
    return `${main.slice(0, 3)} ${main.slice(3, 6)} ${main.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return num;
};

export default function App() {
  // --- Persistent States & Preferences ---
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('luxe_lang');
      return (saved === 'ar' || saved === 'en') ? saved : 'ar'; // default to Arabic for local relevance
    } catch {
      return 'ar';
    }
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('luxe_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('luxe_currency');
      return (saved === 'SAR' || saved === 'YER') ? saved as Currency : 'SAR'; // default to Saudi Riyal
    } catch {
      return 'SAR';
    }
  });

  const [currentTab, setCurrentTab] = useState<string>('shop');

  // --- Firebase Auth & Store Admin States ---
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSimulatingAdmin, setIsSimulatingAdmin] = useState<boolean>(false);
  const [firebaseOrders, setFirebaseOrders] = useState<any[]>([]);
  const [isLoadingFirebaseOrders, setIsLoadingFirebaseOrders] = useState<boolean>(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isLoadingCustomerOrders, setIsLoadingCustomerOrders] = useState<boolean>(false);

  // Store details
  const [storeNameAr, setStoreNameAr] = useState<string>('متجر سمارت');
  const [storeNameEn, setStoreNameEn] = useState<string>('Smart Store');
  const [storePhone, setStorePhone] = useState<string>('967779793990');
  const [storeWhatsapp, setStoreWhatsapp] = useState<string>('967782412634');
  const [storeAddressAr, setStoreAddressAr] = useState<string>('شبوة - الصعيد - يشبم');
  const [storeAddressEn, setStoreAddressEn] = useState<string>('Shabwah - Al-Saeed - Yashbum');

  // Dynamic Coupons configuration
  const [activeCoupons, setActiveCoupons] = useState<{ code: string; discount: number }[]>([
    { code: 'SMART10', discount: 10 },
    { code: 'SMART20', discount: 20 }
  ]);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('luxe_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('luxe_orders_guest') || localStorage.getItem('luxe_orders');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  // --- Sell Item Gateway State (فاتورة بيع سلعة للمستخدمين) ---
  interface SellInvoice {
    id: string;
    itemName: string;
    sellerName: string;
    phone: string;
    price: string;
    location: string;
    reason: string;
    date: string;
    status: 'pending' | 'reviewed';
    customerEmail?: string;
    createdAt?: string;
  }

  const [sellInvoices, setSellInvoices] = useState<SellInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('luxe_sell_invoices_guest') || localStorage.getItem('luxe_sell_invoices');
      if (saved) {
        const parsed = JSON.parse(saved) as SellInvoice[];
        return parsed.filter(inv => inv.id !== 'INV-SELL-8291');
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const key = firebaseUser ? `luxe_sell_invoices_${firebaseUser.uid}` : 'luxe_sell_invoices_guest';
    localStorage.setItem(key, JSON.stringify(sellInvoices));
  }, [sellInvoices, firebaseUser]);

  // --- UI Interactivity States ---
  const [showDomainErrorModal, setShowDomainErrorModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [isFullScreenImageOpen, setIsFullScreenImageOpen] = useState<boolean>(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [mouseDownX, setMouseDownX] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // --- User Sell Form States (حالات نموذج عرض قطعة للبيع) ---
  const [sellItemName, setSellItemName] = useState<string>('');
  const [sellSellerName, setSellSellerName] = useState<string>('');
  const [sellPhone, setSellPhone] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [sellLocation, setSellLocation] = useState<string>('');
  const [sellReason, setSellReason] = useState<string>('');
  
  // --- Checkout Form & Promo Code States ---
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [promoCode, setPromoCode] = useState<string>('');
  const [activeDiscount, setActiveDiscount] = useState<number>(0); // discount percent (e.g. 10)
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  
  const [shippingForm, setShippingForm] = useState<ShippingDetails>(() => {
    try {
      const saved = localStorage.getItem('luxe_shipping_form');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse shipping form from localStorage', e);
    }
    return {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: 'صنعاء',
      postalCode: ''
    };
  });

  const [cardForm, setCardForm] = useState({
    number: '4242 •••• •••• 9381',
    expiry: '12/28',
    cvv: '102'
  });

  // Toasts
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // --- Special Offers States ---
  const [specialOffers] = useState<{ productId: string; discountPrice: number }[]>(() => {
    return [
      { productId: '1', discountPrice: 79 },
      { productId: '2', discountPrice: 119 },
      { productId: '5', discountPrice: 89 }
    ];
  });

  // Track language/currency changes to save preferences
  useEffect(() => {
    localStorage.setItem('luxe_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('luxe_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('luxe_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('luxe_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const key = firebaseUser ? `luxe_orders_${firebaseUser.uid}` : 'luxe_orders_guest';
    localStorage.setItem(key, JSON.stringify(orders));
  }, [orders, firebaseUser]);

  useEffect(() => {
    const key = firebaseUser ? `luxe_shipping_form_${firebaseUser.uid}` : 'luxe_shipping_form_guest';
    localStorage.setItem(key, JSON.stringify(shippingForm));
  }, [shippingForm, firebaseUser]);

  // Prevent background body scroll when product details or cart drawer are active
  useEffect(() => {
    if (selectedProduct || isCartOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [selectedProduct, isCartOpen]);

  // Reset active image gallery index when selected product changes
  useEffect(() => {
    setActiveImageIdx(0);
    if (selectedProduct) {
      // Small delay to allow DOM to render
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const { scrollHeight, clientHeight } = scrollContainerRef.current;
          setShowScrollIndicator(scrollHeight > clientHeight + 10);
        }
      }, 100);
    } else {
      setShowScrollIndicator(true);
    }
  }, [selectedProduct]);

  // Load and subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        const isOfficialAdmin = currentUser.email === 'moaathbakhrish@gmail.com' || currentUser.email === 'moaath.owner@gmail.com';
        setIsAdmin(isOfficialAdmin);
        if (isOfficialAdmin) {
          setIsSimulatingAdmin(true);
        }
      } else {
        setIsAdmin(false);
        setIsSimulatingAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync settings and coupons from Firestore on mount
  useEffect(() => {
    async function syncStoreSettings() {
      try {
        const settingsRef = doc(db, 'store', 'settings');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          let needsUpdate = false;
          let nameAr = data.storeNameAr || 'متجر سمارت';
          let nameEn = data.storeNameEn || 'Smart Store';
          let phone = data.storePhone || '967779793990';
          let whatsapp = data.storeWhatsapp || '967782412634';
          let addressAr = data.storeAddressAr || 'شبوة - الصعيد - يشبم';
          let addressEn = data.storeAddressEn || 'Shabwah - Al-Saeed - Yashbum';

          if (nameAr !== 'متجر سمارت') {
            nameAr = 'متجر سمارت';
            needsUpdate = true;
          }
          if (addressAr !== 'شبوة - الصعيد - يشبم') {
            addressAr = 'شبوة - الصعيد - يشبم';
            needsUpdate = true;
          }
          if (addressEn !== 'Shabwah - Al-Saeed - Yashbum') {
            addressEn = 'Shabwah - Al-Saeed - Yashbum';
            needsUpdate = true;
          }
          if (whatsapp !== '967782412634') {
            whatsapp = '967782412634';
            needsUpdate = true;
          }
          if (phone !== '967779793990') {
            phone = '967779793990';
            needsUpdate = true;
          }

          setStoreNameAr(nameAr);
          setStoreNameEn(nameEn);
          setStorePhone(phone);
          setStoreWhatsapp(whatsapp);
          setStoreAddressAr(addressAr);
          setStoreAddressEn(addressEn);

          if (needsUpdate) {
            await updateDoc(settingsRef, {
              storeNameAr: nameAr,
              storeNameEn: nameEn,
              storePhone: phone,
              storeWhatsapp: whatsapp,
              storeAddressAr: addressAr,
              storeAddressEn: addressEn
            });
          }
        } else {
          await setDoc(settingsRef, {
            storeNameAr: 'متجر سمارت',
            storeNameEn: 'Smart Store',
            storePhone: '967779793990',
            storeWhatsapp: '967782412634',
            storeAddressAr: 'شبوة - الصعيد - يشبم',
            storeAddressEn: 'Shabwah - Al-Saeed - Yashbum'
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'store/settings');
      }
    }

    async function syncCoupons() {
      try {
        const couponsRef = doc(db, 'store', 'coupons');
        const couponsSnap = await getDoc(couponsRef);
        if (couponsSnap.exists()) {
          const data = couponsSnap.data();
          if (data.list) {
            setActiveCoupons(data.list);
          }
        } else {
          await setDoc(couponsRef, {
            list: [
              { code: 'SMART10', discount: 10 },
              { code: 'SMART20', discount: 20 }
            ]
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'store/coupons');
      }
    }

    syncStoreSettings();
    syncCoupons();
  }, []);

  // Fetch Firestore orders for administration
  const fetchAllOrders = async () => {
    setIsLoadingFirebaseOrders(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      setFirebaseOrders(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    } finally {
      setIsLoadingFirebaseOrders(false);
    }
  };

  const fetchCustomerOrders = async () => {
    if (!firebaseUser?.email) {
      setCustomerOrders([]);
      return;
    }
    
    // Prevent fetching old orders if cleanup is pending
    const userCleanedKey = `luxe_user_cleaned_v5_final_${firebaseUser.uid}`;
    if (localStorage.getItem(userCleanedKey) !== 'true') {
      return;
    }

    setIsLoadingCustomerOrders(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerEmail', '==', firebaseUser.email)
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      setCustomerOrders(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    } finally {
      setIsLoadingCustomerOrders(false);
    }
  };

  const [isDeletingOrders, setIsDeletingOrders] = useState<boolean>(false);

  // Unconditional clean up of past/previous orders once per user session
  useEffect(() => {
    const cleanGuestOrders = () => {
      const guestCleaned = localStorage.getItem('luxe_guest_cleaned_v5_final');
      if (guestCleaned === 'true') return;
      
      localStorage.removeItem('luxe_orders');
      localStorage.removeItem('luxe_orders_guest');
      setOrders([]);
      localStorage.setItem('luxe_guest_cleaned_v5_final', 'true');
    };

    const cleanUserOrders = async (user: any) => {
      const userCleanedKey = `luxe_user_cleaned_v5_final_${user.uid}`;
      const userCleaned = localStorage.getItem(userCleanedKey);
      if (userCleaned === 'true') return;

      setIsDeletingOrders(true);
      try {
        localStorage.removeItem(`luxe_orders_${user.uid}`);
        setOrders([]);

        if (user.email) {
          const q = query(
            collection(db, 'orders'),
            where('customerEmail', '==', user.email)
          );
          const querySnapshot = await getDocs(q);
          const deletePromises: Promise<void>[] = [];
          querySnapshot.forEach((docSnap) => {
            deletePromises.push(deleteDoc(doc(db, 'orders', docSnap.id)));
          });
          await Promise.all(deletePromises);
          setCustomerOrders([]);
        }
        localStorage.setItem(userCleanedKey, 'true');
        // Once cleaned, safely allow future queries
        fetchCustomerOrders();
      } catch (err: any) {
        const isPermissionErr = err?.code === 'permission-denied' || 
                                err?.message?.toLowerCase().includes('permission') ||
                                String(err).toLowerCase().includes('permission');
        if (isPermissionErr) {
          console.warn('Firestore Warning: Permission Denied during past orders cleanup. Firestore rules may need to be updated in the console.');
          // Set cleaned to true so we do not get stuck in a cleanup loop if rules are restricted on the console
          localStorage.setItem(userCleanedKey, 'true');
        } else {
          console.error('Error in silent past orders cleanup for user:', err);
        }
      } finally {
        setIsDeletingOrders(false);
      }
    };

    cleanGuestOrders();
    if (firebaseUser) {
      cleanUserOrders(firebaseUser);
    }
  }, [firebaseUser]);

  const [isLoadingCustomerSellInvoices, setIsLoadingCustomerSellInvoices] = useState<boolean>(false);

  const fetchCustomerSellInvoices = async () => {
    if (!firebaseUser?.email) {
      setSellInvoices([]);
      return;
    }
    setIsLoadingCustomerSellInvoices(true);
    try {
      const q = query(
        collection(db, 'sellInvoices'),
        where('customerEmail', '==', firebaseUser.email)
      );
      const querySnapshot = await getDocs(q);
      const list: SellInvoice[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: data.id || docSnap.id,
          itemName: data.itemName || '',
          sellerName: data.sellerName || '',
          phone: data.phone || '',
          price: data.price || '',
          location: data.location || '',
          reason: data.reason || '',
          date: data.date || '',
          status: data.status || 'pending',
          customerEmail: data.customerEmail,
          createdAt: data.createdAt
        });
      });
      list.sort((a, b) => {
        const dateA = a.createdAt || a.date || '';
        const dateB = b.createdAt || b.date || '';
        return dateB.localeCompare(dateA);
      });
      setSellInvoices(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'sellInvoices');
    } finally {
      setIsLoadingCustomerSellInvoices(false);
    }
  };

  useEffect(() => {
    if (firebaseUser) {
      // First load from user-specific cache
      const userOrdersKey = `luxe_orders_${firebaseUser.uid}`;
      const savedOrders = localStorage.getItem(userOrdersKey);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      } else {
        setOrders([]);
      }

      const userInvoicesKey = `luxe_sell_invoices_${firebaseUser.uid}`;
      const savedInvoices = localStorage.getItem(userInvoicesKey);
      if (savedInvoices) {
        setSellInvoices(JSON.parse(savedInvoices));
      } else {
        setSellInvoices([]);
      }

      const userShippingKey = `luxe_shipping_form_${firebaseUser.uid}`;
      const savedShipping = localStorage.getItem(userShippingKey);
      if (savedShipping) {
        setShippingForm(JSON.parse(savedShipping));
      } else {
        setShippingForm({
          fullName: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          phone: '',
          address: '',
          city: 'صنعاء',
          postalCode: ''
        });
      }

      fetchCustomerOrders();
      fetchCustomerSellInvoices();
    } else {
      setCustomerOrders([]);
      
      const guestOrdersSaved = localStorage.getItem('luxe_orders_guest');
      if (guestOrdersSaved) {
        setOrders(JSON.parse(guestOrdersSaved));
      } else {
        const oldSaved = localStorage.getItem('luxe_orders');
        if (oldSaved) {
          setOrders(JSON.parse(oldSaved));
          localStorage.setItem('luxe_orders_guest', oldSaved);
        } else {
          setOrders([]);
        }
      }

      const guestInvoicesSaved = localStorage.getItem('luxe_sell_invoices_guest');
      if (guestInvoicesSaved) {
        setSellInvoices(JSON.parse(guestInvoicesSaved));
      } else {
        const oldSaved = localStorage.getItem('luxe_sell_invoices');
        if (oldSaved) {
          setSellInvoices(JSON.parse(oldSaved));
          localStorage.setItem('luxe_sell_invoices_guest', oldSaved);
        } else {
          setSellInvoices([]);
        }
      }

      const guestShippingSaved = localStorage.getItem('luxe_shipping_form_guest');
      if (guestShippingSaved) {
        setShippingForm(JSON.parse(guestShippingSaved));
      } else {
        const oldSaved = localStorage.getItem('luxe_shipping_form');
        if (oldSaved) {
          setShippingForm(JSON.parse(oldSaved));
          localStorage.setItem('luxe_shipping_form_guest', oldSaved);
        } else {
          setShippingForm({
            fullName: '',
            email: '',
            phone: '',
            address: '',
            city: 'صنعاء',
            postalCode: ''
          });
        }
      }
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (isAdmin || isSimulatingAdmin) {
      fetchAllOrders();
    }
  }, [isAdmin, isSimulatingAdmin]);

  // Toast notifier
  const addToast = (text: string) => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const d = DICTIONARY[lang];

  // --- Dynamic Products State from Google Sheet database ---
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<{message: string; details?: string; instructions?: string} | null>(null);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const c = p.category?.trim();
      if (c && c !== 'all') {
        cats.add(c);
      }
    });
    return Array.from(cats);
  }, [products]);

  const mergedOrders = useMemo(() => {
    const all = [...customerOrders];
    orders.forEach(localOrd => {
      if (!all.some(o => o.id === localOrd.id)) {
        all.push(localOrd);
      }
    });
    all.sort((a, b) => {
      const dateA = a.createdAt || a.date || '';
      const dateB = b.createdAt || b.date || '';
      return dateB.localeCompare(dateA);
    });
    return all;
  }, [customerOrders, orders]);

  useEffect(() => {
    async function loadProducts() {
      setIsLoadingProducts(true);
      let data: any = null;
      let fetchError: any = null;

      // 1. First, attempt to fetch from the local server proxy API route
      try {
        console.log('Attempting to fetch products from local API route: /api/products');
        const res = await fetch('/api/products');
        if (!res.ok) {
          throw new Error(`Local API response error: Status ${res.status}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Local API returned non-JSON content. Usually indicates server is not running on serverless hosting.');
        }
        data = await res.json();
      } catch (err: any) {
        fetchError = err;
        console.error('Error fetching from /api/products:', err);
      }

      // 2. If local fetch failed or returned invalid response, fallback to fetching directly from Google Sheets over secure HTTPS
      if (!data || (data && data.success === false)) {
        try {
          console.log('Falling back to secure direct HTTPS fetch from Google Sheets Apps Script...');
          const directUrl = 'https://script.google.com/macros/s/AKfycbxJBtIIjNMX_bixahUQWOjZ1zdOD3K_B0_Cn4fJxCfj7VVn2enEbpWrc9K3LDyUwyn2qQ/exec';
          const res = await fetch(directUrl);
          if (!res.ok) {
            throw new Error(`Direct Google Sheets fetch error: Status ${res.status}`);
          }
          const text = await res.text();
          const parsed = JSON.parse(text);
          data = Array.isArray(parsed) ? parsed : (parsed.data || parsed.products || []);
          console.log('Successfully fetched products directly from Google Sheets API over HTTPS:', data.length, 'products found.');
        } catch (fallbackErr: any) {
          console.error('Fallback direct Google Sheets fetch failed:', fallbackErr);
          // If both failed, we set the sheet error state with diagnostic info
          setSheetError({
            message: lang === 'ar' ? 'فشل الاتصال بجدول بيانات جوجل' : 'Failed to connect to Google Sheets',
            details: `Local error: ${fetchError?.message || String(fetchError)}. Direct error: ${fallbackErr?.message || String(fallbackErr)}`,
            instructions: lang === 'ar' ? 'يرجى التحقق من اتصال الإنترنت وإعدادات Apps Script' : 'Please check your internet connection and Apps Script setup'
          });
        }
      }

      // 3. Process and map the products data
      if (data && Array.isArray(data) && data.length > 0) {
        try {
          setSheetError(null);
          const validData = data.filter((item: any) => {
            if (!item) return false;
            const name = String(item.name || item.nameEn || item.nameAr || '').trim();
            const image = String(item.image || '').trim();
            return name.length > 0 && image.length > 0;
          });
          const mapped: Product[] = validData.map((item: any, index: number) => {
            const priceStr = item.price !== undefined && item.price !== null ? String(item.price).trim() : '';
            const salePriceStr = item.sale_price !== undefined && item.sale_price !== null ? String(item.sale_price).trim() : '';
            const hasOffer = salePriceStr.length > 0;
            
            let imageUrls: string[] = [];
            if (Array.isArray(item.images) && item.images.length > 0) {
              imageUrls = item.images;
            } else {
              const imageStr = String(item.image || '').trim();
              imageUrls = imageStr
                .split(/[\r\n,\s]+/)
                .map((s: string) => {
                  let cleaned = s.trim().replace(/^["'`\s\[\(]+|["'`\s\]\)]+$/g, '');
                  if (/^https?:\/\//i.test(cleaned)) {
                    cleaned = cleaned.replace(/^https?:\/\//i, (match) => match.toLowerCase());
                  }
                  return cleaned;
                })
                .filter(Boolean)
                .filter((u: string) => u.toLowerCase().startsWith('http'));
            }
            const primaryImage = imageUrls[0] || '';
            const specsStr = item.specs !== undefined && item.specs !== null ? String(item.specs).trim() : '';
            return {
              id: String(item.id || `sheet-${index + 1}`),
              nameEn: item.name || '',
              nameAr: item.name || '',
              descriptionEn: item.description || '',
              descriptionAr: item.description || '',
              price: priceStr,
              sale_price: salePriceStr,
              specs: specsStr,
              category: item.category || 'all',
              image: primaryImage,
              images: imageUrls.length > 0 ? imageUrls : (primaryImage ? [primaryImage] : []),
              labelEn: hasOffer ? 'Special Offer 🔥' : '',
              labelAr: hasOffer ? 'عرض خاص 🔥' : '',
              isFeatured: hasOffer,
              colorEn: '',
              colorAr: '',
              specsEn: [],
              specsAr: []
            };
          });

          // Merge dynamic products with the fallback PRODUCTS so the grid is always filled
          const dynamicIds = new Set(mapped.map(p => p.id));
          const combined = [
            ...mapped,
            ...PRODUCTS.filter(p => !dynamicIds.has(p.id))
          ];
          setProducts(combined);
        } catch (processErr: any) {
          console.error('Error processing fetched products data:', processErr);
        }
      } else if (data && data.success === false) {
        setSheetError({
          message: data.error || 'API Error',
          details: data.details,
          instructions: data.instructions
        });
      }

      setIsLoadingProducts(false);
    }

    loadProducts();
  }, [lang]);

  const latestProducts = useMemo(() => {
    const validProducts = products.filter(prod => {
      const hasName = (prod.nameAr && prod.nameAr.trim()) || (prod.nameEn && prod.nameEn.trim());
      const hasImage = prod.image && prod.image.trim();
      return hasName && hasImage;
    });
    return [...validProducts].sort((a, b) => Number(b.id) - Number(a.id));
  }, [products]);

  // Synchronous carousel interval rotation every 3 seconds for newly added products
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % latestProducts.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [latestProducts.length]);

  // Immersive active category meta
  const activeCategoryMeta = useMemo(() => {
    const staticMeta = CATEGORY_META[selectedCategory as keyof typeof CATEGORY_META];
    if (staticMeta) {
      const count = selectedCategory === 'all' 
        ? products.length 
        : products.filter(p => p.category === selectedCategory).length;
      return { ...staticMeta, count };
    }
    
    const count = products.filter(p => p.category === selectedCategory).length;
    return {
      taglineAr: `معرض ${selectedCategory} المتميز والأصيل`,
      taglineEn: `The exclusive ${selectedCategory} collection`,
      descAr: `استكشف مقتنيات قسم ${selectedCategory} المختارة بعناية لتلبية تطلعاتكم الرفيعة بجودة لا تضاهى.`,
      descEn: `Explore the carefully curated selection in ${selectedCategory} department, crafted to meet your high-end desires.`,
      bgGradient: "from-neutral-900/40 via-[#0a0f0d]/90 to-[#030605]",
      icon: "widgets",
      count
    };
  }, [selectedCategory, products]);

  // Helper: Get product price considering active special offers
  const getProductEffectivePrice = (product: Product) => {
    if (product.sale_price && String(product.sale_price).trim().length > 0) {
      return product.sale_price;
    }
    return product.price;
  };

  // Helper: parse string price like "1500 ر.س" to a raw number
  const parsePriceToNumber = (val: number | string): number => {
    if (typeof val === 'number') return val;
    let cleanStr = val;
    // Support eastern Arabic numerals (e.g. ٥٠٠)
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    for (let i = 0; i < 10; i++) {
      cleanStr = cleanStr.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    }
    cleanStr = cleanStr.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper: parse technical specs into a list of items
  const parseSpecsToList = (specsStr: string | undefined | null): string[] => {
    if (!specsStr) return [];
    
    // Replace standard list numbers at start of lines or words with line breaks
    // For example: "1. spec 2. spec" or "١. spec ٢. spec" or "1- spec 2- spec"
    let normalized = specsStr;
    
    // Replace numbering like "1.", "1-", "1)" or Arabic "١.", "١-", "١)" at the beginning of segments
    // We add a line break before any number sequence to split it
    normalized = normalized.replace(/(\s+|^)([0-9]+|[٠-٩]+)[\.\-\)]\s*/g, '\n');
    
    // Replace other bullet styles with newlines
    normalized = normalized.replace(/[\u2022\u2023\u25E6\u2043\u2219•*]+/g, '\n');
    
    // Split by newlines, semicolons (English/Arabic), commas (English/Arabic), or isolated dashes " - "
    // Note: avoid splitting dashes inside words like "Type-C" or "S-Class", so only " - " with space(s) around it
    const items = normalized.split(/\r?\n|[;؛]|[,،]|\s+\-\s+|\s+\–\s+/);
    
    return items
      .map(item => {
        let trimmed = item.trim();
        // Remove any remaining leading bullet points, dashes, numbers, dots, or symbols from the start of the spec item
        trimmed = trimmed.replace(/^[-*•\s\d\.٠-٩\)\-\/]+/, '').trim();
        return trimmed;
      })
      .filter(Boolean);
  };

  // Helper: render product price exactly as requested
  const renderProductPriceInline = (product: Product, customClass?: string) => {
    const isSpecial = product.sale_price && String(product.sale_price).trim().length > 0;
    if (isSpecial) {
      return (
        <span className={customClass || "text-primary font-bold font-sans"}>
          <span className="line-through text-muted-gray opacity-75 font-normal">{product.price}</span> | <span className="text-red-600 font-bold">{product.sale_price}</span>
        </span>
      );
    }
    return (
      <span className={customClass || "text-primary font-bold font-sans"}>
        {formatPrice(product.price)}
      </span>
    );
  };

  // Helper: Currency standard conversion (Base price is in USD, converted to SAR (*3.75) or YER (*250))
  // If price is already a string (such as when retrieved from Google Sheet), display it exactly as is
  const formatPrice = (usdPrice: number | string) => {
    if (typeof usdPrice === 'string') {
      return usdPrice;
    }
    if (currency === 'SAR') {
      const converted = (usdPrice * 3.75).toFixed(2);
      return lang === 'ar' ? `${converted} ر.س` : `${converted} SAR`;
    } else {
      const converted = (usdPrice * 250).toFixed(0);
      return lang === 'ar' ? `${converted} ر.ي` : `${converted} YER`;
    }
  };

  // Helper to format invoice totals dynamically based on the items present in the shopping cart
  const formatCartTotal = (totalValue: number) => {
    const hasYemeni = cart.some(item => typeof item.product.price === 'string' && (item.product.price.includes('ر.ي') || item.product.price.includes('YER')));
    const hasSaudi = cart.some(item => typeof item.product.price === 'string' && (item.product.price.includes('ر.س') || item.product.price.includes('SAR')));
    
    if (hasYemeni) {
      return lang === 'ar' ? `${totalValue.toFixed(0)} ر.ي` : `${totalValue.toFixed(0)} YER`;
    }
    if (hasSaudi) {
      return lang === 'ar' ? `${totalValue.toFixed(2)} ر.س` : `${totalValue.toFixed(2)} SAR`;
    }
    return formatPrice(totalValue);
  };

  // Helper to get currency suffix/prefix string from a product's price
  const getPriceCurrency = (price: number | string): string => {
    if (typeof price === 'number') {
      return currency === 'SAR' ? (lang === 'ar' ? 'ر.س' : 'SAR') : (lang === 'ar' ? 'ر.ي' : 'YER');
    }
    if (price.includes('ر.س') || price.includes('SAR') || price.includes('السعودي')) {
      return lang === 'ar' ? 'ر.س' : 'SAR';
    }
    if (price.includes('ر.ي') || price.includes('YER') || price.includes('اليمني')) {
      return lang === 'ar' ? 'ر.ي' : 'YER';
    }
    const letters = price.replace(/[\d.\s]/g, '');
    return letters || (currency === 'SAR' ? 'ر.س' : 'ر.ي');
  };

  // Cart functional logic
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      } else {
        return [...prev, { product, quantity }];
      }
    });
    addToast(lang === 'ar' ? `تمت إضافة ${product.nameAr} إلى السلة` : `${product.nameEn} added to your cart`);
  };

  const handleSellItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellItemName.trim() || !sellSellerName.trim() || !sellPhone.trim() || !sellPrice.trim() || !sellLocation.trim()) {
      addToast(lang === 'ar' ? 'الرجاء تعبئة جميع الحقول المطلوبة!' : 'Please fill all requested fields!');
      return;
    }
    
    const generatedId = `INV-SELL-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice: SellInvoice = {
      id: generatedId,
      itemName: sellItemName,
      sellerName: sellSellerName,
      phone: sellPhone,
      price: sellPrice,
      location: sellLocation,
      reason: sellReason || (lang === 'ar' ? 'لا يوجد سبب محدد' : 'Not specified'),
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      customerEmail: firebaseUser?.email || 'guest@smartstore.com',
      createdAt: new Date().toISOString()
    };

    setSellInvoices(prev => [newInvoice, ...prev]);

    if (firebaseUser) {
      addDoc(collection(db, 'sellInvoices'), { ...newInvoice }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, 'sellInvoices');
      });
    }
    
    const msg = lang === 'ar' 
      ? 'تم صياغة الفاتورة وإدراج طلبك بنجاح! تواصل مع صاحب المتجر لتأكيدها.' 
      : 'Invoice formatted & added successfully! Contact owner to verify it.';
    addToast(msg);

    // Reset form
    setSellItemName('');
    setSellSellerName('');
    setSellPhone('');
    setSellPrice('');
    setSellLocation('');
    setSellReason('');

    // Generate WhatsApp text to share directly
    const whatsappMsg = lang === 'ar' 
      ? `*✨ فاتورة عرض قطعة للبيع - متجر سمارت ✨*\n\n` +
        `*📋 بيانات السلعة والعميل:*\n` +
        `---------------------------------\n` +
        `• *📦 اسم القطعة المعروضة:* ${newInvoice.itemName}\n` +
        `• *👤 اسم العميل (البائع):* ${newInvoice.sellerName}\n` +
        `• *📞 رقم الجوال:* ${newInvoice.phone}\n` +
        `• *💰 السعر المطلوب:* ${newInvoice.price}\n` +
        `• *📍 الموقع المقيم فيه:* ${newInvoice.location}\n` +
        `• *❓ سبب البيع:* ${newInvoice.reason}\n` +
        `---------------------------------\n` +
        `• *🧾 رقم الفاتورة الآلي:* ${newInvoice.id}\n` +
        `• *⏰ تاريخ العرض:* ${newInvoice.date}\n\n` +
        `⭐ أرجو مراجعة الفاتورة والموافقة على عرض القطعة في متجركم.`
      : `*✨ Sales Consignment Invoice - SMART STORE ✨*\n\n` +
        `*📋 Seller & Item Details:*\n` +
        `---------------------------------\n` +
        `• *📦 Item Name:* ${newInvoice.itemName}\n` +
        `• *👤 Seller Name:* ${newInvoice.sellerName}\n` +
        `• *📞 Phone:* ${newInvoice.phone}\n` +
        `• *💰 Price:* ${newInvoice.price}\n` +
        `• *📍 Location:* ${newInvoice.location}\n` +
        `• *❓ Reason for Selling:* ${newInvoice.reason}\n` +
        `---------------------------------\n` +
        `• *🧾 Invoice ID:* ${newInvoice.id}\n` +
        `• *⏰ Submission Date:* ${newInvoice.date}\n\n` +
        `⭐ Please review the invoice and approve listing this item on your store.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${storeWhatsapp}&text=${encodeURIComponent(whatsappMsg)}`;
    try {
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.log('Popup blocked but link button is available in UI.', err);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Calculated Order costs
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const priceVal = getProductEffectivePrice(item.product);
      return sum + (parsePriceToNumber(priceVal) * item.quantity);
    }, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (cartSubtotal * activeDiscount) / 100;
  }, [cartSubtotal, activeDiscount]);

  const shippingCost = 0; // standard flat free shipping

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount + shippingCost);
  }, [cartSubtotal, discountAmount, shippingCost]);

  // Promo Code checking
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const foundCoupon = activeCoupons.find(c => c.code.toUpperCase() === code);
    if (foundCoupon) {
      setActiveDiscount(foundCoupon.discount);
      const successMsg = lang === 'ar' 
        ? `تم تطبيق كوبون الخصم بنجاح بنسبة ${foundCoupon.discount}٪` 
        : `Successfully applied ${foundCoupon.discount}% discount promo code!`;
      setCouponMsg({ text: successMsg, isError: false });
      addToast(successMsg);
    } else {
      setCouponMsg({ text: d.invalidPromo, isError: true });
    }
  };

  // Checkout submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Format products list fit for human reading
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${year}/${month}/${day}`;
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; // convert 0 to 12
    const formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;

    // Create order object for local memory
    const orderId = `SM-${Math.floor(1000 + Math.random() * 9000)}-SA`;
    const newOrder: Order = {
      id: orderId,
      items: [...cart],
      subtotal: cartSubtotal,
      discount: discountAmount,
      shipping: shippingCost,
      total: cartTotal,
      shippingDetails: { ...shippingForm },
      status: 'placed',
      date: formattedDate,
      time: formattedTime,
      createdAt: now.toISOString(),
      trackingNumber: orderId
    };

    // Calculate item count
    const totalItemsQty = cart.reduce((total, item) => total + item.quantity, 0);
    const subjectTitle = totalItemsQty > 1 ? 'طلب منتجات جديدة' : 'طلب منتج جديد';

    let productsListText = '';
    cart.forEach((item, idx) => {
      const pName = lang === 'ar' ? item.product.nameAr : item.product.nameEn;
      const price = getProductEffectivePrice(item.product);
      const formattedItemPrice = formatPrice(price);
      
      const numericPrice = parsePriceToNumber(price);
      const totalItemLinePrice = typeof price === 'string'
        ? `${(numericPrice * item.quantity).toFixed(price.includes('.') ? 2 : 0)} ${getPriceCurrency(price)}`
        : formatPrice(numericPrice * item.quantity);
      
      productsListText += `*🔹 ${idx + 1}. ${pName.trim()}*\n`;
      productsListText += `   🔸 الكمية: ${item.quantity} × السعر: ${formattedItemPrice}\n`;
      productsListText += `   💵 الإجمالي للقطعة: ${totalItemLinePrice}\n\n`;
    });

    // Format final text with awesome emojis for WhatsApp
    const invoiceText = 
      `*✨ متجر سمارت | SMART STORE ✨*\n` +
      `=========================\n\n` +
      `*🛍️ ${subjectTitle}*\n\n` +
      `*📦 أود طلب:*\n` +
      `${productsListText}` +
      `=========================\n` +
      `*💰 تفاصيل السعر والرسوم:*\n` +
      (discountAmount > 0 ? `• 🎁 قيمة الخصم: -${formatCartTotal(discountAmount)}\n` : '') +
      `• 🚚 التوصيل: ${lang === 'ar' ? 'مجاني داخل محافظة شبوة فقط' : 'Free delivery inside Shabwah province only'}\n` +
      `• *🧾 ${lang === 'ar' ? 'الاجــمـالـي :' : 'Total:'} ${formatCartTotal(cartTotal)}*\n\n` +
      `*📍 الموقع والمستلم المحفوظ في التطبيق:*\n` +
      `• 👤 الاسم: ${shippingForm.fullName}\n` +
      `• 🏠 الموقع الحالي: ${shippingForm.address}\n\n` +
      `*📞 رقم العميل للتواصل:* ${shippingForm.phone}\n` +
      `=========================\n` +
      `*⏰ تاريخ ووقت الطلب:* ${formattedDate} - ${formattedTime}\n` +
      `=========================\n` +
      `*⭐ شكراً لتسوقك من متجرنا - فاتورة طلب رقم ${orderId}*`;

    // Target WhatsApp Number
    const targetNumber = storeWhatsapp; // Default admin WhatsApp
    const encodedText = encodeURIComponent(invoiceText);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodedText}`;

    // Place the order locally
    setOrders(prev => [newOrder, ...prev]);

    // Save order details to Firestore
    try {
      const orderData = {
        id: orderId,
        items: cart.map(item => ({
          productId: item.product.id,
          nameAr: item.product.nameAr,
          nameEn: item.product.nameEn,
          price: item.product.price,
          quantity: item.quantity,
          product: { ...item.product }
        })),
        subtotal: cartSubtotal,
        discount: discountAmount,
        shipping: shippingCost,
        total: cartTotal,
        shippingDetails: { ...shippingForm },
        status: 'placed',
        date: formattedDate,
        time: formattedTime,
        createdAt: new Date().toISOString(),
        trackingNumber: newOrder.trackingNumber,
        customerEmail: firebaseUser?.email || 'guest@smartstore.com',
        customerName: firebaseUser?.displayName || 'Guest User'
      };
      
      await addDoc(collection(db, 'orders'), orderData);
      if (isAdmin || isSimulatingAdmin) {
        fetchAllOrders();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }

    setCart([]);
    setIsCheckingOut(false);
    setIsCartOpen(false);
    setActiveDiscount(0);
    setPromoCode('');
    setCouponMsg(null);
    setCurrentTab('history');

    // Launch WhatsApp redirect safely
    addToast(lang === 'ar' ? 'جاري تحويلك إلى واتساب لإتمام الطلب...' : 'Redirecting to WhatsApp to complete your order...');
    
    // Virtual link submission to bypass aggressive popup blocks
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 350);
  };

  // Searching query matches
  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      const hasName = (prod.nameAr && prod.nameAr.trim()) || (prod.nameEn && prod.nameEn.trim());
      const hasImage = prod.image && prod.image.trim();
      if (!hasName || !hasImage) return false;

      const matchQuery = 
        prod.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.nameAr.includes(searchQuery) ||
        prod.descriptionEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.descriptionAr.includes(searchQuery);
      
      const matchCategory = selectedCategory === 'all' || prod.category === selectedCategory;
      
      return matchQuery && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Search page products (all products sorted newest first, filtered if query exists)
  const searchPageProducts = useMemo(() => {
    const validProducts = products.filter(prod => {
      const hasName = (prod.nameAr && prod.nameAr.trim()) || (prod.nameEn && prod.nameEn.trim());
      const hasImage = prod.image && prod.image.trim();
      return hasName && hasImage;
    });
    const sorted = [...validProducts].sort((a, b) => Number(b.id) - Number(a.id));
    if (!searchQuery.trim()) {
      return sorted;
    }
    return sorted.filter(prod => {
      const q = searchQuery.toLowerCase().trim();
      return prod.nameEn.toLowerCase().includes(q) ||
        prod.nameAr.includes(q) ||
        prod.descriptionEn.toLowerCase().includes(q) ||
        prod.descriptionAr.includes(q);
    });
  }, [products, searchQuery]);

  if (authLoading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#030605]' : 'bg-[#f8faf8]'} flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans transition-colors duration-300`}>
        {/* Subtle glowing orbs */}
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full ${theme === 'dark' ? 'bg-emerald-600/5 blur-[120px]' : 'bg-emerald-600/3 blur-[90px]'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full ${theme === 'dark' ? 'bg-amber-500/5 blur-[120px]' : 'bg-amber-500/3 blur-[90px]'}`} />
        
        <div className="relative flex flex-col items-center max-w-sm w-full text-center space-y-6 z-10 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className={`w-24 h-24 rounded-full p-[1px] bg-gradient-to-b ${theme === 'dark' ? 'from-amber-400/30' : 'from-amber-400/20'} to-transparent flex items-center justify-center`}>
              <img 
                src="https://i.postimg.cc/1t9gfhwc/Photoroom-20250118-231447-(1).png" 
                alt="Smart Store Logo" 
                className={`w-20 h-20 object-contain ${theme === 'dark' ? 'drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.1)]'}`}
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Spinning Golden loading ring */}
            <div className="absolute -inset-1.5 rounded-full border border-amber-500/10 border-t-amber-500 animate-spin" style={{ animationDuration: '1.5s' }} />
          </motion.div>
          
          <div className="space-y-2 font-sans">
            <h1 className={`text-xl font-bold font-sans tracking-wider ${theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'}`}>
              {lang === 'ar' ? 'متجر سمارت' : 'SMART STORE'}
            </h1>
            <p className={`text-xs font-sans tracking-widest uppercase ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {lang === 'ar' ? 'جاري تحميل التجربة الفاخرة...' : 'Loading Luxury Experience...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#030605] text-neutral-200' : 'bg-[#f8faf8] text-neutral-800'} flex flex-col justify-between p-6 select-none relative overflow-hidden transition-colors duration-300 font-sans`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Decorative background gradients */}
        <div className={`absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b ${theme === 'dark' ? 'from-[#007d54]/10' : 'from-[#007d54]/5'} via-transparent to-transparent pointer-events-none`} />
        <div className={`absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full ${theme === 'dark' ? 'bg-[#007d54]/5 blur-[150px]' : 'bg-[#007d54]/3 blur-[120px]'} pointer-events-none`} />
        <div className={`absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full ${theme === 'dark' ? 'bg-amber-500/5 blur-[130px]' : 'bg-amber-500/3 blur-[100px]'} pointer-events-none`} />
        
        {/* Top Header - Controls */}
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center z-10 font-sans">
          <div className="flex items-center gap-2 font-sans">
            <img 
              src="https://i.postimg.cc/1t9gfhwc/Photoroom-20250118-231447-(1).png" 
              alt="Smart Store Logo" 
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className={`text-sm font-bold tracking-wider ${theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'} font-sans`}>
              {lang === 'ar' ? 'متجر سمارت' : 'SMART STORE'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 font-sans">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 text-xs font-semibold font-sans cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300' 
                  : 'bg-black/5 hover:bg-black/10 border-neutral-300 text-neutral-700'
              }`}
              title={theme === 'light' ? (lang === 'ar' ? 'تفعيل الوضع الداكن' : 'Dark Mode') : (lang === 'ar' ? 'تفعيل الوضع الفاتح' : 'Light Mode')}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === 'ar' ? 'الوضع الفاتح' : 'Light Mode'}</span>
                </>
              )}
            </button>

            {/* Language Toggle Button */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 text-xs font-semibold font-sans cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300' 
                  : 'bg-black/5 hover:bg-black/10 border-neutral-300 text-neutral-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>

        {/* Middle Section - Elegant Login Card */}
        <div className="w-full max-w-md mx-auto my-auto z-10 py-4 sm:py-6 font-sans">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`backdrop-blur-xl border rounded-3xl p-8 sm:p-10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.4)] text-center relative overflow-hidden transition-all duration-300 font-sans ${
              theme === 'dark' 
                ? 'bg-neutral-900/45 border-white/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)]' 
                : 'bg-white/85 border-[#007d54]/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.06)]'
            }`}
          >
            {/* Glossy top overlay line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            
            <div className="space-y-8 relative z-10 font-sans">
              {/* App Icon/Logo */}
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 to-[#007d54] opacity-30 blur-md group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                  <div className={`relative w-28 h-28 rounded-full flex items-center justify-center p-2 border transition-all duration-300 ${
                    theme === 'dark' ? 'bg-black border-white/20' : 'bg-white border-neutral-200 shadow-sm'
                  }`}>
                    <img 
                      src="https://i.postimg.cc/1t9gfhwc/Photoroom-20250118-231447-(1).png" 
                      alt="Smart Store" 
                      className="w-24 h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3 font-sans">
                <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug transition-colors duration-300 font-sans ${
                  theme === 'dark' ? 'text-neutral-100' : 'text-neutral-900'
                }`}>
                  {lang === 'ar' ? 'مرحباً بك في متجر سمارت' : 'Welcome to Smart Store'}
                </h2>
                <p className={`text-xs sm:text-sm leading-relaxed max-w-xs mx-auto transition-colors duration-300 font-sans ${
                  theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  {lang === 'ar' 
                    ? 'يرجى تسجيل الدخول باستخدام حساب جوجل الخاص بك لاستعراض المعرض الحصري والمنتجات الفاخرة والاستفاده من عروضنا.' 
                    : 'Please sign in with your Google account to explore our exclusive catalog, luxury items, and benefit from custom offers.'}
                </p>
              </div>

              {/* Divider */}
              <div className="relative flex py-2 items-center font-sans">
                <div className={`flex-grow border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}></div>
                <span className={`flex-shrink mx-4 text-[10px] uppercase tracking-widest font-sans transition-colors duration-300 ${
                  theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                }`}>
                  {lang === 'ar' ? 'بوابة التحقق الآمنة' : 'Secure Authorization Gateway'}
                </span>
                <div className={`flex-grow border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}></div>
              </div>

              {/* Action Button - Google Login */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                    addToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Successfully signed in!');
                  } catch (err: any) {
                    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
                      setShowDomainErrorModal(true);
                    } else if (err?.code === 'auth/popup-closed-by-user') {
                      addToast(lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول' : 'Sign-in window was closed');
                    } else {
                      addToast(lang === 'ar' ? 'فشل تسجيل الدخول بجوجل' : 'Google Sign-In failed');
                    }
                  }
                }}
                className={`w-full flex items-center justify-center gap-3 font-extrabold text-sm py-4 px-6 rounded-2xl transition-all cursor-pointer border font-sans ${
                  theme === 'dark'
                    ? 'bg-white hover:bg-neutral-100 text-black shadow-[0_4px_20px_rgba(255,255,255,0.15)] border-neutral-200/20'
                    : 'bg-black hover:bg-neutral-900 text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] border-neutral-800/20'
                }`}
              >
                {/* Google Icon G SVG */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span className="font-sans">{lang === 'ar' ? 'الدخول الآمن باستخدام جوجل' : 'Secure Login with Google'}</span>
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Bottom Footer - Premium Brand Details */}
        <div className={`w-full max-w-md mx-auto flex flex-col items-center gap-3 border-t ${theme === 'dark' ? 'border-white/5' : 'border-neutral-200'} pt-4 pb-2 text-xs ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-600'} z-10 font-sans transition-colors duration-300`}>
          {/* Copyright */}
          <p className="text-[10px] text-neutral-500/80 text-center font-sans">
            &copy; {new Date().getFullYear()} {lang === 'ar' ? 'متجر سمارت.' : 'Smart Store.'} {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>

          {/* Centered Row with Shield Check & Location */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-sans text-center">
            <span className="flex items-center gap-1 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500/80" />
              <span className="font-sans">{lang === 'ar' ? 'حماية تامة للبيانات' : 'Secure Data Encryption'}</span>
            </span>
            <span className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-300'} hidden sm:inline`} />
            <span className={`font-sans ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-700'}`}>
              {lang === 'ar' ? 'شبوة - الصعيد - يشبم' : 'Shabwah - Al-Saeed - Yashbum'}
            </span>
          </div>

          {/* Centered Developer Credit */}
          <div className="text-xs font-semibold text-amber-500/95 tracking-wide text-center font-sans">
            {lang === 'ar' ? 'تطوير : معاذ باخريش' : 'Developed by : Moaath Bakhrish'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-background text-on-background pb-32 flex flex-col font-sans transition-colors duration-300`} 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      id="main-container"
    >
      {/* Toast Alert Drawer */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-max max-w-sm px-4">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="bg-charcoal text-pure-white text-xs py-3 px-5 rounded-full shadow-lg font-medium flex items-center gap-2 border border-outline/20"
            >
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Immersive Side Drawer Navigation (Artisanal Boutique Sections) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[150] overflow-hidden flex" id="smart-side-drawer-mask">
            {/* Backdrop blur with dark premium sheen */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Sliding Sidebar panel */}
            <motion.div 
              initial={{ x: lang === 'ar' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`absolute top-0 bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-full max-w-[340px] sm:max-w-[380px] bg-background shadow-2xl flex flex-col z-10 overflow-hidden border-r border-outline-variant/50`}
              id="smart-side-drawer"
            >
              {/* Drawer Top Header (Luxury branding with closing anchor) */}
              <div className="p-6 border-b border-surface-container-high flex justify-between items-center bg-surface">
                <div className="text-start">
                  <h3 className="text-lg sm:text-2xl font-bold text-charcoal">
                    <span>{lang === 'ar' ? 'متجر سمارت' : 'SMART STORE Categories'}</span>
                  </h3>
                  <p className="text-[10px] font-medium text-muted-gray tracking-wider uppercase font-sans mt-0.5">
                    {lang === 'ar' ? 'أقسام المقتنيات النخبوية والفريدة' : 'Premium Collector Exhibition'}
                  </p>
                </div>
                
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-9 h-9 rounded-full border border-outline-variant/60 hover:bg-surface-container flex items-center justify-center text-charcoal hover:text-primary transition-all active:scale-90"
                  title={lang === 'ar' ? 'إغلاق القائمة' : 'Close Menu'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic categories list for high-end boutique display */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-none bg-surface-container-lowest text-start">
                <span className="text-[10px] font-bold text-muted-gray uppercase tracking-widest block mb-1">
                  {lang === 'ar' ? 'الأقسام الفخمة المتوفرة حالياً' : 'Available Collector Categories'}
                </span>

                {[
                  { key: 'all', labelAr: d.categoryAll, labelEn: 'All Categories' },
                  ...availableCategories.map(c => ({ key: c, labelAr: c, labelEn: c }))
                ].map(cat => {
                  const meta = CATEGORY_META[cat.key as keyof typeof CATEGORY_META] || CATEGORY_META.all;
                  const isCurrent = selectedCategory === cat.key && currentTab === 'shop' && !isCheckingOut;
                  
                  return (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setSelectedCategory(cat.key);
                        setCurrentTab('shop');
                        setIsCheckingOut(false);
                        setIsDrawerOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        addToast(
                          lang === 'ar'
                            ? `تم فتح قسم: ${cat.labelAr}`
                            : `Navigated to ${cat.labelEn}`
                        );
                      }}
                      className={`w-full text-end p-3.5 rounded-card border transition-all flex items-center gap-3 relative overflow-hidden group cursor-pointer ${
                        isCurrent 
                          ? 'bg-[#007d54]/5 border-primary shadow-sm text-primary' 
                          : 'bg-pure-white border-outline-variant/60 hover:border-primary/50 text-charcoal'
                      }`}
                    >
                      {/* Accent color bar if selected */}
                      {isCurrent && (
                        <div className={`absolute top-0 bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1 bg-primary`} />
                      )}

                      {/* Material Icon element */}
                      <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isCurrent ? 'bg-primary text-white' : 'bg-surface border border-outline-variant/30 text-charcoal/80 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}>
                        <span className="material-symbols-outlined text-[18px] select-none leading-none">{meta.icon}</span>
                      </div>

                      {/* Details block */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center items-start text-start">
                        <div className="flex items-center gap-1.5 justify-between w-full">
                          <span className={`font-bold text-xs sm:text-sm leading-tight transition-colors ${isCurrent ? 'text-primary' : 'text-charcoal group-hover:text-primary'}`}>
                            {lang === 'ar' ? cat.labelAr : cat.labelEn}
                          </span>
                          
                          {/* Count bubble */}
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                             isCurrent ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-muted-gray'
                          }`}>
                            {cat.key === 'all' ? products.length : products.filter(p => p.category === cat.key).length}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-gray line-clamp-1 leading-normal font-sans mt-0.5">
                          {lang === 'ar' ? meta.taglineAr : meta.taglineEn}
                        </p>
                      </div>

                      {/* Elite tiny chevron pointer */}
                      <span className={`material-symbols-outlined text-sm text-muted-gray/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all select-none rtl:rotate-180`}>
                        chevron_right
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer footer (Options shortcuts) */}
              <div className="p-5 border-t border-surface-container-high bg-surface space-y-3.5">
                {/* Embedded quick Language Switcher inside the drawer */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-gray font-medium font-sans">
                    {lang === 'ar' ? 'تخصيص لغة العرض' : 'Atelier Interface Language'}
                  </span>
                  
                  <button
                    onClick={() => {
                      setLang(p => p === 'en' ? 'ar' : 'en');
                      addToast(lang === 'ar' ? 'Language switched to English' : 'تم تحويل لغة واجهة التطبيق');
                    }}
                    className="px-3 py-1.5 bg-[#007d54]/10 hover:bg-[#007d54]/20 text-primary font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{lang === 'en' ? 'العربية' : 'English'}</span>
                  </button>
                </div>

                {/* Special Offers card link */}
                <div 
                  onClick={() => {
                    setCurrentTab('account');
                    setIsCheckingOut(false);
                    setIsDrawerOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 flex items-center gap-2.5 cursor-pointer transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs">
                    <span className="material-symbols-outlined text-[16px] select-none">local_offer</span>
                  </div>
                  <div className="flex-1 min-w-0 text-start">
                    <h5 className="font-bold text-red-600 text-[11px] truncate leading-tight">
                      {lang === 'ar' ? 'العروض الحصرية الخاصة' : 'Exclusive Special Offers'}
                    </h5>
                    <p className="text-[9px] text-muted-gray truncate font-sans">
                      {lang === 'ar' ? 'تصفح عروض التخفيضات المميزة' : 'Explore luxury items on discount'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-muted-gray select-none rtl:rotate-180">
                    arrow_forward_ios
                  </span>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-sans text-muted-gray" dir="rtl">
                    جميع الحقوق محفوظة - متجر سمارت - @2026
                  </p>
                  <p className="text-[10px] font-sans text-muted-gray mt-1">
                    تطوير : معاذ باخريش
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top AppBar */}
      <header className="w-full sticky top-0 z-[45] bg-background border-b border-luxe-border flex justify-between items-center px-4 sm:px-5 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="hover:opacity-80 transition-opacity active:scale-95 transition-transform text-primary flex items-center justify-center p-1.5 rounded-full hover:bg-surface-container"
            title={lang === 'ar' ? 'قائمة الأقسام والمعارض' : 'Category Menu'}
            id="burger-menu-btn"
          >
            <span className="material-symbols-outlined select-none text-[26px]">menu</span>
          </button>
          <h1 
            onClick={() => { setCurrentTab('shop'); setIsCheckingOut(false); }}
            className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-charcoal cursor-pointer active:scale-95 transition-transform whitespace-nowrap select-none"
          >
            {lang === 'ar' ? 'متجر سمارت' : 'SMART STORE'}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language Toggle Button */}
          <button 
            onClick={() => {
              const nextLang = lang === 'en' ? 'ar' : 'en';
              setLang(nextLang);
              addToast(nextLang === 'ar' ? 'تم تفعيل اللغة العربية' : 'English activated');
            }}
            className="px-2.5 py-1 rounded-full border border-outline-variant font-sans text-xs font-bold text-charcoal hover:bg-surface-container transition-all active:scale-95 cursor-pointer h-[28px] sm:h-[34px] flex items-center justify-center min-w-[32px] sm:min-w-[38px] select-none"
            title={lang === 'ar' ? 'Switch to English' : 'تحويل للغة العربية'}
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>

          {/* Search Button */}
          <button 
            onClick={() => setCurrentTab('search')}
            className={`hover:opacity-80 flex items-center justify-center p-1 rounded-full ${currentTab === 'search' ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            <span className="material-symbols-outlined select-none">search</span>
          </button>
          {/* Shopping Cart Button with dynamic count */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="text-on-surface-variant hover:opacity-80 relative flex items-center justify-center p-1"
          >
            <span className="material-symbols-outlined select-none">shopping_cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-pure-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
          {/* Night Mode / Day Mode toggle instead of Sign In */}
          <button 
            onClick={() => {
              const nextTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(nextTheme);
              addToast(nextTheme === 'dark' ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع النهاري ☀️');
            }}
            className="ml-1 sm:ml-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-outline-variant text-[11px] sm:text-xs text-charcoal hover:bg-surface-container transition-colors flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 transform duration-150 cursor-pointer min-w-[70px] sm:min-w-[82px] h-[28px] sm:h-[34px]"
            title={theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'}
          >
            {theme === 'light' ? (
              <>
                <span className="material-symbols-outlined text-[16px] sm:text-[18px] select-none text-amber-600 leading-none">light_mode</span>
                <span className="text-[11px] sm:text-[12px] font-medium leading-none select-none">{lang === 'ar' ? 'نهاري' : 'Day'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px] sm:text-[18px] select-none text-amber-400 leading-none">dark_mode</span>
                <span className="text-[11px] sm:text-[12px] font-medium leading-none select-none">{lang === 'ar' ? 'ليلي' : 'Night'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Responsive Body View */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-5">
        
        {/* SHOP TAB: Bento Grid Layout */}
        {currentTab === 'shop' && !isCheckingOut && (
          <div className="space-y-6" id="bento-shop-view">
            
            {sheetError && (
              <div className="bg-[#feeaeb] dark:bg-[#2c1516] border border-red-200 dark:border-red-900/50 rounded-card p-5 sm:p-6 shadow-soft text-start" id="sheet-integration-error-banner">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
                    <span className="material-symbols-outlined select-none text-[24px]">warning</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-400">
                      {lang === 'ar' ? 'تنبيه: خطأ في ربط Google Sheets' : 'Alert: Google Sheets Integration Error'}
                    </h3>
                    <p className="text-xs sm:text-sm text-red-900 dark:text-red-300 font-medium font-sans">
                      {sheetError.message}
                    </p>
                    {sheetError.details && (
                      <div className="bg-red-50/50 dark:bg-red-950/30 border border-red-100 dark:border-red-950/50 rounded-xl p-3 font-mono text-[11px] text-red-800 dark:text-red-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        <strong>{lang === 'ar' ? 'التفاصيل الفنية للخطأ:' : 'Technical Error Details:'}</strong>
                        <br />
                        {sheetError.details}
                      </div>
                    )}
                    {sheetError.instructions && (
                      <div className="text-xs space-y-1.5 text-neutral-700 dark:text-neutral-300 pt-1.5 border-t border-red-200/50 dark:border-red-900/30">
                        <span className="font-bold text-red-800 dark:text-red-400 block mb-1">
                          {lang === 'ar' ? 'كيفية حل هذه المشكلة بسهولة:' : 'How to solve this issue:'}
                        </span>
                        <p className="leading-relaxed">
                          {lang === 'ar' ? '١. افتح جدول بيانات جوجل المربوط بالمتجر، ثم اذهب إلى ' : '1. Open your linked Google Spreadsheet, then navigate to '}
                          <strong>{lang === 'ar' ? 'الامتدادات (Extensions) -> Apps Script' : 'Extensions -> Apps Script'}</strong>.
                        </p>
                        <p className="leading-relaxed">
                          {lang === 'ar' 
                            ? '٢. ابحث في ملف الأكواد عن دالة باسم `.setHeaders(...)` مقترنة بـ `ContentService.createTextOutput` (غالباً في السطر 57).'
                            : '2. In the code file, find any call to `.setHeaders(...)` associated with `ContentService.createTextOutput` (typically near line 57).'}
                        </p>
                        <p className="leading-relaxed">
                          {lang === 'ar' 
                            ? '٣. قم بحذف جزء `.setHeaders(...)` بالكامل ليصبح الكود كالتالي:'
                            : '3. Delete the `.setHeaders(...)` chain completely, making it look like this:'}
                          <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-1 font-mono text-[10px] text-neutral-800 dark:text-neutral-200">
                            return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
                          </code>
                        </p>
                        <p className="leading-relaxed">
                          {lang === 'ar'
                            ? '٤. اضغط على زر "حفظ" (Save) ثم "نشر" (Deploy) -> "نشر جديد" (New Deployment). اختر "تطبيق ويب" (Web App)، واضبط التنفيذ ليكون باسمك والوصول لـ "أي شخص" (Anyone)، ثم اضغط "نشر".'
                            : '4. Save and click "Deploy" -> "New Deployment". Choose "Web App", set execution as "Me", access as "Anyone", and click deploy.'}
                        </p>
                        <p className="leading-relaxed font-semibold text-primary">
                          {lang === 'ar'
                            ? '٥. بعد الانتهاء، قم بتحديث هذه الصفحة لعرض مقتنياتك الحية مباشرة!'
                            : '5. Finally, refresh this page to see your live catalog synchronized!'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Category Shelf filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" id="categories-scroller">
              {[
                { key: 'all', label: d.categoryAll },
                ...availableCategories.map(c => ({ key: c, label: c }))
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap tracking-wide transition-all ${
                    selectedCategory === cat.key 
                      ? 'bg-primary text-pure-white shadow-md' 
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Premium Interactive Bento Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="bento-matrix">
              
              {/* HERO BANNER BLOCK (Spans full width or columns depending on filter) */}
              {selectedCategory === 'all' && (() => {
                const activeProduct = latestProducts[currentSlideIndex] || products[0] || PRODUCTS[0];
                if (!activeProduct) {
                  return (
                    <div 
                      className="col-span-2 md:col-span-3 lg:col-span-4 bg-charcoal rounded-card shadow-soft relative overflow-hidden h-[340px] sm:h-[380px] p-6 sm:p-10 flex flex-col justify-end border border-surface-container-highest"
                      id="hero-bento-card-empty"
                    >
                      <div className="absolute inset-0 z-0 bg-[#0a0f0d]/95"></div>
                      <div className="absolute top-1/2 -left-12 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/10 blur-[90px] pointer-events-none z-0"></div>
                      <div className={`relative z-10 space-y-3.5 max-w-lg w-full flex flex-col items-start text-start`}>
                        <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {lang === 'ar' ? 'مزامنة حية من الشيت' : 'Live Sheet Integration'}
                        </div>
                        <h2 className="font-bold text-2xl sm:text-3xl text-[#4edea3] leading-tight tracking-tight">
                          {lang === 'ar' ? 'معرض المقتنيات الفاخرة' : 'Atelier Collector Gallery'}
                        </h2>
                        <p className="text-white/80 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {lang === 'ar' 
                            ? 'معرض ذكي يتم تغذيته وتحديثه تلقائياً من جدول بيانات شيت جوجل في الوقت الفعلي.'
                            : 'An elegant store powered in real-time by a Google Sheet database spreadsheet.'}
                        </p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div 
                    className="col-span-2 md:col-span-3 lg:col-span-4 bg-pure-white rounded-card shadow-soft relative overflow-hidden h-[340px] sm:h-[380px] p-6 sm:p-10 flex flex-col justify-end border border-surface-container-highest"
                    id="hero-bento-card"
                  >
                    {/* Absolute badge in the top-right corner containing 'Latest Drops / أحدث المنتجات' */}
                    <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-primary/30 border border-primary/40 text-[#6ffbbe] text-xs font-bold tracking-wide inline-flex items-center gap-1.5 bg-neutral-900/60 backdrop-blur-md select-none">
                      <span>{lang === 'ar' ? 'أحدث المنتجات' : 'Latest Drops'}</span>
                    </div>

                    {/* Synchronous sliding background image */}
                    <div className="absolute inset-0 z-0">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeProduct.id}
                          initial={{ opacity: 0, scale: 1.03 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                          className="absolute inset-0 w-full h-full"
                        >
                          <img 
                            src={activeProduct.image || undefined} 
                            alt={lang === 'ar' ? activeProduct.nameAr : activeProduct.nameEn} 
                            className="w-full h-full object-cover select-none object-center"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className={`relative z-10 space-y-3.5 max-w-lg w-full flex flex-col items-start text-start`}>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeProduct.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.4 }}
                          className={`space-y-1.5 flex flex-col w-full items-start text-start`}
                        >
                          <h2 className="font-bold text-2xl sm:text-3xl text-[#4edea3] leading-tight tracking-tight">
                            {lang === 'ar' ? activeProduct.nameAr : activeProduct.nameEn}
                          </h2>
                          <p className="text-white/80 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                            {lang === 'ar' ? activeProduct.descriptionAr : activeProduct.descriptionEn}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[#6ffbbe] font-bold text-sm sm:text-base">
                              {formatPrice(activeProduct.price)}
                            </span>
                            <span className="text-white/50 text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full font-mono">
                              #{currentSlideIndex + 1} / {latestProducts.length}
                            </span>
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      <div className={`pt-2 flex flex-wrap gap-2.5 w-full justify-start`}>
                        <button 
                          onClick={() => {
                            setCurrentTab('exclusive_archive');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="bg-[#007d54] hover:bg-[#006c49] text-white px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 w-fit active:scale-95 transition-all shadow-md cursor-pointer select-none"
                        >
                          <span>{lang === 'ar' ? d.heroButtonAr : d.heroButtonEn}</span>
                          <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                        </button>

                        <button 
                          onClick={() => {
                            setSelectedProduct(activeProduct);
                            setActiveImageIdx(0);
                          }}
                          className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 w-fit active:scale-95 transition-all cursor-pointer select-none"
                        >
                          <span>{lang === 'ar' ? 'تفاصيل المنتج' : 'Product Details'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* PRODUCTS LISTING */}
              {(() => {
                return filteredProducts.map(product => {
                const labelText = lang === 'ar' ? 'منتج الأسبوع المميز' : 'Product of the Week';
                const hasSalePrice = product.sale_price && String(product.sale_price).trim().length > 0;
                
                return (
                  <section 
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setActiveImageIdx(0);
                    }}
                    className="col-span-1 bg-pure-white rounded-card p-4 shadow-soft flex flex-col gap-3 border border-surface-container/20 cursor-pointer hover:scale-[0.99] transition-all"
                    id={`product-card-${product.id}`}
                  >
                    <div className="aspect-square w-full rounded-xl bg-surface overflow-hidden relative">
                      <img 
                        alt={lang === 'ar' ? product.nameAr : product.nameEn} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                        src={product.image || undefined}
                        referrerPolicy="no-referrer"
                      />
                      {product.isNew && (
                        <span className="absolute top-2 left-2 bg-primary text-pure-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {lang === 'ar' ? 'جديد' : 'New'}
                        </span>
                      )}
                      {hasSalePrice && (
                        <span className="absolute top-2 right-2 bg-red-600 text-pure-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {lang === 'ar' ? 'عرض خاص' : 'Offer'}
                        </span>
                      )}
                    </div>
                    <div className={"text-start flex flex-col items-start"}>
                      <h3 className="font-label-lg text-charcoal truncate w-full">
                        {lang === 'ar' ? product.nameAr : product.nameEn}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap w-full justify-start mt-2">
                        {renderProductPriceInline(product, "text-primary font-bold text-xs sm:text-sm font-sans")}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-gray uppercase font-bold tracking-tight">
                      {product.labelEn ? (lang === 'ar' ? product.labelAr : product.labelEn) : labelText}
                    </p>
                  </section>
                );
              });
              })()}

              {/* Dynamic Empty Grid Checker if filtered */}
              {filteredProducts.length === 0 && (
                <div className="col-span-4 text-center py-20 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto text-muted-gray">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-charcoal">{lang === 'ar' ? 'عذراً، لم نجد أي متطابقات' : 'No items matched your query'}</h3>
                  <button 
                    onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                    className="text-primary font-bold text-xs underline"
                  >
                    {lang === 'ar' ? 'عرض كافة الخيارات' : 'Reset Category Filter'}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* EXCLUSIVE PRODUCTS ARCHIVE VIEW (CHRONOLOGICAL Drop: Newest to Oldest) */}
        {currentTab === 'exclusive_archive' && !isCheckingOut && (
          <div className="space-y-6 max-w-5xl mx-auto" id="exclusive-archive-view">
            
            {/* List Chronologically organized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestProducts.map((product, idx) => {
                const isItemNew = product.isNew || idx < 2; // top 2 are flagged or isNew
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    onClick={() => {
                      setSelectedProduct(product);
                      setActiveImageIdx(0);
                    }}
                    className="bg-pure-white rounded-card overflow-hidden border border-surface-container hover:shadow-soft transition-all group flex flex-col justify-between cursor-pointer"
                  >
                    <div className="relative">
                      {/* Image block */}
                      <div className="aspect-[4/3] w-full bg-surface overflow-hidden relative">
                        <img 
                          src={product.image || undefined} 
                          alt={lang === 'ar' ? product.nameAr : product.nameEn}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {isItemNew && (
                            <span className="bg-primary text-pure-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                              {lang === 'ar' ? 'حصري/جديد' : 'Exclusive Drop'}
                            </span>
                          )}
                          <span className="bg-charcoal/80 text-pure-white text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest">
                            {lang === 'ar' ? `قطعة #${product.id}` : `Piece #${product.id}`}
                          </span>
                        </div>
                      </div>

                      {/* Info & Metadata */}
                      <div className={`p-5 space-y-2 text-start`}>
                        <span className={`text-[10px] text-primary uppercase font-bold tracking-wider block text-start`}>
                          {product.category}
                        </span>

                        <h3 className={`font-bold text-charcoal text-base group-hover:text-primary transition-colors text-start`}>
                          {lang === 'ar' ? product.nameAr : product.nameEn}
                        </h3>

                        <p className={`text-xs text-muted-gray line-clamp-3 font-sans leading-relaxed text-start`}>
                          {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
                        </p>

                        {/* Artisan Craft Specifications snippets */}
                        <div className={`pt-2 flex flex-wrap gap-1.5 justify-start`}>
                          {(() => {
                            const specList = product.specs 
                              ? parseSpecsToList(product.specs)
                              : (lang === 'ar' ? product.specsAr : product.specsEn);
                            return specList.slice(0, 2).map((s, i) => (
                              <span key={i} className="text-[9px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full font-sans">
                                • {s}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className={`p-5 pt-0 border-t border-surface-container-high/60 mt-auto flex items-center justify-between`}>
                      <div className={"text-start flex flex-col items-start"}>
                        <span className={`text-[9px] text-muted-gray uppercase block tracking-wider text-start`}>{lang === 'ar' ? 'القيمة الحالية' : 'Archive Value'}</span>
                        <div className={`flex items-center gap-1.5 flex-wrap justify-start`}>
                          {renderProductPriceInline(product, "text-primary font-bold text-base font-sans")}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product, 1);
                        }}
                        className="bg-[#007d54] hover:bg-[#005235] text-pure-white px-4.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer select-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'شراء' : 'Buy'}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Quick Helper returning to main showcase */}
            <div className="text-center pt-8">
              <button 
                onClick={() => { setCurrentTab('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-6 py-3 border border-outline-variant rounded-full text-xs font-bold text-charcoal hover:bg-surface-container transition-colors shadow-sm select-none"
              >
                {lang === 'ar' ? 'العودة لجميع التشكيلات والمعرض الرئيسي' : 'Return to Showcase & Categories'}
              </button>
            </div>

          </div>
        )}

        {/* SEARCH TAB VIEW */}
        {currentTab === 'search' && !isCheckingOut && (
          <div className="space-y-6 max-w-3xl mx-auto" id="search-explorer-tab">
            {/* Structured modern search bar */}
            <div className="relative">
              <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-gray w-5 h-5" />
              <input 
                type="text"
                placeholder={d.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-pure-white border border-outline-variant rounded-full pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007d54] focus:border-transparent transition-all shadow-sm"
              />
            </div>

            {/* Search results dynamically displayed */}
            <div className="space-y-4">
              <p className="text-xs text-muted-gray font-sans">
                {searchQuery.trim() ? (
                  lang === 'ar' 
                    ? `نتائج البحث لـ "${searchQuery}" (${searchPageProducts.length} نتيجة):` 
                    : `Search results for "${searchQuery}" (${searchPageProducts.length} results):`
                ) : (
                  lang === 'ar'
                    ? 'جميع المنتجات (من الأحدث للأقدم):'
                    : 'All products (newest to oldest):'
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchPageProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setSelectedProduct(product);
                      setActiveImageIdx(0);
                    }}
                    className="bg-pure-white rounded-card overflow-hidden border border-surface-container hover:shadow-soft transition-all group flex flex-col justify-between cursor-pointer"
                  >
                    <div className="relative">
                      <div className="aspect-[4/3] w-full bg-surface overflow-hidden relative">
                        <img 
                          src={product.image || undefined} 
                          alt={lang === 'ar' ? product.nameAr : product.nameEn}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className={`p-4 space-y-1.5 text-start`}>
                        <span className={`text-[10px] text-primary uppercase font-bold tracking-wider block text-start`}>
                          {product.category}
                        </span>
                        <h3 className={`font-bold text-charcoal text-sm leading-snug group-hover:text-primary transition-colors text-start`}>
                          {lang === 'ar' ? product.nameAr : product.nameEn}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4 pt-0 flex justify-between items-center border-t border-surface-container-high/60 mt-auto">
                      <div className={"flex flex-col items-start text-start"}>
                        <div className={`flex items-center gap-1.5 flex-wrap justify-start`}>
                          {renderProductPriceInline(product, "text-primary font-bold text-sm font-sans")}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product, 1);
                        }}
                        className="bg-[#007d54] hover:bg-[#005235] text-pure-white px-3.5 py-1 rounded-full font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer select-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'شراء' : 'Buy'}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {searchPageProducts.length === 0 && (
                <div className="text-center py-10 bg-pure-white rounded-card border shadow-soft space-y-2">
                  <p className="text-sm text-charcoal font-bold">{lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matched results found'}</p>
                  <p className="text-xs text-muted-gray">{lang === 'ar' ? 'جرب البحث بكلمات أخرى أو تصفح الكتالوج بالكامل.' : 'Try other keywords or reset filter settings.'}</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* USER SELLING & CONSIGNMENT GATEWAY VIEW */}
        {currentTab === 'orders' && !isCheckingOut && (
          <div className="space-y-6 max-w-2xl mx-auto" id="sell-consignments-tab">
            
            {/* Elegant Instructions Card (بطاقة تعليمات) */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-card p-5 sm:p-6 space-y-4" id="sell-instructions-card">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#007d54]/10 rounded-xl text-[#007d54] shrink-0 mt-0.5">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
                    {lang === 'ar' ? 'كيف تعمل خدمة عرض القطع للبيع؟' : 'How does the Consignment service work?'}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-emerald-800 leading-relaxed font-normal">
                    {lang === 'ar'
                      ? 'هذه الخدمة مخصصة لمساعدتك في بيع ساعتك أو مقتنياتك للعملاء والمهتمين بكل أمان ومصداقية.'
                      : 'This service is dedicated to helping you sell your watch or items to clients and interested buyers safely and professionally.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-emerald-100/60">
                <div className="space-y-1">
                  <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007d54]"></span>
                    {lang === 'ar' ? '1. تعبئة البيانات' : '1. Fill Information'}
                  </div>
                  <p className="text-emerald-700 rtl:pr-3 ltr:pl-3 leading-relaxed text-xs sm:text-[13px] font-normal">
                    {lang === 'ar' 
                      ? 'أدخل تفاصيل القطعة بالإضافة لبيانات التواصل والمدينة وسعر البيع المتوقع.' 
                      : 'Enter the item details, contact details, residence, and expected selling price.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007d54]"></span>
                    {lang === 'ar' ? '2. المراجعة والتدقيق' : '2. Quality Check'}
                  </div>
                  <p className="text-emerald-700 rtl:pr-3 ltr:pl-3 leading-relaxed text-xs sm:text-[13px] font-normal">
                    {lang === 'ar' 
                      ? 'سيقوم فريقنا المختص بمراجعة الطلب والتحقق من حالة القطعة والملحقات المعروضة.' 
                      : 'Our specialized team will review the request and verify the condition of the item.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007d54]"></span>
                    {lang === 'ar' ? '3. التواصل وإتمام البيع' : '3. Finalize Sale'}
                  </div>
                  <p className="text-emerald-700 rtl:pr-3 ltr:pl-3 leading-relaxed text-xs sm:text-[13px] font-normal">
                    {lang === 'ar' 
                      ? 'سنتواصل معك عبر الواتساب لتأكيد الاستلام وعرضها في منصتنا للعملاء والمهتمين.' 
                      : 'We will contact you via WhatsApp to finalize, list, and promote it on our platform to clients and interested buyers.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Form & Real-time Live Invoice Preview Wrapper */}
            <div className="grid grid-cols-1 gap-6">
              
              {/* Form Card */}
              <div className="bg-pure-white rounded-card p-6 border border-surface-container-highest shadow-soft space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-surface-container-high">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-charcoal text-sm sm:text-base">
                    {lang === 'ar' ? 'نموذج معلومات السلعة المعروضة' : 'Consignment Information Form'}
                  </h3>
                </div>

                <form onSubmit={handleSellItemSubmit} className="space-y-4">
                  
                  {/* Item Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-primary" />
                      {lang === 'ar' ? 'اسم ونوع القطعة المعروضة للبيع *' : 'Item Name & Model *'}
                    </label>
                    <input 
                      type="text"
                      required
                      value={sellItemName}
                      onChange={(e) => setSellItemName(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: ساعة يد رولكس قديمة إصدار ذهبي' : 'e.g. vintage luxury timepiece gold bezel'}
                      className="w-full bg-surface-container-low border border-surface-container-highest p-3 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                    />
                  </div>

                  {/* Two columns: Customer Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                        <User className="w-4 h-4 text-primary" />
                        {lang === 'ar' ? 'اسمك الكامل كبائع للقطعة *' : 'Your Full Name *'}
                      </label>
                      <input 
                        type="text"
                        required
                        value={sellSellerName}
                        onChange={(e) => setSellSellerName(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: محمد' : 'e.g. Mohamed'}
                        className="w-full bg-surface-container-low border border-surface-container-highest p-3 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-primary" />
                        {lang === 'ar' ? 'رقم هاتفك للتواصل الفوري *' : 'Your Contact Phone *'}
                      </label>
                      <input 
                        type="tel"
                        required
                        value={sellPhone}
                        onChange={(e) => setSellPhone(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: 777777777' : 'e.g. 777777777'}
                        className="w-full bg-surface-container-low border border-surface-container-highest p-3 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                      />
                    </div>
                  </div>

                  {/* Two columns: Price & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-primary" />
                        {lang === 'ar' ? 'السعر المطلوب وعملة البيع *' : 'Desired Price & Currency *'}
                      </label>
                      <input 
                        type="text"
                        required
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: 1500 ريال سعودي أو 50 ألف يمني' : 'e.g. 1500 SAR / 200 USD'}
                        className="w-full bg-surface-container-low border border-surface-container-highest p-3 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        {lang === 'ar' ? 'مكان إقامتك وهل يتوفر شحن للقطعة؟ *' : 'Your Resident Location *'}
                      </label>
                      <input 
                        type="text"
                        required
                        value={sellLocation}
                        onChange={(e) => setSellLocation(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: اليمن - حضرموت' : 'e.g. Yemen - Hadramout'}
                        className="w-full bg-surface-container-low border border-surface-container-highest p-3 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                      />
                    </div>
                  </div>

                  {/* Reason for Selling */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      {lang === 'ar' ? 'سبب رغبتك في بيع القطعة والملحقات المتوفرة (اختياري)' : 'Reason for Selling & Extra Accessories (Optional)'}
                    </label>
                    <textarea
                      rows={2}
                      value={sellReason}
                      onChange={(e) => setSellReason(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: عدم الاستخدام الشخصي، والعلبة والضمان الأصلي متوفرين' : 'e.g. personal upgrade, original package and manual booklet are included'}
                      className="w-full bg-surface-container-low border border-surface-container-highest p-3 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150 resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-[#005235] text-pure-white py-3.5 px-6 rounded-lg font-bold text-xs tracking-wider select-none shadow-md duration-150 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {lang === 'ar' ? '🧾 إصدار وصياغة الفاتورة الإلكترونية الفورية' : '🧾 FORMULATE LIVE CONSIGNMENT INVOICE'}
                  </button>
                </form>
              </div>

              {/* Real-time Dynamic E-Invoice Preview */}
              <div className="bg-surface-container rounded-card p-5 border border-surface-container-highest flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl transform translate-x-10 -translate-y-10"></div>
                
                <div className="flex justify-between items-center z-10">
                  <span className="text-[10px] sm:text-xs font-bold text-primary bg-primary-fixed-dim/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {lang === 'ar' ? 'معاينة حية وفورية للفاتورة الرقمية' : 'Live Digital Invoice Stream'}
                  </span>
                  <span className="text-[9px] font-sans text-muted-gray">{lang === 'ar' ? 'اسم النموذج: فاتورة عرض للبيع' : 'Template: Consignment Inv'}</span>
                </div>

                {/* Simulated Thermal style beautiful E-Invoice Page */}
                <div className="bg-pure-white border border-surface-container-highest rounded-xl p-5 sm:p-6 shadow-soft space-y-4 font-sans select-none relative">
                  
                  {/* Decorative Invoice Border Tape */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-[#005235] to-[#79ffd9] rounded-t-xl"></div>
                  
                  {/* Invoice Header */}
                  <div className="flex justify-between items-start pt-2 pb-3 border-b border-dashed border-outline-variant">
                    <div>
                      <h4 className="text-xs font-sans tracking-widest text-primary font-black uppercase">{lang === 'ar' ? 'متجر سمارت' : 'SMART STORE'}</h4>
                      <p className="text-[9px] text-muted-gray leading-tight mt-0.5">{lang === 'ar' ? 'بوابة بيع وعرض سلع المستخدمين' : 'Authorized User Consignment Hub'}</p>
                    </div>
                    <div className="text-end">
                      <span className="text-[9px] text-muted-gray block">{lang === 'ar' ? 'أثر الفاتورة الآلي' : 'Invoice Reference'}</span>
                      <span className="text-xs font-sans font-bold text-charcoal">#INV-PREVIEW-XXXX</span>
                    </div>
                  </div>

                  {/* Document Title badge */}
                  <div className="text-center py-1 sm:py-1.5 bg-surface-container-low rounded border border-[#007d54]/20">
                    <span className="text-xs font-bold text-primary tracking-wider uppercase block">
                      {lang === 'ar' ? 'فاتورة بيع وصياغة القطعة المؤقتة' : 'Provisional Sales Consignment Invoice'}
                    </span>
                  </div>

                  {/* Details Data table inside the invoice */}
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-3 py-1.5 border-b border-surface-container-low gap-1.5">
                      <span className="text-muted-gray font-medium">{lang === 'ar' ? 'اسم السلعة المعروضة' : 'Proposed Artifact'}</span>
                      <span className="col-span-2 font-bold text-charcoal text-end truncate">
                        {sellItemName || <span className="text-red-400 font-normal italic">{lang === 'ar' ? '(يرجى الكتابة أعلاه ليتغير في الفاتورة)' : '(fill item name above)'}</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 py-1.5 border-b border-surface-container-low gap-1.5">
                      <span className="text-muted-gray font-medium">{lang === 'ar' ? 'الاسم الثلاثي للعميل' : 'Registered Seller'}</span>
                      <span className="col-span-2 font-bold text-charcoal text-end truncate">
                        {sellSellerName || <span className="text-muted-gray font-normal italic">...</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 py-1.5 border-b border-surface-container-low gap-1.5">
                      <span className="text-muted-gray font-medium">{lang === 'ar' ? 'رقم الهاتف للتواصل' : 'Seller Contact'}</span>
                      <span className="col-span-2 font-bold text-charcoal font-sans text-end">
                        {sellPhone || <span className="text-muted-gray font-normal italic">...</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 py-1.5 border-b border-surface-container-low gap-1.5">
                      <span className="text-muted-gray font-medium">{lang === 'ar' ? 'السعر المطلوب' : 'Desired Price'}</span>
                      <span className="col-span-2 font-bold text-primary text-end">
                        {sellPrice || <span className="text-muted-gray font-normal italic">...</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 py-1.5 border-b border-surface-container-low gap-1.5">
                      <span className="text-muted-gray font-medium">{lang === 'ar' ? 'منطقة بائع القطعة' : 'Resident Location'}</span>
                      <span className="col-span-2 font-bold text-charcoal text-end truncate">
                        {sellLocation || <span className="text-muted-gray font-normal italic">...</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 py-1.5 gap-1.5">
                      <span className="text-muted-gray font-medium">{lang === 'ar' ? 'سبب رغبتك بالبيع' : 'Reason / Note'}</span>
                      <span className="col-span-2 font-semibold text-charcoal text-end leading-tight max-h-[40px] overflow-y-auto block pr-1">
                        {sellReason || <span className="text-muted-gray font-normal italic">{lang === 'ar' ? 'غير محدد بعد' : 'None'}</span>}
                      </span>
                    </div>
                  </div>

                  {/* Footnote details and stamp */}
                  <div className="pt-2 border-t border-dashed border-outline-variant flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-muted-gray block leading-none">{lang === 'ar' ? 'حالة مراجعة الفاتورة:' : 'Review Status:'}</span>
                      <span className="text-amber-600 font-extrabold text-[10px] leading-tight flex items-center gap-1 mt-0.5 animate-pulse">
                        ● {lang === 'ar' ? 'بانتظار الإرسال والمراجعة' : 'Pending Share & Support Approval'}
                      </span>
                    </div>
                    {/* Simulated vector stamp badge */}
                    <div className="border border-dashed border-primary/40 rounded px-2.5 py-1 text-[9px] font-bold text-primary font-sans tracking-widest rotate-[-3deg]">
                      SMART VERIFIED
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List of active submitted consignment invoices */}
            <div className="space-y-4 pt-4">
              <h3 className="font-bold text-charcoal text-sm sm:text-base flex items-center justify-between">
                <span>{lang === 'ar' ? 'فواتير عرض بيع السلع بقائمتك الموثقة' : 'Your Live Consignment e-Invoices'}</span>
                <span className="bg-primary/20 text-charcoal font-bold text-xs px-2.5 py-0.5 rounded-full font-sans">
                  {sellInvoices.length}
                </span>
              </h3>

              <div className="space-y-4">
                {sellInvoices.map((inv) => {
                  
                  // Construct dynamic WhatsApp link for this specific invoice
                  const sharingMsg = lang === 'ar' 
                    ? `*✨ فاتورة عرض قطعة للبيع - متجر سمارت ✨*\n\n` +
                      `*📋 بيانات السلعة والعميل:*\n` +
                      `---------------------------------\n` +
                      `• *📦 اسم القطعة المعروضة:* ${inv.itemName}\n` +
                      `• *👤 اسم العميل (البائع):* ${inv.sellerName}\n` +
                      `• *📞 رقم الجوال:* ${inv.phone}\n` +
                      `• *💰 السعر المطلوب:* ${inv.price}\n` +
                      `• *📍 الموقع المقيم فيه:* ${inv.location}\n` +
                      `• *❓ سبب البيع:* ${inv.reason}\n` +
                      `---------------------------------\n` +
                      `• *🧾 رقم الفاتورة الآلي:* ${inv.id}\n` +
                      `• *⏰ تاريخ العرض:* ${inv.date}\n\n` +
                      `⭐ أرجو مراجعة الفاتورة والموافقة على عرض القطعة في متجركم.`
                    : `*✨ Sales Consignment Invoice - SMART STORE ✨*\n\n` +
                      `*📋 Seller & Item Details:*\n` +
                      `---------------------------------\n` +
                      `• *📦 Item Name:* ${inv.itemName}\n` +
                      `• *👤 Seller Name:* ${inv.sellerName}\n` +
                      `• *📞 Phone:* ${inv.phone}\n` +
                      `• *💰 Price:* ${inv.price}\n` +
                      `• *📍 Location:* ${inv.location}\n` +
                      `• *❓ Reason for Selling:* ${inv.reason}\n` +
                      `---------------------------------\n` +
                      `• *🧾 Invoice ID:* ${inv.id}\n` +
                      `• *⏰ Submission Date:* ${inv.date}\n\n` +
                      `⭐ Please review the invoice and approve listing this item on your store.`;

                  const directUrl = `https://api.whatsapp.com/send?phone=${storeWhatsapp}&text=${encodeURIComponent(sharingMsg)}`;

                  return (
                    <div 
                      key={inv.id} 
                      className="bg-pure-white rounded-card p-5 border border-surface-container-highest shadow-sm relative overflow-hidden space-y-4"
                    >
                      {/* Rip texture tape header */}
                      <div className="flex justify-between items-center pb-3 border-b border-surface-container-high gap-2 font-sans">
                        <div>
                          <span className="text-[10px] text-muted-gray uppercase font-sans block leading-none">{lang === 'ar' ? 'رقم الفاتورة المعتمد' : 'Official Invoice Ref'}</span>
                          <span className="font-sans font-bold text-charcoal text-xs sm:text-sm">{inv.id}</span>
                        </div>
                        <span className="bg-primary-fixed-dim/20 text-charcoal font-black text-[10px] font-sans px-2.5 py-1 rounded">
                          {inv.status === 'pending' ? (lang === 'ar' ? 'بانتظار تواصلك' : 'Review Queue') : (lang === 'ar' ? 'تمت المراجعة' : 'Verified')}
                        </span>
                      </div>

                      {/* Invoice thermal block detail table */}
                      <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container space-y-2.5 text-xs font-sans">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-gray">{lang === 'ar' ? 'القطعة المعروضة للبيع:' : 'Proposed Artifact:'}</span>
                          <span className="font-bold text-charcoal text-end leading-tight max-w-[200px] truncate">{inv.itemName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-gray">{lang === 'ar' ? 'اسم بائع القطعة:' : 'Consignor Seller:'}</span>
                          <span className="font-bold text-charcoal">{inv.sellerName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-gray">{lang === 'ar' ? 'السعر المطلوب وعملة البيع:' : 'Desired Selling Price:'}</span>
                          <span className="font-bold text-[#007d54]">{inv.price}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-gray">{lang === 'ar' ? 'مقر الإقامة وعنوان السكن:' : 'Seller Residency:'}</span>
                          <span className="font-semibold text-charcoal truncate max-w-[180px]">{inv.location}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-gray">{lang === 'ar' ? 'تاريخ صياغة الفاتورة:' : 'Formatted Date:'}</span>
                          <span className="font-sans text-muted-gray font-medium">{inv.date}</span>
                        </div>
                        {inv.reason && (
                          <div className="pt-2 border-t border-dashed border-surface-container-high">
                            <span className="text-muted-gray block text-[10px] leading-tight mb-0.5">{lang === 'ar' ? 'سبب الرغبة بالبيع وملاحظات الضمان:' : 'Consignment rationale:'}</span>
                            <p className="text-charcoal leading-tight text-[11px] font-medium">{inv.reason}</p>
                          </div>
                        )}
                      </div>

                      {/* Dynamic CTA anchor */}
                      <a 
                        href={directUrl}
                        target="_blank" 
                        rel="no-referrer"
                        className="w-full text-center bg-[#25D366] hover:bg-[#128C7E] text-pure-white text-xs font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-soft hover:scale-[1.01] active:scale-[0.99] font-sans"
                      >
                        <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span className="font-semibold">{lang === 'ar' ? 'أرسل الفاتورة المكتوبة لصاحب المتجر (واتساب)' : 'Send E-Invoice to Owner (WhatsApp)'}</span>
                      </a>
                    </div>
                  );
                })}

                {sellInvoices.length === 0 && (
                  <div className="text-center py-10 bg-pure-white rounded-card border border-surface-container shadow-soft space-y-2">
                    <p className="text-sm text-charcoal font-bold">{lang === 'ar' ? 'لا توجد فواتير معبأة بعد' : 'No sales consignment invoices yet.'}</p>
                    <p className="text-xs text-muted-gray">{lang === 'ar' ? 'املأ الحقول أعلاه لإصدار وتثبيت أول فاتورة بيع ومشاركتها مع صاحب المتجر.' : 'Fill out the form parameter inputs above to populate your history panel.'}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* SPECIAL OFFERS TAB */}
        {currentTab === 'account' && !isCheckingOut && (() => {
          const offerProducts = products.filter(p => {
            const hasName = (p.nameAr && p.nameAr.trim()) || (p.nameEn && p.nameEn.trim());
            const hasImage = p.image && p.image.trim();
            return p.sale_price && String(p.sale_price).trim().length > 0 && hasName && hasImage;
          });
          return (
            <div className="space-y-8 max-w-5xl mx-auto" id="special-offers-tab">
              
              {/* Active Offers Cards Grid in full-width container */}
              <div className="bg-pure-white rounded-card p-6 sm:p-8 border border-surface-container-highest shadow-soft">
                <div className="flex items-center justify-between pb-4 border-b border-surface-container-high mb-6">
                  <h3 className="font-bold text-charcoal text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 select-none">local_offer</span>
                    <span>{lang === 'ar' ? 'القطع المخفضة الحالية' : 'Current Curated Deals'}</span>
                  </h3>
                  <span className="font-sans text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-600">
                    {offerProducts.length} {lang === 'ar' ? 'عروض نشطة' : 'Active Offers'}
                  </span>
                </div>

                {offerProducts.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-[32px] select-none">local_offer</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-charcoal text-sm">{lang === 'ar' ? 'لا توجد عروض ترويجية نشطة' : 'No Active Offers'}</h4>
                      <p className="text-xs text-muted-gray max-w-sm mx-auto font-sans leading-relaxed">
                        {lang === 'ar' 
                          ? 'يرجى مراجعتنا لاحقاً لمشاهدة المجموعات الجديدة والخصومات المميزة.' 
                          : 'All items are currently priced at standard archive rates. Please check back later for customized drops.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offerProducts.map(product => {
                      return (
                        <div 
                          key={product.id} 
                          className="bg-surface rounded-xl border border-outline-variant/60 overflow-hidden flex flex-col justify-between group hover:border-[#007d54]/30 transition-all shadow-sm"
                        >
                          <div className="relative cursor-pointer" onClick={() => {
                            setSelectedProduct(product);
                            setActiveImageIdx(0);
                          }}>
                            {/* Product Image */}
                            <div className="aspect-[4/3] w-full bg-gray-50 overflow-hidden relative">
                              <img 
                                src={product.image || undefined} 
                                alt={lang === 'ar' ? product.nameAr : product.nameEn}
                                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" referrerPolicy="no-referrer"
                              />
                              <span className="absolute top-3 left-3 bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-full select-none shadow-md flex items-center gap-1">
                                <span>🔥</span>
                                <span>{lang === 'ar' ? 'عرض خاص' : 'Special Offer'}</span>
                              </span>
                            </div>

                            {/* Title and details */}
                            <div className={`p-4 space-y-1.5 text-start`}>
                              <h4 className={`font-bold text-charcoal text-sm sm:text-base line-clamp-1 leading-tight group-hover:text-primary transition-colors text-start`}>
                                {lang === 'ar' ? product.nameAr : product.nameEn}
                              </h4>
                              <p className={`text-xs text-muted-gray line-clamp-2 leading-relaxed font-sans min-h-[2.5rem] text-start`}>
                                {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
                              </p>
                              <div className={`flex items-center gap-2 pt-1 justify-start`}>
                                {renderProductPriceInline(product, "text-[#007d54] font-black text-xs sm:text-sm font-sans")}
                              </div>
                            </div>
                          </div>

                          {/* Actions block */}
                          <div className="p-4 pt-3 border-t border-dashed border-outline-variant/50 mt-auto flex items-center justify-between gap-3 bg-gray-50/50">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setActiveImageIdx(0);
                              }}
                              className="flex-1 bg-pure-white border border-outline-variant hover:bg-surface text-charcoal py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors select-none cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px] select-none">visibility</span>
                              <span>{lang === 'ar' ? 'التفاصيل' : 'Details'}</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                addToCart(product, 1);
                              }}
                              className="flex-1 bg-[#007d54] hover:bg-[#005235] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors select-none cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px] select-none">shopping_cart</span>
                              <span>{lang === 'ar' ? 'شراء العرض' : 'Buy Offer'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {/* PURCHASE HISTORY TAB */}
        {currentTab === 'history' && !isCheckingOut && (() => {
          return (
            <div className="space-y-8 max-w-5xl mx-auto p-4 pb-20 text-start" id="history-tab-section" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              {/* Header card with security focus */}
              <div className="bg-pure-white rounded-card p-6 sm:p-8 border border-surface-container-highest shadow-soft">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-surface-container-high">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#007d54] flex items-center justify-center shadow-inner shrink-0">
                      <ShieldCheck className="w-9 h-9" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-charcoal text-lg flex items-center gap-2 justify-center sm:justify-start">
                        <span>{lang === 'ar' ? 'سجل المشتريات المعتمد والآمن' : 'Certified Safe Purchase History'}</span>
                      </h3>
                      <p className="text-xs text-muted-gray leading-relaxed max-w-xl">
                        {lang === 'ar' 
                          ? 'تخضع جميع مشترياتك في متجرنا لحماية وتشفير عاليين. هذا السجل دائم وغير قابل للتعديل أو الحذف بتاتاً لضمان حقوق العميل ومتابعة خدمات التوصيل والضمان بوضوح تام.'
                          : 'All your purchases are highly secured and recorded permanently. This log is final and cannot be deleted or modified by anyone to fully guarantee client rights, shipping protection, and warranty.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50 text-[#007d54] font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-sans shrink-0 border border-emerald-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>{lang === 'ar' ? 'سجل آمن بالكامل' : '100% Tamperproof Log'}</span>
                  </div>
                </div>

                {!firebaseUser && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💡</span>
                      <p>
                        {lang === 'ar'
                          ? 'أنت تتصفح المشتريات المحلية كزائر. يرجى تسجيل الدخول بحساب جوجل لمزامنة وحفظ مشترياتك سحابياً مدى الحياة!'
                          : 'You are viewing guest purchases. Sign in with Google to sync and safeguard your purchases in the cloud forever!'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await signInWithGoogle();
                          addToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Successfully signed in!');
                        } catch (err: any) {
                          if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
                            setShowDomainErrorModal(true);
                          } else if (err?.code === 'auth/popup-closed-by-user') {
                            addToast(lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول' : 'Sign-in window was closed');
                          } else {
                            addToast(lang === 'ar' ? 'فشل تسجيل الدخول بجوجل' : 'Google Sign-In failed');
                          }
                        }
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-lg transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      {lang === 'ar' ? 'سجل دخولك الآن' : 'Sign In Now'}
                    </button>
                  </div>
                )}
              </div>

              {/* Orders stack */}
              {mergedOrders.length === 0 ? (
                <div className="bg-pure-white rounded-card p-12 text-center border border-surface-container-highest shadow-soft max-w-md mx-auto space-y-5">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-muted-gray mx-auto border border-dashed">
                    <Package className="w-8 h-8 opacity-40" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-charcoal text-sm">
                      {lang === 'ar' ? 'لا توجد مشتريات مسجلة بعد' : 'No Purchases Recorded Yet'}
                    </h4>
                    <p className="text-xs text-muted-gray leading-relaxed max-w-xs mx-auto">
                      {lang === 'ar' 
                        ? 'يبدو أنك لم تقم بشراء أي منتج من متجرنا بعد. تسوق تشكيلتنا الفاخرة الآن!' 
                        : 'Your secure purchase log is empty. Place your first order to see fully detailed billing records here.'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setCurrentTab('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="bg-[#007d54] hover:bg-[#005235] text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {lang === 'ar' ? 'الذهاب لتصفح المنتجات' : 'Browse Exclusive Pavilion'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {mergedOrders.map((order) => {
                    return (
                      <div 
                        key={order.id} 
                        className="bg-pure-white rounded-card border border-surface-container-highest shadow-soft overflow-hidden"
                      >
                        {/* Order billing header */}
                        <div className="bg-surface p-4 sm:p-5 border-b border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-4">
                          {/* Right Side: Status Badge & Copyable Invoice ID */}
                          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-pure-white border shadow-sm">
                              {order.status === 'delivered' ? (
                                <>
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                                  <span className="text-green-700">{lang === 'ar' ? 'تم التوصيل بنجاح' : 'Delivered Safely'}</span>
                                </>
                              ) : order.status === 'shipped' ? (
                                <>
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                  <span className="text-blue-700">{lang === 'ar' ? 'تم الشحن' : 'Shipped'}</span>
                                </>
                              ) : order.status === 'processing' ? (
                                <>
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  <span className="text-amber-700">{lang === 'ar' ? 'قيد التجهيز الفاخر' : 'In Atelier Preparation'}</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                                  <span className="text-emerald-700">{lang === 'ar' ? 'طلب جديد مؤكد' : 'Order Placed & Secured'}</span>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.id);
                                addToast(lang === 'ar' ? 'تم نسخ كود الفاتورة بنجاح!' : 'Invoice code copied!');
                              }}
                              className="bg-surface-container-low hover:bg-surface-container-high text-charcoal font-bold text-[10px] font-sans px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer select-none"
                              title={lang === 'ar' ? 'نسخ كود الفاتورة' : 'Copy Invoice code'}
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-800 font-bold font-sans">{order.id}</span>
                              <span className="text-[9px] opacity-60">📋</span>
                            </button>
                          </div>

                          {/* Left Side: Order Date & Time */}
                          <div className="space-y-1.5 text-center sm:text-end">
                            <div className="text-xs text-muted-gray flex flex-wrap items-center gap-1.5 justify-center sm:justify-end">
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="font-semibold font-sans text-charcoal">
                                {lang === 'ar' ? 'تاريخ ووقت تسجيل الطلب:' : 'Order Date & Time:'}
                              </span>
                              <span className="font-sans text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-100/50 px-2.5 py-0.5 rounded-lg select-all">
                                {order.date ? order.date.replace(/-/g, '/') : '2026/06/27'} - {order.time || (lang === 'ar' ? '10:30:00 ص' : '10:30:00 AM')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Order Items fully detailed list */}
                        <div className="p-4 sm:p-6 divide-y divide-surface-container-high">
                          {order.items?.map((item: any, idx: number) => {
                            // Extract item details
                            const prod = item.product || {};
                            const pName = lang === 'ar' ? (prod.nameAr || item.nameAr) : (prod.nameEn || item.nameEn);
                            const pDesc = lang === 'ar' ? (prod.descriptionAr || item.descriptionAr || 'لا يوجد وصف متاح لمنتج هذه الفاتورة.') : (prod.descriptionEn || item.descriptionEn || 'No description available for this item.');
                            const pImg = prod.image || item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80';
                            const pPrice = prod.price || item.price || 0;
                            const pCategory = prod.category || item.category || 'all';
                            const pSpecs = lang === 'ar' ? (prod.specsAr || item.specsAr || []) : (prod.specsEn || item.specsEn || []);
                            
                            return (
                              <div key={idx} className="flex flex-col md:flex-row gap-5 py-5 first:pt-0 last:pb-0 items-start">
                                {/* Thumbnail */}
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-surface-container shadow-inner border border-outline-variant/30 shrink-0 relative">
                                  <img 
                                    src={pImg} 
                                    alt={pName} 
                                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>

                                {/* Details Column */}
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-bold text-charcoal text-sm sm:text-base leading-tight">
                                      {pName}
                                    </h4>
                                    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded capitalize">
                                      {pCategory}
                                    </span>
                                  </div>

                                  <p className="text-xs sm:text-[13px] text-muted-gray leading-relaxed text-start">
                                    {pDesc}
                                  </p>

                                  {/* Specifications list if available */}
                                  {pSpecs.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {pSpecs.slice(0, 3).map((spec: string, sIdx: number) => (
                                        <span key={sIdx} className="bg-gray-100 text-charcoal text-[10px] font-medium px-2 py-0.5 rounded-full font-sans">
                                          ✓ {spec}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Pricing details */}
                                  <div className="flex flex-wrap items-center gap-3 pt-1.5 text-xs text-charcoal">
                                    <div className="bg-surface-container-low border px-2.5 py-1 rounded-lg">
                                      <span className="text-muted-gray">{lang === 'ar' ? 'الكمية: ' : 'Qty: '}</span>
                                      <b className="font-bold font-sans">{item.quantity}</b>
                                    </div>
                                    <div className="bg-surface-container-low border px-2.5 py-1 rounded-lg">
                                      <span className="text-muted-gray">{lang === 'ar' ? 'السعر الفردي: ' : 'Unit Price: '}</span>
                                      <b className="font-bold font-sans text-[#007d54]">{formatPrice(pPrice)}</b>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order metadata summary */}
                        <div className="bg-surface/50 border-t border-surface-container-high p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                          {/* Shipping Coordinates */}
                          <div className="space-y-1.5 border-b md:border-b-0 md:rtl:border-l md:ltr:border-r border-dashed border-outline-variant/60 pb-3 md:pb-0 md:rtl:pl-5 md:ltr:pr-5 text-start">
                            <p className="font-bold text-charcoal flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                              <span>{lang === 'ar' ? 'معلومات التوصيل والمستلم:' : 'Shipping & Recipient Coordinates:'}</span>
                            </p>
                            <div className="space-y-1 font-sans">
                              <p className="text-charcoal">{lang === 'ar' ? 'الاسم :' : 'Name:'} {order.shippingDetails?.fullName}</p>
                              <p className="text-charcoal">{lang === 'ar' ? 'رقم الهاتف :' : 'Phone:'} <span dir="ltr">{order.shippingDetails?.phone}</span></p>
                              <p className="text-charcoal">{lang === 'ar' ? 'العنوان :' : 'Address:'} {order.shippingDetails?.address}</p>
                            </div>
                          </div>

                          {/* Grand Financial Summary */}
                          <div className="space-y-2 flex flex-col justify-center text-start">
                            {order.discount > 0 && (
                              <div className="flex justify-between items-center text-red-600 font-sans">
                                <span>{lang === 'ar' ? 'خصم الكوبون:' : 'Coupon Discount:'}</span>
                                <span className="font-bold">- {formatPrice(order.discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-sm font-bold border-t border-dashed border-outline-variant/60 pt-2 text-charcoal font-sans">
                              <span className="text-emerald-800">{lang === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                              <span className="text-[#007d54] text-base font-black bg-[#007d54]/10 px-3 py-1 rounded-lg">
                                {(() => {
                                  const totalVal = order.total || order.subtotal || 0;
                                  const hasYemeni = order.items?.some(item => typeof item.product.price === 'string' && (item.product.price.includes('ر.ي') || item.product.price.includes('YER')));
                                  const hasSaudi = order.items?.some(item => typeof item.product.price === 'string' && (item.product.price.includes('ر.س') || item.product.price.includes('SAR')));
                                  
                                  if (hasYemeni) {
                                    return lang === 'ar' ? `${totalVal.toFixed(0)} ر.ي` : `${totalVal.toFixed(0)} YER`;
                                  }
                                  if (hasSaudi) {
                                    return lang === 'ar' ? `${totalVal.toFixed(2)} ر.س` : `${totalVal.toFixed(2)} SAR`;
                                  }
                                  // Default fallback
                                  return formatPrice(totalVal);
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Security stamp footnote */}
                        <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 text-center border-t border-dashed border-emerald-100 dark:border-emerald-950/40 flex items-center justify-center gap-1.5 text-[10px] text-black dark:text-white font-medium">
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            {lang === 'ar' 
                              ? 'سجل معتمد مشفر وتلقائي - غير قابل للحذف لضمان أمان مشترياتك.' 
                              : 'Certified encrypted automated receipt - protected against deletions.'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* PROFILE & STORE MANAGEMENT TAB */}
        {currentTab === 'profile' && !isCheckingOut && (() => {
          const isUserAdmin = isAdmin || isSimulatingAdmin;
          return (
            <div className="space-y-8 max-w-5xl mx-auto p-4 pb-20 text-start" id="profile-tab-section" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              
              {/* Profile Header Card */}
              <div className="bg-pure-white rounded-card p-6 sm:p-8 border border-surface-container-highest shadow-soft">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-surface-container-high">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start">
                    {firebaseUser ? (
                      <>
                        <img 
                          src={firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'} 
                          alt={firebaseUser.displayName || 'User'} 
                          className="w-20 h-20 rounded-full object-cover border-4 border-emerald-100 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1">
                          <h3 className="font-bold text-charcoal text-lg flex items-center gap-2 justify-center sm:justify-start">
                            <span>{firebaseUser.displayName}</span>
                            {isUserAdmin && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {lang === 'ar' ? 'مسؤول المتجر' : 'Store Admin'}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-muted-gray font-mono flex items-center gap-1 justify-center sm:justify-start">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{firebaseUser.email}</span>
                          </p>
                          <p className="text-[11px] text-emerald-600 font-semibold">
                            {lang === 'ar' ? 'تم تسجيل الدخول بنجاح عبر جوجل' : 'Successfully signed in via Google'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-muted-gray shadow-inner">
                          <User className="w-10 h-10" />
                        </div>
                        <div className="space-y-1 text-center sm:text-start">
                          <h3 className="font-bold text-charcoal text-lg">
                            {lang === 'ar' ? 'مرحباً بك في صفحة الملف الشخصي' : 'Welcome to your Profile'}
                          </h3>
                          <p className="text-xs text-muted-gray max-w-md">
                            {lang === 'ar' 
                              ? 'سجل دخولك باستخدام حساب جوجل الخاص بك للوصول لخدمات المتجر الحصرية ومراجعة طلبياتك وإدارتها.' 
                              : 'Sign in with your Google account to access tailored store perks and keep track of your requests.'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    {firebaseUser ? (
                      <button
                        onClick={async () => {
                          try {
                            await signOutUser();
                            addToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
                          } catch (err) {
                            addToast(lang === 'ar' ? 'فشل تسجيل الخروج' : 'Logout failed');
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            await signInWithGoogle();
                            addToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Successfully signed in!');
                          } catch (err: any) {
                            if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
                              setShowDomainErrorModal(true);
                            } else if (err?.code === 'auth/popup-closed-by-user') {
                              addToast(lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول' : 'Sign-in window was closed');
                            } else {
                              addToast(lang === 'ar' ? 'فشل تسجيل الدخول بجوجل' : 'Google Sign-In failed');
                            }
                          }
                        }}
                        className={`font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-98 ${
                          theme === 'dark'
                            ? 'bg-white hover:bg-neutral-100 text-black border-neutral-200/20'
                            : 'bg-black hover:bg-neutral-900 text-white border-neutral-800/20'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.92-2.77 3.5-4.81 6.76-4.81z"
                          />
                          <path
                            fill="#4285F4"
                            d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.57v2.96h3.91c2.28-2.1 3.54-5.19 3.54-8.68z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.24 14.56c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 6.95C.5 8.75 0 10.77 0 12s.5 3.25 1.39 5.05l3.85-2.99z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.91-2.96c-1.12.75-2.55 1.19-4.05 1.19-3.26 0-5.84-2.04-6.76-4.81l-3.85 2.99C3.37 20.33 7.35 23 12 23z"
                          />
                        </svg>
                        <span>{lang === 'ar' ? 'تسجيل الدخول بجوجل فقط' : 'Google Sign-In Only'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid for Store Info and dynamic config */}
                <div className="mt-6 max-w-xl mx-auto">
                  
                  {/* Store Details Card */}
                  <div className="bg-surface rounded-xl p-5 border border-outline-variant/60 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-charcoal text-sm flex items-center gap-2 mb-4">
                        <Store className="w-4 h-4 text-[#007d54]" />
                        <span>{lang === 'ar' ? 'معلومات المتجر الأساسية' : 'Primary Store Profile'}</span>
                      </h4>
                      
                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-surface-container-high">
                          <span className="text-muted-gray">{lang === 'ar' ? 'اسم المتجر:' : 'Store Name:'}</span>
                          <span className="font-bold text-charcoal">{lang === 'ar' ? storeNameAr : storeNameEn}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-surface-container-high">
                          <span className="text-muted-gray">{lang === 'ar' ? 'رقم التواصل:' : 'Contact Number:'}</span>
                          <span className="font-bold text-charcoal font-sans" dir="ltr">{formatPhoneNumber(storePhone)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-surface-container-high">
                          <span className="text-muted-gray">{lang === 'ar' ? 'واتساب فقط:' : 'WhatsApp Only:'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-charcoal font-sans" dir="ltr">{formatPhoneNumber(storeWhatsapp)}</span>
                            <a 
                              href={`https://api.whatsapp.com/send?phone=${storeWhatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title={lang === 'ar' ? 'راسلنا عبر واتساب' : 'Chat on WhatsApp'}
                            >
                              <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </a>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-muted-gray">{lang === 'ar' ? 'مكان المتجر:' : 'Store Location:'}</span>
                          <span className="font-bold text-[#007d54]">{lang === 'ar' ? storeAddressAr : storeAddressEn}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-dashed border-outline-variant/50">
                      <a
                        href={`https://api.whatsapp.com/send?phone=${storePhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span>{lang === 'ar' ? 'تواصل مباشر مع الدعم الفني (واتساب)' : 'Direct WhatsApp Support'}</span>
                      </a>
                    </div>
                  </div>

                </div>
              </div>

              {/* ADMIN CONTROL PANEL SECTION */}
              {isUserAdmin && (
                <div className="bg-pure-white rounded-card p-6 sm:p-8 border-2 border-emerald-500 shadow-lg space-y-8 text-start" id="admin-management-module">
                  
                  {/* Section Title */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container-high">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="text-start">
                        <h3 className="font-bold text-charcoal text-base">
                          {lang === 'ar' ? 'إدارة المتجر الذكية (لوحة المالك)' : 'Smart Store Control Panel'}
                        </h3>
                        <p className="text-xs text-muted-gray">
                          {lang === 'ar' ? 'إدارة الطلبات، وتعديل الكوبونات والبيانات والخصومات المباشرة' : 'Manage live orders, customize contact details & coupon keys.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={fetchAllOrders}
                      disabled={isLoadingFirebaseOrders}
                      className="text-xs font-bold font-sans bg-emerald-100 hover:bg-emerald-200 text-emerald-800 py-1.5 px-3 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔄</span>
                      <span>{lang === 'ar' ? 'تحديث الطلبات الحية' : 'Refresh Firestore Orders'}</span>
                    </button>
                  </div>

                  {/* Part 1: Manage Orders */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-charcoal text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'ar' ? 'أولاً: إدارة ومتابعة الطلبات الموثقة' : '1. Live Firestore Order Desk'}</span>
                    </h4>

                    {isLoadingFirebaseOrders ? (
                      <div className="text-center py-10 text-xs text-muted-gray animate-pulse font-sans">
                        {lang === 'ar' ? 'جاري تحميل الطلبات من فايربيز...' : 'Loading live database entries...'}
                      </div>
                    ) : firebaseOrders.length === 0 ? (
                      <div className="text-center py-10 bg-surface rounded-xl border border-surface-container-high text-xs text-muted-gray leading-relaxed max-w-lg mx-auto">
                        {lang === 'ar' 
                          ? 'لم يسجل أي زبون طلباً في متجرك الإلكتروني بعد. اذهب للمتجر وأتمم طلبية لتظهر هنا فوراً!' 
                          : 'No orders captured in Firestore yet. Submit a test order inside the app and see it appear!'}
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                        {firebaseOrders.map((ord) => (
                          <div 
                            key={ord.id} 
                            className="bg-surface rounded-xl p-4 border border-outline-variant/60 text-start space-y-3 relative overflow-hidden"
                          >
                            {/* Order Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-surface-container-high text-xs">
                              <div>
                                <span className="font-mono font-bold text-charcoal text-sm">{ord.id}</span>
                                <span className="text-muted-gray text-[10px] mx-1.5 font-sans">({ord.date})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-gray font-sans">
                                  {lang === 'ar' ? 'العميل:' : 'Customer:'} <b className="text-charcoal">{ord.customerName}</b>
                                </span>
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {ord.total ? formatCartTotal(ord.total) : formatCartTotal(0)}
                                </span>
                              </div>
                            </div>

                            {/* Order Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                              {/* Shipping location details */}
                              <div className="space-y-1">
                                <p className="text-muted-gray font-bold">{lang === 'ar' ? '📍 معلومات التوصيل:' : '📍 Shipping Coordinates:'}</p>
                                <p className="text-charcoal text-[11px]"><b>{lang === 'ar' ? 'الاسم:' : 'Name:'}</b> {ord.shippingDetails?.fullName}</p>
                                <p className="text-charcoal text-[11px]"><b>{lang === 'ar' ? 'الهاتف:' : 'Phone:'}</b> {ord.shippingDetails?.phone}</p>
                                <p className="text-charcoal text-[11px]"><b>{lang === 'ar' ? 'العنوان:' : 'Address:'}</b> {ord.shippingDetails?.address}</p>
                              </div>

                              {/* Order items list */}
                              <div className="space-y-1">
                                <p className="text-muted-gray font-bold">{lang === 'ar' ? '🛍️ السلع المطلوبة:' : '🛍️ Order Items:'}</p>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-charcoal max-h-[70px] overflow-y-auto">
                                  {ord.items?.map((item: any, idx: number) => (
                                    <li key={idx}>
                                      {lang === 'ar' ? item.nameAr : item.nameEn} (×{item.quantity})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Order Status & Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-dashed border-outline-variant/50">
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <label className="text-[11px] text-muted-gray shrink-0">{lang === 'ar' ? 'تعديل حالة الشحن:' : 'Update State:'}</label>
                                <select
                                  value={ord.status || 'placed'}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                      const orderDocRef = doc(db, 'orders', ord.id);
                                      await updateDoc(orderDocRef, { status: newStatus });
                                      addToast(lang === 'ar' ? 'تم تحديث حالة الطلبية بنجاح' : 'Status updated in Firestore!');
                                      fetchAllOrders();
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.UPDATE, 'orders/' + ord.id);
                                    }
                                  }}
                                  className="bg-pure-white border border-surface-container-highest text-xs font-bold rounded-lg px-2.5 py-1 text-charcoal outline-none cursor-pointer"
                                >
                                  <option value="placed">{lang === 'ar' ? 'طلب جديد' : 'Placed'}</option>
                                  <option value="processing">{lang === 'ar' ? 'قيد التجهيز' : 'Processing'}</option>
                                  <option value="shipped">{lang === 'ar' ? 'تم الشحن' : 'Shipped'}</option>
                                  <option value="delivered">{lang === 'ar' ? 'تم التوصيل بنجاح' : 'Delivered'}</option>
                                </select>
                              </div>

                              {/* Immutable Order Stamp (Anti-deletion lock) */}
                              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-[#007d54] text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100 font-sans">
                                <Lock className="w-3 h-3 text-[#007d54]" />
                                <span>{lang === 'ar' ? 'سجل موثق (غير قابل للحذف)' : 'Certified (Non-deletable)'}</span>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Part 2: Edit Store Profile Metadata */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-charcoal text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'ar' ? 'ثانياً: تعديل بيانات التواصل ومسمى المتجر' : '2. Update Contact Details & Store Profile'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans text-start">
                      <div className="space-y-1">
                        <label className="font-bold text-charcoal">{lang === 'ar' ? 'اسم المتجر (بالعربية):' : 'Store Name (AR):'}</label>
                        <input
                          type="text"
                          value={storeNameAr}
                          onChange={(e) => setStoreNameAr(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-charcoal focus:border-emerald-500 outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-charcoal">{lang === 'ar' ? 'اسم المتجر (بالإنجليزية):' : 'Store Name (EN):'}</label>
                        <input
                          type="text"
                          value={storeNameEn}
                          onChange={(e) => setStoreNameEn(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-charcoal focus:border-emerald-500 outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-charcoal">{lang === 'ar' ? 'رقم التواصل (بدون + أو أصفار دولية):' : 'Contact Number (e.g. 967779793990):'}</label>
                        <input
                          type="text"
                          value={storePhone}
                          onChange={(e) => setStorePhone(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-charcoal focus:border-emerald-500 outline-none font-bold font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-charcoal">{lang === 'ar' ? 'رقم الواتساب فقط (بدون + أو أصفار دولية):' : 'WhatsApp Only (e.g. 967782412634):'}</label>
                        <input
                          type="text"
                          value={storeWhatsapp}
                          onChange={(e) => setStoreWhatsapp(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-charcoal focus:border-emerald-500 outline-none font-bold font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-charcoal">{lang === 'ar' ? 'مكان المتجر (بالعربية):' : 'Store Location (AR):'}</label>
                        <input
                          type="text"
                          value={storeAddressAr}
                          onChange={(e) => setStoreAddressAr(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-charcoal focus:border-emerald-500 outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-charcoal">{lang === 'ar' ? 'مكان المتجر (بالإنجليزية):' : 'Store Location (EN):'}</label>
                        <input
                          type="text"
                          value={storeAddressEn}
                          onChange={(e) => setStoreAddressEn(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-charcoal focus:border-emerald-500 outline-none font-bold"
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          const settingsRef = doc(db, 'store', 'settings');
                          await setDoc(settingsRef, {
                            storeNameAr,
                            storeNameEn,
                            storePhone,
                            storeWhatsapp,
                            storeAddressAr,
                            storeAddressEn
                          });
                          addToast(lang === 'ar' ? 'تم حفظ إعدادات وبيانات المتجر في فايرستور بنجاح!' : 'Store settings saved in Firestore successfully!');
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, 'store/settings');
                        }
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                    >
                      <span>💾</span>
                      <span>{lang === 'ar' ? 'حفظ معلومات وإعدادات المتجر في فايرستور' : 'Save Store Details in Firestore'}</span>
                    </button>
                  </div>



                </div>
              )}

            </div>
          );
        })()}

      </main>

      {/* DETAILED PRODUCT QUICK VIEW (SLIDE OVERDRAWER WITH TRANSITIONS) */}
      <AnimatePresence>
        {showDomainErrorModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-charcoal/60 z-[110] backdrop-blur-sm flex justify-center items-center p-4 font-sans"
            id="unauthorized-domain-modal"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`w-full max-w-lg rounded-2xl p-6 shadow-xl border overflow-hidden relative ${
                theme === 'dark' ? 'bg-[#0e1411] text-[#f1f5f9] border-[#1e293b]' : 'bg-white text-charcoal border-neutral-200'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <ShieldCheck className="w-6 h-6" />
                  <h3 className="font-bold text-lg">
                    {lang === 'ar' ? 'مطلوب إذن النطاق في فايربيز' : 'Firebase Domain Authorization Required'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowDomainErrorModal(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  {lang === 'ar'
                    ? 'لتفعيل ميزة تسجيل الدخول عبر Google، يجب تسجيل عنوان نطاق هذا الموقع الإلكتروني ضمن "النطاقات المصرح بها" (Authorized Domains) في إعدادات مشروع Firebase الخاص بك.'
                    : 'To enable Google Sign-In, this website\'s domain must be added to the "Authorized Domains" list in your Firebase project configuration.'}
                </p>

                <div className={`p-4 rounded-xl border font-mono text-xs flex justify-between items-center ${
                  theme === 'dark' ? 'bg-[#1b241f] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="text-start">
                    <span className="text-muted-gray block mb-1 text-[10px] uppercase font-bold">
                      {lang === 'ar' ? 'النطاق الحالي المراد نسخه' : 'Current Domain to Copy'}
                    </span>
                    <span className="font-bold font-sans text-emerald-600 dark:text-emerald-400">{window.location.hostname}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.hostname);
                      addToast(lang === 'ar' ? 'تم نسخ النطاق بنجاح!' : 'Domain copied successfully!');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer shrink-0"
                  >
                    {lang === 'ar' ? 'نسخ' : 'Copy'}
                  </button>
                </div>

                <div className="space-y-2 text-start">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-gray">
                    {lang === 'ar' ? 'خطوات تفعيل النطاق السريعة:' : 'Quick Activation Steps:'}
                  </h4>
                  <ul className="list-decimal list-inside space-y-1 text-xs">
                    <li>
                      {lang === 'ar' ? 'افتح وحدة تحكم فايربيز (Firebase Console).' : 'Open your Firebase Console.'}
                    </li>
                    <li>
                      {lang === 'ar' ? 'اختر مشروعك: ' : 'Select your project: '}
                      <strong className="text-primary font-mono">smart-store-eaf1c</strong>
                    </li>
                    <li>
                      {lang === 'ar' ? 'انتقل إلى Build ثم Authentication ثم تبويب Settings.' : 'Navigate to Build > Authentication, then the Settings tab.'}
                    </li>
                    <li>
                      {lang === 'ar' ? 'اختر Authorized domains من القائمة الجانبية.' : 'Click on Authorized domains in the menu.'}
                    </li>
                    <li>
                      {lang === 'ar' ? 'انقر على Add domain وألصق النطاق الذي قمت بنسخه أعلاه.' : 'Click Add domain and paste the copied domain from above.'}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a 
                  href="https://console.firebase.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 bg-primary hover:bg-[#005235] text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{lang === 'ar' ? 'الانتقال إلى وحدة تحكم Firebase' : 'Go to Firebase Console'}</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
                <button 
                  onClick={() => setShowDomainErrorModal(false)}
                  className={`flex-1 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors border cursor-pointer ${
                    theme === 'dark' ? 'bg-[#1b241f] border-neutral-800 hover:bg-neutral-800' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {lang === 'ar' ? 'فهمت، سأقوم بذلك' : 'Okay, I will do it'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-charcoal/60 z-[105] backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4"
            id="product-detail-modal"
          >
            {/* Modal Body Container */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-pure-white w-full sm:max-w-xl md:max-w-2xl rounded-t-card sm:rounded-card shadow-xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col relative"
            >
              {/* Close controls */}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 bg-pure-white/80 hover:bg-pure-white rounded-full shadow flex items-center justify-center text-charcoal hover:scale-105 active:scale-95 transition-all cursor-pointer border border-surface-container"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrollable details */}
              <div 
                ref={scrollContainerRef}
                className="overflow-y-auto flex-1 p-6 space-y-6"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 40;
                  if (isAtBottom && showScrollIndicator) {
                    setShowScrollIndicator(false);
                  } else if (!isAtBottom && !showScrollIndicator) {
                    setShowScrollIndicator(true);
                  }
                }}
              >
                
                {/* Visual Image Showcase with Swipe-to-drag feature, no arrows, indicators below image */}
                <div className="w-full space-y-3">
                  {(() => {
                    const productImages = (selectedProduct.images && selectedProduct.images.length > 0 
                      ? selectedProduct.images 
                      : [selectedProduct.image]).filter(Boolean);
                    return (
                      <>
                        <div 
                          className="aspect-video w-full rounded-2xl overflow-hidden bg-surface-container relative select-none cursor-grab active:cursor-grabbing"
                          onTouchStart={(e) => {
                            if (productImages.length <= 1) return;
                            setTouchStartX(e.targetTouches[0].clientX);
                            setTouchEndX(e.targetTouches[0].clientX);
                          }}
                          onTouchMove={(e) => {
                            if (productImages.length <= 1) return;
                            setTouchEndX(e.targetTouches[0].clientX);
                          }}
                          onTouchEnd={() => {
                            if (productImages.length <= 1 || touchStartX === null || touchEndX === null) return;
                            const diff = touchStartX - touchEndX;
                            const threshold = 40;
                            if (diff > threshold) {
                              setActiveImageIdx(prev => (prev + 1) % productImages.length);
                            } else if (diff < -threshold) {
                              setActiveImageIdx(prev => (prev - 1 + productImages.length) % productImages.length);
                            }
                            setTouchStartX(null);
                            setTouchEndX(null);
                          }}
                          onMouseDown={(e) => {
                            if (productImages.length <= 1) return;
                            setMouseDownX(e.clientX);
                          }}
                          onMouseUp={(e) => {
                            if (productImages.length <= 1 || mouseDownX === null) return;
                            const diff = mouseDownX - e.clientX;
                            const threshold = 40;
                            if (diff > threshold) {
                              setActiveImageIdx(prev => (prev + 1) % productImages.length);
                            } else if (diff < -threshold) {
                              setActiveImageIdx(prev => (prev - 1 + productImages.length) % productImages.length);
                            }
                            setMouseDownX(null);
                          }}
                          onMouseLeave={() => {
                            setMouseDownX(null);
                          }}
                        >
                          {/* Sliding Carousel Track containing all images side-by-side */}
                          <motion.div
                            animate={{ x: `${lang === 'ar' ? activeImageIdx * 100 : -activeImageIdx * 100}%` }}
                            transition={{ type: "spring", stiffness: 260, damping: 28 }}
                            className="flex h-full w-full pointer-events-none"
                          >
                            {productImages.map((imgUrl, idx) => (
                              <div key={idx} className="w-full h-full shrink-0 relative">
                                <img 
                                  src={imgUrl || undefined} 
                                  alt={`${selectedProduct.nameEn} ${idx + 1}`} 
                                  className="w-full h-full object-cover pointer-events-none select-none"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ))}
                          </motion.div>

                          {selectedProduct.isNew && (
                            <span className="absolute bottom-4 left-4 bg-primary text-pure-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest pointer-events-none z-10">
                              {lang === 'ar' ? d.newArrival : d.newArrival}
                            </span>
                          )}
                        </div>

                        {/* Centered navigation dots UNDER the image exactly in the middle */}
                        {productImages.length > 1 && (
                          <div className="flex justify-center items-center gap-1.5 w-full py-1.5">
                            {productImages.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (idx > activeImageIdx) {
                                    setSwipeDirection(1);
                                  } else if (idx < activeImageIdx) {
                                    setSwipeDirection(-1);
                                  }
                                  setActiveImageIdx(idx);
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                  activeImageIdx === idx 
                                    ? 'w-4 bg-primary' 
                                    : 'w-1.5 bg-muted-gray/40 hover:bg-muted-gray/70'
                                }`}
                                title={`Image ${idx + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullScreenImageOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-surface-container/30 hover:bg-surface-container py-3 rounded-xl text-primary font-bold text-sm transition-colors border border-outline-variant/30 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[20px]">fullscreen</span>
                  <span>{lang === 'ar' ? 'عرض جميع الصور' : 'View all images'}</span>
                </button>

                {/* Meta details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base sm:text-lg font-black text-charcoal tracking-wide">
                      {lang === 'ar' ? 'الــســعــر :' : 'Price :'}
                    </span>
                    <div className="flex items-center gap-2">
                      {renderProductPriceInline(selectedProduct, "text-xl font-black text-[#007d54] font-sans")}
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-charcoal break-words whitespace-pre-wrap">
                    {lang === 'ar' ? selectedProduct.nameAr : selectedProduct.nameEn}
                  </h2>

                  <p className="text-sm text-muted-gray leading-relaxed font-sans break-words whitespace-pre-wrap">
                    {lang === 'ar' ? selectedProduct.descriptionAr : selectedProduct.descriptionEn}
                  </p>

                  {/* Specifications checklist */}
                  <div className="space-y-2 pt-3 border-t border-surface-container-high">
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                      {lang === 'ar' ? 'الميزات والخصائص الفنية' : 'Craft & Product Specs'}
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans w-full min-w-0">
                      {(() => {
                        const specList = selectedProduct.specs 
                          ? parseSpecsToList(selectedProduct.specs)
                          : (lang === 'ar' ? selectedProduct.specsAr : selectedProduct.specsEn);
                        if (specList.length === 0) {
                          return (
                            <li className="text-muted-gray col-span-2 py-2">
                              {lang === 'ar' ? 'لا توجد مواصفات فنية إضافية.' : 'No additional technical specifications listed.'}
                            </li>
                          );
                        }
                        return specList.map((spec, specIdx) => (
                          <li key={specIdx} className="flex items-start gap-2 bg-surface-container-low p-2.5 rounded-lg border border-surface-container-high text-charcoal min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="break-words whitespace-pre-wrap min-w-0 flex-1">{spec}</span>
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>
                </div>

              </div>
              
              {/* Animated Scroll Down Indicator */}
              <AnimatePresence>
                {showScrollIndicator && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  >
                    <button 
                      onClick={() => {
                        if (scrollContainerRef.current) {
                          scrollContainerRef.current.scrollBy({
                            top: 250,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className="text-[#007d54] animate-bounce flex items-center justify-center opacity-90 cursor-pointer pointer-events-auto border-none bg-transparent focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[32px] select-none">keyboard_double_arrow_down</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom static action tray */}
              <div className="bg-surface-container-lowest p-4 pb-6 border-t border-surface-container-high flex gap-3 items-center relative z-30">
                <button
                  onClick={() => {
                    addToCart(selectedProduct, 1);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-primary hover:bg-[#005235] text-pure-white py-4 px-6 rounded-lg font-bold text-sm tracking-widest flex items-center justify-center gap-3 active:scale-95 duration-100 cursor-pointer transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-heading tracking-widest select-none">
                    {lang === 'ar' ? 'أضــــف الــمــنــتـــج الـى الـســـــلـة' : 'ADD PRODUCT TO CART'}
                  </span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN IMAGE OVERLAY */}
      <AnimatePresence>
        {isFullScreenImageOpen && selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[150] backdrop-blur-sm flex flex-col justify-center items-center"
            id="fullscreen-image-modal"
          >
            <button
              onClick={() => setIsFullScreenImageOpen(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[160] bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 backdrop-blur-md transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {(() => {
              const productImages = (selectedProduct.images && selectedProduct.images.length > 0 
                ? selectedProduct.images 
                : [selectedProduct.image]).filter(Boolean);

              return (
                <div 
                  className="w-full h-full relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                  onTouchStart={(e) => {
                    if (productImages.length <= 1) return;
                    setTouchStartX(e.targetTouches[0].clientX);
                    setTouchEndX(e.targetTouches[0].clientX);
                  }}
                  onTouchMove={(e) => {
                    if (productImages.length <= 1) return;
                    setTouchEndX(e.targetTouches[0].clientX);
                  }}
                  onTouchEnd={() => {
                    if (productImages.length <= 1 || touchStartX === null || touchEndX === null) return;
                    const diff = touchStartX - touchEndX;
                    const threshold = 40;
                    if (diff > threshold) {
                      setActiveImageIdx(prev => (prev + 1) % productImages.length);
                    } else if (diff < -threshold) {
                      setActiveImageIdx(prev => (prev - 1 + productImages.length) % productImages.length);
                    }
                    setTouchStartX(null);
                    setTouchEndX(null);
                  }}
                  onMouseDown={(e) => {
                    if (productImages.length <= 1) return;
                    setMouseDownX(e.clientX);
                  }}
                  onMouseUp={(e) => {
                    if (productImages.length <= 1 || mouseDownX === null) return;
                    const diff = mouseDownX - e.clientX;
                    const threshold = 40;
                    if (diff > threshold) {
                      setActiveImageIdx(prev => (prev + 1) % productImages.length);
                    } else if (diff < -threshold) {
                      setActiveImageIdx(prev => (prev - 1 + productImages.length) % productImages.length);
                    }
                    setMouseDownX(null);
                  }}
                  onMouseLeave={() => {
                    setMouseDownX(null);
                  }}
                >
                  <motion.div
                    animate={{ x: `${lang === 'ar' ? activeImageIdx * 100 : -activeImageIdx * 100}%` }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    className="flex h-full w-full pointer-events-none"
                  >
                    {productImages.map((imgUrl, idx) => (
                      <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center p-2 sm:p-8">
                        <img 
                          src={imgUrl || undefined} 
                          alt={`${selectedProduct.nameEn} ${idx + 1}`} 
                          className="w-full h-full object-contain pointer-events-none select-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </motion.div>
                  
                  {/* Indicators */}
                  {productImages.length > 1 && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2">
                      {productImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIdx(idx);
                          }}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            activeImageIdx === idx 
                              ? 'w-6 bg-white' 
                              : 'w-2 bg-white/40 hover:bg-white/70'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SLIDE-OUT SHOPPING BAG DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-charcoal/60 z-[105] backdrop-blur-sm flex justify-end"
            id="shopping-bag-drawer-backdrop"
          >
            {/* Drawer sheet container */}
            <motion.div 
              initial={{ x: lang === 'ar' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? '-100%' : '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeInOut' }}
              className="bg-pure-white w-full max-w-md h-full flex flex-col shadow-2xl relative border-l border-surface-container-high"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-charcoal">{d.cart}</h3>
                  <span className="bg-primary text-pure-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <button 
                  onClick={() => { setIsCartOpen(false); setIsCheckingOut(false); }}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-charcoal active:scale-90 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer core contents scrolling depending on checkout state */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                
                {!isCheckingOut ? (
                  <>
                    {/* Item Row stack */}
                    <div className="space-y-3" id="cart-items-column">
                      {cart.map(item => (
                        <div 
                          key={item.product.id}
                          className="flex gap-4 p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high items-center justify-between"
                          id={`cart-row-${item.product.id}`}
                        >
                          <img 
                            src={item.product.image || undefined} 
                            alt={item.product.nameEn} 
                            className="w-16 h-16 rounded-lg object-cover bg-surface-container" referrerPolicy="no-referrer"
                          />
                          
                          <div className={`flex-1 min-w-0 px-1 text-start`}>
                            <h4 className={`font-bold text-charcoal text-sm truncate text-start`}>{lang === 'ar' ? item.product.nameAr : item.product.nameEn}</h4>
                            <div className={`flex items-center gap-1.5 flex-wrap justify-start`}>
                              <span className="text-[#007d54] text-xs font-bold font-sans">{formatPrice(getProductEffectivePrice(item.product))}</span>
                              {getProductEffectivePrice(item.product) < item.product.price && (
                                <span className="text-[11px] text-muted-gray line-through font-sans opacity-70">{formatPrice(item.product.price)}</span>
                              )}
                            </div>
                            
                            {/* Quantity controller stepper */}
                            <div className="flex items-center gap-2.5 mt-2 bg-surface-container-low border border-surface-container-high w-fit rounded-full px-2 py-0.5">
                              <button 
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                className="text-muted-gray hover:text-charcoal p-0.5"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-xs text-charcoal font-sans">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                className="text-muted-gray hover:text-charcoal p-0.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={() => removeCartItem(item.product.id)}
                            className="p-1 rounded-full text-red-500 hover:bg-red-50 active:scale-90 transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {cart.length === 0 && (
                        <div className="text-center py-20 space-y-4">
                          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mx-auto text-muted-gray">
                            <ShoppingCart className="w-8 h-8" />
                          </div>
                          <p className="text-xs text-muted-gray leading-relaxed">{d.emptyCart}</p>
                          <button 
                            onClick={() => { setIsCartOpen(false); setCurrentTab('shop'); }}
                            className="bg-primary hover:bg-[#005235] text-pure-white text-xs px-4 py-2.5 rounded-full font-bold"
                          >
                            {d.goShopping}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Summary and Discount system at bottom */}
                    {cart.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-surface-container-high">

                        {/* Calculated Invoice Breakdown */}
                        <div className="space-y-2 text-xs font-sans p-3 bg-surface-container-low/50 rounded-xl border border-surface-container-high">
                          {activeDiscount > 0 && (
                            <div className="flex justify-between items-center text-emerald-600 font-semibold">
                              <span>{d.discount} (-{activeDiscount}%)</span>
                              <span className="font-bold">-{formatCartTotal(discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-muted-gray">
                            <span>{d.shipping}</span>
                            <span className="font-bold text-primary">{d.free}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-bold text-charcoal pt-2 border-t border-surface-container-high">
                            <span>{d.total}</span>
                            <span className="font-black text-[#007d54] text-base">{formatCartTotal(cartTotal)}</span>
                          </div>
                        </div>

                      </div>
                    )}
                  </>
                ) : (
                  
                  /* INTERACTIVE CHECKOUT SUB-FORM SCREEN */
                  <form onSubmit={handlePlaceOrder} className="space-y-5" id="checkout-interactive-form">
                    <button 
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="flex items-center gap-1 text-xs text-primary font-bold hover:underline mb-2"
                    >
                      <ChevronLeft className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                      <span>{lang === 'ar' ? 'الرجوع ومراجعة السلة' : 'Back to Shopping Cart'}</span>
                    </button>

                    {/* Delivery Section */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-charcoal text-xs flex items-center gap-1 uppercase tracking-wider border-b border-surface-container pb-1 text-primary">
                        <MapPin className="w-4 h-4" />
                        <span>{d.shippingInfo}</span>
                      </h4>

                      <div className="space-y-3 text-xs font-sans">
                        <div>
                          <label className="text-muted-gray block mb-1">{d.fullName} *</label>
                          <input 
                            type="text" 
                            required
                            value={shippingForm.fullName}
                            onChange={(e) => setShippingForm(p => ({ ...p, fullName: e.target.value }))}
                            className="bg-pure-white border border-outline-variant rounded-lg w-full px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#007d54] text-charcoal font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-muted-gray block mb-1">{d.phoneNumber} *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="7xxxxxxxx"
                            value={shippingForm.phone}
                            onChange={(e) => setShippingForm(p => ({ ...p, phone: e.target.value }))}
                            className="bg-pure-white border border-outline-variant rounded-lg w-full px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#007d54] text-charcoal font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-muted-gray block mb-1">{d.streetAddress} *</label>
                          <input 
                            type="text" 
                            required
                            value={shippingForm.address}
                            onChange={(e) => setShippingForm(p => ({ ...p, address: e.target.value }))}
                            className="bg-pure-white border border-outline-variant rounded-lg w-full px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#007d54] text-charcoal font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Final checkout block */}
                    <div className="pt-2">
                      <div className="p-4 bg-surface-container border border-outline-variant rounded-2xl flex justify-between items-center mb-4 shadow-soft">
                        <span className="text-charcoal font-display text-sm sm:text-base font-bold">
                          {lang === 'ar' ? 'الاجــمـالـي :' : 'Total:'}
                        </span>
                        <span className="text-[#007d54] dark:text-[#10b981] font-display font-black text-lg sm:text-xl tracking-wider">
                          {formatCartTotal(cartTotal)}
                        </span>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#007d54] hover:bg-[#006c49] text-pure-white py-3.5 px-6 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-3 shadow-md active:scale-95 duration-100 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4.5 h-4.5" />
                        <span>{d.placeOrder}</span>
                      </button>
                    </div>

                  </form>
                )}

              </div>

              {/* Action drawer footer element (Only shown on shopping state when items &gt; 0) */}
              {!isCheckingOut && cart.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-surface-container-high bg-surface-container-low/70">
                  <button
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full bg-[#007d54] hover:bg-[#006c49] text-pure-white py-3.5 px-6 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-3 shadow-md active:scale-95 duration-100 cursor-pointer"
                  >
                    <span>{d.checkout}</span>
                    <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-pure-white/80 nav-blur border-t border-dashed border-surface-container shadow-[0_-4px_24px_rgba(0,0,0,0.02)] h-[72px] flex justify-around items-center px-4">
        <button 
          onClick={() => { setCurrentTab('shop'); setIsCheckingOut(false); }}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-150 ${
            currentTab === 'shop' ? 'text-primary font-semibold' : 'text-muted-gray hover:text-primary'
          }`}
          id="tab-shop"
        >
          <span className="material-symbols-outlined select-none" style={{ fontVariationSettings: currentTab === 'shop' ? "'FILL' 1" : "'FILL' 0" }}>storefront</span>
          <span className="font-label-sm text-[11px] font-medium leading-[1.2] mt-1.5 text-center px-1">{lang === 'ar' ? 'المتجر' : 'Shop'}</span>
        </button>

        <button 
          onClick={() => { setCurrentTab('search'); setIsCheckingOut(false); }}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-150 ${
            currentTab === 'search' ? 'text-primary font-semibold' : 'text-muted-gray hover:text-primary'
          }`}
          id="tab-search"
        >
          <span className="material-symbols-outlined select-none" style={{ fontVariationSettings: currentTab === 'search' ? "'FILL' 1" : "'FILL' 0" }}>search</span>
          <span className="font-label-sm text-[11px] font-medium leading-[1.2] mt-1.5 text-center px-1">{lang === 'ar' ? 'البحث' : 'Search'}</span>
        </button>

        <button 
          onClick={() => { setCurrentTab('account'); setIsCheckingOut(false); }}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-150 ${
            currentTab === 'account' ? 'text-primary font-semibold' : 'text-muted-gray hover:text-primary'
          }`}
          id="tab-account"
        >
          <span className="material-symbols-outlined select-none" style={{ fontVariationSettings: currentTab === 'account' ? "'FILL' 1" : "'FILL' 0" }}>local_offer</span>
          <span className="font-label-sm text-[11px] font-medium leading-[1.2] mt-1.5 text-center px-1">{lang === 'ar' ? 'العروض' : 'Offers'}</span>
        </button>

        <button 
          onClick={() => { setCurrentTab('orders'); setIsCheckingOut(false); }}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-150 ${
            currentTab === 'orders' ? 'text-primary font-semibold' : 'text-muted-gray hover:text-primary'
          }`}
          id="tab-orders"
        >
          <span className="material-symbols-outlined select-none" style={{ fontVariationSettings: currentTab === 'orders' ? "'FILL' 1" : "'FILL' 0" }}>diamond</span>
          <span className="font-label-sm text-[11px] font-medium leading-[1.2] mt-1.5 text-center px-1">{lang === 'ar' ? 'بيع سلعتك' : 'Sell'}</span>
        </button>

        <button 
          onClick={() => { setCurrentTab('history'); setIsCheckingOut(false); }}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-150 ${
            currentTab === 'history' ? 'text-primary font-semibold' : 'text-muted-gray hover:text-primary'
          }`}
          id="tab-history"
        >
          <span className="material-symbols-outlined select-none" style={{ fontVariationSettings: currentTab === 'history' ? "'FILL' 1" : "'FILL' 0" }}>receipt_long</span>
          <span className="font-label-sm text-[11px] font-medium leading-[1.2] mt-1.5 text-center px-1">{lang === 'ar' ? 'مشترياتي' : 'Purchases'}</span>
        </button>

        <button 
          onClick={() => { setCurrentTab('profile'); setIsCheckingOut(false); }}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-150 ${
            currentTab === 'profile' ? 'text-primary font-semibold' : 'text-muted-gray hover:text-primary'
          }`}
          id="tab-profile"
        >
          <span className="material-symbols-outlined select-none" style={{ fontVariationSettings: currentTab === 'profile' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
          <span className="font-label-sm text-[11px] font-medium leading-[1.2] mt-1.5 text-center px-1">{lang === 'ar' ? 'حسابي' : 'Account'}</span>
        </button>
      </nav>

    </div>
  );
}
