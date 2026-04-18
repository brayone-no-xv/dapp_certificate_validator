# Tutorial Dasar Praktik Aplikasi

Project ini adalah DApp React + Vite untuk sertifikat dokumen di jaringan Stellar Soroban (testnet), dengan fitur:

- connect wallet Freighter
- issue certificate (buat sertifikat dari hash file)
- verify certificate (cek hash file/manual)
- revoke certificate

## 1. Prasyarat

Pastikan sudah ada:

- Node.js 18+ (disarankan Node.js 20)
- npm
- Browser extension Freighter
- Akun Stellar testnet yang memiliki saldo XLM (untuk biaya transaksi)

## 2. Konfigurasi Environment

File `.env` sudah tersedia. Contohnya:

```env
VITE_CONTRACT_ID=CA5MNLJIQKIGIRU5ME4W5FWTSPRV7KUEYKGNKUNUUUWFEUKTKRGRQC3J
VITE_RPC_URL=https://soroban-testnet.stellar.org
```

Jika ingin ganti contract lain, cukup ubah `VITE_CONTRACT_ID`.

## 3. Install Dependency

Jalankan di folder project:

```bash
npm install
```

## 4. Jalankan Aplikasi

Mode development:

```bash
npm run dev
```

Lalu buka URL yang tampil di terminal (biasanya `http://localhost:5173`).

## 5. Alur Praktik Dasar

### A. Connect Wallet

1. Klik tombol `Connect Wallet`.
2. Approve koneksi di popup Freighter.
3. Jika berhasil, alamat wallet dan saldo XLM testnet akan muncul.

### B. Issue Certificate

1. Buka tab `Issue`.
2. Isi `Owner Address` (format alamat Stellar dimulai dari `G...`).
3. Isi `Document Name`.
4. Opsional: isi `Note`.
5. Upload file dokumen di `Document File`.
6. Klik `Issue Certificate` lalu approve transaksi di Freighter.
7. Setelah sukses, akan muncul hash terakhir pada `Last issued hash`.

Catatan:

- Hash dokumen dihitung otomatis dengan SHA-256 di browser.
- Biaya transaksi menggunakan XLM testnet.

### C. Verify Certificate

1. Buka tab `Verify`.
2. Pilih salah satu metode:
	 - upload file dokumen (direkomendasikan), atau
	 - isi hash manual 64 karakter hex SHA-256.
3. Klik `Verify`.
4. Jika data ada di contract, detail sertifikat akan tampil (status valid/revoked).

### D. Lihat Data Saya

1. Buka tab `My Certificates`.
2. Bagian `Issued by Me` berisi sertifikat yang Anda terbitkan.
3. Bagian `Owned by Me` berisi sertifikat milik alamat wallet Anda.

### E. Revoke Certificate

1. Di tab `My Certificates`, pada bagian `Issued by Me`, cari sertifikat aktif.
2. Klik `Revoke`.
3. Approve transaksi di Freighter.
4. Status sertifikat akan berubah menjadi `REVOKED`.

## 6. Command Penting

Lint code:

```bash
npm run lint
```

Build production:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## 7. Troubleshooting Singkat

- Tombol connect gagal:
	pastikan extension Freighter aktif di browser yang sama.
- Transaksi gagal:
	cek saldo XLM testnet wallet, pastikan cukup untuk fee.
- Verify tidak ketemu:
	pastikan file/hash sama persis dengan saat issue.
- Data tidak muncul:
	cek `VITE_CONTRACT_ID` dan `VITE_RPC_URL` di `.env`.

## 8. Skenario Uji Cepat (5 Menit)

1. Connect wallet.
2. Issue satu dokumen PDF/TXT kecil.
3. Verify pakai file yang sama.
4. Cek entri di `My Certificates`.
5. Revoke sertifikat, lalu verify ulang untuk memastikan status `REVOKED`.

Selesai. Dengan alur ini, Anda sudah mempraktikkan flow utama aplikasi end-to-end.
