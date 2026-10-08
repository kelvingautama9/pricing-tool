# LOGIKA PERHITUNGAN KHUSUS BERAT, TONASE & HARGA RP/KG
## Otomatisasi Perhitungan Karton Sheet — PT Prokemas Adhikari Kreasi (MYPAK)

Dokumen ini merupakan acuan resmi (*Single Source of Truth*) untuk logika penghitungan berat lembar karton (*weight per sheet*), tonase pemesanan (*order tonnage*), serta konversi nilai harga per kilogram (*Rp / kg*).

---

### 1. Ekstraksi Gramatur Bahan (GSM)
Setiap kode material pada sistem (*substance*) merepresentasikan jenis kertas dan nilai gramaturnya dalam satuan **Gram per Meter Persegi (g/m² atau GSM)**:
* **Medium (M)**: M100 (100 gsm), M110 (110 gsm), M125 (125 gsm), M135 (135 gsm), M150 (150 gsm).
* **Kraft (K)**: K110 (110 gsm), K125 (125 gsm), K135 (135 gsm), K150 (150 gsm), K200 (200 gsm), K275 (275 gsm).

---

### 2. Faktor Gelombang Flute (*Flute Take-Up Factor*)
Kertas *medium* di bagian gelombang (*fluting*) memerlukan panjang kertas yang lebih besar daripada panjang lembaran datar untuk membentuk lekukan gelombang. Rasio penambahan ini disebut **Take-Up Factor**:

| Jenis Flute | Deskripsi Flute | Ketebalan Rata-rata | Faktor Take-Up |
| :--- | :--- | :--- | :--- |
| **B/F** | Single Wall B-Flute | ~2.5 – 3.0 mm | **1.35** |
| **C/F** | Single Wall C-Flute | ~3.6 – 4.0 mm | **1.44** |
| **E/F** | Single Wall E-Flute (Micro) | ~1.2 – 1.8 mm | **1.25** |
| **CB/F** | Double Wall 5-Layer | ~6.5 – 7.0 mm | **Flute 1 (C): 1.44**<br>**Flute 2 (B): 1.35** |

---

### 3. Rumus Total Gramatur Sheet (*Total GSM*)

#### A. Single Wall (3-Layer: Top / Mid / Bottom)
* **Top Layer**: Liner Luar (Faktor = 1.0)
* **Mid Layer**: Fluting Medium (Faktor = Take-Up Flute: 1.35 untuk B/F, 1.44 untuk C/F, 1.25 untuk E/F)
* **Bottom Layer**: Liner Dalam (Faktor = 1.0)

$$\text{Total GSM } (\text{g/m}^2) = \text{GSM}_{\text{Top}} + (\text{GSM}_{\text{Mid}} \times \text{Faktor Flute}) + \text{GSM}_{\text{Bottom}}$$

#### B. Double Wall CB/F (5-Layer: Top / Flute 1 / Mid / Flute 2 / Bottom)
* **Top Layer**: Liner Luar (Faktor = 1.0)
* **Flute 1**: Medium Gelombang C (Faktor = **1.44**)
* **Middle Layer**: Center Liner / Lapisan Tengah Datar (Faktor = 1.0)
* **Flute 2**: Medium Gelombang B (Faktor = **1.35**)
* **Bottom Layer**: Liner Dalam (Faktor = 1.0)

$$\text{Total GSM } (\text{g/m}^2) = \text{GSM}_{\text{Top}} + (\text{GSM}_{\text{Flute 1}} \times 1.44) + \text{GSM}_{\text{Mid}} + (\text{GSM}_{\text{Flute 2}} \times 1.35) + \text{GSM}_{\text{Bottom}}$$

---

### 4. Rumus Berat per Lembar (*Berat / Pcs*)

1. **Luas per Lembar ($\text{M}^2$):**
   $$\text{Luas Lembar } (\text{M}^2) = \frac{\text{Panjang (mm)} \times \text{Lebar (mm)}}{1.000.000}$$

2. **Berat per Lembar dalam Gram:**
   $$\text{Berat / Pcs (gram)} = \text{Luas Lembar } (\text{M}^2) \times \text{Total GSM } (\text{g/m}^2)$$

3. **Berat per Lembar dalam Kilogram (kg):**
   $$\text{Berat / Pcs (kg)} = \frac{\text{Berat / Pcs (gram)}}{1.000}$$

---

### 5. Rumus Tonase Pemesanan (*Total Tonnage*)
Dihitung otomatis dari jumlah Quantity (pcs) yang diinput oleh user:

1. **Berat Total Order (kg):**
   $$\text{Tonase (kg)} = \text{Berat / Pcs (kg)} \times \text{Quantity (pcs)}$$

2. **Tonase Total Order (Ton):**
   $$\text{Tonase (Ton)} = \frac{\text{Tonase (kg)}}{1.000}$$

*(Catatan: Jika Qty belum diisi oleh pengguna, sistem menyediakan acuan tonase otomatis berdasarkan nilai MOQ yang berlaku).*

---

### 6. Rumus Nilai Material Rp / Kg
Nilai harga per kilogram ($\text{Rp/kg}$) merepresentasikan efisiensi biaya bahan baku terhadap bobot fisik karton sheet.

Secara matematis, terdapat 2 cara perhitungan yang menghasilkan **angka yang identik persis**:

* **Metode Berbasis Sheet (Lembar):**
  $$\text{Rp / kg} = \frac{\text{Harga / Pcs (Rp)}}{\text{Berat / Pcs (kg)}}$$

* **Metode Berbasis Meter Persegi ($\text{M}^2$):**
  $$\text{Rp / kg} = \frac{\text{Harga Bersih / M}^2 (\text{Rp})}{\text{Berat / M}^2 (\text{kg})} = \frac{\text{Harga Bersih / M}^2 (\text{Rp})}{(\text{Total GSM} / 1.000)}$$

Kedua metode di atas bernilai sama karena faktor luas area ($\text{M}^2$) pada pembilang dan penyebut saling meniadakan:
$$\frac{\text{Harga / M}^2 \times \text{Luas}}{\text{Berat / M}^2 \times \text{Luas}} = \frac{\text{Harga / M}^2}{\text{Berat / M}^2}$$

---

### 7. Contoh Kasus Nyata

**Input Spesifikasi:**
* Substance: **K125 / M125 / K125**
* Flute: **B/F** (Faktor Take-Up = 1.35)
* Dimensi Sheet: **1.200 mm × 800 mm**
* Qty: **1.000 pcs**
* Harga Bersih / M²: **Rp 4.125**

**Langkah Perhitungan:**
1. **Total GSM**:
   $$\text{Total GSM} = 125 + (125 \times 1.35) + 125 = 125 + 168.75 + 125 = 418.75 \text{ g/m}^2$$
2. **Luas per Lembar**:
   $$\text{Luas} = \frac{1.200 \times 800}{1.000.000} = 0.96 \text{ M}^2$$
3. **Harga / Pcs**:
   $$\text{Harga / Pcs} = 4.125 \times 0.96 = \text{Rp } 3.960$$
4. **Berat / Pcs**:
   $$\text{Gram} = 0.96 \times 418.75 = 402.00 \text{ gram}$$
   $$\text{Kg} = \frac{402.00}{1.000} = 0.4020 \text{ kg}$$
5. **Tonase Total (1.000 pcs)**:
   $$\text{Tonase (kg)} = 0.4020 \text{ kg} \times 1.000 = 402.00 \text{ kg}$$
   $$\text{Tonase (Ton)} = \frac{402.00}{1.000} = 0.402 \text{ Ton}$$
6. **Harga Rp / Kg**:
   $$\text{Rp / kg} = \frac{\text{Rp } 3.960}{0.4020 \text{ kg}} = \text{Rp } 9.851 \text{ / kg}$$
   *(Atau: $\frac{\text{Rp } 4.125}{0.41875 \text{ kg}} = \text{Rp } 9.851 \text{ / kg}$)*
