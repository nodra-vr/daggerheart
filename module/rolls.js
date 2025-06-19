const rolls = {};
export default rolls;

const setUpDualityRoll = async (rollDetails) => {
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

  rollDetails = rollDetails || {}

  rollDetails.hopeDieSize = rollDetails.hopeDieSize || 'd12';
  rollDetails.fearDieSize = rollDetails.fearDieSize || 'd12';
  rollDetails.advantage = rollDetails.advantage || 0;
  rollDetails.disadvantage = rollDetails.disadvantage || 0;
  rollDetails.modifier = rollDetails.modifier || 0;

  const { advantage, disadvantage, modifier, hopeDieSize, fearDieSize } = rollDetails;
  const totalAdvantage = advantage - disadvantage;

  let coreFormula = `1${hopeDieSize} + 1${fearDieSize}`;
  if (totalAdvantage > 0) {
      coreFormula += ` + ${totalAdvantage}d6kh1`;
      rollType = "Advantage";
  } else if (totalAdvantage < 0) {
      const disAdv = Math.abs(totalAdvantage);
      coreFormula += ` - ${disAdv}d6kh1`;
      rollType = "Disadvantage";
  }

  const fullRollFormula = `${coreFormula} + ${ modifier }`;
  const roll = new Roll(fullRollFormula);
  await roll.evaluate();

  if (roll.dice.length >= 2) {
    roll.dice[0].options.flavor = "Hope";

    roll.dice[1].options.flavor = "Fear";

    if (roll.dice.length >= 3) {
      roll.dice[2].options.flavor = "Modifier";
    }
  } else {
    console.error(`Daggerheart | Critical error during ${title} roll: Less than two primary dice terms found. Roll object:`, roll);
    return;
  }

  return roll;
}


rolls.duality = async (config) => {
  const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
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
    const dialogContent = `
    <form>
    <div class="flex-col" style="align-items: stretch; gap: 2rem">
        <div class="flex-row" style="justify-content: center; gap: 2rem;">
            <div class="flex-col">
                <span class="label-bar">Hope Die</span>
                <select name="hopeDieSize" id="hopeDieSize">
                    <option value="d12" ${ rollDetails.hopeDieSize !== 'd20' ? 'selected' : ''}>d12</option>
                    <option value="d20" ${ rollDetails.hopeDieSize === 'd20' ? 'selected' : ''}>d20</option>
                </select>
            </div>
            <div class="flex-col">
                <span class="label-bar">Fear Die</span>
                <select name="fearDieSize" id="fearDieSize">
                    <option value="d12" ${ rollDetails.fearDieSize !== 'd20' ? 'selected' : ''}>d12</option>
                    <option value="d20" ${ rollDetails.fearDieSize === 'd20' ? 'selected' : ''}>d20</option>
                </select>
            </div>
        </div>
      <div class="flex-row">
        <div class="flex-col stepper-group">
          <span class="label-bar">Advantage</span>
          <div class="flex-row">
            <button id="adv-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceAdvantageInput" min="0" name="advantage" step="1" type="number" value="${ rollDetails.advantage }"/>
            <button id="adv-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
        <div class="flex-col stepper-group">
          <span class="label-bar">Disadvantage</span>
          <div class="flex-row">
            <button id="dis-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceDisadvantageInput" min="0" name="disadvantage" step="1" type="number" value="${ rollDetails.disadvantage }"/>
            <button id="dis-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
      </div>
      <div class="flex-row">
        <div class="flex-col stepper-group">
          <span class="label-bar">Flat Modifier</span>
          <div class="flex-row">
            <button id="mod-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceModifierInput" autofocus name="modifier" step="1" type="number" value="${ rollDetails.modifier }"/>
            <button id="mod-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
      </div>
    </div>
    </form>
    `;

    let dialogTitle = title ? `${title}` : `Roll`;
    let dialogChoice = await new Promise(resolve => {
        new Dialog({
            title: dialogTitle,
            content: dialogContent,
            buttons: {
                roll: {
                    label: "Roll",
                    icon: "<i class='fas fa-dice-d12'></i>",
                    callback: (html) => {
                        const advantage = parseInt(html.find('#dualityDiceAdvantageInput').val()) || 0;
                        const disadvantage = parseInt(html.find('#dualityDiceDisadvantageInput').val()) || 0;
                        const modifier = parseInt(html.find('#dualityDiceModifierInput').val()) || 0;
                        const hopeDieSize = html.find('#hopeDieSize').val();
                        const fearDieSize = html.find('#fearDieSize').val();
                        resolve({ advantage, disadvantage, modifier, hopeDieSize, fearDieSize });
                    }
                },
                rollReaction: {
                    label: "Reaction",
                    icon: "<i class='fas fa-dice-d12'></i>",
                    callback: (html) => {
                        const advantage = parseInt(html.find('#dualityDiceAdvantageInput').val()) || 0;
                        const disadvantage = parseInt(html.find('#dualityDiceDisadvantageInput').val()) || 0;
                        const modifier = parseInt(html.find('#dualityDiceModifierInput').val()) || 0;
                        const hopeDieSize = html.find('#hopeDieSize').val();
                        const fearDieSize = html.find('#fearDieSize').val();
                        resolve({ advantage, disadvantage, modifier, hopeDieSize, fearDieSize, reaction: true });
                    }
                },
                cancel: {
                    label: "Cancel",
                    callback: () => resolve(null)
                }
            },
            default: 'roll',
            render: (html) => {
                function incrementInput(selector, by, clampLo = null) {
                    let input = html.find(selector);
                    if (input.length === 0) return;
                    let newValue = (parseInt(input.val()) || 0) + by;
                    if (clampLo !== null) newValue = Math.max(clampLo, newValue);
                    input.val(newValue);
                }

                html.find('#adv-plus').click(() => incrementInput('#dualityDiceAdvantageInput', 1, 0));
                html.find('#adv-minus').click(() => incrementInput('#dualityDiceAdvantageInput', -1, 0));
                html.find('#dis-plus').click(() => incrementInput('#dualityDiceDisadvantageInput', 1, 0));
                html.find('#dis-minus').click(() => incrementInput('#dualityDiceDisadvantageInput', -1, 0));
                html.find('#mod-plus').click(() => incrementInput('#dualityDiceModifierInput', 1));
                html.find('#mod-minus').click(() => incrementInput('#dualityDiceModifierInput', -1));

                for (const input of html.find("input[type=number]")) {
                    input.addEventListener("wheel", (event) => {
                        if (input === document.activeElement) {
                            event.preventDefault();
                            event.stopPropagation();
                            const step = Math.sign(-1 * event.deltaY);
                            const oldValue = Number(input.value) || 0;
                            input.value = String(oldValue + step);
                        }
                    });
                }
            },
            close: () => resolve(null)
        }, {
            classes: ["daggerheart-roll-dialog"]
        }).render(true);
    });

    if (!dialogChoice) { return; }
    rollDetails = { ...dialogChoice };
  }
  
  console.log('fgsfds',rollDetails);

  const { advantage, disadvantage, modifier, hopeDieSize, fearDieSize, reaction } = rollDetails;
  const totalAdvantage = advantage - disadvantage;

  let flavorSuffix = '';

  if (totalAdvantage > 0) {
      flavorSuffix = ` with ${totalAdvantage} Advantage`;
  } else if (totalAdvantage < 0) {
      flavorSuffix = ` with ${disAdv} Disadvantage`;
  }

  const roll = await setUpDualityRoll({...rollDetails, modifier: modifier + traitValue});

  let hopeDieValue, fearDieValue;
  let isCrit = false;

  hopeDieValue = roll.dice[0].total;
  fearDieValue = roll.dice[1].total;
  isCrit = hopeDieValue === fearDieValue;

  const isHope = !reaction && hopeDieValue > fearDieValue;
  const isFear = !reaction && hopeDieValue < fearDieValue;

  let finalFlavor = `<p class="roll-flavor-line"><b>${title}</b>${flavorSuffix}`;
  if (modifier !== 0) {
      finalFlavor += modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
  }

  if (!reaction) {
    await sheet.handleDualityResult({
      isCrit,
      isHope,
      isFear
    });
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
  }
  
  // Check for targeting if this is an attack roll
  if (sheet.getPendingRollType() === "attack") {
    finalFlavor += this.getTargetingResults(roll.total);
  }
  
  const pendingRollType = sheet.getPendingRollType() || "unknown";
  const pendingWeaponName = sheet.getPendingWeaponName() || "";
  // const actor = sheet.actor;

  await roll.toMessage({
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
  
  // Clear pending roll data
  sheet.setPendingRollType(null);
  sheet.setPendingWeaponName(null);
  return ({ isCrit, isFear, isHope });
}

rolls.riskItAll = async () => {
  const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
  if (!actor) return ui.notifications.warn("No character sheet found.");
  const roll = await setUpDualityRoll();

  let hopeDieValue, fearDieValue;
  let isCrit = false;

  hopeDieValue = roll.dice[0].total;
  fearDieValue = roll.dice[1].total;
  isCrit = hopeDieValue === fearDieValue;

  const isHope = hopeDieValue > fearDieValue;
  let flavor = `<ul>
    <li><strong>Hope:</strong> ${hopeDieValue}</li>
    <li><strong>Fear:</strong> ${fearDieValue}</li>
    </ul>
    <p>${actor.name} risks it all `;

  if ( isCrit ) {
    flavor += `and <strong><em>CRITICALLY SUCCEEDS!</em></strong> All HP and Stress cleared.`;
  } else if ( isHope ) {
    flavor += `and <strong><em>STANDS STRONG!</em></strong> Clear <strong>${hopeDieValue}</strong> HP/Stress divided how you want`;
  } else {
    flavor += `and <strong><em>CROSSES THROUGH THE VEIL</em></strong> of death.`;
  }
  flavor += '</p>';

  const msg = await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: {
      daggerheart: {
        rollType: null,
        weaponName: null,
        actorId: actor.id,
        actorType: actor.type
      }
    }
  });

  if (game.dice3d) {
    game.dice3d.waitFor3DAnimationByMessageID(msg.id)
      .then(()=> {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: flavor
        });
        if (isCrit) {
          Promise.all([
            actor.clearAllStress(),
            actor.clearAllHP()
          ]);
        }
    });
  } else {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: flavor
    });
    if (isCrit) {
      Promise.all([
        actor.clearAllStress(),
        actor.clearAllHP()
      ]);
    }

  }
}

// Going to have the death roller not show the standard message eventually.
// dsn allows you to pass data and get dice that roll the numbers you give it.
function convertTo3dRollData(roll) {
  let dice = roll.dice.map(d => {
    return {
      result: d.value
    }
  })
}

// const data = {
//     throws:[{
//         dice:[
//             {
//                 result:7,
//                 resultLabel:7,
//                 type: "d20",
//                 vectors:[],
//                 options:{}
//             },
//             {
//                 result:0,
//                 resultLabel:"T",
//                 type: "dc",
//                 vectors:[],
//                 options:{}
//             },
//             {
//                 resultLabel:50,
//                 d100Result:59,
//                 result:5,
//                 type:"d100",
//                 vectors:[],
//                 options:{}
//           },
//           {
//                 resultLabel:9,
//                 d100Result:59,
//                 result:9,
//                 type:"d10",
//                 vectors:[],
//                 options:{}
//           }
//         ]
//     }]
// };
// game.dice3d.show(data).then(displayed => { /* do your stuff after the animation */  }); 
