# 🎨 Dokumen Desain UI/UX — LABORA (Smart Laboratory Suite)

Dokumen ini merupakan panduan resmi sistem desain antarmuka (*Design System*) aplikasi **LABORA — Sistem Manajemen Praktikum Universitas Terintegrasi** yang diadaptasi dari rancangan **Google Stitch**.

---

## 🏛 1. Filosofi & Karakter Visual

Desain LABORA mengusung tema **Akademik Modern & Presisi Laboratorium** dengan karakteristik:
1. **Warna Dominan Berwibawa:** Menggunakan palet utama **Deep Wine / Maroon (`#661633`)** dipadukan dengan aksen lembut **Rose Blush (`#FDF2F4`)** dan latar belakang hangat **Off-White (`#FAF7F8`)**.
2. **Kartu & Permukaan Bersih:** Setiap blok konten dibungkus dalam kartu putih bersih dengan radius membulat halus (`16px–20px`) dan garis tepi tipis (*subtle border* `#F0E6EA`).
3. **Hirarki Tipografi Tegas:** Judul yang berani (*bold 700*) dipadukan dengan teks metadata yang rapi (*medium 500 / regular 400*) dan badge status (*pills*).
4. **Indikator Spasial & Geofence:** Visualisasi radar pemindaian radius 30 meter konsentris yang intuitif untuk verifikasi kehadiran berbasis lokasi.
5. **Transparansi Sensor & AI:** Menampilkan indikator verifikasi 4 lapis (GPS, Waktu Server, Wi-Fi Lab, Anti-Mock) dan kartu rekomendasi klasifikasi AI On-Device yang elegan.

---

## 🎨 2. Palet Token Warna (Labora Color Palette)

| Kategori Token | Nama Token | Nilai Hex | Penggunaan Utama |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `primary` | `#661633` | Warna tombol utama, tab aktif, header teks brand, lingkaran gauge |
| **Brand Hover/Dark**| `primaryDark` | `#4E1026` | Status tombol ditekan (*active/pressed*), outline tebal |
| **Brand Light** | `primaryLight` | `#8A2246` | Gradasi aksen, badge prioritas sedang |
| **Brand Soft / Blush**| `primarySoft` | `#FDF2F4` | Latar belakang badge aktif, kartu sorotan, tombol sekunder |
| **Brand Border** | `primaryBorder`| `#F3D8DF` | Garis tepi kartu utama, garis batas input aktif |
| **Background App** | `background` | `#FAF7F8` | Latar belakang seluruh layar aplikasi |
| **Surface / Card** | `surface` | `#FFFFFF` | Permukaan kartu, modal dialog, formulir input |
| **Surface Muted** | `surfaceMuted` | `#F5F0F2` | Latar belakang kolom pencarian, toggle tab tidak aktif |
| **Text Primary** | `textPrimary` | `#1F151A` | Judul, angka statistik, teks label utama |
| **Text Secondary** | `textSecondary`| `#7A6B74` | Teks keterangan, subtitle, placeholder form |
| **Text Muted** | `textMuted` | `#A3969E` | Waktu lampau, teks disclaimer footer |
| **Success / Hadir** | `success` | `#10B981` | Badge "Tepat Waktu", "Hadir", ikon centang verifikasi |
| **Success Soft** | `successSoft` | `#ECFDF5` | Latar belakang badge status hadir dan validasi geofence |
| **Warning / Review**| `warning` | `#F59E0B` | Badge "Menunggu Review", "Izin", sesi "Terjadwal" |
| **Warning Soft** | `warningSoft` | `#FEF3C7` | Latar belakang kartu permohonan persetujuan |
| **Danger / Luar** | `danger` | `#EF4444` | Badge "Luar Geofence", tombol "Tolak Izin" |
| **Danger Soft** | `dangerSoft` | `#FEE2E2` | Latar belakang status di luar radius lab |

---

## 📐 3. Tipografi & Ukuran Sudut (Radius)

### Tipografi
* **Hero Display:** Ukuran 28px–32px, `FontWeight: '700'`, LineHeight: 36px.
* **Heading 1:** Ukuran 20px–22px, `FontWeight: '700'`, LineHeight: 28px.
* **Heading 2 / Card Title:** Ukuran 16px–18px, `FontWeight: '600'`, LineHeight: 24px.
* **Body / Input Text:** Ukuran 14px–15px, `FontWeight: '400'` / `'500'`, LineHeight: 20px.
* **Caption & Badge:** Ukuran 11px–12px, `FontWeight: '600'`, LetterSpacing: 0.2px.

### Corner Radii
* **Pill / Badge:** `9999px` (lingkaran penuh).
* **Card / Container:** `16px` – `20px`.
* **Button:** `12px` – `14px` (rounded modern).
* **Input Field:** `12px`.

---

## 📱 4. Pemetaan Layar Desain Google Stitch ke Kode Aplikasi

| Layar Desain Stitch | Peran | File Rute / Komponen Eksisting | Komponen Utama yang Diperbarui |
| :--- | :---: | :--- | :--- |
| **1. Beranda Asprak** | Asprak | `src/app/(main)/index.tsx` | Stat Cards 2x2, Hero Sesi Berlangsung (Progress bar kehadiran), Kartu Persetujuan Izin Cepat, Jadwal Hari Ini. |
| **2. Detail Sesi Praktikum** | Asprak | `src/components/asisten/session-detail-modal.tsx` | Kendali Sesi (`Geofence (30m)`, `Tutup Sesi`, Switch toleransi manual), Ringkasan kehadiran (4 box statistik), Search & Filter pills, Daftar presensi GPS (Aditya, Bella, Dimas, Eko). |
| **3. Izin Masuk (Review Izin)** | Asprak | `src/components/asisten/leave-review-modal.tsx`<br>`src/app/(main)/explore.tsx` | Kartu Kebijakan AI Otomatis, Kartu pengajuan izin dengan badge `Kategori AI: Sakit (96%)` & `Dispensasi`, Attachment preview PDF, Tombol `Tolak` & `Setujui`. |
| **4. Portal Masuk (Auth)** | Bersama | `src/components/auth-form.tsx`<br>`src/app/(auth)/login.tsx` | Logo LABORA, Toggle peran (`🎓 Praktikan` vs `👨‍🏫 Asprak`), Input NIM/Email SSO, Password, Quick demo buttons (`Demo Praktikan` & `Demo Asprak`), Footer keamanan presensi digital. |
| **5. Beranda Praktikan** | Praktikan | `src/app/(main)/praktikan/index.tsx` | Hero Sesi Aktif + Deteksi Jarak Geofence (12m) + Tombol Presensi Cepat, Gauge Lingkaran Kehadiran (94.2%), Breakdown 3 status, Jadwal Pekan Ini, 3 Aksi Cepat. |
| **6. Formulir Izin Praktikum** | Praktikan | `src/app/(main)/praktikan/izin.tsx`<br>`src/components/izin/form-pengajuan-izin.tsx` | Banner ketentuan bukti otentik, Picker sesi praktikum, Radio button kategori izin, Textarea alasan (0/300), Area upload berkas PDF/JPG, Status pasca kirim. |
| **7. Detail & Presensi Geofence**| Praktikan | `src/app/(main)/praktikan/[id].tsx` | Header info lab, Pemindaian Geofence 30m (Radar spasial interaktif + pill jarak live), Checklist 4 verifikasi sensor, Tombol `Kirim Presensi Sekarang` & `Kalibrasi GPS`. |
| **8. Izin Dan Riwayat** | Praktikan | `src/app/(main)/praktikan/riwayat.tsx`<br>`src/components/izin/daftar-riwayat-izin.tsx` | Kartu kumulatif kehadiran (94.2% Syarat UAS) + 4 box metrik, Filter dropdown jadwal, Timeline log presensi terkini (dot dan garis vertikal penanda waktu). |

---

## 🔒 5. Prinsip Integritas Business Logic
1. **GPS & Geofence Tetap Nyata:** Komponen radar presensi [src/app/(main)/praktikan/[id].tsx](file:///d:/XAMPP/htdocs/0.%20PRAKTIKUM%20PPK/lab-session-manager/src/app/(main)/praktikan/[id].tsx) tetap memanggil koordinat satelit asli dari `expo-location` dan menguji jarak terhadap radius 30 meter rumus Haversine.
2. **Koneksi Real-time Firestore:** Seluruh kartu sesi, ringkasan kehadiran, dan pengajuan izin tetap tersinkronisasi secara langsung ke koleksi Cloud Firestore.
3. **Role Gatekeeper:** Pembatasan akses navigasi antara Asisten dan Praktikan di [src/app/(main)/_layout.tsx](file:///d:/XAMPP/htdocs/0.%20PRAKTIKUM%20PPK/lab-session-manager/src/app/(main)/_layout.tsx) tetap menjadi pengaman utama rute.
4. **Fitur Rute Maps:** Peta interaktif di [src/app/(main)/maps.tsx](file:///d:/XAMPP/htdocs/0.%20PRAKTIKUM%20PPK/lab-session-manager/src/app/(main)/maps.tsx) dilengkapi tombol navigasi rute ke Google Maps eksternal dan pelacakan live akurat.
