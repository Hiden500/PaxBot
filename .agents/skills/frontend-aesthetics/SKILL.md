---
name: frontend-aesthetics
description: Guide frontend design decisions to create distinctive, creative UIs that avoid generic AI-generated aesthetics. Use when building UI components, designing layouts, selecting colors/fonts, or implementing animations.
---

# Frontend Aesthetics

Approach this as the design lead at a small studio known for giving every client a visual identity that could not be mistaken for anyone else's. Make deliberate, opinionated choices — and take one real aesthetic risk you can justify.

## When to Use

- Designing UI components, layouts, landing pages, dashboards
- Selecting typography, colors, animations
- Reviewing designs for generic patterns
- Starting any new UI from scratch

---

## Two-Pass Design Process

**Do not jump straight to code.** Work in two passes:

**Pass 1 — Plan** (compact token system):

- **Color**: name 4–6 exact hex values
- **Type**: display face (characterful, used with restraint) + body face + utility face if needed
- **Layout**: one-sentence concept + ASCII wireframe to compare options
- **Signature**: the _single_ unique element this page will be remembered by

**Pass 2 — Critique before building**: Does any part of the plan read as the generic default you'd produce for _any similar page_? If yes — revise that part, state what changed and why. Only after confirming relative uniqueness: write the code, following the revised plan exactly.

---

## Design Principles

### Hero is a Thesis

Open with the most characteristic thing in the subject's world — a headline, an image, an animation, a live demo, an interactive moment. A big number + small label + gradient accent is the **template answer** — only use if it's genuinely the best option.

### Signature Element

Spend your boldness in **one place**. Let the signature element be the single memorable thing. Keep everything around it quiet and disciplined. Cut any decoration that does not serve the brief.

### Structure Encodes Information

Structural devices (numbering, eyebrows, dividers, labels) should encode something **true** about the content. Numbered markers 01/02/03 are only appropriate if the content is actually a sequence. Question every structural choice.

### Typography

**AVOID** (overused): Inter, Roboto, Arial, system fonts

**Recommended** — pair deliberately, not the same families you'd reach for on any other project:

- Code/Technical: JetBrains Mono, Fira Code, Victor Mono
- Editorial: Playfair Display, Crimson Pro, Spectral, Lora
- Modern: DM Sans, Outfit, Plus Jakarta Sans (vary across projects)

Set a clear type scale with intentional weights, widths, and spacing. The type treatment itself should be a memorable part of the design.

### Colors & Theme

**AVOID**: Purple gradients on white (clichéd AI aesthetic), generic blue/gray

**Three default looks to actively avoid** (legitimate for some briefs, but never the default):

1. Warm cream background (~#F4F1EA) + high-contrast serif display + terracotta accent
2. Near-black background + single bright acid-green or vermilion accent
3. Broadsheet layout with hairline rules, zero border-radius, dense columns

**Principles**:

- Dominant colors with sharp accents > evenly-distributed palettes
- Draw from IDE themes (Dracula, Nord, Tokyo Night, Monokai) for technical contexts
- Use CSS variables for theming
- 1–2 dominant + 1–2 accent colors

### Animation

Use deliberately — an orchestrated moment lands harder than scattered effects:

1. **High-impact**: Orchestrated page loads with staggered reveals
2. **Micro-interactions**: Button hovers, state changes
3. **Contextual**: Scroll-triggered, parallax

**Warning**: Extra animation contributes to the feeling of AI-generated design. Sometimes less is more.

**Implementation**: CSS-only for HTML/Vanilla JS, Motion (Framer) for React

```css
.stagger-item {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}
.stagger-item:nth-child(1) {
  animation-delay: 0.1s;
}
.stagger-item:nth-child(2) {
  animation-delay: 0.2s;
}
```

### Backgrounds

**AVOID**: Solid white/gray, flat surfaces

**Use**: Layered gradients, geometric patterns, subtle noise, contextual glow/blur

---

## UX Copy Rules

Words appear in a design for one reason: to make it easier to understand, and easier to use.

- **Write from the user's side**: Name things by what people control, never by how the system is built. "Manage notifications" not "Webhook config".
- **Active voice**: A control says exactly what happens — "Save changes," not "Submit."
- **Consistent vocabulary**: The button that says "Publish" produces a toast that says "Published."
- **Failure as direction**: Errors explain what went wrong and how to fix it. No apologies, never vague.
- **Empty screens are invitations**: An empty state invites action, not "No data found."
- **No filler**: Plain verbs, sentence case, tone matched to brand.

---

## Anti-Pattern Checklist

- [ ] Not using Inter, Roboto, Arial, system fonts
- [ ] Not one of the three default looks (cream+terracotta / black+acid / newspaper)
- [ ] Color hierarchy clear (dominant + accent), not evenly distributed
- [ ] Animations orchestrated and purposeful — not scattered
- [ ] Backgrounds have depth
- [ ] Typography choice is specific to this brief, not generic
- [ ] Design varies from previous projects
- [ ] Structural elements encode real information
- [ ] Copy is active voice, specific, no filler

---

## Output Format

```json
{
  "subject": "What this page is and its single job",
  "typography": { "display": "Font + reasoning", "body": "Font", "code": "Mono font" },
  "colors": { "dominant": ["#hex"], "accent": ["#hex"], "theme_inspiration": "Reference" },
  "layout": "One-sentence concept + ASCII wireframe",
  "signature": "The single unique element this page will be remembered by",
  "animations": {
    "approach": "CSS-only|Framer",
    "focus": "Page load|micro-interactions",
    "key_moments": []
  },
  "backgrounds": { "technique": "Gradients|patterns", "atmosphere": "Description" },
  "anti_pattern_validation": { "passed": true, "warnings": [] }
}
```

---

## Example

**Input**: Technical documentation, code-focused, for developers

**Plan**:

- Subject: API reference for a TypeScript SDK — single job: find the right method fast
- Typography: DM Sans (body/nav), JetBrains Mono (code + headings) — code IS the content
- Colors: #0f172a, #1e293b dominant; #38bdf8 accent; #f97316 warning — Tokyo Night inspired
- Layout: Split — sticky sidebar TOC left, content right, 65ch max-width
- Signature: Live inline playground embedded directly in method docs
- Animations: CSS-only, scroll-triggered section reveals, hover highlight on sidebar items
- Background: Dark gradient with subtle dot-grid overlay

**Anti-pattern check**: No cream, no acid-green, no newspaper — ✅ passes

---

## Notes

- **Variation is critical** — avoid converging on same choices across projects
- **Context > Convention** — match brand identity and purpose before reaching for defaults
- **Performance**: CSS-only preferred; Framer Motion only for complex React animations
- **Accessibility**: Ensure WCAG compliance despite distinctive aesthetics (`prefers-reduced-motion`)
- **CSS specificity**: Be careful with selector specificity — easy to generate classes that cancel each other out (especially `.section` vs element selectors, or padding/margin between sections)
