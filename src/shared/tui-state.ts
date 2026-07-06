import type { MilestoneCheck } from "./schemas";

export class TUIStateStore {
  campaign = "None";
  turn = 0;
  lessonsCount = 0;
  activeOperations: any[] = [];
  reasoning = "";
  logs: string[] = [];
  currentStatus = "Initializing...";
  lastAdvisorQuery = "";
  lastAdvisorResponse = "";
  actions: string[] = [];
  milestoneChecks: MilestoneCheck[] = [];
  immediateRisks: string[] = [];
  
  // New properties for Semi-Auto / Web UI debugging
  rawGameState = "";
  isSemiAuto = false;
  isPaused = false;
  isStopping = false;

  private renderCallbacks: Array<() => void> = [];

  constructor(defaultRenderCallback: () => void) {
    this.renderCallbacks.push(defaultRenderCallback);
  }

  addListener(callback: () => void) {
    this.renderCallbacks.push(callback);
  }

  private notify() {
    for (const cb of this.renderCallbacks) {
      cb();
    }
  }

  getState() {
    return {
      campaign: this.campaign,
      turn: this.turn,
      lessonsCount: this.lessonsCount,
      activeOperations: this.activeOperations,
      reasoning: this.reasoning,
      logs: this.logs,
      currentStatus: this.currentStatus,
      lastAdvisorQuery: this.lastAdvisorQuery,
      lastAdvisorResponse: this.lastAdvisorResponse,
      actions: this.actions,
      milestoneChecks: this.milestoneChecks,
      immediateRisks: this.immediateRisks,
      rawGameState: this.rawGameState,
      isSemiAuto: this.isSemiAuto,
      isPaused: this.isPaused,
      isStopping: this.isStopping,
    };
  }

  setCampaign(name: string) {
    this.campaign = name;
    this.notify();
  }

  setTurn(turn: number) {
    this.turn = turn;
    this.notify();
  }

  setLessons(count: number) {
    this.lessonsCount = count;
    this.notify();
  }

  setOperations(ops: any[]) {
    this.activeOperations = ops;
    this.notify();
  }

  setReasoning(text: string) {
    this.reasoning = text;
    this.notify();
  }

  setStatus(status: string) {
    this.currentStatus = status;
    this.notify();
  }

  setAdvisorQuery(q: string) {
    this.lastAdvisorQuery = q;
    this.notify();
  }

  setAdvisorResponse(r: string) {
    this.lastAdvisorResponse = r;
    this.notify();
  }

  setActions(actions: string[]) {
    this.actions = actions;
    this.notify();
  }

  setMilestoneChecks(checks: MilestoneCheck[]) {
    this.milestoneChecks = checks;
    this.notify();
  }

  setImmediateRisks(risks: string[]) {
    this.immediateRisks = risks;
    this.notify();
  }

  setRawGameState(state: string) {
    this.rawGameState = state;
    this.notify();
  }

  setSemiAuto(enabled: boolean) {
    this.isSemiAuto = enabled;
    this.notify();
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    this.notify();
  }

  setStopping(stopping: boolean) {
    this.isStopping = stopping;
    this.notify();
  }

  log(msg: string) {
    // eslint-disable-next-line no-control-regex
    const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, "");
    this.logs.push(cleanMsg);
    if (this.logs.length > 50) {
      this.logs.shift();
    }
    this.notify();
  }
}