---
title: Damage Dialog
---

### What it is
An interactive dialog that builds the final damage formula. Choose modifiers, see a live preview, and roll.

### Getting started
1. Trigger from an attack card’s Damage button, or open a damage action
2. Review the base formula and edit if needed
3. Toggle damage modifiers you want to include
4. Roll to send results to chat

### How to use
1. Click Damage from the attack message, or open a damage action that shows the dialog
2. Edit the base formula if needed
3. Toggle any modifiers you want to include
4. Roll

### For power users
```javascript
const result = await game.daggerheart.damageApplication.rollDamageWithDialog('d12+2', {
  sourceActor: actor,
  isCritical: false
});
```

### Features
- Formula validation
- Modifier selection
- Proficiency handling
- Critical support
- Real-time preview of final formula
- Prevents duplicate modifier application

### Screenshots
![[damage-roll-dialog.png]]

![Damage dialog preview](https://github.com/user-attachments/assets/d8a68184-517e-4e90-b78c-d19cb2fae187)

### Common uses
- Weapon attacks that include extra damage options
- Spells with multiple damage components
- Rolling with proficiency-based dice patterns (e.g., d12 per proficiency)

### Tips
- Use the preview to confirm the final formula before rolling
- Toggle only the modifiers relevant to this attack to avoid double counting
- If proficiency is not applied, ensure source actor is a character and formula uses proficiency dice syntax

### Related
- [Damage Application](./damage-application.md)
- [Modifiers Manager](../../mechanics/modifiers-manager.md)
- [Equipment System](../../mechanics/equipment-system.md)

