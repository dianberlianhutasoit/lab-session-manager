# Pembagian Kerja Sprint 4 (Zero-Dependency & Parallel Execution)

> **Tujuan Utama Sprint 4:**  
> Menyempurnakan manajemen laboratorium oleh **Aslab** (role baru), pengelolaan sesi & presensi oleh **Asprak**, perhitungan denda keterlambatan, integrasi Payment Gateway **Midtrans Sandbox**, sistem notifikasi, dan finalisasi antarmuka aplikasi React Native.

---

## 1. Prinsip Desain "Zero-Wait" (Bisa Langsung Kerja Sejak Hari Ke-1)

Agar ketiga programmer dapat melakukan `git checkout -b <branch>` dan langsung *coding* secara paralel tanpa menunggu pekerjaan rekannya selesai:

1. **Boundary Berdasarkan Role & Domain (Bukan Berdasarkan Layer):**
   - **Dev A** memegang **100% domain Aslab** (Manajemen Lab, 3 Bulk Insert, & Dashboard Monitoring).
   - **Dev B** memegang **100% domain Asprak & Presensi** (Kelola Sesi, Presensi, Approval Izin, & Kalkulasi Denda).
   - **Dev C** memegang **100% domain Pembayaran & Praktikan** (Midtrans Sandbox, Layar Tagihan Praktikan, Notifikasi, & Design System).
2. **Strict Single-Writer per Collection:**
   Hanya ada 1 programmer yang berhak menulis (*write/create/update*) ke suatu koleksi Firestore. Programmer lain hanya membaca (*read*).
3. **Seed Data Siap Pakai di Hari Pertama:**
   Sebelum coding, jalankan data awal (seed). Dev C tidak perlu menunggu Dev B menyelesaikan presensi untuk menguji pembayaran, karena data `fines` sudah tersedia sejak awal.
4. **Isolasi Folder Kode (Konflik Git = 0%):**
   Setiap developer bekerja pada folder fiturnya masing-masing di `src/features/` dan rute navigasinya masing-masing.

---

## 2. Matriks Pembagian Tugas & Tanggung Jawab

| Parameter | Dev A (Aslab & Lab Management) | Dev B (Asprak, Sesi, & Denda) | Dev C (Payment, Notifikasi, & UI) |
| :--- | :--- | :--- | :--- |
| **Kebutuhan PDF** | **Req 1 & Req 2 (Dashboard)** | **Req 3 & Req 4 (Keterlambatan & Denda)** | **Req 5, Req 6, & Finalisasi UI** |
| **Fokus Role** | **Aslab** (Asisten Laboratorium) | **Asprak** (Asisten Praktikum) | **Praktikan** & Client-Server Integration |
| **Izin Write (Pemilik)** | `labs`, `labMembers`, `courses` | `sessions`, `attendances`, `fines` (create/waive) | `payments`, `notifications`, `fines` (update status bayar) |
| **Izin Read** | `users`, `sessions`, `attendances`, `fines` | `labs`, `courses`, `users` | `fines`, `sessions`, `users` |
| **Folder Kerja** | `src/features/aslab/`<br>`src/app/(aslab)/` | `src/features/asprak/`<br>`src/features/presensi/`<br>`server/src/sessions/` | `src/features/payment/`<br>`src/features/notifications/`<br>`src/theme/`<br>`server/src/payments/` |

---

## 3. Rincian Pekerjaan Tiap Developer

### 🧑‍💻 Dev A: Domain Aslab (Manajemen Lab, Bulk Insert, & Dashboard)
**Tanggung Jawab:**
1. **Navigasi & Guard Role Aslab:**
   - Menambahkan role `aslab` pada routing dan guard navigasi aplikasi.
2. **CRUD & Konfigurasi Laboratorium:**
   - Form tambah/edit lab: nama, gedung, koordinat GPS (lat, lng), radius presensi (meter).
   - Pengaturan batas toleransi keterlambatan (`gracePeriodMinutes`) dan nominal denda (`lateFineAmount`) per laboratorium.
3. **Tiga Fitur Bulk Insert Terpisah (Sesuai Syarat Ketat PDF):**
   - **Bulk 1:** Pembuatan Lab sekaligus berdasarkan satu Mata Kuliah.
   - **Bulk 2:** Alokasi data Praktikan ke Lab tertentu.
   - **Bulk 3:** Alokasi data Asprak ke Lab tertentu.
   - *Downloadable Template:* Sediakan file template CSV/XLSX siap unduh untuk ketiga opsi tersebut.
   - *Review Screen Interaktif:* Parser CSV/XLSX merender baris menjadi list scroll view. Aslab dapat fleksibel melakukan **Accept / Deny**, mengedit baris, atau mengisi data kosong sebelum disimpan ke Firestore.
4. **Fitur Pemindahan Anggota Lab:**
   - Fitur memindahkan praktikan atau asprak dari satu lab ke lab lain (jadwal praktikum tidak ikut berpindah).
5. **Dashboard Keberlangsungan Laboratorium (Req 2):**
   - Ringkasan metrik: Jumlah lab, jumlah praktikan, dan status sesi aktif.
   - Tampilan jadwal berlangsung & mendatang beserta informasi lokasi.
   - Riwayat kegiatan lab dan ringkasan keuangan dari denda praktikum.
   - Filter rentang waktu: **Hari ini**, **Minggu ini**, dan **Bulan ini**.

---

### 🧑‍💻 Dev B: Domain Asprak (Sesi, Presensi, Keterlambatan, & Denda)
**Tanggung Jawab:**
1. **Navigasi & Pengelolaan Sesi Asprak:**
   - Layar Asprak: melihat daftar kelas, jadwal, dan sesi yang ditugaskan padanya.
   - Kontrol Sesi: Buka sesi (`OPEN`) dan Tutup sesi (`CLOSED`) dengan update real-time via Firestore `onSnapshot`.
   - Salin snapshot config lab (`gracePeriodMinutes` & `lateFineAmount`) ke dalam dokumen sesi saat sesi dibuka (`configSnapshot`).
2. **Pemantauan & Manajemen Presensi:**
   - Real-time monitoring daftar hadir praktikan per sesi praktikum.
   - Persetujuan/penolakan permohonan izin praktikan.
3. **Logika Perhitungan Keterlambatan:**
   - Evaluasi waktu check-in:
     $$\text{Tepat Waktu} \iff \text{checkedInAt} \le \text{session.startAt} + \text{gracePeriodMinutes}$$
     $$\text{Terlambat} \iff \text{checkedInAt} > \text{session.startAt} + \text{gracePeriodMinutes}$$
4. **Otomatisasi Tagihan Denda (Deterministic & Idempotent):**
   - Jika terlambat, buat dokumen tagihan ke koleksi `fines` dengan ID deterministik:  
     $$\text{ID Dokumen} = \text{sessionId}\_\text{studentId}$$
     *(Menjamin 1 keterlambatan hanya akan menghasilkan tepat 1 tagihan denda).*
5. **Aturan Denda vs Izin:**
   - Izin yang disetujui Asprak dicatat sebagai `excused absence` dan dibebaskan dari denda. Jika tagihan sudah terlanjur terbuat di `fines` dan statusnya masih `unpaid`, ubah status denda menjadi `waived`.

---

### 🧑‍💻 Dev C: Domain Pembayaran, Notifikasi, & Finalisasi UI
**Tanggung Jawab:**
1. **Layar Tagihan & Riwayat Pembayaran Praktikan:**
   - Layar Praktikan: daftar tagihan denda aktif (`unpaid`), rincian nominal, sesi terkait, dan status keterlambatan.
   - Halaman riwayat pembayaran yang persisten (menampilkan sesi, tanggal, nominal, status transaksi).
2. **Integrasi Midtrans Sandbox (Snap):**
   - Integrasi WebView atau Snap Redirect URL di aplikasi mobile.
   - **Backend Endpoint (`/api/payment/charge`):** Meminta Snap Token ke API Midtrans Sandbox menggunakan Server Key (Server Key tersimpan aman di environment backend, tidak pernah ada di React Native).
   - `order_id` format unik per percobaan: `{fineId}-{attemptTimestamp}`.
3. **Webhook Handler & Verifikasi Signature (`/api/payment/notification`):**
   - Menerima HTTP POST callback dari Midtrans.
   - Verifikasi hash signature Midtrans: `SHA512(order_id + status_code + gross_amount + ServerKey)`.
   - Update status dokumen `payments` (`pending` / `success` / `failed`).
   - Jika pembayaran lunas (`settlement` / `capture`), update dokumen `fines/{fineId}` menjadi `status: 'paid'` dan catat `paidAt`. Pembayaran **tidak pernah mengubah** catatan kehadiran praktikan.
4. **Sistem Notifikasi Praktikan:**
   - Notifikasi saat tagihan denda baru diterbitkan (`fine_created`).
   - Notifikasi saat pembayaran sukses (`payment_success`).
   - Notifikasi saat pembayaran gagal atau butuh tindak lanjut (`payment_failed`).
5. **Finalisasi UI & Design System:**
   - Menyelaraskan tema, konsistensi warna, typography, dan reusable komponen UI di seluruh modul aplikasi.

---

## 4. Kontrak Skema Firestore (Frozen & Locked)

Seluruh developer menyepakati skema field berikut tanpa perubahan sepihak:

```typescript
// 1. users/{uid} (Read: All, Write: Auth/Admin)
interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: 'aslab' | 'asprak' | 'praktikan';
  nim?: string;
  createdAt: string;
}

// 2. courses/{courseId} (Owned by Dev A)
interface CourseDoc {
  id: string;
  code: string; // misal: "IF101"
  name: string; // misal: "Dasar Pemrograman"
}

// 3. labs/{labId} (Owned by Dev A)
interface LabDoc {
  id: string;
  courseId: string;
  name: string;
  aslabId: string;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  attendanceConfig: {
    gracePeriodMinutes: number; // toleransi menit (misal: 15)
    lateFineAmount: number;     // nominal denda (misal: 10000)
  };
}

// 4. labMembers/{labId_userId} (Owned by Dev A)
interface LabMemberDoc {
  id: string; // format: `${labId}_${userId}`
  labId: string;
  userId: string;
  role: 'praktikan' | 'asprak';
  assignedAt: string;
}

// 5. sessions/{sessionId} (Owned by Dev B)
interface SessionDoc {
  id: string;
  labId: string;
  courseId: string;
  asprakId: string;
  title: string;
  sessionNumber: number;
  startAt: string; // ISO String UTC
  endAt: string;   // ISO String UTC
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED';
  openedAt?: string;
  closedAt?: string;
  configSnapshot: {
    gracePeriodMinutes: number;
    lateFineAmount: number;
  };
}

// 6. attendances/{sessionId_studentId} (Owned by Dev B)
interface AttendanceDoc {
  id: string; // format: `${sessionId}_${studentId}`
  sessionId: string;
  labId: string;
  studentId: string;
  status: 'PRESENT' | 'EXCUSED' | 'ABSENT';
  checkedInAt: string;
  isLate: boolean;
  lateMinutes: number;
}

// 7. fines/{sessionId_studentId} (Writer: Dev B untuk create/waive, Dev C untuk status bayar)
interface FineDoc {
  id: string; // format: `${sessionId}_${studentId}`
  studentId: string;
  sessionId: string;
  labId: string;
  amount: number;
  reason: string; // misal: "Terlambat 20 menit"
  status: 'unpaid' | 'pending' | 'paid' | 'waived';
  createdAt: string;
  paidAt?: string;
}

// 8. payments/{paymentId} (Owned by Dev C)
interface PaymentDoc {
  id: string;
  fineId: string;
  studentId: string;
  orderId: string; // misal: `${fineId}-${attempt}`
  amount: number;
  status: 'pending' | 'success' | 'failed';
  snapToken: string;
  redirectUrl: string;
  createdAt: string;
  settledAt?: string;
}

// 9. notifications/{notificationId} (Owned by Dev C)
interface NotificationDoc {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'fine_created' | 'payment_success' | 'payment_failed';
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}
```

---

## 5. Seed Data Hari Pertama (Langsung Uji Mandiri)

Untuk memastikan Dev C tidak perlu menunggu Dev B, dan Dev B tidak perlu menunggu Dev A, file seed berikut otomatis dimasukkan ke Firebase saat kickoff:

- **1 User Aslab:** `uid: "user-aslab-1"`, `email: "aslab@test.com"`, `role: "aslab"`
- **1 User Asprak:** `uid: "user-asprak-1"`, `email: "asprak@test.com"`, `role: "asprak"`
- **2 User Praktikan:** `uid: "user-mhs-1"`, `uid: "user-mhs-2"`, `role: "praktikan"`
- **1 Lab Contoh:** `id: "lab-01"`, `gracePeriodMinutes: 15`, `lateFineAmount: 15000`
- **1 Sesi Aktif:** `id: "session-01"`, `labId: "lab-01"`, `status: "OPEN"`
- **Dummy Denda untuk Dev C:**
  - `fines/session-01_user-mhs-1`: `amount: 15000`, `status: "unpaid"` (Dev C bisa langsung klik bayar via Midtrans detik ini juga!)
  - `fines/session-01_user-mhs-2`: `amount: 15000`, `status: "paid"`, `paidAt: "2026-11-25T10:00:00Z"` (Dev A & C bisa langsung menguji tampilan riwayat keuangan!)

---

## 6. Prosedur Pengujian Integrasi Akhir (End-to-End)

Setelah ketiga fitur selesai secara mandiri, lakukan 3 uji integrasi bersama:

```
[Dev A: Atur Toleransi Lab]
       │
       ▼ (gracePeriod: 10m, denda: Rp10.000)
[Dev B: Buka Sesi Praktikum & Praktikan Check-in Terlambat]
       │
       ▼ Dokumen fines/{sessionId_uid} terbuat otomatis
[Dev C: Muncul Notifikasi Tagihan & Praktikan Bayar via Midtrans Sandbox]
       │
       ▼ Webhook memverifikasi pembayaran -> fines.status = 'paid'
[Dev A: Riwayat Keuangan di Dashboard Aslab Bertambah Rp10.000 Secara Real-time]
```

Dengan pembagian ini:
- **Dev A** tidak terhambat oleh logika sesi atau pembayaran.
- **Dev B** tidak terhambat oleh pembuatan UI import atau konfigurasi payment gateway.
- **Dev C** bisa langsung menuntaskan Midtrans dan tampilan praktikan sejak menit pertama menggunakan data seed.
