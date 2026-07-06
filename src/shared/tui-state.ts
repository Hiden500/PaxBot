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

  private renderCallback: () => void;

  constructor(renderCallback: () => void) {
    this.renderCallback = renderCallback;
  }

  setCampaign(name: string) {
    this.campaign = name;
    this.renderCallback();
  }

  setTurn(turn: number) {
    this.turn = turn;
    this.renderCallback();
  }

  setLessons(count: number) {
    this.lessonsCount = count;
    this.renderCallback();
  }

  setOperations(ops: any[]) {
    this.activeOperations = ops;
    this.renderCallback();
  }

  setReasoning(text: string) {
    this.reasoning = text;
    this.renderCallback();
  }

  setStatus(status: string) {
    this.currentStatus = status;
    this.renderCallback();
  }

  setAdvisorQuery(q: string) {
    this.lastAdvisorQuery = q;
    this.renderCallback();
  }

  setAdvisorResponse(r: string) {
    this.lastAdvisorResponse = r;
    this.renderCallback();
  }

  setActions(actions: string[]) {
    this.actions = actions;
    this.renderCallback();
  }

  setMilestoneChecks(checks: MilestoneCheck[]) {
    this.milestoneChecks = checks;
    this.renderCallback();
  }

  setImmediateRisks(risks: string[]) {
    this.immediateRisks = risks;
    this.renderCallback();
  }

  log(msg: string) {
    // eslint-disable-next-line no-control-regex
    const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, "");
    this.logs.push(cleanMsg);
    if (this.logs.length > 15) {
      this.logs.shift();
    }
    this.renderCallback();
  }
}
