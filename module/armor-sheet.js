import { SimpleItemSheet } from "./item-sheet.js";
import { EntitySheetHelper } from "./helper.js";
import { ATTRIBUTE_TYPES } from "./constants.js";

export class SimpleArmorSheet extends SimpleItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "item", "armor"],
      template: "systems/daggerheart/templates/item-sheet-armor.html",
      width: 350,
      height: 650,
      resizable: true,
      scrollY: [".card-description"],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    
    // Add armor-specific dropdown options (if needed in the future)
    // For now, armor only has Base Thresholds and Base Score fields
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Armor-specific event listeners can be added here if needed
    // For now, armor uses simple input fields, so no special handling required
  }
}
