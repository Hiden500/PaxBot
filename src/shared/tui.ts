import { type MilestoneCheck } from "./schemas";
import { TUIStateStore } from "./tui-state";

export class TUIDashboard {
  static active = false;
  private static instance: TUIDashboard | null = null;
  private state: TUIStateStore;

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

  render() {
    // Console rendering logic removed completely in favor of pure Web UI
  }
}

export const tui = TUIDashboard.getInstance();
