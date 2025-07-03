import {EntitySheetHelper} from "./helper.js";
export class SimpleItem extends Item {
  prepareDerivedData() {
    super.prepareDerivedData();
    this.system.groups = this.system.groups || {};
    this.system.attributes = this.system.attributes || {};
    EntitySheetHelper.clampResourceValues(this.system.attributes);
  }
  static async createDialog(data={}, options={}) {
    return EntitySheetHelper.createDialog.call(this, data, options);
  }
  get isTemplate() {
    return !!this.getFlag("daggerheart", "isTemplate");
  }
}
