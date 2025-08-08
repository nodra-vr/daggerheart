---
title: NPC Rolls
---

### Overview
Roll for NPCs with optional advantage/disadvantage and modifiers.

### Getting started
1) Select an NPC token
2) Trigger an NPC roll via macro or UI control
3) Add advantage/disadvantage or modifier as needed
4) Send to chat

### API
```javascript
await game.daggerheart.rollHandler.rollNPC({
  dieSize: 'd20',
  modifier: 2,
  advantage: 1,
  sendToChat: true
});
```

### Related
- [Duality Rolls](./duality-rolls.md)

### Features
- Simple NPC check with a single die size
- Advantage and disadvantage support
- Sends formatted results to chat
- Consistent with player roll presentation

### Typical flow
1) Select an NPC token
2) Trigger an NPC roll with options
3) View result and apply consequences

### Tips
- Use macros to repeat common NPC checks
- Keep die size consistent per NPC type for quick reading
- For stealthy or perception checks, set `messageType` to private