# Duality Roll Command Guide

The `/dr` command lets you quickly roll duality dice in chat. You can use it with simple parameters to customize your rolls.

## Basic Usage

Type `/dr` in chat to make a basic duality roll with default settings.

## Advanced Usage

You can add parameters to customize your roll:

### Trait Checks

```
/dr trait=agility
/dr trait=strength
/dr trait=finesse
/dr trait=instinct
/dr trait=presence
/dr trait=knowledge
```

This adds your selected/active character's trait value as a modifier to the roll.

| Trait     | Description             |
| --------- | ----------------------- |
| agility   | Speed and reflexes      |
| strength  | Physical power          |
| finesse   | Precision and control   |
| instinct  | Intuition and awareness |
| presence  | Charisma and influence  |
| knowledge | Learning and memory     |

### Custom Dice

```
/dr hope=d8 fear=d10
/dr hope=d6
/dr fear=d20
```

Change the size of your hope and fear dice. Valid sizes are d4, d6, d8, d10, d12, d20.

### Modifiers

```
/dr modifier=2
/dr modifier=-1
```

Add or subtract from your roll total.

### Advantage and Disadvantage

```
/dr advantage=1d6
/dr disadvantage=2d4
```

Add extra dice to your roll. You can use numbers or dice formulas like 1d6.

### Reaction Rolls

```
/dr reaction=true
```

Make a reaction roll instead of an action roll.

### Combining Parameters

You can mix and match parameters:

```
/dr trait=agility modifier=2 advantage=1
/dr hope=d8 fear=d10 trait=strength
/dr trait=knowledge disadvantage=1d4 reaction=true
```

## Examples

- Basic roll: `/dr`
- Agility check: `/dr trait=agility`
- Strength check with advantage: `/dr trait=strength advantage=1`
- Custom dice with modifier: `/dr hope=d8 fear=d10 modifier=3`
- Reaction roll: `/dr reaction=true`

This feature is inspired by Foundryborne's implementation of the command for their Daggerheart system.

## Related

- [Duality Rolls](../systems/rolling/duality-rolls.md)
- [Advantage & Disadvantage](../systems/rolling/advantage-disadvantage.md)
- [Hope, Fear & Stress](../systems/resources/hope-fear-stress.md)
- [Chat Commands (Technical)](./chat-commands.md)
