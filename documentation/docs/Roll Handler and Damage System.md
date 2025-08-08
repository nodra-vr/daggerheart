# Roll Handler and Damage System

This FoundryVTT system provides advanced dice rolling mechanics and automated damage application tools. This guide covers the technical features and automation capabilities available to streamline your game management.

## System Overview

The Roll Handler and Damage System provides:

* **Advanced Dice Rolling** - Specialized rolling mechanics with automatic result detection
* **Automated Resource Management** - Automatic Hope, Fear, and Stress adjustments based on roll outcomes
* **Interactive Dice Rerolling** - Click-to-reroll functionality for specific dice
* **Damage Application Tools** - Automated damage calculation and application with threshold support
* **Undo System** - Comprehensive undo functionality for damage and healing operations
* **3D Dice Integration** - Full support for Dice So Nice! with custom colorsets

*[Screenshot placeholder: System interface showing roll results and damage application tools]*

## Roll Handler Features

### Duality Roll System

The system provides specialized duality rolling with automatic outcome detection:

```javascript
// Basic duality roll
await game.daggerheart.rollHandler.rollDuality({
  hopeDieSize: 'd12',
  fearDieSize: 'd12',
  modifier: 2,
  sendToChat: true
});

// Duality roll with advantage/disadvantage
await game.daggerheart.rollHandler.rollDuality({
  hopeDieSize: 'd12',
  fearDieSize: 'd12',
  modifier: 0,
  advantage: { d6: 2, d8: 1 },  // 2d6 + 1d8 advantage
  disadvantage: { d4: 1 },      // 1d4 disadvantage
  sendToChat: true
});
```

### Automatic Resource Management

The system automatically handles resource changes based on roll outcomes:

**Hope Outcomes:**

* Automatically adds 1 Hope to the rolling character
* Updates character sheet values in real-time
* Posts notification messages to chat

**Fear Outcomes:**

* Automatically requests Fear gain from the GM
* Uses socket communication for non-GM users
* Integrates with Fear counter systems

**Critical Outcomes:**

* Automatically adds 1 Hope and clears 1 Stress
* Applies both effects simultaneously
* Handles permission checking automatically

*[GIF placeholder: Roll outcome automatically updating character resources]*

### Interactive Dice Rerolling

Players can click on individual Hope or Fear dice to reroll them:

**Reroll Features:**

* **Click Detection** - Hope and Fear dice become clickable after rolling
* **Confirmation Dialog** - Prevents accidental rerolls
* **3D Animation** - Shows new dice roll with proper animations
* **Message Updates** - Updates original chat message with new results
* **Resource Recalculation** - Automatically applies new resource changes

**Usage:**

1. Roll duality dice normally
2. Click on Hope or Fear die in the chat message
3. Confirm the reroll in the dialog
4. Watch the new result and automatic resource updates

*[Screenshot placeholder: Clickable dice with reroll interface]*

### Roll Types and Functions

**Hope Rolls:**
```javascript
// Roll Hope die with modifier
await game.daggerheart.rollHandler.rollHope({
  dieSize: 'd12',
  modifier: 3,
  sendToChat: true
});
```

**Fear Rolls:**
```javascript
// Roll Fear die
await game.daggerheart.rollHandler.rollFear({
  dieSize: 'd12',
  modifier: 0,
  sendToChat: true
});
```

**NPC Rolls:**
```javascript
// Roll for NPCs with advantage/disadvantage
await game.daggerheart.rollHandler.rollNPC({
  dieSize: 'd20',
  modifier: 5,
  advantage: 1,
  disadvantage: 0,
  sendToChat: true
});
```

## Damage Application System

### Automated Damage Calculation

The system automatically calculates damage based on character thresholds:

**Threshold-Based Damage:**

* **Minor Damage** - Below Major threshold = 1 HP
* **Major Damage** - At or above Major threshold = 2 HP  
* **Severe Damage** - At or above Severe threshold = 3 HP

**Armor Integration:**

* Automatically reduces HP damage by armor slots used
* Tracks armor slot consumption
* Updates both health and armor values simultaneously

*[Screenshot placeholder: Damage calculation showing threshold breakdown]*

### Damage Application Functions

**Standard Damage Application:**
```javascript
// Apply damage with threshold calculation
await applyDamage(
  targetActors,           // Array of target actors or null for selected
  damageAmount,           // Raw damage number
  sourceActor,            // Source actor or null
  createUndo,             // Whether to create undo data
  armorSlotsUsed          // Armor slots to consume
);
```

**Direct HP Damage:**
```javascript
// Apply direct HP damage (bypasses thresholds)
await applyDirectDamage(
  targetActors,           // Target actors
  hpDamage,              // Direct HP damage amount
  sourceActor,           // Source actor
  createUndo             // Create undo data
);
```

**Healing Application:**
```javascript
// Apply healing to targets
await applyHealing(
  targetActors,           // Target actors
  healAmount,            // Amount to heal
  sourceActor,           // Source actor
  createUndo             // Create undo data
);
```

### Target Detection System

The system automatically finds target actors using this priority:

1. **Targeted Tokens** - Actors from targeted tokens (highest priority)
2. **Selected Tokens** - Actors from selected tokens
3. **Error Handling** - Clear error messages if no valid targets found

**Token Integration:**

* Preserves token-specific data for undo operations
* Handles both world actors and token actors
* Maintains scene and token ID references

### Undo System

Comprehensive undo functionality for all damage and healing operations:

**Undo Features:**

* **Automatic Tracking** - Creates undo data for all operations
* **Multi-Actor Support** - Handles multiple targets in single operation
* **Token Preservation** - Maintains token vs world actor distinctions
* **Resource Restoration** - Restores both health and armor slots
* **Time-Based Cleanup** - Automatic cleanup of old undo data

**Usage:**
```javascript
// Undo a damage/healing operation
const success = await undoDamageHealing(undoId);

// Debug undo data
debugUndoData(undoId);
```

*[Screenshot placeholder: Undo button in chat message]*

## Advanced Features

### Damage Roll Dialog System

Interactive dialog for complex damage rolls with modifier selection and real-time formula preview:

```javascript
// Show damage roll dialog with modifiers
const result = await rollDamageWithDialog('2d8+3', {
  sourceActor: actor,
  weaponName: 'Magic Sword',
  weaponSlot: 'weapon-main',
  isCritical: false,
  availableModifiers: []
});

// Direct dialog access
const result = await DamageRollDialog.show({
  title: 'Weapon Damage',
  formula: 'd12+2',
  sourceActor: actor,
  weaponName: 'Enchanted Blade',
  weaponType: 'melee',
  isCritical: true,
  damageModifiers: [],
  availableModifiers: []
});
```

**Dialog Features:**

* **Interactive Formula Editor** - Edit base damage formula with validation
* **Modifier Selection** - Choose from available damage modifiers with checkboxes
* **Real-time Preview** - Shows final damage formula as modifiers are selected
* **Proficiency Integration** - Automatically handles proficiency dice patterns
* **Critical Damage Support** - Visual indicators and automatic critical calculations
* **Source Tracking** - Shows modifier sources (weapon, equipment, effects)
* **Permanent Modifier Indicators** - Visual distinction for permanent modifiers

**Formula Processing:**

The dialog handles multiple formula types:

* **Standard Dice** - `2d8+3` (processed normally)
* **Proficiency Dice** - `d12+1` (multiplied by character proficiency)
* **Complex Formulas** - `1d8+1d6+2` (parsed into components)

**Modifier Sources:**

The system automatically detects modifiers from:

* **Weapon Slots** - Main and off-hand weapon modifiers
* **Equipment** - Equipped items with damage bonuses
* **Character Modifiers** - Active character-based modifiers
* **Active Effects** - Temporary effect modifiers
* **Manual Modifiers** - Custom modifiers passed to the dialog

*[Screenshot placeholder: Damage roll dialog showing formula editor and modifier selection]*

**Advanced Dialog Usage:**

```javascript
// Complex damage roll with multiple modifier sources
const result = await DamageRollDialog.show({
  title: 'Spell Damage',
  formula: '3d6',
  sourceActor: casterActor,
  weaponName: 'Fireball',
  isCritical: false,
  damageModifiers: [
    {
      name: 'Spell Focus',
      formula: '+2',
      enabled: true,
      source: 'equipment',
      permanent: false
    }
  ],
  availableModifiers: [
    {
      name: 'Elemental Mastery',
      formula: '+1d4',
      enabled: false,
      source: 'effect',
      permanent: false
    }
  ]
});
```

**Dialog Validation:**

* **Formula Validation** - Real-time validation of dice formulas
* **Error Highlighting** - Visual feedback for invalid formulas
* **Preview Updates** - Live preview of final damage calculation
* **Modifier Conflicts** - Prevents duplicate modifier application

### 3D Dice Integration

Full integration with Dice So Nice! module:

**Custom Colorsets:**

* **Hope Dice** - Custom colors and materials for Hope dice
* **Fear Dice** - Distinct styling for Fear dice
* **Advantage/Disadvantage** - Special styling for modifier dice
* **Automatic Application** - Colors applied automatically based on dice type

**Animation Features:**

* **Roll Synchronization** - Waits for 3D animations to complete
* **Reroll Animations** - Proper animations for rerolled dice
* **Chat Integration** - Animations linked to chat messages

## Chat Message Integration

### Automated Chat Messages

The system creates rich chat messages with:

**Roll Results:**

* **Outcome Detection** - Automatic Hope/Fear/Critical detection
* **Resource Notifications** - Shows automatic resource changes
* **Threshold Information** - GM-only threshold calculation details
* **Interactive Elements** - Clickable dice and undo buttons

**Damage Messages:**

* **Public Notifications** - Damage application results for all players
* **GM Information** - Detailed threshold calculations for GMs
* **Undo Integration** - Embedded undo buttons in messages
* **Status Updates** - Current health and armor status

*[Screenshot placeholder: Rich chat messages showing roll results and damage application]*

### Message Styling

Automatic styling based on roll outcomes:

**Background Colors:**

* **Hope Rolls** - Styled with hope-themed colors
* **Fear Rolls** - Styled with fear-themed colors
* **Critical Rolls** - Special styling for critical outcomes

**Text Formatting:**

* **Bold Outcomes** - Important results highlighted
* **Color Coding** - Hope/Fear text with appropriate colors
* **Icon Integration** - Contextual icons for different message types

## API Reference

### Core Roll Functions

```javascript
// Roll Handler API
game.daggerheart.rollHandler = {
  rollHope(options),
  rollFear(options),
  rollDuality(options),
  rollNPC(options),
  dualityWithDialog(config),
  npcRollWithDialog(config),
  quickRoll(formula, options),
  checkCritical(hopeValue, fearValue),
  enableForcedCritical(),
  disableForcedCritical(),
  isForcedCriticalActive(),
  waitFor3dDice(messageId)
};
```

### Damage Application API

```javascript
// Damage System Functions
applyDamage(targets, amount, source, undo, armor)
applyDirectDamage(targets, hpDamage, source, undo)
applyHealing(targets, healAmount, source, undo)
undoDamageHealing(undoId)
rollDamage(formula, options)
rollDamageWithDialog(formula, options)
rollHealing(formula, options)
extractRollTotal(message)
getActorArmorSlots(actor)
canUseArmorSlots(actor)
debugUndoData(undoId)
```

### Damage Roll Dialog API

```javascript
// Damage Roll Dialog Class
DamageRollDialog.show(config)

// Configuration Object
{
  title: 'Damage Roll',           // Dialog title
  formula: '1d8',                 // Base damage formula
  sourceActor: null,              // Source actor for proficiency
  weaponName: null,               // Weapon name for display
  weaponType: null,               // Weapon type
  isCritical: false,              // Critical damage flag
  damageModifiers: [],            // Primary damage modifiers
  availableModifiers: []          // Additional available modifiers
}

// Modifier Object Structure
{
  id: 'unique_id',                // Unique identifier
  name: 'Modifier Name',          // Display name
  formula: '+2',                  // Damage formula addition
  enabled: false,                 // Default enabled state
  source: 'weapon-main',          // Source category
  permanent: false                // Permanent modifier flag
}

// Dialog Result Object
{
  button: 'roll',                 // Button pressed ('roll' or null)
  finalFormula: '2d8+3+2',       // Complete damage formula
  enabledModifiers: ['Magic', 'Strength'], // Selected modifier names
  baseFormula: 'd8+3'             // Base formula from input
}
```

**Dialog Internal Methods:**

```javascript
// Formula parsing and processing
DamageRollDialog._parseFormula(formula)
DamageRollDialog._getCleanModifiers(damageModifiers, availableModifiers)
DamageRollDialog._buildDialogContent(parsedFormula, modifiers, isCritical)
DamageRollDialog._setupEventHandlers(html, parsedFormula, sourceActor)
DamageRollDialog._processRollResult(html, parsedFormula)
DamageRollDialog._previewProficiencyFormula(baseFormula, sourceActor)
DamageRollDialog._getSourceDisplayName(source)
```

### Configuration Options

**Roll Options:**
```javascript
{
  dieSize: 'd12',           // Die size for rolls
  modifier: 0,              // Numeric modifier
  advantage: {},            // Advantage dice object
  disadvantage: {},         // Disadvantage dice object
  sendToChat: true,         // Send to chat
  returnRoll: false,        // Return roll object
  speaker: null,            // Chat speaker
  reaction: false,          // Is reaction roll
  messageType: 'public'     // Message visibility
}
```

**Damage Options:**
```javascript
{
  sourceActor: null,        // Source of damage
  weaponName: null,         // Weapon name
  weaponSlot: null,         // Weapon slot for modifiers
  isCritical: false,        // Critical damage
  showDialog: false,        // Show damage dialog
  sendToChat: true,         // Send to chat
  returnRoll: false         // Return roll object
}
```

## Integration Features

### Character Sheet Integration

**Automatic Updates:**

* **Resource Tracking** - Updates Hope, Fear, Stress automatically
* **Health Management** - Applies damage and healing to character sheets
* **Armor Tracking** - Manages armor slot consumption
* **Permission Handling** - Respects character ownership and permissions

### Token Integration

**Token-Specific Features:**

* **Target Detection** - Automatic target selection from tokens
* **Scene Awareness** - Handles tokens across different scenes
* **Undo Preservation** - Maintains token references for undo operations
* **Visual Updates** - Token health bars update automatically

### Dialog Integration Workflow

The Damage Roll Dialog integrates seamlessly with the broader damage system:

**1. Dialog Invocation:**
```javascript
// Called from weapon attacks, spells, or manual damage
const result = await rollDamageWithDialog(baseFormula, {
  sourceActor: attacker,
  weaponSlot: 'weapon-main',
  isCritical: rollResult.isCrit
});
```

**2. Modifier Collection:**
* System automatically gathers modifiers from weapon slots
* Includes permanent and temporary modifiers
* Filters duplicates and invalid modifiers
* Presents clean interface to user

**3. User Interaction:**
* User edits base formula if needed
* Selects desired modifiers via checkboxes
* Sees real-time preview of final formula
* Confirms roll or cancels operation

**4. Damage Processing:**
* Dialog passes final formula to damage system
* Proficiency dice are processed automatically
* Critical damage calculations applied if needed
* Result sent to chat with proper formatting

**5. Chat Integration:**
* Rich chat message with damage results
* Shows enabled modifiers in flavor text
* Includes weapon name and critical indicators
* Provides context for damage source

*[GIF placeholder: Complete workflow from dialog to damage application]*

**Modifier Priority System:**

The dialog uses a priority system for modifier handling:

1. **Damage Modifiers** - Explicitly passed modifiers (highest priority)
2. **Weapon Modifiers** - From specified weapon slot
3. **Available Modifiers** - General modifiers from various sources
4. **Duplicate Prevention** - Automatic filtering of duplicate modifiers

**Error Handling:**

* **Invalid Formulas** - Real-time validation with visual feedback
* **Missing Data** - Graceful handling of missing actor or weapon data
* **Permission Issues** - Proper error messages for permission problems
* **Dialog Cancellation** - Clean cancellation without side effects

### Module Compatibility

**Dice So Nice! Integration:**

* **Custom Colorsets** - Automatic dice coloring
* **Animation Synchronization** - Proper timing with 3D animations
* **Reroll Support** - Animations for rerolled dice

**Socket Communication:**

* **Multi-User Support** - Fear gain requests across users
* **Permission Handling** - Proper GM/player permission checks
* **Error Handling** - Graceful fallbacks for communication issues
## Troub
leshooting

### Roll Issues

**Dice Not Rolling:**

* Verify actor is selected or targeted
* Check that roll formulas are valid
* Ensure system is fully loaded

**Resources Not Updating:**

* Confirm character ownership permissions
* Check that actor has required resource systems
* Verify canvas is ready for updates

### Damage Application Issues

**Targets Not Found:**

* Ensure tokens are targeted or selected
* Verify tokens have associated actors
* Check that actors have health systems

**Undo Not Working:**

* Confirm undo ID is valid and recent
* Check that target actors are still available
* Verify scene hasn't changed for token actors

**Threshold Calculations Wrong:**

* Verify actor has threshold values set
* Check that damage amount is positive integer
* Ensure threshold values are properly configured

### Dialog-Specific Issues

**Dialog Not Opening:**

* Check that DamageRollDialog class is properly imported
* Verify DaggerheartDialogHelper is available
* Ensure system is fully initialized before calling

**Formula Validation Errors:**

* Check that base formula uses valid dice notation
* Verify proficiency dice patterns (d12, d8+2) are correct
* Ensure modifier formulas start with + or - when appropriate

**Modifiers Not Appearing:**

* Verify sourceActor has the specified weapon slot
* Check that modifiers have required properties (name, formula)
* Ensure modifiers are not filtered out as duplicates

**Preview Not Updating:**

* Check browser console for JavaScript errors
* Verify event handlers are properly attached
* Ensure formula input is not disabled or readonly

**Proficiency Not Applied:**

* Confirm sourceActor is a character type
* Verify actor has proficiency value set
* Check that formula uses proficiency dice pattern (d12, not 1d12)

**Critical Damage Issues:**

* Verify isCritical flag is properly set
* Check that critical damage calculation is working
* Ensure critical indicator appears in dialog

**Modifier Source Display:**

* Check that modifier source values are recognized
* Verify source mapping in _getSourceDisplayName method
* Ensure permanent modifiers show [P] indicator

**Dialog Styling Issues:**

* Verify CSS classes are properly applied
* Check that dialog stylesheet is loaded
* Ensure modifier checkboxes are properly styled

**Integration Problems:**

* Confirm rollDamage function receives correct parameters
* Verify damage system processes dialog results properly
* Check that chat messages include modifier information

### Performance Considerations

**Large Groups:**

* Damage application processes targets sequentially
* Chat messages created for each target individually
* Consider batch operations for very large groups

**3D Dice Performance:**

* 3D animations may cause delays with many dice
* System waits for animations to complete
* Can be disabled if performance is critical

**Dialog Responsiveness:**

* Complex modifier lists may slow dialog rendering
* Real-time preview updates can impact performance with many modifiers
* Consider limiting number of available modifiers for better performance

## Getting Help
## Related
- [Damage Application](./systems/damage/damage-application.md)
- [Damage Dialog](./systems/damage/damage-dialog.md)
- [Duality Rolls](./systems/rolling/duality-rolls.md)
- [Advantage & Disadvantage](./systems/rolling/advantage-disadvantage.md)
- [Hope, Fear & Stress](./systems/resources/hope-fear-stress.md)

For technical support with the Roll Handler and Damage System:

1. **Check Console Errors** - Open browser console (F12) for detailed error messages
2. **Verify System Version** - Ensure you have the latest system version
3. **Test Basic Functions** - Try simple rolls and damage application first
4. **Check Permissions** - Verify character ownership and GM permissions
5. **Review Configuration** - Check that actors have required data structures
6. **Test Dialog Separately** - Try damage dialog independently of other systems
7. **Report Bugs** - Contact system developers with specific error details and reproduction steps

The Roll Handler and Damage System provides comprehensive automation for dice rolling and damage management. These features reduce manual tracking overhead and create seamless integration between dice results and character sheet updates.