import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { tui } from "../shared";
import open from "open";

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

  // Handle Control Panel Commands
  socket.on("command:stop", () => {
    console.log("[Web] Received command: STOP");
    tui.setStopping(true);
    // Send immediate interrupt signal if possible, or let the loop pick it up
    process.kill(process.pid, "SIGINT"); 
  });

  socket.on("command:toggle_semiauto", (enabled: boolean) => {
    console.log(`[Web] Received command: Semi-Auto Mode = ${enabled}`);
    tui.setSemiAuto(enabled);
  });

  socket.on("command:next_turn", () => {
    console.log("[Web] Received command: Next Turn");
    if (tui.getState().isPaused) {
      tui.setPaused(false);
    }
  });
});

/**
 * Start the web server and hook up TUIStateStore to broadcast updates.
 */
export async function startWebServer(): Promise<void> {
  httpServer.listen(PORT, async () => {
    console.log(`[Web] Dashboard running at http://localhost:${PORT}`);
    
    // Auto-open browser
    try {
      await open(`http://localhost:${PORT}`);
    } catch (e) {
      console.log("[Web] Could not auto-open browser tab.");
    }
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