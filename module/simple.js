// Import Modules
import { SimpleActor } from "./actor.js";
import { SimpleItem } from "./item.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleActorSheet, NPCActorSheet } from "./actor-sheet.js";
import { CompanionActorSheet } from "./actor-sheet-companion.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { createDaggerheartMacro, createSpendFearMacro, createGainFearMacro, createSpendStressMacro, spendStress } from "./spending-system.js";
import { SimpleToken, SimpleTokenDocument } from "./token.js";
import { CounterUI } from "./counter-ui.js";
import { TokenCounterUI } from "./token-counter-ui.js";
import { SheetTracker } from "./sheet-tracker.js";

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
    getTierOfPlay: _getTierOfPlay
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
    subclass: "ITEM.TypeSubclass"
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
    makeDefault: true,
    label: "SHEET.Item.default"
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
 * Ready hook to initialize the counter UI
 */
Hooks.once("ready", async function() {
  // Initialize the counter UI
  game.daggerheart.counter = new CounterUI();
  await game.daggerheart.counter.initialize();
  
  // Initialize the token counter UI
  game.daggerheart.tokenCounter = new TokenCounterUI();
  await game.daggerheart.tokenCounter.initialize();
  
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
  console.log("spendFear(), gainFear(), spendStress(), applyDamage(), applyHealing(), rollDamage(), rollHealing(), undoDamageHealing(), debugUndoData(), and cleanupDuplicateMacros() functions are now available globally.");
  
  // Create demo macros if they don't exist (optional - for testing)
  if (game.user.isGM) {
    // First, clean up any duplicate macros
    await _cleanupDuplicateMacros();
    
    const existingSpendFearMacro = game.macros.find(m => m.name === "Spend 1 Fear" && m.flags?.["daggerheart.spendFearMacro"]);
    if (!existingSpendFearMacro) {
      await game.daggerheart.createSpendFearMacro(1);
      console.log("Created demo 'Spend 1 Fear' macro for GM.");
    }
    
    const existingGainFearMacro = game.macros.find(m => m.name === "Gain Fear" && m.flags?.["daggerheart.gainFearMacro"]);
    if (!existingGainFearMacro) {
      await game.daggerheart.createGainFearMacro(1);
      console.log("Created demo 'Gain Fear' macro for GM.");
    }
    
    const existingStressMacro = game.macros.find(m => m.name === "Apply Stress" && m.flags?.["daggerheart.spendStressMacro"]);
    if (!existingStressMacro) {
      await game.daggerheart.createSpendStressMacro(1);
      console.log("Created demo 'Apply Stress' macro for GM.");
    }
    
    // Create demo damage application macros
    const existingDamageMacro = game.macros.find(m => m.name === "Apply Damage" && m.flags?.["daggerheart.damageApplicationMacro"]);
    if (!existingDamageMacro) {
      await _createDamageApplicationMacro();
      console.log("Created demo 'Apply Damage' macro for GM.");
    }
    
    const existingHealingMacro = game.macros.find(m => m.name === "Apply Healing" && m.flags?.["daggerheart.healingApplicationMacro"]);
    if (!existingHealingMacro) {
      await _createHealingApplicationMacro();
      console.log("Created demo 'Apply Healing' macro for GM.");
    }
    
    // Create demo damage/healing roll macros
    const existingRollDamageMacro = game.macros.find(m => m.name === "Roll Damage" && m.flags?.["daggerheart.rollDamageMacro"]);
    if (!existingRollDamageMacro) {
      await _createRollDamageMacro();
      console.log("Created demo 'Roll Damage' macro for GM.");
    }
    
    const existingRollHealingMacro = game.macros.find(m => m.name === "Roll Healing" && m.flags?.["daggerheart.rollHealingMacro"]);
    if (!existingRollHealingMacro) {
      await _createRollHealingMacro();
      console.log("Created demo 'Roll Healing' macro for GM.");
    }
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
  const damageButton = `<button class="damage-roll-button character ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage="${weaponData.damage}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
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
  const damageButton = `<button class="damage-roll-button adversary ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage="${weaponData.damage}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
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
      
      // Extract damage formula from damage data (handle both old and new formats)
      let damageFormula;
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'value' in weaponData.damage) {
        // New damage modifier system
        damageFormula = weaponData.damage.value || weaponData.damage.baseValue || '1d8';
      } else {
        // Legacy simple string format
        damageFormula = weaponData.damage || '1d8';
      }
      
      // Add damage button to the message
      const buttonText = isCritical ? "Critical Damage" : "Damage";
      const damageButton = `<button class="damage-roll-button character ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage="${damageFormula}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
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
      
      // Extract damage formula from damage data (handle both old and new formats)
      let damageFormula;
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'value' in weaponData.damage) {
        // New damage modifier system
        damageFormula = weaponData.damage.value || weaponData.damage.baseValue || '1d8';
      } else {
        // Legacy simple string format
        damageFormula = weaponData.damage || '1d8';
      }
      
      // Add damage button to the message
      const buttonText = isCritical ? "Critical Damage" : "Damage";
      const damageButton = `<button class="damage-roll-button adversary ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage="${damageFormula}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
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
  let weaponDamage = button.dataset.weaponDamage;
  const isCritical = button.dataset.isCritical === "true";
  
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.error("Daggerheart | Actor not found for character damage roll");
    return;
  }
  
  // Safety check: if weaponDamage is still problematic, get fresh data from actor
  if (!weaponDamage || weaponDamage === "[object Object]" || weaponDamage === "undefined") {
    console.warn("Daggerheart | Invalid weapon damage in button, fetching from actor");
    const weaponField = weaponType === "primary" ? "weapon-main" : "weapon-off";
    const weaponData = actor.system[weaponField];
    
    if (weaponData && weaponData.damage) {
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'value' in weaponData.damage) {
        // New damage modifier system
        weaponDamage = weaponData.damage.value || weaponData.damage.baseValue || '1d8';
      } else {
        // Legacy simple string format
        weaponDamage = weaponData.damage || '1d8';
      }
    } else {
      weaponDamage = '1d8'; // Ultimate fallback
    }
  }
  
  // Get proficiency value
  const proficiency = Math.max(1, parseInt(actor.system.proficiency?.value) || 1);
  
  // Parse dice notation
  const diceMatch = weaponDamage.match(/^(\d*)d(\d+)(.*)$/i);
  let rollValue;
  let flavorText = `${weaponName} - Damage`;
  
  if (diceMatch) {
    const diceCount = parseInt(diceMatch[1]) || proficiency; // Use proficiency if no count specified
    const dieType = parseInt(diceMatch[2]);
    const modifier = diceMatch[3] || "";
    
    if (isCritical) {
      // Critical damage: max value + normal roll
      const maxDamage = diceCount * dieType;
      rollValue = `${maxDamage} + ${diceCount}d${dieType}${modifier}`;
      flavorText = `${weaponName} - Critical Damage!`;
    } else {
      // Normal damage
      rollValue = `${diceCount}d${dieType}${modifier}`;
    }
  } else {
    // Fallback for non-standard notation - use the damage formula as-is
    rollValue = weaponDamage;
  }
  
  // Create and send the damage roll
  const roll = new Roll(rollValue);
  await roll.evaluate();
  
      try {
      const chatMessage = await ChatMessage.create({
        content: `
          <div class="dice-roll">
            <div class="dice-result">
              <div class="dice-formula">${roll.formula}</div>
              <div class="dice-total">${roll.total}</div>
            </div>
          </div>
        `,
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
            damageAmount: roll.total
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
 * Roll damage for adversaries (uses raw damage formula, no proficiency)
 */
async function _rollAdversaryDamage(event) {
  const button = event.currentTarget;
  const actorId = button.dataset.actorId;
  const weaponType = button.dataset.weaponType;
  const weaponName = button.dataset.weaponName;
  let weaponDamage = button.dataset.weaponDamage;
  const isCritical = button.dataset.isCritical === "true";
  
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.error("Daggerheart | Actor not found for adversary damage roll");
    return;
  }
  
  // Safety check: if weaponDamage is still problematic, get fresh data from actor
  if (!weaponDamage || weaponDamage === "[object Object]" || weaponDamage === "undefined") {
    console.warn("Daggerheart | Invalid weapon damage in button, fetching from actor");
    const weaponField = weaponType === "primary" ? "weapon-main" : "weapon-off";
    const weaponData = actor.system[weaponField];
    
    if (weaponData && weaponData.damage) {
      if (typeof weaponData.damage === 'object' && weaponData.damage !== null && 'value' in weaponData.damage) {
        // New damage modifier system
        weaponDamage = weaponData.damage.value || weaponData.damage.baseValue || '1d8';
      } else {
        // Legacy simple string format
        weaponDamage = weaponData.damage || '1d8';
      }
    } else {
      weaponDamage = '1d8'; // Ultimate fallback
    }
  }
  
  let rollValue;
  let flavorText = `${weaponName} - Damage`;
  
  if (isCritical) {
    // Parse the damage formula to calculate critical damage
    rollValue = _calculateAdversaryCriticalDamage(weaponDamage);
    flavorText = `${weaponName} - Critical Damage!`;
  } else {
    // Normal damage - use the formula as-is
    rollValue = weaponDamage;
  }
  
  // Create and send the damage roll
  const roll = new Roll(rollValue);
  await roll.evaluate();
  
      try {
      const chatMessage = await ChatMessage.create({
        content: `
          <div class="dice-roll">
            <div class="dice-result">
              <div class="dice-formula">${roll.formula}</div>
              <div class="dice-total">${roll.total}</div>
            </div>
          </div>
        `,
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
            damageAmount: roll.total
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
 * Create a damage application macro
 */
async function _createDamageApplicationMacro() {
  const command = `// Apply Damage Macro
// Prompts for damage amount and applies it to targeted/selected token
const damageAmount = await new Promise((resolve) => {
  new Dialog({
    title: "Apply Damage",
    content: \`
      <form>
        <div class="form-group">
          <label>Damage Amount:</label>
          <input type="number" name="damage" value="1" min="1" max="999">
        </div>
      </form>
    \`,
    buttons: {
      apply: {
        label: "Apply Damage",
        callback: (html) => {
          const damage = parseInt(html.find('[name="damage"]').val()) || 1;
          resolve(damage);
        }
      },
      cancel: {
        label: "Cancel",
        callback: () => resolve(null)
      }
    },
    default: "apply"
  }).render(true);
});

if (damageAmount && typeof applyDamage === 'function') {
  await applyDamage(null, damageAmount, null);
} else if (!damageAmount) {
  // User cancelled
} else {
  ui.notifications.error("applyDamage function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  await Macro.create({
    name: "Apply Damage",
    type: "script",
    img: "icons/svg/sword.svg",
    command: command,
    flags: { "daggerheart.damageApplicationMacro": true }
  });
}

/**
 * Create a healing application macro
 */
async function _createHealingApplicationMacro() {
  const command = `// Apply Healing Macro
// Prompts for healing amount and applies it to targeted/selected token
const healingAmount = await new Promise((resolve) => {
  new Dialog({
    title: "Apply Healing",
    content: \`
      <form>
        <div class="form-group">
          <label>Healing Amount:</label>
          <input type="number" name="healing" value="1" min="1" max="999">
        </div>
      </form>
    \`,
    buttons: {
      apply: {
        label: "Apply Healing",
        callback: (html) => {
          const healing = parseInt(html.find('[name="healing"]').val()) || 1;
          resolve(healing);
        }
      },
      cancel: {
        label: "Cancel",
        callback: () => resolve(null)
      }
    },
    default: "apply"
  }).render(true);
});

if (healingAmount && typeof applyHealing === 'function') {
  await applyHealing(null, healingAmount, null);
} else if (!healingAmount) {
  // User cancelled
} else {
  ui.notifications.error("applyHealing function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  await Macro.create({
    name: "Apply Healing",
    type: "script",
    img: "icons/svg/heal.svg",
    command: command,
    flags: { "daggerheart.healingApplicationMacro": true }
  });
}

/**
 * Create a damage rolling macro
 */
async function _createRollDamageMacro() {
  const command = `// Roll Damage Macro
// Prompts for damage formula and rolls it with application buttons
const damageFormula = await new Promise((resolve) => {
  new Dialog({
    title: "Roll Damage",
    content: \`
      <form>
        <div class="form-group">
          <label>Damage Formula:</label>
          <input type="text" name="formula" value="1d4+1" placeholder="e.g., 1d4+1, 2d6">
        </div>
        <div class="form-group">
          <label>Flavor Text (optional):</label>
          <input type="text" name="flavor" placeholder="e.g., Sword Strike">
        </div>
      </form>
    \`,
    buttons: {
      roll: {
        label: "Roll Damage",
        callback: (html) => {
          const formula = html.find('[name="formula"]').val() || "1d4";
          const flavor = html.find('[name="flavor"]').val() || null;
          resolve({ formula, flavor });
        }
      },
      cancel: {
        label: "Cancel",
        callback: () => resolve(null)
      }
    },
    default: "roll"
  }).render(true);
});

if (damageFormula && typeof rollDamage === 'function') {
  const options = {};
  if (damageFormula.flavor) {
    options.flavor = \`<p class="roll-flavor-line"><b>\${damageFormula.flavor}</b></p>\`;
  }
  await rollDamage(damageFormula.formula, options);
} else if (!damageFormula) {
  // User cancelled
} else {
  ui.notifications.error("rollDamage function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  await Macro.create({
    name: "Roll Damage",
    type: "script",
    img: "icons/svg/dice-target.svg",
    command: command,
    flags: { "daggerheart.rollDamageMacro": true }
  });
}

/**
 * Create a healing rolling macro
 */
async function _createRollHealingMacro() {
  const command = `// Roll Healing Macro
// Prompts for healing formula and rolls it with application buttons
const healingFormula = await new Promise((resolve) => {
  new Dialog({
    title: "Roll Healing",
    content: \`
      <form>
        <div class="form-group">
          <label>Healing Formula:</label>
          <input type="text" name="formula" value="1d4+1" placeholder="e.g., 1d4+1, 2d6">
        </div>
        <div class="form-group">
          <label>Flavor Text (optional):</label>
          <input type="text" name="flavor" placeholder="e.g., Healing Potion">
        </div>
      </form>
    \`,
    buttons: {
      roll: {
        label: "Roll Healing",
        callback: (html) => {
          const formula = html.find('[name="formula"]').val() || "1d4";
          const flavor = html.find('[name="flavor"]').val() || null;
          resolve({ formula, flavor });
        }
      },
      cancel: {
        label: "Cancel",
        callback: () => resolve(null)
      }
    },
    default: "roll"
  }).render(true);
});

if (healingFormula && typeof rollHealing === 'function') {
  const options = {};
  if (healingFormula.flavor) {
    options.flavor = \`<p class="roll-flavor-line"><b>\${healingFormula.flavor}</b></p>\`;
  }
  await rollHealing(healingFormula.formula, options);
} else if (!healingFormula) {
  // User cancelled
} else {
  ui.notifications.error("rollHealing function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  await Macro.create({
    name: "Roll Healing",
    type: "script",
    img: "icons/svg/angel.svg",
    command: command,
    flags: { "daggerheart.rollHealingMacro": true }
  });
}

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