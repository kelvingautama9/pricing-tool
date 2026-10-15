# LOGIKA PERHITUNGAN MINIMUM ORDER QUANTITY (MOQ) CORRUGATOR
## Otomatisasi Perhitungan Karton Sheet — PT Prokemas Adhikari Kreasi (MYPAK)

Dokumen ini merupakan acuan resmi (*Single Source of Truth*) teknis dan matematis untuk logika penghitungan **Minimum Order Quantity (MOQ)** lembaran karton (*corrugated sheet*), penentuan nilai **Out** pisau slitter, batas toleransi deckle mesin corrugator, serta validasi dimensi operasional pabrik.

---

### 1. Parameter Dasar & Spesifikasi Mesin Corrugator

Dalam proses pembuatan lembaran karton bergelombang di jalur mesin corrugator, terdapat parameter teknis mesin yang menjadi dasar kalkulasi batas pesanan minimum:

| Parameter Teknis | Simbol / Notasi | Nilai Standar | Keterangan & Alasan Teknis |
| :--- | :--- | :--- | :--- |
| **Lebar Deckle Maksimal** | $\text{Deckle}_{\text{Max}}$ | **2.480 mm** | Lebar bentangan kertas roll maksimum yang dapat diproses corrugator. |
| **Tarikan Minimal Corrugator** | $\text{Run}_{\text{Min}}$ | **500.000 mm (500 meter)** | Batas panjang laju mesin minimal untuk mencapai stabilitas panas (pre-heater), pengeleman (*glue unit*), dan formasi gelombang fluting agar tidak terjadi pemborosan bahan baku (*startup waste*). |
| **Batas Lebar Standar Order** | $\text{Lebar}_{\text{Min}} - \text{Lebar}_{\text{Max}}$ | **300 mm – 2.480 mm** | Batas jarak fisik penempatan pisau slitter scorer (min. 300 mm) dan batas roll deckle (maks. 2.480 mm). |
| **Batas Panjang Standar Order** | $\text{Panjang}_{\text{Min}} - \text{Panjang}_{\text{Max}}$ | **500 mm – 2.600 mm** | Batas kecepatan rotasi pisau potong melintang (*rotary cut-off shear knife*). |
| **Kelipatan Pembulatan Logistik** | $\text{Rounding Multiple}$ | **50 pcs** | Standar ikatan pack/tumpukan pallet dalam prosedur logistik pengiriman pabrik. |

---

### 2. Langkah 1: Penentuan Nilai "Out" (Jumlah Potongan per Bentang Deckle)

Nilai **Out** merepresentasikan berapa lembar sheet yang dapat dipotong secara paralel sepanjang lebar bentang mesin corrugator (2.480 mm).

#### A. Rumus Matematis Standar
$$\text{Out} = \left\lfloor \frac{\text{Deckle}_{\text{Max}}}{\text{Lebar Sheet (mm)}} \right\rfloor = \left\lfloor \frac{2.480}{\text{Lebar}} \right\rfloor$$

*(Operasi $\lfloor x \rfloor$ adalah fungsi floor / pembulatan ke bawah menuju bilangan bulat terdekat).*

#### B. Logika Penanganan Kasus Ekstrem (*Edge Cases*)
1. **Lebar Sheet $> 2.480\text{ mm}$:**
   * Nilai $\text{Out} = 1$
   * Sistem memunculkan **Warning Merah (WIDTH_EXCEEDED)**: Lebar melebihi deckle maksimum mesin pabrik.
2. **Lebar Sheet $< 300\text{ mm}$:**
   * Nilai $\text{Out} = 7$ (Batas limit mekanis 7 pisau slitter paralel pada deckle 2.480 mm: $2.480 / 300 = 8.26$, dibatasi maksimal 7 out).
   * Sistem memunculkan **Warning Merah (WIDTH_TOO_NARROW)**: Lebar di bawah standar jarak pisau potong.

#### C. Tabel Panduan Cepat Nilai Out
| Rentang Lebar Sheet (mm) | Nilai Out | Sisa Afval Potensial | Kategori Efisiensi |
| :---: | :---: | :---: | :---: |
| **1.241 – 2.480 mm** | **1 Out** | 0 – 1.239 mm | Cek Zona Khusus (1.251 – 1.649 mm afval tinggi) |
| **827 – 1.240 mm** | **2 Out** | 0 – 826 mm | Sangat Baik (Efisiensi Tinggi) |
| **621 – 826 mm** | **3 Out** | 0 – 617 mm | Sangat Baik |
| **497 – 620 mm** | **4 Out** | 0 – 492 mm | Optimal |
| **414 – 496 mm** | **5 Out** | 0 – 410 mm | Optimal |
| **355 – 413 mm** | **6 Out** | 0 – 350 mm | Efisiensi Pisau Tinggi |
| **300 – 354 mm** | **7 Out** | 0 – 380 mm | Batas Pisau Slitter |

---

### 3. Langkah 2: Perhitungan Nilai Raw MOQ

Karena corrugator wajib berjalan sepanjang **500 meter (500.000 mm)** dan setiap putaran potong menghasilkan sejumlah **Out**, maka jumlah lembar kotor (*Raw MOQ*) dihitung dengan rumus:

$$\text{Jumlah Potongan Panjang} = \frac{500.000\text{ mm}}{\text{Panjang Sheet (mm)}}$$

$$\text{Raw MOQ} = \left\lceil \left( \frac{500.000}{\text{Panjang Sheet (mm)}} \right) \times \text{Out} \right\rceil$$

*(Operasi $\lceil x \rceil$ adalah fungsi ceiling / pembulatan ke atas menuju bilangan bulat terdekat).*

---

### 4. Langkah 3: Pembulatan Kelipatan 50 ke Atas (*Final Rounded MOQ*)

Untuk memenuhi standarisasi pengepakan strapping di departemen finishing dan palletizing:

$$\text{MOQ Final (pcs)} = \left\lceil \frac{\text{Raw MOQ}}{50} \right\rceil \times 50$$

**Sifat Logika:** Nilai MOQ final selalu dibulatkan ke atas (*round up*). Sebagai contoh:
* Raw MOQ = 417 pcs $\rightarrow$ MOQ Final = **450 pcs**
* Raw MOQ = 1.500 pcs $\rightarrow$ MOQ Final = **1.500 pcs**
* Raw MOQ = 1.501 pcs $\rightarrow$ MOQ Final = **1.550 pcs**

---

### 5. Hubungan MOQ dengan Tonase Pemesanan (*MOQ Tonnage*)

Apabila pengguna ingin mengetahui bobot fisik bahan yang dihasilkan pada volume MOQ minimum:

1. **Berat per Lembar Sheet (kg):**
   $$\text{Berat / Pcs (kg)} = \frac{\text{Luas Sheet } (\text{M}^2) \times \text{Total GSM } (\text{g/m}^2)}{1.000.000}$$
2. **Tonase Total pada MOQ (kg):**
   $$\text{Tonase MOQ (kg)} = \text{Berat / Pcs (kg)} \times \text{MOQ Final (pcs)}$$
3. **Tonase Total pada MOQ (Ton):**
   $$\text{Tonase MOQ (Ton)} = \frac{\text{Tonase MOQ (kg)}}{1.000}$$

*(Jika pengguna mengisi input Quantity order secara spesifik, sistem memprioritaskan kalkulasi tonase aktual pesanan; jika Quantity kosong, sistem secara otomatis menampilkan acuan Tonase MOQ).*

---

### 6. Matriks Validasi Dimensi & Aturan Peringatan (*Dimension Warnings*)

Sistem kalkulasi secara proaktif mendeteksi 5 kondisi batas operasional untuk melindungi integritas order pabrik:

| Kode Validasi | Kondisi Batas | Tingkat Bahaya | Pesan Notifikasi Sistem | Dampak Operasional |
| :--- | :--- | :---: | :--- | :--- |
| `DECKLE_WASTE_NON_STANDARD` | $1.251 \le \text{Lebar} \le 1.649\text{ mm}$ | **Warning (Orange/Red)** | *Lebar Non-Standar (1.251–1.649 mm): Rentang ini menghasilkan afval buangan tinggi (Out = 1). Tidak masuk order standar pabrik, namun harga tetap dikalkulasi sebagai referensi.* | Menghasilkan sisa buangan pinggir (*trim waste*) roll hingga 35%–49%. Memerlukan konfirmasi ketersediaan roll khusus dari bagian PPIC. |
| `WIDTH_EXCEEDED` | $\text{Lebar} > 2.480\text{ mm}$ | **Danger (Merah)** | *Lebar melebihi batas deckle mesin (maks. 2.480 mm).* | Tidak dapat diproduksi langsung dalam 1 lembar utuh di corrugator. Perlu proses sambung (*joint sheet*). |
| `WIDTH_TOO_NARROW` | $\text{Lebar} < 300\text{ mm}$ | **Danger (Merah)** | *Lebar di bawah batas minimum lebar order (min. 300 mm).* | Pisau slitter mesin tidak dapat didekatkan di bawah 300 mm karena dimensi mekanis holder pisau. |
| `LENGTH_TOO_SHORT` | $\text{Panjang} < 500\text{ mm}$ | **Danger (Merah)** | *Panjang di bawah cut-off minimum order (min. 500 mm).* | Di bawah limit rotasi pisau cut-off corrugator; lembaran rawan terlipat/macet (*jamming*) di conveyor delivery stacker. |
| `LENGTH_TOO_LONG` | $\text{Panjang} > 2.600\text{ mm}$ | **Danger (Merah)** | *Panjang melebihi batas cut-off maksimum order (maks. 2.600 mm).* | Melebihi batas jangkauan pisau potong dan meja stacker tumpukan lembaran karton. |

---

### 7. Contoh Kasus Perhitungan Lengkap

#### Kasus A: Karton Ukuran Standar (3 Out)
* **Dimensi:** Panjang = 1.000 mm, Lebar = 800 mm
* **Substance:** K125/M125/K125 B/F (Total GSM = 418.75 g/m²)

1. **Hitung Out:**
   $$\text{Out} = \lfloor 2.480 / 800 \rfloor = 3\text{ Out}$$
2. **Hitung Raw MOQ:**
   $$\text{Raw MOQ} = \left\lceil \left( \frac{500.000}{1.000} \right) \times 3 \right\rceil = \lceil 500 \times 3 \rceil = 1.500\text{ pcs}$$
3. **Pembulatan Kelipatan 50:**
   $$\text{MOQ Final} = \lceil 1.500 / 50 \rceil \times 50 = \mathbf{1.500\text{ pcs}}$$
4. **Berat per Lembar:**
   $$\text{Luas} = \frac{1.000 \times 800}{1.000.000} = 0.80\text{ M}^2$$
   $$\text{Berat/Pcs} = 0.80 \times 418.75 / 1.000 = 0.335\text{ kg}$$
5. **Tonase MOQ:**
   $$\text{Tonase MOQ} = 0.335\text{ kg} \times 1.500 = 502.5\text{ kg} = \mathbf{0.503\text{ Ton}}$$

---

#### Kasus B: Karton Lebar Besar (1 Out — Zona Afval Tinggi)
* **Dimensi:** Panjang = 1.200 mm, Lebar = 1.300 mm
* **Substance:** K150/M125/K150 B/F (Total GSM = 468.75 g/m²)

1. **Hitung Out:**
   $$\text{Out} = \lfloor 2.480 / 1.300 \rfloor = 1\text{ Out}$$
2. **Cek Validasi Dimensi:**
   * Lebar 1.300 mm masuk dalam rentang $1.251 – 1.649\text{ mm}$ $\rightarrow$ **Muncul Warning DECKLE_WASTE_NON_STANDARD**.
3. **Hitung Raw MOQ:**
   $$\text{Raw MOQ} = \left\lceil \left( \frac{500.000}{1.200} \right) \times 1 \right\rceil = \lceil 416.67 \rceil = 417\text{ pcs}$$
4. **Pembulatan Kelipatan 50:**
   $$\text{MOQ Final} = \lceil 417 / 50 \rceil \times 50 = 9 \times 50 = \mathbf{450\text{ pcs}}$$
5. **Tonase MOQ:**
   $$\text{Luas} = \frac{1.200 \times 1.300}{1.000.000} = 1.56\text{ M}^2$$
   $$\text{Berat/Pcs} = 1.56 \times 468.75 / 1.000 = 0.731\text{ kg}$$
   $$\text{Tonase MOQ} = 0.731\text{ kg} \times 450 = 328.95\text{ kg} = \mathbf{0.329\text{ Ton}}$$

---

#### Kasus C: Partisi / Sheet Kecil (7 Out)
* **Dimensi:** Panjang = 600 mm, Lebar = 350 mm
* **Substance:** M125/M125/M125 B/F (Total GSM = 418.75 g/m²)

1. **Hitung Out:**
   $$\text{Out} = \lfloor 2.480 / 350 \rfloor = 7\text{ Out}$$
2. **Hitung Raw MOQ:**
   $$\text{Raw MOQ} = \left\lceil \left( \frac{500.000}{600} \right) \times 7 \right\rceil = \lceil 833.33 \times 7 \rceil = \lceil 5.833.33 \rceil = 5.834\text{ pcs}$$
3. **Pembulatan Kelipatan 50:**
   $$\text{MOQ Final} = \lceil 5.834 / 50 \rceil \times 50 = 117 \times 50 = \mathbf{5.850\text{ pcs}}$$
4. **Tonase MOQ:**
   $$\text{Luas} = \frac{600 \times 350}{1.000.000} = 0.21\text{ M}^2$$
   $$\text{Berat/Pcs} = 0.21 \times 418.75 / 1.000 = 0.0879\text{ kg}$$
   $$\text{Tonase MOQ} = 0.0879\text{ kg} \times 5.850 = 514.21\text{ kg} = \mathbf{0.514\text{ Ton}}$$

---

### 8. Implementasi Kode Sumber (*Source Code Reference*)

Logika ini diimplementasikan secara terpusat pada file:
* **Fungsi `hitungOut` & `calculateMOQ`**: `src/utils/pricingEngine.ts`
* **Integrasi UI Input Dimensi & Tombol "Pakai MOQ"**: `src/App.tsx`
* **Kalkulasi Batch & Export Excel MOQ**: `src/components/BatchCalculator.tsx`
* **Rangkuman Breakdown & Struk Penawaran**: `src/components/BreakdownTypewriter.tsx`
* **Tabel Master & Unit Test Suite**: `src/components/MasterTableAndTests.tsx`
