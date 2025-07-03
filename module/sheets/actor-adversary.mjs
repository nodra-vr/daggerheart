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
  OverlayType = Object.freeze({
    Attack: "attack",
    Damage: "damage",
  });
  _overlayState = {
    path: "",
    title: "",
    scale: 0.8,
    opacity: 0,
    hide: true,
    weapon: false,
    base: "",
    total: "",
    modifiers: [],
  }
  _activeOverlayType = null;


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
    classes: ["daggerheart", "adversary", "sheet", "transitions-enabled"],
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

      createModifier: this.#createModifier,
      deleteModifier: this.#deleteModifier,

      openModifiers: this.#openModifiers,
      saveModifiers: this.#saveModifiers,
      closeModifiers: this.#closeModifiers,
    },
  };

  /** @override */
  static PARTS = {
    mods: {
      template: "./systems/daggerheart/templates/partials/actor-overlay-modifiers.hbs",
    },
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
        case 'mods':
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
    // console.log('ActorAdversary: Prepare context actor:');
    // console.log(this.actor);
    // console.log('ActorAdversary: Prepare context options:');
    // console.log(options);

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

    context.overlay = this._overlayState;

    // console.log('ActorAdversary: Context ready:');
    // console.log(context);
    return context;
  }

  /** @override */
  async _processSubmitData(event, form, formData) {
    console.log("ActorAdversary: process submit event");

    if (event.type !== 'change' || !event.target) {
      console.warn(`Actor._processSubmitData: ignored`);
      // TODO Handle others?
      console.log(event);
      // Ignore it
      return;
    }

    const target = event.target;

    // console.log(target);
    // console.log(target.name);
    // console.log(target.dataset.index);

    switch (target.name) {
      case 'name':
        this._updateActorName(target.value);
        // This may be a bit too optimized but it works,
        // prevents a full document update and related saves
        // For simple use cases the default will do the job fine.
        break;
      case 'modifier-base':
        this._updateBaseFormula(
          target.value,
        );
        break;
      case 'modifier-name':
        this._updateModifierName(
          target.dataset.index,
          target.value,
        );
        break;
      case 'modifier-value':
        this._updateModifierValue(
          target.dataset.index,
          target.value,
        );
        break;
      case 'modifier-state':
        this._updateModifierState(
          target.dataset.index,
          target.value,
        );
        break;
      default:
        await this.document.update(formData);
        break;
    }
  }

  async _updateActorName(name) {
    if (this.actor.name !== name) {
      this.actor.update({
        name: name
      })
    }
  }

  async _updateBaseFormula(value) {
    this._overlayState.total = value;
    this._overlayState.base = value;
    // TODO _updateDamageTotal
    // TODO validate value
  }

  async _updateModifierName(index, name) {
    if (index < 0 || index >= this._overlayState.modifiers.length) {
      console.warn(`Actor._updateModifierName: invalid index: ${index}`);
      ui.notifications.error("Failed to update the modifier name.");
      return;
    }
    this._overlayState.modifiers[index].name = name;
  }

  async _updateModifierValue(index, value) {
    if (index < 0 || index >= this._overlayState.modifiers.length) {
      console.warn(`Actor._updateModifierValue: invalid index: ${index}`);
      ui.notifications.error("Failed to update the modifier value.");
      return;
    }
    this._overlayState.modifiers[index].value = value;
    // TODO _updateDamageTotal
    // TODO validate value
  }

  async _updateModifierState(index, enabled) {
    if (index < 0 || index >= this._overlayState.modifiers.length) {
      console.warn(`Actor._updateModifierValue: invalid index: ${index}`);
      ui.notifications.error("Failed to update the modifier value.");
      return;
    }
    this._overlayState.modifiers[index].enabled = enabled;
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


  static async #createModifier(event, target) {
    console.log(this._overlayState.modifiers);
    console.log(this._overlayState.modifiers.length);

    const mods = this._overlayState.modifiers;
    if (mods.length > 0 && mods[mods.length - 1].name === 'unknown') {
      ui.notifications.error("Define the unknown modifier first.");
      return;
    }
    this._overlayState.modifiers.push({
      name: 'unknown',
      value: '+1',
      enabled: true,
    })
    await this.render();

    // Grab the focus of the newly created element for a good user experience
    const overlay = document.getElementById('overlay-' + this.actor.id);
    const list = overlay.querySelectorAll('.modifier-name');
    if (list.length > 0) list[list.length - 1].focus();
  }

  static async #deleteModifier(event, target) {
    const index = target.dataset.index;

    if (index < 0 || index >= this._overlayState.modifiers.length) {
      console.warn(`Actor.#deleteModifier: invalid index: ${index}`);
      ui.notifications.error("Failed to delete the modifier.");
      return;
    }

    this._overlayState.modifiers.splice(index, 1);
    this.render();
  }


  async _openModifiers(config) {
    this._overlayState.path = config.path;
    this._overlayState.title = config.title;
    this._overlayState.base = config.base;
    this._overlayState.total = config.total;
    this._overlayState.modifiers = config.modifiers;
    await this.render();

    const overlay = document.getElementById('overlay-' + this.actor.id);
    const popup = overlay.querySelector('.damage-edit-popup');
    const input = overlay.querySelector('.damage-base-input');

    const damageLabel = overlay.querySelector('.damage-edit-label');

    // Setup the modifier title 
    damageLabel.innerHTML = config.title;

    // Animate in with JavaScript for smooth backdrop-filter
    overlay.style.removeProperty("display");
    this._animatePopupIn(popup, () => {
      input.focus();
    });
  }

  async _closeModifiers() {
    const overlay = document.getElementById('overlay-' + this.actor.id);
    const popup = overlay.querySelector('.damage-edit-popup');

    this._animatePopupOut(popup, () => {
      overlay.style.setProperty("display", "none");
      this._activeOverlayType = null;
      this._overlayState = {
        path: "",
        title: "",
        scale: 0.8,
        opacity: 0,
        hide: true,
        weapon: false,
        base: "",
        total: "",
        modifiers: [],
      };
      this.render();
    });
  }

  static async #closeModifiers(event, target) {
    event.preventDefault();
    this._closeModifiers();
  }

  async _saveAttackModifiers() {
    const data = this._overlayState;
    this.actor.update({
      system: {
        attack: {
          base: data.base,
          value: data.total,
          modifiers: data.modifiers,
        }
      }
    })
  }

  async _saveDamageModifiers() {
    const data = this._overlayState;
    this.actor.update({
      system: {
        primary: {
          damage: {
            base: data.base,
            value: data.total,
            modifiers: data.modifiers,
          }
        }
      }
    })
  }

  static async #saveModifiers(event, target) {
    event.preventDefault();
    switch (this._activeOverlayType) {
      case this.OverlayType.Attack:
        await this._saveAttackModifiers();
        this._closeModifiers();
        break;
      case this.OverlayType.Damage:
        await this._saveDamageModifiers();
        this._closeModifiers();
        break;
      default:
        const type = this._activeOverlayType;
        console.warn(`Actor._saveModifiers: invalid type: ${type}`);
    }
  }

  async _openAttackModifiers() {
    if (this._activeOverlayType !== null) return;

    this._activeOverlayType = this.OverlayType.Attack;
    const data = this.actor.system.attack;

    // TODO Reimplement restrictions for equiped items
    // See the original _showDamageModifierEditPopup

    this._openModifiers({
      path: "attack",
      title: `${this.actor.system.primary.name} - Attack`,
      base: data.base,
      total: data.value,
      modifiers: data.modifiers,
    });
  }

  async _openDamageModifiers() {
    if (this._activeOverlayType !== null) return;

    this._activeOverlayType = this.OverlayType.Damage;
    const data = this.actor.system.primary.damage;

    // TODO Reimplement restrictions for equiped items
    // See the original _showDamageModifierEditPopup

    this._openModifiers({
      path: "primary.damage",
      title: `${this.actor.system.primary.name} - Damage`,
      base: data.base,
      total: data.value,
      modifiers: data.modifiers,
    });
  }

  static async #openModifiers(event, target) {
    event.preventDefault();
    switch (target.dataset.type) {
      case this.OverlayType.Attack:
        this._openAttackModifiers();
        break;
      case this.OverlayType.Damage:
        this._openDamageModifiers();
        break;
      default:
        const type = target.dataset.type;
        console.warn(`Actor.#openModifiers: unknown type: ${type}`);
    }
  }


  _animatePopupIn(popup, callback) {
    let start = null;
    const duration = 120;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);

      const scale = 0.8 + (0.2 * eased); // From 0.8 to 1.0
      const opacity = eased; // From 0 to 1

      popup.style.setProperty("--dh-popup-scale", scale);
      popup.style.setProperty("--dh-popup-opacity", opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback && callback();
        this._overlayState.hide = false;
        this._overlayState.scale = 1.0;
        this._overlayState.opacity = 1.0;
      }
    };

    requestAnimationFrame(animate);
  }

  _animatePopupOut(popup, callback) {
    let start = null;
    const duration = 180;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      // Easing function (ease-in)
      const eased = Math.pow(progress, 2);

      const scale = 1.0 - (0.2 * eased); // From 1.0 to 0.8
      const opacity = 1 - eased; // From 1 to 0

      popup.style.setProperty("--dh-popup-scale", scale);
      popup.style.setProperty("--dh-popup-opacity", opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback && callback();
        this._overlayState.hide = true;
        this._overlayState.scale = 0.8;
        this._overlayState.opacity = 0.0;
      }
    };

    requestAnimationFrame(animate);
  }


  ////////////////////////////////////////////////////////////////////////////
  // TODO The Stuff below is broken, damage and attack editor overlay
  //
  // Below should be an application of it's own or be part of the base class?
  // * This seems overly complicated and depends on data sets within HTML
  // elements for computation. Are we mixing presentation with logic?
  // * Second problem are the jquery lookups, these are depricated!
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
}