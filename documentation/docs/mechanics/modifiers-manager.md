---
title: Modifiers Manager
---

### Overview
Add, remove, and toggle modifiers that affect abilities, weapons, armor, and thresholds. Supports permanent and temporary modifiers with enable/disable control.

### API
```javascript
await game.daggerheart.ModifierManager.addModifierByRef(actor, 'system.strength.value', 'Buff', 2);
```

### Related
- [Damage Dialog](../systems/damage/damage-dialog.md) (uses modifiers)

### Features
- Temporary and permanent modifiers
- Enable/disable without deleting
- Field-path targeting across actor data
- Automatic aggregation into rolls and dialogs

### Typical flows
1. Add a named modifier to a field path
2. Toggle it on or off as needed
3. Rolls and dialogs include enabled modifiers

### Tips
- Use clear names for quick identification in dialogs
- Prefer field-path APIs for precise targeting
### Related
- [Modifiers Manager (Guide)](../Modifiers Manager.md)
- [Damage Dialog](../systems/damage/damage-dialog.md)
- [Duality Rolls](../systems/rolling/duality-rolls.md)

