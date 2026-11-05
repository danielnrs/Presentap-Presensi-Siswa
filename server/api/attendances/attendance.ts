import { defineEventHandler, getQuery, readBody } from "h3";
import { prisma } from "@/server/db";

// ================= CONFIG =================
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // 7 jam
const MIN_CHECKOUT_INTERVAL_MINUTES =
  Number(process.env.MIN_CHECKOUT_INTERVAL_MINUTES) || 2;
const MAX_CHECKOUT_HOURS =
  Number(process.env.MAX_CHECKOUT_HOURS) || 12;

// ================= HELPER =================

// Konversi timestamp dari alat (WIB) → UTC
function convertWIBtoUTC(timestamp: string) {
  const wibDate = new Date(timestamp);

  if (isNaN(wibDate.getTime())) return null;
  return new Date(wibDate.getTime() - WIB_OFFSET_MS);
}

// Start of day berdasarkan UTC
function startOfDayUTC(date: Date) {
  const utcDate = new Date(date.getTime());
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

const sendMessageToWebSocketClients = (message: any) => {
  if (!globalThis.wsClients) return;

  globalThis.wsClients.forEach((client: any) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
};

export default defineEventHandler(async (event) => {
  const method = event.method;

  // ================= GET =================
  if (method === "GET") {
    const query = getQuery(event);
    const isAll = query.all === "1";

    const start = query.start ? new Date(query.start as string) : undefined;
    const end = query.end ? new Date(query.end as string) : undefined;

    let whereFilter: any = {};

    if (start && end) {
      whereFilter.checkInTime = {
        gte: start,
        lte: end,
      };
    } else if (!isAll) {
      const todayUTC = startOfDayUTC(new Date());
      whereFilter.checkInTime = { gte: todayUTC };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereFilter,
      include: { student: true },
      orderBy: { checkInTime: "desc" },
    });

    return attendances.map((att: any) => ({
      id: att.id,
      studentId: att.studentId,
      studentName: att.student.name,
      nis: att.student.nis,
      kelas: att.student.class,
      rfid: att.student.rfid,
      checkInTime: att.checkInTime,   // UTC
      checkOutTime: att.checkOutTime, // UTC
      info: att.info ?? null,
    }));
  }

  // ================= POST =================
  if (method === "POST") {
    const body = await readBody(event);
    const records = Array.isArray(body) ? body : [body];

    // Urutkan jika batch dari SD Card
    records.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    );

    const results: any[] = [];

    for (const record of records) {
      const { rfid, timestamp, info, nis } = record;

      let student = null;
      let deviceTimeUTC = null;

      // === PRESENSI MANUAL (Menggunakan NIS) ===
      if (nis && !rfid) {
        student = await prisma.students.findUnique({
          where: { nis },
        });

        if (!student) {
          results.push({
            success: false,
            message: "Siswa dengan NIS tersebut tidak ditemukan",
          });
          continue;
        }

        deviceTimeUTC = new Date();
      }
      // === PRESENSI RFID (Menggunakan RFID) ===
      else if (rfid && timestamp) {
        student = await prisma.students.findUnique({
          where: { rfid },
        });

        if (!student) {
          sendMessageToWebSocketClients({ rfid });
          results.push({
            success: false,
            message: "Siswa tidak ditemukan",
          });
          continue;
        }

        // Konversi timestamp dari alat (WIB) -> UTC
        deviceTimeUTC = convertWIBtoUTC(timestamp);

        if (!deviceTimeUTC) {
          results.push({
            success: false,
            message: "Format timestamp tidak valid",
          });
          continue;
        }
      }
      // === INPUT TIDAK VALID ===
      else {
        results.push({
          success: false,
          message: "Harap berikan NIS (untuk presensi manual) atau RFID + timestamp (untuk presensi RFID)",
        });
        continue;
      }

      const todayUTC = startOfDayUTC(deviceTimeUTC);

      let attendance = await prisma.attendance.findFirst({
        where: {
          studentId: student.id,
          checkInTime: { gte: todayUTC },
        },
      });

      let action = "";
      const isManualPresensi = !!nis; // Flag untuk presensi manual

      // ================= CHECK-IN =================
      if (!attendance) {
        attendance = await prisma.attendance.create({
          data: {
            studentId: student.id,
            checkInTime: deviceTimeUTC,
            info: info || "Hadir",
          },
        });

        action = "check-in";

        const presensiType = isManualPresensi ? "MANUAL" : "RFID";
        console.log(`
        === PRESENSI MASUK (IN) - ${presensiType} ===
        Nama  : ${student.name}
        NIS   : ${student.nis}
        Kelas : ${student.class}
        RFID  : ${student.rfid || "TIDAK ADA"}
        Waktu : ${deviceTimeUTC.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
        Keterangan: ${info || "Hadir"}
        `);
      }

      // ================= CHECK-OUT =================
      else if (!attendance.checkOutTime) {
        const checkInTime = new Date(attendance.checkInTime);
        const timeDiffMinutes =
          (deviceTimeUTC.getTime() - checkInTime.getTime()) /
          (1000 * 60);

        // Untuk presensi manual, lewati validasi waktu
        if (!isManualPresensi) {
          if (timeDiffMinutes < MIN_CHECKOUT_INTERVAL_MINUTES) {
            results.push({
              success: false,
              message: `Harap tunggu ${MIN_CHECKOUT_INTERVAL_MINUTES} menit setelah check-in.`,
            });
            continue;
          }

          if (timeDiffMinutes > MAX_CHECKOUT_HOURS * 60) {
            results.push({
              success: false,
              message: `Check-out hanya valid dalam ${MAX_CHECKOUT_HOURS} jam.`,
            });
            continue;
          }
        }

        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: { checkOutTime: deviceTimeUTC },
        });

        action = "check-out";

        const presensiType = isManualPresensi ? "MANUAL" : "RFID";
        const durationText = isManualPresensi ? "Presensi Manual" : `${Math.round(timeDiffMinutes)} menit`;
        console.log(`
        === PRESENSI PULANG (OUT) - ${presensiType} ===
        Nama  : ${student.name}
        NIS   : ${student.nis}
        Kelas : ${student.class}
        RFID  : ${student.rfid || "TIDAK ADA"}
        Waktu : ${deviceTimeUTC.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
        Durasi: ${durationText}
        `);
      }

      else {
        // Untuk presensi manual, izinkan update keterangan
        if (isManualPresensi && info) {
          attendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: { info },
          });

          results.push({
            success: true,
            message: `Keterangan presensi diperbarui menjadi "${info}"`,
            attendance: {
              id: attendance.id,
              studentId: student.id,
              studentName: student.name,
              nis: student.nis,
              kelas: student.class,
              rfid: student.rfid,
              checkInTime: attendance.checkInTime,
              checkOutTime: attendance.checkOutTime,
              info: attendance.info,
              action: "updated",
            },
          });

          sendMessageToWebSocketClients({
            id: attendance.id,
            studentId: student.id,
            studentName: student.name,
            nis: student.nis,
            kelas: student.class,
            rfid: student.rfid,
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime,
            info: attendance.info,
            action: "updated",
          });

          continue;
        } else {
          results.push({
            success: false,
            message: "Sudah presensi hari ini.",
          });
          continue;
        }
      }

      const payload = {
        id: attendance.id,
        studentId: student.id,
        studentName: student.name,
        nis: student.nis,
        kelas: student.class,
        rfid: student.rfid,
        checkInTime: attendance.checkInTime,   // UTC
        checkOutTime: attendance.checkOutTime, // UTC
        info: attendance.info ?? null,
        action,
        presensiType: isManualPresensi ? "MANUAL" : "RFID",
      };

      sendMessageToWebSocketClients(payload);

      results.push({
        success: true,
        message: `${action} berhasil`,
        attendance: payload,
      });
    }

    return results.length === 1 ? results[0] : results;
  }

  // ================= DELETE =================
  if (method === "DELETE") {
    const query = getQuery(event);
    const id = Number(query.id);

    if (!id)
      return { success: false, message: "ID diperlukan" };

    await prisma.attendance.delete({ where: { id } });

    return { success: true, message: "Presensi dihapus" };
  }
});
