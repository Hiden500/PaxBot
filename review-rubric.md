# PRD Quality Review — PaxBot / Pax Historia Strategic Agent

## Overall verdict

The PRD is accurate on architecture but **thin on strategic depth** and **broken on downstream readiness**. It reads as a developer's notes-to-self rather than a decision-making document. The architecture breakdown (Spy/War Room/Brain/Hand) is sound and matches the actual codebase, but there are no trade-offs, no scope honesty, no success metrics, and no open questions. This PRD cannot feed UX, architecture validation, or story creation without significant expansion.

---

## Decision-readiness — broken

The PRD presents every choice as settled fact. There are no trade-offs, no `[NON-GOAL for MVP]` markers, no `[ASSUMPTION]` tags, and no open questions. An engineer reading this would not know which decisions are reversible and which are load-bearing.

### Findings

- **[critical]** No open questions or trade-offs listed — the entire document is declarative. _Fix:_ Add an Open Questions section (§ 6) capturing at least: LLM provider lock-in risk, fallback strategy when advisor scraping fails, Playwright version compatibility.
- **[high]** No Non-Goals section. The reader cannot tell what is intentionally excluded (e.g., multi-account support, headless mode, CI/CD pipeline). _Fix:_ Add a Non-Goals section with at least 3 items.

---

## Substance over theater — adequate

The document avoids persona and innovation theater. It is refreshingly direct about the technical approach. However, the "Constitution" and "Crisis Handbook" concepts in Step 2 do not exist in the current codebase — they were removed in v3.2. The PRD references dead specs.

### Findings

- **[high]** `constitution.md` and `crisis_handbook.txt` (Step 2) were deleted from the project. The PRD describes them as load-bearing, but the codebase no longer reads them. _Fix:_ Update Step 2 to reference the current Campaign JSON system, which replaced both files.
- **[medium]** No Vision statement at all — "play Pax Historia" is the goal, but there is no thesis on _how_ the agent wins or what makes it effective. _Fix:_ Add a 2-3 sentence Vision anchoring the agent's approach (e.g., "The agent wins through persistent operational awareness, not brute-force military expansion").

---

## Strategic coherence — thin

The PRD lacks a unifying thesis. The roadmap section reads as a chronological build-up of features rather than a strategic arc. There is no discussion of why components were chosen over alternatives.

### Findings

- **[critical]** No Success Metrics or counter-metrics anywhere. The user cannot tell if the agent is working well. _Fix:_ Add §4.1 Success Metrics (e.g., "economic growth rate per 10 turns," "territory expansion velocity," "LLM response validity rate").
- **[high]** No "why this architecture" section. The choice of Playwright over Puppeteer or Selenium, and file-system storage over SQLite, is unexplained. _Fix:_ Add an Architecture Rationale subsection under §2.

---

## Done-ness clarity — broken

FRs are stated as high-level actions ("Intercept network traffic," "Assemble context"). An engineer would not know when a feature is complete without reading the source code. Testable acceptance criteria are absent.

### Findings

- **[critical]** No FR IDs, no acceptance criteria. The "Steps" in §3 mix implementation phases with feature descriptions. _Fix:_ Assign stable FR IDs (FR-001, FR-002...) and give each FR one testable consequence.
- **[high]** "Batch of Actions (JSON list)" — no schema is provided for the batch output. _Fix:_ Add the JSON output schema for the Brain → Hand contract (the batch actions payload).

---

## Scope honesty — broken

Omissions are entirely silent. There is no way to tell what the current version of the agent does vs. what is planned for the future. The PRD never marks anything as `[NON-GOAL for MVP]` or `[DEFERRED]`.

### Findings

- **[critical]** No version mapping. The PRD describes an idealized v1.0, but the actual project is at v3.8.0. _Fix:_ Add a Version History table mapping each PRD section to the version where it was implemented.
- **[high]** No `[ASSUMPTION]` tags. Several inferences are assumed (e.g., "the Advisor will always respond," "Playwright will always find the textarea"). _Fix:_ Tag each assumption with `[ASSUMPTION: …]` and index them in an Assumptions appendix.

---

## Downstream usability — broken

No FR IDs, no Glossary, no cross-references. A downstream workflow (UX, architecture, or story creation) would have to reverse-engineer the structure from the prose.

### Findings

- **[critical]** No Glossary. "Strategic Ledger," "War Room," "Constitution" are used without definition. _Fix:_ Add a Glossary table defining each domain term.
- **[critical]** No stable IDs on any requirement, step, or section. _Fix:_ Assign IDs (FR-001, UJ-001, etc.) to every structural element.

---

## Shape fit — thin

The "Step-by-Step Implementation Roadmap" format is unusual for a PRD — it reads like a technical design doc, not a product requirements document. For a hobby/solo project this is acceptable, but an engineer would still need a separate architecture doc to implement from.

### Findings

- **[medium]** The document has no User Journeys, which is appropriate for the project scope. However, it also has no explicit system behavior descriptions — everything is inferred from the implementation steps. _Fix:_ Add a System Behavior section (§5) describing the agent's response to edge cases (advisor silence, network failure, empty game state).
