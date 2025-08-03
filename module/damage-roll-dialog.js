import { DaggerheartDialogHelper } from './dialog-helper.js';
import { rollDamage } from './damage-application.js';

console.log("Daggerheart | DamageRollDialog module loaded");

export class DamageRollDialog {

  static async show(config = {}) {
    console.log("Daggerheart | DamageRollDialog.show called with:", config);

    try {
      const {
        title = game.i18n.localize("DH.DamageRoll"),
        formula = "1d8",
        sourceActor = null,
        weaponName = null,
        weaponType = null,
        isCritical = false,
        damageModifiers = [],
        availableModifiers = []
      } = config;

      // Parse the base formula to extract dice and static modifiers
      const parsedFormula = this._parseFormula(formula);

      // Get clean modifiers - prioritize damageModifiers, only add availableModifiers that aren't duplicates
      const cleanModifiers = this._getCleanModifiers(damageModifiers, availableModifiers);

      const content = this._buildDialogContent(parsedFormula, cleanModifiers, isCritical);

      const result = await DaggerheartDialogHelper.showDialog({
        title,
        content,
        dialogClass: 'daggerheart-roll-dialog daggerheart-damage-dialog',
        buttons: {
          roll: {
            label: game.i18n.localize("DH.RollDamage"),
            icon: '<i class="fas fa-dice-d20"></i>',
            callback: (html) => this._processRollResult(html, parsedFormula)
          },
          cancel: {
            label: game.i18n.localize("Cancel"),
            icon: '<i class="fas fa-times"></i>',
            callback: () => null
          }
        },
        default: 'roll',
        render: (html) => this._setupEventHandlers(html, parsedFormula, sourceActor)
      });

      if (result && result.button === 'roll') {
        const finalFormula = result.finalFormula;
        const enabledModifiers = result.enabledModifiers;

        // Create flavor text with enabled modifiers
        let flavorText = `<p class="roll-flavor-line"><b>${game.i18n.localize("DH.DamageRoll")}</b>`;
        if (weaponName) {
          flavorText += ` - ${weaponName}`;
        }
        if (isCritical) {
          flavorText += ` (${game.i18n.localize("DH.CriticalHit").split(' - ')[0]})`;
        }
        flavorText += `</p>`;

        if (enabledModifiers.length > 0) {
          flavorText += `<p class="damage-modifiers">${game.i18n.localize("DH.DamageModifiers")}: ${enabledModifiers.join(', ')}</p>`;
        }

        // Roll the damage using the proper damage system that handles proficiency and critical damage
        await rollDamage(result.baseFormula, {
          sourceActor,
          flavor: flavorText,
          weaponName,
          weaponType,
          isCritical,
          sendToChat: true,
          damageData: {
            baseValue: result.baseFormula,
            modifiers: result.enabledModifiers.map(name => {
              const modifier = cleanModifiers.find(m => m.name === name);
              return {
                name: modifier?.name || name,
                value: modifier?.formula || modifier?.value || '+1',
                enabled: true
              };
            })
          },
          proficiency: sourceActor?.type === "character" ? 
            Math.max(1, parseInt(sourceActor.system.proficiency?.value) || 1) : null
        });
      }

      return result;
    } catch (error) {
      console.error("Daggerheart | Error in DamageRollDialog.show:", error);
      ui.notifications.error("Failed to show damage dialog. Check console for details.");
      throw error;
    }
  }

  static _parseFormula(formula) {
    // Parse a formula like "2d8+1d6+3" into components
    const parts = {
      dice: [],
      staticModifier: 0,
      originalFormula: formula || "1d8"
    };

    if (!formula || typeof formula !== 'string') {
      return parts;
    }

    // Remove spaces
    const cleanFormula = formula.replace(/\s/g, '');

    // Match dice patterns (like 2d8, 1d6) and static numbers
    const diceRegex = /(\d*)d(\d+)/g;
    const staticRegex = /(?:^|[+-])(\d+)(?![d\d])/g;

    let match;

    // Extract dice
    while ((match = diceRegex.exec(cleanFormula)) !== null) {
      const count = parseInt(match[1]) || 1;
      const sides = parseInt(match[2]);
      if (sides > 0) {
        parts.dice.push({ count, sides, formula: `${count}d${sides}` });
      }
    }

    // Extract static modifiers
    while ((match = staticRegex.exec(cleanFormula)) !== null) {
      const value = parseInt(match[1]);
      const sign = cleanFormula[match.index] === '-' ? -1 : 1;
      parts.staticModifier += value * sign;
    }

    return parts;
  }

  static _getCleanModifiers(damageModifiers = [], availableModifiers = []) {
    // Simple approach: just use damageModifiers if they exist, otherwise use availableModifiers
    // This avoids all the complex merging logic that was causing duplicates

    if (damageModifiers.length > 0) {
      console.log("Daggerheart | Using damageModifiers:", damageModifiers);
      return damageModifiers.map((mod, index) => ({
        id: mod.id || `damage_${index}`,
        name: mod.name || 'Damage Modifier',
        formula: mod.formula || mod.value || '+1',
        enabled: mod.enabled !== false,
        source: mod.source || 'damage',
        permanent: mod.permanent || false
      }));
    }

    if (availableModifiers.length > 0) {
      console.log("Daggerheart | Using availableModifiers:", availableModifiers);
      return availableModifiers.map((mod, index) => ({
        id: mod.id || `available_${index}`,
        name: mod.name || 'Modifier',
        formula: mod.formula || mod.value || '+1',
        enabled: mod.enabled === true,
        source: mod.source || 'available',
        permanent: mod.permanent || false
      }));
    }

    console.log("Daggerheart | No modifiers available");
    return [];
  }

  static _buildDialogContent(parsedFormula, modifiers, isCritical) {
    let modifiersHtml = '';
    if (modifiers.length > 0) {
      modifiersHtml = `
        <div class="flex-col">
          <span class="label-bar">${game.i18n.localize("DH.DamageModifiers")}</span>
          <div class="modifiers-list">
            ${modifiers.map(mod => {
        const sourceDisplay = this._getSourceDisplayName(mod.source);
        const showSource = sourceDisplay && sourceDisplay !== 'Damage Bonus';

        return `
                <label class="modifier-item ${mod.enabled ? 'enabled' : ''} ${mod.permanent ? 'permanent' : ''}" data-modifier-id="${mod.id}" for="modifier_${mod.id}">
                  <input type="checkbox" 
                         id="modifier_${mod.id}" 
                         class="modifier-checkbox" 
                         data-formula="${mod.formula}"
                         data-name="${mod.name}"
                         data-source="${mod.source || ''}"
                         ${mod.enabled ? 'checked' : ''}>
                  <div class="modifier-label">
                    <div class="modifier-info">
                      <span class="modifier-name">${mod.name}${mod.permanent ? ' <span class="permanent-indicator">[P]</span>' : ''}</span>
                      ${showSource ? `<span class="modifier-source">${sourceDisplay}</span>` : ''}
                    </div>
                    <span class="modifier-formula">${mod.formula}</span>
                  </div>
                </label>
              `;
      }).join('')}
          </div>
        </div>
      `;
    }

    return `
      <form>
        <div class="daggerheart-dialog-content">
          <div class="flex-col">
            <span class="label-bar">${game.i18n.localize("DH.BaseDamageFormula")}</span>
            <div class="formula-display">
              <input type="text" 
                     id="damage-formula-input" 
                     class="damage-formula-input" 
                     value="${parsedFormula.originalFormula}"
                     placeholder="1d8+2">
            </div>
            ${isCritical ? `<div class="critical-notice"><i class="fas fa-star"></i> ${game.i18n.localize("DH.CriticalHit")}</div>` : ''}
          </div>
          
          ${modifiersHtml}
          
          <div class="flex-col">
            <span class="label-bar">${game.i18n.localize("DH.FinalFormula")}</span>
            <div class="final-formula-display" id="final-formula-display">
              ${parsedFormula.originalFormula}
            </div>
          </div>
        </div>
      </form>
    `;
  }

  static _setupEventHandlers(html, parsedFormula, sourceActor = null) {
    const formulaInput = html.find('#damage-formula-input');
    const finalFormulaDisplay = html.find('#final-formula-display');

    const updateFinalFormula = () => {
      const baseFormula = formulaInput.val() || parsedFormula.originalFormula;
      const enabledModifiers = [];

      // Preview what the formula will look like after proficiency processing
      let finalFormula = this._previewProficiencyFormula(baseFormula, sourceActor);

      // Validate base formula - allow simple dice patterns that will be processed by proficiency system
      try {
        // Test if it's a valid roll formula or a proficiency dice pattern like "d12"
        const isProficiencyDice = /^d\d+(\s*[+\-]\s*\d+)*$/i.test(baseFormula.trim());
        if (!isProficiencyDice) {
          new Roll(baseFormula);
        }
        formulaInput.removeClass('invalid');
      } catch (error) {
        formulaInput.addClass('invalid');
        finalFormulaDisplay.text('Invalid Formula');
        html.data('enabledModifiers', []);
        html.data('finalFormula', baseFormula);
        return;
      }

      // Get all checkboxes fresh each time to avoid stale references
      html.find('.modifier-checkbox').each((i, checkbox) => {
        const $checkbox = $(checkbox);
        if ($checkbox.is(':checked')) {
          const modifierFormula = $checkbox.data('formula');
          const modifierName = $checkbox.data('name');

          enabledModifiers.push(modifierName);

          // Add the modifier to the formula
          if (modifierFormula.startsWith('+') || modifierFormula.startsWith('-')) {
            finalFormula += modifierFormula;
          } else {
            finalFormula += '+' + modifierFormula;
          }
        }
      });

      // Validate final formula - show preview but don't validate since proficiency processing happens later
      try {
        // For display purposes, show what the formula will look like
        // The actual proficiency processing will happen in the damage system
        finalFormulaDisplay.text(finalFormula).removeClass('invalid');
      } catch (error) {
        finalFormulaDisplay.text('Invalid Formula').addClass('invalid');
      }

      // Store the enabled modifiers for later use
      html.data('enabledModifiers', enabledModifiers);
      html.data('finalFormula', finalFormula);
    };

    // Update formula when base formula changes
    formulaInput.on('input', updateFinalFormula);

    // Use event delegation for checkbox changes
    html.on('change', '.modifier-checkbox', function (event) {
      const $checkbox = $(this);
      const $item = $checkbox.closest('.modifier-item');
      
      console.log(`Daggerheart | Checkbox changed: ${$checkbox.is(':checked')}`);

      // Update visual state
      if ($checkbox.is(':checked')) {
        $item.addClass('enabled');
      } else {
        $item.removeClass('enabled');
      }

      updateFinalFormula();
    });

    // Initial update
    updateFinalFormula();
  }

  static _processRollResult(html, parsedFormula) {
    const finalFormula = html.data('finalFormula') || parsedFormula.originalFormula;
    const enabledModifiers = html.data('enabledModifiers') || [];
    const baseFormula = html.find('#damage-formula-input').val() || parsedFormula.originalFormula;

    return {
      button: 'roll',
      finalFormula,
      enabledModifiers,
      baseFormula
    };
  }

  static _previewProficiencyFormula(baseFormula, sourceActor = null) {
    // This is just for preview - the actual processing happens in the damage system
    // Check if it looks like a proficiency dice pattern (e.g., "d12", "d8+2")
    const proficiencyMatch = baseFormula.match(/^d(\d+)(.*)$/i);
    if (proficiencyMatch) {
      if (sourceActor?.type === "character") {
        const proficiency = Math.max(1, parseInt(sourceActor.system.proficiency?.value) || 1);
        return `${proficiency}d${proficiencyMatch[1]}${proficiencyMatch[2] || ''}`;
      } else {
        // Show as "Pd12" to indicate proficiency dice will be applied
        return `P${baseFormula} (Proficiency Dice)`;
      }
    }
    return baseFormula;
  }

  static _getSourceDisplayName(source) {
    const sourceMap = {
      'weapon-main': 'Main Weapon',
      'weapon-main-permanent': 'Main Weapon (Permanent)',
      'weapon-off': 'Off-hand Weapon',
      'weapon-off-permanent': 'Off-hand Weapon (Permanent)',
      'equipment': 'Equipment',
      'modifier': 'Character',
      'effect': 'Active Effect',
      'damage': 'Damage Bonus',
      'available': 'Available',
      'other': 'Other'
    };

    return sourceMap[source] || source || 'Unknown';
  }
}