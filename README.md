# Sigma WiFi Tools - Router Killer ⚡

**Sigma WiFi Tools (Router Killer)** adalah ekstensi browser berbasis **Manifest V3** untuk otomatisasi konfigurasi router (ZTE F660/F609 dan lainnya) secara cepat, aman, dan efisien langsung dari browser (Chrome, Edge, Brave, Opera).

---

## 📋 Fitur Utama

1. **🔐 Multi-Credential Login Fallback**:
   - Dukungan banyak akun login (Username & Password).
   - Jika akun utama gagal login, ekstensi otomatis mencoba akun cadangan berikutnya hingga berhasil masuk.
2. **🎯 3 Mode Operasi WLAN**:
   - **✏️ Ganti Nama SSID**: Mengubah nama siaran WiFi pada slot yang dipilih.
   - **➕ Tambah / Aktifkan SSID**: Mengaktifkan slot SSID baru + mengatur Password WiFi (WPA Key) dengan tombol instan `🎲 Acak`.
   - **👁️ Sembunyikan SSID (Hide Broadcast)**: Menyembunyikan nama WiFi dari pencarian publik tanpa memutus koneksi atau mematikan radio WLAN.
3. **📡 Dukungan Hingga 6 Slot SSID**:
   - Pilihan target `SSID1` s/d `SSID6` dengan fitur **Smart Fallback** (otomatis dialihkan ke slot terakhir jika router hanya memiliki 4 slot).
4. **🔔 Notifikasi Desktop Minimalis (Stealth)**:
   - Notifikasi popup ringkas bawaan sistem operasi saat proses selesai atau gagal.
5. **💻 Konsol Log Resizable**:
   - Tampilan live progress yang dapat diperbesar/ditarik (*resizable*) secara vertikal.

---

## 🚀 Cara Memasang di Browser (Windows / macOS / Linux)

Ekstensi ini kompatibel dengan semua browser berbasis Chromium (**Google Chrome, Microsoft Edge, Brave, Opera**).

### Langkah 1: Unduh File Ekstensi
1. Klik tombol hijau **`Code`** di bagian atas halaman GitHub ini, lalu pilih **`Download ZIP`**.
2. Ekstrak (*Unzip*) file yang telah diunduh ke folder di komputer Anda (misal di folder *Downloads*, *Documents*, atau *Desktop*).
*(Atau gunakan perintah `git clone https://github.com/HelloRayy/sigma-wifi-tools.git`)*.

### Langkah 2: Pasang ke Browser
1. Buka browser (Google Chrome / Edge / Brave).
2. Buka halaman ekstensi dengan mengetik URL berikut di address bar:
   - **Chrome / Brave**: `chrome://extensions`
   - **Edge**: `edge://extensions`
3. Aktifkan **Developer mode** (*Mode Pengembang*) di pojok kanan atas layar.
4. Klik tombol **Load unpacked** (*Muat yang belum dibongkar*) di pojok kiri atas.
5. Pilih folder hasil ekstrak tadi (pilih folder utama yang berisi file `manifest.json`).
6. **Selesai!** Ekstensi akan langsung terpasang dan muncul di toolbar browser Anda.

---

## 🛠️ Panduan Penggunaan

1. Klik ikon ekstensi **Router Killer** di toolbar browser Anda (klik ikon puzzle 🧩 lalu pin jika belum terlihat).
2. Tentukan **Tipe Router** dan **IP Host** (Default: `192.168.1.1`).
3. Masukkan kredensial login. Gunakan tombol **`➕ Tambah Akun Cadangan`** jika ingin menambahkan akun login cadangan.
4. Pilih mode yang diinginkan:
   - **Ganti**: Pilih slot SSID target dan masukkan nama baru.
   - **Tambah**: Pilih slot, masukkan nama baru, dan isi password WiFi (atau klik `🎲 Acak`).
   - **Sembunyikan**: Pilih slot SSID yang ingin disembunyikan dari publik.
5. Klik tombol tindakan utama di bagian bawah untuk memulai otomatisasi!
