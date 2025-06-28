// Import Modules
import { SimpleActor } from "./actor.js";
import { SimpleItem } from "./item.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleWeaponSheet } from "./weapon-sheet.js";
import { SimpleActorSheet, NPCActorSheet } from "./actor-sheet.js";
import { CompanionActorSheet } from "./actor-sheet-companion.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { createDaggerheartMacro, createSpendFearMacro, createGainFearMacro, createSpendStressMacro, spendStress } from "./spending-system.js";
import { SimpleToken, SimpleTokenDocument } from "./token.js";
import { CounterUI } from "./counter-ui.js";
import { TokenCounterUI } from "./token-counter-ui.js";
import { CountdownTracker } from "./countdown-tracker.js";
import { SheetTracker } from "./sheet-tracker.js";
import { DaggerheartMigrations } from "./migrations.js";
import { EquipmentHandler } from "./equipmentHandler.js";

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
    spendStress,
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
    EquipmentHandler: EquipmentHandler
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
 * Hook to refresh actor sheets when base value restrictions change
 */
Hooks.on("updateActor", (actor, data, options, userId) => {
  // Check if base value restrictions were updated
  if (data.flags?.daggerheart?.baseValueRestrictions) {
    console.log("Daggerheart | Base value restrictions updated, refreshing sheets for actor:", actor.name);
    
    // Force refresh all open sheets for this actor (debounced)
    Object.values(actor.apps).forEach(app => {
      if (app.render) {
        console.log("Daggerheart | Refreshing sheet:", app.constructor.name);
        try {
          app.render(true); // This will use debounced render
        } catch (error) {
          console.warn("Daggerheart | Failed to refresh sheet:", error);
        }
      }
    });
  }
  
  // Also check for weapon data changes that might need sheet refresh
  if (data.system && (
    data.system["weapon-main"] || 
    data.system["weapon-off"] ||
    data.flags?.daggerheart // Any daggerheart flags
  )) {
    console.log("Daggerheart | Weapon or system data updated, refreshing sheets for actor:", actor.name);
    
    // Force refresh all open sheets for this actor (debounced)
    Object.values(actor.apps).forEach(app => {
      if (app.render) {
        try {
          app.render(true); // This will use debounced render
        } catch (error) {
          console.warn("Daggerheart | Failed to refresh sheet:", error);
        }
      }
    });
  }
});

/**
 * Hook to handle weapon equipped state changes
 */
Hooks.on("updateItem", async (item, data, options, userId) => {
  // Only handle weapon items with equipped state changes
  if (item.type === "weapon" && data.system?.equipped !== undefined) {
    const actor = item.parent;
    if (!actor) return;
    
    console.log("Daggerheart | Weapon equipped state changed:", item.name, "equipped:", data.system.equipped);
    
    // Get the actor sheet if it's open
    const actorSheet = Object.values(actor.apps).find(app => app.constructor.name.includes('ActorSheet'));
    
    if (actorSheet) {
      // Sync equipped weapons and force refresh (debounced)
      try {
        await EquipmentHandler.syncEquippedWeapons(actor, actorSheet);
        actorSheet.render(true); // This will use debounced render
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
  
  // Also add to the game.daggerheart object for consistency
  game.daggerheart.spendFear = window.spendFear;
  game.daggerheart.gainFear = window.gainFear;
  
  // Add global damage application functions
  window.applyDamage = async function(targetActor, damageAmount, sourceActor) {
    if (!game.daggerheart?.damageApplication?.applyDamage) {
      console.error("Damage application not initialized");
      ui.notifications.error("Damage application not available");
      return false;
    }
    return await game.daggerheart.damageApplication.applyDamage(targetActor, damageAmount, sourceActor);
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
  console.log("spendFear(), gainFear(), spendStress(), applyDamage(), applyHealing(), rollDamage(), rollHealing(), undoDamageHealing(), debugUndoData(), cleanupDuplicateMacros(), and testWeaponEquip() functions are now available globally.");
  
  // Clean up any existing duplicate macros from previous versions, but don't create new ones
  if (game.user.isGM) {
    await _cleanupDuplicateMacros();
  }
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
    } else if (actorType === "npc") {
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
            actorType: "npc",
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
 * Add damage and healing application buttons to damage rolls
 */
function _addDamageApplicationButtons(message, html, flags) {
  // Check for existing buttons
  const existingButtons = html.find(".apply-damage-button, .apply-healing-button").length;
  if (existingButtons > 0) return;
  
  const damageAmount = flags.damageAmount || extractRollTotal(message);
  if (!damageAmount) return;
  
  const sourceActor = game.actors.get(flags.actorId);
  
  // Create damage and healing buttons
  const buttonContainer = `<div class="damage-application-buttons" style="margin-top: 0.5em; display: flex; gap: 0.25em;">
    <button class="apply-damage-button" data-damage="${damageAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-sword"></i> Damage (${damageAmount})
    </button>
    <button class="apply-healing-button" data-healing="${damageAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-heart"></i> Heal (${damageAmount})
    </button>
  </div>`;
  
  html.find(".message-content").append(buttonContainer);
  
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
  
  // Create healing and damage buttons (healing first for healing rolls)
  const buttonContainer = `<div class="damage-application-buttons" style="margin-top: 0.5em; display: flex; gap: 0.25em;">
    <button class="apply-healing-button" data-healing="${healingAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-heart"></i> Heal (${healingAmount})
    </button>
    <button class="apply-damage-button" data-damage="${healingAmount}" data-source-actor-id="${flags.actorId || ''}" style="flex: 1;">
      <i class="fas fa-sword"></i> Damage (${healingAmount})
    </button>
  </div>`;
  
  html.find(".message-content").append(buttonContainer);
  
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
  
  try {
    let result = { success: false, undoId: null };
    if (type === "damage") {
      result = await applyDamage(null, amount, sourceActor);
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