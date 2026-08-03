# 🛍️ متجري — دليل التشغيل المحلي

## المتطلبات

| الأداة | الإصدار الأدنى |
|--------|--------------|
| Node.js | 20+ |
| pnpm | 9+ |
| PostgreSQL | 15+ |

---

## 1. تثبيت pnpm (إذا لم يكن مثبتاً)

```bash
npm install -g pnpm
```

---

## 2. تثبيت الحزم

```bash
pnpm install
```

---

## 3. إعداد قاعدة البيانات

### أنشئ قاعدة بيانات جديدة في PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE matjari;"
```

### شغّل سكريبت إنشاء الجداول:

```bash
psql -U postgres -d matjari -f scripts/setup-db.sql
```

---

## 4. إعداد متغيرات البيئة

انسخ الملف وعدّل القيم:

```bash
cp .env.example .env
```

افتح ملف `.env` وعدّل:

```env
DATABASE_URL=postgresql://postgres:كلمة_المرور@localhost:5432/matjari
SESSION_SECRET=اكتب_هنا_نص_عشوائي_طويل
```

---

## 5. إعداد متغيرات الـ Frontend

```bash
cp artifacts/matjari/.env.example artifacts/matjari/.env
```

محتوى `artifacts/matjari/.env`:

```env
PORT=5173
BASE_PATH=/
API_PORT=8080
```

---

## 6. تشغيل المشروع

افتح **تيرمينالين** منفصلين:

### التيرمينال الأول — API Server:

```bash
cd artifacts/api-server
PORT=8080 pnpm dev
```

### التيرمينال الثاني — Frontend:

```bash
cd artifacts/matjari
PORT=5173 BASE_PATH=/ pnpm dev
```

ثم افتح المتصفح على: **http://localhost:5173**

---

## 7. إنشاء حساب تاجر

افتح: **http://localhost:5173/register**

أو أضف تاجراً تجريبياً مباشرة عبر الـ API:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@matjari.iq",
    "password": "demo1234",
    "storeName": "متجري التجريبي",
    "slug": "demo"
  }'
```

---

## هيكل المشروع

```
matjari/
├── artifacts/
│   ├── api-server/     # Express.js + Drizzle ORM (المنفذ 8080)
│   └── matjari/        # React + Vite (المنفذ 5173)
├── lib/
│   ├── db/             # Schema + Drizzle config
│   ├── api-client-react/  # Generated React Query hooks
│   └── api-zod/        # Generated Zod schemas
├── scripts/
│   └── setup-db.sql    # سكريبت إنشاء الجداول
├── .env.example        # نموذج المتغيرات البيئية
└── LOCAL_SETUP.md      # هذا الملف
```

---

## حل المشاكل الشائعة

| المشكلة | الحل |
|---------|------|
| `DATABASE_URL must be set` | تأكد من وجود ملف `.env` في جذر المشروع |
| `PORT is required` | أضف `PORT=8080` عند تشغيل api-server |
| `EADDRINUSE` | المنفذ مستخدم — غيّر `PORT` أو أوقف العملية القديمة |
| صفحة فارغة في المتصفح | تأكد من إضافة الـ proxy في vite.config.ts |
| خطأ 401 في كل الطلبات | `SESSION_SECRET` مختلف — تأكد من نفس القيمة |
