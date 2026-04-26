# Mawqi3 Field — تطبيق موقعي الميداني

تطبيق Expo مرافق لنظام Mawqi3. الهدف منه فتح مسار الفني بسرعة من الهاتف: شاشة مسح، إدخال رقم المحطة يدويًا عند الحاجة، وإرسال تقارير ميدانية. حسابات المدير والمشرف تفتح بوابة الويب الإدارية المناسبة بجلسة مؤقتة آمنة.

## التشغيل

```bash
npm install
npm run start
npm run web
```

انسخ `.env.example` إلى `.env` واضبط:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_MAWQI3_WEB_BASE_URL=https://your-mawqi3-domain.com
```

تسجيل الدخول في الموبايل يستخدم Firebase Auth مباشرة بالبريد الإلكتروني وكود الدخول. `EXPO_PUBLIC_MAWQI3_WEB_BASE_URL` لا يظهر في شاشة الدخول، لكنه مطلوب لفتح بوابة المدير/المشرف ومزامنة التقارير مع API الويب.

## الملاحظات الأمنية

- لا توجد مفاتيح Firebase Admin أو Gemini داخل تطبيق الموبايل.
- التطبيق يقرأ profile المستخدم النشط من `users/{uid}` في Firestore بعد تسجيل Firebase Auth.
- المدير والمشرف يفتحون بوابة الويب عبر رابط handoff قصير العمر يستخدم مرة واحدة.
- الوضع الداكن مدعوم من داخل التطبيق: النظام، فاتح، داكن.
