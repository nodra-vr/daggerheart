/**
 * Create a spendFear macro
 * @param {number} amount - The amount of fear to spend (default: 1)
 * @param {number} slot - The hotbar slot to use
 * @returns {Promise}
 */
export async function createSpendFearMacro(amount = 1, slot = null) {
  const command = `// Spend Fear Macro
const amount = ${amount};
if (typeof spendFear === 'function') {
  await spendFear(amount);
} else {
  ui.notifications.error("spendFear function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  const macroName = amount === 1 ? "Spend Fear" : `Spend ${amount} Fear`;
  // Improved duplicate detection: check by name and flag first, then by command as fallback
  let macro = game.macros.find(m => m.name === macroName && m.flags?.["daggerheart.spendFearMacro"]) ||
              game.macros.find(m => m.name === macroName && m.command === command);
  
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: "icons/svg/skull.svg", // Use skull icon for fear
      command: command,
      flags: { "daggerheart.spendFearMacro": true }
    });
  }
  
  if (slot !== null) {
    game.user.assignHotbarMacro(macro, slot);
  }
  
  return macro;
}

/**
 * Create a gainFear macro
 * @param {number} amount - The amount of fear to gain (default: 1)
 * @param {number} slot - The hotbar slot to use
 * @returns {Promise}
 */
export async function createGainFearMacro(amount = 1, slot = null) {
  const command = `// Gain Fear Macro
const amount = ${amount};
if (typeof gainFear === 'function') {
  await gainFear(amount);
} else {
  ui.notifications.error("gainFear function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  const macroName = amount === 1 ? "Gain Fear" : `Gain ${amount} Fear`;
  // Improved duplicate detection: check by name and flag first, then by command as fallback
  let macro = game.macros.find(m => m.name === macroName && m.flags?.["daggerheart.gainFearMacro"]) ||
              game.macros.find(m => m.name === macroName && m.command === command);
  
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: "icons/svg/terror.svg", // Use terror icon for gaining fear
      command: command,
      flags: { "daggerheart.gainFearMacro": true }
    });
  }
  
  if (slot !== null) {
    game.user.assignHotbarMacro(macro, slot);
  }
  
  return macro;
}

/**
 * Spend stress on an actor
 * @param {Actor|null} actor - The actor to apply stress to (optional)
 * @param {number} amount - The amount of stress to add (default: 1)
 * @returns {Promise<boolean>}
 */
export async function spendStress(actor = null, amount = 1) {
  // Check if game is paused
  if (game.paused) {
    console.log("Daggerheart | Stress spending skipped - game is paused");
    ui.notifications.info("Stress spending skipped - game is paused");
    return false;
  }
  
  // Validate amount parameter
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("Stress amount must be a positive integer");
    ui.notifications.error("Stress amount must be a positive integer.");
    return false;
  }

  let targetActor = actor;

  // If no actor provided, try to determine the target actor
  if (!targetActor) {
    // First, check if we're on a character sheet
    const activeSheet = Object.values(ui.windows).find(app => 
      app instanceof ActorSheet && app.rendered
    );
    
    if (activeSheet?.actor) {
      targetActor = activeSheet.actor;
      console.log(`Using actor from active sheet: ${targetActor.name}`);
    } else {
      // Check for selected tokens
      const selectedTokens = canvas.tokens?.controlled || [];
      
      if (selectedTokens.length === 1) {
        targetActor = selectedTokens[0].actor;
        console.log(`Using actor from selected token: ${targetActor.name}`);
      } else if (selectedTokens.length > 1) {
        console.error("Multiple tokens selected. Please select only one token or specify an actor.");
        ui.notifications.error("Multiple tokens selected. Please select only one token.");
        return false;
      } else {
        console.error("No actor specified, no active character sheet, and no token selected.");
        ui.notifications.error("No target found. Please select a token, open a character sheet, or specify an actor.");
        return false;
      }
    }
  }

  // Validate that we have a valid actor
  if (!targetActor) {
    console.error("No valid actor found for stress spending");
    ui.notifications.error("No valid actor found.");
    return false;
  }

  // Check if actor has stress system
  if (!targetActor.system?.stress) {
    console.error(`Actor ${targetActor.name} does not have a stress system`);
    ui.notifications.error(`${targetActor.name} does not have a stress system.`);
    return false;
  }

  // Check permissions - allow if user is GM, Assistant GM, or owns the actor
  const canModify = game.user.isGM || 
                   game.user.hasRole("ASSISTANT") || 
                   targetActor.isOwner;
  
  if (!canModify) {
    console.warn(`User does not have permission to modify ${targetActor.name}'s stress`);
    ui.notifications.warn(`You do not have permission to modify ${targetActor.name}'s stress.`);
    return false;
  }

  const currentStress = parseInt(targetActor.system.stress.value) || 0;
  const maxStress = parseInt(targetActor.system.stress.max) || 6;
  const newStress = Math.min(maxStress, currentStress + amount);
  const actualAmount = newStress - currentStress;

  // Check if we can actually add stress
  if (actualAmount <= 0) {
    console.warn(`${targetActor.name} already has maximum stress (${maxStress})`);
    ui.notifications.warn(`${targetActor.name} already has maximum stress.`);
    return false;
  }

  try {
    // Update the actor's stress
    await targetActor.update({
      "system.stress.value": newStress
    });

    // Success notification
    const message = actualAmount === 1 ? 
      `${targetActor.name} gains 1 stress. Current stress: ${newStress}/${maxStress}` : 
      `${targetActor.name} gains ${actualAmount} stress. Current stress: ${newStress}/${maxStress}`;
    
    ui.notifications.info(message);

    // Send to chat
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `<div class="stress-spend-message">
        <h3><i class="fas fa-exclamation-triangle"></i> Stress Applied</h3>
        <p><strong>${targetActor.name}</strong> gains <strong>${actualAmount}</strong> stress.</p>
        <p>Current stress: <strong>${newStress}/${maxStress}</strong></p>
        ${newStress >= maxStress ? '<p class="stress-warning"><em>Maximum stress reached!</em></p>' : ''}
      </div>`,
      flags: {
        daggerheart: {
          messageType: "stressApplied",
          actorId: targetActor.id,
          amountApplied: actualAmount,
          currentStress: newStress,
          maxStress: maxStress
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Error applying stress:", error);
    ui.notifications.error("Error applying stress. Check console for details.");
    return false;
  }
}

/**
 * Spend hope on an actor
 * @param {Actor|null} actor - The actor to spend hope from (optional)
 * @param {number} amount - The amount of hope to spend (default: 1)
 * @returns {Promise<boolean>}
 */
export async function spendHope(actor = null, amount = 1) {
  // Check if game is paused
  if (game.paused) {
    console.log("Daggerheart | Hope spending skipped - game is paused");
    ui.notifications.info("Hope spending skipped - game is paused");
    return false;
  }
  
  // Validate amount parameter
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("Hope amount must be a positive integer");
    ui.notifications.error("Hope amount must be a positive integer.");
    return false;
  }

  let targetActor = actor;

  // If no actor provided, try to determine the target actor
  if (!targetActor) {
    console.log("Daggerheart | spendHope: No actor provided, attempting to find target actor");
    
    // First, check if we're on a character sheet
    const activeSheet = Object.values(ui.windows).find(app => 
      app instanceof ActorSheet && app.rendered
    );
    
    console.log("Daggerheart | spendHope: Active sheet found:", activeSheet ? activeSheet.constructor.name : "none");
    console.log("Daggerheart | spendHope: Active sheet actor:", activeSheet?.actor?.name || "none");
    
    if (activeSheet?.actor) {
      targetActor = activeSheet.actor;
      console.log(`Daggerheart | spendHope: Using actor from active sheet: ${targetActor.name} (type: ${targetActor.type})`);
    } else {
      // Check for selected tokens
      const selectedTokens = canvas.tokens?.controlled || [];
      console.log("Daggerheart | spendHope: Selected tokens count:", selectedTokens.length);
      
      if (selectedTokens.length === 1) {
        targetActor = selectedTokens[0].actor;
        console.log(`Daggerheart | spendHope: Using actor from selected token: ${targetActor.name} (type: ${targetActor.type})`);
      } else if (selectedTokens.length > 1) {
        console.error("Multiple tokens selected. Please select only one token or specify an actor.");
        ui.notifications.error("Multiple tokens selected. Please select only one token.");
        return false;
      } else {
        console.error("No actor specified, no active character sheet, and no token selected.");
        ui.notifications.error("No target found. Please select a token, open a character sheet, or specify an actor.");
        return false;
      }
    }
  }

  // Validate that we have a valid actor
  if (!targetActor) {
    console.error("Daggerheart | spendHope: No valid actor found for hope spending");
    ui.notifications.error("No valid actor found.");
    return false;
  }

  console.log("Daggerheart | spendHope: Final targetActor:", targetActor ? `${targetActor.name} (${targetActor.type})` : "undefined");
  console.log("Daggerheart | spendHope: targetActor.system:", targetActor.system ? "exists" : "undefined");
  console.log("Daggerheart | spendHope: targetActor.system.hope:", targetActor.system?.hope ? "exists" : "undefined");

  // Check if actor has hope system
  if (!targetActor.system?.hope) {
    console.error(`Actor ${targetActor.name} does not have a hope system`);
    ui.notifications.error(`${targetActor.name} does not have a hope system.`);
    return false;
  }

  // Check permissions - allow if user is GM, Assistant GM, or owns the actor
  const canModify = game.user.isGM || 
                   game.user.hasRole("ASSISTANT") || 
                   targetActor.isOwner;
  
  if (!canModify) {
    console.warn(`User does not have permission to modify ${targetActor.name}'s hope`);
    ui.notifications.warn(`You do not have permission to modify ${targetActor.name}'s hope.`);
    return false;
  }

  const currentHope = parseInt(targetActor.system.hope.value) || 0;
  const maxHope = parseInt(targetActor.system.hope.max) || 6;
  const newHope = Math.max(0, currentHope - amount);
  const actualAmount = currentHope - newHope;

  // Check if we can actually spend hope
  if (actualAmount <= 0) {
    console.warn(`${targetActor.name} doesn't have enough hope to spend (${currentHope} available)`);
    ui.notifications.warn(`${targetActor.name} doesn't have enough hope to spend.`);
    return false;
  }

  try {
    // Update the actor's hope
    await targetActor.update({
      "system.hope.value": newHope
    });

    // Success notification
    const message = actualAmount === 1 ? 
      `${targetActor.name} spends 1 hope. Current hope: ${newHope}/${maxHope}` : 
      `${targetActor.name} spends ${actualAmount} hope. Current hope: ${newHope}/${maxHope}`;
    
    ui.notifications.info(message);

    // Send to chat
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `<div class="hope-spend-message">
        <h3><i class="fas fa-star"></i> Hope Spent</h3>
        <p><strong>${targetActor.name}</strong> spends <strong>${actualAmount}</strong> hope.</p>
        <p>Current hope: <strong>${newHope}/${maxHope}</strong></p>
        ${newHope === 0 ? '<p class="hope-warning"><em>No hope remaining!</em></p>' : ''}
      </div>`,
      flags: {
        daggerheart: {
          messageType: "hopeSpent",
          actorId: targetActor.id,
          amountSpent: actualAmount,
          currentHope: newHope,
          maxHope: maxHope
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Error spending hope:", error);
    ui.notifications.error("Error spending hope. Check console for details.");
    return false;
  }
}

/**
 * Gain hope on an actor (increase hope)
 * @param {Actor|null} actor - The actor to gain hope on (optional)
 * @param {number} amount - The amount of hope to gain (default: 1)
 * @returns {Promise<boolean>}
 */
export async function gainHope(actor = null, amount = 1) {
  // Check if game is paused
  if (game.paused) {
    console.log("Daggerheart | Hope gaining skipped - game is paused");
    ui.notifications.info("Hope gaining skipped - game is paused");
    return false;
  }
  
  // Validate amount parameter
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("Hope amount must be a positive integer");
    ui.notifications.error("Hope amount must be a positive integer.");
    return false;
  }

  let targetActor = actor;

  // If no actor provided, try to determine the target actor
  if (!targetActor) {
    console.log("Daggerheart | gainHope: No actor provided, attempting to find target actor");
    
    // First, check if we're on a character sheet
    const activeSheet = Object.values(ui.windows).find(app => 
      app instanceof ActorSheet && app.rendered
    );
    
    console.log("Daggerheart | gainHope: Active sheet found:", activeSheet ? activeSheet.constructor.name : "none");
    console.log("Daggerheart | gainHope: Active sheet actor:", activeSheet?.actor?.name || "none");
    
    if (activeSheet?.actor) {
      targetActor = activeSheet.actor;
      console.log(`Daggerheart | gainHope: Using actor from active sheet: ${targetActor.name} (type: ${targetActor.type})`);
    } else {
      // Check for selected tokens
      const selectedTokens = canvas.tokens?.controlled || [];
      console.log("Daggerheart | gainHope: Selected tokens count:", selectedTokens.length);
      
      if (selectedTokens.length === 1) {
        targetActor = selectedTokens[0].actor;
        console.log(`Daggerheart | gainHope: Using actor from selected token: ${targetActor.name} (type: ${targetActor.type})`);
      } else if (selectedTokens.length > 1) {
        console.error("Multiple tokens selected. Please select only one token or specify an actor.");
        ui.notifications.error("Multiple tokens selected. Please select only one token.");
        return false;
      } else {
        console.error("No actor specified, no active character sheet, and no token selected.");
        ui.notifications.error("No target found. Please select a token, open a character sheet, or specify an actor.");
        return false;
      }
    }
  }

  // Validate that we have a valid actor
  if (!targetActor) {
    console.error("Daggerheart | gainHope: No valid actor found for hope gaining");
    ui.notifications.error("No valid actor found.");
    return false;
  }

  console.log("Daggerheart | gainHope: Final targetActor:", targetActor ? `${targetActor.name} (${targetActor.type})` : "undefined");
  console.log("Daggerheart | gainHope: targetActor.system:", targetActor.system ? "exists" : "undefined");
  console.log("Daggerheart | gainHope: targetActor.system.hope:", targetActor.system?.hope ? "exists" : "undefined");

  // Check if actor has hope system
  if (!targetActor.system?.hope) {
    console.error(`Actor ${targetActor.name} does not have a hope system`);
    ui.notifications.error(`${targetActor.name} does not have a hope system.`);
    return false;
  }

  // Check permissions - allow if user is GM, Assistant GM, or owns the actor
  const canModify = game.user.isGM || 
                   game.user.hasRole("ASSISTANT") || 
                   targetActor.isOwner;
  
  if (!canModify) {
    console.warn(`User does not have permission to modify ${targetActor.name}'s hope`);
    ui.notifications.warn(`You do not have permission to modify ${targetActor.name}'s hope.`);
    return false;
  }

  const currentHope = parseInt(targetActor.system.hope.value) || 0;
  const maxHope = parseInt(targetActor.system.hope.max) || 6;
  const newHope = Math.min(maxHope, currentHope + amount);
  const actualAmount = newHope - currentHope;

  // Check if we can actually gain hope
  if (actualAmount <= 0) {
    console.warn(`${targetActor.name} already has maximum hope (${maxHope})`);
    ui.notifications.warn(`${targetActor.name} already has maximum hope.`);
    return false;
  }

  try {
    // Update the actor's hope
    await targetActor.update({
      "system.hope.value": newHope
    });

    // Success notification
    const message = actualAmount === 1 ? 
      `${targetActor.name} gains 1 hope. Current hope: ${newHope}/${maxHope}` : 
      `${targetActor.name} gains ${actualAmount} hope. Current hope: ${newHope}/${maxHope}`;
    
    ui.notifications.info(message);

    // Send to chat
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `<div class="hope-gain-message">
        <h3><i class="fas fa-star"></i> Hope Gained</h3>
        <p><strong>${targetActor.name}</strong> gains <strong>${actualAmount}</strong> hope.</p>
        <p>Current hope: <strong>${newHope}/${maxHope}</strong></p>
        ${newHope >= maxHope ? '<p class="hope-max"><em>Maximum hope reached!</em></p>' : ''}
      </div>`,
      flags: {
        daggerheart: {
          messageType: "hopeGained",
          actorId: targetActor.id,
          amountGained: actualAmount,
          currentHope: newHope,
          maxHope: maxHope
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Error gaining hope:", error);
    ui.notifications.error("Error gaining hope. Check console for details.");
    return false;
  }
}

/**
 * Create a spendHope macro
 * @param {number} amount - The amount of hope to spend (default: 1)
 * @param {number} slot - The hotbar slot to use
 * @returns {Promise}
 */
export async function createSpendHopeMacro(amount = 1, slot = null) {
  const command = `// Spend Hope Macro
const amount = ${amount};
if (typeof spendHope === 'function') {
  await spendHope(null, amount);
} else {
  ui.notifications.error("spendHope function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  const macroName = amount === 1 ? "Spend Hope" : `Spend ${amount} Hope`;
  // Improved duplicate detection: check by name and flag first, then by command as fallback
  let macro = game.macros.find(m => m.name === macroName && m.flags?.["daggerheart.spendHopeMacro"]) ||
              game.macros.find(m => m.name === macroName && m.command === command);
  
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: "icons/svg/sun.svg", // Use sun icon for hope
      command: command,
      flags: { "daggerheart.spendHopeMacro": true }
    });
  }
  
  if (slot !== null) {
    game.user.assignHotbarMacro(macro, slot);
  }
  
  return macro;
}

/**
 * Create a gainHope macro
 * @param {number} amount - The amount of hope to gain (default: 1)
 * @param {number} slot - The hotbar slot to use
 * @returns {Promise}
 */
export async function createGainHopeMacro(amount = 1, slot = null) {
  const command = `// Gain Hope Macro
const amount = ${amount};
if (typeof gainHope === 'function') {
  await gainHope(null, amount);
} else {
  ui.notifications.error("gainHope function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  const macroName = amount === 1 ? "Gain Hope" : `Gain ${amount} Hope`;
  // Improved duplicate detection: check by name and flag first, then by command as fallback
  let macro = game.macros.find(m => m.name === macroName && m.flags?.["daggerheart.gainHopeMacro"]) ||
              game.macros.find(m => m.name === macroName && m.command === command);
  
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: "icons/svg/sun.svg", // Use sun icon for hope gaining
      command: command,
      flags: { "daggerheart.gainHopeMacro": true }
    });
  }
  
  if (slot !== null) {
    game.user.assignHotbarMacro(macro, slot);
  }
  
  return macro;
}

/**
 * Clear stress from an actor (reduce stress)
 * @param {Actor|null} actor - The actor to clear stress from (optional)
 * @param {number} amount - The amount of stress to clear (default: 1)
 * @returns {Promise<boolean>}
 */
export async function clearStress(actor = null, amount = 1) {
  // Check if game is paused
  if (game.paused) {
    console.log("Daggerheart | Stress clearing skipped - game is paused");
    ui.notifications.info("Stress clearing skipped - game is paused");
    return false;
  }
  
  // Validate amount parameter
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("Stress amount must be a positive integer");
    ui.notifications.error("Stress amount must be a positive integer.");
    return false;
  }

  let targetActor = actor;

  // If no actor provided, try to determine the target actor
  if (!targetActor) {
    console.log("Daggerheart | clearStress: No actor provided, attempting to find target actor");
    
    // First, check if we're on a character sheet
    const activeSheet = Object.values(ui.windows).find(app => 
      app instanceof ActorSheet && app.rendered
    );
    
    console.log("Daggerheart | clearStress: Active sheet found:", activeSheet ? activeSheet.constructor.name : "none");
    console.log("Daggerheart | clearStress: Active sheet actor:", activeSheet?.actor?.name || "none");
    
    if (activeSheet?.actor) {
      targetActor = activeSheet.actor;
      console.log(`Daggerheart | clearStress: Using actor from active sheet: ${targetActor.name} (type: ${targetActor.type})`);
    } else {
      // Check for selected tokens
      const selectedTokens = canvas.tokens?.controlled || [];
      console.log("Daggerheart | clearStress: Selected tokens count:", selectedTokens.length);
      
      if (selectedTokens.length === 1) {
        targetActor = selectedTokens[0].actor;
        console.log(`Daggerheart | clearStress: Using actor from selected token: ${targetActor.name} (type: ${targetActor.type})`);
      } else if (selectedTokens.length > 1) {
        console.error("Multiple tokens selected. Please select only one token or specify an actor.");
        ui.notifications.error("Multiple tokens selected. Please select only one token.");
        return false;
      } else {
        console.error("No actor specified, no active character sheet, and no token selected.");
        ui.notifications.error("No target found. Please select a token, open a character sheet, or specify an actor.");
        return false;
      }
    }
  }

  // Validate that we have a valid actor
  if (!targetActor) {
    console.error("Daggerheart | clearStress: No valid actor found for stress clearing");
    ui.notifications.error("No valid actor found.");
    return false;
  }

  console.log("Daggerheart | clearStress: Final targetActor:", targetActor ? `${targetActor.name} (${targetActor.type})` : "undefined");
  console.log("Daggerheart | clearStress: targetActor.system:", targetActor.system ? "exists" : "undefined");
  console.log("Daggerheart | clearStress: targetActor.system.stress:", targetActor.system?.stress ? "exists" : "undefined");

  // Check if actor has stress system
  if (!targetActor.system?.stress) {
    console.error(`Actor ${targetActor.name} does not have a stress system`);
    ui.notifications.error(`${targetActor.name} does not have a stress system.`);
    return false;
  }

  // Check permissions - allow if user is GM, Assistant GM, or owns the actor
  const canModify = game.user.isGM || 
                   game.user.hasRole("ASSISTANT") || 
                   targetActor.isOwner;
  
  if (!canModify) {
    console.warn(`User does not have permission to modify ${targetActor.name}'s stress`);
    ui.notifications.warn(`You do not have permission to modify ${targetActor.name}'s stress.`);
    return false;
  }

  const currentStress = parseInt(targetActor.system.stress.value) || 0;
  const maxStress = parseInt(targetActor.system.stress.max) || 6;
  const newStress = Math.max(0, currentStress - amount);
  const actualAmount = currentStress - newStress;

  // Check if we can actually clear stress
  if (actualAmount <= 0) {
    console.warn(`${targetActor.name} doesn't have any stress to clear (${currentStress} current)`);
    ui.notifications.warn(`${targetActor.name} doesn't have any stress to clear.`);
    return false;
  }

  try {
    // Update the actor's stress
    await targetActor.update({
      "system.stress.value": newStress
    });

    // Success notification
    const message = actualAmount === 1 ? 
      `${targetActor.name} clears 1 stress. Current stress: ${newStress}/${maxStress}` : 
      `${targetActor.name} clears ${actualAmount} stress. Current stress: ${newStress}/${maxStress}`;
    
    ui.notifications.info(message);

    // Send to chat
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `<div class="stress-clear-message">
        <h3><i class="fas fa-heart"></i> Stress Cleared</h3>
        <p><strong>${targetActor.name}</strong> clears <strong>${actualAmount}</strong> stress.</p>
        <p>Current stress: <strong>${newStress}/${maxStress}</strong></p>
        ${newStress === 0 ? '<p class="stress-cleared"><em>All stress cleared!</em></p>' : ''}
      </div>`,
      flags: {
        daggerheart: {
          messageType: "stressCleared",
          actorId: targetActor.id,
          amountCleared: actualAmount,
          currentStress: newStress,
          maxStress: maxStress
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Error clearing stress:", error);
    ui.notifications.error("Error clearing stress. Check console for details.");
    return false;
  }
}

/**
 * Create a spendStress macro
 * @param {number} amount - The amount of stress to apply (default: 1)
 * @param {number} slot - The hotbar slot to use
 * @returns {Promise}
 */
export async function createSpendStressMacro(amount = 1, slot = null) {
  const command = `// Spend Stress Macro
const amount = ${amount};
if (typeof game.daggerheart?.spendStress === 'function') {
  await game.daggerheart.spendStress(null, amount);
} else {
  ui.notifications.error("spendStress function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  const macroName = amount === 1 ? "Apply Stress" : `Apply ${amount} Stress`;
  // Improved duplicate detection: check by name and flag first, then by command as fallback
  let macro = game.macros.find(m => m.name === macroName && m.flags?.["daggerheart.spendStressMacro"]) ||
              game.macros.find(m => m.name === macroName && m.command === command);
  
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: "icons/svg/hazard.svg", // Use hazard icon for stress
      command: command,
      flags: { "daggerheart.spendStressMacro": true }
    });
  }
  
  if (slot !== null) {
    game.user.assignHotbarMacro(macro, slot);
  }
  
  return macro;
}

/**
 * Create a clearStress macro
 * @param {number} amount - The amount of stress to clear (default: 1)
 * @param {number} slot - The hotbar slot to use
 * @returns {Promise}
 */
export async function createClearStressMacro(amount = 1, slot = null) {
  const command = `// Clear Stress Macro
const amount = ${amount};
if (typeof clearStress === 'function') {
  await clearStress(null, amount);
} else {
  ui.notifications.error("clearStress function not available. Make sure the Daggerheart system is properly loaded.");
}`;

  const macroName = amount === 1 ? "Clear Stress" : `Clear ${amount} Stress`;
  // Improved duplicate detection: check by name and flag first, then by command as fallback
  let macro = game.macros.find(m => m.name === macroName && m.flags?.["daggerheart.clearStressMacro"]) ||
              game.macros.find(m => m.name === macroName && m.command === command);
  
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: "icons/svg/heal.svg", // Use heal icon for stress clearing
      command: command,
      flags: { "daggerheart.clearStressMacro": true }
    });
  }
  
  if (slot !== null) {
    game.user.assignHotbarMacro(macro, slot);
  }
  
  return macro;
}

/**
 * Create a Macro from an attribute drop.
 * Get an existing daggerheart macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export async function createDaggerheartMacro(data, slot) {
  // Handle Item drops - create macro to send item to chat as card
  if (data.type === "Item") {
    const item = await fromUuid(data.uuid);
    if (!item) return false;
    
    // Create a simple macro command that matches the existing image click functionality
    const command = `// Send item to chat as card
const item = await fromUuid("${data.uuid}");
if (!item) {
  ui.notifications.warn("Item not found!");
  return;
}

const itemData = item.system;
const description = await TextEditor.enrichHTML(itemData.description, {secrets: item.isOwner, async: true});
const chatCard = globalThis.daggerheart?.buildItemCardChat ?
  globalThis.daggerheart.buildItemCardChat({
    itemId: item.id,
    actorId: item.parent?.id || '',
    image: item.img,
    name: item.name,
    category: itemData.category || '',
    rarity: itemData.rarity || '',
    description
  }) : \`<div class="item-card-chat">\${item.name}</div>\`; // fallback

ChatMessage.create({
    user: game.user.id,
    speaker: item.parent ? ChatMessage.getSpeaker({ actor: item.parent }) : ChatMessage.getSpeaker(),
    content: chatCard
});`;

    // Create the macro
    const macroName = `${item.name}`;
    // Improved duplicate detection: check by name and flag first, then by command as fallback
    let macro = game.macros.find(m => m.name === macroName && m.flags?.["daggerheart.itemMacro"]) ||
                game.macros.find(m => m.name === macroName && m.command === command);
    
    if (!macro) {
      macro = await Macro.create({
        name: macroName,
        type: "script",
        img: item.img,
        command: command,
        flags: { "daggerheart.itemMacro": true }
      });
    }
    
    game.user.assignHotbarMacro(macro, slot);
    return false;
  }
  
    // Handle attribute roll drops (existing functionality)  
  if ( !data.roll || !data.label ) return false;
  const command = `const roll = new Roll("${data.roll}", actor ? actor.getRollData() : {});
  await roll.evaluate();
      try {
      const chatMessage = await ChatMessage.create({
        content: \`
          <div class="dice-roll">
            <div class="dice-result">
              <div class="dice-formula">\${roll.formula}</div>
              <div class="dice-total">\${roll.total}</div>
            </div>
          </div>
        \`,
        speaker,
        flavor: "${data.label}",
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll]
      });
      
      // Wait for Dice So Nice! animation to complete
      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating macro roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but roll was completed.");
    }`;
  // Improved duplicate detection: check by name and flag first, then by command as fallback
  let macro = game.macros.find(m => m.name === data.label && m.flags?.["daggerheart.attrMacro"]) ||
              game.macros.find(m => m.name === data.label && m.command === command);
  if (!macro) {
    macro = await Macro.create({
      name: data.label,
      type: "script",
      command: command,
      flags: { "daggerheart.attrMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
} 