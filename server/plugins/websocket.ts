import { WebSocketServer } from "ws";
import type { WebSocket as WsWebSocket } from "ws";
export default defineNitroPlugin((nitroApp) => {
  // Pastikan globalThis.wsClients sudah ada
  globalThis.wsClients = globalThis.wsClients || [];

  // Inisialisasi WebSocket Server di port 3001
  const wss = new WebSocketServer({ port: 3001 });

  wss.on("connection", (ws: WsWebSocket) => {
    console.log("Client terhubung ke WebSocket");

    // Simpan client ke daftar
    globalThis.wsClients.push(ws as unknown as WebSocket);

    ws.on("message", (message: string) => {
      console.log("Pesan dari client:", message);
    });

    // Hapus client dari daftar jika terputus
    ws.on("close", () => {
      globalThis.wsClients = globalThis.wsClients.filter((client) => client !== (ws as unknown as WebSocket));
      console.log("Client terputus dari WebSocket");
    });
  });

  console.log("✅ WebSocket Server berjalan di wss://localhost:3001");
});
