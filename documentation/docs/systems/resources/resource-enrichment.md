---
title: Resource Enrichment
---

### What it is
Text like "spend 1 hope" becomes a clickable button so you can apply effects without opening sheets.

### Getting started
1. Write natural phrases in items, journals, or chat
2. Let the system automatically convert them to buttons
3. Click buttons to apply effects to the appropriate actor

### What’s supported
- hope, fear, stress, hit points, armor slots
- verbs: spend, gain, mark, clear, recover, heal

### How to use
Just write natural phrases in item or journal text; the system turns them into buttons automatically.

### Detection rules
- Flexible numbers (digits and words)
- Singular and plural resource names
- Context awareness to avoid false positives
- Exclusion patterns to prevent button creation in negated contexts

### Actor detection
1. Active sheet
2. Selected token
3. Owned actors

### Examples
- "mark 2 hit points"
- "spend hope"
- "clear 1 stress"
- "gain 3 fear"

### Tips
- Use simple phrases to guarantee button creation
- Avoid negated phrases if you do not want buttons