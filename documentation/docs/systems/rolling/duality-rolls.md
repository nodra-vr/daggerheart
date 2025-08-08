---
title: Duality Rolls
---

### What it is
Duality rolls use a Hope die and a Fear die together. The system labels results (Critical, Hope, Fear) and applies resource changes automatically.

### Quick start
- From your sheet: click a roll button
- From chat: type `/dr`
- With options: `[[/dr trait=agility modifier=2]]{Agility Check}`

You’ll see both dice in chat with a summary of outcomes and any automatic Hope/Stress changes.

### When to use
- Action checks, contests, or anytime the rules call for Hope/Fear
- Reaction rolls by adding `reaction=true`

### Getting started
1. Select or open your character
2. Trigger a roll from sheet buttons or use `/dr` in chat
3. Add options like `trait`, `modifier`, `advantage`, or `disadvantage`
4. Read the result banner (Critical, Hope, Fear) and apply outcomes

### For power users
```javascript
await game.daggerheart.rollHandler.rollDuality({
  hopeDieSize: 'd12',
  fearDieSize: 'd12',
  modifier: 0,
  advantage: { d6: 1 },
  disadvantage: { d4: 1 },
  sendToChat: true
});
```

### Reading results
- Critical: highest Hope and lowest Fear alignment
- Hope: Hope exceeds Fear
- Fear: Fear exceeds Hope

### Tips
- Critical: +1 Hope, clear 1 Stress
- Hope: +1 Hope
- Fear: GM gains 1 Fear
- You can add Advantage/Disadvantage in the roll dialog when available.

### Rerolling dice
Click Hope or Fear dice in the chat card to reroll that die after a roll.
![Rerolling Hope/Fear die](https://github.com/user-attachments/assets/5453591b-8351-48b5-b7d4-ed5f87897b09)

### Chat messages
Rolls post rich chat cards with clickable dice and resource summaries.
![Duality roll chat card](https://github.com/user-attachments/assets/eca3cd4b-e27a-4ed4-bc9c-0368df153f4b)

### Chat command help
See: [[Duality Dice Command]]. Or use inline: `[[/dr trait=agility modifier=2]]{Agility Check}`.

### Related
- [Advantage & Disadvantage](../rolling/advantage-disadvantage.md)
- [Resource automation](../../systems/resources/hope-fear-stress.md)

### Tips for devs
- To intercept inline commands, see the duality enricher and command parser
- To extend results, hook into the chat render phase for post-processing

