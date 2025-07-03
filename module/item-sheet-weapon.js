import { SimpleItemSheet } from "./item-sheet.js";
import { EntitySheetHelper } from "./helper.js";
import { ATTRIBUTE_TYPES } from "./constants.js";
export class SimpleWeaponSheet extends SimpleItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "item", "weapon"],
      template: "systems/daggerheart/templates/item-sheet-weapon.html",
      width: 520,
      height: 600,
      resizable: true,
      scrollY: [".card-description"],
    });
  }
  async getData(options) {
    const context = await super.getData(options);
    context.traitOptions = [
      { value: "", label: game.i18n.localize("DH.WeaponTrait") },
      { value: "agility", label: game.i18n.localize("DH.Agility") },
      { value: "strength", label: game.i18n.localize("DH.Strength") },
      { value: "finesse", label: game.i18n.localize("DH.Finesse") },
      { value: "instinct", label: game.i18n.localize("DH.Instinct") },
      { value: "presence", label: game.i18n.localize("DH.Presence") },
      { value: "knowledge", label: game.i18n.localize("DH.Knowledge") }
    ];
    context.rangeOptions = [
      { value: "", label: game.i18n.localize("DH.WeaponRange") },
      { value: "melee", label: game.i18n.localize("DH.Melee") },
      { value: "veryClose", label: game.i18n.localize("DH.VeryClose") },
      { value: "close", label: game.i18n.localize("DH.Close") },
      { value: "far", label: game.i18n.localize("DH.Far") },
      { value: "veryFar", label: game.i18n.localize("DH.VeryFar") }
    ];
    context.damageTypeOptions = [
      { value: "", label: game.i18n.localize("DH.DamageType") },
      { value: "physical", label: game.i18n.localize("DH.Physical") },
      { value: "magical", label: game.i18n.localize("DH.Magical") }
    ];
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    html.find('.damage-value-display').on('click', this._onDamageValueClick.bind(this));
  }
  async _onDamageValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;
    const config = {
      field: displayElement.dataset.field,
      label: displayElement.dataset.label,
      type: displayElement.dataset.editType || 'damage',
      hasModifiers: displayElement.dataset.hasModifiers !== 'false',
      min: displayElement.dataset.min ? parseInt(displayElement.dataset.min) : null,
      max: displayElement.dataset.max ? parseInt(displayElement.dataset.max) : null
    };
    if (!config.label) {
      config.label = 'Weapon Damage';
    }
    let damageData = foundry.utils.getProperty(this.item, config.field);
    if (typeof damageData === 'object' && damageData !== null && 'baseValue' in damageData) {
      const baseValue = damageData.baseValue || '1d8';
      const modifiers = damageData.modifiers || [];
      if (baseValue.includes(' ') && modifiers.length === 0) {
        const match = baseValue.match(/^(\d*d\d+)/);
        if (match) {
          damageData.baseValue = match[1];
          damageData.modifiers = [];
          damageData.value = match[1];
        }
      }
    } else if (typeof damageData === 'object' && damageData !== null && 'value' in damageData) {
      const displayValue = damageData.value || '1d8';
      damageData = {
        baseValue: displayValue, 
        modifiers: damageData.modifiers || [],
        value: displayValue
      };
    } else {
      const simpleValue = damageData || '1d8';
      damageData = {
        baseValue: simpleValue,
        modifiers: [],
        value: simpleValue
      };
    }
    if (!Array.isArray(damageData.modifiers)) {
      damageData.modifiers = [];
    }
    this._showDamageModifierEditPopup(config, damageData, displayElement);
  }
  _showDamageModifierEditPopup(config, damageData, displayElement) {
    let overlay = this.element.find('.damage-edit-popup-overlay');
    if (overlay.length === 0) {
      const popupHtml = `
        <div class="damage-edit-popup-overlay attribute-edit-popup-overlay" style="display: none;">
          <div class="damage-edit-popup attribute-edit-popup">
            <div class="damage-edit-header attribute-edit-header">
              <span class="damage-edit-label attribute-edit-label"></span>
              <button type="button" class="damage-edit-close attribute-edit-close">×</button>
            </div>
            <div class="damage-edit-content attribute-edit-content">
              <div class="damage-base-value attribute-base-value">
                <label>Base Formula</label>
                <div class="base-value-controls">
                  <input type="text" class="damage-base-input attribute-base-input" placeholder="1d8" />
                </div>
              </div>
              <div class="damage-modifiers-section attribute-modifiers-section">
                <div class="modifiers-header">
                  <span>Damage Modifiers</span>
                  <button type="button" class="add-damage-modifier-btn add-modifier-btn">+</button>
                </div>
                <div class="damage-modifiers-list modifiers-list"></div>
              </div>
              <div class="damage-total attribute-total">
                <label>Total Formula</label>
                <span class="damage-total-value attribute-total-value">1d8</span>
              </div>
            </div>
          </div>
        </div>
      `;
      this.element.append(popupHtml);
      overlay = this.element.find('.damage-edit-popup-overlay');
    }
    const pathParts = config.field.split('.');
    const attributeName = pathParts[pathParts.length - 1]; 
    overlay.find('.damage-edit-label').text(config.label);
    const baseInput = overlay.find('.damage-base-input');
    const baseValue = damageData.baseValue || '1d8';
    baseInput.val(baseValue);
    overlay.data('config', config);
    overlay.data('attribute-name', attributeName);
    overlay.data('field-name', config.field);
    overlay.data('display-element', displayElement);
    this._loadDamageModifiers(overlay, damageData.modifiers || []);
    this._updateDamageTotal(overlay);
    overlay.show();
    const popup = overlay.find('.damage-edit-popup');
    this._animatePopupIn(popup, () => {
      baseInput.focus().select();
    });
    this._setupDamagePopupEventHandlers(overlay);
  }
  _animatePopupIn(popup, callback) {
    popup.css({
      opacity: 0,
      transform: 'translate(-50%, -50%) scale(0.8)'
    });
    requestAnimationFrame(() => {
      popup.css({
        transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
        opacity: 1,
        transform: 'translate(-50%, -50%) scale(1)'
      });
      if (callback) {
        setTimeout(callback, 200);
      }
    });
  }
  _setupDamagePopupEventHandlers(overlay) {
    overlay.off('.damage-edit');
    overlay.find('*').off('.damage-edit');
    const baseInput = overlay.find('.damage-base-input');
    baseInput.on('input', () => this._updateDamageTotal(overlay));
    overlay.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideDamageEditPopup(overlay);
      }
    });
    overlay.find('.add-damage-modifier-btn').on('click', () => {
      this._addDamageModifier(overlay);
    });
    overlay.find('.damage-edit-close').on('click', () => {
      this._submitDamageEdit(overlay);
    });
    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitDamageEdit(overlay);
      }
    });
  }
  _loadDamageModifiers(overlay, modifiers) {
    const modifiersList = overlay.find('.damage-modifiers-list');
    modifiersList.empty();
    if (!Array.isArray(modifiers)) {
      modifiers = [];
    }
    modifiers.forEach((modifier, index) => {
      this._createDamageModifierRow(overlay, modifier, index);
    });
  }
  _createDamageModifierRow(overlay, modifier, index) {
    const modifiersList = overlay.find('.damage-modifiers-list');
    const row = $(`
      <div class="damage-modifier-row modifier-row ${modifier.enabled === false ? 'disabled' : ''}" data-index="${index}">
        <input type="text" class="damage-modifier-name modifier-name" placeholder="Modifier name" value="${modifier.name || ''}" />
        <input type="text" class="damage-modifier-value modifier-value" placeholder="±1 or ±1d4" value="${modifier.value || ''}" />
        <input type="checkbox" class="damage-modifier-toggle modifier-toggle" ${modifier.enabled !== false ? 'checked' : ''} />
        <button type="button" class="damage-modifier-delete modifier-delete">×</button>
      </div>
    `);
    row.find('.damage-modifier-name, .damage-modifier-value').on('input', () => this._updateDamageTotal(overlay));
    row.find('.damage-modifier-toggle').on('click change', (e) => {
      e.stopPropagation();
      const checkbox = $(e.currentTarget);
      const isEnabled = checkbox.prop('checked');
      row.toggleClass('disabled', !isEnabled);
      this._updateDamageTotal(overlay);
    });
    row.find('.damage-modifier-delete').on('click', (e) => {
      e.stopPropagation();
      row.remove();
      this._updateDamageTotal(overlay);
    });
    modifiersList.append(row);
  }
  _addDamageModifier(overlay) {
    const newModifier = {
      name: 'Modifier',
      value: '+1',
      enabled: true
    };
    const modifiersList = overlay.find('.damage-modifiers-list');
    const index = modifiersList.children().length;
    this._createDamageModifierRow(overlay, newModifier, index);
    const newRow = modifiersList.children().last();
    const nameInput = newRow.find('.damage-modifier-name');
    nameInput.focus().select();
  }
  _updateDamageTotal(overlay) {
    const baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    let modifierParts = [];
    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      const isEnabled = $row.find('.damage-modifier-toggle').is(':checked');
      if (isEnabled) {
        const value = $row.find('.damage-modifier-value').val().trim();
        if (value) {
          let formattedValue = value;
          if (value && !value.startsWith('+') && !value.startsWith('-')) {
            formattedValue = '+' + value;
          }
          modifierParts.push(formattedValue);
        }
      }
    });
    let totalFormula = baseValue;
    if (modifierParts.length > 0) {
      totalFormula += ' ' + modifierParts.join(' ');
    }
    overlay.find('.damage-total-value').text(totalFormula);
    return totalFormula;
  }
  async _submitDamageEdit(overlay) {
    const config = overlay.data('config');
    const attributeName = overlay.data('attribute-name');
    const baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    const modifiers = [];
    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      let name = $row.find('.damage-modifier-name').val().trim();
      const value = $row.find('.damage-modifier-value').val().trim();
      const enabled = $row.find('.damage-modifier-toggle').is(':checked');
      if (value) {
        if (!name) {
          name = 'Modifier';
        }
        modifiers.push({
          name: name,
          value: value,
          enabled: enabled
        });
      }
    });
    let totalFormula = baseValue;
    const enabledModifiers = modifiers.filter(mod => mod.enabled !== false && mod.value);
    if (enabledModifiers.length > 0) {
      enabledModifiers.forEach(modifier => {
        let modValue = modifier.value.trim();
        if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
          modValue = '+' + modValue;
        }
        totalFormula += ' ' + modValue;
      });
    }
    const updateData = {
      [`${config.field}.baseValue`]: baseValue,
      [`${config.field}.modifiers`]: modifiers,
      [`${config.field}.value`]: totalFormula
    };
    await this.item.update(updateData);
    this._hideDamageEditPopup(overlay);
  }
  _hideDamageEditPopup(overlay) {
    const popup = overlay.find('.damage-edit-popup');
    popup.css({
      transition: 'opacity 0.15s ease-in, transform 0.15s ease-in',
      opacity: 0,
      transform: 'translate(-50%, -50%) scale(0.8)'
    });
    setTimeout(() => {
      overlay.hide();
      overlay.off('.damage-edit');
      overlay.find('*').off('.damage-edit');
    }, 150);
  }
} 
