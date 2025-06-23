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
 * @returns {Promise<Object>} Result object with success status and undo data
 */
export async function applyDamage(targetActors = null, damageAmount, sourceActor = null) {
  // Validate damage amount
  if (!Number.isInteger(damageAmount) || damageAmount <= 0) {
    console.error("Damage amount must be a positive integer");
    ui.notifications.error("Damage amount must be a positive integer.");
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

  // Generate unique undo ID
  const undoId = `damage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const undoRecord = {
    type: "damage",
    actors: [],
    damageAmount: damageAmount,
    sourceActorId: sourceActor?.id || null,
    timestamp: Date.now()
  };

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

    // Check permissions
    const canModify = game.user.isGM || 
                     game.user.hasRole("ASSISTANT") || 
                     target.isOwner;
    
    if (!canModify) {
      console.warn(`User does not have permission to modify ${target.name}'s health`);
      ui.notifications.warn(`You do not have permission to modify ${target.name}'s health.`);
      continue;
    }

    const currentHealth = parseInt(target.system.health.value) || 0;
    const maxHealth = parseInt(target.system.health.max) || 6;
    const thresholds = target.system.threshold;
    
    // Store original health for undo
    // For unlinked tokens, we need to store the token's actor ID, not the base actor ID
    const isTokenActor = !!target.token;
    const actualActorId = isTokenActor && !target.isLinked ? target.id : target._id || target.id;
    const baseActorId = isTokenActor ? target.token.baseActor.id : target.id;
    
    undoRecord.actors.push({
      actorId: actualActorId,           // The actual actor ID to update
      baseActorId: baseActorId,         // The base actor ID for reference  
      originalHealth: currentHealth,
      actorName: target.name,
      actorType: target.type,
      isToken: isTokenActor,
      isLinked: target.isLinked,
      tokenId: target.token?.id || null,
      sceneId: target.token?.scene?.id || null
    });
    
    // Calculate HP damage based on thresholds
    const hpDamage = _calculateDamageToHP(damageAmount, thresholds);
    const newHealth = Math.min(maxHealth, currentHealth + hpDamage);
    const actualDamage = newHealth - currentHealth;

    // Check if we can actually apply damage
    if (actualDamage <= 0) {
      console.warn(`${target.name} already has maximum damage (${maxHealth})`);
      ui.notifications.warn(`${target.name} is already at maximum damage.`);
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
        actualDamage: actualDamage,
        hpDamage: hpDamage,
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

  // Store undo data only if we had successful applications
  undoData.set(undoId, undoRecord);

  // Send chat messages for successful applications
  await _sendDamageApplicationMessages(results, sourceActor, damageAmount, undoId);

  // Success notification
  const targetNames = results.map(r => r.target.name).join(", ");
  const message = `Applied damage to: ${targetNames}`;
  ui.notifications.info(message);

  return { success: true, undoId: undoId };
}

/**
 * Apply healing to target actors (multiple targets supported)
 * @param {Actor[]|Actor|null} targetActors - The actors to heal (optional, will auto-select)
 * @param {number} healAmount - The amount of healing to apply
 * @param {Actor|null} sourceActor - The actor providing the healing (optional)
 * @returns {Promise<Object>} Result object with success status and undo data
 */
export async function applyHealing(targetActors = null, healAmount, sourceActor = null) {
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

  // Generate unique undo ID
  const undoId = `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const undoRecord = {
    type: "healing",
    actors: [],
    healAmount: healAmount,
    sourceActorId: sourceActor?.id || null,
    timestamp: Date.now()
  };

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

    // Check permissions
    const canModify = game.user.isGM || 
                     game.user.hasRole("ASSISTANT") || 
                     target.isOwner;
    
    if (!canModify) {
      console.warn(`User does not have permission to modify ${target.name}'s health`);
      ui.notifications.warn(`You do not have permission to modify ${target.name}'s health.`);
      continue;
    }

    const currentHealth = parseInt(target.system.health.value) || 0;
    const maxHealth = parseInt(target.system.health.max) || 6;
    
    // Store original health for undo
    // For unlinked tokens, we need to store the token's actor ID, not the base actor ID
    const isTokenActor = !!target.token;
    const actualActorId = isTokenActor && !target.isLinked ? target.id : target._id || target.id;
    const baseActorId = isTokenActor ? target.token.baseActor.id : target.id;
    
    undoRecord.actors.push({
      actorId: actualActorId,           // The actual actor ID to update
      baseActorId: baseActorId,         // The base actor ID for reference  
      originalHealth: currentHealth,
      actorName: target.name,
      actorType: target.type,
      isToken: isTokenActor,
      isLinked: target.isLinked,
      tokenId: target.token?.id || null,
      sceneId: target.token?.scene?.id || null
    });
    
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

  // Store undo data only if we had successful applications
  undoData.set(undoId, undoRecord);

  // Send chat messages for successful applications
  await _sendHealingApplicationMessages(results, sourceActor, healAmount, undoId);

  // Success notification
  const targetNames = results.map(r => r.target.name).join(", ");
  const message = `Applied healing to: ${targetNames}`;
  ui.notifications.info(message);

  return { success: true, undoId: undoId };
}

/**
 * Undo a damage or healing application
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

  let successfulUndos = 0;
  const results = [];

  for (const actorData of record.actors) {
    console.log("Daggerheart | Processing undo for actor:", actorData);
    
    let actor = null;
    
    // For token actors, find the specific token's actor
    if (actorData.isToken && actorData.tokenId && actorData.sceneId) {
      const scene = game.scenes.get(actorData.sceneId);
      if (scene) {
        const tokenDoc = scene.tokens.get(actorData.tokenId);
        if (tokenDoc && tokenDoc.actor) {
          actor = tokenDoc.actor;
          console.log("Daggerheart | Found token actor:", actor.name, "ID:", actor.id);
        }
      }
    }
    
    // Try to find in current scene if not found in stored scene
    if (!actor && actorData.isToken) {
      console.log("Daggerheart | Searching current scene for token actor...");
      const tokens = canvas.tokens?.placeables || [];
      for (const token of tokens) {
        if (token.actor && token.actor.id === actorData.actorId) {
          actor = token.actor;
          console.log("Daggerheart | Found actor in current scene:", actor.name);
          break;
        }
      }
    }
    
    // For non-token actors or if token not found, try world actors
    if (!actor) {
      actor = game.actors.get(actorData.actorId);
      if (actor) {
        console.log("Daggerheart | Found world actor:", actor.name);
      }
    }
    
    // Final fallback: search by base actor ID for older undo records
    if (!actor && actorData.baseActorId) {
      actor = game.actors.get(actorData.baseActorId);
      if (actor) {
        console.log("Daggerheart | Found fallback world actor:", actor.name);
      }
    }
    
    if (!actor) {
      console.warn(`Actor ${actorData.actorName} (${actorData.actorId}) not found for undo`);
      ui.notifications.warn(`Actor ${actorData.actorName} not found for undo.`);
      continue;
    }

    console.log("Daggerheart | Found actor for undo:", actor.name, actor.type, "Current HP:", actor.system.health?.value, "Target HP:", actorData.originalHealth);

    // Check permissions with more detailed logging
    const isGM = game.user.isGM;
    const hasAssistantRole = game.user.hasRole("ASSISTANT");
    const isOwner = actor.isOwner;
    const canModify = isGM || hasAssistantRole || isOwner;
    
    console.log("Daggerheart | Permission check:", {
      isGM,
      hasAssistantRole, 
      isOwner,
      canModify,
      actorName: actor.name,
      actorType: actor.type
    });
    
    if (!canModify) {
      console.warn(`User does not have permission to modify ${actor.name}'s health for undo`);
      ui.notifications.warn(`You do not have permission to modify ${actor.name}'s health.`);
      continue;
    }

    try {
      console.log("Daggerheart | Attempting to restore health:", {
        actorName: actor.name,
        currentHealth: actor.system.health?.value,
        targetHealth: actorData.originalHealth
      });
      
      // Restore original health value
      const updateResult = await actor.update({
        "system.health.value": actorData.originalHealth
      });
      
      console.log("Daggerheart | Update result:", updateResult);
      console.log("Daggerheart | Health after update:", actor.system.health?.value);

      successfulUndos++;
      results.push({
        actor: actor,
        restoredHealth: actorData.originalHealth
      });

    } catch (error) {
      console.error(`Error undoing changes for ${actor.name}:`, error);
      ui.notifications.error(`Error undoing changes for ${actor.name}.`);
    }
  }

  console.log("Daggerheart | Undo operation completed:", {
    successfulUndos,
    totalActors: record.actors.length
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
 * @returns {Actor[]} Array of target actors
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
      actors.push(token.actor);
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
      actors.push(token.actor);
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
  const majorThreshold = parseInt(thresholds.major) || 0;
  const minorThreshold = parseInt(thresholds.minor) || 0;
  
  if (damageAmount >= majorThreshold && majorThreshold > 0) {
    return 3; // Major damage
  }
  if (damageAmount >= minorThreshold && minorThreshold > 0) {
    return 2; // Minor damage  
  }
  return 1; // Light damage
}

/**
 * Get a description of the threshold result for chat messages
 * @param {number} damageAmount - The rolled damage amount
 * @param {Object} thresholds - The actor's damage thresholds
 * @param {number} hpDamage - The resulting HP damage
 * @returns {string} Description of the threshold result
 */
function _getThresholdDescription(damageAmount, thresholds, hpDamage) {
  const majorThreshold = parseInt(thresholds.major) || 0;
  const minorThreshold = parseInt(thresholds.minor) || 0;
  
  if (hpDamage === 3) {
    return `${damageAmount} ≥ ${majorThreshold} (Severe Threshold) = 3 HP`;
  } else if (hpDamage === 2) {
    return `${damageAmount} ≥ ${minorThreshold} (Major Threshold) = 2 HP`;
  } else {
    return `${damageAmount} < ${minorThreshold} (Minor Threshold) = 1 HP`;
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
      await ChatMessage.create({
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
      await ChatMessage.create({
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
 * Send damage application chat messages for multiple targets
 * @param {Array} results - Array of damage application results
 * @param {Actor|null} sourceActor - The source actor
 * @param {number} damageAmount - The original damage amount
 * @param {string} undoId - The undo ID for this application
 */
async function _sendDamageApplicationMessages(results, sourceActor, damageAmount, undoId) {
  const sourceText = sourceActor ? ` from <strong>${sourceActor.name}</strong>` : "";
  
  for (const result of results) {
    const { target, actualDamage, hpDamage, newHealth, maxHealth, thresholds } = result;
    
    // Determine damage severity for message
    let severityText = "";
    let severityClass = "";
    if (hpDamage === 3) {
      severityText = "Severe Damage";
      severityClass = "damage-major";
    } else if (hpDamage === 2) {
      severityText = "Major Damage"; 
      severityClass = "damage-minor";
    } else {
      severityText = "Minor Damage";
      severityClass = "damage-light";
    }
    
    const chatContent = `<div class="damage-application-message ${severityClass}">
      <h3><i class="fas fa-sword"></i> ${severityText} Applied</h3>
      <p><strong>${target.name}</strong> takes <strong>${actualDamage} HP</strong> damage${sourceText}.</p>
      <div class="damage-details">
        <p><strong>Damage Roll:</strong> ${damageAmount}</p>
        <p><strong>Threshold Result:</strong> ${_getThresholdDescription(damageAmount, thresholds, hpDamage)}</p>
        <p><strong>Current Damage:</strong> ${newHealth}/${maxHealth}</p>
      </div>
      ${newHealth >= maxHealth ? '<p class="damage-warning"><em><i class="fas fa-skull"></i> Character is dying!</em></p>' : ''}
      <div class="damage-undo-container" style="margin-top: 0.5em;">
        <button class="undo-damage-button" data-undo-id="${undoId}" style="width: 100%;">
          <i class="fas fa-undo"></i> Undo
        </button>
      </div>
    </div>`;

    await ChatMessage.create({
      user: game.user.id,
      speaker: sourceActor ? ChatMessage.getSpeaker({ actor: sourceActor }) : ChatMessage.getSpeaker(),
      content: chatContent,
      flags: {
        daggerheart: {
          messageType: "damageApplied",
          targetActorId: target.id,
          sourceActorId: sourceActor?.id || null,
          damageRoll: damageAmount,
          hpDamage: actualDamage,
          severityLevel: hpDamage,
          currentHealth: newHealth,
          maxHealth: maxHealth,
          undoId: undoId
        }
      }
    });
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
        <p><strong>Current Damage:</strong> ${newHealth}/${maxHealth}</p>
      </div>
      ${newHealth === 0 ? '<p class="healing-success"><em><i class="fas fa-sparkles"></i> Fully healed!</em></p>' : ''}
      <div class="healing-undo-container" style="margin-top: 0.5em;">
        <button class="undo-healing-button" data-undo-id="${undoId}" style="width: 100%;">
          <i class="fas fa-undo"></i> Undo
        </button>
      </div>
    </div>`;

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
 * Debug function to analyze actor storage and retrieval
 * @param {string} undoId - The undo ID to analyze
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