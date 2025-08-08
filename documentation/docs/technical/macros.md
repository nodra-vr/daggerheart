---
title: Macros
---

### Resource Macros
Create spend/gain macros for hope, fear, stress.

### Modifier Macros
Add/remove/toggle modifiers by field path.

### Examples
```javascript
await spendHope(actor, 1)
await gainFear(1)
await game.daggerheart.ModifierManager.addModifierByRef(actor, 'system.weapon-main.to-hit', 'Effect Name Here', 1)
```

### Tips
- Use actor IDs instead of names for reliability
- Group related macro buttons together
