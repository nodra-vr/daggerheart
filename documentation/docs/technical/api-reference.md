---
title: API Reference
---

### Global
`game.daggerheart` exposes helpers and systems.

### Roll Handler
`rollHope`, `rollFear`, `rollDuality`, `rollNPC`, dialogs.

### Damage
`applyDamage`, `applyDirectDamage`, `applyHealing`, `undoDamageHealing`.

### Utilities
`EquipmentHandler`, `ModifierManager`, `SheetTracker`.

### Examples
```javascript
await game.daggerheart.rollHandler.rollHope({ dieSize: 'd12', modifier: 1, sendToChat: true })
await game.daggerheart.rollHandler.rollDuality({ advantage: { d6: 1 }, sendToChat: true })
await applyDamage(null, 2, actor, true, 1)
await game.daggerheart.ModifierManager.addModifierByRef(actor, 'system.strength.value', 'Buff', 2)
```

### Notes
- Functions accept options objects for chat visibility and return modes
- Most utilities are available under `game.daggerheart`
