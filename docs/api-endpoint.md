# API Endpoint Presensi

## POST /api/attendances/attendance

Endpoint untuk menerima data presensi dari alat RFID.

### Request Body

```json
{
  "rfid": "string",           // UID kartu RFID (wajib jika nis tidak ada)
  "nis": "string",            // Nomor Induk Siswa (opsional, alternatif dari rfid)
  "info": "string",           // Keterangan (opsional, default: "Hadir")
  "timestamp": "string"       // Timestamp dari alat (opsional, format: YYYY-MM-DDTHH:MM:SS)
}
```

### Contoh Request

#### Dengan timestamp dari alat (real-time):
```json
{
  "rfid": "a1b2c3d4",
  "timestamp": "2026-02-12T14:35:20"
}
```

#### Tanpa timestamp (fallback ke server time):
```json
{
  "rfid": "A1B2C3D4E5F6",
  "info": "Hadir"
}
```

#### Dengan NIS:
```json
{
  "nis": "2023001",
  "timestamp": "2026-02-12T14:35:20",
  "info": "Izin"
}
```

### Response

#### Success (200):
```json
{
  "success": true,
  "message": "check-in berhasil",
  "attendance": {
    "id": 123,
    "studentId": 45,
    "studentName": "John Doe",
    "nis": "2023001",
    "kelas": "XII-A",
    "rfid": "A1B2C3D4E5F6",
    "checkInTime": "2026-02-12T20:04:00.000Z",
    "checkOutTime": null,
    "info": "Hadir",
    "action": "check-in"
  }
}
```

#### Error (400):
```json
{
  "success": false,
  "message": "RFID atau NIS harus diisi"
}
```

### Catatan

- **Timestamp**: Jika tidak dikirim, sistem akan menggunakan waktu server sebagai fallback
- **Format timestamp**: YYYY-MM-DDTHH:MM:SS (tanpa timezone, dianggap WIB/UTC+7)
- **Contoh**: "2026-02-12T14:35:20"
- **Timezone**: Timestamp dari alat dianggap dalam WIB, akan dikonversi ke UTC untuk penyimpanan
- **Cooldown**: Ada cooldown 500ms untuk mencegah double tap
- **Validasi**: Check-out minimal 30 menit setelah check-in, maksimal 12 jam
