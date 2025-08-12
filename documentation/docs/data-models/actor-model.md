---
title: Actor Model
---

### Types

- character, npc, companion, environment

### Overview

Actors store gameplay state including resources, thresholds, defenses, and equipped gear. Character-specific fields power automation like threshold-based damage and Hope/Stress.

### Key Fields

- `system.health`, `system.stress`, `system.hope`
- `system.threshold.major/severe`
- `system.defenses.armor` and `armor-slots`
- `system.weapon-main` and `weapon-off`

### Common accessors

- `actor.system.health`
- `actor.system.threshold.major`
- `actor.system.defenses.armor`
- `actor.system[trait].value`

### Typical flows

1. Update traits or defenses on the sheet
2. Equip items to populate `weapon-main` or `weapon-off`
3. Roll attacks and apply damage with thresholds and armor slots

### Notes

- Characters track Hope and Stress individually
- Fear is party/GM level and not stored on individual actors

### Example updates

```javascript
await actor.update({ 'system.strength.value': 2 });
await actor.update({ 'system.defenses.armor': 1 });
```

### Related

- [Item Model](./item-model.md)
- [System Settings](./system-settings.md)
