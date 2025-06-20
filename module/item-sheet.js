import { EntitySheetHelper } from "./helper.js";
import {ATTRIBUTE_TYPES} from "./constants.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SimpleItemSheet extends foundry.appv1.sheets.ItemSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    // Calculate responsive dimensions based on screen size
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    
    // Calculate optimal height for item sheet (smaller than actor sheets)
    const maxHeight = Math.floor(screenHeight * 0.8);
    const minHeight = 400; // Minimum usable height for items
    const preferredHeight = 550; // Ideal height for larger screens
    
    const height = Math.max(minHeight, Math.min(preferredHeight, maxHeight));
    
    // Calculate width for item sheet
    const maxWidth = Math.floor(screenWidth * 0.8);
    const minWidth = 350; // Maintain minimum width for usability
    const preferredWidth = 425; // Standard width for items
    
    const width = Math.max(minWidth, Math.min(preferredWidth, maxWidth));
    
    return foundry.utils.mergeObject(super.defaultOptions, {
          classes: ["daggerheart", "sheet", "item"],
    template: "systems/daggerheart/templates/item-sheet.html",
      width: width,
      height: height,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      scrollY: [".attributes"],
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

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // Attribute Management
    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));

    // Image Click Finder
    html.find('.profile-img').on('contextmenu', event => {
      event.preventDefault(); // Prevents the browser's context menu from opening
      this._onProfileImageClick(event.target);
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

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = EntitySheetHelper.updateAttributes(formData, this.object);
    formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }
}
