import { DaggerheartDialogHelper } from "../dialog-helper.js";

const {
  ux, api, apps, sheets
} = foundry.applications;

/**
 * Extend the basic ActorSheet with modifications for daggerheart
 * @extends {ActorSheetV2}
 */
export class AdversaryActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {

  // TODO Depricate fully or add to a base actor class.
  // Pending Info is used to manage rolls and chat info.
  _pendingRollName = null;
  _pendingRollType = null;
  clearPendingRoll() {
    this._pendingRollName = null;
    this._pendingRollType = null;
  }
  getPendingRollName() {
    return this._pendingRollName;
  }
  getPendingRollType() {
    return this._pendingRollType;
  }

  // Depiracate these calls
  setPendingRollType(value) {
    this._pendingRollName = value;
  }
  setPendingWeaponName(value) {
    this._pendingRollName = value;
  }
  getPendingWeaponName() {
    return this._pendingRollName;
  }


  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["daggerheart", "adversary", "sheet"],
    document: null,
    editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
    window: {
      resizable: true,
      //title: 'DCC.ActorSheetTitle' // Just the localization key
    },
    form: {
      submitOnChange: true
    },
    position: {
      width: 650,
      height: 840
    },
    actions: {
      editImage: this.#editImage,
      takeDamage: this.#takeDamage,
      rollAction: this.#rollAction,
      rollDamage: this.#rollDamage,
      openDeathMove: this.#openDeathMove,
      decrementValue: this.#decrementValue,
      incrementValue: this.#incrementValue,
      setDamageValue: this.#setDamageValue,
    },
  };

  /** @override */
  static PARTS = {
    base: {
      template: "./systems/daggerheart/templates/actor-adversary.hbs"
    },
    tabs: {
      template: "./systems/daggerheart/templates/partials/actor-general-tabs.hbs"
    },
    details: {
      template: "./systems/daggerheart/templates/partials/actor-adversary-tabs-details.hbs",
      scrollable: [''],
    },
    biography: {
      template: "./systems/daggerheart/templates/partials/actor-adversary-tabs-biography.hbs",
      scrollable: [''],
    },
  }


  _getTabs(parts) {
    // Set the default tab
    const tabGroup = 'primary';

    if (!this.tabGroups[tabGroup])
      this.tabGroups[tabGroup] = 'details';

    // Run over and handle all the options
    return parts.reduce((tabs, partId) => {
      const tab = {
        id: '',
        css: '',
        group: tabGroup,
        label: 'DH.Tab.Label',
      };

      switch (partId) {
        case 'base':
        case 'tabs':
          return tabs;
        case 'details':
          tab.id = 'details';
          tab.label = game.i18n.localize('DH.Tabs.Details');
          break;
        case 'biography':
          tab.id = 'biography';
          tab.label = game.i18n.localize('DH.Tabs.Biography');
          break;
        default:
      }

      // This is what turns on a single tab
      if (this.tabGroups[tabGroup] === tab.id)
        tab.css = 'active';

      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /** @override */
  async _prepareContext(options) {
    console.log('ActorAdversary: Prepare context actor:');
    console.log(this.actor);
    console.log('ActorAdversary: Prepare context options:');
    console.log(options);

    // Base Context
    const context = {
      actor: this.actor,
      system: this.actor.system
    };

    // Create the tabs context object
    context.tabs = this._getTabs(options.parts);

    const health = context.system.health;
    // Check if NPC is dying/dead (hit points maxed out)
    context.isDying = health && health.value === health.max && health.max > 0;

    // Enrich biography content for display as html field
    context.biographyHTML = await ux.TextEditor.implementation.enrichHTML(this.document.system.biography, {
      secrets: this.document.isOwner,
      relativeTo: this.document
    })

    console.log('ActorAdversary: Context ready:');
    console.log(context);
    return context;
  }

  /** @override */
  async _processSubmitData(event, form, formData) {
    console.log("ActorAdversary: update actor data:");
    console.log(formData);

    if (this.actor.name !== formData.name) {
      this.actor.update({
        name: formData.name
      })
    }
    await this.document.update(formData);
    this.render();
  }

  static async #editImage(event, target) {
    console.log("ActorAdversary: edit actor image:");
    console.log(target);

    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(
      this.document, field
    );

    const fp = new apps.FilePicker({
      type: "image",
      current: current,
      callback: (path) => this.document.update({
        [field]: path
      })
    });

    fp.render(true);
  }


  async _rollBasic(basicValue) {
    const basicName = this._pendingRollName;
    // Check if this is a damage or healing roll and use appropriate function
    if (this._pendingRollType === "damage") {
      // Use the damage rolling function which will add application buttons
      await game.daggerheart.damageApplication.rollDamage(basicValue, {
        flavor: `<p class="roll-flavor-line"><b>${basicName}</b></p>`,
        sourceActor: this.actor
      });
    } else if (this._pendingRollType === "healing") {
      // Use the healing rolling function which will add application buttons
      await game.daggerheart.damageApplication.rollHealing(basicValue, {
        flavor: `<p class="roll-flavor-line"><b>${basicName}</b></p>`,
        sourceActor: this.actor
      });
    } else {
      // Use the rollHandler for other roll types
      await game.daggerheart.rollHandler.quickRoll(basicValue, {
        flavor: basicName,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      });
    }

    // Clear pending roll data
    this.clearPendingRoll();
  }

  async _rollPrimaryAttack() {
    console.log("ActorAdversary: roll primary attack:");
    console.log(this.actor);

    const data = this.actor.system;

    const name = data.primary.name;
    const traitValue = data.attack.value;

    // Store data for chat message
    this._pendingRollType = "attack";
    this._pendingRollName = name;

    // TODO: To get the damage to work we need to look at:
    // daggerheart.js > Hooks.on("renderChatMessage" > actorType
    // daggerheart.js > Hooks.on("renderChatMessage" > weaponData

    // Note: This replaces _rollTrait from the original actor sheet
    const namePrint = name.charAt(0).toUpperCase() + name.slice(1);
    await game.daggerheart.rollHandler.npcRollWithDialog({
      title: `Roll for ${namePrint}`,
      actor: this.actor,
      traitValue,
    });
  }

  async _rollPrimaryDamage() {
    const data = this.actor.system;

    // Store data for chat message
    this._pendingRollType = "damage";
    this._pendingRollName = data.primary.name;

    const damageData = data.primary.damage;
    const damageValue = damageData?.value || '1d8';

    // TODO Add posible modifiers to the damage, trough value should have those?

    await this._rollBasic(damageValue);
  }


  static async #takeDamage(event, target) {
    event.preventDefault();

    console.log("ActorAdversary: event #takeDamage:")
    console.log(target);

    const damage = parseInt(target.dataset.amount);
    if (!damage || !this.actor.system.health) {
      return;
    }

    const max = this.actor.system.health.max;
    const value = this.actor.system.health.value + damage;

    this.actor.update({
      'system.health.value': max !== undefined ? Math.min(value, max) : value,
    });
  }

  static async #rollAction(event, target) {
    event.preventDefault();

    // Note: This replaces _onRollableClick in the old actor sheet.
    console.log("ActorAdversary: event #rollAction:")
    console.log(target);

    switch (target.dataset.rollType) {
      case "primary":
        await this._rollPrimaryAttack();
        break;
      default:
        console.warn("tried to roll an unkown type");
    }
  }

  static async #rollDamage(event, target) {
    event.preventDefault();

    // Note: This replaces _onBasicRollableClick in the old actor sheet.
    console.log("ActorAdversary: event #rollDamage:")
    console.log(target);

    switch (target.dataset.rollType) {
      case "primary":
        await this._rollPrimaryDamage();
        break;
      default:
        console.warn("tried to roll an unkown type");
    }
  }

  static async #openDeathMove(event, target) {
    event.preventDefault();

    console.log("ActorAdversary: event #openDeathMove:")
    console.log(target);

    // Show the Death Move dialog
    const characterName = this.actor.name;
    await DaggerheartDialogHelper.showDeathMoveDialog(characterName, this.actor);
  }

  static async #decrementValue(event, target) {
    event.preventDefault();

    console.log("ActorAdversary: event #decrementValue:")
    console.log(target);

    const field = target.dataset.field;
    const value = foundry.utils.getProperty(this.actor.system, field) - 1;

    this.actor.update({
      [`system.${field}`]: Math.max(0, value)
    });
  }

  static async #incrementValue(event, target) {
    event.preventDefault();

    console.log("ActorAdversary: event #incrementValue:")
    console.log(target);

    const field = target.dataset.field;
    const max = foundry.utils.getProperty(
      this.actor.system, field.split('.')[0] + '.max'
    );
    const value = foundry.utils.getProperty(
      this.actor.system, field
    ) + 1;

    this.actor.update({
      [`system.${field}`]: max !== undefined ? Math.min(value, max) : value,
    });
  }


  ////////////////////////////////////////////////////////////////////////////
  // TODO The Stuff below is broken, damage and attack editor overlay
  //
  // Below should be an application of it's own or be part of the base class?
  // * This seems overly complicated and depends on data sets within HTML
  // elements for computation. Are we mixing presentation with logic?
  // * Second problem are the jquery lookups, these are depricated!
  ////////////////////////////////////////////////////////////////////////////

  static async #setDamageValue(event, target) {
    console.warn("Trigger jquery breakdown!");

    event.preventDefault();
    const displayElement = event.currentTarget;

    // Get configuration from data attributes or derive from context
    const config = {
      field: displayElement.dataset.field,
      label: displayElement.dataset.label,
      type: displayElement.dataset.editType || 'damage',
      hasModifiers: displayElement.dataset.hasModifiers !== 'false',
      min: displayElement.dataset.min ? parseInt(displayElement.dataset.min) : null,
      max: displayElement.dataset.max ? parseInt(displayElement.dataset.max) : null
    };

    // If no label provided, use a default
    if (!config.label) {
      config.label = 'Weapon Damage';
    }

    // Get the actual damage data using the field path
    let damageData = foundry.utils.getProperty(this.actor, config.field);

    // Normalize the damage data to structured format
    if (typeof damageData === 'object' && damageData !== null && 'baseValue' in damageData) {
      // Already structured - but check for corrupted baseValue that might contain flattened formula
      const baseValue = damageData.baseValue || '1d8';
      const modifiers = damageData.modifiers || [];

      // If baseValue contains spaces and we have no modifiers, it might be a flattened formula
      // that got corrupted - try to extract the real base value
      if (baseValue.includes(' ') && modifiers.length === 0) {
        // Extract just the first dice part as the real base
        const match = baseValue.match(/^(\d*d\d+)/);
        if (match) {
          damageData.baseValue = match[1];
          damageData.modifiers = [];
          damageData.value = match[1];
        }
      }
    } else if (typeof damageData === 'object' && damageData !== null && 'value' in damageData) {
      // Has .value but missing structure - this is a legacy mixed case
      const displayValue = damageData.value || '1d8';
      damageData = {
        baseValue: displayValue, // Treat the existing value as base (might be flattened)
        modifiers: damageData.modifiers || [],
        value: displayValue
      };
    } else {
      // Simple string/primitive - convert to structure
      const simpleValue = damageData || '1d8';
      damageData = {
        baseValue: simpleValue,
        modifiers: [],
        value: simpleValue
      };
    }

    // Ensure modifiers is always an array
    if (!Array.isArray(damageData.modifiers)) {
      damageData.modifiers = [];
    }

    // Check if this is from an equipped weapon
    config.isFromEquippedWeapon = damageData.isFromEquippedWeapon || false;

    // Show the damage modifier popup
    this._showDamageModifierEditPopup(config, damageData, displayElement);
  }

  ////////////////////////////////////////////////////////////////////////////

  /**
   * Check if a field has base value restrictions
   * @param {string} field - The field path to check
   * @returns {boolean} - Whether the field has restrictions
   */
  hasBaseValueRestriction(field) {
    const restrictionPath = `flags.daggerheart.baseValueRestrictions.${field.replace(/\./g, '_')}`;
    const restriction = foundry.utils.getProperty(this.actor, restrictionPath);
    return restriction && !restriction.editable;
  }

  /**
   * Get base value restriction data for a field
   * @param {string} field - The field path to check
   * @returns {object|null} - The restriction data or null
   */
  getBaseValueRestriction(field) {
    const restrictionPath = `flags.daggerheart.baseValueRestrictions.${field.replace(/\./g, '_')}`;
    return foundry.utils.getProperty(this.actor, restrictionPath);
  }

  /**
   * Remove base value restrictions for a specific field
   * @param {string} field - The field path to remove restrictions from
   */
  async removeBaseValueRestriction(field) {
    console.log("Daggerheart | Removing base value restriction for:", field);
    const restrictionPath = `flags.daggerheart.baseValueRestrictions.${field.replace(/\./g, '_')}`;
    await this.actor.update({ [restrictionPath]: null });
    console.log("Daggerheart | Base value restriction removed for:", field);
  }

  ////////////////////////////////////////////////////////////////////////////

  _updateDamageTotal(overlay) {
    const baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    let modifierParts = [];

    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      const isEnabled = $row.find('.damage-modifier-toggle').is(':checked');

      if (isEnabled) {
        const value = $row.find('.damage-modifier-value').val().trim();
        if (value) {
          // Ensure proper formatting - add + if it doesn't start with + or -
          let formattedValue = value;
          if (value && !value.startsWith('+') && !value.startsWith('-')) {
            formattedValue = '+' + value;
          }
          modifierParts.push(formattedValue);
        }
      }
    });

    // Build the total formula
    let totalFormula = baseValue;
    if (modifierParts.length > 0) {
      totalFormula += ' ' + modifierParts.join(' ');
    }

    // Update the popup preview total
    overlay.find('.damage-total-value').text(totalFormula);

    // DO NOT update the display element during editing - only for preview
    // This preserves the structured data for future editing

    return totalFormula;
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

    // Simple event handlers without propagation issues
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

  ////////////////////////////////////////////////////////////////////////////

  _addDamageModifier(overlay) {
    const newModifier = {
      name: 'Modifier',
      value: '+1',
      enabled: true
    };

    const modifiersList = overlay.find('.damage-modifiers-list');
    const index = modifiersList.children().length;

    this._createDamageModifierRow(overlay, newModifier, index);

    // Focus the name input of the new modifier and select the text
    const newRow = modifiersList.children().last();
    const nameInput = newRow.find('.damage-modifier-name');
    nameInput.focus().select();
  }

  _loadDamageModifiers(overlay, modifiers) {
    const modifiersList = overlay.find('.damage-modifiers-list');
    modifiersList.empty();

    // Ensure modifiers is an array
    if (!Array.isArray(modifiers)) {
      modifiers = [];
    }

    modifiers.forEach((modifier, index) => {
      this._createDamageModifierRow(overlay, modifier, index);
    });
  }

  ////////////////////////////////////////////////////////////////////////////

  _animatePopupIn(popup, callback) {
    let start = null;
    const duration = 200; // 200ms animation

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);

      const scale = 0.8 + (0.2 * eased); // From 0.8 to 1.0
      const opacity = eased; // From 0 to 1

      popup.css({
        'transform': `scale(${scale})`,
        'opacity': opacity
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback && callback();
      }
    };

    requestAnimationFrame(animate);
  }

  _animatePopupOut(popup, callback) {
    let start = null;
    const duration = 150; // Slightly faster out animation

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      // Easing function (ease-in)
      const eased = Math.pow(progress, 2);

      const scale = 1.0 - (0.2 * eased); // From 1.0 to 0.8
      const opacity = 1 - eased; // From 1 to 0

      popup.css({
        'transform': `scale(${scale})`,
        'opacity': opacity
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback && callback();
      }
    };

    requestAnimationFrame(animate);
  }

  _hideDamageEditPopup(overlay) {
    const popup = overlay.find('.damage-edit-popup');
    this._animatePopupOut(popup, () => {
      overlay.hide();
      overlay.remove(); // Clean up the popup
    });
  }

  ////////////////////////////////////////////////////////////////////////////

  async _submitDamageEdit(overlay) {
    const config = overlay.data('config');
    const attributeName = overlay.data('attribute-name');

    // Check if base value is restricted
    const hasRestriction = this.hasBaseValueRestriction(config.field);
    const restriction = this.getBaseValueRestriction(config.field);

    let baseValue;
    if (hasRestriction && restriction && !restriction.editable) {
      // Use the restricted value, don't allow user input to override
      baseValue = String(restriction.value) || '1d8';
    } else {
      // Use the user-entered value
      baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    }

    // Collect modifiers
    const modifiers = [];
    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      let name = $row.find('.damage-modifier-name').val().trim();
      const value = $row.find('.damage-modifier-value').val().trim();
      const enabled = $row.find('.damage-modifier-toggle').is(':checked');

      // Only save modifiers that have a value (even if name is empty)
      if (value) {
        // Default name if empty
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

    // Calculate final formula for the value field using the correct base value
    let totalFormula = baseValue;
    const enabledModifiers = modifiers.filter(mod => mod.enabled !== false && mod.value);

    if (enabledModifiers.length > 0) {
      enabledModifiers.forEach(modifier => {
        let modValue = modifier.value.trim();
        // Ensure proper formatting - add + if it doesn't start with + or -
        if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
          modValue = '+' + modValue;
        }
        totalFormula += ' ' + modValue;
      });
    }

    // Build update data based on the field path
    const updateData = {};

    // Check if we're dealing with weapon damage
    const isWeaponDamage = config.field.includes('weapon-main.damage') || config.field.includes('weapon-off.damage');

    let basePath;
    if (isWeaponDamage) {
      // For weapon damage, the field itself is the base path
      basePath = config.field;
    } else {
      // For other attributes, remove .value from the path
      basePath = config.field.substring(0, config.field.lastIndexOf('.'));
    }

    updateData[`${basePath}.baseValue`] = baseValue;
    updateData[`${basePath}.modifiers`] = modifiers;
    updateData[`${basePath}.value`] = totalFormula;

    await this.actor.update(updateData);

    // DO NOT update the display element directly - let the sheet re-render
    // This preserves the structured data for future editing

    this._hideDamageEditPopup(overlay);
  }

  _showDamageModifierEditPopup(config, damageData, displayElement) {
    // Create the damage popup HTML if it doesn't exist
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
                <label class="base-value-label">Base Formula</label>
                <div class="base-value-controls">
                  <input type="text" class="damage-base-input attribute-base-input" placeholder="1d8" />
                  <div class="equipped-weapon-indicator" style="display: none;">
                    <span class="equipped-weapon-text">From equipped weapon</span>
                  </div>
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

    // Extract attribute name for data access
    const pathParts = config.field.split('.');
    const attributeName = pathParts[pathParts.length - 2]; // e.g., "system.weapon-main.damage" -> "weapon-main"

    // Set up the popup content
    overlay.find('.damage-edit-label').text(config.label);

    // Set base value from structured damage data
    const baseInput = overlay.find('.damage-base-input');
    const baseValue = damageData.baseValue || '1d8';

    baseInput.val(baseValue);

    // Handle equipped weapon case
    const equippedIndicator = overlay.find('.equipped-weapon-indicator');

    // Check for base value restrictions
    const hasRestriction = this.hasBaseValueRestriction(config.field);
    const restriction = this.getBaseValueRestriction(config.field);

    if (hasRestriction && restriction && !restriction.editable) {
      // Apply restriction - disable base value editing
      baseInput.prop('readonly', true).addClass('restriction-locked');
      equippedIndicator.show();
      overlay.find('.equipped-weapon-text').text('Base formula locked by equipped weapon');
      overlay.find('.base-value-label').text('Base Formula (From Equipped Weapon)');

      // Override the displayed base value with the restricted value
      baseInput.val(restriction.value);
    } else {
      baseInput.prop('readonly', false).removeClass('weapon-locked restriction-locked');
      equippedIndicator.hide();
      overlay.find('.base-value-label').text('Base Formula');
    }

    // Store config for later use
    overlay.data('config', config);
    overlay.data('attribute-name', attributeName);
    overlay.data('field-name', config.field);
    overlay.data('display-element', displayElement);

    // Load existing modifiers
    this._loadDamageModifiers(overlay, damageData.modifiers || []);

    // Calculate and display total
    this._updateDamageTotal(overlay);

    // Show the popup with animation
    overlay.show();
    const popup = overlay.find('.damage-edit-popup');

    // Animate in with JavaScript for smooth backdrop-filter
    this._animatePopupIn(popup, () => {
      baseInput.focus().select();
    });

    // Set up event handlers -- inline
    //this._setupDamagePopupEventHandlers(overlay);

    // Clear any existing handlers
    overlay.off('.damage-edit');
    overlay.find('*').off('.damage-edit');

    // Base value input handler
    // const baseInput = overlay.find('.damage-base-input');
    baseInput.on('input', () => this._updateDamageTotal(overlay));

    // Keyboard shortcuts
    overlay.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideDamageEditPopup(overlay);
      }
    });

    // Add modifier button
    overlay.find('.add-damage-modifier-btn').on('click', () => {
      this._addDamageModifier(overlay);
    });

    // Close button
    overlay.find('.damage-edit-close').on('click', () => {
      this._submitDamageEdit(overlay);
    });

    // Click outside to close (only on the overlay background)
    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitDamageEdit(overlay);
      }
    });
  }
}