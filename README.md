# Daggerheart Foundry System


### Unofficial Fan Project

This is an unofficial, fan-created FoundryVTT system for the Daggerheart TTRPG. The creator is not associated with Darrington Press.

### Installation
Install the system using this manifest link: `https://raw.githubusercontent.com/unofficial-daggerheart/daggerheart/master/system.json`

## Weapon System

### Dynamic Weapon Resolution

The weapon system uses dynamic resolution to ensure weapon stats are always current. When weapons are equipped, they store a reference to the weapon item rather than copying static values. This means:

- Weapon modifications are immediately reflected in equipped weapons
- No need to unequip/re-equip weapons to see changes
- Inline references like `@prof` and `@str` work properly in weapon damage formulas

### Weapon Modifiers vs Character Modifiers

The system correctly separates weapon modifiers from character modifiers:

**Weapon Modifiers**: All damage dice and bonuses that come from the weapon itself (including weapon traits, enchantments, etc.) are combined into a single base damage formula.

**Character Modifiers**: Bonuses from spells, blessings, and other character effects remain as separate modifiers.

**Example**:
- Weapon: "1d12 + 1d6 + 2" (base + weapon traits)
- Character blessing: "+2 damage"
- Final result: "(1d12 + 1d6 + 2) + 2"

### Inline References in Weapons

Weapons can use inline references in their damage formulas:

| Reference | Description | Example |
|-----------|-------------|---------|
| `@prof` | Character's proficiency value | `1d8 + @prof` |
| `@str` | Strength modifier | `1d12 + @str` |
| `@agi` | Agility modifier | `1d10 + @agi` |
| `@fin` | Finesse modifier | `1d8 + @fin` |
| `@ins` | Instinct modifier | `1d6 + @ins` |
| `@pre` | Presence modifier | `1d4 + @pre` |
| `@kno` | Knowledge modifier | `1d6 + @kno` |

### Debug Functions

The system includes several debug functions accessible from the browser console:

```javascript
// Clear stuck weapon base value restrictions
clearWeaponRestrictions();

// Show current weapon data and restrictions for debugging
debugWeaponData();

// Detailed weapon damage formula debugging
debugWeaponDamage();
```

### Core Character Stats for Inline Rolling

| Property | Description | Example |
|----------|-------------|---------|
| `@prof` | Character's proficiency value | `[[/roll (@prof)d20]]` |
| `@proficiency_value` | Alternative syntax for proficiency | `[[/roll (@proficiency_value)d8]]` |
| `@lvl` | Character's level | `[[/roll (@lvl)d6]]` |
| `@level_value` | Alternative syntax for level | `[[/roll (@level_value)d4]]` |
| `@tier` | Character's tier of play (1-4) | `[[/roll (@tier)d10]]` |

### Traits

| Property | Description | Example |
|----------|-------------|---------|
| `@agi` | Agility modifier | `[[/roll 2d12 + @agi]]` |
| `@str` | Strength modifier | `[[/roll 2d12 + @str]]` |
| `@fin` | Finesse modifier | `[[/roll 2d12 + @fin]]` |
| `@ins` | Instinct modifier | `[[/roll 2d12 + @ins]]` |
| `@pre` | Presence modifier | `[[/roll 2d12 + @pre]]` |
| `@kno` | Knowledge modifier | `[[/roll 2d12 + @kno]]` |

### Hit Points and Resources

| Property | Description | Example |
|----------|-------------|---------|
| `@hp` | Current health points | `[[/roll @hp]]` |
| `@hp_max` | Maximum health points | `[[/roll @hp_max]]` |
| `@stress_value` | Current stress | `[[/roll @stress_value]]` |
| `@stress_max` | Maximum stress | `[[/roll @stress_max]]` |
| `@hope_value` | Current hope | `[[/roll @hope_value]]` |
| `@hope_max` | Maximum hope | `[[/roll @hope_max]]` |

### Defenses

| Property | Description | Example |
|----------|-------------|---------|
| `@evasion` | Evasion defense | `[[/roll 1d20 + @evasion]]` |
| `@armor` | Armor value | `[[/roll @armor]]` |
| `@armor_slots` | Available armor slots | `[[/roll @armor_slots]]` |
| `@severe` | Severe damage threshold | `[[/roll @severe]]` |
| `@major` | Major damage threshold | `[[/roll @major]]` |
| `@minor` | Minor damage threshold | `[[/roll @minor]]` |
