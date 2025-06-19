/**
 * Dialog Helper Module
 * Provides reusable dialog functionality for the Daggerheart system
 */

export class DaggerheartDialogHelper {
  /**
   * Show a styled dialog with custom content
   * @param {Object} config - Dialog configuration
   * @param {string} config.title - Dialog title
   * @param {string} config.content - HTML content for the dialog
   * @param {Object} config.buttons - Button configuration object
   * @param {string} config.dialogClass - Additional CSS class for styling
   * @param {Function} config.render - Optional render callback
   * @param {string} config.default - Default button key
   * @returns {Promise} - Resolves with the dialog result
   */
  static async showDialog(config) {
    const dialogClass = `daggerheart-dialog ${config.dialogClass || ''}`;
    
    return new Promise(resolve => {
      const dialogButtons = {};
      let isResolved = false;
      
      const safeResolve = (value) => {
        if (!isResolved) {
          isResolved = true;
          resolve(value);
        }
      };
      
      // Process buttons to wrap callbacks with resolve
      for (const [key, button] of Object.entries(config.buttons || {})) {
        dialogButtons[key] = {
          ...button,
          callback: (html) => {
            const result = button.callback ? button.callback(html) : { html, button: key };
            safeResolve(result);
          }
        };
      }
      
      new Dialog({
        title: config.title,
        content: config.content,
        buttons: dialogButtons,
        default: config.default || Object.keys(dialogButtons)[0],
        render: config.render,
        close: () => {
          safeResolve(null);
        }
      }, {
        classes: [dialogClass]
      }).render(true);
    });
  }

  /**
   * Show a checkbox selection dialog
   * @param {Object} config - Dialog configuration
   * @param {string} config.title - Dialog title
   * @param {string} config.description - Optional description text
   * @param {Array} config.options - Array of {id, label, value} objects for checkboxes
   * @param {boolean} config.singleSelect - If true, only one option can be selected
   * @returns {Promise} - Resolves with selected options or null
   */
  static async showCheckboxDialog(config) {
    const content = `
      <form>
        <div class="daggerheart-dialog-content">
          ${config.description ? `<p class="dialog-description">${config.description}</p>` : ''}
          <div class="checkbox-group">
            ${config.options.map(option => `
              <div class="checkbox-item">
                <input type="${config.singleSelect ? 'radio' : 'checkbox'}" 
                       id="${option.id}" 
                       name="${config.singleSelect ? 'selection' : option.id}" 
                       value="${option.value || option.id}"
                       ${option.checked ? 'checked' : ''}>
                <label for="${option.id}">${option.label}</label>
              </div>
            `).join('')}
          </div>
        </div>
      </form>
    `;

    const result = await this.showDialog({
      title: config.title,
      content,
      dialogClass: 'checkbox-dialog',
      buttons: {
        confirm: {
          label: config.confirmLabel || "Confirm",
          icon: '<i class="fas fa-check"></i>',
          callback: (html) => {
            if (config.singleSelect) {
              const selectedInput = html.find('input[type="radio"]:checked');
              const selected = selectedInput.length > 0 ? selectedInput.val() : null;
              return { html, button: 'confirm', selected };
            } else {
              const selected = {};
              html.find('input[type="checkbox"]:checked').each((i, el) => {
                selected[el.id] = true;
              });
              return { html, button: 'confirm', selected };
            }
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => null
        }
      }
    });

    return result;
  }

  /**
   * Show the Death Move dialog
   * @param {string} characterName - The name of the character
   * @param {Actor} actor - The actor performing the death move
   * @returns {Promise} - Resolves with the selected death move or null
   */
  static async showDeathMoveDialog(characterName, actor) {
    const options = [
      { id: 'blaze-of-glory', label: 'Blaze of Glory', value: 'Blaze of Glory' },
      { id: 'avoid-death', label: 'Avoid Death', value: 'Avoid Death' },
      { id: 'risk-it-all', label: 'Risk it All', value: 'Risk it All' }
    ];

    const result = await this.showCheckboxDialog({
      title: `Death Move - ${characterName}`,
      description: 'Choose your character\'s death move:',
      options,
      singleSelect: true,
      confirmLabel: 'Choose Death Move'
    });

    if (result && result.selected) {
      // Initial announcement message
      await ChatMessage.create({
        content: `<p><em>${characterName} has chosen ${result.selected} as their Death Move.</em></p>`,
        speaker: ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });

      if (result.selected === 'Blaze of Glory') {
        if (game.daggerheart?.rollHandler?.enableForcedCritical) {
          game.daggerheart.rollHandler.enableForcedCritical();
          
          await ChatMessage.create({
            content: `
              <div class="death-move-blaze">
                <p><strong>${characterName} goes out in a Blaze of Glory!</strong></p>
                <p><em>Their next roll will be a Critical Success, but this heroic act will cost them their life.</em></p>
              </div>
            `,
            speaker: ChatMessage.getSpeaker(),
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            flags: {
              daggerheart: {
                deathMove: 'blaze-of-glory',
                characterName: characterName
              }
            }
          });
          
          Hooks.once('daggerheart.dualityRollComplete', async (rollData) => {
            if (rollData.isCrit && rollData.forcedCritical) {
              await ChatMessage.create({
                content: `
                  <div class="death-move-blaze-complete">
                    <p><strong>${characterName}'s heroic sacrifice is complete.</strong></p>
                    <p><em>With their final breath, they achieved the impossible. Their name will be remembered in legend.</em></p>
                  </div>
                `,
                speaker: ChatMessage.getSpeaker(),
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                flags: {
                  daggerheart: {
                    deathMove: 'blaze-of-glory-complete',
                    characterName: characterName
                  }
                }
              });
            }
          });
        } else {
          ui.notifications.error("Roll handler not available. Please ensure the system is properly initialized.");
          return null;
        }
      } else if (result.selected === 'Avoid Death') {
        if (!actor) {
          ui.notifications.error("No actor provided for Avoid Death roll.");
          return null;
        }
        
        // Initial message about falling unconscious
        await ChatMessage.create({
          content: `
            <div class="death-move-avoid">
              <p><strong>${characterName} struggles to Avoid Death!</strong></p>
              <p><em>They fall unconscious, clinging to life...</em></p>
            </div>
          `,
          speaker: ChatMessage.getSpeaker(),
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          flags: {
            daggerheart: {
              deathMove: 'avoid-death',
              characterName: characterName
            }
          }
        });
        
        const characterLevel = actor.system.level?.value || 1;
        
        if (game.daggerheart?.rollHandler?.rollHope) {
          const hopeResult = await game.daggerheart.rollHandler.rollHope({
            sendToChat: false,
            returnRoll: false
          });
          
          const hopeValue = hopeResult.dieValue;
          const gainsScar = hopeValue <= characterLevel;
          
          let flavorText = `
            <div class="death-move-avoid-result">
              <p><strong>Avoid Death Roll</strong></p>
              <p>Hope Die: <strong>${hopeValue}</strong> vs Level: <strong>${characterLevel}</strong></p>
          `;
          
          if (gainsScar) {
            flavorText += `
              <p class="scar-gained"><em>${characterName} gains a scar from their near-death experience.</em></p>
              <p class="scar-note">The character survives but is forever marked by this ordeal.</p>
            </div>
            `;
          } else {
            flavorText += `
              <p class="scar-avoided"><em>${characterName} miraculously avoids permanent scarring!</em></p>
              <p class="scar-note">They recover without lasting physical marks, though the memory remains.</p>
            </div>
            `;
          }
          
          await hopeResult.roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: flavorText,
            flags: {
              daggerheart: {
                deathMove: 'avoid-death-roll',
                characterName: characterName,
                gainsScar: gainsScar,
                hopeValue: hopeValue,
                characterLevel: characterLevel
              }
            }
          });
          
          if (gainsScar) {
            ui.notifications.info(`${characterName} gains a scar. Scar functionality will be implemented in the future.`);
          }
        } else {
          ui.notifications.error("Roll handler not available for Avoid Death roll.");
          return null;
        }
      } else if (result.selected === 'Risk it All') {
        if (!actor) {
          ui.notifications.error("No actor provided for Risk it All roll.");
          return null;
        }
        
        // Initial message about taking the ultimate risk
        await ChatMessage.create({
          content: `
            <div class="death-move-risk">
              <p><strong>${characterName} chooses to Risk it All!</strong></p>
              <p><em>Everything hangs in the balance of this single roll...</em></p>
            </div>
          `,
          speaker: ChatMessage.getSpeaker(),
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          flags: {
            daggerheart: {
              deathMove: 'risk-it-all',
              characterName: characterName
            }
          }
        });
        
        if (game.daggerheart?.rollHandler?.rollDuality) {
          const dualityResult = await game.daggerheart.rollHandler.rollDuality({
            sendToChat: false,
            returnRoll: false
          });
          
          const { hopeDieValue, fearDieValue, isCrit } = dualityResult;
          const hopeWins = hopeDieValue > fearDieValue;
          const fearWins = hopeDieValue < fearDieValue;
          
          if (isCrit) {
            // Critical Success: Full restoration
            const updateData = {
              'system.health.value': 0,
              'system.stress.value': 0
            };
            
            await actor.update(updateData);
            
            await dualityResult.roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor }),
              flavor: `
                <div class="death-move-risk-critical">
                  <p><strong>Risk it All - CRITICAL SUCCESS!</strong></p>
                  <p>Hope: <strong>${hopeDieValue}</strong> | Fear: <strong>${fearDieValue}</strong></p>
                  <p class="miracle"><em>${characterName} achieves the impossible!</em></p>
                  <p class="full-heal">Complete restoration: HP and Stress set to 0!</p>
                </div>
              `,
              flags: {
                daggerheart: {
                  deathMove: 'risk-it-all-critical',
                  characterName: characterName,
                  hopeDieValue: hopeDieValue,
                  fearDieValue: fearDieValue
                }
              }
            });
            
            ui.notifications.info(`${characterName} achieves miraculous recovery!`);
            
          } else if (hopeWins) {
            // Hope Wins: Show recovery allocation dialog
            await dualityResult.roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor }),
              flavor: `
                <div class="death-move-risk-hope">
                  <p><strong>Risk it All - Hope Prevails!</strong></p>
                  <p>Hope: <strong>${hopeDieValue}</strong> | Fear: <strong>${fearDieValue}</strong></p>
                  <p class="recovery-available"><em>${characterName} can recover ${hopeDieValue} points!</em></p>
                </div>
              `,
              flags: {
                daggerheart: {
                  deathMove: 'risk-it-all-hope',
                  characterName: characterName,
                  hopeDieValue: hopeDieValue,
                  fearDieValue: fearDieValue
                }
              }
            });
            
            // Show recovery allocation dialog
            const recoveryChoice = await this.showRecoveryAllocationDialog({
              characterName: characterName,
              availablePoints: hopeDieValue,
              currentHP: actor.system.health?.value || 0,
              currentStress: actor.system.stress?.value || 0,
              maxHP: actor.system.health?.max || 10,
              maxStress: actor.system.stress?.max || 10
            });
            
            if (recoveryChoice && recoveryChoice.button === 'confirm') {
              const hpHealing = recoveryChoice.hpHealing || 0;
              const stressHealing = recoveryChoice.stressHealing || 0;
              
              const newHP = Math.max(0, (actor.system.health?.value || 0) - hpHealing);
              const newStress = Math.max(0, (actor.system.stress?.value || 0) - stressHealing);
              
              const updateData = {
                'system.health.value': newHP,
                'system.stress.value': newStress
              };
              
              await actor.update(updateData);
              
              await ChatMessage.create({
                content: `
                  <div class="death-move-risk-recovery">
                    <p><strong>${characterName}'s Recovery</strong></p>
                    <p>HP healed: <strong>${hpHealing}</strong> | Stress cleared: <strong>${stressHealing}</strong></p>
                    <p class="recovery-result"><em>Against all odds, they pull through!</em></p>
                  </div>
                `,
                speaker: ChatMessage.getSpeaker({ actor }),
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                flags: {
                  daggerheart: {
                    deathMove: 'risk-it-all-recovery',
                    characterName: characterName,
                    hpHealing: hpHealing,
                    stressHealing: stressHealing
                  }
                }
              });
            }
            
          } else if (fearWins) {
            // Fear Wins: Character dies
            await dualityResult.roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor }),
              flavor: `
                <div class="death-move-risk-death">
                  <p><strong>Risk it All - Fear Claims Victory</strong></p>
                  <p>Hope: <strong>${hopeDieValue}</strong> | Fear: <strong>${fearDieValue}</strong></p>
                  <p class="final-words"><em>${characterName}'s gamble has failed...</em></p>
                  <p class="death-result">The ultimate risk has claimed their life.</p>
                </div>
              `,
              flags: {
                daggerheart: {
                  deathMove: 'risk-it-all-death',
                  characterName: characterName,
                  hopeDieValue: hopeDieValue,
                  fearDieValue: fearDieValue
                }
              }
            });
            
            ui.notifications.warn(`${characterName} has paid the ultimate price.`);
          }
          
        } else {
          ui.notifications.error("Roll handler not available for Risk it All roll.");
          return null;
        }
      } else {
        // Show notification about future functionality
        ui.notifications.info(`Death Move selected: ${result.selected}. Functionality will come in the future.`)
      }
      
      return result.selected;
    }

    return null;
  }

  /**
   * Show the Duality Roll dialog
   * @param {Object} config - Dialog configuration
   * @param {string} config.title - Dialog title (defaults to "Roll")
   * @param {Object} config.rollDetails - Initial roll details
   * @returns {Promise} - Resolves with roll configuration or null
   */
  static async showDualityRollDialog(config = {}) {
    const { title = "Roll", rollDetails = {} } = config;
    
    // Set defaults
    const defaults = {
      hopeDieSize: 'd12',
      fearDieSize: 'd12',
      advantage: 0,
      disadvantage: 0,
      modifier: 0
    };
    
    const initialValues = { ...defaults, ...rollDetails };
    
    const content = `
    <form>
    <div class="flex-col" style="align-items: stretch; gap: 2rem">
        <div class="flex-row" style="justify-content: center; gap: 2rem;">
            <div class="flex-col">
                <span class="label-bar">Hope Die</span>
                <select name="hopeDieSize" id="hopeDieSize">
                    <option value="d12" ${ initialValues.hopeDieSize !== 'd20' ? 'selected' : ''}>d12</option>
                    <option value="d20" ${ initialValues.hopeDieSize === 'd20' ? 'selected' : ''}>d20</option>
                </select>
            </div>
            <div class="flex-col">
                <span class="label-bar">Fear Die</span>
                <select name="fearDieSize" id="fearDieSize">
                    <option value="d12" ${ initialValues.fearDieSize !== 'd20' ? 'selected' : ''}>d12</option>
                    <option value="d20" ${ initialValues.fearDieSize === 'd20' ? 'selected' : ''}>d20</option>
                </select>
            </div>
        </div>
      <div class="flex-row">
        <div class="flex-col stepper-group">
          <span class="label-bar">Advantage</span>
          <div class="flex-row">
            <button id="adv-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceAdvantageInput" min="0" name="advantage" step="1" type="number" value="${ initialValues.advantage }"/>
            <button id="adv-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
        <div class="flex-col stepper-group">
          <span class="label-bar">Disadvantage</span>
          <div class="flex-row">
            <button id="dis-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceDisadvantageInput" min="0" name="disadvantage" step="1" type="number" value="${ initialValues.disadvantage }"/>
            <button id="dis-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
      </div>
      <div class="flex-row">
        <div class="flex-col stepper-group">
          <span class="label-bar">Flat Modifier</span>
          <div class="flex-row">
            <button id="mod-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceModifierInput" autofocus name="modifier" step="1" type="number" value="${ initialValues.modifier }"/>
            <button id="mod-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
      </div>
    </div>
    </form>
    `;
    
    const result = await this.showDialog({
      title,
      content,
      dialogClass: 'daggerheart-roll-dialog',
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
            return { advantage, disadvantage, modifier, hopeDieSize, fearDieSize };
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
            return { advantage, disadvantage, modifier, hopeDieSize, fearDieSize, reaction: true };
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => null
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
      }
    });
    
    return result;
  }

  /**
   * Show the Recovery Allocation dialog for Risk it All
   * @param {Object} config - Dialog configuration
   * @param {string} config.characterName - Character name
   * @param {number} config.availablePoints - Points available for healing
   * @param {number} config.currentHP - Current HP value
   * @param {number} config.currentStress - Current Stress value
   * @param {number} config.maxHP - Maximum HP
   * @param {number} config.maxStress - Maximum Stress
   * @returns {Promise} - Resolves with allocation choices or null
   */
  static async showRecoveryAllocationDialog(config) {
    const { characterName, availablePoints, currentHP, currentStress, maxHP, maxStress } = config;
    
    const maxHPHealing = currentHP; // Can't heal more than current damage
    const maxStressHealing = currentStress; // Can't heal more than current stress
    
    const content = `
      <form>
        <div class="recovery-dialog-content">
          <div class="recovery-header">
            <p class="recovery-title">${characterName} can recover <strong>${availablePoints}</strong> points!</p>
            <p class="recovery-subtitle">Allocate healing between HP and Stress</p>
          </div>
          
          <div class="current-status">
            <div class="status-item">
              <span class="status-label">Current HP:</span>
              <span class="status-value">${currentHP}/${maxHP}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Current Stress:</span>
              <span class="status-value">${currentStress}/${maxStress}</span>
            </div>
          </div>
          
          <div class="allocation-controls">
            <div class="allocation-group">
              <label for="hpHealing">HP Healing:</label>
              <div class="stepper-group">
                <button type="button" class="recovery-minus" data-target="hpHealing">-</button>
                <input type="number" id="hpHealing" name="hpHealing" min="0" max="${Math.min(maxHPHealing, availablePoints)}" value="0" />
                <button type="button" class="recovery-plus" data-target="hpHealing">+</button>
              </div>
              <span class="max-available">(max: ${maxHPHealing})</span>
            </div>
            
            <div class="allocation-group">
              <label for="stressHealing">Stress Healing:</label>
              <div class="stepper-group">
                <button type="button" class="recovery-minus" data-target="stressHealing">-</button>
                <input type="number" id="stressHealing" name="stressHealing" min="0" max="${Math.min(maxStressHealing, availablePoints)}" value="0" />
                <button type="button" class="recovery-plus" data-target="stressHealing">+</button>
              </div>
              <span class="max-available">(max: ${maxStressHealing})</span>
            </div>
          </div>
          
          <div class="allocation-status">
            <p>Points Used: <span id="pointsUsed">0</span> / <span id="pointsAvailable">${availablePoints}</span></p>
            <p id="remainingPoints">Remaining: ${availablePoints}</p>
          </div>
          
          <div class="quick-buttons">
            <button type="button" class="quick-btn" data-action="maxHP">Max HP</button>
            <button type="button" class="quick-btn" data-action="maxStress">Max Stress</button>
            <button type="button" class="quick-btn" data-action="split">Split Even</button>
            <button type="button" class="quick-btn" data-action="clear">Clear All</button>
          </div>
        </div>
      </form>
    `;
    
    const result = await this.showDialog({
      title: `Recovery Allocation - ${characterName}`,
      content,
      dialogClass: 'recovery-dialog',
      buttons: {
        confirm: {
          label: "Apply Healing",
          icon: '<i class="fas fa-heart"></i>',
          callback: (html) => {
            const hpHealing = parseInt(html.find('#hpHealing').val()) || 0;
            const stressHealing = parseInt(html.find('#stressHealing').val()) || 0;
            return { html, button: 'confirm', hpHealing, stressHealing };
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => null
        }
      },
      default: 'confirm',
      render: (html) => {
        const hpInput = html.find('#hpHealing');
        const stressInput = html.find('#stressHealing');
        const pointsUsedSpan = html.find('#pointsUsed');
        const remainingSpan = html.find('#remainingPoints');
        
        function updateDisplay() {
          const hpVal = parseInt(hpInput.val()) || 0;
          const stressVal = parseInt(stressInput.val()) || 0;
          const total = hpVal + stressVal;
          const remaining = availablePoints - total;
          
          pointsUsedSpan.text(total);
          remainingSpan.text(`Remaining: ${remaining}`);
          
          // Color coding
          if (total > availablePoints) {
            remainingSpan.css('color', '#e38c3e').text(`Over by: ${total - availablePoints}`);
          } else if (total === availablePoints) {
            remainingSpan.css('color', '#81ccc3').text('Perfect allocation!');
          } else {
            remainingSpan.css('color', '#f0f0e0').text(`Remaining: ${remaining}`);
          }
          
          // Update max values based on remaining points
          const remainingForHP = Math.min(maxHPHealing, hpVal + remaining);
          const remainingForStress = Math.min(maxStressHealing, stressVal + remaining);
          
          hpInput.attr('max', remainingForHP);
          stressInput.attr('max', remainingForStress);
        }
        
        // Input change handlers
        hpInput.on('input change', updateDisplay);
        stressInput.on('input change', updateDisplay);
        
        // Stepper buttons
        html.find('.recovery-plus').on('click', (e) => {
          const target = $(e.currentTarget).data('target');
          const input = html.find(`#${target}`);
          const currentVal = parseInt(input.val()) || 0;
          const maxVal = parseInt(input.attr('max')) || 0;
          
          if (currentVal < maxVal) {
            input.val(currentVal + 1);
            updateDisplay();
          }
        });
        
        html.find('.recovery-minus').on('click', (e) => {
          const target = $(e.currentTarget).data('target');
          const input = html.find(`#${target}`);
          const currentVal = parseInt(input.val()) || 0;
          
          if (currentVal > 0) {
            input.val(currentVal - 1);
            updateDisplay();
          }
        });
        
        // Quick action buttons
        html.find('.quick-btn').on('click', (e) => {
          const action = $(e.currentTarget).data('action');
          
          switch (action) {
            case 'maxHP':
              hpInput.val(Math.min(maxHPHealing, availablePoints));
              stressInput.val(0);
              break;
            case 'maxStress':
              hpInput.val(0);
              stressInput.val(Math.min(maxStressHealing, availablePoints));
              break;
            case 'split':
              const splitAmount = Math.floor(availablePoints / 2);
              const hpAmount = Math.min(splitAmount, maxHPHealing);
              const stressAmount = Math.min(availablePoints - hpAmount, maxStressHealing);
              hpInput.val(hpAmount);
              stressInput.val(stressAmount);
              break;
            case 'clear':
              hpInput.val(0);
              stressInput.val(0);
              break;
          }
          
          updateDisplay();
        });
        
        // Initial display update
        updateDisplay();
      }
    });
    
    return result;
  }
} 