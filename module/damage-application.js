/**
 * Damage Application System for Daggerheart
 * Handles applying damage and healing based on threshold system
 */

/**
 * Apply damage to a target actor based on damage thresholds
 * @param {Actor|null} targetActor - The actor to apply damage to (optional, will auto-select)
 * @param {number} damageAmount - The amount of damage rolled
 * @param {Actor|null} sourceActor - The actor causing the damage (optional)
 * @returns {Promise<boolean>}
 */
export async function applyDamage(targetActor = null, damageAmount, sourceActor = null) {
  // Validate damage amount
  if (!Number.isInteger(damageAmount) || damageAmount <= 0) {
    console.error("Damage amount must be a positive integer");
    ui.notifications.error("Damage amount must be a positive integer.");
    return false;
  }

  let target = targetActor;

  // Auto-select target if not provided
  if (!target) {
    try {
      target = _getTargetActor();
    } catch (error) {
      console.error("Target selection failed:", error.message);
      ui.notifications.error(error.message);
      return false;
    }
  }

  // Validate that we have a valid target actor
  if (!target) {
    console.error("No valid target actor found for damage application");
    ui.notifications.error("No valid target actor found.");
    return false;
  }

  // Check if actor has health system
  if (!target.system?.health || !target.system?.threshold) {
    console.error(`Actor ${target.name} does not have a health/threshold system`);
    ui.notifications.error(`${target.name} does not have a health/threshold system.`);
    return false;
  }

  // Check permissions
  const canModify = game.user.isGM || 
                   game.user.hasRole("ASSISTANT") || 
                   target.isOwner;
  
  if (!canModify) {
    console.warn(`User does not have permission to modify ${target.name}'s health`);
    ui.notifications.warn(`You do not have permission to modify ${target.name}'s health.`);
    return false;
  }

  const currentHealth = parseInt(target.system.health.value) || 0;
  const maxHealth = parseInt(target.system.health.max) || 6;
  const thresholds = target.system.threshold;
  
  // Calculate HP damage based on thresholds
  const hpDamage = _calculateDamageToHP(damageAmount, thresholds);
  const newHealth = Math.min(maxHealth, currentHealth + hpDamage);
  const actualDamage = newHealth - currentHealth;

  // Check if we can actually apply damage
  if (actualDamage <= 0) {
    console.warn(`${target.name} already has maximum damage (${maxHealth})`);
    ui.notifications.warn(`${target.name} is already at maximum damage.`);
    return false;
  }

  try {
    // Update the actor's health
    await target.update({
      "system.health.value": newHealth
    });

    // Determine damage severity for message
    let severityText = "";
    let severityClass = "";
    if (hpDamage === 3) {
      severityText = "Major Damage";
      severityClass = "damage-major";
    } else if (hpDamage === 2) {
      severityText = "Minor Damage"; 
      severityClass = "damage-minor";
    } else {
      severityText = "Light Damage";
      severityClass = "damage-light";
    }

    // Success notification
    const message = `${target.name} takes ${actualDamage} HP damage (${severityText}). Current damage: ${newHealth}/${maxHealth}`;
    ui.notifications.info(message);

    // Send detailed chat message
    const sourceText = sourceActor ? ` from <strong>${sourceActor.name}</strong>` : "";
    const chatContent = `<div class="damage-application-message ${severityClass}">
      <h3><i class="fas fa-sword"></i> ${severityText} Applied</h3>
      <p><strong>${target.name}</strong> takes <strong>${actualDamage} HP</strong> damage${sourceText}.</p>
      <div class="damage-details">
        <p><strong>Damage Roll:</strong> ${damageAmount}</p>
        <p><strong>Threshold Result:</strong> ${_getThresholdDescription(damageAmount, thresholds, hpDamage)}</p>
        <p><strong>Current Damage:</strong> ${newHealth}/${maxHealth}</p>
      </div>
      ${newHealth >= maxHealth ? '<p class="damage-warning"><em><i class="fas fa-skull"></i> Character is dying!</em></p>' : ''}
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
          maxHealth: maxHealth
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Error applying damage:", error);
    ui.notifications.error("Error applying damage. Check console for details.");
    return false;
  }
}

/**
 * Apply healing to a target actor
 * @param {Actor|null} targetActor - The actor to heal (optional, will auto-select)
 * @param {number} healAmount - The amount of healing to apply
 * @param {Actor|null} sourceActor - The actor providing the healing (optional)
 * @returns {Promise<boolean>}
 */
export async function applyHealing(targetActor = null, healAmount, sourceActor = null) {
  // Validate heal amount
  if (!Number.isInteger(healAmount) || healAmount <= 0) {
    console.error("Heal amount must be a positive integer");
    ui.notifications.error("Heal amount must be a positive integer.");
    return false;
  }

  let target = targetActor;

  // Auto-select target if not provided
  if (!target) {
    try {
      target = _getTargetActor();
    } catch (error) {
      console.error("Target selection failed:", error.message);
      ui.notifications.error(error.message);
      return false;
    }
  }

  // Validate that we have a valid target actor
  if (!target) {
    console.error("No valid target actor found for healing");
    ui.notifications.error("No valid target actor found.");
    return false;
  }

  // Check if actor has health system
  if (!target.system?.health) {
    console.error(`Actor ${target.name} does not have a health system`);
    ui.notifications.error(`${target.name} does not have a health system.`);
    return false;
  }

  // Check permissions
  const canModify = game.user.isGM || 
                   game.user.hasRole("ASSISTANT") || 
                   target.isOwner;
  
  if (!canModify) {
    console.warn(`User does not have permission to modify ${target.name}'s health`);
    ui.notifications.warn(`You do not have permission to modify ${target.name}'s health.`);
    return false;
  }

  const currentHealth = parseInt(target.system.health.value) || 0;
  const maxHealth = parseInt(target.system.health.max) || 6;
  const newHealth = Math.max(0, currentHealth - healAmount); // Healing reduces damage
  const actualHealing = currentHealth - newHealth;

  // Check if we can actually apply healing
  if (actualHealing <= 0) {
    console.warn(`${target.name} already has no damage to heal`);
    ui.notifications.warn(`${target.name} has no damage to heal.`);
    return false;
  }

  try {
    // Update the actor's health
    await target.update({
      "system.health.value": newHealth
    });

    // Success notification
    const message = `${target.name} heals ${actualHealing} HP. Current damage: ${newHealth}/${maxHealth}`;
    ui.notifications.info(message);

    // Send detailed chat message
    const sourceText = sourceActor ? ` from <strong>${sourceActor.name}</strong>` : "";
    const chatContent = `<div class="healing-application-message">
      <h3><i class="fas fa-heart"></i> Healing Applied</h3>
      <p><strong>${target.name}</strong> heals <strong>${actualHealing} HP</strong>${sourceText}.</p>
      <div class="healing-details">
        <p><strong>Healing Roll:</strong> ${healAmount}</p>
        <p><strong>Current Damage:</strong> ${newHealth}/${maxHealth}</p>
      </div>
      ${newHealth === 0 ? '<p class="healing-success"><em><i class="fas fa-sparkles"></i> Fully healed!</em></p>' : ''}
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
          maxHealth: maxHealth
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Error applying healing:", error);
    ui.notifications.error("Error applying healing. Check console for details.");
    return false;
  }
}

/**
 * Get the target actor for damage/healing application
 * Priority: Targeted tokens > Selected tokens > Error
 * @returns {Actor} The target actor
 * @throws {Error} If no valid target is found
 */
function _getTargetActor() {
  // Check for targeted tokens first
  const targets = Array.from(game.user.targets);
  if (targets.length === 1) {
    if (!targets[0].actor) {
      throw new Error("Targeted token has no associated actor.");
    }
    return targets[0].actor;
  }
  
  if (targets.length > 1) {
    throw new Error("Multiple tokens targeted. Please target only one token.");
  }

  // Check for selected tokens
  const controlled = canvas.tokens?.controlled || [];
  if (controlled.length === 1) {
    if (!controlled[0].actor) {
      throw new Error("Selected token has no associated actor.");
    }
    return controlled[0].actor;
  }
  
  if (controlled.length > 1) {
    throw new Error("Multiple tokens selected. Please select only one token.");
  }

  // No valid target found
  throw new Error("No token targeted or selected. Please target or select a token.");
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
    return `${damageAmount} ≥ ${majorThreshold} (Major Threshold) = 3 HP`;
  } else if (hpDamage === 2) {
    return `${damageAmount} ≥ ${minorThreshold} (Minor Threshold) = 2 HP`;
  } else {
    return `${damageAmount} < ${minorThreshold} (Below Minor Threshold) = 1 HP`;
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