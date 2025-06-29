// Import Modules
import { SimpleActor } from "./actor.js";
import { SimpleItem } from "./item.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleWeaponSheet } from "./weapon-sheet.js";
import { SimpleActorSheet, NPCActorSheet } from "./actor-sheet.js";
import { CompanionActorSheet } from "./actor-sheet-companion.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { createDaggerheartMacro, createSpendFearMacro, createGainFearMacro, createSpendStressMacro, createSpendHopeMacro, spendStress, spendHope } from "./spending-system.js";
import { SimpleToken, SimpleTokenDocument } from "./token.js";
import { CounterUI } from "./counter-ui.js";
import { TokenCounterUI } from "./token-counter-ui.js";
import { CountdownTracker } from "./countdown-tracker.js";
import { SheetTracker } from "./sheet-tracker.js";
import { DaggerheartMigrations } from "./migrations.js";
import { EquipmentHandler } from "./equipmentHandler.js";
import { EntitySheetHelper } from "./helper.js";

import { _rollHope, _rollFear, _rollDuality, _rollNPC, _checkCritical, _enableForcedCritical, _disableForcedCritical, _isForcedCriticalActive, _quickRoll, _dualityWithDialog, _npcRollWithDialog, _waitFor3dDice } from './rollHandler.js';
import { applyDamage, applyHealing, extractRollTotal, rollDamage, rollHealing, undoDamageHealing, debugUndoData } from './damage-application.js';

/**
 @param {Actor|null} actor (optional if level is provided)
 @param {number|null} level (optional, will use actor's level if not provided)
 @returns {number}
 */

function _getTierOfPlay(actor = null, level = null) {
  let characterLevel = level;
  
  if (characterLevel === null || characterLevel === undefined) {
    if (!actor) {
      console.warn("Daggerheart | getTierOfPlay: No actor or level provided, defaulting to tier 1");
      return 1;
    }
    characterLevel = actor.system?.level?.value || 1;
  }
  
  characterLevel = parseInt(characterLevel) || 1;
  characterLevel = Math.max(1, Math.min(10, characterLevel));
  
  if (characterLevel === 1) return 1;
  if (characterLevel >= 2 && characterLevel <= 4) return 2;
  if (characterLevel >= 5 && characterLevel <= 7) return 3;
  if (characterLevel >= 8 && characterLevel <= 10) return 4;
  
  return 1;
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function() {
  console.log(`Initializing Simple Daggerheart System`);

  // Initialize Dice So Nice colorsets for all players
  if (game.dice3d) {
    // Hope Die
    game.dice3d.addColorset({
      name: "Hope",
      category: "Hope Die",
      description: "Hope",
      texture: "ice",
      foreground: "#ffbb00",
      background: "#ffffff",
      outline: "#000000",
      edge: "#ffbb00",
      material: "glass",
      font: "Modesto Condensed",
    });
    
    // Fear Die
    game.dice3d.addColorset({
      name: "Fear",
      category: "Fear Die", 
      description: "Fear",
      texture: "fire",
      foreground: "#FFFFFF",
      background: "#523333",
      outline: "#b30012",
      edge: "#800013",
      material: "metal",
      font: "Modesto Condensed",
    });
    
    // Modifier Die
    game.dice3d.addColorset({
      name: "Modifier",
      category: "Modifier Die",
      description: "Modifier",
      texture: "marble",
      foreground: "#222222",
      background: "#DDDDDD",
      outline: "#000000",
      edge: "#555555",
      material: "plastic",
      font: "Arial",
    });
  }

  // CONFIG.statusEffects = [];

  CONFIG.statusEffects.push({
    id: "hidden",
    label: "Hidden",
    icon: "icons/svg/invisible.svg"
  });
  CONFIG.statusEffects.push({
    id: "restrained",
    label: "Restrained",
    icon: "icons/svg/padlock.svg"
  });
  CONFIG.statusEffects.push({
    id: "vulnerable",
    label: "Vulnerable",
    icon: "icons/svg/stoned.svg"
  });

  /**
   * Set an initiative formula for the system. This will be updated later.
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  game.daggerheart = {
    SimpleActor,
    createDaggerheartMacro,
    createSpendFearMacro,
    createGainFearMacro,
    createSpendStressMacro,
    createSpendHopeMacro,
    spendStress,
    spendHope,
    SheetTracker,
    EquipmentHandler,
    rollHandler: {
      rollHope: _rollHope,
      rollFear: _rollFear,
      rollDuality: _rollDuality,
      rollNPC: _rollNPC,
      checkCritical: _checkCritical,
      enableForcedCritical: _enableForcedCritical,
      disableForcedCritical: _disableForcedCritical,
      isForcedCriticalActive: _isForcedCriticalActive,
      quickRoll: _quickRoll,
      dualityWithDialog: _dualityWithDialog,
      npcRollWithDialog: _npcRollWithDialog,
      waitFor3dDice: _waitFor3dDice
    },
    damageApplication: {
      applyDamage: applyDamage,
      applyHealing: applyHealing,
      rollDamage: rollDamage,
      rollHealing: rollHealing,
      extractRollTotal: extractRollTotal,
      undoDamageHealing: undoDamageHealing,
      debugUndoData: debugUndoData
    },
    getTierOfPlay: _getTierOfPlay,
    EquipmentHandler: EquipmentHandler,
    EntitySheetHelper: EntitySheetHelper
  };

  // Make EntitySheetHelper available globally for other modules
  globalThis.daggerheart = {
    EntitySheetHelper
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = SimpleActor;
  CONFIG.Actor.typeLabels = {
    character: "ACTOR.TypeCharacter",
    npc: "ACTOR.TypeNpc",
    companion: "ACTOR.TypeCompanion"
  };
  CONFIG.Item.documentClass = SimpleItem;
  CONFIG.Item.typeLabels = {
    item: "ITEM.TypeItem",
    inventory: "ITEM.TypeInventory",
    worn: "ITEM.TypeWorn",
    domain: "ITEM.TypeDomain",
    vault: "ITEM.Vault",
    ancestry: "ITEM.TypeAncestry",
    community: "ITEM.TypeCommunity",
    class: "ITEM.TypeClass",
    subclass: "ITEM.TypeSubclass",
    weapon: "ITEM.TypeWeapon"
  };
  CONFIG.Token.documentClass = SimpleTokenDocument;
  CONFIG.Token.objectClass = SimpleToken;

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2);
  foundry.documents.collections.Actors.registerSheet("daggerheart", SimpleActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SHEET.Actor.character"
  });
  foundry.documents.collections.Actors.registerSheet("daggerheart", NPCActorSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "SHEET.Actor.npc"
  });
  foundry.documents.collections.Actors.registerSheet("daggerheart", CompanionActorSheet, {
    types: ["companion"],
    makeDefault: true,
    label: "SHEET.Actor.companion"
  });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.applications.sheets.ItemSheetV2);
  foundry.documents.collections.Items.registerSheet("daggerheart", SimpleItemSheet, {
    types: ["item", "inventory", "worn", "domain", "vault", "ancestry", "community", "class", "subclass"],
    makeDefault: true,
    label: "SHEET.Item.default"
  });
  foundry.documents.collections.Items.registerSheet("daggerheart", SimpleWeaponSheet, {
    types: ["weapon"],
    makeDefault: true,
    label: "SHEET.Item.weapon"
  });

  // Register system settings
  game.settings.register("daggerheart", "macroShorthand", {
    name: "SETTINGS.SimpleMacroShorthandN",
    hint: "SETTINGS.SimpleMacroShorthandL",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  // Register counter value setting
  game.settings.register("daggerheart", "counterValue", {
    name: "Counter Value",
    hint: "The current value of the counter",
    scope: "world",
    type: Number,
    default: 0,
    config: false // Don't show in settings menu
  });

  // Register countdown trackers setting
  game.settings.register("daggerheart", "countdownTrackers", {
    name: "Countdown Trackers",
    hint: "Persistent countdown/progress tracker data",
    scope: "world",
    type: Array,
    default: [],
    config: false // Don't show in settings menu
  });

  // init setting
  game.settings.register("daggerheart", "initFormula", {
    name: "SETTINGS.SimpleInitFormulaN",
    hint: "SETTINGS.SimpleInitFormulaL",
    scope: "world",
    type: String,
    default: "1d20",
    config: true,
    onChange: formula => _simpleUpdateInit(formula, true)
  });



  // init formula
  const initFormula = game.settings.get("daggerheart", "initFormula");
  _simpleUpdateInit(initFormula);

  /**
   * Update the initiative formula.
   * @param {string} formula - Dice formula to evaluate.
   * @param {boolean} notify - Whether or not to post nofications.
   */
  function _simpleUpdateInit(formula, notify = false) {
    const isValid = Roll.validate(formula);
    if ( !isValid ) {
      if ( notify ) ui.notifications.error(`${game.i18n.localize("SIMPLE.NotifyInitFormulaInvalid")}: ${formula}`);
      return;
    }
    CONFIG.Combat.initiative.formula = formula;
  }

  /**
   * Slugify a string.
   */
  Handlebars.registerHelper('slugify', function(value) {
    return value.slugify({strict: true});
  });

  // Preload template partials
  await preloadHandlebarsTemplates();
});

/**
 * Hook to refresh actor sheets when weapon data changes
 */
Hooks.on("updateActor", (actor, data, options, userId) => {
  // Check for weapon data changes that need sheet refresh
  if (data.system && (
    data.system["weapon-main"] || 
    data.system["weapon-off"]
  )) {
    console.log("Daggerheart | Weapon data updated, refreshing sheets for actor:", actor.name);
    
    // Force refresh all open sheets for this actor
    Object.values(actor.apps).forEach(app => {
      if (app.render) {
        try {
          app.render(true);
        } catch (error) {
          console.warn("Daggerheart | Failed to refresh sheet:", error);
        }
      }
    });
  }
});

/**
 * Hook to handle weapon equipped state changes and weapon data updates
 */
Hooks.on("updateItem", async (item, data, options, userId) => {
  // Only handle weapon items
  if (item.type !== "weapon") return;
  
  const actor = item.parent;
  if (!actor) return;
  
  // Check if this is an equipped weapon that might need dynamic resolution refresh
  const isEquipped = item.system.equipped;
  const hasDataChanges = data.system && (
    data.system.damage !== undefined ||
    data.system.trait !== undefined ||
    data.system.range !== undefined ||
    data.system.damageType !== undefined ||
    data.system.category !== undefined ||
    data.system.tier !== undefined
  );
  
  if (data.system?.equipped !== undefined) {
    console.log("Daggerheart | Weapon equipped state changed:", item.name, "equipped:", data.system.equipped);
  }
  
  if (hasDataChanges && isEquipped) {
    console.log("Daggerheart | Equipped weapon data changed:", item.name, "changes:", Object.keys(data.system || {}));
  }
  
  // If equipped state changed OR if an equipped weapon's data changed, sync and refresh
  if (data.system?.equipped !== undefined || (hasDataChanges && isEquipped)) {
    // Get the actor sheet if it's open
    const actorSheet = Object.values(actor.apps).find(app => app.constructor.name.includes('ActorSheet'));
    
    if (actorSheet) {
      // Sync equipped weapons and force refresh (debounced)
      try {
        await EquipmentHandler.syncEquippedWeapons(actor, actorSheet);
        actorSheet.render(true); // This will use debounced render
        console.log("Daggerheart | Actor sheet refreshed after weapon update");
      } catch (error) {
        console.warn("Daggerheart | Failed to sync weapons after item update:", error);
      }
    }
  }
});

/**
 * Macrobar hook.
 */
Hooks.on("hotbarDrop", (bar, data, slot) => {
  // For items, we want to create a macro instead of the default item behavior
  if (data.type === "Item") {
    createDaggerheartMacro(data, slot);
    return false; // Prevent default behavior
  }
  return createDaggerheartMacro(data, slot);
});

/**
 * Ready hook to initialize the counter UI and run migrations
 */
Hooks.once("ready", async function() {
  // Run system migrations first (only for GMs)
  if (game.user.isGM) {
    await DaggerheartMigrations.migrateWorld();
  }
  
  // Initialize the counter UI
  game.daggerheart.counter = new CounterUI();
  await game.daggerheart.counter.initialize();
  
  // Initialize the token counter UI
  game.daggerheart.tokenCounter = new TokenCounterUI();
  await game.daggerheart.tokenCounter.initialize();

  // Initialize the countdown tracker UI
  game.daggerheart.countdownTracker = new CountdownTracker();
  await game.daggerheart.countdownTracker.initialize();
  
  // Add global spendFear function
  window.spendFear = async function(amount) {
    if (!game.daggerheart?.counter) {
      console.error("Fear counter not initialized");
      ui.notifications.error("Fear counter not available");
      return false;
    }
    return await game.daggerheart.counter.spendFear(amount);
  };
  
  // Add global gainFear function
  window.gainFear = async function(amount) {
    if (!game.daggerheart?.counter) {
      console.error("Fear counter not initialized");
      ui.notifications.error("Fear counter not available");
      return false;
    }
    return await game.daggerheart.counter.gainFear(amount);
  };
  
  // Add global spendStress function
  window.spendStress = async function(actor, amount) {
    if (!game.daggerheart?.spendStress) {
      console.error("spendStress function not initialized");
      ui.notifications.error("spendStress function not available");
      return false;
    }
    return await game.daggerheart.spendStress(actor, amount);
  };

  // Add global spendHope function
  window.spendHope = async function(actor, amount) {
    if (!game.daggerheart?.spendHope) {
      console.error("spendHope function not initialized");
      ui.notifications.error("spendHope function not available");
      return false;
    }
    return await game.daggerheart.spendHope(actor, amount);
  };
  
  // Add test function for fear automation
  window.testFearAutomation = async function() {
    console.log("=== Daggerheart | Starting Global Automation Test ===");
    
    // Test standalone fear roll
    console.log("\n--- Test 1: Standalone Fear Roll ---");
    await game.daggerheart.rollHandler.rollFear({
      sendToChat: true,
      flavor: "<p class='roll-flavor-line'><b>Test Fear Roll</b> (should trigger +1 Fear globally)</p>"
    });
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test duality roll
    console.log("\n--- Test 2: Duality Roll ---");
    await game.daggerheart.rollHandler.rollDuality({
      sendToChat: true,
      flavor: "<p class='roll-flavor-line'><b>Test Duality Roll</b> (automation depends on result)</p>"
    });
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test duality roll from dialog (no actor context)
    console.log("\n--- Test 3: Duality Dialog (No Actor) ---");
    await game.daggerheart.rollHandler.dualityWithDialog({
      title: "Test Duality (No Actor)",
      skipDialog: true,
      rollDetails: { modifier: 0, advantage: 0, disadvantage: 0 }
    });
    
    console.log("\n=== Test completed! Check the console output above and look for automation messages ===");
    ui.notifications.info("Global automation test completed. Check console for detailed output.");
  };
  
  // Add global test function for weapon equipping
  window.testWeaponEquip = async function() {
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select a token first");
      return;
    }
    
    const actor = selectedTokens[0].actor;
    const weapons = actor.items.filter(i => i.type === "weapon");
    
    if (weapons.length === 0) {
      ui.notifications.warn("This actor has no weapons");
      return;
    }
    
    console.log("=== Weapon Equip Test (Dual System) ===");
    console.log("Actor:", actor.name);
    console.log("Weapons:", weapons.map(w => `${w.name} (equipped: ${w.system.equipped}, slot: ${w.system.weaponSlot})`));
    console.log("Current weapon-main damage:", actor.system["weapon-main"]?.damage);
    console.log("Current weapon-main to-hit:", actor.system["weapon-main"]?.["to-hit"]);
    console.log("Current weapon-off damage:", actor.system["weapon-off"]?.damage);
    console.log("Current weapon-off to-hit:", actor.system["weapon-off"]?.["to-hit"]);
    
    const weapon = weapons[0];
    console.log("Testing with weapon:", weapon.name);
    console.log("Weapon system data:", weapon.system);
    console.log("Weapon damage (raw):", weapon.system.damage);
    console.log("Weapon damage type:", typeof weapon.system.damage);
    console.log("Weapon damage structure:", JSON.stringify(weapon.system.damage, null, 2));
    console.log("Weapon trait:", weapon.system.trait);
    console.log("Current weapon slot:", weapon.system.weaponSlot);
    
    // Get the actor sheet
    const sheet = Object.values(actor.apps).find(app => app.constructor.name.includes('ActorSheet'));
    if (!sheet) {
      ui.notifications.warn("Please open the character sheet first");
      return;
    }
    
    // Test equipping as primary
    console.log("=== Testing Primary Weapon Equip ===");
    const successPrimary = await EquipmentHandler.equipPrimaryWeapon(actor, weapon);
    if (successPrimary) {
      console.log("Primary weapon equip successful");
      await EquipmentHandler.syncEquippedWeapons(actor, sheet);
      console.log("Primary weapon sync completed");
      sheet.render(true, { immediate: true });
      console.log("Sheet rendered");
      
      // Log the results
      console.log("New weapon-main damage:", actor.system["weapon-main"]?.damage);
      console.log("New weapon-main to-hit:", actor.system["weapon-main"]?.["to-hit"]);
      console.log("Updated weapon slot:", weapon.system.weaponSlot);
      console.log("Primary weapon test completed - check the sheet!");
    } else {
      console.log("Primary weapon equip failed");
    }
  };
  
  // Add test function for secondary weapon
  window.testSecondaryWeapon = async function() {
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select a token first");
      return;
    }
    
    const actor = selectedTokens[0].actor;
    const weapons = actor.items.filter(i => i.type === "weapon");
    
    if (weapons.length < 2) {
      ui.notifications.warn("This actor needs at least 2 weapons to test secondary");
      return;
    }
    
    const weapon = weapons[1]; // Use second weapon
    console.log("=== Testing Secondary Weapon Equip ===");
    console.log("Testing with weapon:", weapon.name);
    
    // Get the actor sheet
    const sheet = Object.values(actor.apps).find(app => app.constructor.name.includes('ActorSheet'));
    if (!sheet) {
      ui.notifications.warn("Please open the character sheet first");
      return;
    }
    
    // Test equipping as secondary
    const successSecondary = await EquipmentHandler.equipSecondaryWeapon(actor, weapon);
    if (successSecondary) {
      console.log("Secondary weapon equip successful");
      await EquipmentHandler.syncEquippedWeapons(actor, sheet);
      console.log("Secondary weapon sync completed");
      sheet.render(true, { immediate: true });
      console.log("Sheet rendered");
      
      // Log the results
      console.log("New weapon-off damage:", actor.system["weapon-off"]?.damage);
      console.log("New weapon-off to-hit:", actor.system["weapon-off"]?.["to-hit"]);
      console.log("Updated weapon slot:", weapon.system.weaponSlot);
      console.log("Secondary weapon test completed - check the sheet!");
    } else {
      console.log("Secondary weapon equip failed");
    }
  };
  
  // Add debug function to check current weapon data
  window.debugWeaponData = function() {
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select a token first");
      return;
    }
    
    const actor = selectedTokens[0].actor;
    console.log("=== Weapon Data Debug ===");
    console.log("Actor:", actor.name);
    console.log("weapon-main damage:", JSON.stringify(actor.system["weapon-main"]?.damage, null, 2));
    console.log("weapon-main to-hit:", JSON.stringify(actor.system["weapon-main"]?.["to-hit"], null, 2));
    console.log("weapon-off damage:", JSON.stringify(actor.system["weapon-off"]?.damage, null, 2));
    console.log("weapon-off to-hit:", JSON.stringify(actor.system["weapon-off"]?.["to-hit"], null, 2));
    console.log("Base value restrictions:", JSON.stringify(actor.flags?.daggerheart?.baseValueRestrictions, null, 2));
  };
  
  // Add function to test new weapon system
  window.testWeaponSystem = function() {
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select a token first");
      return;
    }
    
    const actor = selectedTokens[0].actor;
    console.log("=== New Weapon System Test ===");
    console.log("Actor:", actor.name);
    console.log("Primary weapon data:", EquipmentHandler.getDynamicWeaponData(actor, "primary"));
    console.log("Secondary weapon data:", EquipmentHandler.getDynamicWeaponData(actor, "secondary"));
    console.log("Weapon display data:", EquipmentHandler.getWeaponDisplayData(actor));
  };
  
  // Add comprehensive test function for the user's example scenario
  window.testWeaponScenario = function() {
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select a token first");
      return;
    }
    
    const actor = selectedTokens[0].actor;
    console.log("=== Weapon System Test Scenario ===");
    console.log("Actor:", actor.name);
    
    // Character stats example
    const strength = foundry.utils.getProperty(actor, 'system.strength.value') ?? 0;
    console.log(`Character strength modifier: ${strength}`);
    
    // Get primary weapon if equipped
    const primaryWeapon = EquipmentHandler.getPrimaryWeapon(actor);
    if (primaryWeapon) {
      console.log(`\nPrimary weapon: ${primaryWeapon.name}`);
      
      // Get weapon's complete damage (base + modifiers)
      const weaponTotalDamage = EquipmentHandler.getWeaponTotalDamage(primaryWeapon, actor);
      console.log(`Weapon total damage: ${weaponTotalDamage}`);
      
      // Get weapon trait value
      const weaponTraitValue = EquipmentHandler.getWeaponTraitValue(primaryWeapon, actor);
      console.log(`Weapon trait value: ${weaponTraitValue}`);
      
      // Get dynamic weapon data for character sheet
      const weaponData = EquipmentHandler.getDynamicWeaponData(actor, "primary");
      console.log("\nFinal character sheet data:");
      console.log(`- Attack modifier base: ${weaponData["to-hit"].baseValue}`);
      console.log(`- Attack modifier total: ${weaponData["to-hit"].value}`);
      console.log(`- Damage base: ${weaponData.damage.baseValue}`);
      console.log(`- Damage total: ${weaponData.damage.value}`);
      console.log(`- Character modifiers preserved:`, weaponData["to-hit"].modifiers);
      
      console.log("\n✅ This demonstrates the correct separation:");
      console.log("- Weapon damage (1d12 + 1d6 + 2) becomes character's base value");
      console.log("- Character modifiers (+2 blessing) stay as character modifiers");
      console.log("- Final result: (1d12 + 1d6 + 2) + 2");
      
    } else {
      console.log("No primary weapon equipped");
    }
    
    // Also test secondary weapon
    const secondaryWeapon = EquipmentHandler.getSecondaryWeapon(actor);
    if (secondaryWeapon) {
      console.log(`\nSecondary weapon: ${secondaryWeapon.name}`);
      const secondaryData = EquipmentHandler.getDynamicWeaponData(actor, "secondary");
      console.log("Secondary weapon data:", secondaryData);
    }
  };
  
  // Add function to debug weapon damage formulas
  window.debugWeaponDamage = function() {
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select a token first");
      return;
    }
    
    const actor = selectedTokens[0].actor;
    console.log("=== Weapon Damage Debug ===");
    console.log("Actor:", actor.name);
    
    // Check all weapons on the actor
    const weapons = actor.items.filter(i => i.type === "weapon");
    console.log("\n--- All Weapons ---");
    weapons.forEach(weapon => {
      console.log(`${weapon.name}:`);
      console.log("  Raw damage data:", weapon.system.damage);
      console.log("  Equipped:", weapon.system.equipped);
      console.log("  Slot:", weapon.system.weaponSlot);
      
      if (typeof weapon.system.damage === 'object') {
        console.log("  - baseValue:", weapon.system.damage.baseValue);
        console.log("  - value:", weapon.system.damage.value);
        console.log("  - modifiers:", weapon.system.damage.modifiers);
      }
    });
    
    // Check current weapon slots
    console.log("\n--- Character Weapon Slots ---");
    console.log("Primary weapon slot:", JSON.stringify(actor.system["weapon-main"], null, 2));
    console.log("Secondary weapon slot:", JSON.stringify(actor.system["weapon-off"], null, 2));
    
    // Test dynamic resolution
    console.log("\n--- Dynamic Resolution Test ---");
    const primaryWeapon = EquipmentHandler.getPrimaryWeapon(actor);
    const secondaryWeapon = EquipmentHandler.getSecondaryWeapon(actor);
    
    if (primaryWeapon) {
      console.log("Primary weapon resolved data:");
      const resolvedPrimary = EquipmentHandler.getResolvedWeaponData(actor, "primary");
      console.log(JSON.stringify(resolvedPrimary, null, 2));
    }
    
    if (secondaryWeapon) {
      console.log("Secondary weapon resolved data:");
      const resolvedSecondary = EquipmentHandler.getResolvedWeaponData(actor, "secondary");
      console.log(JSON.stringify(resolvedSecondary, null, 2));
    }
  };
  
  // Also add to the game.daggerheart object for consistency
  game.daggerheart.spendFear = window.spendFear;
  game.daggerheart.gainFear = window.gainFear;
  
  // Add global damage application functions
  window.applyDamage = async function(targetActor, damageAmount, sourceActor, createUndo = true, armorSlotsUsed = 0) {
    if (!game.daggerheart?.damageApplication?.applyDamage) {
      console.error("Damage application not initialized");
      ui.notifications.error("Damage application not available");
      return false;
    }
    return await game.daggerheart.damageApplication.applyDamage(targetActor, damageAmount, sourceActor, createUndo, armorSlotsUsed);
  };
  
  window.applyHealing = async function(targetActor, healAmount, sourceActor) {
    if (!game.daggerheart?.damageApplication?.applyHealing) {
      console.error("Healing application not initialized");
      ui.notifications.error("Healing application not available");
      return false;
    }
    return await game.daggerheart.damageApplication.applyHealing(targetActor, healAmount, sourceActor);
  };
  
  window.rollDamage = async function(formula, options) {
    if (!game.daggerheart?.damageApplication?.rollDamage) {
      console.error("Damage rolling not initialized");
      ui.notifications.error("Damage rolling not available");
      return null;
    }
    return await game.daggerheart.damageApplication.rollDamage(formula, options);
  };
  
  window.rollHealing = async function(formula, options) {
    if (!game.daggerheart?.damageApplication?.rollHealing) {
      console.error("Healing rolling not initialized");
      ui.notifications.error("Healing rolling not available");
      return null;
    }
    return await game.daggerheart.damageApplication.rollHealing(formula, options);
  };
  
  window.undoDamageHealing = async function(undoId) {
    if (!game.daggerheart?.damageApplication?.undoDamageHealing) {
      console.error("Undo functionality not initialized");
      ui.notifications.error("Undo functionality not available");
      return false;
    }
    return await game.daggerheart.damageApplication.undoDamageHealing(undoId);
  };
  
  window.debugUndoData = function(undoId) {
    if (!game.daggerheart?.damageApplication?.debugUndoData) {
      console.error("Debug functionality not initialized");
      return;
    }
    return game.daggerheart.damageApplication.debugUndoData(undoId);
  };
  
  // Also add to the game.daggerheart object for consistency
  game.daggerheart.applyDamage = window.applyDamage;
  game.daggerheart.applyHealing = window.applyHealing;
  game.daggerheart.rollDamage = window.rollDamage;
  game.daggerheart.rollHealing = window.rollHealing;
  game.daggerheart.undoDamageHealing = window.undoDamageHealing;
  game.daggerheart.debugUndoData = window.debugUndoData;
  
  // Add cleanup function for users
  window.cleanupDuplicateMacros = _cleanupDuplicateMacros;
  game.daggerheart.cleanupDuplicateMacros = window.cleanupDuplicateMacros;
  
  console.log("Counter UI initialized and displayed above the hotbar.");
  console.log("spendFear(), gainFear(), spendStress(), spendHope(), applyDamage(), applyHealing(), rollDamage(), rollHealing(), undoDamageHealing(), debugUndoData(), cleanupDuplicateMacros(), testWeaponEquip(), and testFearAutomation() functions are now available globally.");
  console.log("🎲 Global Hope/Fear automation is now active for ALL duality rolls!");
  
  // Add test function to game object
  game.daggerheart.testFearAutomation = window.testFearAutomation;
  
  // Clean up any existing duplicate macros from previous versions, but don't create new ones
  if (game.user.isGM) {
    await _cleanupDuplicateMacros();
  }

  // Socket listener for fear gain requests
  game.socket.on("system.daggerheart", async (data) => {
    // Only GM should process these requests
    if (!game.user.isGM) return;
    
    if (data.type === "requestFearGain") {
      console.log(`Daggerheart | Processing fear gain request from ${data.userName}: +${data.amount} from ${data.source}`);
      
      if (game.daggerheart?.counter) {
        try {
          // Use the regular gainFear method which includes proper notifications
          await game.daggerheart.counter.gainFear(data.amount);
          
          // Send confirmation back to the requesting user
          game.socket.emit("system.daggerheart", {
            type: "fearGainConfirmation",
            amount: data.amount,
            source: data.source,
            success: true,
            targetUserId: data.userId
          });
        } catch (error) {
          console.error("Daggerheart | Error processing fear gain request:", error);
          
          // Send error back to the requesting user
          game.socket.emit("system.daggerheart", {
            type: "fearGainConfirmation",
            amount: data.amount,
            source: data.source,
            success: false,
            error: error.message,
            targetUserId: data.userId
          });
        }
      }
    }
    
    // Handle confirmation messages (for non-GM users)
    if (data.type === "fearGainConfirmation" && data.targetUserId === game.user.id) {
      if (data.success) {
        console.log(`Daggerheart | Fear gain confirmed: +${data.amount} from ${data.source}`);
      } else {
        console.warn(`Daggerheart | Fear gain failed: ${data.error}`);
      }
    }
  });

  console.log("Daggerheart | System ready with dynamic weapon resolution");
});

/**
 * Clean up duplicate macros created by the system
 */
async function _cleanupDuplicateMacros() {
  // Define all macro names and their corresponding flags
  const macroConfigs = [
    { name: "Apply Damage", flag: "daggerheart.damageApplicationMacro" },
    { name: "Apply Healing", flag: "daggerheart.healingApplicationMacro" },
    { name: "Roll Damage", flag: "daggerheart.rollDamageMacro" },
    { name: "Roll Healing", flag: "daggerheart.rollHealingMacro" },
    { name: "Spend Fear", flag: "daggerheart.spendFearMacro" },
    { name: "Spend 1 Fear", flag: "daggerheart.spendFearMacro" },
    { name: "Gain Fear", flag: "daggerheart.gainFearMacro" },
    { name: "Apply Stress", flag: "daggerheart.spendStressMacro" }
  ];
  
  let totalCleaned = 0;
  
  for (const config of macroConfigs) {
    const duplicates = game.macros.filter(m => m.name === config.name);
    
    if (duplicates.length > 1) {
      console.log(`Found ${duplicates.length} duplicate macros named "${config.name}", cleaning up...`);
      
      // Keep the first one with the proper flag, or just the first one if none have flags
      let macroToKeep = duplicates.find(m => m.flags?.[config.flag.split('.')[0]]?.[config.flag.split('.')[1]]) || duplicates[0];
      
      // Delete the rest
      const macrosToDelete = duplicates.filter(m => m.id !== macroToKeep.id);
      for (const macro of macrosToDelete) {
        await macro.delete();
        console.log(`Deleted duplicate macro: ${config.name} (${macro.id})`);
        totalCleaned++;
      }
      
      // Ensure the kept macro has the proper flag
      if (!macroToKeep.flags?.[config.flag.split('.')[0]]?.[config.flag.split('.')[1]]) {
        const flagParts = config.flag.split('.');
        await macroToKeep.setFlag(flagParts[0], flagParts[1], true);
      }
    }
  }
  
  if (totalCleaned > 0) {
    ui.notifications.info(`Cleaned up ${totalCleaned} duplicate macros.`);
    console.log(`Daggerheart | Cleaned up ${totalCleaned} duplicate macros.`);
  } else {
    console.log("Daggerheart | No duplicate macros found to clean up.");
  }
}

/**
 * Hook to set default prototype token settings for actors
 */
Hooks.on("preCreateActor", function(document, data, options, userId) {
  // Set default prototype token settings
  const prototypeToken = {
    actorLink: true
  };
  
  // Merge with any existing prototype token data
  document.updateSource({
    "prototypeToken": foundry.utils.mergeObject(document.prototypeToken?.toObject() || {}, prototypeToken)
  });
});

/**
 * Hook to add Roll Duality Dice button to chat controls
 */
Hooks.on("renderChatLog", (app, html, data) => {
  // Try to find the chat controls in the entire document, not just the passed html
  const chatControls = $(document).find(".chat-controls");
  
  // Add to horizontal roll privacy section
  const horizontalRollPrivacy = chatControls.find("#roll-privacy.split-button:not(.vertical)");
  
  if (horizontalRollPrivacy.length) {
    // Check if button already exists
    if (!horizontalRollPrivacy.find('[data-action="roll-duality"]').length) {
      // Create the Roll Duality Dice button for horizontal layout
      const horizontalDualityButton = $(`
        <button type="button" class="ui-control icon fa-solid fa-dice" 
                data-action="roll-duality" 
                data-roll-mode="duality"
                aria-pressed="false" 
                data-tooltip="Roll Duality Dice" 
                aria-label="Roll Duality Dice">
        </button>
      `);
      
      // Add click handler
      horizontalDualityButton.on("click", async (event) => {
        event.preventDefault();
        
        // Use the rollHandler for the duality roll with dialog
        await game.daggerheart.rollHandler.dualityWithDialog({
          title: "Duality Dice Roll"
        });
      });
      
      // Append to the horizontal roll privacy section
      horizontalRollPrivacy.append(horizontalDualityButton);
    }
  }
  

  
  // Add to vertical roll privacy section
  const verticalRollPrivacy = $(document).find("#roll-privacy.split-button.vertical");
  
  if (verticalRollPrivacy.length) {
    // Check if button already exists
    if (!verticalRollPrivacy.find('[data-action="roll-duality"]').length) {
      // Create the Roll Duality Dice button for vertical layout
      const verticalDualityButton = $(`
        <button type="button" class="ui-control icon fa-solid fa-dice" 
                data-action="roll-duality" 
                data-roll-mode="duality"
                aria-pressed="false" 
                data-tooltip="Roll Duality Dice" 
                aria-label="Roll Duality Dice">
        </button>
      `);
      
      // Add click handler
      verticalDualityButton.on("click", async (event) => {
        event.preventDefault();
        
        // Use the rollHandler for the duality roll with dialog
        await game.daggerheart.rollHandler.dualityWithDialog({
          title: "Duality Dice Roll"
        });
      });
      
      // Append to the vertical roll privacy section
      verticalRollPrivacy.append(verticalDualityButton);
    }
  }
  
  // If we didn't find any controls, try again after a short delay
  if (!horizontalRollPrivacy.length && !verticalRollPrivacy.length) {
    setTimeout(() => {
      const delayedChatControls = $(document).find(".chat-controls");
      const delayedHorizontalRollPrivacy = delayedChatControls.find("#roll-privacy.split-button:not(.vertical)");
      const delayedVerticalRollPrivacy = $(document).find("#roll-privacy.split-button.vertical");
      
      // Add to horizontal roll privacy
      if (delayedHorizontalRollPrivacy.length && !delayedHorizontalRollPrivacy.find('[data-action="roll-duality"]').length) {
        const horizontalDualityButton = $(`
          <button type="button" class="ui-control icon fa-solid fa-dice" 
                  data-action="roll-duality" 
                  data-roll-mode="duality"
                  aria-pressed="false" 
                  data-tooltip="Roll Duality Dice" 
                  aria-label="Roll Duality Dice">
          </button>
        `);
        
        horizontalDualityButton.on("click", async (event) => {
          event.preventDefault();
          await game.daggerheart.rollHandler.dualityWithDialog({
            title: "Duality Dice Roll"
          });
        });
        
        delayedHorizontalRollPrivacy.append(horizontalDualityButton);
      }
      
      // Add to vertical roll privacy
      if (delayedVerticalRollPrivacy.length && !delayedVerticalRollPrivacy.find('[data-action="roll-duality"]').length) {
        const verticalDualityButton = $(`
          <button type="button" class="ui-control icon fa-solid fa-dice" 
                  data-action="roll-duality" 
                  data-roll-mode="duality"
                  aria-pressed="false" 
                  data-tooltip="Roll Duality Dice" 
                  aria-label="Roll Duality Dice">
          </button>
        `);
        
        verticalDualityButton.on("click", async (event) => {
          event.preventDefault();
          await game.daggerheart.rollHandler.dualityWithDialog({
            title: "Duality Dice Roll"
          });
        });
        
        delayedVerticalRollPrivacy.append(verticalDualityButton);
      }
    }, 100);
  }
});

/**
 * Hook to add damage/healing application buttons to chat messages
 */
Hooks.on("renderChatMessage", (message, html, data) => {
  // Get roll type and actor information from message flags
  const flags = message.flags?.daggerheart;
  if (!flags) return;
  
  const rollType = flags.rollType;
  const actorId = flags.actorId;
  const actorType = flags.actorType;
  const weaponName = flags.weaponName;
  
  // Add damage buttons to attack rolls (existing functionality)
  if (rollType === "attack") {
    // Check for existing button
    const existingButton = html.find(".damage-roll-button").length;
    if (existingButton > 0) return;
    
    // Get the actor
    const actor = game.actors.get(actorId);
    if (!actor) return;
    
    // Get weapon data
    let weaponData = null;
    let weaponType = null;
    
    const primaryWeapon = actor.system["weapon-main"];
    const secondaryWeapon = actor.system["weapon-off"];
    
    if (primaryWeapon?.name === weaponName) {
      weaponData = primaryWeapon;
      weaponType = "primary";
    } else if (secondaryWeapon?.name === weaponName) {
      weaponData = secondaryWeapon;
      weaponType = "secondary";
    }
    
    if (!weaponData || !weaponData.damage) return;
    
    // Check if this was a critical success
    const flavor = message.flavor || '';
    const isCritical = flavor.includes("Critical") && flavor.includes("Success");
    
    // Add damage button based on actor type
    if (actorType === "character") {
      _addCharacterDamageButton(html, actor, weaponData, weaponType, isCritical);
    } else if (actorType === "npc" || actorType === "companion") {
      _addAdversaryDamageButton(html, actor, weaponData, weaponType, isCritical);
    }
  }
  
  // Add damage/healing application buttons to damage rolls
  if (rollType === "damage") {
    _addDamageApplicationButtons(message, html, flags);
  }
  
  // Add damage/healing application buttons to healing rolls
  if (rollType === "healing") {
    _addHealingApplicationButtons(message, html, flags);
  }
  
  // Add undo button handlers for damage/healing applied messages
  if (flags.messageType === "damageApplied" || flags.messageType === "healingApplied") {
    _addUndoButtonHandlers(html, flags);
  }
});

/**
 * Add damage button for character attack rolls
 */
function _addCharacterDamageButton(html, actor, weaponData, weaponType, isCritical) {
  const buttonText = isCritical ? "Critical Damage" : "Damage";
  
  // Store structured damage data for proper handling
  let damageDataJson;
  if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'baseValue' in weaponData.damage) {
    // New damage modifier system - store the complete structured data
    damageDataJson = JSON.stringify(weaponData.damage);
  } else {
    // Legacy simple string format - convert to structure
    const simpleFormula = weaponData.damage || '1d8';
    damageDataJson = JSON.stringify({
      baseValue: simpleFormula,
      modifiers: [],
      value: simpleFormula
    });
  }
  
  const damageButton = `<button class="damage-roll-button character ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage-structure="${damageDataJson}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
    <i class="fas fa-dice-d20"></i> ${buttonText}
  </button>`;
  
  html.find(".message-content").append(damageButton);
  
  // Add click handler for character damage
  html.find(".damage-roll-button.character").click(async (event) => {
    event.preventDefault();
    await _rollCharacterDamage(event);
  });
}

/**
 * Add damage button for adversary attack rolls
 */
function _addAdversaryDamageButton(html, actor, weaponData, weaponType, isCritical) {
  const buttonText = isCritical ? "Critical Damage" : "Damage";
  
  // Store structured damage data for proper handling
  let damageDataJson;
  if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'baseValue' in weaponData.damage) {
    // New damage modifier system - store the complete structured data
    damageDataJson = JSON.stringify(weaponData.damage);
  } else {
    // Legacy simple string format - convert to structure
    const simpleFormula = weaponData.damage || '1d8';
    damageDataJson = JSON.stringify({
      baseValue: simpleFormula,
      modifiers: [],
      value: simpleFormula
    });
  }
  
  const damageButton = `<button class="damage-roll-button adversary ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage-structure="${damageDataJson}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
    <i class="fas fa-dice-d20"></i> ${buttonText}
  </button>`;
  
  html.find(".message-content").append(damageButton);
  
  // Add click handler for adversary damage
  html.find(".damage-roll-button.adversary").click(async (event) => {
    event.preventDefault();
    await _rollAdversaryDamage(event);
  });
}

/**
 * Handle damage button creation for player characters
 */
function _handleCharacterDamageButton(message, html, actor, flavor) {
  let weaponData = null;
  let weaponType = null;
  
  // Check if the flavor contains a weapon name that matches actor's weapons
  const primaryWeapon = actor.system["weapon-main"];
  const secondaryWeapon = actor.system["weapon-off"];
  
  if (primaryWeapon?.name && flavor.includes(primaryWeapon.name)) {
    weaponData = primaryWeapon;
    weaponType = "primary";
  } else if (secondaryWeapon?.name && flavor.includes(secondaryWeapon.name)) {
    weaponData = secondaryWeapon;
    weaponType = "secondary";
  }
  
  // Check for existing button
  const existingButton = html.find(".damage-roll-button").length;
  
  // If we found a matching weapon and it has damage defined
  if (weaponData && weaponData.damage && !existingButton) {
    // Check if this appears to be a damage roll (exclude damage rolls)
    const isDamageRoll = flavor.includes("Damage") || 
                        flavor.includes("damage") || 
                        flavor.toLowerCase().includes("- damage") ||
                        flavor.includes("Critical Damage") ||
                        flavor.includes("critical damage");
    
    // Check if this appears to be an attack roll (has Hope/Fear dice) but NOT a damage roll
    const hasHopeFear = flavor.includes("Hope") || flavor.includes("Fear");
    
    if (hasHopeFear && !isDamageRoll) {
      // Check if this was a critical success
      const isCritical = flavor.includes("Critical") && flavor.includes("Success");
      
      // Store structured damage data for proper handling
      let damageDataJson;
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'baseValue' in weaponData.damage) {
        // New damage modifier system - store the complete structured data
        damageDataJson = JSON.stringify(weaponData.damage);
      } else {
        // Legacy simple string format - convert to structure
        const simpleFormula = weaponData.damage || '1d8';
        damageDataJson = JSON.stringify({
          baseValue: simpleFormula,
          modifiers: [],
          value: simpleFormula
        });
      }
      
      // Add damage button to the message
      const buttonText = isCritical ? "Critical Damage" : "Damage";
      const damageButton = `<button class="damage-roll-button character ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage-structure="${damageDataJson}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
        <i class="fas fa-dice-d20"></i> ${buttonText}
      </button>`;
      
      // Find message content and append button
      const messageContent = html.find(".message-content");
      messageContent.append(damageButton);
      
      // Add click handler for character damage
      html.find(".damage-roll-button.character").click(async (event) => {
        event.preventDefault();
        await _rollCharacterDamage(event);
      });
    }
  }
}

/**
 * Handle damage button creation for adversaries (NPCs)
 */
function _handleAdversaryDamageButton(message, html, actor, flavor) {
  let weaponData = null;
  let weaponType = null;
  
  // Check if the flavor contains a weapon name that matches actor's attacks
  const primaryAttack = actor.system["weapon-main"];
  const secondaryAttack = actor.system["weapon-off"];
  
  if (primaryAttack?.name && flavor.includes(primaryAttack.name)) {
    weaponData = primaryAttack;
    weaponType = "primary";
  } else if (secondaryAttack?.name && flavor.includes(secondaryAttack.name)) {
    weaponData = secondaryAttack;
    weaponType = "secondary";
  }
  
  // Check for existing button
  const existingButton = html.find(".damage-roll-button").length;
  
  // If we found a matching attack and it has damage defined
  if (weaponData && weaponData.damage && !existingButton) {
    // Check if this appears to be a damage roll (exclude damage rolls)
    const isDamageRoll = flavor.includes("Damage") || 
                        flavor.includes("damage") || 
                        flavor.toLowerCase().includes("- damage") ||
                        flavor.includes("Critical Damage") ||
                        flavor.includes("critical damage");
    
    // Check if this appears to be an attack roll (NOT a damage roll)
    const isAttackRoll = flavor.includes(weaponData.name) && !isDamageRoll;
    
    if (isAttackRoll) {
      // Check if this was a critical success (NPCs crit on natural 20)
      const isCritical = flavor.includes("Critical Success");
      
      // Store structured damage data for proper handling
      let damageDataJson;
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'baseValue' in weaponData.damage) {
        // New damage modifier system - store the complete structured data
        damageDataJson = JSON.stringify(weaponData.damage);
      } else {
        // Legacy simple string format - convert to structure
        const simpleFormula = weaponData.damage || '1d8';
        damageDataJson = JSON.stringify({
          baseValue: simpleFormula,
          modifiers: [],
          value: simpleFormula
        });
      }
      
      // Add damage button to the message
      const buttonText = isCritical ? "Critical Damage" : "Damage";
      const damageButton = `<button class="damage-roll-button adversary ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage-structure="${damageDataJson}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
        <i class="fas fa-dice-d20"></i> ${buttonText}
      </button>`;
      
      // Find message content and append button
      const messageContent = html.find(".message-content");
      messageContent.append(damageButton);
      
      // Add click handler for adversary damage
      html.find(".damage-roll-button.adversary").click(async (event) => {
        event.preventDefault();
        await _rollAdversaryDamage(event);
      });
    }
  }
}

/**
 * Roll damage for player characters (uses proficiency)
 */
async function _rollCharacterDamage(event) {
  const button = event.currentTarget;
  const actorId = button.dataset.actorId;
  const weaponType = button.dataset.weaponType;
  const weaponName = button.dataset.weaponName;
  const damageStructureJson = button.dataset.weaponDamageStructure;
  const isCritical = button.dataset.isCritical === "true";
  
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.error("Daggerheart | Actor not found for character damage roll");
    return;
  }
  
  // Parse structured damage data
  let damageData;
  try {
    damageData = JSON.parse(damageStructureJson);
  } catch (error) {
    console.warn("Daggerheart | Invalid damage structure in button, fetching from actor");
    // Fallback: get fresh data from actor
    const weaponField = weaponType === "primary" ? "weapon-main" : "weapon-off";
    const weaponData = actor.system[weaponField];
    
    if (weaponData && weaponData.damage) {
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'baseValue' in weaponData.damage) {
        damageData = weaponData.damage;
      } else {
        // Convert legacy format
        damageData = {
          baseValue: weaponData.damage || '1d8',
          modifiers: [],
          value: weaponData.damage || '1d8'
        };
      }
    } else {
      // Ultimate fallback
      damageData = {
        baseValue: '1d8',
        modifiers: [],
        value: '1d8'
      };
    }
  }
  
  // Get proficiency value
  const proficiency = Math.max(1, parseInt(actor.system.proficiency?.value) || 1);
  
  // Build roll formula from structured data
  let rollValue = _buildCharacterDamageFormula(damageData, proficiency, isCritical);
  let flavorText = isCritical ? `${weaponName} - Critical Damage!` : `${weaponName} - Damage`;
  
  // Create and send the damage roll
  const roll = new Roll(rollValue);
  await roll.evaluate();
  
      try {
      // Let Foundry handle the roll rendering automatically, then add damage/healing buttons
      const chatMessage = await ChatMessage.create({
        flavor: flavorText,
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        rollMode: "roll",
        flags: {
          daggerheart: {
            rollType: "damage",
            actorId: actor.id,
            actorType: "character",
            weaponName: weaponName,
            weaponType: weaponType,
            isCritical: isCritical,
            damageAmount: roll.total,
            isManualRoll: true
          }
        }
      });
      
      // Wait for Dice So Nice! animation to complete
      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating character damage chat message:", error);
      ui.notifications.warn("Chat message failed to send, but damage was rolled.");
    }
}

/**
 * Build character damage formula from structured data with proficiency and critical handling
 * @param {Object} damageData - The damage data object
 * @param {number} proficiency - Character's proficiency value
 * @param {boolean} isCritical - Whether this is a critical hit
 * @returns {string} - The complete damage formula
 */
function _buildCharacterDamageFormula(damageData, proficiency, isCritical) {
  let baseFormula = damageData.baseValue || '1d8';
  
  // Apply proficiency logic to base formula
  const diceMatch = baseFormula.match(/^(\d*)d(\d+)(.*)$/i);
  if (diceMatch) {
    const diceCount = parseInt(diceMatch[1]) || proficiency; // Use proficiency if no count specified
    const dieType = parseInt(diceMatch[2]);
    const remainder = diceMatch[3] || "";
    baseFormula = `${diceCount}d${dieType}${remainder}`;
  }
  
  // Add enabled modifiers
  const modifiers = damageData.modifiers || [];
  const enabledModifiers = modifiers.filter(mod => mod.enabled !== false && mod.value);
  
  let formula = baseFormula;
  enabledModifiers.forEach(modifier => {
    let modValue = modifier.value.trim();
    // Ensure proper formatting
    if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
      modValue = '+' + modValue;
    }
    formula += ' ' + modValue;
  });
  
  // Handle critical damage
  if (isCritical && diceMatch) {
    const diceCount = parseInt(diceMatch[1]) || proficiency;
    const dieType = parseInt(diceMatch[2]);
    const maxDamage = diceCount * dieType;
    
    // Critical: max value + normal roll + modifiers
    let criticalFormula = `${maxDamage} + ${formula}`;
    return criticalFormula;
  }
  
  return formula;
}

/**
 * Build adversary damage formula from structured data
 * @param {Object} damageData - The damage data object
 * @param {boolean} isCritical - Whether this is a critical hit
 * @returns {string} - The complete damage formula
 */
function _buildAdversaryDamageFormula(damageData, isCritical) {
  let baseFormula = damageData.baseValue || '1d8';
  
  // Add enabled modifiers
  const modifiers = damageData.modifiers || [];
  const enabledModifiers = modifiers.filter(mod => mod.enabled !== false && mod.value);
  
  let formula = baseFormula;
  enabledModifiers.forEach(modifier => {
    let modValue = modifier.value.trim();
    // Ensure proper formatting
    if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
      modValue = '+' + modValue;
    }
    formula += ' ' + modValue;
  });
  
  // Handle critical damage for adversaries
  if (isCritical) {
    return _calculateAdversaryCriticalDamage(formula);
  }
  
  return formula;
}

/**
 * Roll damage for adversaries (uses raw damage formula, no proficiency)
 */
async function _rollAdversaryDamage(event) {
  const button = event.currentTarget;
  const actorId = button.dataset.actorId;
  const weaponType = button.dataset.weaponType;
  const weaponName = button.dataset.weaponName;
  const damageStructureJson = button.dataset.weaponDamageStructure;
  const isCritical = button.dataset.isCritical === "true";
  
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.error("Daggerheart | Actor not found for adversary damage roll");
    return;
  }
  
  // Parse structured damage data
  let damageData;
  try {
    damageData = JSON.parse(damageStructureJson);
  } catch (error) {
    console.warn("Daggerheart | Invalid damage structure in button, fetching from actor");
    // Fallback: get fresh data from actor
    const weaponField = weaponType === "primary" ? "weapon-main" : "weapon-off";
    const weaponData = actor.system[weaponField];
    
    if (weaponData && weaponData.damage) {
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'baseValue' in weaponData.damage) {
        damageData = weaponData.damage;
      } else {
        // Convert legacy format
        damageData = {
          baseValue: weaponData.damage || '1d8',
          modifiers: [],
          value: weaponData.damage || '1d8'
        };
      }
    } else {
      // Ultimate fallback
      damageData = {
        baseValue: '1d8',
        modifiers: [],
        value: '1d8'
      };
    }
  }
  
  // Build roll formula from structured data
  let rollValue = _buildAdversaryDamageFormula(damageData, isCritical);
  let flavorText = isCritical ? `${weaponName} - Critical Damage!` : `${weaponName} - Damage`;
  
  // Create and send the damage roll
  const roll = new Roll(rollValue);
  await roll.evaluate();
  
      try {
      // Let Foundry handle the roll rendering automatically, then add damage/healing buttons
      const chatMessage = await ChatMessage.create({
        flavor: flavorText,
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        rollMode: "roll",
        flags: {
          daggerheart: {
            rollType: "damage",
            actorId: actor.id,
            actorType: actor.type,
            weaponName: weaponName,
            weaponType: weaponType,
            isCritical: isCritical,
            damageAmount: roll.total,
            isManualRoll: true
          }
        }
      });
      
      // Wait for Dice So Nice! animation to complete
      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating adversary damage chat message:", error);
      ui.notifications.warn("Chat message failed to send, but damage was rolled.");
    }
}

/**
 * Calculate critical damage for adversaries
 * Example: "3d12+10" becomes "36 + 3d12+10" (36 is max of 3d12)
 */
function _calculateAdversaryCriticalDamage(damageFormula) {
  // Find all dice terms in the formula
  const dicePattern = /(\d*)d(\d+)/gi;
  let criticalFormula = damageFormula;
  let maxDamageTotal = 0;
  
  // Replace each dice term with its maximum value
  criticalFormula = criticalFormula.replace(dicePattern, (match, count, sides) => {
    const diceCount = parseInt(count) || 1;
    const dieSides = parseInt(sides);
    const maxValue = diceCount * dieSides;
    maxDamageTotal += maxValue;
    return match; // Keep original for the normal roll part
  });
  
  // If we found dice in the formula, create critical damage
  if (maxDamageTotal > 0) {
    return `${maxDamageTotal} + ${damageFormula}`;
  } else {
    // No dice found, just return the original formula
    return damageFormula;
  }
}

/**
 * Update armor slots value in the chat UI
 * @param {jQuery} html - The chat message HTML element
 * @param {number} delta - The change amount (+1 or -1)
 */
function _updateArmorSlotsValue(html, delta) {
  const armorSlotsContainer = html.find(".armor-slots-ui");
  const currentElement = html.find(".armor-slots-current");
  const maxElement = html.find(".armor-slots-max");
  
  if (!armorSlotsContainer.length || !currentElement.length || !maxElement.length) {
    console.warn("Armor slots elements not found");
    return;
  }
  
  // Get current values
  let current = parseInt(currentElement.text()) || 0;
  const max = parseInt(maxElement.text()) || 3;
  
  // Calculate new value with bounds checking
  const newValue = Math.max(0, Math.min(max, current + delta));
  
  // Only update if value actually changed
  if (newValue !== current) {
    // Update display
    currentElement.text(newValue);
    
    // Store value on container for reference
    armorSlotsContainer.data("current", newValue);
    armorSlotsContainer.data("max", max);
    
    console.log(`Armor slots: ${current} → ${newValue}`);
  }
}

/**
 * Generate armor slots UI HTML based on target characters
 * @param {number} currentSlots - Current armor slots used (default: 0)
 * @param {number} maxSlots - Maximum armor slots available (default: 3)
 * @param {boolean} showUI - Whether to show the UI (default: true)
 * @returns {string} HTML string for armor slots UI
 */
function _getArmorSlotsUI(currentSlots = 0, maxSlots = 3, showUI = true) {
  if (!showUI) return "";
  
  return `<div class="armor-slots-ui resource armor-slots" style="margin: 0.75em 0 0.5em 0;">
    <div class="resource-content">
      <div class="resource-box">
        <span class="armor-slots-current">${currentSlots}</span>
        <span>/</span>
        <span class="armor-slots-max">${maxSlots}</span>
      </div>
    </div>
    <div class="resource-label-controls">
      <a class="resource-control armor-slots-decrement" data-action="decrement" title="Decrease Armor Slots Used">
        <i class="fas fa-minus"></i>
      </a>
      <label>Use Armor Slots</label>
      <a class="resource-control armor-slots-increment" data-action="increment" title="Increase Armor Slots Used">
        <i class="fas fa-plus"></i>
      </a>
    </div>
  </div>`;
}

/**
 * Get maximum armor slots from current targets
 * @returns {Object} Object with showUI flag and maxSlots value
 */
function _getTargetArmorInfo() {
  // Check targeted tokens first (priority)
  const targets = Array.from(game.user.targets);
  
  if (targets.length > 0) {
    // Find first character target to get max armor slots
    const characterTarget = targets.find(t => t.actor?.type === 'character');
    if (characterTarget) {
      const maxSlots = parseInt(characterTarget.actor.system.defenses?.["armor-slots"]?.max) || 3;
      return { showUI: true, maxSlots: maxSlots };
    }
  }
  
  // Check selected tokens
  const controlled = canvas.tokens?.controlled || [];
  
  if (controlled.length > 0) {
    // Find first character to get max armor slots
    const characterToken = controlled.find(t => t.actor?.type === 'character');
    if (characterToken) {
      const maxSlots = parseInt(characterToken.actor.system.defenses?.["armor-slots"]?.max) || 3;
      return { showUI: true, maxSlots: maxSlots };
    }
  }
  
  return { showUI: false, maxSlots: 0 };
}

/**
 * Initialize armor slots UI handlers
 * @param {jQuery} html - The chat message HTML element
 * @param {number} initialValue - Initial armor slots value
 * @param {number} maxValue - Maximum armor slots value
 */
function _initializeArmorSlotsHandlers(html, initialValue = 0, maxValue = 3) {
  const armorSlotsContainer = html.find(".armor-slots-ui");
  if (!armorSlotsContainer.length) return;
  
  // Store initial state
  armorSlotsContainer.data("current", initialValue);
  armorSlotsContainer.data("max", maxValue);
  
  // Add click handlers for armor slots
  html.find(".armor-slots-increment").click(async (event) => {
    event.preventDefault();
    _updateArmorSlotsValue(html, 1);
  });
  
  html.find(".armor-slots-decrement").click(async (event) => {
    event.preventDefault();
    _updateArmorSlotsValue(html, -1);
  });
}

/**
 * Add damage and healing application buttons to damage rolls
 */
function _addDamageApplicationButtons(message, html, flags) {
  // Check for existing buttons
  const existingButtons = html.find(".apply-damage-button, .apply-healing-button").length;
  if (existingButtons > 0) return;
  
  const damageAmount = flags.damageAmount || extractRollTotal(message);
  if (!damageAmount) return;
  
  const sourceActor = game.actors.get(flags.actorId);
  
  // Use multi-target armor system
  const armorSlotsUI = _getMultiTargetArmorSlotsUI();
  
  // Create damage and healing buttons
  const buttonContainer = `${armorSlotsUI}<div class="damage-application-buttons" style="margin-top: 0.5em; display: flex; gap: 0.25em;">
    <button class="apply-damage-button" data-damage="${damageAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-sword"></i> Damage (${damageAmount})
    </button>
    <button class="apply-healing-button" data-healing="${damageAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-heart"></i> Heal (${damageAmount})
    </button>
  </div>`;
  
  html.find(".message-content").append(buttonContainer);
  
  // Initialize multi-target armor slots handlers if UI is present
  if (armorSlotsUI) {
    _initializeMultiTargetArmorSlotsHandlers(html);
  }
  
  // Add click handlers
  html.find(".apply-damage-button").click(async (event) => {
    event.preventDefault();
    await _handleDamageApplicationButton(event, "damage");
  });
  
  html.find(".apply-healing-button").click(async (event) => {
    event.preventDefault();
    await _handleDamageApplicationButton(event, "healing");
  });
}

/**
 * Add damage and healing application buttons to healing rolls
 */
function _addHealingApplicationButtons(message, html, flags) {
  // Check for existing buttons
  const existingButtons = html.find(".apply-damage-button, .apply-healing-button").length;
  if (existingButtons > 0) return;
  
  const healingAmount = flags.healingAmount || extractRollTotal(message);
  if (!healingAmount) return;
  
  const sourceActor = game.actors.get(flags.actorId);
  
  // Use multi-target armor system
  const armorSlotsUI = _getMultiTargetArmorSlotsUI();
  
  // Create healing and damage buttons (healing first for healing rolls)
  const buttonContainer = `${armorSlotsUI}<div class="damage-application-buttons" style="margin-top: 0.5em; display: flex; gap: 0.25em;">
    <button class="apply-healing-button" data-healing="${healingAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-heart"></i> Heal (${healingAmount})
    </button>
    <button class="apply-damage-button" data-damage="${healingAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-sword"></i> Damage (${healingAmount})
    </button>
  </div>`;
  
  html.find(".message-content").append(buttonContainer);
  
  // Initialize multi-target armor slots handlers if UI is present
  if (armorSlotsUI) {
    _initializeMultiTargetArmorSlotsHandlers(html);
  }
  
  // Add click handlers
  html.find(".apply-healing-button").click(async (event) => {
    event.preventDefault();
    await _handleDamageApplicationButton(event, "healing");
  });
  
  html.find(".apply-damage-button").click(async (event) => {
    event.preventDefault();
    await _handleDamageApplicationButton(event, "damage");
  });
}

/**
 * Handle clicks on damage/healing application buttons
 */
async function _handleDamageApplicationButton(event, type) {
  const button = event.currentTarget;
  const amount = parseInt(button.dataset[type]) || 0;
  const sourceActorId = button.dataset.sourceActorId;
  
  if (amount <= 0) {
    ui.notifications.error("Invalid amount for application.");
    return;
  }
  
  const sourceActor = sourceActorId ? game.actors.get(sourceActorId) : null;
  
  // Get armor slots values from multi-target UI if damage is being applied
  let armorSlotsUsed = 0;
  if (type === "damage") {
    const messageElement = $(button).closest(".chat-message");
    const armorSlotsData = _collectMultiTargetArmorSlots(messageElement);
    
    // Check if we have individual armor slots data for multiple targets
    if (Object.keys(armorSlotsData).length > 0) {
      armorSlotsUsed = armorSlotsData;
      console.log(`Daggerheart | Using per-target armor slots:`, armorSlotsData);
    } else {
      // Fallback to old single armor slots system for backward compatibility
      const armorSlotsContainer = messageElement.find(".armor-slots-ui");
      if (armorSlotsContainer.length) {
        armorSlotsUsed = parseInt(armorSlotsContainer.data("current")) || 0;
        console.log(`Daggerheart | Using single armor slots value: ${armorSlotsUsed} for all targets`);
      }
    }
  }
  
  try {
    let result = { success: false, undoId: null };
    if (type === "damage") {
      result = await applyDamage(null, amount, sourceActor, true, armorSlotsUsed);
    } else if (type === "healing") {
      result = await applyHealing(null, amount, sourceActor);
    }
    
    // Note: No longer disabling buttons after use to allow multiple applications
    if (!result.success) {
      console.warn(`Failed to apply ${type}`);
    }
  } catch (error) {
    console.error(`Error applying ${type}:`, error);
    ui.notifications.error(`Error applying ${type}. Check console for details.`);
  }
}

/**
 * Hook to store weapon data in attack roll messages for later use
 */
Hooks.on("preCreateChatMessage", (message, data, options, userId) => {
  // This hook is no longer needed since we're storing roll type data in the message flags
  // in the roll methods themselves. Keeping it for potential future use.
});

/**
 * Adds the actor template context menu.
 */
Hooks.on("getActorDirectoryEntryContext", (html, options) => {

  // set template
  options.push({
    name: game.i18n.localize("SIMPLE.DefineTemplate"),
    icon: '<i class="fas fa-stamp"></i>',
    condition: li => {
      const actor = game.actors.get(li.data("documentId"));
      return !actor.isTemplate;
    },
    callback: li => {
      const actor = game.actors.get(li.data("documentId"));
      actor.setFlag("daggerheart", "isTemplate", true);
    }
  });

  // unset template
  options.push({
    name: game.i18n.localize("SIMPLE.UnsetTemplate"),
    icon: '<i class="fas fa-times"></i>',
    condition: li => {
      const actor = game.actors.get(li.data("documentId"));
      return actor.isTemplate;
    },
    callback: li => {
      const actor = game.actors.get(li.data("documentId"));
      actor.setFlag("daggerheart", "isTemplate", false);
    }
  });
});

/**
 * Adds the item template context menu.
 */
Hooks.on("getItemDirectoryEntryContext", (html, options) => {

  // set template
  options.push({
    name: game.i18n.localize("SIMPLE.DefineTemplate"),
    icon: '<i class="fas fa-stamp"></i>',
    condition: li => {
      const item = game.items.get(li.data("documentId"));
      return !item.isTemplate;
    },
    callback: li => {
      const item = game.items.get(li.data("documentId"));
      item.setFlag("daggerheart", "isTemplate", true);
    }
  });

  // unset template
  options.push({
    name: game.i18n.localize("SIMPLE.UnsetTemplate"),
    icon: '<i class="fas fa-times"></i>',
    condition: li => {
      const item = game.items.get(li.data("documentId"));
      return item.isTemplate;
    },
    callback: li => {
      const item = game.items.get(li.data("documentId"));
      item.setFlag("daggerheart", "isTemplate", false);
    }
  });
});

/**
 * Add undo button click handlers to damage/healing applied messages
 */
function _addUndoButtonHandlers(html, flags) {
  html.find(".undo-damage-button, .undo-healing-button").click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;
    const undoId = button.dataset.undoId;
    
    if (!undoId) {
      ui.notifications.error("Undo ID not found.");
      return;
    }
    
    try {
      // Disable button during processing
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Undoing...';
      
      const success = await undoDamageHealing(undoId);
      
      if (success) {
        // Replace button with confirmation
        button.innerHTML = '<i class="fas fa-check"></i> Undone';
        button.style.opacity = "0.6";
      } else {
        // Re-enable button on failure
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-undo"></i> Undo';
      }
    } catch (error) {
      console.error("Error during undo:", error);
      ui.notifications.error("Error during undo. Check console for details.");
      
      // Re-enable button on error
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-undo"></i> Undo';
    }
  });
}

/**
 * Get armor information for all character targets (multi-target support)
 * @returns {Array} Array of objects with target info and armor data
 */
function _getMultiTargetArmorInfo() {
  const characterTargets = [];
  
  // Check targeted tokens first (priority)
  const targets = Array.from(game.user.targets);
  
  if (targets.length > 0) {
    // Get all character targets
    targets.forEach(token => {
      if (token.actor?.type === 'character') {
        // New data structure: armor.value = max slots, armor-slots.value = current used slots
        const maxSlots = parseInt(token.actor.system.defenses?.armor?.value) || 3;
        const currentSlots = parseInt(token.actor.system.defenses?.["armor-slots"]?.value) || 0;
        const availableSlots = maxSlots - currentSlots; // How many slots they have available
        const usableSlots = Math.min(availableSlots, 3); // Cap at 3 due to damage threshold system
        
        characterTargets.push({
          actor: token.actor,
          name: token.actor.name,
          id: token.actor.id,
          maxSlots: maxSlots,
          currentSlots: currentSlots,
          availableSlots: availableSlots,
          usableSlots: usableSlots
        });
      }
    });
  } else {
    // Check selected tokens
    const controlled = canvas.tokens?.controlled || [];
    
    controlled.forEach(token => {
      if (token.actor?.type === 'character') {
        // New data structure: armor.value = max slots, armor-slots.value = current used slots
        const maxSlots = parseInt(token.actor.system.defenses?.armor?.value) || 3;
        const currentSlots = parseInt(token.actor.system.defenses?.["armor-slots"]?.value) || 0;
        const availableSlots = maxSlots - currentSlots; // How many slots they have available
        const usableSlots = Math.min(availableSlots, 3); // Cap at 3 due to damage threshold system
        
        characterTargets.push({
          actor: token.actor,
          name: token.actor.name,
          id: token.actor.id,
          maxSlots: maxSlots,
          currentSlots: currentSlots,
          availableSlots: availableSlots,
          usableSlots: usableSlots
        });
      }
    });
  }
  
  return characterTargets;
}

/**
 * Generate multi-target armor slots UI HTML for multiple characters
 * @returns {string} HTML string for multi-target armor slots UI
 */
function _getMultiTargetArmorSlotsUI() {
  const characterTargets = _getMultiTargetArmorInfo();
  
  if (characterTargets.length === 0) {
    return "";
  }
  
  let armorUIHtml = '<div class="multi-target-armor-container" style="margin: 0.75em 0 0.5em 0;">';
  
  if (characterTargets.length === 1) {
    // Single character - use simplified UI
    const target = characterTargets[0];
    armorUIHtml += `
      <div class="armor-slots-ui resource armor-slots" data-actor-id="${target.id}">
        <div class="resource-content">
          <div class="resource-box">
            <span class="armor-slots-current">0</span>
            <span>/</span>
            <span class="armor-slots-max">${target.usableSlots}</span>
          </div>
        </div>
        <div class="resource-label-controls">
          <a class="resource-control armor-slots-decrement" data-action="decrement" title="Decrease Armor Slots Used">
            <i class="fas fa-minus"></i>
          </a>
          <label>
            <strong>${target.name}</strong> - Use Armor Slots
            <span class="armor-availability">(${target.availableSlots} available)</span>
          </label>
          <a class="resource-control armor-slots-increment" data-action="increment" title="Increase Armor Slots Used">
            <i class="fas fa-plus"></i>
          </a>
        </div>
      </div>`;
  } else {
    // Multiple characters - show each with their name
    armorUIHtml += '<div class="multi-target-armor-header"><label>Armor Slots Per Character:</label></div>';
    
    characterTargets.forEach(target => {
      armorUIHtml += `
        <div class="armor-slots-ui resource armor-slots" data-actor-id="${target.id}" style="margin: 0.25em 0;">
          <div class="resource-content">
            <div class="resource-box">
              <span class="armor-slots-current">0</span>
              <span>/</span>
              <span class="armor-slots-max">${target.usableSlots}</span>
            </div>
          </div>
          <div class="resource-label-controls">
            <a class="resource-control armor-slots-decrement" data-action="decrement" title="Decrease Armor Slots Used for ${target.name}">
              <i class="fas fa-minus"></i>
            </a>
            <label>
              <strong>${target.name}</strong>
              <span class="armor-availability">(${target.availableSlots} available)</span>
            </label>
            <a class="resource-control armor-slots-increment" data-action="increment" title="Increase Armor Slots Used for ${target.name}">
              <i class="fas fa-plus"></i>
            </a>
          </div>
        </div>`;
    });
  }
  
  armorUIHtml += '</div>';
  return armorUIHtml;
}

/**
 * Initialize multi-target armor slots UI handlers
 * @param {jQuery} html - The chat message HTML element
 */
function _initializeMultiTargetArmorSlotsHandlers(html) {
  const armorContainers = html.find(".armor-slots-ui");
  if (!armorContainers.length) return;
  
  // Initialize each armor container
  armorContainers.each(function() {
    const container = $(this);
    const actorId = container.data("actor-id");
    const maxElement = container.find(".armor-slots-max");
    const maxValue = parseInt(maxElement.text()) || 3; // This is now the usableSlots (capped at 3)
    
    // Store initial state
    container.data("current", 0);
    container.data("max", maxValue); // Store the usable max (capped at 3)
    container.data("actor-id", actorId);
  });
  
  // Add click handlers for armor slots increment/decrement
  html.find(".armor-slots-increment").click(async (event) => {
    event.preventDefault();
    const container = $(event.currentTarget).closest(".armor-slots-ui");
    _updateMultiTargetArmorSlotsValue(container, 1);
  });
  
  html.find(".armor-slots-decrement").click(async (event) => {
    event.preventDefault();
    const container = $(event.currentTarget).closest(".armor-slots-ui");
    _updateMultiTargetArmorSlotsValue(container, -1);
  });
}

/**
 * Update armor slots value for a specific target in multi-target UI
 * @param {jQuery} container - The armor slots container element
 * @param {number} delta - The change amount (+1 or -1)
 */
function _updateMultiTargetArmorSlotsValue(container, delta) {
  const currentElement = container.find(".armor-slots-current");
  const maxElement = container.find(".armor-slots-max");
  
  if (!currentElement.length || !maxElement.length) {
    console.warn("Armor slots elements not found in container");
    return;
  }
  
  // Get current values
  let current = parseInt(currentElement.text()) || 0;
  const max = parseInt(maxElement.text()) || 3;
  
  // Calculate new value with bounds checking
  const newValue = Math.max(0, Math.min(max, current + delta));
  
  // Only update if value actually changed
  if (newValue !== current) {
    // Update display
    currentElement.text(newValue);
    
    // Store value on container for reference
    container.data("current", newValue);
    container.data("max", max);
    
    const actorId = container.data("actor-id");
    console.log(`Armor slots for actor ${actorId}: ${current} → ${newValue}`);
  }
}

/**
 * Collect armor slots data from multi-target UI
 * @param {jQuery} html - The chat message HTML element
 * @returns {Object} Object mapping actor IDs to armor slots used
 */
function _collectMultiTargetArmorSlots(html) {
  const armorSlots = {};
  const armorContainers = html.find(".armor-slots-ui");
  
  armorContainers.each(function() {
    const container = $(this);
    const actorId = container.data("actor-id");
    const current = parseInt(container.data("current")) || 0;
    
    if (actorId && current > 0) {
      armorSlots[actorId] = current;
    }
  });
  
  return armorSlots;
}