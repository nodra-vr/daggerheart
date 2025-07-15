import { OverlayManager } from '../utilities/overlay-manager.mjs';
import { ResourcesEditor } from '../utilities/resources-editor.mjs';
import { ModifiersEditor } from '../utilities/modifiers-editor.mjs';

const {
  api, sheets
} = foundry.applications;

// Match overlay data-type
export const OverlayType = {
  Tracker: 'tracker',
  Modifier: 'modifier',
}

export class ActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  _overlay = null;
  _resources = null;
  _modifiers = null;

  static DEFAULT_OPTIONS = {
    classes: ["daggerheart", "sheet", "transitions-enabled"],
    document: null,
    editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true,
    },
    position: {
      width: 650,
      height: 840
    },
    actions: {
      openOverlay: this.#openOverlay,
      closeOverlay: this.#closeOverlay,

      createModifier: this.#createModifier,
      deleteModifier: this.#deleteModifier,

      createResource: this.#createResource,
      deleteResource: this.#deleteResource,
    }
  };

  /** @override */
  static PARTS = {
    listResources: {
      template: "./systems/daggerheart/templates/partials/sheet-list-resources.hbs",
    },
    overlayModifiers: {
      template: "./systems/daggerheart/templates/partials/sheet-overlay-modifiers.hbs",
    },
    overlayResources: {
      template: "./systems/daggerheart/templates/partials/sheet-overlay-resources.hbs",
    }
  }


  constructor(options = {}) {
    super(options);

    this._overlay = new OverlayManager({
      sheet: this,
      onClose: this.onCloseOverlay.bind(this),
      onOpened: this.onOpenedOverlay.bind(this),
      onClosed: this.onClosedOverlay.bind(this),
      onOpening: this.onOpeningOverlay.bind(this),
    });
    this._modifiers = new ModifiersEditor({
      id: this.actor.id,
      sheet: this,
    });
    this._resources = new ResourcesEditor({
      id: this.actor.id,
      sheet: this,
      onSave: this.onSaveEditor.bind(this),
      resources: this.actor.system.resources,
    });
  }

  async onSaveEditor(resources) {
    await this.actor.update({
      system: { resources }
    });
  }

  async onCloseOverlay(type) {
    this._closeOverlay(type);
  }

  async onOpenedOverlay(type) {
    const overlay = document.getElementById(`${type}-${this.actor.id}`);
    switch (type) {
      case OverlayType.Tracker:
        overlay.querySelector('.tracker-name-input').focus();
        break;
      case OverlayType.Modifier:
        overlay.querySelector('.damage-base-input').focus();
        break;
      default:
        console.warn(`onOpenedOverlay: unkown overlay type: ${type}`);
    }
  }

  async onClosedOverlay(type) {
    // Rerender to fully hide the overlay,
    // is called at the end of the animation
    switch (type) {
      case OverlayType.Tracker:
        this._resources.close();
        break;
      case OverlayType.Modifier:
        this._modifiers.close();
        break;
      default:
        console.error(`onClosedOverlay: unkown overlay type: ${type}`);
    }
    await this.render();
  }

  async onOpeningOverlay(type) {
    // Rerender to show the initial overlay,
    // is called at the start of the animation
    switch (type) {
      case OverlayType.Tracker:
        this._resources.open();
        break;
      case OverlayType.Modifier:
        this._modifiers.open();
        break;
      default:
        console.error(`onOpeningOverlay: unkown overlay type ${type}`);
    }
    await this.render();
  }


  /** @override */
  async _prepareContext(options) {
    const context = {};

    context.overlay = this._overlay.state;

    context.modifiers = this._modifiers.state;
    context.resources = this._resources.state;

    return context;
  }

  /** @override */
  async _onRender(context, options) {
    // To capture our right clicks we need to manualy grab the event,
    // new elements are created on every render, so link the events
    const list = this.element.querySelectorAll(".tracker-button");
    for (let i = 0; i < list.length; i++) {
      list[i].addEventListener("mousedown", async (event) => {
        const index = event.target.dataset.index;
        event.stopPropagation();
        event.preventDefault();
        switch (event.which) {
          case 1:
            this._resources.increase(index);
            break;
          case 3:
            this._resources.decrease(index);
            break;
        }
      });
    }
  }

  /** @override */
  async _attachFrameListeners() {
    super._attachFrameListeners();

    // Add listeners and setup a tab index for focus
    this.element.addEventListener('keydown',
      this._overlay.onKeydown.bind(this._overlay)
    );
    this.element.setAttribute('tabindex', '0');
  }

  /** @override */
  async _processSubmitData(event, form, formData) {
    if (event.type !== 'change' || !event.target) {
      // Ignore it, note this blocks up stream
      return false;
    }

    const target = event.target;

    if (await this._modifiers.update(target)) {
      return false;
    }
    if (await this._resources.update(target)) {
      return false;
    }

    return true;
  }


  static async #createModifier(event, elem) {
    this._modifiers.create();
  }

  static async #deleteModifier(event, elem) {
    const index = elem.dataset.index;
    this._modifiers.delete(index);
  }

  static async #createResource(event, elem) {
    this._resources.create();
  }

  static async #deleteResource(event, elem) {
    const index = elem.dataset.index;
    this._resources.delete(index);
  }


  static async #openOverlay(event, elem) {
    let type = elem.dataset.type;
    let target = elem.dataset.target;
    if (target) this._openOverlay(target, type);
    else console.error("dataset.target missing");
  }

  static async #closeOverlay(event, elem) {
    let type = elem.dataset.type;
    let target = elem.dataset.target;
    if (target) this._closeOverlay(target);
    else console.error("dataset.target missing");
  }


  async _saveTargetData(target) {
    switch (target) {
      case OverlayType.Modifier:
        await this._modifiers.save();
    }
  }

  async _loadTargetData(target, type) {
    switch (target) {
      case OverlayType.Modifier:
        return await this._modifiers.load(type);
    }
    return true;
  }

  async _openOverlay(target, type) {
    // For modifiers we need to load and save the data
    if (!(await this._loadTargetData(target, type))) {
      console.error(`failed to load: ${target} ${type}`);
      return;
    }
    const id = `${target}-${this.actor.id}`;
    const overlay = document.getElementById(id);
    if (overlay) await this._overlay.open(overlay);
    else console.error(`no overay found for id: ${id}`);
  }

  async _closeOverlay(target) {
    this._saveTargetData(target);
    const id = `${target}-${this.actor.id}`;
    const overlay = document.getElementById(id);
    if (overlay) await this._overlay.close(overlay);
    else console.error(`no overay found for id: ${id}`);
  }
}