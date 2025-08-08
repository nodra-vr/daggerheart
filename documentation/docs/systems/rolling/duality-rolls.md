---
title: Duality Rolls
---

### What it is
Duality rolls use a Hope die and a Fear die together. The system labels results (Critical, Hope, Fear) and applies resource changes automatically.

### Quick start
- From your sheet: click a roll button
- Use the Duality Roll popup to set options, then Roll

You’ll see both dice in chat with a summary of outcomes and any automatic Hope/Stress changes.

### When to use
- Action checks, contests, or anytime the rules call for Hope/Fear
- Reaction rolls by adding `reaction=true`

### Getting started
1. Select or open your character
2. Click a roll button to open the Duality Roll popup
3. Configure options like `trait`, `modifier`, `advantage`, or `disadvantage`
4. Read the result banner (Critical, Hope, Fear) and apply outcomes

### Using the roll popup
1. Click a roll button on your sheet
2. In the popup, set trait/modifier and optional advantage/disadvantage or reaction
3. Press Roll to send results to chat

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

### Rerolling dice
Click Hope or Fear dice in the chat card to reroll that die after a roll.
![Rerolling Hope/Fear die](https://github.com/user-attachments/assets/5453591b-8351-48b5-b7d4-ed5f87897b09)

### Chat messages
Rolls post rich chat cards with clickable dice and resource summaries.

![Duality roll chat card](https://github.com/user-attachments/assets/eca3cd4b-e27a-4ed4-bc9c-0368df153f4b)

### Chat command help
See: [Duality Dice Command](../../technical/duality-dice-command.md).

### Related
- [Advantage & Disadvantage](../rolling/advantage-disadvantage.md)
- [Resource automation](../../systems/resources/hope-fear-stress.md)

### Tips for devs
- To intercept inline commands, see the duality enricher and command parser
- To extend results, hook into the chat render phase for post-processing

