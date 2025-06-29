# Daggerheart Foundry System


### Unofficial Fan Project

This is an unofficial, fan-created FoundryVTT system for the Daggerheart TTRPG. The creator is not associated with Darrington Press.

### Installation
Install the system using this manifest link: `https://raw.githubusercontent.com/unofficial-daggerheart/daggerheart/master/system.json`

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
