import { SheetTracker } from "./sheet-tracker.js";
import { SimpleActorSheet } from "./actor-sheet.js";
export class CompanionActorSheet extends SimpleActorSheet {
  static get defaultOptions() {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const maxHeight = Math.floor(screenHeight * 0.85);
    const minHeight = 500; 
    const preferredHeight = 840; 
    const height = Math.max(minHeight, Math.min(preferredHeight, maxHeight));
    const maxWidth = Math.floor(screenWidth * 0.9);
    const minWidth = 690; 
    const preferredWidth = 650; 
    const width = Math.max(minWidth, Math.min(preferredWidth, maxWidth));
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "companion"],
      template: "systems/daggerheart/templates/actor-sheet-companion.html",
      width: width,
      height: height,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "companion"}],
      scrollY: [".biography", ".items", ".attributes"],
      dragDrop: [],
    });
  }
  async getData(options) {
    const context = await super.getData(options);
    context.shorthand = !!game.settings.get("daggerheart", "macroShorthand");
    context.systemData = context.data.system;
    context.domains = this.actor.system.domains;
    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.biography, {
      secrets: this.document.isOwner,
      async: true,
    });
    context.actor = this.actor;
    context.imageStyle = `background: url(${context.data.img});`;
    const stress = context.systemData.stress;
    context.isOutOfScene = stress && stress.value === stress.max && stress.max > 0;
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.sheetTracker) {
      this.sheetTracker = new SheetTracker(this);
    }
    this.sheetTracker.initialize();
  }
  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
    const title = `Roll for ${traitNamePrint}`;
    await game.daggerheart.rollHandler.npcRollWithDialog({title, traitValue, actor: this.actor});
  }
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    if (this.actor.type === "companion") {
      formData["system.isCompanion"] = true;
    }
    return formData;
  }
}
