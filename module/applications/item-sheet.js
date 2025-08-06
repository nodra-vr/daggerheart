import { EntitySheetHelper } from "../helpers/helper.js";
import {ATTRIBUTE_TYPES} from "../helpers/constants.js";
import { SheetTracker } from "./sheet-tracker.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SimpleItemSheet extends foundry.appv1.sheets.ItemSheet {

  /** @inheritdoc */
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

  /* -------------------------------------------- */

  /** @inheritdoc */
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



  /* -------------------------------------------- */

  async _onProfileImageClick(imgElement) {
    // Use the src and title directly from the clicked image element
    let imgSrc = imgElement.src;
    let imgTitle = imgElement.title;

    // Ensure the image source is defined
    if (imgSrc) {
      let ip = new ImagePopout(imgSrc, {
        title: imgTitle,
        shareable: false,
        // You might need to adjust or remove the uuid depending on your requirements
      }).render(true);
    }
  }

  /* -------------------------------------------- */

  async _onImageEdit(event) {
    event.preventDefault();
    // Use Foundry's built-in file picker for image editing
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

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = EntitySheetHelper.updateAttributes(formData, this.object);
    formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Initialize or reinitialize sheet tracker
    if (this.sheetTracker) {
      this.sheetTracker.destroy();
    }
    this.sheetTracker = new SheetTracker(this);
    this.sheetTracker.initialize();

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // Attribute Management
    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));

    // Image Click Finder - both left click and right click for image upload
    html.find('.profile-img').on('contextmenu', event => {
      event.preventDefault(); // Prevents the browser's context menu from opening
      this._onProfileImageClick(event.target);
    });
    
    // Also allow left click for easier image upload
    html.find('.profile-img').on('click', event => {
      event.preventDefault();
      this._onImageEdit(event);
    });
    
    // Add draggable for Macro creation
    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });
  }

  /** @override */
  async close(options) {
    // Clean up sheet tracker when closing
    if (this.sheetTracker) {
      this.sheetTracker.destroy();
      this.sheetTracker = null;
    }

    return super.close(options);
  }
}
