import { DaggerheartDialogHelper } from './dialog-helper.js';

export async function createDCRollMacro() {
  const content = `
    <form>
      <div class="daggerheart-dialog-content">
        <div class="form-group">
          <label for="dc">Difficulty Class (DC):</label>
          <input type="number" id="dc" name="dc" min="1" max="50" value="10" required>
        </div>
        
        <div class="form-group">
          <label for="modifier">Flat Modifier:</label>
          <input type="number" id="modifier" name="modifier" value="0">
        </div>
        
        <div class="form-group">
          <label for="dice">Dice:</label>
          <select id="dice" name="dice">
            <option value="4">d4</option>
            <option value="6">d6</option>
            <option value="8">d8</option>
            <option value="10" selected>d10</option>
            <option value="12">d12</option>
            <option value="20">d20</option>
          </select>
        </div>
      </div>
    </form>
  `;

  const result = await DaggerheartDialogHelper.showDialog({
    title: "Roll Against DC",
    content,
    dialogClass: 'dc-roll-dialog',
    buttons: {
      roll: {
        label: "Roll",
        icon: '<i class="fas fa-dice-d20"></i>',
        callback: (html) => {
          const dc = parseInt(html.find('#dc').val());
          const modifier = parseInt(html.find('#modifier').val()) || 0;
          const diceSize = parseInt(html.find('#dice').val());
          
          return { html, button: 'roll', dc, modifier, diceSize };
        }
      },
      cancel: {
        label: "Cancel",
        callback: () => null
      }
    }
  });

  if (result && result.button === 'roll') {
    await performDCRoll(result.dc, result.modifier, result.diceSize);
  }
}

async function performDCRoll(dc, modifier, diceSize) {
  const rollFormula = `1d${diceSize}${modifier >= 0 ? '+' : ''}${modifier}`;
  
  try {
    const roll = await new Roll(rollFormula).evaluate({ async: true });
    const total = roll.total;
    const isSuccess = total >= dc;
    
    const rollData = {
      formula: rollFormula,
      total: total,
      dc: dc,
      modifier: modifier,
      diceSize: diceSize,
      isSuccess: isSuccess,
      flavor: `DC ${dc} Check`
    };
    
    await displayDCRollResult(roll, rollData);
    
  } catch (error) {
    console.error("Error performing DC roll:", error);
    ui.notifications.error("Failed to perform roll");
  }
}

async function displayDCRollResult(roll, rollData) {
  const successClass = rollData.isSuccess ? 'success' : 'failure';
  const successText = rollData.isSuccess ? 'SUCCESS' : 'FAILURE';
  const successIcon = rollData.isSuccess ? 'fa-check-circle' : 'fa-times-circle';
  
  const content = `
    <div class="dc-roll-result ${successClass}">
      <div class="roll-header">
        <h3><i class="fas ${successIcon}"></i> ${successText}</h3>
        <div class="roll-formula">${rollData.formula} vs DC ${rollData.dc}</div>
      </div>
      
      <div class="roll-details">
        <div class="roll-total">
          <span class="total-label">Total:</span>
          <span class="total-value">${rollData.total}</span>
        </div>
        <div class="roll-breakdown">
          <span class="breakdown-label">Roll:</span>
          <span class="breakdown-value">${rollData.total - rollData.modifier}</span>
          ${rollData.modifier !== 0 ? `
            <span class="breakdown-label">Modifier:</span>
            <span class="breakdown-value">${rollData.modifier >= 0 ? '+' : ''}${rollData.modifier}</span>
          ` : ''}
        </div>
      </div>
      
      <div class="roll-margin">
        <span class="margin-label">Margin:</span>
        <span class="margin-value">${Math.abs(rollData.total - rollData.dc)}</span>
        <span class="margin-text">${rollData.isSuccess ? 'over' : 'under'} DC</span>
      </div>
    </div>
  `;

  await ChatMessage.create({
    content: content,
    speaker: ChatMessage.getSpeaker(),
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: roll,
    flags: {
      daggerheart: {
        rollType: "dc-check",
        dc: rollData.dc,
        isSuccess: rollData.isSuccess,
        margin: Math.abs(rollData.total - rollData.dc)
      }
    }
  });
}

Hooks.once('ready', () => {
  if (game.user.isGM) {
    game.daggerheart = game.daggerheart || {};
    game.daggerheart.createDCRollMacro = createDCRollMacro;
  }
}); 