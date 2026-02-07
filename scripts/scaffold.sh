#!/usr/bin/env bash
# Pax-Automata scaffold: creates war-room/ and placeholder files.
# Run from repo root: ./scripts/scaffold.sh
# Safe to re-run; does not overwrite existing content if files already exist.

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WAR_ROOM="$REPO_ROOT/war-room"
mkdir -p "$WAR_ROOM"

# constitution.md — long-term goals (fixed)
if [[ ! -f "$WAR_ROOM/constitution.md" ]]; then
  cat > "$WAR_ROOM/constitution.md" << 'EOF'
# Nation Constitution — Long-Term Goals

Define who this agent is and what it is trying to achieve. Examples:
- Conquer the world.
- Build up local industry and defend borders.
- Maximize population and prosperity.

Edit this file to set the agent's fixed strategic identity.
EOF
  echo "Created $WAR_ROOM/constitution.md"
fi

# crisis_handbook.txt — tactical playbook
if [[ ! -f "$WAR_ROOM/crisis_handbook.txt" ]]; then
  cat > "$WAR_ROOM/crisis_handbook.txt" << 'EOF'
# Crisis Handbook — Tactical Doctrines

Procedures for specific situations, e.g.:
- Managing internal dissent.
- Executing a coup.
- Responding to an invasion.
- Securing supply lines.

Add one procedure per section. The Brain will select tactics from here.
EOF
  echo "Created $WAR_ROOM/crisis_handbook.txt"
fi

# strategic_ledger.json — active plans (schema from PRD)
if [[ ! -f "$WAR_ROOM/strategic_ledger.json" ]]; then
  cat > "$WAR_ROOM/strategic_ledger.json" << 'EOF'
{
  "active_operations": []
}
EOF
  echo "Created $WAR_ROOM/strategic_ledger.json"
fi

# current_state.json — written by Spy; placeholder until first capture
if [[ ! -f "$WAR_ROOM/current_state.json" ]]; then
  echo '{}' > "$WAR_ROOM/current_state.json"
  echo "Created $WAR_ROOM/current_state.json"
fi

# Optional: src layout (spy, brain, hand) — create dirs only
mkdir -p "$REPO_ROOT/src"
for dir in spy brain hand; do
  if [[ ! -d "$REPO_ROOT/src/$dir" ]]; then
    mkdir -p "$REPO_ROOT/src/$dir"
    echo "Created $REPO_ROOT/src/$dir/"
  fi
done

echo "Scaffold complete. War Room: $WAR_ROOM"
ls -la "$WAR_ROOM"
