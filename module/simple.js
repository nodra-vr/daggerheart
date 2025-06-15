// Import Modules
import { SimpleActor } from "./actor.js";
import { SimpleItem } from "./item.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleActorSheet, NPCActorSheet } from "./actor-sheet.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { createDaggerheartMacro } from "./macro.js";
import { SimpleToken, SimpleTokenDocument } from "./token.js";
import { CounterUI } from "./counter-ui.js";
import { TokenCounterUI } from "./token-counter-ui.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function() {
  console.log(`Initializing Simple Daggerheart System`);

  CONFIG.statusEffects = [];

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
    createDaggerheartMacro
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = SimpleActor;
  CONFIG.Actor.typeLabels = {
    character: "ACTOR.TypeCharacter",
    npc: "ACTOR.TypeNpc"
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
Hooks.on("hotbarDrop", (bar, data, slot) => createDaggerheartMacro(data, slot));

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
  
  console.log("Counter UI initialized and displayed above the hotbar.");
});

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
 * Hook to add damage button to attack roll chat messages
 */
Hooks.on("renderChatMessage", (message, html, data) => {
  const content = message.content;
  const flavor = message.flavor || '';
  
  // Try to find the actor from multiple sources
  let actor = null;
  
  // First try: speaker.actor (when rolling from sheet without token)
  if (message.speaker?.actor) {
    actor = game.actors.get(message.speaker.actor);
  }
  
  // Second try: through token (when a token is selected)
  if (!actor && message.speaker?.token) {
    const token = canvas.tokens?.get(message.speaker.token);
    if (token) {
      actor = token.actor;
    }
  }
  
  // Third try: through scene and token (for linked tokens)
  if (!actor && message.speaker?.scene && message.speaker?.token) {
    const scene = game.scenes.get(message.speaker.scene);
    if (scene) {
      const tokenDoc = scene.tokens.get(message.speaker.token);
      if (tokenDoc) {
        actor = tokenDoc.actor;
      }
    }
  }
  
  // Fourth try: from message flags (if we stored it)
  if (!actor && message.flags?.daggerheart?.actorId) {
    actor = game.actors.get(message.flags.daggerheart.actorId);
  }
  
  if (!actor) {
    return;
  }
  
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
    // Check if this appears to be an attack roll (has Hope/Fear dice)
    const hasHopeFear = flavor.includes("Hope") || flavor.includes("Fear");
    
    if (hasHopeFear) {
      // Check if this was a critical success
      const isCritical = flavor.includes("Critical") && flavor.includes("Success");
      
      // Add damage button to the message
      const buttonText = isCritical ? "Critical Damage" : "Damage";
      const damageButton = `<button class="damage-roll-button ${isCritical ? 'critical' : ''}" data-actor-id="${actor.id}" data-weapon-type="${weaponType}" data-weapon-name="${weaponData.name}" data-weapon-damage="${weaponData.damage}" data-is-critical="${isCritical}" style="margin-top: 0.5em; width: 100%;">
        <i class="fas fa-dice-d20"></i> ${buttonText}
      </button>`;
      
      // Find message content and append button
      const messageContent = html.find(".message-content");
      messageContent.append(damageButton);
      
      // Add click handler
      html.find(".damage-roll-button").click(async (event) => {
        event.preventDefault();
        const button = event.currentTarget;
        const actorId = button.dataset.actorId;
        const weaponType = button.dataset.weaponType;
        const weaponName = button.dataset.weaponName;
        const weaponDamage = button.dataset.weaponDamage;
        const isCritical = button.dataset.isCritical === "true";
        
        const actor = game.actors.get(actorId);
        if (!actor) {
          console.error("Daggerheart | Actor not found for damage roll");
          return;
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
          // Fallback for non-standard notation
          rollValue = weaponDamage;
        }
        
        // Create and send the damage roll
        const roll = new Roll(rollValue);
        await roll.evaluate({async: true});
        
        await roll.toMessage({
          flavor: flavorText,
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: actor }),
          rollMode: "roll"
        });
      });
    }
  }
});

/**
 * Hook to store weapon data in attack roll messages for later use
 */
Hooks.on("preCreateChatMessage", (message, data, options, userId) => {
  // Only process messages from the current user
  if (userId !== game.user.id) {
    return;
  }
  
  const flavor = data.flavor || '';
  const actor = game.actors.get(data.speaker?.actor);
  
  if (!actor) return;
  
  // Check if this is a weapon attack roll by looking for weapon names
  const primaryWeapon = actor.system["weapon-main"];
  const secondaryWeapon = actor.system["weapon-off"];
  
  let weaponData = null;
  let weaponType = null;
  
  if (primaryWeapon?.name && flavor.includes(primaryWeapon.name)) {
    weaponData = primaryWeapon;
    weaponType = "primary";
  } else if (secondaryWeapon?.name && flavor.includes(secondaryWeapon.name)) {
    weaponData = secondaryWeapon;
    weaponType = "secondary";
  }
  
  // If this is a weapon attack, store weapon data in message flags
  if (weaponData && (flavor.includes("Hope") || flavor.includes("Fear"))) {
    const isCritical = flavor.includes("Critical") && flavor.includes("Success");
    
    message.updateSource({
      flags: {
        daggerheart: {
          weaponAttack: true,
          weaponType: weaponType,
          weaponData: weaponData,
          proficiency: actor.system.proficiency?.value || 1,
          isCritical: isCritical,
          actorId: actor.id  // Store actor ID as backup
        }
      }
    });
  }
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