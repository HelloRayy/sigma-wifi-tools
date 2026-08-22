# Router Killer - Chrome Extension (ZTE F660 Automator) ⚡

Chrome Extension (Manifest V3) untuk melakukan otomatisasi login, navigasi menu, pemilihan target SSID, dan penggantian nama SSID pada router ZTE F660 secara otomatis.

---

## 📋 Fitur Utama
1. **Popup Form Konfigurasi**:
   - IP / Host Router (Default: `192.168.1.1`)
   - Username (Default: `user`)
   - Password (Default: `user`)
   - Dropdown Pilihan SSID (`SSID1`, `SSID2`, `SSID3`, `SSID4` - Default: `SSID3`)
   - Input Nama SSID Baru
   - Opsi auto-click tombol **Submit**
2. **One-Click Automation**:
   - Otomatis membuka / mengaktifkan tab router.
   - Otomatis mengisi kredensial login & submit.
   - Otomatis menavigasi menu: `Network` $\rightarrow$ `WLAN` $\rightarrow$ `SSID Settings`.
   - Mengganti target SSID ke pilihan Anda (misal `SSID3`), menunggu data dimuat, lalu mengubah `SSID Name`.
   - Mengaktifkan checkbox *Enable SSID* dan mengklik tombol **Submit**.
3. **Live Progress Logs**:
   - Menampilkan status realtime dan log langkah per langkah langsung pada jendela popup extension.
   - Mengingat parameter terakhir yang Anda ketik (`chrome.storage.local`).

---

## 🚀 Cara Memasang di Google Chrome

1. Buka browser Google Chrome.
2. Akses halaman manajemen ekstensi: ketik `chrome://extensions` di address bar lalu tekan **Enter**.
3. Di pojok kanan atas, aktifkan tombol **Developer mode** (Mode Pengembang).
4. Klik tombol **Load unpacked** (Muat yang belum dibongkar) di pojok kiri atas.
5. Pilih folder:
   ```
   /home/rayhan/Windows-D/extension/router-killer
   ```
   *(atau path folder tempat extension ini berada)*.
6. Ekstensi **Router Killer - ZTE F660 Automator** akan langsung terpasang dan muncul di toolbar Chrome! Pin icon ekstensi agar mudah diakses.

---

## 🛠️ Cara Menggunakan

1. Klik icon ekstensi **Router Killer** di toolbar Chrome.
2. Periksa IP, Username, dan Password (sesuaikan jika berbeda dengan default `user`/`user`).
3. Pilih SSID target (default: **SSID3**).
4. Masukkan **Nama SSID Baru** yang diinginkan.
5. Klik **🚀 Jalankan Otomatisasi**.
6. Tab baru ke `192.168.1.1` akan terbuka dan extension akan mengeksekusi semua langkah secara otomatis hingga selesai!
