/**
 * Damage Application System for Daggerheart
 * Handles applying damage and healing based on threshold system
 */

// Store undo data for reverting changes
const undoData = new Map();

/**
 * Apply damage to target actors (multiple targets supported)
 * @param {Actor[]|Actor|null} targetActors - The actors to apply damage to (optional, will auto-select)
 * @param {number} damageAmount - The amount of damage rolled
 * @param {Actor|null} sourceActor - The actor causing the damage (optional)
 * @param {boolean} createUndo - Whether to create undo data (default: true)
 * @param {number} armorSlotsUsed - Number of armor slots to use for damage reduction (default: 0)
 * @returns {Promise<Object>} Result object with success status and undo data
 */
export async function applyDamage(targetActors = null, damageAmount, sourceActor = null, createUndo = true, armorSlotsUsed = 0) {
  // Validate damage amount
  if (!Number.isInteger(damageAmount) || damageAmount <= 0) {
    console.error("Damage amount must be a positive integer");
    ui.notifications.error("Damage amount must be a positive integer.");
    return { success: false, undoId: null };
  }
  
  // Validate armor slots used
  if (!Number.isInteger(armorSlotsUsed) || armorSlotsUsed < 0) {
    console.error("Armor slots used must be a non-negative integer");
    ui.notifications.error("Armor slots used must be a non-negative integer.");
    return { success: false, undoId: null };
  }

  let targets = targetActors;

  // Auto-select targets if not provided
  if (!targets) {
    try {
      targets = _getTargetActors();
    } catch (error) {
      console.error("Target selection failed:", error.message);
      ui.notifications.error(error.message);
      return { success: false, undoId: null };
    }
  }

  // Ensure targets is an array
  if (!Array.isArray(targets)) {
    targets = [targets];
  }

  // Validate that we have valid target actors
  if (!targets || targets.length === 0) {
    console.error("No valid target actors found for damage application");
    ui.notifications.error("No valid target actors found.");
    return { success: false, undoId: null };
  }

  // Generate unique undo ID and record only if requested
  let undoId = null;
  let undoRecord = null;
  
  if (createUndo) {
    undoId = `damage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    undoRecord = {
      type: "damage",
      actors: [],
      damageAmount: damageAmount,
      armorSlotsUsed: armorSlotsUsed,
      sourceActorId: sourceActor?.id || null,
      timestamp: Date.now()
    };
  }

  let successfulApplications = 0;
  const results = [];

  for (const target of targets) {
    // Validate target actor
    if (!target) {
      console.warn("Skipping null target actor");
      continue;
    }

    // Check if actor has health system
    if (!target.system?.health || !target.system?.threshold) {
      console.warn(`Actor ${target.name} does not have a health/threshold system`);
      ui.notifications.warn(`${target.name} does not have a health/threshold system.`);
      continue;
    }

    // Allow all users to apply damage for collaborative gameplay
    // Note: Removed permission restrictions to allow any player to apply damage/healing

    const currentHealth = parseInt(target.system.health.value) || 0;
    const maxHealth = parseInt(target.system.health.max) || 6;
    const thresholds = target.system.threshold;
    
    // Get current armor slots for characters
    let currentArmorSlots = 0;
    let maxArmorSlots = 0;
    let armorSlotsToApply = 0;
    const isCharacter = target.type === 'character';
    
    if (isCharacter && armorSlotsUsed > 0) {
      currentArmorSlots = parseInt(target.system.defenses?.["armor-slots"]?.value) || 0;
      maxArmorSlots = parseInt(target.system.defenses?.["armor-slots"]?.max) || 0;
      
      // Calculate how many armor slots can actually be used
      const availableSlots = maxArmorSlots - currentArmorSlots;
      armorSlotsToApply = Math.min(armorSlotsUsed, availableSlots);
      
      if (armorSlotsToApply < armorSlotsUsed) {
        console.warn(`${target.name} only has ${availableSlots} armor slots available, using ${armorSlotsToApply} instead of requested ${armorSlotsUsed}`);
      }
    }
    
    // Store original health and armor for undo - work with tokens directly (only if creating undo)
    if (createUndo && undoRecord) {
      const isFromToken = !!target.token;
      
      const actorData = {
        originalHealth: currentHealth,
        actorName: target.name,
        actorType: target.type,
        isFromToken: isFromToken,
        tokenId: target.token?.id || null,
        sceneId: target.token?.scene?.id || null,
        actorId: isFromToken ? null : target.id  // Only store actor ID for non-token actors
      };
      
      // Add armor slot data for characters
      if (isCharacter) {
        actorData.originalArmorSlots = currentArmorSlots;
        actorData.armorSlotsApplied = armorSlotsToApply;
      }
      
      undoRecord.actors.push(actorData);
    }
    
    // Calculate HP damage based on thresholds
    const hpDamage = _calculateDamageToHP(damageAmount, thresholds);
    
    // Apply armor reduction for characters
    let finalHpDamage = hpDamage;
    if (isCharacter && armorSlotsToApply > 0) {
      finalHpDamage = Math.max(0, hpDamage - armorSlotsToApply);
      console.log(`${target.name} armor reduction: ${hpDamage} HP - ${armorSlotsToApply} armor = ${finalHpDamage} HP final damage`);
    }
    
    const newHealth = Math.min(maxHealth, currentHealth + finalHpDamage);
    const actualDamage = newHealth - currentHealth;

    // Check if we can actually apply damage
    if (actualDamage <= 0 && armorSlotsToApply <= 0) {
      console.warn(`${target.name} already has maximum damage (${maxHealth}) and no armor slots to consume`);
      ui.notifications.warn(`${target.name} is already at maximum damage.`);
      continue;
    }

    try {
      // Prepare update data
      const updateData = {
        "system.health.value": newHealth
      };
      
      // Update armor slots for characters
      if (isCharacter && armorSlotsToApply > 0) {
        const newArmorSlots = currentArmorSlots + armorSlotsToApply;
        updateData["system.defenses.armor-slots.value"] = newArmorSlots;
      }
      
      // Update the actor
      await target.update(updateData);

      successfulApplications++;
      results.push({
        target: target,
        actualDamage: actualDamage,
        hpDamage: hpDamage,
        finalHpDamage: finalHpDamage,
        armorSlotsUsed: armorSlotsToApply,
        newHealth: newHealth,
        maxHealth: maxHealth,
        thresholds: thresholds
      });

    } catch (error) {
      console.error(`Error applying damage to ${target.name}:`, error);
      ui.notifications.error(`Error applying damage to ${target.name}.`);
    }
  }

  if (successfulApplications === 0) {
    return { success: false, undoId: null };
  }

  // Store undo data only if we had successful applications and createUndo is true
  if (createUndo && undoRecord && undoRecord.actors.length > 0) {
    undoData.set(undoId, undoRecord);
  }

  // Send chat messages for successful applications
  await _sendDamageApplicationMessages(results, sourceActor, damageAmount, createUndo ? undoId : null);

  // Success notification
  const targetNames = results.map(r => r.target.name).join(", ");
  const message = `Applied damage to: ${targetNames}`;
  ui.notifications.info(message);

  return { success: true, undoId: createUndo ? undoId : null };
}

/**
 * Apply healing to target actors (multiple targets supported)
 * @param {Actor[]|Actor|null} targetActors - The actors to heal (optional, will auto-select)
 * @param {number} healAmount - The amount of healing to apply
 * @param {Actor|null} sourceActor - The actor providing the healing (optional)
 * @param {boolean} createUndo - Whether to create undo data (default: true)
 * @returns {Promise<Object>} Result object with success status and undo data
 */
export async function applyHealing(targetActors = null, healAmount, sourceActor = null, createUndo = true) {
  // Validate heal amount
  if (!Number.isInteger(healAmount) || healAmount <= 0) {
    console.error("Heal amount must be a positive integer");
    ui.notifications.error("Heal amount must be a positive integer.");
    return { success: false, undoId: null };
  }

  let targets = targetActors;

  // Auto-select targets if not provided
  if (!targets) {
    try {
      targets = _getTargetActors();
    } catch (error) {
      console.error("Target selection failed:", error.message);
      ui.notifications.error(error.message);
      return { success: false, undoId: null };
    }
  }

  // Ensure targets is an array
  if (!Array.isArray(targets)) {
    targets = [targets];
  }

  // Validate that we have valid target actors
  if (!targets || targets.length === 0) {
    console.error("No valid target actors found for healing");
    ui.notifications.error("No valid target actors found.");
    return { success: false, undoId: null };
  }

  // Generate unique undo ID and record only if requested
  let undoId = null;
  let undoRecord = null;
  
  if (createUndo) {
    undoId = `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    undoRecord = {
      type: "healing",
      actors: [],
      healAmount: healAmount,
      sourceActorId: sourceActor?.id || null,
      timestamp: Date.now()
    };
  }

  let successfulApplications = 0;
  const results = [];

  for (const target of targets) {
    // Validate target actor
    if (!target) {
      console.warn("Skipping null target actor");
      continue;
    }

    // Check if actor has health system
    if (!target.system?.health) {
      console.warn(`Actor ${target.name} does not have a health system`);
      ui.notifications.warn(`${target.name} does not have a health system.`);
      continue;
    }

    // Allow all users to apply healing for collaborative gameplay
    // Note: Removed permission restrictions to allow any player to apply damage/healing

    const currentHealth = parseInt(target.system.health.value) || 0;
    const maxHealth = parseInt(target.system.health.max) || 6;
    
    // Store original health for undo - work with tokens directly (only if creating undo)
    if (createUndo && undoRecord) {
      const isFromToken = !!target.token;
      
      undoRecord.actors.push({
        originalHealth: currentHealth,
        actorName: target.name,
        actorType: target.type,
        isFromToken: isFromToken,
        tokenId: target.token?.id || null,
        sceneId: target.token?.scene?.id || null,
        actorId: isFromToken ? null : target.id  // Only store actor ID for non-token actors
      });
    }
    
    const newHealth = Math.max(0, currentHealth - healAmount); // Healing reduces damage
    const actualHealing = currentHealth - newHealth;

    // Check if we can actually apply healing
    if (actualHealing <= 0) {
      console.warn(`${target.name} already has no damage to heal`);
      ui.notifications.warn(`${target.name} has no damage to heal.`);
      continue;
    }

    try {
      // Update the actor's health
      await target.update({
        "system.health.value": newHealth
      });

      successfulApplications++;
      results.push({
        target: target,
        actualHealing: actualHealing,
        newHealth: newHealth,
        maxHealth: maxHealth
      });

    } catch (error) {
      console.error(`Error applying healing to ${target.name}:`, error);
      ui.notifications.error(`Error applying healing to ${target.name}.`);
    }
  }

  if (successfulApplications === 0) {
    return { success: false, undoId: null };
  }

  // Store undo data only if we had successful applications and createUndo is true
  if (createUndo && undoRecord && undoRecord.actors.length > 0) {
    undoData.set(undoId, undoRecord);
  }

  // Send chat messages for successful applications
  await _sendHealingApplicationMessages(results, sourceActor, healAmount, createUndo ? undoId : null);

  // Success notification
  const targetNames = results.map(r => r.target.name).join(", ");
  const message = `Applied healing to: ${targetNames}`;
  ui.notifications.info(message);

  return { success: true, undoId: createUndo ? undoId : null };
}

/**
 * Undo a damage or healing application by applying the reverse effect
 * @param {string} undoId - The undo ID to revert
 * @returns {Promise<boolean>} Whether the undo was successful
 */
export async function undoDamageHealing(undoId) {
  const record = undoData.get(undoId);
  if (!record) {
    console.error("Undo record not found:", undoId);
    ui.notifications.error("Undo data not found.");
    return false;
  }

  console.log("Daggerheart | Starting undo operation:", undoId, record);

  // Get all the targets that need to be restored
  const targets = [];
  
  for (const actorData of record.actors) {
    console.log("Daggerheart | Processing undo data for:", actorData);
    
    let targetActor = null;
    
    // For token-based actors, try to find them in current scene
    if (actorData.isFromToken) {
      // Search current scene tokens by name (most reliable for unlinked tokens)
      const tokens = canvas.tokens?.placeables || [];
      const token = tokens.find(t => 
        t.actor && 
        t.actor.name === actorData.actorName && 
        t.actor.type === actorData.actorType
      );
      
      if (token && token.actor) {
        targetActor = token.actor;
        console.log("Daggerheart | Found token actor in current scene:", targetActor.name);
      } else {
        console.warn(`Token actor ${actorData.actorName} not found in current scene`);
        continue;
      }
    } else {
      // For world actors
      targetActor = game.actors.get(actorData.actorId);
      if (targetActor) {
        console.log("Daggerheart | Found world actor:", targetActor.name);
      } else {
        console.warn(`World actor ${actorData.actorName} not found`);
        continue;
      }
    }
    
    if (targetActor) {
      const currentHealth = parseInt(targetActor.system.health?.value) || 0;
      const targetHealth = actorData.originalHealth;
      const healthDifference = currentHealth - targetHealth;
      
      // Get armor slot data if present
      let armorData = null;
      if (actorData.originalArmorSlots !== undefined && actorData.armorSlotsApplied !== undefined) {
        const currentArmorSlots = parseInt(targetActor.system.defenses?.["armor-slots"]?.value) || 0;
        armorData = {
          current: currentArmorSlots,
          original: actorData.originalArmorSlots,
          applied: actorData.armorSlotsApplied
        };
      }
      
      console.log("Daggerheart | Health analysis:", {
        actorName: targetActor.name,
        currentHealth: currentHealth,
        targetHealth: targetHealth,
        difference: healthDifference,
        armorData: armorData
      });
      
      targets.push({
        actor: targetActor,
        originalHealth: targetHealth,
        currentHealth: currentHealth,
        healthDifference: healthDifference,
        armorData: armorData
      });
    }
  }

  if (targets.length === 0) {
    ui.notifications.warn("No targets found for undo operation.");
    return false;
  }

  // Apply the reverse effects
  let successfulUndos = 0;
  const results = [];

  for (const targetData of targets) {
    const { actor, originalHealth, currentHealth, healthDifference, armorData } = targetData;
    
    try {
      // Prepare update data
      const updateData = {};
      let needsUpdate = false;
      
      // Handle health restoration
      if (healthDifference > 0) {
        // Actor took damage, so heal them back
        console.log(`Daggerheart | Healing ${actor.name} by ${healthDifference} to restore to ${originalHealth}`);
        const healResult = await applyHealing([actor], healthDifference, null, false);
        if (healResult.success) {
          successfulUndos++;
          results.push({ actor: actor, restoredHealth: originalHealth });
        }
      } else if (healthDifference < 0) {
        // Actor was healed, so damage them back
        const damageAmount = Math.abs(healthDifference);
        console.log(`Daggerheart | Damaging ${actor.name} by ${damageAmount} to restore to ${originalHealth}`);
        const damageResult = await applyDamage([actor], damageAmount, null, false, 0); // Don't use armor for undo
        if (damageResult.success) {
          successfulUndos++;
          results.push({ actor: actor, restoredHealth: originalHealth });
        }
      } else {
        // No health change needed
        console.log(`Daggerheart | ${actor.name} already at target health ${originalHealth}`);
        successfulUndos++;
        results.push({ actor: actor, restoredHealth: originalHealth });
      }
      
      // Handle armor slot restoration separately
      if (armorData && armorData.applied > 0) {
        console.log(`Daggerheart | Restoring ${actor.name} armor slots from ${armorData.current} to ${armorData.original}`);
        updateData["system.defenses.armor-slots.value"] = armorData.original;
        needsUpdate = true;
      }
      
      // Apply armor updates if needed
      if (needsUpdate) {
        await actor.update(updateData);
        console.log(`Daggerheart | Restored armor slots for ${actor.name}`);
      }
      
    } catch (error) {
      console.error(`Error undoing changes for ${actor.name}:`, error);
      ui.notifications.error(`Error undoing changes for ${actor.name}.`);
    }
  }

  console.log("Daggerheart | Undo operation completed:", {
    successfulUndos,
    totalTargets: targets.length
  });

  if (successfulUndos > 0) {
    // Remove the undo record
    undoData.delete(undoId);

    // Send undo chat message
    await _sendUndoMessage(record, results);

    // Success notification
    const targetNames = results.map(r => r.actor.name).join(", ");
    const actionType = record.type === "damage" ? "damage" : "healing";
    ui.notifications.info(`Undid ${actionType} for: ${targetNames}`);

    return true;
  }

  return false;
}

/**
 * Get target actors for damage/healing application (supports multiple targets)
 * Priority: Targeted tokens > Selected tokens > Error
 * @returns {Actor[]} Array of target actors with token reference
 * @throws {Error} If no valid targets are found
 */
function _getTargetActors() {
  const actors = [];

  // Check for targeted tokens first (priority)
  const targets = Array.from(game.user.targets);
  if (targets.length > 0) {
    for (const token of targets) {
      if (!token.actor) {
        throw new Error("One or more targeted tokens have no associated actor.");
      }
      // Create a wrapper object that includes both actor and token for permission checking
      const actorWrapper = Object.create(token.actor);
      actorWrapper._sourceToken = token;
      // Add a getter for token that returns the source token
      Object.defineProperty(actorWrapper, 'token', {
        get: function() { return this._sourceToken; },
        enumerable: true,
        configurable: true
      });
      actors.push(actorWrapper);
    }
    return actors;
  }

  // Check for selected tokens
  const controlled = canvas.tokens?.controlled || [];
  if (controlled.length > 0) {
    for (const token of controlled) {
      if (!token.actor) {
        throw new Error("One or more selected tokens have no associated actor.");
      }
      // Create a wrapper object that includes both actor and token for permission checking
      const actorWrapper = Object.create(token.actor);
      actorWrapper._sourceToken = token;
      // Add a getter for token that returns the source token
      Object.defineProperty(actorWrapper, 'token', {
        get: function() { return this._sourceToken; },
        enumerable: true,
        configurable: true
      });
      actors.push(actorWrapper);
    }
    return actors;
  }

  // No valid targets found
  throw new Error("No tokens targeted or selected. Please target or select one or more tokens.");
}

/**
 * Calculate HP damage based on damage amount and thresholds
 * @param {number} damageAmount - The rolled damage amount
 * @param {Object} thresholds - The actor's damage thresholds
 * @returns {number} The HP damage to apply (1, 2, or 3)
 */
function _calculateDamageToHP(damageAmount, thresholds) {
  const severeThreshold = parseInt(thresholds.severe) || 0;
  const majorThreshold = parseInt(thresholds.major) || 0;
  
  // Check severe threshold first
  // If severe threshold is 0, it means always severe damage
  // Otherwise, check if damage meets the threshold
  if (severeThreshold === 0 || (severeThreshold > 0 && damageAmount >= severeThreshold)) {
    return 3; // Severe damage
  }
  
  // Check major threshold
  // If major threshold is 0, it means always major damage (when not severe)
  // Otherwise, check if damage meets the threshold
  if (majorThreshold === 0 || (majorThreshold > 0 && damageAmount >= majorThreshold)) {
    return 2; // Major damage
  }
  
  return 1; // Minor damage
}

/**
 * Get a description of the threshold result for chat messages
 * @param {number} damageAmount - The rolled damage amount
 * @param {Object} thresholds - The actor's damage thresholds
 * @param {number} hpDamage - The resulting HP damage
 * @returns {string} Description of the threshold result
 */
function _getThresholdDescription(damageAmount, thresholds, hpDamage) {
  const severeThreshold = parseInt(thresholds.severe) || 0;
  const majorThreshold = parseInt(thresholds.major) || 0;
  
  if (hpDamage === 3) {
    if (severeThreshold === 0) {
      return `Always Severe Damage (Severe Threshold: 0) = 3 HP`;
    } else {
      return `${damageAmount} ≥ ${severeThreshold} (Severe Threshold) = 3 HP`;
    }
  } else if (hpDamage === 2) {
    if (majorThreshold === 0) {
      return `Always Major+ Damage (Major Threshold: 0) = 2 HP`;
    } else {
      return `${damageAmount} ≥ ${majorThreshold} (Major Threshold) = 2 HP`;
    }
  } else {
    if (majorThreshold === 0) {
      // This shouldn't happen with the new logic, but just in case
      return `${damageAmount} (Minor Damage) = 1 HP`;
    } else {
      return `${damageAmount} < ${majorThreshold} (Minor Threshold) = 1 HP`;
    }
  }
}

/**
 * Extract damage/healing amount from a chat message roll
 * @param {ChatMessage} message - The chat message to extract from
 * @returns {number|null} The damage/healing amount, or null if not found
 */
export function extractRollTotal(message) {
  try {
    if (message.rolls && message.rolls.length > 0) {
      return message.rolls[0].total;
    }
    return null;
  } catch (error) {
    console.error("Error extracting roll total:", error);
    return null;
  }
}

/**
 * Roll damage dice and create a chat message with application buttons
 * @param {string} formula - The dice formula to roll (e.g., "1d4+1", "2d6")
 * @param {Object} options - Additional options
 * @param {Actor|null} options.sourceActor - The actor rolling the damage
 * @param {string|null} options.flavor - Custom flavor text
 * @param {boolean} options.sendToChat - Whether to send to chat (default: true)
 * @param {boolean} options.returnRoll - Whether to return the roll object (default: false)
 * @returns {Promise<Roll|Object>} The roll result or roll object
 */
export async function rollDamage(formula, options = {}) {
  const defaults = {
    sourceActor: null,
    flavor: null,
    sendToChat: true,
    returnRoll: false
  };
  
  const config = { ...defaults, ...options };
  
  // Validate formula
  if (!formula || typeof formula !== 'string') {
    console.error("Damage roll requires a valid dice formula");
    ui.notifications.error("Damage roll requires a valid dice formula.");
    return null;
  }
  
  // Create and evaluate the roll
  let roll;
  try {
    roll = new Roll(formula);
    await roll.evaluate();
  } catch (error) {
    console.error("Invalid damage roll formula:", error);
    ui.notifications.error("Invalid damage roll formula.");
    return null;
  }
  
  if (config.sendToChat) {
    const flavorText = config.flavor || `<p class="roll-flavor-line"><b>Damage Roll</b></p>`;
    
    try {
      // Let Foundry handle the roll rendering automatically, then add damage/healing buttons
      const chatMessage = await ChatMessage.create({
        flavor: flavorText,
        user: game.user.id,
        speaker: config.sourceActor ? ChatMessage.getSpeaker({ actor: config.sourceActor }) : ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        rollMode: "roll",
        flags: {
          daggerheart: {
            rollType: "damage",
            actorId: config.sourceActor?.id || null,
            actorType: config.sourceActor?.type || null,
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
      console.error("Error creating damage roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but damage was rolled.");
    }
  }
  
  if (config.returnRoll) {
    return roll;
  }
  
  return {
    total: roll.total,
    formula: roll.formula,
    roll: roll
  };
}

/**
 * Roll healing dice and create a chat message with application buttons
 * @param {string} formula - The dice formula to roll (e.g., "1d4+1", "2d6")
 * @param {Object} options - Additional options
 * @param {Actor|null} options.sourceActor - The actor rolling the healing
 * @param {string|null} options.flavor - Custom flavor text
 * @param {boolean} options.sendToChat - Whether to send to chat (default: true)
 * @param {boolean} options.returnRoll - Whether to return the roll object (default: false)
 * @returns {Promise<Roll|Object>} The roll result or roll object
 */
export async function rollHealing(formula, options = {}) {
  const defaults = {
    sourceActor: null,
    flavor: null,
    sendToChat: true,
    returnRoll: false
  };
  
  const config = { ...defaults, ...options };
  
  // Validate formula
  if (!formula || typeof formula !== 'string') {
    console.error("Healing roll requires a valid dice formula");
    ui.notifications.error("Healing roll requires a valid dice formula.");
    return null;
  }
  
  // Create and evaluate the roll
  let roll;
  try {
    roll = new Roll(formula);
    await roll.evaluate();
  } catch (error) {
    console.error("Invalid healing roll formula:", error);
    ui.notifications.error("Invalid healing roll formula.");
    return null;
  }
  
  if (config.sendToChat) {
    const flavorText = config.flavor || `<p class="roll-flavor-line"><b>Healing Roll</b></p>`;
    
    try {
      // Let Foundry handle the roll rendering automatically, then add damage/healing buttons
      const chatMessage = await ChatMessage.create({
        flavor: flavorText,
        user: game.user.id,
        speaker: config.sourceActor ? ChatMessage.getSpeaker({ actor: config.sourceActor }) : ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        rollMode: "roll",
        flags: {
          daggerheart: {
            rollType: "healing",
            actorId: config.sourceActor?.id || null,
            actorType: config.sourceActor?.type || null,
            healingAmount: roll.total,
            isManualRoll: true
          }
        }
      });
      
      // Wait for Dice So Nice! animation to complete
      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating healing roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but healing was rolled.");
    }
  }
  
  if (config.returnRoll) {
    return roll;
  }
  
  return {
    total: roll.total,
    formula: roll.formula,
    roll: roll
  };
}

/**
 * Send chat messages for damage application (supports multiple targets)
 * @private
 */
async function _sendDamageApplicationMessages(results, sourceActor, damageAmount, undoId) {
  // Group results for batch messaging
  let publicMessages = [];
  let gmMessages = [];
  
  for (const result of results) {
    const { target, actualDamage, hpDamage, finalHpDamage, armorSlotsUsed, newHealth, maxHealth, thresholds } = result;
    
    // Determine damage severity for message
    let severityText = "";
    let severityClass = "";
    let severityLevel = 1;
    
    if (hpDamage >= 3) {
      severityText = "Severe";
      severityClass = "severe-damage";
      severityLevel = 3;
    } else if (hpDamage >= 2) {
      severityText = "Major";
      severityClass = "major-damage";
      severityLevel = 2;
    } else {
      severityText = "Minor";
      severityClass = "minor-damage";
      severityLevel = 1;
    }
    
    // Check if character is dead
    const isDead = newHealth >= maxHealth;
    const deathWarning = isDead ? `<p class="death-warning"><i class="fas fa-skull"></i> ${target.name} has fallen!</p>` : "";
    
    // Build armor reduction text
    let armorReductionText = "";
    if (armorSlotsUsed > 0) {
      const damageReduction = hpDamage - finalHpDamage;
      if (damageReduction > 0) {
        armorReductionText = ` (${hpDamage} reduced by ${armorSlotsUsed} armor)`;
      }
    }
    
    // Public message content (visible to all)
    let publicContent = `
      <div class="damage-application-result ${severityClass}">
        <p class="damage-summary">
          <i class="fas fa-sword"></i> <strong>${severityText} Damage Applied</strong>
        </p>
        <p class="target-info">
          ${target.name} takes <strong>${finalHpDamage} HP damage</strong>${armorReductionText}${sourceActor ? ` from ${sourceActor.name}` : ''}.
        </p>
        <p class="damage-roll">Damage Roll: ${damageAmount}</p>
        ${armorSlotsUsed > 0 ? `<p class="armor-used">Armor Slots Used: ${armorSlotsUsed}</p>` : ''}
        ${deathWarning}
        ${undoId ? `<button class="undo-damage-button" data-undo-id="${undoId}"><i class="fas fa-undo"></i> Undo</button>` : ''}
      </div>
    `;
    
    publicMessages.push({
      content: publicContent,
      target: target
    });
    
    // GM-only detailed message
    const detailedThresholdInfo = _getThresholdDescription(damageAmount, thresholds, hpDamage);
    let gmContent = `
      <div class="damage-application-detail gm-only">
        <p class="threshold-calculation">
          <i class="fas fa-calculator"></i> <strong>Threshold Calculation</strong>
        </p>
        <p>${detailedThresholdInfo}</p>
        ${armorSlotsUsed > 0 ? `<p>Armor Reduction: ${hpDamage} HP - ${armorSlotsUsed} armor = ${finalHpDamage} HP final</p>` : ''}
        <p>Current HP: ${newHealth}/${maxHealth}</p>
      </div>
    `;
    
    gmMessages.push({
      content: gmContent,
      target: target
    });
  }
  
  // Send public messages
  for (const msg of publicMessages) {
    await ChatMessage.create({
      content: msg.content,
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: msg.target }),
      flags: {
        daggerheart: {
          messageType: "damageApplied",
          targetActorId: msg.target.id,
          sourceActorId: sourceActor?.id || null,
          damageRoll: damageAmount,
          undoId: undoId
        }
      }
    });
  }
  
  // Send GM-only messages
  if (game.user.isGM || gmMessages.length > 0) {
    for (const msg of gmMessages) {
      await ChatMessage.create({
        content: msg.content,
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: msg.target }),
        whisper: game.users.filter(u => u.isGM).map(u => u.id),
        flags: {
          daggerheart: {
            messageType: "damageAppliedDetail",
            targetActorId: msg.target.id
          }
        }
      });
    }
  }
}

/**
 * Send healing application chat messages for multiple targets
 * @param {Array} results - Array of healing application results
 * @param {Actor|null} sourceActor - The source actor
 * @param {number} healAmount - The original heal amount
 * @param {string} undoId - The undo ID for this application
 */
async function _sendHealingApplicationMessages(results, sourceActor, healAmount, undoId) {
  const sourceText = sourceActor ? ` from <strong>${sourceActor.name}</strong>` : "";
  
  for (const result of results) {
    const { target, actualHealing, newHealth, maxHealth } = result;
    
    const chatContent = `<div class="healing-application-message">
      <h3><i class="fas fa-heart"></i> Healing Applied</h3>
      <p><strong>${target.name}</strong> heals <strong>${actualHealing} HP</strong>${sourceText}.</p>
      <div class="healing-details">
        <p><strong>Healing Roll:</strong> ${healAmount}</p>
      </div>
      ${newHealth === 0 ? '<p class="healing-success"><em><i class="fas fa-sparkles"></i> Fully healed!</em></p>' : ''}
      ${undoId ? `<div class="healing-undo-container" style="margin-top: 0.5em;">
        <button class="undo-healing-button" data-undo-id="${undoId}" style="width: 100%;">
          <i class="fas fa-undo"></i> Undo
        </button>
      </div>` : ''}
    </div>`;

    // Send the main healing message (visible to all players)
    await ChatMessage.create({
      user: game.user.id,
      speaker: sourceActor ? ChatMessage.getSpeaker({ actor: sourceActor }) : ChatMessage.getSpeaker(),
      content: chatContent,
      flags: {
        daggerheart: {
          messageType: "healingApplied",
          targetActorId: target.id,
          sourceActorId: sourceActor?.id || null,
          healingRoll: healAmount,
          hpHealed: actualHealing,
          currentHealth: newHealth,
          maxHealth: maxHealth,
          undoId: undoId
        }
      }
    });

    // Send GM-only message with mechanical details
    const gmContent = `<div class="healing-gm-info">
      <h4><i class="fas fa-eye"></i> GM Info: ${target.name}</h4>
      <p><strong>Current Damage:</strong> ${newHealth}/${maxHealth}</p>
    </div>`;

    await ChatMessage.create({
      user: game.user.id,
      speaker: sourceActor ? ChatMessage.getSpeaker({ actor: sourceActor }) : ChatMessage.getSpeaker(),
      content: gmContent,
      whisper: ChatMessage.getWhisperRecipients("GM"),
      flags: {
        daggerheart: {
          messageType: "healingGMInfo",
          targetActorId: target.id,
          sourceActorId: sourceActor?.id || null
        }
      }
    });
  }
}

/**
 * Send undo confirmation chat message
 * @param {Object} record - The undo record
 * @param {Array} results - Array of undo results
 */
async function _sendUndoMessage(record, results) {
  const actionType = record.type === "damage" ? "damage" : "healing";
  const actionIcon = record.type === "damage" ? "fa-sword" : "fa-heart";
  const targetNames = results.map(r => r.actor.name).join(", ");
  
  const chatContent = `<div class="undo-message">
    <h3><i class="fas fa-undo"></i> ${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Undone</h3>
    <p>Reverted ${actionType} application for: <strong>${targetNames}</strong></p>
    <div class="undo-details">
      <p><em>Health values restored to previous state.</em></p>
    </div>
  </div>`;

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker(),
    content: chatContent,
    flags: {
      daggerheart: {
        messageType: "undoApplied",
        undoType: record.type,
        actorCount: results.length
      }
    }
  });
}

/**
 * Get available armor slots for an actor
 * @param {Actor} actor - The actor to check
 * @returns {Object} Object with current, max, and available armor slots
 */
export function getActorArmorSlots(actor) {
  if (!actor || actor.type !== 'character') {
    return { current: 0, max: 0, available: 0 };
  }
  
  const current = parseInt(actor.system.defenses?.["armor-slots"]?.value) || 0;
  const max = parseInt(actor.system.defenses?.["armor-slots"]?.max) || 0;
  const available = max - current;
  
  return { current, max, available };
}

/**
 * Check if an actor can use armor slots
 * @param {Actor} actor - The actor to check
 * @returns {boolean} True if actor can use armor slots
 */
export function canUseArmorSlots(actor) {
  if (!actor || actor.type !== 'character') {
    return false;
  }
  
  const armorSlots = getActorArmorSlots(actor);
  return armorSlots.available > 0;
}

/**
 * Debug undo data for a specific operation
 * @param {string} undoId - The undo ID to debug
 */
export function debugUndoData(undoId) {
  const record = undoData.get(undoId);
  if (!record) {
    console.error("Debug: Undo record not found:", undoId);
    return;
  }
  
  console.log("Debug: Undo record analysis:", record);
  
  for (const actorData of record.actors) {
    console.log("Debug: Actor data:", actorData);
    
    // Check world actors
    const worldActor = game.actors.get(actorData.actorId);
    console.log("Debug: World actor found:", !!worldActor, worldActor?.name);
    
    // Check scene tokens
    if (actorData.sceneId && actorData.tokenId) {
      const scene = game.scenes.get(actorData.sceneId);
      const token = scene?.tokens.get(actorData.tokenId);
      console.log("Debug: Scene token found:", !!token, token?.actor?.name);
    }
    
    // Check current scene tokens
    const currentTokens = canvas.tokens?.placeables || [];
    const currentToken = currentTokens.find(t => t.actor?.id === actorData.actorId);
    console.log("Debug: Current scene token found:", !!currentToken, currentToken?.actor?.name);
  }
} 