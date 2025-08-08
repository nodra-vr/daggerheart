---
title: Equipment System
---

### Overview
Manage equipping and unequipping weapons and armor. Equipped items sync to `weapon-main` and `weapon-off` slots on actors and affect rolls and damage.

### Getting started
1) Open an item sheet for a weapon or armor
2) Toggle Equip to place it on your actor
3) Confirm it appears in `weapon-main` or `weapon-off` on the actor sheet
4) Roll an attack or damage to apply modifiers

### API
```javascript
import { EquipmentHandler } from 'systems/daggerheart/module/helpers/equipmentHandler.js';
await EquipmentHandler.equipPrimary(actor, weaponItem);
```

### Features
- Auto-sync equipped weapons to sheet slots
- Sends formatted item cards to chat
- Integrates with damage modifiers when rolling
- Supports off-hand weapon configuration
- Honors actor permissions for equip/unequip
- Updates loadout bars and relevant UI elements

### Typical flows
1) Equip a weapon on the item sheet
2) The weapon appears in `weapon-main` or `weapon-off`
3) Attack rolls use the equipped weapon’s modifiers

### Tips
- Use item sheet actions to equip faster
- Off-hand weapons apply off-hand modifiers where applicable
- Keep only one primary weapon equipped to avoid confusion
- Use chat cards to confirm item details with your GM

### Troubleshooting
- If a weapon bonus is missing, verify the item is equipped
- Confirm the actor has weapon slots available
- If nothing changes on roll, ensure modifiers are defined on the item
- If equip is blocked, check ownership and permissions

### Related
- [Item Model](../data-models/item-model.md)
- [Actor Model](../data-models/actor-model.md)
- [Item Sheets](../ui/item-sheets.md)
- [Damage Dialog](../systems/damage/damage-dialog.md)

