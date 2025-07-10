import { DaggerheartDialogHelper } from './dialog-helper.js';
import {
  calculateFinalDice,
  generateAdvantageFormula,
  generateDisadvantageFormula,
  calculateNetResult,
  normalizeAdvantageData
} from './advantage-manager.js';

Hooks.on("diceSoNiceRollStart", (messageId, context) => {
  if (!game.dice3d) return;

  const message = game.messages.get(messageId);
  if (!message?.flags?.daggerheart) return;

  _ensureDaggerheartColorsets();
});

Hooks.on("renderChatMessage", (message, html, data) => {

  if (!message.flags?.daggerheart) return;

  _styleDiceTooltips(html);

  _styleChatMessageBackground(html, message);

  _handleAutomaticFearGain(message);
});

async function _handleAutomaticFearGain(message) {
  const flags = message.flags?.daggerheart;
  if (!flags) return;

  if (game.paused) return;

  if (flags.rollType === "fear" || (flags.isDuality && flags.isFear && !flags.reaction)) {

    await _requestFearGain(1, "roll with Fear");
  }

  if (flags.isDuality && !flags.reaction && (flags.isHope || flags.isCrit)) {

    let targetActor = null;

    if (flags.actorId) {
      targetActor = game.actors.get(flags.actorId);
    }

    if (!targetActor && message.speaker?.actor) {
      targetActor = game.actors.get(message.speaker.actor);
    }

    if (!targetActor) {
      console.warn("Daggerheart | No actor found from roll data, using fallback logic");
      if (canvas.tokens?.controlled?.length === 1) {
        targetActor = canvas.tokens.controlled[0].actor;
      } else if (game.user.character) {
        targetActor = game.user.character;
      }
    }

    if (targetActor && targetActor.type === "character") {
      const updateData = {};

      if (flags.isCrit) {

        const currentHope = parseInt(targetActor.system.hope?.value) || 0;
        const maxHope = parseInt(targetActor.system.hope?.max) || 0;
        updateData["system.hope.value"] = Math.min(maxHope, currentHope + 1);

        const currentStress = parseInt(targetActor.system.stress?.value) || 0;
        updateData["system.stress.value"] = Math.max(0, currentStress - 1);

        console.log(`Daggerheart | +1 Hope, -1 Stress for ${targetActor.name} (Critical)`);
      } else if (flags.isHope) {

        const currentHope = parseInt(targetActor.system.hope?.value) || 0;
        const maxHope = parseInt(targetActor.system.hope?.max) || 0;
        updateData["system.hope.value"] = Math.min(maxHope, currentHope + 1);

        console.log(`Daggerheart | +1 Hope for ${targetActor.name}`);
      }

      const canModify = game.user?.isGM || game.user?.hasRole?.("ASSISTANT") || targetActor.isOwner;

      if (Object.keys(updateData).length > 0 && canModify) {
        await targetActor.update(updateData);
      }
    } else {

      const effectText = flags.isCrit ? "gain 1 Hope and clear 1 Stress" : "gain 1 Hope";
      await ChatMessage.create({
        content: `<div class="hope-automation-notice">
          <p><i class="fas fa-info-circle"></i> <strong>Hope Automation Notice</strong></p>
          <p>This roll would ${effectText}, but no character could be identified.</p>
          <p><em>Tip: Select a token or ensure the roll is made from a character sheet.</em></p>
        </div>`,
        speaker: ChatMessage.getSpeaker()
      });
    }
  }
}

async function _requestFearGain(amount, source) {

  if (game.user.isGM) {
    if (game.daggerheart?.counter) {
      try {
        await game.daggerheart.counter.autoGainFear(amount, source);
        console.log("Daggerheart | +1 Fear from roll");
      } catch (error) {
        console.warn("Daggerheart | Error with direct fear gain, falling back to socket");
        _sendFearGainRequest(amount, source);
      }
    }
    return;
  }

  _sendFearGainRequest(amount, source);
}

function _sendFearGainRequest(amount, source) {
  game.socket.emit("system.daggerheart", {
    type: "requestFearGain",
    amount: amount,
    source: source,
    userId: game.user.id,
    userName: game.user.name
  });
  console.log(`Daggerheart | Requested +${amount} Fear from ${source} via socket`);
}

function _styleDiceTooltips(html) {

  const tooltipParts = html.find('.dice-tooltip .tooltip-part');

  tooltipParts.each((index, part) => {
    const $part = $(part);
    const flavorSpan = $part.find('.part-flavor');

    if (flavorSpan.length > 0) {
      const flavor = flavorSpan.text().trim();
      const diceRolls = $part.find('.dice-rolls .roll.die');

      if (flavor === 'Hope') {
        diceRolls.addClass('hope-die').attr('data-flavor', 'Hope');
        flavorSpan.addClass('hope-flavor');
      } else if (flavor === 'Fear') {
        diceRolls.addClass('fear-die').attr('data-flavor', 'Fear');
        flavorSpan.addClass('fear-flavor');
      }
    }
  });

  const rollFlavorLines = html.find('.roll-flavor-line');
  rollFlavorLines.each((index, line) => {
    const $line = $(line);
    const boldElements = $line.find('b');

    boldElements.each((bIndex, boldEl) => {
      const $bold = $(boldEl);
      const text = $bold.text().trim();

      if (text === 'Hope') {
        $bold.addClass('hope-result');
      } else if (text === 'Fear') {
        $bold.addClass('fear-result');
      }
    });
  });
}

function _styleChatMessageBackground(html, message) {
  const flags = message.flags?.daggerheart;
  if (!flags) return;

  const chatMessage = html.hasClass('chat-message') ? html : html.find('.chat-message');
  if (!chatMessage.length) return;

  if (flags.rollType === "hope") {
    chatMessage.addClass('dh-hope-roll');
    _styleRollEffectText(chatMessage, 'hope');
  }

  else if (flags.rollType === "fear") {
    chatMessage.addClass('dh-fear-roll');
    _styleRollEffectText(chatMessage, 'fear');
  }

  else if (flags.isDuality || flags.rollType === "duality") {
    if (flags.isCrit) {

      chatMessage.addClass('dh-hope-roll');
      _styleRollEffectText(chatMessage, 'hope');
    } else if (flags.isHope) {

      chatMessage.addClass('dh-hope-roll');
      _styleRollEffectText(chatMessage, 'hope');
    } else if (flags.isFear) {

      chatMessage.addClass('dh-fear-roll');
      _styleRollEffectText(chatMessage, 'fear');
    }
  }
}

function _styleRollEffectText(chatMessage, rollType) {
  const rollEffectElements = chatMessage.find('.roll-effect');
  if (rollEffectElements.length > 0) {
    rollEffectElements.each(function() {
      const element = $(this);
      const text = element.text().toLowerCase();

      if (text.includes('hope') && rollType === 'hope') {
        element.addClass('hope-effect');
      } else if (text.includes('fear') && rollType === 'fear') {
        element.addClass('fear-effect');
      } else if (rollType === 'hope' && (text.includes('gain') || text.includes('add'))) {

        element.addClass('hope-effect');
      } else if (rollType === 'fear' && (text.includes('gain') || text.includes('add'))) {

        element.addClass('fear-effect');
      }
    });
  }
}

export function _ensureDaggerheartColorsets() {
  if (!game.dice3d) return;

  const existingColorsets = game.dice3d.DiceColors?.getColorsets?.() || {};

  if (!existingColorsets["Hope"]) {
    game.dice3d.addColorset(_getDefaultHopeColorset());
  }

  if (!existingColorsets["Fear"]) {
    game.dice3d.addColorset(_getDefaultFearColorset());
  }

  if (!existingColorsets["Modifier"]) {
    game.dice3d.addColorset(_getDefaultModifierColorset());
  }
}

function _getDefaultHopeColorset() {
  return {
    name: "Hope",
    category: "Hope Die", 
    description: "Hope",
    texture: "ice",
    foreground: "#ffffff",
    background: "#ffa200",
    outline: "#000000",
    edge: "#ff8000",
    material: "glass",
    font: "Modesto Condensed",
    colorset: "custom",
    system: "standard"
  };
}

function _getDefaultFearColorset() {
  return {
    name: "Fear",
    category: "Fear Die",
    description: "Fear", 
    texture: "ice",
    foreground: "#b5d5ff",
    background: "#021280",
    outline: "#000000",
    edge: "#210e6b",
    material: "metal",
    font: "Modesto Condensed",
    colorset: "custom",
    system: "standard"
  };
}

function _getDefaultModifierColorset() {
  return {
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
  };
}

export async function _rollHope(options = {}) {

  _ensureDaggerheartColorsets();

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

    try {
      const chatMessage = await ChatMessage.create({
        speaker: config.speaker || ChatMessage.getSpeaker(),
        flavor: defaultFlavor,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        flags: {
          daggerheart: {
            rollType: "hope",
            dieSize: config.dieSize,
            modifier: config.modifier
          }
        }
      });

      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating hope roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but roll was completed.");
    }
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

  _ensureDaggerheartColorsets();

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

    try {
      const chatMessage = await ChatMessage.create({
        speaker: config.speaker || ChatMessage.getSpeaker(),
        flavor: defaultFlavor,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        flags: {
          daggerheart: {
            rollType: "fear",
            dieSize: config.dieSize,
            modifier: config.modifier
          }
        }
      });

      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating fear roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but roll was completed.");
    }
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

  _ensureDaggerheartColorsets();

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

  const normalizedAdvantage = normalizeAdvantageData(config.advantage);
  const normalizedDisadvantage = normalizeAdvantageData(config.disadvantage);

  const netResult = calculateNetResult(normalizedAdvantage, normalizedDisadvantage);

  let coreFormula = `1${config.hopeDieSize} + 1${config.fearDieSize}`;
  let flavorSuffix = "";

  const advCount = Object.values(netResult.advantage).reduce((sum, count) => sum + count, 0);
  const disCount = Object.values(netResult.disadvantage).reduce((sum, count) => sum + count, 0);

  if (advCount > 0) {

    const advantageFormula = generateAdvantageFormula(netResult.advantage);
    if (advantageFormula) {
      coreFormula += advantageFormula;
      flavorSuffix = ` with ${advCount} Advantage`;
    }
  } else if (disCount > 0) {

    const disadvantageFormula = generateDisadvantageFormula(netResult.disadvantage);
    if (disadvantageFormula) {
      coreFormula += disadvantageFormula;
      flavorSuffix = ` with ${disCount} Disadvantage`;
    }
  }

  const originalAdvCount = Object.values(normalizedAdvantage).reduce((sum, count) => sum + count, 0);
  const originalDisCount = Object.values(normalizedDisadvantage).reduce((sum, count) => sum + count, 0);

  if (originalAdvCount > 0 && originalDisCount > 0 && advCount === 0 && disCount === 0) {
    flavorSuffix = ` with ${originalAdvCount} Advantage, ${originalDisCount} Disadvantage (cancelled)`;
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

    if (_isForcedCriticalActive()) {
      wasForcedCritical = true;

      const originalFearValue = fearDieValue;

      fearDieValue = hopeDieValue;
      roll.dice[1].results[0].result = hopeDieValue;
      roll.dice[1]._total = hopeDieValue;

      const difference = hopeDieValue - originalFearValue;
      roll._total = roll.total + difference;

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

    try {
      const speaker = config.speaker || ChatMessage.getSpeaker();
      const chatMessage = await ChatMessage.create({
        speaker: speaker,
        flavor: finalFlavor,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        flags: {
          daggerheart: {
            rollType: "duality",
            hopeDieSize: config.hopeDieSize,
            fearDieSize: config.fearDieSize,
            modifier: config.modifier,
            advantage: normalizedAdvantage,
            disadvantage: normalizedDisadvantage,
            finalDice: netResult,
            isCrit,
            isHope,
            isFear,
            reaction: config.reaction,
            actorId: speaker.actor, 
            isDuality: true 
          }
        }
      });

      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating duality roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but roll was completed.");
    }

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
    hopeTotal: hopeDieValue + config.modifier,
    fearTotal: fearDieValue + config.modifier,
    isCrit,
    isHope,
    isFear,
    modifier: config.modifier,
    advantage: normalizedAdvantage,
    disadvantage: normalizedDisadvantage,
    finalDice: netResult,
    formula: fullRollFormula,
    roll: roll
  };
}

export async function _rollNPC(options = {}) {  
  const defaults = {
    dieSize: 'd20',
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

  let dieCount = totalAdvantage == 0 ? 1 : 2;
  let coreFormula = `${dieCount}${config.dieSize}`;
  let flavorSuffix = "";

  if (totalAdvantage > 0) {
    coreFormula += `kh`;
    flavorSuffix = ` with Advantage`;
  } else if (totalAdvantage < 0) {
    coreFormula += `kh`;
    flavorSuffix = ` with Disadvantage`;
  }

  const fullRollFormula = config.modifier !== 0 ? `${coreFormula} + ${config.modifier}` : coreFormula;
  const roll = new Roll(fullRollFormula);
  await roll.evaluate();

  let dieValue = 0;
  let wasForcedCritical = false;

  if (roll.dice.length >= 1) {
    dieValue = roll.dice[0].total;

    if (_isForcedCriticalActive()) {
      wasForcedCritical = true;

      const originalDieValue = dieValue;

      dieValue = 20;
      roll.dice[0].results[0].result = dieValue;
      roll.dice[0]._total = dieValue;

      const difference = dieValue - originalDieValue;
      roll._total = roll.total + difference;

      _disableForcedCritical();
    }
  }

  const isCrit = dieValue === 20;

  if (config.sendToChat) {
    let finalFlavor = config.flavor || `<p class="roll-flavor-line"><b>NPC Roll</b>${flavorSuffix}`;

    if (!config.flavor) {
      if (config.modifier !== 0) {
        finalFlavor += config.modifier > 0 ? ` +${config.modifier}` : ` ${config.modifier}`;
      }

      if (isCrit) {
        finalFlavor += ` <b>Critical</b> Success!</p>`;
        if (!config.reaction) {
          finalFlavor += `<p class="roll-effect">You recover 1 Stress</p>`;
        }
      } else {
        finalFlavor += `</p>`;
      }
    }

    try {
      const chatMessage = await ChatMessage.create({
        speaker: config.speaker || ChatMessage.getSpeaker(),
        flavor: finalFlavor,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        flags: {
          daggerheart: {
            rollType: "npc",
            dieSize: config.dieSize,
            modifier: config.modifier,
            advantage: config.advantage,
            disadvantage: config.disadvantage,
            isCrit,
            reaction: config.reaction
          }
        }
      });

      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating NPC roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but roll was completed.");
    }
  }

  if (config.returnRoll) {
    return roll;
  }

  return {
    total: roll.total,
    dieValue,
    isCrit,
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
    try {
      const chatMessage = await ChatMessage.create({
        speaker: config.speaker || ChatMessage.getSpeaker(),
        flavor: config.flavor || `<p class="roll-flavor-line"><b>Roll</b></p>`,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll]
      });

      if (chatMessage?.id && game.dice3d) {
        await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
      }
    } catch (error) {
      console.error("Error creating quick roll chat message:", error);
      ui.notifications.warn("Chat message failed to send, but roll was completed.");
    }
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

export async function _waitFor3dDice(msgId) {
  if (game.dice3d){
    return game.dice3d.waitFor3DAnimationByMessageID(msgId);
  }
  return Promise.resolve(true);
}

export async function _dualityWithDialog(config) {

  const actor = config.actor || (canvas.tokens.controlled[0]?.actor ?? game.user.character);
  const sheet = actor?.sheet;

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
      rollDetails,
      actor
    });

    if (!dialogChoice) { return; }
    rollDetails = { ...dialogChoice };
  }

  const { advantage, disadvantage, modifier, hopeDieSize, fearDieSize, reaction } = rollDetails;

  const normalizedAdvantage = normalizeAdvantageData(advantage);
  const normalizedDisadvantage = normalizeAdvantageData(disadvantage);

  const netResult = calculateNetResult(normalizedAdvantage, normalizedDisadvantage);

  const result = await _rollDuality({
    hopeDieSize,
    fearDieSize,
    modifier: modifier + traitValue,
    advantage: normalizedAdvantage,
    disadvantage: normalizedDisadvantage,
    sendToChat: false,
    reaction,
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker()
  });

  const { isCrit, isHope, isFear } = result;

  if (!reaction && sheet?.handleDualityResult) {

    console.log("Daggerheart | Sheet-based automation disabled - using global automation instead");
  }

  let flavorSuffix = '';

  const advCount = Object.values(normalizedAdvantage).reduce((sum, count) => sum + count, 0);
  const disCount = Object.values(normalizedDisadvantage).reduce((sum, count) => sum + count, 0);

  if (advCount > 0 && disCount === 0) {
    flavorSuffix = ` with ${advCount} Advantage`;
  } else if (disCount > 0 && advCount === 0) {
    flavorSuffix = ` with ${disCount} Disadvantage`;
  } else if (advCount > 0 && disCount > 0) {
    flavorSuffix = ` with ${advCount} Advantage, ${disCount} Disadvantage`;
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

  if (sheet?.getPendingRollType && sheet.getPendingRollType() === "attack" && sheet._getTargetingResults) {

    sheet._lastRollResult = { isCrit, isHope, isFear };
    finalFlavor += sheet._getTargetingResults(result.total);

    sheet._lastRollResult = null;
  }

  const pendingRollType = sheet?.getPendingRollType ? sheet.getPendingRollType() : null;
  const pendingWeaponName = sheet?.getPendingWeaponName ? sheet.getPendingWeaponName() : "";

  try {

    if (result.roll.dice.length >= 2) {
      result.roll.dice[0].options.flavor = "Hope";
      result.roll.dice[1].options.flavor = "Fear";
      if (result.roll.dice.length >= 3) {
        result.roll.dice[2].options.flavor = "Modifier";
      }
    }

    const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();
    const chatMessage = await ChatMessage.create({
      speaker: speaker,
      flavor: finalFlavor,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [result.roll],
      flags: {
        daggerheart: {
          rollType: pendingRollType || "duality", 
          isDuality: true, 
          weaponName: pendingWeaponName,
          actorId: actor?.id || speaker.actor, 
          actorType: actor?.type,
          hopeDieSize,
          fearDieSize,
          modifier,
          advantage: normalizedAdvantage,
          disadvantage: normalizedDisadvantage,
          finalDice: netResult,
          isCrit,
          isHope,
          isFear,
          reaction,
          automationHandled: false
        }
      }
    });

    if (chatMessage?.id && game.dice3d) {
      await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
    }
  } catch (error) {
    console.error("Error creating duality dialog roll chat message:", error);
    ui.notifications.warn("Chat message failed to send, but roll was completed.");
  }

  if (sheet?.setPendingRollType) {
    sheet.setPendingRollType(null);
  }
  if (sheet?.setPendingWeaponName) {
    sheet.setPendingWeaponName(null);
  }

  return { isCrit, isFear, isHope, result };
}

export async function _npcRollWithDialog(config) {

  const actor = config.actor || (canvas.tokens.controlled[0]?.actor ?? game.user.character);
  if (!actor) return ui.notifications.warn("No character sheet found.");
  const sheet = actor.sheet;

  config = config || {};
  let { title, traitValue, skipDialog, rollDetails } = config;
  title = title || "";
  traitValue = traitValue || 0;
  rollDetails = rollDetails || {}

  rollDetails.dieSize = rollDetails.dieSize || 'd20';
  rollDetails.advantage = rollDetails.advantage || 0;
  rollDetails.disadvantage = rollDetails.disadvantage || 0;
  rollDetails.modifier = rollDetails.modifier || 0;
  rollDetails.reaction = rollDetails.reaction || false;

  if (!skipDialog) {
    const dialogChoice = await DaggerheartDialogHelper.showNPCRollDialog({
      title: title || "Roll",
      rollDetails
    });

    if (!dialogChoice) { return; }
    rollDetails = { ...dialogChoice };
  }

  const { advantage, disadvantage, modifier, dieSize, reaction } = rollDetails;

  const result = await _rollNPC({
    dieSize,
    modifier: modifier + traitValue,
    advantage,
    disadvantage,
    sendToChat: false,
    reaction,
    speaker: ChatMessage.getSpeaker({ actor })
  });

  const { isCrit } = result;

  if (!reaction && sheet.handleNPCResult) {
    await sheet.handleNPCResult({
      isCrit
    });
  }

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
  } else {
    finalFlavor += `</p>`;
  }

  if (sheet?.getPendingRollType && sheet.getPendingRollType() === "attack" && sheet._getTargetingResults) {

    sheet._lastRollResult = { isCrit, isHope: false, isFear: false };
    finalFlavor += sheet._getTargetingResults(result.total);

    sheet._lastRollResult = null;
  }

  const pendingRollType = sheet?.getPendingRollType ? sheet.getPendingRollType() : null;
  const pendingWeaponName = sheet?.getPendingWeaponName ? sheet.getPendingWeaponName() : "";

  try {
    const chatMessage = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: finalFlavor,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [result.roll],
      flags: {
        daggerheart: {
          rollType: pendingRollType || "npc",
          weaponName: pendingWeaponName,
          actorId: actor.id,
          actorType: actor.type,
          isCrit,
          reaction
        }
      }
    });

    if (chatMessage?.id && game.dice3d) {
      await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
    }
  } catch (error) {
    console.error("Error creating NPC dialog roll chat message:", error);
    ui.notifications.warn("Chat message failed to send, but roll was completed.");
  }

  if (sheet?.setPendingRollType) {
    sheet.setPendingRollType(null);
  }
  if (sheet?.setPendingWeaponName) {
    sheet.setPendingWeaponName(null);
  }

  return { isCrit, isFear: false, isHope: false, result };
}

Hooks.once('init', () => {
  game.daggerheart = game.daggerheart || {};
  game.daggerheart.rollHandler = {
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
  };
});