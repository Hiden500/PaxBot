import { type MilestoneCheck } from "./schemas";
import { Grid } from "./tui-grid";
import { TUIStateStore } from "./tui-state";

export class TUIDashboard {
  static active = false;
  private static instance: TUIDashboard | null = null;
  private state: TUIStateStore;

  // Colors
  private COLOR_GRAY = "\x1b[90m";
  private COLOR_GREEN = "\x1b[32m";
  private COLOR_RED = "\x1b[31m";
  private COLOR_YELLOW = "\x1b[33m";
  private COLOR_CYAN = "\x1b[36m";
  private COLOR_WHITE = "\x1b[37m";

  constructor() {
    TUIDashboard.instance = this;
    this.state = new TUIStateStore(() => this.render());
  }

  addRenderListener(cb: () => void) {
    this.state.addListener(cb);
  }

  getState() {
    return this.state.getState();
  }

  static getInstance(): TUIDashboard {
    if (!TUIDashboard.instance) {
      new TUIDashboard();
    }
    return TUIDashboard.instance!;
  }

  // --- Proxies to StateStore ---

  setCampaign(name: string) {
    this.state.setCampaign(name);
  }

  setTurn(turn: number) {
    this.state.setTurn(turn);
  }

  setLessons(count: number) {
    this.state.setLessons(count);
  }

  setOperations(ops: any[]) {
    this.state.setOperations(ops);
  }

  setReasoning(text: string) {
    this.state.setReasoning(text);
  }

  setStatus(status: string) {
    this.state.setStatus(status);
  }

  setAdvisorQuery(q: string) {
    this.state.setAdvisorQuery(q);
  }

  setAdvisorResponse(r: string) {
    this.state.setAdvisorResponse(r);
  }

  setActions(actions: string[]) {
    this.state.setActions(actions);
  }

  setMilestoneChecks(checks: MilestoneCheck[]) {
    this.state.setMilestoneChecks(checks);
  }

  setImmediateRisks(risks: string[]) {
    this.state.setImmediateRisks(risks);
  }

  setRawGameState(state: string) {
    this.state.setRawGameState(state);
  }

  setSemiAuto(enabled: boolean) {
    this.state.setSemiAuto(enabled);
  }

  setPaused(paused: boolean) {
    this.state.setPaused(paused);
  }

  setStopping(stopping: boolean) {
    this.state.setStopping(stopping);
  }

  log(msg: string) {
    this.state.log(msg);
  }

  // --- Rendering ---

  private truncate(text: string, length: number): string {
    if (!text || text.length <= length) {
      return text;
    }
    const lastSpaceIndex = text.lastIndexOf(" ", length - 3);
    if (lastSpaceIndex > 0) {
      return text.substring(0, lastSpaceIndex) + "...";
    }
    return text.substring(0, length - 3) + "...";
  }

  private renderHeader(grid: Grid, width: number) {
    grid.drawBox(0, 0, width, 3, " PaxBot Console v3.5 ", this.COLOR_GRAY);
    grid.drawString(2, 1, `Campaign: ${this.state.campaign}`, this.COLOR_CYAN, true);
    grid.drawString(
      Math.floor(width / 2) - 8,
      1,
      `Turn: ${this.state.turn}`,
      this.COLOR_GREEN,
      true
    );
    grid.drawString(
      width - 25,
      1,
      `Lessons Learned: ${this.state.lessonsCount}`,
      this.COLOR_YELLOW,
      true
    );
  }

  private renderLeftPanel(grid: Grid, leftWidth: number, mainHeight: number) {
    grid.drawBox(0, 3, leftWidth, mainHeight, " Strategic Ledger ", this.COLOR_GRAY);
    let opRow = 5;
    if (this.state.activeOperations.length === 0) {
      grid.drawString(2, opRow, "No active operations.", this.COLOR_GRAY);
    } else {
      for (const op of this.state.activeOperations) {
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
  }

  private renderReasoningPanel(
    grid: Grid,
    leftWidth: number,
    rightWidth: number,
    reasoningHeight: number
  ) {
    grid.drawBox(
      leftWidth,
      3,
      rightWidth,
      reasoningHeight,
      " AI Strategic Reasoning ",
      this.COLOR_GRAY
    );
    if (this.state.reasoning) {
      grid.drawWrappedText(
        leftWidth + 2,
        4,
        rightWidth - 4,
        reasoningHeight - 2,
        this.state.reasoning,
        this.COLOR_WHITE
      );
    } else {
      grid.drawString(leftWidth + 2, 4, "Awaiting next reasoning phase...", this.COLOR_GRAY);
    }
  }

  private renderMilestonesPanel(
    grid: Grid,
    leftWidth: number,
    rightWidth: number,
    milestonesY: number,
    milestonesHeight: number
  ) {
    grid.drawBox(
      leftWidth,
      milestonesY,
      rightWidth,
      milestonesHeight,
      " Campaign Milestones & Risks ",
      this.COLOR_GRAY
    );

    const halfRightWidth = Math.floor(rightWidth / 2);

    let mRow = milestonesY + 1;
    grid.drawString(leftWidth + 2, mRow, "Milestones:", this.COLOR_CYAN, true);
    mRow++;
    if (this.state.milestoneChecks.length === 0) {
      grid.drawString(leftWidth + 2, mRow, "No milestones evaluated yet.", this.COLOR_GRAY);
    } else {
      for (const mc of this.state.milestoneChecks.slice(0, milestonesHeight - 3)) {
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

    for (let r = milestonesY + 1; r < milestonesY + milestonesHeight - 1; r++) {
      grid.set(leftWidth + halfRightWidth, r, "│", this.COLOR_GRAY);
    }

    let rRow = milestonesY + 1;
    grid.drawString(leftWidth + halfRightWidth + 2, rRow, "Immediate Risks:", this.COLOR_RED, true);
    rRow++;
    if (this.state.immediateRisks.length === 0) {
      grid.drawString(
        leftWidth + halfRightWidth + 2,
        rRow,
        "No immediate risks.",
        this.COLOR_GREEN
      );
    } else {
      for (const risk of this.state.immediateRisks.slice(0, milestonesHeight - 3)) {
        const safeRisk = this.truncate(risk, halfRightWidth - 6);
        grid.drawString(leftWidth + halfRightWidth + 2, rRow, `⚠ ${safeRisk}`, this.COLOR_YELLOW);
        rRow++;
      }
    }
  }

  private renderLogsPanel(
    grid: Grid,
    leftWidth: number,
    rightWidth: number,
    logsY: number,
    logsHeight: number
  ) {
    grid.drawBox(
      leftWidth,
      logsY,
      rightWidth,
      logsHeight,
      " System Logs & Actions ",
      this.COLOR_GRAY
    );

    let logStartRow = logsY + 1;
    if (this.state.actions.length > 0) {
      grid.drawString(
        leftWidth + 2,
        logStartRow,
        "Proposed Actions for Turn:",
        this.COLOR_CYAN,
        true
      );
      logStartRow++;
      for (let i = 0; i < Math.min(this.state.actions.length, 3); i++) {
        const safeAction = this.truncate(this.state.actions[i], rightWidth - 8);
        grid.drawString(4 + leftWidth, logStartRow, `${i + 1}. ${safeAction}`, this.COLOR_GREEN);
        logStartRow++;
      }
      if (this.state.actions.length > 3) {
        grid.drawString(
          4 + leftWidth,
          logStartRow,
          `... and ${this.state.actions.length - 3} more actions.`,
          this.COLOR_GRAY
        );
        logStartRow++;
      }
      logStartRow++;
    }

    const maxLogRows = logsHeight - (logStartRow - logsY) - 2;
    const logsToDraw = this.state.logs.slice(-maxLogRows);
    let r = logStartRow;
    for (const logLine of logsToDraw) {
      if (r >= logsY + logsHeight - 1) {
        break;
      }
      const safeLog = this.truncate(logLine, rightWidth - 4);
      grid.drawString(leftWidth + 2, r, safeLog, this.COLOR_WHITE);
      r++;
    }
  }

  private renderFooter(grid: Grid, width: number, height: number) {
    grid.drawBox(0, height - 2, width, 3, "", this.COLOR_GRAY);
    grid.drawString(2, height - 1, `Status: ${this.state.currentStatus}`, this.COLOR_YELLOW, true);
    grid.drawString(width - 25, height - 1, "Shortcuts: Ctrl+C (Exit)", this.COLOR_GRAY);
  }

  render() {
    if (!TUIDashboard.active) {
      return;
    }

    const width = process.stdout.columns || 110;
    const height = Math.max(process.stdout.rows || 30, 24);

    const grid = new Grid(width, height);

    this.renderHeader(grid, width);

    const leftWidth = Math.floor(width * 0.35);
    const rightWidth = width - leftWidth - 1;
    const mainHeight = height - 5;

    this.renderLeftPanel(grid, leftWidth, mainHeight);

    const reasoningHeight = Math.floor(mainHeight * 0.35);
    this.renderReasoningPanel(grid, leftWidth, rightWidth, reasoningHeight);

    const milestonesHeight = Math.floor(mainHeight * 0.25);
    const milestonesY = 3 + reasoningHeight;
    this.renderMilestonesPanel(grid, leftWidth, rightWidth, milestonesY, milestonesHeight);

    const logsHeight = mainHeight - reasoningHeight - milestonesHeight;
    const logsY = 3 + reasoningHeight + milestonesHeight;
    this.renderLogsPanel(grid, leftWidth, rightWidth, logsY, logsHeight);

    this.renderFooter(grid, width, height);

    process.stdout.write(grid.toString());
  }
}

export const tui = TUIDashboard.getInstance();
