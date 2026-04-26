import type { StatusOption, UserRole } from "@/types";

export const statusOptionLabels: Record<StatusOption, string> = {
  station_ok: "المحطة سليمة",
  station_replaced: "تم تغيير المحطة",
  bait_changed: "تم تغيير الطعم",
  bait_ok: "الطعم سليم",
  station_excluded: "استبعاد المحطة",
  station_substituted: "استبدال المحطة",
};

export const roleLabels: Record<UserRole, string> = {
  technician: "فني",
  supervisor: "مشرف",
  manager: "مدير",
};

export const i18n = {
  appName: "Bedoo",
  appNameArabic: "بيدو",
  appTitle: "إدارة محطات الطعوم",
  brandTagline: "تشغيل ميداني واضح لمحطات الطعوم وفرق الفحص",
  actions: {
    backToLogin: "العودة لتسجيل الدخول",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    retry: "إعادة المحاولة",
  },
  auth: {
    email: "البريد الإلكتروني",
    emailPlaceholder: "name@company.com",
    genericLoginError: "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.",
    inactiveAccount: "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.",
    invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا.",
    loginTitle: "تسجيل دخول الفريق",
    loginSubtitle: "استخدم حساب الشركة للمتابعة.",
    missingProfile: "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.",
    password: "كلمة المرور",
    passwordPlaceholder: "••••••••",
    passwordRequired: "كلمة المرور مطلوبة.",
    rateLimited: "تم إيقاف المحاولات مؤقتًا. حاول لاحقًا.",
    sessionExpired: "انتهت الجلسة. سجل الدخول مرة أخرى.",
    signingIn: "جار تسجيل الدخول...",
    logoutError: "تعذر تسجيل الخروج. حاول مرة أخرى.",
  },
  dashboard: {
    managerTitle: "لوحة المدير",
    supervisorTitle: "لوحة المشرف",
    phaseBadge: "المرحلة الأولى",
    protectedRoute: "مسار محمي",
    authReady: "تم تفعيل الدخول الآمن",
    securityReady: "الصلاحيات تعمل حسب الدور",
    placeholderBody: "هذه الصفحة جاهزة للتحقق من الصلاحيات وسيتم استكمال أدواتها في المراحل التالية.",
  },
  insights: {
    title: "موجز ذكي",
    subtitle: "قراءة سريعة لأهم المخاطر التشغيلية والفرص استنادًا إلى بيانات المحطات والتقارير.",
    generate: "توليد الموجز",
    generating: "جار توليد الموجز...",
    generatedAt: "آخر تحديث",
    alerts: "تنبيهات",
    recommendations: "إجراءات مقترحة",
    unavailable: "تعذر توليد الموجز الآن.",
    sourceGemini: "مدعوم بواسطة Gemini",
    sourceFallback: "ملخص محلي احتياطي",
    missingKey: "المفتاح GEMINI_API_KEY غير مضبوط، لذلك تم عرض ملخص محلي بدل Gemini.",
  },
  errors: {
    accessDenied: "ليست لديك صلاحية للوصول إلى هذه الصفحة.",
    accessDeniedTitle: "وصول غير مصرح",
    unexpected: "حدث خطأ غير متوقع. حاول مرة أخرى.",
  },
  scan: {
    title: "مسح رمز المحطة",
    subtitle: "افتح رابط المحطة من رمز QR للانتقال إلى نموذج الفحص.",
    loginCta: "تسجيل دخول الفني",
    phaseNotice: "سيتم تفعيل نموذج الفحص في المرحلة الثالثة.",
  },
  theme: {
    dark: "الوضع الداكن",
    light: "الوضع الفاتح",
  },
  validation: {
    requiredEmail: "البريد الإلكتروني مطلوب.",
  },
} as const;
