import { DaggerheartDialogHelper } from "../dialog-helper.js";
import { ActorSheet } from "./base/actor-sheet.mjs";

const {
  ux, apps
} = foundry.applications;

/**
 * Extend the basic ActorSheet with modifications for daggerheart
 * @extends {ActorSheetV2}
 */
export class AdversaryActorSheet extends ActorSheet {
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


  static get DEFAULT_OPTIONS() {
    const parentOptions = super.DEFAULT_OPTIONS;
    return foundry.utils.mergeObject(parentOptions, {
      classes: [
        ...parentOptions.classes, "adversary"
      ],
      dragDrop: [{
        dragSelector: "[data-drag]",
        dropSelector: null
      }],
      actions: {
        editImage: this.#editImage,
        takeDamage: this.#takeDamage,

        rollAction: this.#rollAction,
        rollDamage: this.#rollDamage,

        openDeathMove: this.#openDeathMove,
        decrementValue: this.#decrementValue,
        incrementValue: this.#incrementValue,
      }
    }, {
      // Merge nested objects
      recursive: true,
      insertKeys: true,
      insertValues: true
    });
  }

  static get PARTS() {
    const parentOptions = super.PARTS;
    return foundry.utils.mergeObject(parentOptions, {
      app: {
        template: "./systems/daggerheart/templates/actor-adversary.hbs"
      },
      tabs: {
        template: "./systems/daggerheart/templates/partials/actor-general-tabs.hbs"
      },
      // Below are sheet tabs, they need to be defined in _getTabs.
      details: {
        template: "./systems/daggerheart/templates/partials/actor-adversary-tabs-details.hbs",
        scrollable: [''],
      },
      biography: {
        template: "./systems/daggerheart/templates/partials/actor-adversary-tabs-biography.hbs",
        scrollable: [''],
      },
    });
  }


  constructor(options = {}) {
    super(options);

    this._modifiers.register('attack', {
      load: this.loadAttack.bind(this),
      save: this.saveAttack.bind(this)
    });

    this._modifiers.register('damage', {
      load: this.loadDamage.bind(this),
      save: this.saveDamage.bind(this)
    });
  }

  async loadAttack() {
    const data = this.actor.system.attack;
    return {
      path: "actor.system.attack",
      title: `${this.actor.system.primary.name} - Attack`,
      base: data.base,
      total: data.total,
      modifiers: data.modifiers,
    };
  }

  async saveAttack(data) {
    this.actor.update({
      system: {
        attack: {
          base: data.base,
          total: data.total,
          modifiers: data.modifiers,
        }
      }
    });
  }

  async loadDamage() {
    const data = this.actor.system.primary.damage;
    return {
      path: "actor.system.primary.damage",
      title: `${this.actor.system.primary.name} - Damage`,
      base: data.base,
      total: data.total,
      modifiers: data.modifiers,
    };
  }

  async saveDamage(data) {
    this.actor.update({
      system: {
        primary: {
          damage: {
            base: data.base,
            total: data.total,
            modifiers: data.modifiers,
          }
        }
      }
    });
  }


  _getTabs(parts) {
    const tabGroup = 'primary';

    // Set the default tab
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
        case 'details':
          tab.id = 'details';
          tab.label = game.i18n.localize('DH.Tabs.Details');
          break;
        case 'biography':
          tab.id = 'biography';
          tab.label = game.i18n.localize('DH.Tabs.Biography');
          break;
        default:
          return tabs;
      }

      // This activates the current tab for a group
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

    const context = await super._prepareContext(options);
    console.log(context);

    // Base context
    context.actor = this.actor;
    context.system = this.actor.system;

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

    // console.log('ActorAdversary: Context ready:');
    // console.log(context);
    return context;
  }

  /** @override */
  async _processSubmitData(event, form, formData) {
    if (!super._processSubmitData(
      event, form, formData
    )) return;

    const target = event.target;
    switch (target.name) {
      case 'name':
        this._updateActorName(target.value);
        // This may be a bit too optimized but it works,
        // prevents a full document update and related saves
        // For simple use cases the default will do the job fine.
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
    const traitValue = data.attack.total;

    // Store data for chat message
    this._pendingRollType = "attack";
    this._pendingRollName = name;

    // Note: This replaces _rollTrait from the original actor sheet
    const namePrint = name.charAt(0).toUpperCase() + name.slice(1);
    await game.daggerheart.rollHandler.npcRollWithDialog({
      title: `Roll for ${namePrint}`,
      actor: this.actor,
      traitValue,
    });
  }

  async _rollPrimaryDamage() {
    const data = this.actor.system.primary;

    // Store data for chat message
    this._pendingRollType = "damage";
    this._pendingRollName = data.name;

    const value = data.damage.total;
    await this._rollBasic(value);
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
}