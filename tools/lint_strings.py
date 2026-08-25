#!/usr/bin/env python3
"""Vocabulary lint - fails if the banned vocabulary appears in the UI
strings, or if the sentence escapes its three call sites.
Run: python tools/lint_strings.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "js"

BANNED = [
    "task", "tasks", "goal", "goals", "habit", "habits", "productivity",
    "optimize", "optimise", "streak", "streaks", "points", "score", "scores",
    "level", "levels", "crush", "win", "wins", "achievement", "achievements",
    "badge", "badges", "gamified", "leaderboard",
]
BANNED_PHRASES = ["we missed you", "qualify"]
# No health or wellbeing claims anywhere.
HEALTH = ["wellness", "mental health", "therapy", "therapeutic",
          "wellbeing", "well-being", "healing", "self-care"]

STRING_FILES = ["strings.js", "library-data.js"]
failures = 0


def fail(msg):
    global failures
    failures += 1
    print("  x " + msg)


for name in STRING_FILES:
    text = (JS / name).read_text(encoding="utf-8").lower()
    for w in BANNED:
        hits = re.findall(rf"\b{w}\b", text)
        if hits:
            fail(f'{name}: banned word "{w}" ({len(hits)}x)')
    for p in BANNED_PHRASES + HEALTH:
        if p in text:
            fail(f'{name}: banned phrase "{p}"')

# The word "qualify" must appear nowhere in any UI-facing source.
for f in JS.glob("*.js"):
    if "qualify" in f.read_text(encoding="utf-8").lower():
        fail(f'{f.name}: contains "qualify"')

# The sentence: one constant, exactly three call sites.
EXPECTED = {"arc.js", "onboarding.js", "telling.js"}
sites = 0
callers = []
for f in JS.glob("*.js"):
    if f.name == "sentence.js":
        continue
    text = f.read_text(encoding="utf-8")
    if "A life is constituted" in text:
        fail(f"{f.name}: the sentence appears as a literal outside sentence.js")
    uses = len(re.findall(r"\bSENTENCE\b", text))
    imported = 1 if re.search(r"import\s*\{[^}]*\bSENTENCE\b[^}]*\}\s*from", text) else 0
    calls = uses - imported
    if calls > 0:
        callers.append(f.name)
        sites += calls

if sites != 3:
    fail(f"the sentence has {sites} call sites (expected exactly 3: {', '.join(callers) or 'none'})")
unexpected = [c for c in callers if c not in EXPECTED]
if unexpected:
    fail(f"the sentence is used in unexpected files: {', '.join(unexpected)}")

if failures:
    print(f"\nVocabulary lint failed with {failures} problem(s).")
    sys.exit(1)
print("Vocabulary lint passed: banned words absent, the sentence at exactly three call sites.")
