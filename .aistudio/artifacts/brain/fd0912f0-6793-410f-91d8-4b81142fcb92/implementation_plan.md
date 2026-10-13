# Perbaikan Integrasi Local AI & Cloudflare Tunnel (api.vinns.my.id)

Solusi terpadu untuk menyelesaikan masalah kegagalan load dan chat pada model LLM Local (LM Studio) baik melalui domain Cloudflare Tunnel (`api.vinns.my.id`) maupun `localhost:1234` di lingkungan web modern berprotokol HTTPS.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi pada sesi tanya-jawab, Anda mengelola Cloudflare Tunnel melalui **Cloudflare Zero Trust Web Dashboard**. Kami telah menyusun panduan ringkas 2-menit untuk dashboard tersebut serta peningkatan otomatis pada sistem kalkulator.

- **Keputusan Terkonfirmasi 1**: Anda menggunakan Cloudflare Zero Trust Web Dashboard (`dash.cloudflare.com/.../tunnels/...`).
- **Keputusan Terkonfirmasi 2**: Anda memilih opsi kombinasi: **Panduan konfigurasi Cloudflare Tunnel (Host Header + CORS) + Optimasi otomatis fallback proxy pada aplikasi**.

---

## 1. Analisis Akar Masalah (Root Cause)

1. **Mengapa `http://localhost:1234` Memunculkan Error "Failed to fetch"?**
   - Aplikasi web kalkulator diakses melalui domain berprotokol aman HTTPS (`https://ais-dev-...`).
   - Aturan keamanan browser modern melarang halaman HTTPS melakukan permintaan data (khususnya HTTP `POST` saat memuat model ke VRAM dan stream SSE chat) ke alamat HTTP biasa (`http://localhost:1234`). Pelanggaran ini disebut **Mixed Content Violation**, yang oleh browser langsung digagalkan dengan error `TypeError: Failed to fetch`.

2. **Mengapa `https://api.vinns.my.id` Mengalami Timeout / Tidak Terdeteksi?**
   - Secara default, Cloudflare Tunnel meneruskan header `Host: api.vinns.my.id` ke software LM Studio di PC Anda.
   - Software LM Studio memiliki sistem validasi Host Header bawaan: ia hanya menerima request jika header `Host` bernilai `localhost:1234` atau `127.0.0.1:1234`. Karena menerima host `api.vinns.my.id`, LM Studio mengabaikan/menolak koneksi hingga Cloudflare mengalami request timeout.
   - Solusi di Cloudflare Tunnel adalah menambahkan **HTTP Host Header: `localhost:1234`** di menu pengaturan Public Hostname.

---

## 2. Panduan Langkah Konfigurasi Cloudflare & LM Studio (Wajib Dilakukan di Sisi Anda)

### Langkah A: Di Cloudflare Zero Trust Dashboard (Hanya 1 Menit)
1. Buka halaman tunnel Anda: `dash.cloudflare.com/.../tunnels/832cbd5b-c55e-4c2e-be76-8deacdd65312/overview`.
2. Klik tab **Public Hostname**.
3. Cari baris hostname `api.vinns.my.id`, lalu klik tombol titik tiga / **Edit**.
4. Gulir ke bawah dan buka menu dropdown **Additional application settings**.
5. Buka bagian **HTTP Settings**:
   - Cari kolom **HTTP Host Header**.
   - Ketik atau isi dengan: `localhost:1234`
6. (Opsional / Dianjurkan) Di bagian **Access Settings** atau **TLS**:
   - Pastikan **No TLS Verify** dicentang jika service menggunakan HTTPS lokal (atau biarkan default jika service adalah `http://localhost:1234`).
7. Klik **Save hostname** di kanan bawah.

### Langkah B: Di Aplikasi LM Studio (Laptop Anda)
1. Buka aplikasi **LM Studio**.
2. Masuk ke tab **Developer / Local Server** (ikon `<->` di sidebar kiri).
3. Pastikan server dalam kondisi **Start Server**.
4. Di panel pengaturan server (sebelah kanan):
   - Centang opsi **Serve on Local Network (0.0.0.0)**.
   - Centang opsi **Enable CORS** (Cross-Origin Resource Sharing).

---

## 3. Peningkatan & Optimasi Aplikasi yang Akan Dikerjakan

1. **Peningkatan Robustness pada Backend Proxy (`server.ts`)**:
   - Menambahkan header `Host: localhost:1234` otomatis pada proxy request backend ke endpoint lokal dan tunnel jika menggunakan LM Studio.
   - Memastikan timeout proxy cukup panjang (hingga 30–45 detik) khusus saat operasi *model load* berlangsung, karena memindahkan model berukuran 4GB–9GB (seperti `qwen3.5-9b` dan `google/gemma-4-e4b`) dari harddisk/SSD ke VRAM GPU memerlukan waktu beberapa detik.
   - Mengirim status progress real-time ke UI saat model sedang dalam proses pemuatan bobot tensor.

2. **Perbaikan Fallback Smart-Tunnel di Frontend (`aiEngine.ts` & `AIChatWorkspace.tsx`)**:
   - Jika browser gagal melakukan direct fetch ke `api.vinns.my.id` (misalnya karena blokir adblocker atau CORS browser), aplikasi secara otomatis membelokkan rute melalui backend proxy `/api/local/load` dan `/api/local/stream` tanpa memunculkan error `Failed to fetch`.
   - Mengatasi Mixed Content: Jika user memilih `localhost:1234` saat membuka web HTTPS, sistem memberikan peringatan informatif yang menyarankan penggunaan preset `api.vinns.my.id (Tunnel)`.

3. **Penambahan Modal Panduan Bantuan Cepat di UI**:
   - Menambahkan tombol kecil *"Panduan Setup Cloudflare"* di samping input endpoint pada modal *Atur Server*, sehingga jika sewaktu-waktu koneksi terputus, pengguna dapat melihat panduan singkat Host Header & CORS tanpa kebingungan.

---

## 4. Diagram Alur Koneksi

```
┌─────────────────────────────────────────────────────────┐
│ Browser Pengguna (Web Kalkulator HTTPS)                 │
└────────────┬─────────────────────────────┬──────────────┘
             │ (Opsi 1: Direct HTTPS)       │ (Opsi 2: Auto Fallback Proxy)
             ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ Cloudflare Tunnel Edge    │ │ Backend Applet Proxy      │
│ (https://api.vinns.my.id) │ │ (/api/local/*)            │
└────────────┬──────────────┘ └─────────────┬─────────────┘
             │ (Host: localhost:1234)       │
             ▼                              │
┌───────────────────────────────────────────▼─────────────┐
│ Cloudflared Daemon di PC Anda                           │
└────────────────────────────┬────────────────────────────┘
                             │ Forward ke port 1234
                             ▼
┌─────────────────────────────────────────────────────────┐
│ LM Studio Server (0.0.0.0:1234)                         │
│ - Model: qwen/qwen3.5-9b, google/gemma-4-e4b            │
│ - Auto-load ke VRAM GPU siap dieksekusi                 │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Rencana Verifikasi & Testing
1. Verifikasi koneksi dari server ke `https://api.vinns.my.id/v1/models` setelah Host Header diatur.
2. Pengujian tombol **Deteksi Model** pada modal pengaturan server.
3. Pengujian tombol **Load ke VRAM** untuk model `google/gemma-4-e4b` dan `qwen/qwen3.5-9b`.
4. Pengujian chat prompt (`hi` atau kalkulasi harga) untuk memastikan stream token berjalan lancar tanpa error `Failed to fetch`.
