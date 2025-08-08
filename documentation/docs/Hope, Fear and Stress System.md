# Resource Management System

## Interactive Text Enrichment

The system automatically scans text content and converts resource-related phrases into clickable buttons. This feature works in chat messages, item descriptions, journal entries, and other text areas.

### How Text Enrichment Works

When the system detects phrases like:

* "spend 2 hope"
* "mark 1 stress" 
* "gain 3 fear"
* "clear 2 hit points"

It automatically creates interactive buttons that users can click to apply the effects immediately.

![firefox_UOQO55WExw](https://github.com/user-attachments/assets/bb077871-7919-415b-bb58-e02fa82f7bdb)

<img width="356" height="605" alt="image" src="https://github.com/user-attachments/assets/b1b0f511-6df5-46fc-a53c-6bdcde529c3e" />
Just raw text entered into the card's details
<img width="818" height="426" alt="image" src="https://github.com/user-attachments/assets/542dac5f-73c1-4f83-99ba-f22c9e21ad38" />
Automatically transforms the text into clickable/interactable buttons

### Supported Resource Patterns

The text enricher recognizes these resource types and actions:

**Hope Resources:**

* `spend 1 hope` → Button to reduce hope by 1
* `gain 2 hope` → Button to increase hope by 2
* `use hope` → Button to spend 1 hope

**Stress Resources:**

* `mark 1 stress` → Button to add 1 stress
* `clear 2 stress` → Button to remove 2 stress
* `remove stress` → Button to clear 1 stress

**Fear Resources:**

* `spend fear` → Button to reduce fear by 1
* `gain 1 fear` → Button to increase fear by 1

**Health Resources:**

* `mark 3 hit points` → Button to apply 3 damage
* `heal 2 hit points` → Button to restore 2 health

**Armor Resources:**

* `use 1 armor slot` → Button to mark 1 armor slot
* `free 2 armor slots` → Button to restore 2 armor slots

<img width="254" height="427" alt="image" src="https://github.com/user-attachments/assets/b346cc71-6e7b-44e4-ae57-99ceb5e3ec65" />
<img width="266" height="457" alt="image" src="https://github.com/user-attachments/assets/07e9ac02-0743-4590-ba75-bdc32d987c88" />


### Pattern Recognition

The system uses advanced pattern matching to detect:

* **Flexible Numbers** - Recognizes both digits (1, 2, 3) and words (one, two, three)
* **Multiple Verbs** - Supports spend, use, gain, mark, clear, remove, heal, recover
* **Plural Forms** - Handles both singular and plural resource names
* **Context Awareness** - Avoids creating buttons in inappropriate contexts

## Automatic Character Detection

When users click resource buttons, the system automatically finds the target character using this priority order:

### Detection Priority

1. **Active Character Sheet** - Character from the currently open sheet
2. **Selected Token** - Actor from the selected token on the canvas
3. **Owned Characters** - Characters the user have permission to modify


### Permission System

The system automatically checks permissions before allowing resource modifications:

* **Character Owners** - Can modify their own characters
* **Game Masters** - Can modify any character
* **Assistant Users** - Can modify characters with appropriate permissions
* **Permission Denied** - Shows warning messages for unauthorized attempts

## Resource Management Functions

The system provides JavaScript functions for programmatic resource management.

### Hope Management

```javascript
// Spend hope from selected character
await spendHope(null, 2);

// Gain hope for specific character
const actor = game.actors.get("actor-id");
await gainHope(actor, 1);

// Create spend hope macro
await createSpendHopeMacro(1, 5); // Amount: 1, Hotbar slot: 5
```

### Stress Management

```javascript
// Apply stress to selected character
await spendStress(null, 1);

// Clear stress from specific character
const actor = game.actors.getName("Character Name");
await clearStress(actor, 2);

// Create stress management macros
await createSpendStressMacro(1, 6);
await createClearStressMacro(2, 7);
```

### Fear Management

```javascript
// Spend fear (typically GM only)
await spendFear(1);

// Gain fear for the party
await gainFear(2);

// Create fear management macros
await createSpendFearMacro(1, 8);
await createGainFearMacro(1, 9);
```

### Armor Slot Management

```javascript
// Use armor slots
await adjustArmorSlots(null, 1);  // Mark 1 slot

// Free armor slots
await adjustArmorSlots(null, -2); // Free 2 slots
```

## Advanced Macro Examples

### Multi-Character Operations

Apply effects to multiple characters simultaneously:

```javascript
// Apply stress to all selected tokens
const selectedTokens = canvas.tokens.controlled;

for (let token of selectedTokens) {
  if (token.actor) {
    await spendStress(token.actor, 1);
  }
}

ui.notifications.info(`Applied stress to ${selectedTokens.length} characters!`);
```

### Conditional Resource Management

Create smart macros that check current resource levels:

```javascript
// Smart rest macro - clears all stress if character has any
if (!actor) {
  ui.notifications.warn("Please select a character!");
  return;
}

const currentStress = actor.system.stress.value || 0;

if (currentStress > 0) {
  await clearStress(actor, currentStress);
  ui.notifications.info(`${actor.name} clears all stress during rest!`);
} else {
  ui.notifications.info(`${actor.name} has no stress to clear.`);
}
```

### Batch Resource Operations

Process multiple resource types in a single macro:

```javascript
// Emergency healing macro
const healAmount = 3;
const stressClearAmount = 2;

if (!actor) {
  ui.notifications.warn("Select a character first!");
  return;
}

// Apply healing
await applyHealing(actor, healAmount, null, true);

// Clear stress
await clearStress(actor, stressClearAmount);

ui.notifications.info(`Emergency aid applied to ${actor.name}!`);
```

## Text Enrichment Configuration

### Exclusion Patterns

The system automatically excludes certain phrases from becoming buttons:

* "without marking a stress"
* "without marking stress"

These exclusions prevent inappropriate button creation in conditional text.

### Custom Phrase Mapping

Advanced users can configure custom phrase mappings by modifying the system configuration. This allows mapping non-standard phrases to resource actions.

Example configuration structure:
```javascript
const customPhrases = {
  "take damage": "mark 1 hit point",
  "use energy": "spend 1 hope",
  "get stressed": "mark 1 stress"
};
```

## System Integration

### Chat Message Integration

Resource buttons work seamlessly in:

* Chat messages from players and GMs
* Item card descriptions
* Spell and ability descriptions
* Journal entry content

### Foundry VTT Integration

The system integrates with core Foundry features:

* **Actor Data Model** - Directly modifies actor resource values
* **Permission System** - Respects Foundry's ownership and permission settings
* **Chat System** - Posts resource changes to chat for transparency
* **Notification System** - Shows success/error messages to users

## Troubleshooting

### Text Enrichment Issues

**Buttons Not Appearing:**

* Verify text contains recognized resource phrases
* Check that text is not inside existing HTML elements
* Ensure system is fully loaded before viewing content

**Buttons Not Working:**

* Confirm character is selected or sheet is open
* Verify user has permission to modify the target character
* Check browser console for JavaScript errors

### Resource Function Issues

**Permission Errors:**

* Ensure user owns the target character
* Verify GM permissions are set correctly
* Check that character type supports the resource

**Function Not Found Errors:**

* Confirm system is properly loaded
* Verify function names are spelled correctly
* Check that required modules are active

### Performance Considerations

**Large Text Processing:**

* Text enrichment processes content automatically
* Large documents may have slight processing delays
* System caches processed content for better performance

## API Reference

### Core Functions

```javascript
// Hope management
spendHope(actor, amount)
gainHope(actor, amount)
createSpendHopeMacro(amount, slot)
createGainHopeMacro(amount, slot)

// Stress management
spendStress(actor, amount)
clearStress(actor, amount)
createSpendStressMacro(amount, slot)
createClearStressMacro(amount, slot)

// Fear management
spendFear(amount)
gainFear(amount)
createSpendFearMacro(amount, slot)
createGainFearMacro(amount, slot)

// Armor management
adjustArmorSlots(actor, delta)
```
