import { DaggerheartDialogHelper } from './dialog-helper.js';

export async function _rollHope(options = {}) {
  // Dice So Nice
  if (game.dice3d) {
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
  }
  
  const defaults = {
    dieSize: 'd12',
    modifier: 0,
    sendToChat: true,
    flavor: null,
    returnRoll: false,
    speaker: null
  };
  
  const config = { ...defaults, ...options };
  
  if (config.modifier !== 0) {
    config.formula = `1${config.dieSize} + ${config.modifier}`;
  } else {
    config.formula = `1${config.dieSize}`;
  }
  
  const roll = new Roll(config.formula);
  await roll.evaluate();
  
  if (roll.dice.length > 0) {
    roll.dice[0].options.flavor = "Hope";
  }
  
  if (config.sendToChat) {
    const defaultFlavor = config.flavor || `<p class="roll-flavor-line"><b>Hope Die</b>${config.modifier !== 0 ? (config.modifier > 0 ? ` +${config.modifier}` : ` ${config.modifier}`) : ''}</p>`;
    
    await roll.toMessage({
      speaker: config.speaker || ChatMessage.getSpeaker(),
      flavor: defaultFlavor,
      flags: {
        daggerheart: {
          rollType: "hope",
          dieSize: config.dieSize,
          modifier: config.modifier
        }
      }
    });
  }
  
  if (config.returnRoll) {
    return roll;
  }
  
  return {
    value: roll.total,
    dieValue: roll.dice[0]?.total || 0,
    modifier: config.modifier,
    formula: config.formula,
    roll: roll,
    isMax: roll.dice[0]?.total === parseInt(config.dieSize.substring(1))
  };
}

export async function _rollFear(options = {}) {
  // Dice So Nice
  if (game.dice3d) {
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
  }
  
  const defaults = {
    dieSize: 'd12',
    modifier: 0,
    sendToChat: true,
    flavor: null,
    returnRoll: false,
    speaker: null
  };
  
  const config = { ...defaults, ...options };
  
  if (config.modifier !== 0) {
    config.formula = `1${config.dieSize} + ${config.modifier}`;
  } else {
    config.formula = `1${config.dieSize}`;
  }
  
  const roll = new Roll(config.formula);
  await roll.evaluate();
  
  if (roll.dice.length > 0) {
    roll.dice[0].options.flavor = "Fear";
  }
  
  if (config.sendToChat) {
    const defaultFlavor = config.flavor || `<p class="roll-flavor-line"><b>Fear Die</b>${config.modifier !== 0 ? (config.modifier > 0 ? ` +${config.modifier}` : ` ${config.modifier}`) : ''}</p>`;
    
    await roll.toMessage({
      speaker: config.speaker || ChatMessage.getSpeaker(),
      flavor: defaultFlavor,
      flags: {
        daggerheart: {
          rollType: "fear",
          dieSize: config.dieSize,
          modifier: config.modifier
        }
      }
    });
  }
  
  if (config.returnRoll) {
    return roll;
  }
  
  return {
    value: roll.total,
    dieValue: roll.dice[0]?.total || 0,
    modifier: config.modifier,
    formula: config.formula,
    roll: roll,
    isMax: roll.dice[0]?.total === parseInt(config.dieSize.substring(1))
  };
}

export async function _rollDuality(options = {}) {
  // Dice So Nice
  if (game.dice3d) {
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
  
  const defaults = {
    hopeDieSize: 'd12',
    fearDieSize: 'd12',
    modifier: 0,
    advantage: 0,
    disadvantage: 0,
    sendToChat: true,
    flavor: null,
    returnRoll: false,
    speaker: null,
    reaction: false
  };
  
  const config = { ...defaults, ...options };
  const totalAdvantage = config.advantage - config.disadvantage;
  
  let coreFormula = `1${config.hopeDieSize} + 1${config.fearDieSize}`;
  let flavorSuffix = "";
  
  if (totalAdvantage > 0) {
    coreFormula += ` + ${totalAdvantage}d6kh1`;
    flavorSuffix = ` with ${totalAdvantage} Advantage`;
  } else if (totalAdvantage < 0) {
    const disAdv = Math.abs(totalAdvantage);
    coreFormula += ` - ${disAdv}d6kh1`;
    flavorSuffix = ` with ${disAdv} Disadvantage`;
  }
  
  const fullRollFormula = config.modifier !== 0 ? `${coreFormula} + ${config.modifier}` : coreFormula;
  const roll = new Roll(fullRollFormula);
  await roll.evaluate();
  
  let hopeDieValue = 0;
  let fearDieValue = 0;
  let wasForcedCritical = false;
  
  if (roll.dice.length >= 2) {
    roll.dice[0].options.flavor = "Hope";
    hopeDieValue = roll.dice[0].total;
    
    roll.dice[1].options.flavor = "Fear";
    fearDieValue = roll.dice[1].total;
    
    // Forced critical
    if (_isForcedCriticalActive()) {
      wasForcedCritical = true;
      
      // Original value
      const originalFearValue = fearDieValue;
      
      // Force match
      fearDieValue = hopeDieValue;
      roll.dice[1].results[0].result = hopeDieValue;
      roll.dice[1]._total = hopeDieValue;
      
      // Recalc total
      const difference = hopeDieValue - originalFearValue;
      roll._total = roll.total + difference;
      
      // Disable
      _disableForcedCritical();
    }
    
    if (roll.dice.length >= 3) {
      roll.dice[2].options.flavor = "Modifier";
    }
  }
  
  const isCrit = hopeDieValue === fearDieValue;
  const isHope = !config.reaction && hopeDieValue > fearDieValue;
  const isFear = !config.reaction && hopeDieValue < fearDieValue;
  
  if (config.sendToChat) {
    let finalFlavor = config.flavor || `<p class="roll-flavor-line"><b>Duality Dice</b>${flavorSuffix}`;
    
    if (!config.flavor) {
      if (config.modifier !== 0) {
        finalFlavor += config.modifier > 0 ? ` +${config.modifier}` : ` ${config.modifier}`;
      }
      
      if (isCrit) {
        finalFlavor += ` <b>Critical</b> Success!</p>`;
        if (!config.reaction) {
          finalFlavor += `<p class="roll-effect">You gain 1 Hope and clear 1 Stress</p>`;
        }
      } else if (isHope) {
        finalFlavor += ` Rolled with <b>Hope</b>!</p><p class="roll-effect">You gain 1 Hope</p>`;
      } else if (isFear) {
        finalFlavor += ` Rolled with <b>Fear</b>!</p><p class="roll-effect">The GM gains 1 Fear</p>`;
      } else {
        finalFlavor += `</p>`;
      }
    }
    
    await roll.toMessage({
      speaker: config.speaker || ChatMessage.getSpeaker(),
      flavor: finalFlavor,
      flags: {
        daggerheart: {
          rollType: "duality",
          hopeDieSize: config.hopeDieSize,
          fearDieSize: config.fearDieSize,
          modifier: config.modifier,
          advantage: config.advantage,
          disadvantage: config.disadvantage,
          isCrit,
          isHope,
          isFear,
          reaction: config.reaction
        }
      }
    });
    
    if (isCrit && wasForcedCritical) {
      Hooks.callAll('daggerheart.dualityRollComplete', {
        isCrit: true,
        forcedCritical: true,
        roll: roll
      });
    }
  }
  
  if (config.returnRoll) {
    return roll;
  }
  
  return {
    total: roll.total,
    hopeDieValue,
    fearDieValue,
    hopeTotal: hopeDieValue + (totalAdvantage > 0 ? roll.dice[2]?.total || 0 : 0) + config.modifier,
    fearTotal: fearDieValue + (totalAdvantage < 0 ? roll.dice[2]?.total || 0 : 0) + config.modifier,
    isCrit,
    isHope,
    isFear,
    modifier: config.modifier,
    advantage: config.advantage,
    disadvantage: config.disadvantage,
    totalAdvantage,
    formula: fullRollFormula,
    roll: roll
  };
}

export function _checkCritical(hopeValue, fearValue) {
  return hopeValue === fearValue;
}

export function _enableForcedCritical() {
  if (!game.daggerheart) game.daggerheart = {};
  game.daggerheart._forceCritActive = true;
  return true;
}

export function _disableForcedCritical() {
  if (!game.daggerheart) game.daggerheart = {};
  game.daggerheart._forceCritActive = false;
  return false;
}

export function _isForcedCriticalActive() {
  return game.daggerheart?._forceCritActive || false;
}

export async function _quickRoll(dieFormula, options = {}) {
  const defaults = {
    sendToChat: true,
    flavor: null,
    returnRoll: false,
    speaker: null
  };
  
  const config = { ...defaults, ...options };
  
  const roll = new Roll(dieFormula);
  await roll.evaluate();
  
  if (config.sendToChat) {
    await roll.toMessage({
      speaker: config.speaker || ChatMessage.getSpeaker(),
      flavor: config.flavor || `<p class="roll-flavor-line"><b>Roll</b></p>`
    });
  }
  
  if (config.returnRoll) {
    return roll;
  }
  
  return {
    value: roll.total,
    formula: dieFormula,
    roll: roll
  };
}



export async function _dualityWithDialog(config) {
  // Get actor
  const actor = config.actor || (canvas.tokens.controlled[0]?.actor ?? game.user.character);
  if (!actor) return ui.notifications.warn("No character sheet found.");
  const sheet = actor.sheet;

  config = config || {};
  let { title, traitValue, skipDialog, rollDetails } = config;
  title = title || "";
  traitValue = traitValue || 0;
  rollDetails = rollDetails || {}

  rollDetails.hopeDieSize = rollDetails.hopeDieSize || 'd12';
  rollDetails.fearDieSize = rollDetails.fearDieSize || 'd12';
  rollDetails.advantage = rollDetails.advantage || 0;
  rollDetails.disadvantage = rollDetails.disadvantage || 0;
  rollDetails.modifier = rollDetails.modifier || 0;
  rollDetails.reaction = rollDetails.reaction || false;
  

  if (!skipDialog) {
    const dialogChoice = await DaggerheartDialogHelper.showDualityRollDialog({
      title: title || "Roll",
      rollDetails
    });

    if (!dialogChoice) { return; }
    rollDetails = { ...dialogChoice };
  }
  
  const { advantage, disadvantage, modifier, hopeDieSize, fearDieSize, reaction } = rollDetails;
  
  // Roll duality
  const result = await _rollDuality({
    hopeDieSize,
    fearDieSize,
    modifier: modifier + traitValue,
    advantage,
    disadvantage,
    sendToChat: false,
    reaction,
    speaker: ChatMessage.getSpeaker({ actor })
  });

  const { isCrit, isHope, isFear } = result;

  // Sheet updates
  if (!reaction && sheet.handleDualityResult) {
    await sheet.handleDualityResult({
      isCrit,
      isHope,
      isFear
    });
  }

  // Flavor text
  const totalAdvantage = advantage - disadvantage;
  let flavorSuffix = '';
  
  if (totalAdvantage > 0) {
    flavorSuffix = ` with ${totalAdvantage} Advantage`;
  } else if (totalAdvantage < 0) {
    const disAdv = Math.abs(totalAdvantage);
    flavorSuffix = ` with ${disAdv} Disadvantage`;
  }

  let finalFlavor = `<p class="roll-flavor-line"><b>${title}</b>${flavorSuffix}`;
  if (modifier !== 0) {
    finalFlavor += modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
  }

  if (isCrit) {
    finalFlavor += ` <b>Critical</b> Success!</p>`;
    if (!reaction) {
      finalFlavor += `<p class="roll-effect">You gain 1 Hope and clear 1 Stress</p>`;
    }
  } else if (isHope) {
    finalFlavor += ` Rolled with <b>Hope</b>!</p><p class="roll-effect">You gain 1 Hope</p>`;
  } else if (isFear) {
    finalFlavor += ` Rolled with <b>Fear</b>!</p><p class="roll-effect">The GM gains 1 Fear</p>`;
  } else {
    finalFlavor += `</p>`;
  }
  
  // Attack targeting
  if (sheet?.getPendingRollType && sheet.getPendingRollType() === "attack" && sheet._getTargetingResults) {
    finalFlavor += sheet._getTargetingResults(result.total);
  }
  
  const pendingRollType = sheet?.getPendingRollType ? sheet.getPendingRollType() : "unknown";
  const pendingWeaponName = sheet?.getPendingWeaponName ? sheet.getPendingWeaponName() : "";

  // Send message
  await result.roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: finalFlavor,
    flags: {
      daggerheart: {
        rollType: pendingRollType,
        weaponName: pendingWeaponName,
        actorId: actor.id,
        actorType: actor.type
      }
    }
  });
  
  // Clear pending
  if (sheet?.setPendingRollType) {
    sheet.setPendingRollType(null);
  }
  if (sheet?.setPendingWeaponName) {
    sheet.setPendingWeaponName(null);
  }
  
  return { isCrit, isFear, isHope, result };
}

// Global export
Hooks.once('init', () => {
  game.daggerheart = game.daggerheart || {};
  game.daggerheart.rollHandler = {
    rollHope: _rollHope,
    rollFear: _rollFear,
    rollDuality: _rollDuality,
    checkCritical: _checkCritical,
    enableForcedCritical: _enableForcedCritical,
    disableForcedCritical: _disableForcedCritical,
    isForcedCriticalActive: _isForcedCriticalActive,
    quickRoll: _quickRoll,
    dualityWithDialog: _dualityWithDialog
  };
});