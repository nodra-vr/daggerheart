---
title: Advantage & Disadvantage
---

### What it is
Advantage and Disadvantage add small dice that lean outcomes in your favor or against you. They cancel each other out before a roll is made.

### Getting started
1. Open a roll dialog when available
2. Add sizes and quantities for Advantage/Disadvantage dice
3. Confirm the preview shows net dice after cancellation

### When to use
- Helpful circumstances, teamwork, great positioning → Advantage
- Hindrances, darkness, being rushed → Disadvantage

Add these dice via the roll dialog when prompted, or with chat commands.

### How cancellation works
1. Cancel same-size dice first (1d6 adv cancels 1d6 dis)
2. Any leftover Disadvantage reduces remaining Advantage from smallest sizes upward

### Net calculation
- Same sizes cancel pairwise
- Remaining Disadvantage removes the smallest remaining Advantage sizes first
- The result is the net Advantage dice pool used in the roll

### For power users
```javascript
import { calculateNetResult, generateAdvantageFormula } from 'systems/daggerheart/module/helpers/advantage-manager.js';

const net = calculateNetResult({ d6: 2 }, { d4: 1 });
```

### In Duality Rolls
```javascript
await game.daggerheart.rollHandler.rollDuality({
  advantage: { d6: 2, d8: 1 },
  disadvantage: { d4: 1 }
});
```

### Examples
- Adv: 2d6 + 1d8 vs Dis: 1d4 → Net: 2d6 + 1d8 (no same-size cancellation)
- Adv: 1d6 vs Dis: 1d6 → Net: none

### Related
- [Duality Rolls](./duality-rolls.md)

### Tips
- Favor adding a few larger dice over many tiny dice for readability

### Chat commands
- See: [Duality Roll Command](../../technical/duality-dice-command.md) for adding `advantage`/`disadvantage` in `/dr`

