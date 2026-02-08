# Zeytinoglu Et - Toptanci Yonetim Sistemi

Et toptanciligi isletmesine yonelik kapsamli yonetim sistemi. Turborepo tabanli monorepo mimarisi ile gelistirilmistir.

## Proje Yapisi

```
zeytinoglu-et/
├── apps/
│   ├── api/            # NestJS Backend API
│   ├── admin/          # Yonetici Paneli (React + Vite + Ant Design)
│   ├── worker-app/     # Calisan Mobil Uygulamasi (Expo + WatermelonDB)
│   └── customer-app/   # Musteri Mobil Uygulamasi (Expo)
├── packages/
│   ├── database/       # Prisma ORM ve Veritabani Semasi
│   ├── types/          # Ortak TypeScript Tipleri ve DTO'lar
│   └── local-db/       # WatermelonDB Offline First Semalari
└── docker-compose.yml  # PostgreSQL Veritabani
```

## Teknolojiler

### Backend (apps/api)
- NestJS Framework
- Prisma ORM
- PostgreSQL Veritabani
- JWT Authentication
- Swagger API Dokumantasyonu
- Socket.io (Gercek zamanli iletisim)

### Admin Panel (apps/admin)
- React 18
- Vite
- Ant Design
- TanStack Query

### Mobil Uygulamalar (apps/worker-app, apps/customer-app)
- React Native (Expo)
- WatermelonDB (Offline First)

## Kurulum

### Gereksinimler
- Node.js >= 18
- Docker (PostgreSQL icin)
- npm >= 10

### Adimlar

1. Bagimliliklari yukleyin:
```bash
npm install
```

2. Docker ile veritabanini baslatin:
```bash
docker-compose up -d
```

3. Ortam degiskenlerini ayarlayin:
```bash
cp .env.example .env
# .env dosyasini duzenleyin
```

4. Prisma istemcisini olusturun:
```bash
npm run generate -w @repo/database
```

5. Veritabani migrasyonlarini calistirin:
```bash
npm run migrate:dev -w @repo/database
```

6. (Opsiyonel) Ornek verileri yukleyin:
```bash
npm run seed -w @repo/database
```

7. Gelistirme sunucusunu baslatin:
```bash
npm run dev
```

## Ortam Degiskenleri

```env
# Veritabani Baglanti Dizesi
DATABASE_URL="postgresql://user:password@localhost:5432/wholesaler?schema=public"

# JWT Ayarlari
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
```

## API Dokumantasyonu

API calistiktan sonra Swagger dokumantasyonuna asagidaki adresten ulasabilirsiniz:

```
http://localhost:3000/api
```

## Kullanici Rolleri

- **ADMIN**: Tam yetki. Tum sistem ayarlari ve kullanici yonetimi.
- **WORKER**: Siparis islemleri, stok yonetimi, teslimat takibi.
- **CUSTOMER**: Siparis olusturma, siparis gecmisi goruntuleme, hesap bakiyesi.

## Is Kurallari

### Siparis Akisi
1. PENDING: Siparis olusturuldu
2. CONFIRMED: Onaylandi
3. PROCESSING: Hazirlaniyor
4. SHIPPED: Sevke verildi
5. DELIVERED: Teslim edildi
6. CANCELLED: Iptal edildi

### Stok Yonetimi
- Negatif stok destegi (stok eksi olabilir)
- Dinamik fiyatlandirma (musteriye ozel fiyatlar)
- Tedarikci bazli stok takibi

### Hesap Yonetimi
- Musteri hesap bakiyesi takibi
- Odeme ve borc kayitlari
- Hesap kilitlenebilir (restricted modu)

## Gelistirme

### Tum Servisleri Baslat
```bash
npm run dev
```

### Sadece API
```bash
npm run dev -w api
```

### Sadece Admin Panel
```bash
npm run dev -w admin
```

### Build
```bash
npm run build
```

## Lisans

Bu proje ozel kullanim icindir. Tum haklar saklidir.
