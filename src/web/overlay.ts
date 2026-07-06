/**
 * Playwright In-Page Sidebar Overlay (Variant 1).
 * 
 * Injects a sidebar UI directly into the game page to show bot status
 * and control buttons (Stop, Semi-Auto) alongside the game.
 * Communicates with the Web Server via Socket.IO.
 */

import type { Page } from "playwright";

const PORT = process.env.WEB_PORT || 3000;

const SIDEBAR_SCRIPT = (serverUrl: string) => `
(function() {
  if (document.getElementById('paxbot-sidebar')) return;

  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'paxbot-sidebar';
  sidebar.style.cssText = \`
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100vh;
    background: rgba(15, 23, 42, 0.96);
    backdrop-filter: blur(10px);
    border-left: 1px solid #334155;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    color: #f3f4f6;
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease;
    overflow: hidden;
  \`;

  // Create HTML structure
  sidebar.innerHTML = \`
    <div id="paxbot-header" style="background:#1e293b;padding:10px 12px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between;cursor:move">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">🤖</span>
        <div>
          <div style="font-weight:700;font-size:13px;color:#e2e8f0">PaxBot</div>
          <div id="pax-campaign" style="color:#67e8f9;font-size:10px"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span id="pax-turn" style="background:#166534;color:#86efac;font-weight:700;padding:2px 6px;border-radius:4px;font-size:11px"></span>
        <button id="paxbot-toggle" style="background:none;border:1px solid #475569;color:#94a3b8;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:10px">▶</button>
      </div>
    </div>
    
    <div id="paxbot-body" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
      <!-- Status -->
      <div style="padding:8px 12px;background:#1e293b;border-bottom:1px solid #334155">
        <div style="color:#94a3b8;font-size:10px;margin-bottom:2px">Статус:</div>
        <div id="pax-status" style="color:#fbbf24;font-size:11px;font-weight:600">Инициализация...</div>
      </div>
      
      <!-- Control Buttons -->
      <div style="padding:8px 12px;border-bottom:1px solid #334155;display:flex;flex-wrap:wrap;gap:6px">
        <button id="pax-btn-stop" style="background:#991b1b;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600">🛑 Стоп</button>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
          <input type="checkbox" id="pax-semiauto" style="cursor:pointer">
          <span style="color:#cbd5e1;font-size:11px">Полу-ручной</span>
        </label>
        <button id="pax-btn-next" style="background:#166534;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;display:none">▶ Ход</button>
      </div>
      
      <!-- AI Reasoning -->
      <div style="flex:1;overflow-y:auto;padding:8px 12px;border-bottom:1px solid #334155">
        <div style="color:#7dd3fc;font-size:10px;font-weight:600;margin-bottom:4px">🧠 Мышление ИИ</div>
        <div id="pax-reasoning" style="color:#e2e8f0;font-size:10px;line-height:1.5;white-space:pre-wrap">Ожидание...</div>
      </div>
      
      <!-- Last Actions -->
      <div style="padding:8px 12px;max-height:140px;overflow-y:auto;border-bottom:1px solid #334155">
        <div style="color:#4ade80;font-size:10px;font-weight:600;margin-bottom:4px">⚡ Действия</div>
        <div id="pax-actions" style="color:#d1fae5;font-size:10px;line-height:1.6">-</div>
      </div>
      
      <!-- Logs -->
      <div style="padding:8px 12px;max-height:100px;overflow-y:auto">
        <div style="color:#94a3b8;font-size:10px;font-weight:600;margin-bottom:3px">📄 Логи</div>
        <div id="pax-logs" style="color:#94a3b8;font-size:10px;font-family:monospace;line-height:1.4"></div>
      </div>
    </div>
    
    <!-- Footer -->
    <div id="paxbot-footer" style="padding:6px 12px;background:#1e293b;border-top:1px solid #334155">
      <a href="${serverUrl}" target="_blank" style="color:#818cf8;font-size:10px;text-decoration:none">🔗 Открыть полный дашборд →</a>
      <span id="pax-pause-badge" style="display:none;float:right;background:#78350f;color:#fbbf24;border-radius:4px;padding:1px 6px;font-size:10px">⏸ Пауза</span>
    </div>
  \`;

  document.body.appendChild(sidebar);

  // Connect to Socket.IO server
  const script = document.createElement('script');
  script.src = '${serverUrl}/socket.io/socket.io.js';
  script.onload = function() {
    const socket = io('${serverUrl}');
    
    socket.on('state', (state) => {
      const el = (id) => document.getElementById(id);
      
      if (el('pax-campaign')) el('pax-campaign').textContent = state.campaign;
      if (el('pax-turn')) el('pax-turn').textContent = 'Ход ' + state.turn;
      if (el('pax-status')) el('pax-status').textContent = state.currentStatus;
      if (el('pax-reasoning')) el('pax-reasoning').textContent = state.reasoning || 'Ожидание...';
      
      // Pause badge
      if (el('pax-pause-badge')) el('pax-pause-badge').style.display = state.isPaused ? 'inline' : 'none';
      // Next Turn button
      if (el('pax-btn-next')) el('pax-btn-next').style.display = state.isSemiAuto ? 'inline-block' : 'none';
      
      // Actions
      if (el('pax-actions') && state.actions && state.actions.length > 0) {
        el('pax-actions').innerHTML = state.actions.map((a, i) => '<div><b style="color:#4ade80">' + (i+1) + '.</b> ' + a.replace(/</g,'<') + '</div>').join('');
      }
      
      // Logs (last 5)
      if (el('pax-logs') && state.logs && state.logs.length > 0) {
        el('pax-logs').innerHTML = state.logs.slice(-5).map(l => '<div>' + l.replace(/</g,'<') + '</div>').join('');
      }
    });
    
    // Buttons
    const stopBtn = document.getElementById('pax-btn-stop');
    if (stopBtn) stopBtn.addEventListener('click', () => {
      if (confirm('Остановить бота?')) socket.emit('command:stop');
    });
    
    const nextBtn = document.getElementById('pax-btn-next');
    if (nextBtn) nextBtn.addEventListener('click', () => socket.emit('command:next_turn'));
    
    const saCheck = document.getElementById('pax-semiauto');
    if (saCheck) saCheck.addEventListener('change', (e) => socket.emit('command:toggle_semiauto', e.target.checked));
    
    // Toggle sidebar collapse
    const toggleBtn = document.getElementById('paxbot-toggle');
    let collapsed = false;
    if (toggleBtn) toggleBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      sidebar.style.transform = collapsed ? 'translateX(256px)' : 'translateX(0)';
      toggleBtn.textContent = collapsed ? '◀' : '▶';
    });
  };
  document.head.appendChild(script);
})();
`;

/**
 * Inject the PaxBot sidebar overlay into the game page.
 */
export async function injectGameOverlay(page: Page): Promise<void> {
  const serverUrl = `http://localhost:${PORT}`;
  
  try {
    await page.addInitScript(SIDEBAR_SCRIPT(serverUrl));
    await page.evaluate(SIDEBAR_SCRIPT(serverUrl));
    console.log("[Overlay] PaxBot sidebar injected into game page.");
  } catch (err) {
    console.log(`[Overlay] Failed to inject sidebar: ${(err as Error).message}`);
  }
}