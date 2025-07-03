import { EntitySheetHelper } from "./helper.js";
import {ATTRIBUTE_TYPES} from "./constants.js";
import { SheetTracker } from "./sheet-tracker.js";
export class SimpleItemSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
          classes: ["daggerheart", "sheet", "item"],
    template: "systems/daggerheart/templates/item-sheet.html",
      width: 350,
      height: 550,
      resizable: true,
      scrollY: [".card-description"],
    });
  }
  async getData(options) {
    const context = await super.getData(options);
    EntitySheetHelper.getAttributeData(context.data);
    context.systemData = context.data.system;
    context.dtypes = ATTRIBUTE_TYPES;
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.description, {
      secrets: this.document.isOwner,
      async: true
    });
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    if ( !this.isEditable ) return;
    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));
    html.find('.profile-img').on('contextmenu', event => {
      event.preventDefault(); 
      this._onProfileImageClick(event.target);
    });
    html.find('.profile-img').on('click', event => {
      event.preventDefault();
      this._onImageEdit(event);
    });
    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });
  }
  async _onProfileImageClick(imgElement) {
    let imgSrc = imgElement.src;
    let imgTitle = imgElement.title;
    if (imgSrc) {
      let ip = new ImagePopout(imgSrc, {
        title: imgTitle,
        shareable: false,
      }).render(true);
    }
  }
  async _onImageEdit(event) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      current: this.object.img,
      callback: path => {
        this.object.update({"img": path});
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    return fp.browse();
  }
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = EntitySheetHelper.updateAttributes(formData, this.object);
    formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }
  async _render(force, options) {
    await super._render(force, options);
    if (this.rendered && this.element && !this.sheetTracker) {
      await this._initializeSheetTracker();
    }
  }
  async _initializeSheetTracker() {
    if (this.sheetTracker) {
      this.sheetTracker.destroy();
      this.sheetTracker = null;
    }
    this.element.find('.sheet-tracker-sidebar').remove();
    const mockActorSheet = {
      actor: this.object, 
      element: this.element
    };
    this.sheetTracker = new SheetTracker(mockActorSheet);
    await this.sheetTracker.initialize();
  }
  async close(options) {
    if (this.sheetTracker) {
      this.sheetTracker.destroy();
      this.sheetTracker = null;
    }
    return super.close(options);
  }
}
