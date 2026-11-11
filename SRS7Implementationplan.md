# Rencana Implementasi SRS-07: CRUD Data Kelas dan Jadwal Praktikum (`classes` & `sessions`)

Dokumen ini berisi analisis teknis, rancangan model data, struktur file, dan rencana komponen untuk mengimplementasikan **SRS-07** pada cabang `feat/asisten-srs-07-crud-jadwal`.

---

## 1. Analisis Kondisi Kode Saat Ini (Current State)

Berdasarkan pemeriksaan kode yang sudah ada di repositori:

1. **Tipe Data (`src/types/index.ts`)**:
   - Sudah memiliki tipe `User`, `Schedule`, `Session`, `Attendance`, dan `AttendanceRecord`.
   - Saat ini `Schedule` merepresentasikan informasi mata praktikum & waktu (`id`, `title`, `courseCode`, `date`, `startTime`, `endTime`, `room`), sedangkan `Session` menghubungkan `scheduleId`, `assistantId`, dan `status` (`OPEN` | `CLOSED`).
   - Belum ada tipe eksplisit untuk entitas `LabClass` (Kelas Praktikum) atau `ClassFormPayload` / `SessionFormPayload` untuk operasi input form.
2. **State Management (`src/context/session-context.tsx`)**:
   - `schedules` masih bersifat statis (`const [schedules] = useState(initialSchedules)`), belum memiliki fungsi mutasi.
   - `sessions` baru memiliki fungsi ubah status (`openSession`, `closeSession`, `toggleSessionStatus`), **belum memiliki fungsi Create, Update, dan Delete (CRUD)**.
3. **Antarmuka Asisten (`src/app/index.tsx` & `src/components/asisten/*`)**:
   - Halaman utama Panel Asisten (`src/app/index.tsx`) baru menampilkan daftar sesi, filter asisten/status, kartu sesi (`SessionCard`), dan modal detail (`SessionDetailModal`).
   - Belum ada tombol/modal/form untuk **Tambah Kelas/Jadwal**, **Edit Kelas/Jadwal**, maupun **Hapus Kelas/Jadwal**.
4. **Kompatibilitas Antar-Modul**:
   - Modul Praktikan (`src/app/praktikan/*`) dan Rekap Presensi (`src/app/explore.tsx`) membaca `schedules` dan `sessions` dari `useSessionContext()`. Oleh karena itu, perubahan pada SRS-07 **wajib menjaga kompatibilitas** struktur `schedules` dan `sessions` agar fitur praktikan tidak rusak.

---

## 2. Ruang Lingkup Pekerjaan (Scope of Work SRS-07)

Fitur yang harus tersedia bagi **Asisten Laboratorium** pada SRS-07 meliputi:

1. **Manajemen Data Kelas Praktikum (`classes` / `schedules`)**:
   - **Create**: Membuat kelas/mata praktikum baru (Kode Mata Kuliah/Lab, Nama Praktikum, Nama Kelas misal "Kelas A", Ruangan Default, Asisten Pengampu).
   - **Read**: Menampilkan daftar kelas praktikum beserta jumlah sesi terjadwal di dalamnya.
   - **Update**: Mengubah informasi kelas praktikum.
   - **Delete**: Menghapus kelas praktikum (beserta opsi/konfirmasi penghapusan sesi yang terkait atau *cascade delete*).
2. **Manajemen Jadwal / Sesi Praktikum (`sessions`)**:
   - **Create**: Menambahkan jadwal sesi praktikum baru ke dalam kelas tertentu (Pertemuan ke-N / Topik Sesi, Tanggal, Jam Mulai, Jam Selesai, Ruangan, Asisten Penanggung Jawab, Status Awal `CLOSED`/`OPEN`).
   - **Read**: Melihat daftar seluruh sesi praktikum maupun sesi per kelas.
   - **Update**: Mengubah detail jadwal sesi (tanggal, jam, ruangan, topik, asisten).
   - **Delete**: Menghapus sesi praktikum dengan dialog konfirmasi.
3. **Validasi Form Input**:
   - Validasi field wajib tidak boleh kosong.
   - Validasi format tanggal (`YYYY-MM-DD`) dan jam (`HH:mm`, serta `endTime > startTime`).
   - Pencegahan duplikasi kode kelas / bentrok jadwal ruangan pada waktu yang sama (opsional/warning).

---

## 3. Rancangan Model Data (`src/types/index.ts`)

Agar mendukung konsep `classes` & `sessions` sesuai SRS-07 sekaligus **100% kompatibel** dengan kode `Schedule` dan `Session` yang dipakai layar Praktikan & Rekap Presensi:

```typescript
export type Role = "praktikan" | "asisten";

export type SessionStatus = "OPEN" | "CLOSED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Representasi Data Kelas Praktikum (Classes)
 */
export interface LabClass {
  id: string;
  courseCode: string;     // Contoh: "LAB101"
  title: string;          // Contoh: "Dasar Pemrograman"
  className: string;      // Contoh: "Kelas A"
  room: string;           // Contoh: "Lab Komputer 1"
  assistantId: string;    // ID Asisten utama pengampu kelas
  semester?: string;      // Contoh: "Ganjil 2026/2027"
  capacity?: number;      // Kapasitas praktikan (opsional, misal 30)
}

/**
 * Representasi Jadwal Sesi (Tetap kompatibel dengan komponen lama)
 */
export interface Schedule {
  id: string;
  classId?: string;       // Relasi ke LabClass.id
  className?: string;     // Contoh: "Kelas A"
  sessionNumber?: number; // Contoh: Pertemuan 1, 2, dst.
  topic?: string;         // Topik modul/pertemuan
  title: string;          // Nama praktikum (sinkron dengan LabClass.title)
  courseCode: string;     // Kode praktikum (sinkron dengan LabClass.courseCode)
  date: string;           // Format: YYYY-MM-DD
  startTime: string;      // Format: HH:mm
  endTime: string;        // Format: HH:mm
  room: string;           // Ruangan pelaksanaan
}

export interface Session {
  id: string;
  classId?: string;       // Relasi ke LabClass.id
  scheduleId: string;     // Relasi ke Schedule.id
  assistantId: string;    // Asisten sesi
  status: SessionStatus;
}

/**
 * Payload Form untuk CRUD Kelas (LabClass)
 */
export interface LabClassFormInput {
  courseCode: string;
  title: string;
  className: string;
  room: string;
  assistantId: string;
  semester?: string;
  capacity?: number;
}

/**
 * Payload Form untuk CRUD Sesi & Jadwal (Session + Schedule)
 */
export interface SessionScheduleFormInput {
  classId?: string;
  courseCode: string;
  title: string;
  className?: string;
  sessionNumber?: number;
  topic?: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  assistantId: string;
  status?: SessionStatus;
}
```

---

## 4. Rancangan Perubahan Context / Service Layer (`src/context/session-context.tsx`)

Menambahkan state `classes: LabClass[]` dan fungsi-fungsi CRUD di dalam `SessionContextValue`:

### A. Operasi CRUD Kelas (`classes`)
- `createClass(input: LabClassFormInput): LabClass`
  - Membuat entitas `LabClass` baru dengan ID unik.
- `updateClass(classId: string, input: Partial<LabClassFormInput>): boolean`
  - Memperbarui data kelas dan otomatis menyinkronkan `courseCode`, `title`, serta `className` pada `schedules` terkait.
- `deleteClass(classId: string): boolean`
  - Menghapus kelas beserta `sessions` dan `schedules` yang berafiliasi dengan `classId` tersebut (cascade).

### B. Operasi CRUD Jadwal & Sesi (`schedules` & `sessions`)
- `createSessionSchedule(input: SessionScheduleFormInput): SessionWithDetails`
  - Membuat data `Schedule` baru dan `Session` baru secara atomik agar langsung tampil di Panel Asisten dan halaman Jadwal Praktikan.
- `updateSessionSchedule(sessionId: string, input: Partial<SessionScheduleFormInput>): boolean`
  - Memperbarui detail `Schedule` (tanggal, jam, ruangan, topik, kode/nama) dan `Session` (asisten pengampu, `classId`, status).
- `deleteSessionSchedule(sessionId: string): boolean`
  - Menghapus `Session`, `Schedule` terkait, dan membersihkan data `attendance` pada sesi tersebut.

---

## 5. Struktur Kode & Komponen yang Akan Dibuat / Diubah

```text
src/
├── types/
│   └── index.ts                                  # [MODIFIKASI] Tambah interface LabClass & Form Input
├── data/
│   └── dummy.ts                                  # [MODIFIKASI] Tambah initialClasses & relasi classId pada dummy
├── context/
│   └── session-context.tsx                       # [MODIFIKASI] Tambah state classes & action CRUD Kelas + Sesi
├── components/
│   └── asisten/
│       ├── class-card.tsx                        # [BARU] Kartu tampilan tiap Kelas Praktikum (aksi Edit, Hapus, Tambah Sesi)
│       ├── class-form-modal.tsx                  # [BARU] Modal Form Tambah & Edit Kelas Praktikum
│       ├── session-form-modal.tsx                # [BARU] Modal Form Tambah & Edit Jadwal/Sesi Praktikum
│       ├── session-card.tsx                      # [MODIFIKASI] Tambah tombol aksi cepat Edit & Hapus Sesi
│       └── session-detail-modal.tsx              # [MODIFIKASI] Tambah tombol Edit & Hapus di dalam modal detail
└── app/
    └── index.tsx                                 # [MODIFIKASI] Tambah mode tampilan (Tab "Jadwal Sesi" & "Data Kelas") + tombol "+ Tambah"
```

---

## 6. Detail Rencana Komponen UI Baru

1. **`ClassCard` (`src/components/asisten/class-card.tsx`)**:
   - Menampilkan `courseCode`, `className` (badge), `title`, `room` default, nama asisten pengampu, serta jumlah sesi terjadwal pada kelas tersebut.
   - Tombol aksi: **"+ Buat Sesi"**, **"Edit Kelas"**, dan **"Hapus Kelas"**.
2. **`ClassFormModal` (`src/components/asisten/class-form-modal.tsx`)**:
   - Modal form responsif (mendukung Android, iOS, dan Web) untuk membuat atau mengedit kelas praktikum.
   - Input: Kode Praktikum (`LAB101`), Nama Mata Praktikum, Nama Kelas (`Kelas A`), Ruangan Default, Pilihan Asisten Pengampu, dan Kapasitas.
3. **`SessionFormModal` (`src/components/asisten/session-form-modal.tsx`)**:
   - Modal form untuk membuat atau mengedit jadwal sesi praktikum.
   - Fitur *Quick-Fill dari Kelas*: Jika asisten memilih salah satu Kelas dari daftar `classes`, field `courseCode`, `title`, `className`, `room`, dan `assistantId` otomatis terisi (dan tetap bisa disesuaikan untuk sesi tersebut).
   - Input: Pilihan Kelas, Pertemuan Ke- / Topik, Tanggal (`YYYY-MM-DD`), Jam Mulai (`HH:mm`), Jam Selesai (`HH:mm`), Ruangan, dan Asisten Sesi.
4. **Pembaruan `HomeScreen` (`src/app/index.tsx`)**:
   - Menambahkan switcher sub-menu di Panel Asisten:
     - **Tab "Sesi & Jadwal"**: Mengelola daftar sesi praktikum (+ tombol **"+ Tambah Sesi"**).
     - **Tab "Data Kelas"**: Mengelola master kelas praktikum (+ tombol **"+ Tambah Kelas"**).

---

## 7. Rencana Pengujian & Verifikasi

1. **Verifikasi Fungsional (CRUD)**:
   - Tambah kelas baru -> pastikan muncul di daftar Kelas dan bisa dipilih saat membuat Sesi.
   - Edit kelas -> pastikan perubahan nama/kode tersinkronisasi ke kartu sesi.
   - Hapus kelas -> pastikan konfirmasi muncul dan sesi terkait ikut terhapus.
   - Tambah sesi baru -> pastikan muncul di Panel Asisten (`src/app/index.tsx`), halaman Praktikan (`src/app/praktikan/index.tsx`), dan Rekap Presensi (`src/app/explore.tsx`).
   - Edit & Hapus sesi -> pastikan perubahan jadwal langsung tercermin secara reaktif.
2. **Kualitas Kode (Wajib sesuai `AGENTS.md`)**:
   - Jalankan `npx tsc --noEmit` (memastikan 0 error TypeScript).
   - Jalankan `npx expo lint` (memastikan 0 error/warning ESLint).

---

## 8. Keputusan Konfirmasi Desain (Disetujui User)

1. **Penyimpanan Data (Data Layer)**:
   - Disiapkan koneksi langsung ke **Firebase Firestore** (`src/config/firebase.ts` & `src/services/firestore-service.ts`) menggunakan Firebase Modular Web SDK (`firebase/app`, `firebase/firestore`).
   - Mendukung konfigurasi melalui environment variables (`EXPO_PUBLIC_FIREBASE_*`) dengan *graceful fallback* ke state lokal (`dummy.ts`) apabila kredensial `.env` belum diisi oleh developer, sehingga aplikasi tetap dapat berjalan tanpa crash.
2. **Desain Antarmuka Panel Asisten**:
   - Fitur CRUD Kelas & Sesi disatukan di halaman utama Panel Asisten (`src/app/index.tsx`) menggunakan 2 sub-tab (**"Jadwal Sesi"** & **"Data Kelas"**).
3. **Aturan Hapus Kelas**:
   - **Ditolak jika kelas masih memiliki sesi**: Penghapusan kelas akan dicegah dan menampilkan peringatan apabila masih ada sesi praktikum yang terdaftar pada kelas tersebut. Asisten harus menghapus sesi terkait terlebih dahulu.

