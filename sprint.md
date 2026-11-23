# Dokumentasi Sprint & Pembagian SRS — Lab Session Manager

Dokumen ini merangkum seluruh perencanaan sprint, pembagian tugas dan SRS (*Software Requirements Specification*) untuk masing-masing programmer, serta peta implementasi teknis pada project **Lab Session Manager**.

---

## 📌 Ringkasan Proyek

* **Nama Aplikasi:** Lab Session Manager
* **Platform:** Mobile (Android & iOS) dan Web (Fallback)
* **Teknologi:** React Native (Expo SDK 58), TypeScript, Expo Router, NativeTabs
* **State Management:** React Context (`AuthContext`, `SessionContext`)
* **Backend & Database:** Firebase Authentication & Cloud Firestore
* **Peta & Geolocation:** Google Maps (`react-native-maps`), `expo-location`
* **Model AI On-Device:** Pure JavaScript Classifier & Sentiment Analysis (`ai/sentiment.js`)
* **Push Notification:** Expo Notification Service API (`expo-notifications`)

---

## 🚀 Roadmap Pengembangan (Sprint 1, 2, dan 3)

### 🔹 Sprint 1: Antarmuka Dasar & Alur Praktikum (Data Lokal / Dummy)
Fokus pada perancangan antarmuka, layout, navigasi role, dan interaksi dasar menggunakan data *in-memory* (`dummy.ts`):
1. **Jadwal & Detail Sesi:** Menampilkan daftar sesi praktikum, membedakan sesi `OPEN`, `CLOSED`, dan belum dibuka.
2. **Pengelolaan Sesi oleh Asisten:** Kontrol pembukaan dan penutupan sesi praktikum secara lokal.
3. **Pencatatan Presensi Praktikan:** Presensi praktikan saat sesi dibuka, pencatatan timestamp kehadiran, dan pencegahan presensi ganda.
4. **Rekap Kehadiran:** Tampilan daftar kehadiran praktikan untuk asisten dan riwayat kehadiran pribadi untuk praktikan.
5. **Layout & Desain:** Dark theme Dracula/Navy (`#12121A`, `#1E1E2A`), modal konfirmasi, dan navigasi berbasis Expo Router.

### 🔹 Sprint 2: Data Dinamis Firebase, Aturan Keamanan & AI On-Device
Fokus pada integrasi database Cloud Firestore, autentikasi riil, keamanan data, dan model sentimen lokal:
1. **Firebase Authentication:** Registrasi dan login akun, penguncian peran (`praktikan` vs `asisten`).
2. **CRUD Praktikum Firestore:** Asisten mengelola Kelas (`classes`), Jadwal (`schedules`), dan Sesi (`sessions`).
3. **Kontrol Sesi Real-Time:** Sinkronisasi status sesi atomik (`OPEN` / `CLOSED`) dengan audit log status.
4. **Rekap Presensi Realtime:** Penggunaan listener `onSnapshot` untuk memperbarui data presensi seketika.
5. **Modul Pengajuan & Peninjauan Izin:** Praktikan mengajukan izin (`leave_requests`), asisten meninjau dan memberi keputusan (`APPROVED` / `REJECTED`).
6. **Integrasi AI Sentimen On-Device:** Analisis sentimen teks alasan izin dan ekstraksi otomatis kategori izin (`SAKIT`, `DISPENSASI`, `IZIN_AKADEMIK`, `LAINNYA`) secara lokal tanpa internet.
7. **Firebase Security Rules:** Proteksi baca-tulis berbasis UID dan role asisten (`firestore.rules`).

### 🔹 Sprint 3: Integrasi Lokasi, Google Maps, Geofence & Push Notification
Fokus pada pemanfaatan sensor lokasi perangkat, visualisasi spasial laboratorium, validasi radius presensi, dan sistem notifikasi instan.

---

## 👥 Pembagian Tugas & SRS Masing-Masing Programmer (Sprint 3)

Pada Sprint 3, pengembangan dibagi secara modular ke dalam 3 programmer:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SPRINT 3 TEAM SCOPE                             │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│       PROGRAMMER 1       │       PROGRAMMER 2       │     PROGRAMMER 3      │
│  Presensi & Geofencing   │   Lokasi Lab & Maps      │   Push Notification   │
│       (SRS-01..06)       │       (SRS-07..12)       │     (SRS-13..16)      │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

---

### 👨‍💻 PROGRAMMER 1 — Presensi Berbasis Lokasi & Geofencing (SRS-01 s/d SRS-06)

Bertanggung jawab atas alur validasi presensi praktikan menggunakan koordinat fisik dan pencegahan kecurangan:

* **SRS-01 — Halaman Presensi Terpisah:** Menyediakan alur dan antarmuka presensi khusus yang memvalidasi kondisi sesi aktif sebelum presensi dilakukan.
* **SRS-02 — Hook Geolocation & Permission (`useLocation`):** Mengelola permintaan izin lokasi perangkat Android foreground (`ACCESS_FINE_LOCATION`) dan pengambilan koordinat akurat.
* **SRS-03 — Perhitungan Jarak Haversine:** Mengimplementasikan kalkulasi jarak matematis antara posisi pengguna dan titik koordinat laboratorium tujuan dalam satuan meter (`attendance-location.ts`).
* **SRS-04 — Validasi Presensi Radius Geofence:** Mengizinkan presensi hanya jika sesi berstatus `OPEN` dan jarak fisik praktikan $\le$ radius toleransi lab (contoh: 50 meter). Menolak presensi di luar radius.
* **SRS-05 — Pencegahan Presensi Ganda & Rekap Kehadiran:** Menggunakan composite ID (`attendance-${sessionId}-${userId}`) dan atomic update agar praktikan tidak dapat melakukan presensi ganda pada sesi yang sama.
* **SRS-06 (Opsional) — Presensi QR Code:** Pemindaian QR Code sesi dinamis sebagai alternatif/pelengkap validasi lokasi.

---

### 👨‍💻 PROGRAMMER 2 — Pengelolaan Lab, Peta Interaktif & Aktivitas Lab (SRS-07 s/d SRS-12)

Bertanggung jawab atas pemetaan spasial laboratorium informatika, pelacakan live user, dan pemantauan aktivitas lab:

* **SRS-07 — Pengelolaan Lokasi Laboratorium (CRUD `labs`):** 
  * Asisten dapat membuat, mengedit, dan menghapus master data laboratorium di Firestore (koleksi `labs`).
  * Field: ID, nama lab, kode lab, gedung, lantai, kapasitas, deskripsi, latitude, longitude, dan radius presensi.
  * Fitur pembantu: Tombol *"📍 Isi Otomatis dengan Lokasi Saat Ini"* pada form modal.
* **SRS-08 — Peta Laboratorium Interaktif (Google Maps):**
  * Halaman peta interaktif (`maps.tsx`) dengan marker seluruh laboratorium.
  * Marker interaktif (`LabMarker`) dengan badge status aktif (`LIVE` / `🟢`) jika ada sesi berlangsung.
  * Visualisasi lingkaran radius geofence (`Circle`) saat marker laboratorium dipilih.
* **SRS-09 — Marker Lokasi Pengguna Real-Time:**
  * Pelacakan live posisi perangkat pengguna menggunakan `watchPositionAsync` yang efisien baterai (`timeInterval: 5000ms`, `distanceInterval: 5m`).
  * Marker animasi denyut (`UserMarker`) yang terus mengikuti pergerakan pengguna.
* **SRS-10 — Informasi Aktivitas Laboratorium (`LabActivitySheet`):**
  * Bottom sheet interaktif saat marker lab ditekan:
    * Sesi Sedang Berlangsung (*Ongoing*): nama praktikum, kelas, waktu, asisten penanggung jawab, status sesi.
    * Sesi Berikutnya (*Next*): jadwal praktikum terdekat di lab tersebut.
    * Status jangkauan: Jarak fisik real-time (Haversine) dan status apakah pengguna di dalam/luar radius.
    * Tombol aksi cepat: *"Buka Layar Presensi"* bagi praktikan jika sesi terbuka.
* **SRS-11 — Sinkronisasi Real-Time Peta & Aktivitas Lab:**
  * Terkoneksi ke Firestore melalui `subscribeToCollection(COLLECTIONS.LABS)` di `SessionContext`.
  * Informasi status lab otomatis ter-update seketika saat asisten membuka/menutup sesi di tempat lain.
* **SRS-12 — Error Handling & Fallback Peta:**
  * Banner penanganan izin lokasi ditolak dan status GPS nonaktif dengan tombol coba lagi.
  * Antarmuka cadangan `MapFallbackList` berbasis daftar kartu pencarian lab untuk platform Web dan kondisi ketika peta gagal dimuat.

---

### 👨‍💻 PROGRAMMER 3 — Push Notification & Pemicu Event (SRS-13 s/d SRS-16)

Bertanggung jawab atas komunikasi asinkron melalui push notification langsung ke perangkat Android pengguna:

* **SRS-13 — Setup Push Notification & Token Sync:**
  * Pendaftaran Android Notification Channel (`importance: MAX`, getaran, suara).
  * Pengambilan `ExpoPushToken` dan sinkronisasi otomatis token ke dokumen user di Firestore (`users/{uid}`) saat login.
  * Komponen banner permintaan izin notifikasi pada root layout (`notification-permission-banner.tsx`).
* **SRS-14 — Notification Handlers & Deep Linking:**
  * Handler notifikasi saat aplikasi berada di latar depan (*foreground*), latar belakang (*background*), maupun kondisi mati (*terminated*).
  * Routing otomatis saat notifikasi ditekan (misal: notifikasi izin membuka layar `/praktikan/izin`).
* **SRS-15 — Pemicu Notifikasi Sesi & Jadwal:**
  * Mengirim push broadcast ke seluruh praktikan saat asisten **membuka sesi praktikum** (`status: OPEN`).
  * Mengirim notifikasi saat jadwal praktikum diubah/diperbarui oleh asisten.
* **SRS-16 — Pemicu Notifikasi Keputusan Izin & Penanganan Gagal:**
  * Mengirim notifikasi langsung ke praktikan bersangkutan saat permohonan izin diberi keputusan (`APPROVED` / `REJECTED`) beserta catatan asisten.
  * Logging dan penanganan error jika pengiriman push notification gagal tanpa membatalkan transaksi utama di Firestore.

---

## 🗂️ Pemetaan File Implementasi Berdasarkan Komponen

| Modul / Scope | Komponen & Layar | Service, Context & Utils |
| :--- | :--- | :--- |
| **Auth & Routing** | `src/app/(auth)/login.tsx`<br>`src/app/(auth)/register.tsx`<br>`src/components/auth-form.tsx` | `src/context/auth-context.tsx`<br>`src/services/firebase.ts` |
| **Programmer 1 (Presensi & Geofence)** | `src/app/(main)/praktikan/[id].tsx`<br>`src/components/praktikan/PresensiModal.tsx`<br>`src/app/(main)/praktikan/riwayat.tsx` | `src/utils/attendance-location.ts`<br>`src/context/session-context.tsx` (`recordAttendance`) |
| **Programmer 2 (Labs & Maps)** | `src/app/(main)/maps.tsx`<br>`src/components/maps/lab-marker.tsx`<br>`src/components/maps/user-marker.tsx`<br>`src/components/maps/lab-activity-sheet.tsx`<br>`src/components/maps/map-fallback-list.tsx`<br>`src/components/asisten/lab-card.tsx`<br>`src/components/asisten/lab-form-modal.tsx` | `src/hooks/use-location.ts`<br>`src/services/firestore-service.ts` (`labs` CRUD)<br>`app.config.js` (Google Maps API Key injection) |
| **Programmer 3 (Push Notification)** | `src/components/common/notification-permission-banner.tsx` | `src/services/notification-service.ts`<br>`src/context/session-context.tsx` (Trigger event notifikasi) |
| **Manajemen Asisten & AI** | `src/app/(main)/index.tsx`<br>`src/app/(main)/explore.tsx`<br>`src/components/asisten/*`<br>`src/components/izin/*` | `src/services/ai-sentiment.ts`<br>`ai/sentiment.js` & `ai/model-edom.json` |

---

## 📋 Catatan Penyelarasan Akhir Tim (Action Items Sebelum Rilis)

1. **Sinkronisasi Ruangan Sesi dengan Master Lab:**
   Ganti input teks manual ruangan (`room`) pada modal kelas dan sesi asisten menjadi pilihan *dropdown* yang mengambil data dari koleksi `labs`.
2. **Penyelarasan Dual SDK Firebase:**
   Pastikan instance Firestore di `firestore-service.ts` berbagi autentikasi dengan `auth-context.tsx` saat berjalan di native Android.
3. **Integrasi QR Code dari `main`:**
   Gabungkan commit `feat/session-qr` dari branch `main` ke `dev` agar presensi QR dan Geofence menyatu.
4. **Tampilan Rekomendasi AI di Review Asisten:**
   Munculkan badge kategori dan sentimen hasil analisis AI pada modal peninjauan izin asisten (`leave-review-modal.tsx`).
