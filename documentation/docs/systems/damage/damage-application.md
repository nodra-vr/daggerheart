---
title: Damage Application
---

### What it is
Damage and healing apply directly to targeted or selected tokens. Characters use thresholds and armor slots to determine how many Hit Points are marked.

### Typical flow (players)

1. Make an attack roll
2. Click the Damage button that appears on the chat message
3. Select targets on the canvas
4. Confirm damage application


Armor slots can reduce the HP marked for characters.

### Selecting targets
- Target tokens (T) to limit who gets affected
- If no targets, selected tokens are used
 
Priority:
1. Targeted tokens
2. Selected tokens
3. Error if none are found

### Undo
Made a mistake? Use the Undo button in the damage chat message to revert.
![Undo damage/healing](https://github.com/user-attachments/assets/4e06b04b-6c8d-4636-a871-c852d1bd6f69)

### For power users
```javascript
await applyDamage(targets, amount, source, true, armorSlotsUsed);
await applyDirectDamage(targets, hpAmount, source, true);
await applyHealing(targets, healAmount, source, true);
await undoDamageHealing(undoId);
```

### Thresholds
- Below Major: 1 HP
- At/above Major: 2 HP
- At/above Severe: 3 HP
![Threshold-based damage](https://github.com/user-attachments/assets/deb85abe-6614-4a47-a403-42846db1d06e)

### Buttons in chat
Damage and Undo controls appear directly on attack and damage messages.

### Tips
- If nothing happens: check that tokens are targeted/selected and have a health system
- Armor: increase or decrease armor slots on the character to change reduction

### Related
- [Damage Dialog](./damage-dialog.md)
- [Actor Model](../../data-models/actor-model.md)

### Integration
- Weapon and equipment modifiers contribute to final damage
- Criticals are supported by the damage dialog and flow through to application

### Armor integration
- Reduces HP marked by the number of armor slots used
- Tracks slot consumption alongside health changes


