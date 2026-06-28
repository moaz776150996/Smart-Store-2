import { Product, Dictionary } from './types';

export const HERO_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBhVlhtTMGXTdY_tTiuODm14hNULW9N2ksKXyfacIHtC2mvHYq22HpSZF0x7Fb1k5TNGP8GQEL2qWv582Z6FQE4UxEuIE1UERvLixvtWQytg9LHB6yjHV5h3fLgsl3R8jaYNTHo6r5l8pUm6YNvj-52yqCC-wAJjkk4K26rU-vcOjCH9iU2qoMfi6PAX9f9bSzqUs5s23drfzzI21SUeqLpWcAxsFTusA9CeTt05qjjSzdQKDc0B906jyp35E0axCe8kaVaYwVAMA';

export const PRODUCTS: Product[] = [].map(p => {
  const urls = (p.image || '')
    .split(/[\r\n,\s]+/)
    .map(u => {
      let cleaned = u.trim().replace(/^["'`\s\[\(]+|["'`\s\]\)]+$/g, '');
      if (/^https?:\/\//i.test(cleaned)) {
        cleaned = cleaned.replace(/^https?:\/\//i, (match) => match.toLowerCase());
      }
      return cleaned;
    })
    .filter(Boolean)
    .filter(u => u.toLowerCase().startsWith('http'));
  return {
    ...p,
    image: urls[0] || '',
    images: urls
  };
});

export const DICTIONARY: Record<'ar' | 'en', Dictionary> = {
  en: {
    shop: 'Showcase',
    search: 'Search',
    orders: 'Sell Your Item',
    account: 'Special Offers',
    addToCart: 'Add to Cart',
    quantity: 'Quantity',
    cart: 'Shopping Cart',
    checkout: 'Proceed to Checkout',
    subtotal: 'Subtotal',
    total: 'Total Amount:',
    discount: 'Promo Discount',
    shipping: 'Free delivery inside Shabwah province only',
    free: '',
    applyPromo: 'Apply',
    promoCode: 'Coupon: e.g. SMART10',
    promoSuccess: 'SMART coupon applied successfully! (10% Off)',
    invalidPromo: 'Non-active coupon code',
    placeOrder: 'Complete Purchase',
    orderCompleted: 'Order Confirmed!',
    tracking: 'Track Status',
    searchPlaceholder: 'Search high-end items...',
    categoryAll: 'All Collections',
    categoryWatch: 'Watches',
    categoryAudio: 'Audio Eng.',
    categoryAccessory: 'Desk accessories',
    categoryLiving: 'Design Objects',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    shippingInfo: 'Delivery Coordinates',
    fullName: 'Full Name',
    emailAddress: 'Your Email',
    phoneNumber: 'Yemeni Phone (7xxxxxxxx)',
    streetAddress: 'Your current location (for delivery)',
    city: 'City (e.g. Riyadh)',
    postalCode: 'Postal Zip Code',
    paymentDetails: 'Secured Checkout Payment',
    cardNumber: 'Debit / Card Number',
    expiryDate: 'Exp Date (MM/YY)',
    cvv: 'CVV Security code',
    orderStatusPlaced: 'Order Placed',
    orderStatusProcessing: 'In Atelier Preparation',
    orderStatusShipped: 'Shipped via Aramex',
    orderStatusDelivered: 'Delivered Safely',
    emptyCart: 'Your luxury shopping cart is pristine and empty.',
    emptyOrders: 'No orders recorded yet. Begin placing orders!',
    goShopping: 'Explore Collections',
    newArrival: 'New Arrival',
    ofTheWeek: 'Design of the Week',
    exclusiveHeroTitleEn: 'Exclusive Autumn Collection',
    exclusiveHeroTitleAr: 'مجموعة الخريف الحصرية والفريدة',
    heroButtonEn: 'Inquire Now',
    heroButtonAr: 'تسوق الآن',
    shippingFeatureTitleEn: 'Safe & Fast Air Shipping',
    shippingFeatureTitleAr: 'شحن سريع ومجاني آمن بالكامل'
  },
  ar: {
    shop: 'المتجر والمعرض',
    search: 'البحث',
    orders: 'اعرض سلعتك للبيع',
    account: 'العروض الخاصة',
    addToCart: 'إضافة للسلة',
    quantity: 'الكمية المطلوبة',
    cart: 'سلة التسوق والخيارات',
    checkout: 'الانتقال لإنهاء المشتريات',
    subtotal: 'المجموع الفرعي',
    total: 'اجمالي المبلغ:',
    discount: 'خصم الكوبون النشط',
    shipping: 'التوصيل مجاني داخل محافظة شبوة فقط',
    free: '',
    applyPromo: 'تطبيق الخصم',
    promoCode: 'رمز الكوبون: مثال SMART10',
    promoSuccess: 'تم تطبيق كوبون سمارت بنجاح! خصم بقيمة 10٪',
    invalidPromo: 'الكوبون المدخل غير نشط حالياً',
    placeOrder: 'تأكيد وشراء الآن',
    orderCompleted: 'تم إرسال وتأكيد طلبك بنجاح!',
    tracking: 'مراقبة حالة الشحن',
    searchPlaceholder: 'ابحث عن منتجاتنا الفاخرة هنا...',
    categoryAll: 'جميع الأقسام',
    categoryWatch: 'ساعات يد راقية',
    categoryAudio: 'هندسة صوتيات فاخرة',
    categoryAccessory: 'ملحقات ومستلزمات مكتبية',
    categoryLiving: 'تحف ومجسمات فنية',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    shippingInfo: 'إحداثيات وبيانات التوصيل الأساسية',
    fullName: 'الاسم الكامل الثلاثي',
    emailAddress: 'عنوان البريد الإلكتروني',
    phoneNumber: 'رقم الهاتف الجوال اليمني',
    streetAddress: 'مكانك الحالي (من اجل توصيل منتجك اليك)',
    city: 'المدينة المقيم بها (مثال: مستودع الرياض)',
    postalCode: 'الرمز البريدي المقارب',
    paymentDetails: 'بوابة الدفع الآمنة المشفرة',
    cardNumber: 'رقم بطاقة مدى أو الفيزا العالمية',
    expiryDate: 'تاريخ انتهاء الصلاحية والشهر (MM/YY)',
    cvv: 'رمز التحقق الخلفي الثلاثي (CVV)',
    orderStatusPlaced: 'تم استلام وتوثيق الطلب بالمتجر',
    orderStatusProcessing: 'الطلب قيد التجهيز والتلميع',
    orderStatusShipped: 'تم تسليم الشحنة لشركة أرامكس للتو',
    orderStatusDelivered: 'تم توصيل الطلب بنجاح لكم',
    emptyCart: 'سلة تسوقك فارغة وأنيقة تماماً.',
    emptyOrders: 'لم يتم تسجيل أي طلبات بعد. ابدأ أول تجربة توصيل مميزة!',
    goShopping: 'استكشاف المجموعات وتصفح المنتجات',
    newArrival: 'تحفة جديدة',
    ofTheWeek: 'تصميم الأسبوع المميز',
    exclusiveHeroTitleEn: 'Exclusive Autumn Collection',
    exclusiveHeroTitleAr: 'مجموعة الخريف الحصرية والفريدة',
    heroButtonEn: 'Inquire Now',
    heroButtonAr: 'تسوق الآن',
    shippingFeatureTitleEn: 'Safe & Fast Air Shipping',
    shippingFeatureTitleAr: 'شحن سريع ومجاني آمن بالكامل'
  }
};
