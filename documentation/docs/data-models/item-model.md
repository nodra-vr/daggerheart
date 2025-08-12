---
title: Item Model
---

### Types

- item, inventory, worn, domain, vault, ancestry, community, class, subclass, weapon, armor, passive

### Overview

Items store rules text, modifiers, counters, and equip state. Equipped items contribute to actor rolls, damage, defenses, and sidebars.

### Fields

- `system.description`, `system.attributes`, `system.groups`

### Weapon and armor

- Weapon items contribute attack and damage modifiers when equipped
- Armor items contribute armor values or slots where applicable

### Domain and passive

- Abilities that appear in sidebars and can expose counters

### Example

```javascript
await item.update({ 'system.attributes.damage': 'd12+1' });
```

### Related

- [Actor Model](./actor-model.md)
- [Equipment System](../mechanics/equipment-system.md)
- [Domain Ability Sidebar](../ui/domain-ability-sidebar.md)
