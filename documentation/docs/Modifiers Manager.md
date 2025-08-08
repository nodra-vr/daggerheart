# Modifier Manager

The Modifier Manager helps you add temporary and permanent bonuses to your character's abilities, weapons, and other stats. This guide shows you how to use these features in your game.

## What Are Modifiers?

Modifiers are bonuses or penalties that change your character's numbers. For example:

* A magic item that gives +2 to Strength
* A spell that adds +1 to weapon damage
* A curse that reduces Agility by 1

## Types of Modifiers

### Temporary Modifiers
These modifiers last for a short time and can be turned on or off:

* Spell effects
* Potion bonuses
* Situational bonuses

### Permanent Modifiers
These modifiers stay on your character and cannot be easily removed:

* Magic item bonuses
* Character level increases
* Permanent curses

<img width="562" height="685" alt="image" src="https://github.com/user-attachments/assets/8132161a-f700-4a20-9b11-706cc699fded" />

## Adding Modifiers

### Basic Method
You can add modifiers using macros or through the game master. The system will automatically:

* Calculate your new total
* Show the modifier in your character sheet
* Update all related numbers

![firefox_vJjTBilafP](https://github.com/user-attachments/assets/570c4f5f-b00b-45ad-b4f4-c7fc71393bcb)


### What Can Be Modified
You can add modifiers to:

* **Abilities**: Agility, Finesse, Instinct, Knowledge, Presence, Strength
* **Weapon Stats**: Attack bonuses and damage
* **Thresholds**: Major and Severe damage thresholds
* **Armor**: Defense values

## Managing Your Modifiers

### Viewing Modifiers
Your character sheet shows all active modifiers. You can see:

* The name of each modifier
* How much it changes your stats
* Whether it is temporary or permanent

### Turning Modifiers On and Off
Temporary modifiers can be disabled without removing them completely. This is useful when:

* A spell effect ends but might come back
* You want to see your base stats
* Testing different combinations
  
![firefox_3qn9yCAtpu](https://github.com/user-attachments/assets/2c5d217e-bb59-45c5-950d-17c193de4a67)

### Removing Modifiers

* **Temporary modifiers** can be removed at any time
* **Permanent modifiers** require special permission to remove
* The system prevents accidental removal of important bonuses

## Common Examples

### Magic Weapon Bonus
When you get a +1 magic sword:
1. A modifier is added to your weapon damage
2. Your attack rolls automatically include the bonus
3. The bonus shows on your character sheet

### Spell Effect
When a spell gives you +2 Strength:
1. Your Strength score increases by 2
2. All Strength-based rolls use the new number
3. When the spell ends, the modifier can be removed

### Character Level Up
When you gain a level:
1. Your damage thresholds automatically increase
2. The "Character Level" modifier updates
3. This bonus is permanent and cannot be accidentally removed

## Creating Your Own Macros

For players and Game Masters who want to automate modifier management, you can create custom macros and scripts. This section shows you how to build your own tools.

### Why Use Macros?

Macros let you:

* Apply multiple modifiers with one click
* Create spell effect buttons
* Build custom magic item activators
* Automate common game mechanics

### Basic Macro Examples

#### Adding a Simple Modifier

This macro adds a +2 bonus to your Strength:

```javascript
// Add +2 Strength from Strength Boost spell
await ModifierManager.addModifierByRef(
  actor,                           // Your character
  "system.strength.value",         // What to modify
  "Strength Boost",                // Name of the modifier
  2                                // Bonus amount
);

ui.notifications.info("Strength Boost applied!");
```

#### Removing a Modifier

This macro removes a specific modifier:

```javascript
// Remove Strength Boost spell effect
await ModifierManager.removeModifierByRef(
  actor,                           // Your character
  "system.strength.value",         // Where the modifier is
  "Strength Boost"                 // Name to remove
);

ui.notifications.info("Strength Boost ended!");
```

#### Magic Weapon Macro

This macro applies a magic weapon bonus:

```javascript
// Apply +1 Magic Sword bonuses
await ModifierManager.addModifierByRef(
  actor,
  "system.weapon-main.to-hit",     // Attack bonus
  "Magic Sword",
  1
);

await ModifierManager.addModifierByRef(
  actor,
  "system.weapon-main.damage",     // Damage bonus
  "Magic Sword",
  "+1"                             // Damage uses text format
);

ui.notifications.info("Magic sword equipped!");
```

### Advanced Macro Examples

#### Spell with Duration

This macro creates a temporary spell effect that can be easily removed:

```javascript
// Combat Focus spell: +1 to attack and damage
const spellName = "Combat Focus";

// Add attack bonus
await ModifierManager.addModifierByRef(
  actor,
  "system.weapon-main.to-hit",
  spellName,
  1,
  { permanent: false }             // Mark as temporary
);

// Add damage bonus
await ModifierManager.addModifierByRef(
  actor,
  "system.weapon-main.damage",
  spellName,
  "+1",
  { permanent: false }
);

ui.notifications.info(`${spellName} cast!`);
```

#### Toggle Modifier Macro

This macro turns a modifier on or off:

```javascript
// Toggle Armor Boost (+2 armor)
const modifierName = "Armor Boost";
const fieldPath = "system.defenses.armor";

// Check if modifier exists
const modifiers = ModifierManager.getModifiersByRef(actor, fieldPath);
const hasModifier = modifiers.some(mod => mod.name === modifierName);

if (hasModifier) {
  // Remove if it exists
  await ModifierManager.removeModifierByRef(actor, fieldPath, modifierName);
  ui.notifications.info("Armor Boost ended!");
} else {
  // Add if it doesn't exist
  await ModifierManager.addModifierByRef(actor, fieldPath, modifierName, 2);
  ui.notifications.info("Armor Boost activated!");
}
```

#### Multi-Target Spell Macro

This macro affects multiple characters:

```javascript
// Group Blessing: +1 to attacks for selected tokens
const selectedTokens = canvas.tokens.controlled;

if (selectedTokens.length === 0) {
  ui.notifications.warn("Please select tokens to enhance!");
  return;
}

for (let token of selectedTokens) {
  if (token.actor) {
    await ModifierManager.addModifierByRef(
      token.actor,
      "system.weapon-main.to-hit",
      "Group Blessing",
      1,
      { permanent: false }
    );
  }
}

ui.notifications.info(`Group Blessing cast on ${selectedTokens.length} characters!`);
```

### Field Paths Reference

When creating macros, you need to know which field to modify:

**Character Abilities:**

* `"system.agility.value"` - Agility score
* `"system.finesse.value"` - Finesse score
* `"system.instinct.value"` - Instinct score
* `"system.knowledge.value"` - Knowledge score
* `"system.presence.value"` - Presence score
* `"system.strength.value"` - Strength score

**Weapon Stats:**

* `"system.weapon-main.to-hit"` - Main weapon attack bonus
* `"system.weapon-main.damage"` - Main weapon damage
* `"system.weapon-off.to-hit"` - Off-hand weapon attack bonus
* `"system.weapon-off.damage"` - Off-hand weapon damage

**Defenses:**

* `"system.defenses.armor"` - Armor value
* `"system.threshold.major"` - Major damage threshold
* `"system.threshold.severe"` - Severe damage threshold

### Macro Options

When adding modifiers, you can include these options:

```javascript
{
  enabled: true,        // Whether modifier starts enabled
  permanent: false,     // Whether modifier is permanent
  color: "#ff0000",     // Future: Color for the modifier
  id: "custom_id"       // Custom ID for the modifier
}
```

### Finding Characters

You can target characters in different ways:

```javascript
// Current selected character
const myActor = actor;

// By character name (not recommended)
await ModifierManager.addModifierByRef("Character Name", ...);

// By actor ID (recommended)
const actorId = "abc123def456";
await ModifierManager.addModifierById(actorId, ...);

// Selected tokens
const selectedTokens = canvas.tokens.controlled;
```

### Creating Macro Buttons

To create a macro button:

1. Right-click your macro bar
2. Choose "Create Macro"
3. Give it a name and icon
4. Paste your script code
5. Save and test

### Macro Best Practices

**Keep It Simple:**
* Start with basic add/remove macros
* Test each macro before using in game
* Use clear names for your modifiers

**Error Handling:**
* Check if the character exists
* Verify the modifier was applied
* Show helpful messages to users

**Organization:**
* Group related macros together
* Use consistent naming
* Document what each macro does

## Tips for Players

### Keep Track of Sources
Remember where your modifiers come from:

* Magic items you are wearing
* Active spells on your character
* Special abilities you have used

### Communicate with Your GM
Let your Game Master know about:

* Temporary effects that should end
* New magic items you want to use
* Questions about how modifiers work

### Check Your Math
The system calculates everything automatically, but you can:

* Verify the numbers look correct
* Ask questions if something seems wrong
* Report any problems to your GM

## For Game Masters

Game Masters have additional tools to:

* Add modifiers to any character
* Remove permanent modifiers when needed
* Manage modifiers for NPCs and monsters
* Create custom modifier effects

### GM Macro Examples

#### Apply Effect to All Party Members

```javascript
// Apply inspiration to all player characters
const partyActors = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);

for (let actor of partyActors) {
  await ModifierManager.addModifier(
    actor,
    "system.weapon-main.to-hit",
    {
      name: "Inspiration",
      value: 1,
      permanent: false
    }
  );
}

ui.notifications.info(`Inspiration applied to ${partyActors.length} party members!`);
```

#### Environmental Effect Macro

```javascript
// Apply environmental penalty to all tokens in scene
const sceneTokens = canvas.tokens.placeables;

for (let token of sceneTokens) {
  if (token.actor) {
    await ModifierManager.addModifier(
      token.actor,
      "system.agility.value",
      {
        name: "Difficult Terrain",
        value: -1,
        permanent: false
      }
    );
  }
}

ui.notifications.info("Difficult terrain effect applied to all characters!");
```

#### Remove All Temporary Effects

```javascript
// Clean up all temporary modifiers from selected character
if (!actor) {
  ui.notifications.warn("Please select a character!");
  return;
}

const allModifiers = ModifierManager.listAllModifiers(actor);
let removedCount = 0;

for (let [fieldPath, modifiers] of Object.entries(allModifiers)) {
  for (let modifier of modifiers) {
    if (!modifier.permanent) {
      await ModifierManager.removeModifier(actor, fieldPath, modifier.name);
      removedCount++;
    }
  }
}

ui.notifications.info(`Removed ${removedCount} temporary effects from ${actor.name}!`);
```

#### Custom Magic Item Macro

```javascript
// Protective Cloak: +1 to all defenses
const itemName = "Protective Cloak";
const bonus = 1;

// Apply to multiple defense types
const defenseFields = [
  "system.defenses.armor",
  "system.threshold.major",
  "system.threshold.severe"
];

for (let field of defenseFields) {
  await ModifierManager.addModifierByRef(
    actor,
    field,
    itemName,
    bonus,
    { permanent: true }  // Magic items are permanent
  );
}

ui.notifications.info(`${itemName} equipped!`);
```

## Getting Help
## Related
- [Modifiers Manager (Mechanics)](./mechanics/modifiers-manager.md)
- [Damage Dialog](./systems/damage/damage-dialog.md)
- [Duality Rolls](./systems/rolling/duality-rolls.md)

If you need assistance:
1. Check this guide first
2. Ask your Game Master
3. Look for help in your gaming group's chat
4. Report bugs to the system developer

The Modifier Manager makes it easy to handle all the bonuses and penalties in your game. With practice, you will find it simple to track all your character's abilities and equipment bonuses.
