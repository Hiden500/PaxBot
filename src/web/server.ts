import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { tui } from "../shared";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

const PORT = process.env.WEB_PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Set up WebSocket connections
io.on("connection", (socket) => {
  console.log("[Web] Client connected to dashboard");

  // Send initial state upon connection
  socket.emit("state", tui.getState());
});

/**
 * Start the web server and hook up TUIStateStore to broadcast updates.
 */
export function startWebServer(): void {
  httpServer.listen(PORT, () => {
    console.log(`[Web] Dashboard running at http://localhost:${PORT}`);
  });

  // Override the renderCallback in TUIStateStore to ALSO broadcast via websockets
  tui.addRenderListener(() => {
    io.emit("state", tui.getState());
  });
}

export function stopWebServer(): void {
  io.close();
  httpServer.close();
}
