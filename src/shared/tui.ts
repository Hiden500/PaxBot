import { type MilestoneCheck } from "./schemas";

interface Cell {
  char: string;
  fg: string;
  bold: boolean;
}

class Grid {
  width: number;
  height: number;
  cells: Cell[][];

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.cells = [];
    this.clear();
  }

  clear() {
    this.cells = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ char: " ", fg: "", bold: false }))
    );
  }

  set(x: number, y: number, char: string, fg = "", bold = false) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.cells[y][x] = { char: char[0] || " ", fg, bold };
    }
  }

  drawString(x: number, y: number, str: string, fg = "", bold = false) {
    for (let i = 0; i < str.length; i++) {
      this.set(x + i, y, str[i], fg, bold);
    }
  }

  drawBox(x: number, y: number, w: number, h: number, title = "", borderFg = "\x1b[90m") {
    // top
    this.drawString(x, y, "┌" + "─".repeat(w - 2) + "┐", borderFg);
    // bottom
    this.drawString(x, y + h - 1, "└" + "─".repeat(w - 2) + "┘", borderFg);
    // sides
    for (let row = y + 1; row < y + h - 1; row++) {
      this.set(x, row, "│", borderFg);
      this.set(x + w - 1, row, "│", borderFg);
    }
    // title
    if (title) {
      const paddedTitle = ` ${title} `;
      this.drawString(x + 2, y, paddedTitle, borderFg, true);
    }
  }

  drawWrappedText(x: number, y: number, w: number, h: number, text: string, fg = "", bold = false) {
    const paragraphs = text.split("\n");
    let row = y;
    for (const paragraph of paragraphs) {
      const words = paragraph.split(" ");
      let line = "";
      for (const word of words) {
        if (line.length + word.length + 1 > w) {
          this.drawString(x, row, line.trim(), fg, bold);
          line = word + " ";
          row++;
          if (row >= y + h) {
            break;
          }
        } else {
          line += word + " ";
        }
      }
      if (row >= y + h) {
        break;
      }
      if (line.trim()) {
        this.drawString(x, row, line.trim(), fg, bold);
        row++;
      } else if (paragraph === "") {
        row++;
      }
      if (row >= y + h) {
        break;
      }
    }
  }

  toString(): string {
    let out = "";
    out += "\x1b[?25l"; // Hide cursor
    out += "\x1b[H"; // Move cursor to 0,0

    for (let y = 0; y < this.height; y++) {
      let currentRow = "";
      let currentFg = "";
      let currentBold = false;
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x];
        if (cell.fg !== currentFg || cell.bold !== currentBold) {
          currentRow += "\x1b[0m"; // reset
          if (cell.fg) {
            currentRow += cell.fg;
          }
          if (cell.bold) {
            currentRow += "\x1b[1m";
          }
          currentFg = cell.fg;
          currentBold = cell.bold;
        }
        currentRow += cell.char;
      }
      out += currentRow;
      if (y < this.height - 1) {
        out += "\n";
      }
    }
    out += "\x1b[0m"; // final reset
    out += "\x1b[?25h"; // Show cursor
    return out;
  }
}

export class TUIDashboard {
  static active = false;
  private static instance: TUIDashboard | null = null;

  // Colors
  private COLOR_GRAY = "\x1b[90m";
  private COLOR_GREEN = "\x1b[32m";
  private COLOR_RED = "\x1b[31m";
  private COLOR_YELLOW = "\x1b[33m";
  private COLOR_CYAN = "\x1b[36m";
  private COLOR_BLUE = "\x1b[34m";
  private COLOR_WHITE = "\x1b[37m";

  // State
  private campaign = "None";
  private turn = 0;
  private lessonsCount = 0;
  private activeOperations: any[] = [];
  private reasoning = "";
  private logs: string[] = [];
  private currentStatus = "Initializing...";
  private lastAdvisorQuery = "";
  private lastAdvisorResponse = "";
  private actions: string[] = [];
  private milestoneChecks: MilestoneCheck[] = [];
  private immediateRisks: string[] = [];

  constructor() {
    TUIDashboard.instance = this;
  }

  static getInstance(): TUIDashboard {
    if (!TUIDashboard.instance) {
      new TUIDashboard();
    }
    return TUIDashboard.instance!;
  }

  private truncate(text: string, length: number): string {
    if (!text || text.length <= length) {
      return text;
    }
    // Find the last space before the limit
    const lastSpaceIndex = text.lastIndexOf(" ", length - 3);
    if (lastSpaceIndex > 0) {
      return text.substring(0, lastSpaceIndex) + "...";
    }
    return text.substring(0, length - 3) + "...";
  }

  setCampaign(name: string) {
    this.campaign = name;
    this.render();
  }

  setTurn(turn: number) {
    this.turn = turn;
    this.render();
  }

  setLessons(count: number) {
    this.lessonsCount = count;
    this.render();
  }

  setOperations(ops: any[]) {
    this.activeOperations = ops;
    this.render();
  }

  setReasoning(text: string) {
    this.reasoning = text;
    this.render();
  }

  setStatus(status: string) {
    this.currentStatus = status;
    this.render();
  }

  setAdvisorQuery(q: string) {
    this.lastAdvisorQuery = q;
    this.render();
  }

  setAdvisorResponse(r: string) {
    this.lastAdvisorResponse = r;
    this.render();
  }

  setActions(actions: string[]) {
    this.actions = actions;
    this.render();
  }

  setMilestoneChecks(checks: MilestoneCheck[]) {
    this.milestoneChecks = checks;
    this.render();
  }

  setImmediateRisks(risks: string[]) {
    this.immediateRisks = risks;
    this.render();
  }

  log(msg: string) {
    // eslint-disable-next-line no-control-regex
    const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, "");
    this.logs.push(cleanMsg);
    if (this.logs.length > 15) {
      this.logs.shift();
    }
    this.render();
  }

  render() {
    if (!TUIDashboard.active) {
      return;
    }

    const width = process.stdout.columns || 110;
    const height = Math.max(process.stdout.rows || 30, 24);

    const grid = new Grid(width, height);

    // --- Header ---
    grid.drawBox(0, 0, width, 3, " PaxBot Console v3.2 ", this.COLOR_GRAY);
    grid.drawString(2, 1, `Campaign: ${this.campaign}`, this.COLOR_CYAN, true);
    grid.drawString(Math.floor(width / 2) - 8, 1, `Turn: ${this.turn}`, this.COLOR_GREEN, true);
    grid.drawString(
      width - 25,
      1,
      `Lessons Learned: ${this.lessonsCount}`,
      this.COLOR_YELLOW,
      true
    );

    // --- Layout bounds ---
    const leftWidth = Math.floor(width * 0.35);
    const rightWidth = width - leftWidth - 1;
    const mainHeight = height - 5;

    // --- Left Panel: Strategic Ledger ---
    grid.drawBox(0, 3, leftWidth, mainHeight, " Strategic Ledger ", this.COLOR_GRAY);
    let opRow = 5;
    if (this.activeOperations.length === 0) {
      grid.drawString(2, opRow, "No active operations.", this.COLOR_GRAY);
    } else {
      for (const op of this.activeOperations) {
        if (opRow >= mainHeight + 1) {
          break;
        }
        const safeGoal = this.truncate(op.goal, leftWidth - 12);
        grid.drawString(2, opRow, `[${op.operation_id}] ${safeGoal}`, this.COLOR_CYAN, true);
        opRow++;
        for (const step of op.steps || []) {
          if (opRow >= mainHeight + 2) {
            break;
          }
          const statusChar =
            step.status === "COMPLETE" ? "✓" : step.status === "FAILED" ? "✗" : "⏳";
          const statusColor =
            step.status === "COMPLETE"
              ? this.COLOR_GREEN
              : step.status === "FAILED"
                ? this.COLOR_RED
                : this.COLOR_YELLOW;
          const safeAction = this.truncate(step.action, leftWidth - 16);
          grid.drawString(4, opRow, `${statusChar} Ph ${step.phase}: ${safeAction}`, statusColor);
          opRow++;
        }
        opRow++;
      }
    }

    // --- Right Top Panel: AI Reasoning ---
    const reasoningHeight = Math.floor(mainHeight * 0.35);
    grid.drawBox(
      leftWidth,
      3,
      rightWidth,
      reasoningHeight,
      " AI Strategic Reasoning ",
      this.COLOR_GRAY
    );
    if (this.reasoning) {
      grid.drawWrappedText(
        leftWidth + 2,
        4,
        rightWidth - 4,
        reasoningHeight - 2,
        this.reasoning,
        this.COLOR_WHITE
      );
    } else {
      grid.drawString(leftWidth + 2, 4, "Awaiting next reasoning phase...", this.COLOR_GRAY);
    }

    // --- Right Middle Panel: Milestones & Risks (Phase 6 & Phase 8) ---
    const milestonesHeight = Math.floor(mainHeight * 0.25);
    const milestonesY = 3 + reasoningHeight;
    grid.drawBox(
      leftWidth,
      milestonesY,
      rightWidth,
      milestonesHeight,
      " Campaign Milestones & Risks ",
      this.COLOR_GRAY
    );

    const halfRightWidth = Math.floor(rightWidth / 2);

    // Milestones (left side of middle panel)
    let mRow = milestonesY + 1;
    grid.drawString(leftWidth + 2, mRow, "Milestones:", this.COLOR_CYAN, true);
    mRow++;
    if (this.milestoneChecks.length === 0) {
      grid.drawString(leftWidth + 2, mRow, "No milestones evaluated yet.", this.COLOR_GRAY);
    } else {
      for (const mc of this.milestoneChecks.slice(0, milestonesHeight - 3)) {
        const checkChar = mc.status === "ACHIEVED" ? "✓" : mc.status === "FAILED" ? "✗" : "⏳";
        const checkColor =
          mc.status === "ACHIEVED"
            ? this.COLOR_GREEN
            : mc.status === "FAILED"
              ? this.COLOR_RED
              : this.COLOR_YELLOW;
        const safeMilestone = this.truncate(mc.milestone, halfRightWidth - 6);
        grid.drawString(leftWidth + 2, mRow, `${checkChar} ${safeMilestone}`, checkColor);
        mRow++;
      }
    }

    // Vertical separator inside middle panel
    for (let r = milestonesY + 1; r < milestonesY + milestonesHeight - 1; r++) {
      grid.set(leftWidth + halfRightWidth, r, "│", this.COLOR_GRAY);
    }

    // Risks (right side of middle panel)
    let rRow = milestonesY + 1;
    grid.drawString(leftWidth + halfRightWidth + 2, rRow, "Immediate Risks:", this.COLOR_RED, true);
    rRow++;
    if (this.immediateRisks.length === 0) {
      grid.drawString(
        leftWidth + halfRightWidth + 2,
        rRow,
        "No immediate risks.",
        this.COLOR_GREEN
      );
    } else {
      for (const risk of this.immediateRisks.slice(0, milestonesHeight - 3)) {
        const safeRisk = this.truncate(risk, halfRightWidth - 6);
        grid.drawString(leftWidth + halfRightWidth + 2, rRow, `⚠ ${safeRisk}`, this.COLOR_YELLOW);
        rRow++;
      }
    }

    // --- Right Bottom Panel: Actions / Logs ---
    const logsHeight = mainHeight - reasoningHeight - milestonesHeight;
    const logsY = 3 + reasoningHeight + milestonesHeight;
    grid.drawBox(
      leftWidth,
      logsY,
      rightWidth,
      logsHeight,
      " System Logs & Actions ",
      this.COLOR_GRAY
    );

    let logStartRow = logsY + 1;
    if (this.actions.length > 0) {
      grid.drawString(
        leftWidth + 2,
        logStartRow,
        "Proposed Actions for Turn:",
        this.COLOR_CYAN,
        true
      );
      logStartRow++;
      for (let i = 0; i < Math.min(this.actions.length, 3); i++) {
        const safeAction = this.truncate(this.actions[i], rightWidth - 8);
        grid.drawString(4 + leftWidth, logStartRow, `${i + 1}. ${safeAction}`, this.COLOR_GREEN);
        logStartRow++;
      }
      if (this.actions.length > 3) {
        grid.drawString(
          4 + leftWidth,
          logStartRow,
          `... and ${this.actions.length - 3} more actions.`,
          this.COLOR_GRAY
        );
        logStartRow++;
      }
      logStartRow++;
    }

    const maxLogRows = logsHeight - (logStartRow - logsY) - 2;
    const logsToDraw = this.logs.slice(-maxLogRows);
    let r = logStartRow;
    for (const logLine of logsToDraw) {
      if (r >= logsY + logsHeight - 1) {
        break;
      }
      const safeLog = this.truncate(logLine, rightWidth - 4);
      grid.drawString(leftWidth + 2, r, safeLog, this.COLOR_WHITE);
      r++;
    }

    // --- Footer ---
    grid.drawBox(0, height - 2, width, 3, "", this.COLOR_GRAY);
    grid.drawString(2, height - 1, `Status: ${this.currentStatus}`, this.COLOR_YELLOW, true);
    grid.drawString(width - 25, height - 1, "Shortcuts: Ctrl+C (Exit)", this.COLOR_GRAY);

    process.stdout.write(grid.toString());
  }
}

export const tui = TUIDashboard.getInstance();
