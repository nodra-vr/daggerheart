import { ModifierManager } from './modifierManager.js';

export class EquipmentSystem {

  static isEquipped(item) {
    if (!item) return false;

    switch (item.type) {
      case "weapon":
        return item.system?.equipped === true;
      case "armor":
        return item.system?.equipped === true;
      default:
        return item.system?.equipped === true;
    }
  }

  static getEquipmentSlot(item) {
    if (!item || !this.isEquipped(item)) return null;

    switch (item.type) {
      case "weapon":
        return item.system?.weaponSlot || null;
      case "armor":
        return "armor"; 
      default:
        return item.system?.slot || null;
    }
  }

  static getEquipmentTagClass(item) {
    if (!item || !this.isEquipped(item)) return "";

    const slot = this.getEquipmentSlot(item);
    if (!slot) return "";

    switch (item.type) {
      case "weapon":
        return `weapon-slot-tag ${slot}`;
      case "armor":
        return `armor-slot-tag ${slot}`;
      default:
        return `equipment-slot-tag ${slot}`;
    }
  }

  static getEquipmentTagText(item) {
    if (!item || !this.isEquipped(item)) return "";

    const slot = this.getEquipmentSlot(item);
    if (!slot) return "";

    switch (item.type) {
      case "weapon":
        return slot === "primary" ? "Primary Weapon" : "Secondary Weapon";
      case "armor":
        return "Equipped Armor";
      default:
        return `Equipped (${slot})`;
    }
  }

  static async equip(actor, item, slot = null) {
    if (!actor || !item) {
      ui.notifications.error("Invalid actor or item");
      return false;
    }

    try {
      switch (item.type) {
        case "weapon":
          return await this._equipWeapon(actor, item, slot);
        case "armor":
          return await this._equipArmor(actor, item);
        default:
          return await this._equipGeneric(actor, item, slot);
      }
    } catch (error) {
      console.error("Failed to equip item:", error);
      ui.notifications.error(`Failed to equip ${item.name}`);
      return false;
    }
  }

  static async unequip(actor, item) {
    if (!actor || !item) {
      ui.notifications.error("Invalid actor or item");
      return false;
    }

    try {
      switch (item.type) {
        case "weapon":
          return await this._unequipWeapon(actor, item);
        case "armor":
          return await this._unequipArmor(actor, item);
        default:
          return await this._unequipGeneric(actor, item);
      }
    } catch (error) {
      console.error("Failed to unequip item:", error);
      ui.notifications.error(`Failed to unequip ${item.name}`);
      return false;
    }
  }

  static async toggle(actor, item, slot = null) {
    if (this.isEquipped(item)) {
      return await this.unequip(actor, item);
    } else {
      return await this.equip(actor, item, slot);
    }
  }

  static async _equipWeapon(actor, weapon, slot) {

    const { EquipmentHandler } = globalThis.daggerheart || {};
    if (!EquipmentHandler) {
      console.error("EquipmentHandler not available");
      return false;
    }

    const targetSlot = slot || "primary";

    if (targetSlot === "primary") {
      return await EquipmentHandler.equipPrimaryWeapon(actor, weapon);
    } else if (targetSlot === "secondary") {
      return await EquipmentHandler.equipSecondaryWeapon(actor, weapon);
    } else {
      ui.notifications.error("Invalid weapon slot");
      return false;
    }
  }

  static async _unequipWeapon(actor, weapon) {
    await weapon.update({
      "system.equipped": false,
      "system.weaponSlot": null
    });

    const { EquipmentHandler } = globalThis.daggerheart || {};
    if (EquipmentHandler && actor.type === "character") {
      await EquipmentHandler.updateWeaponSlots(actor);
    }

    ui.notifications.info(`${weapon.name} unequipped`);
    return true;
  }

  static async _equipArmor(actor, armor) {

    if (armor.system?.equipped === true) {
      ui.notifications.info(`${armor.name} is already equipped`);
      return true;
    }

    await armor.update({
      "system.equipped": true
    });

    await this._applyArmorModifiers(actor, armor);

    ui.notifications.info(`${armor.name} has been equipped`);
    return true;
  }

  static async _unequipArmor(actor, armor) {

    await this._removeArmorModifiers(actor, armor);

    await armor.update({
      "system.equipped": false
    });

    ui.notifications.info(`${armor.name} has been unequipped`);
    return true;
  }

  static async _equipGeneric(actor, item, slot) {
    const updateData = {
      "system.equipped": true
    };

    if (slot) {
      updateData["system.slot"] = slot;
    }

    await item.update(updateData);
    ui.notifications.info(`${item.name} has been equipped`);
    return true;
  }

  static async _unequipGeneric(actor, item) {
    const updateData = {
      "system.equipped": false
    };

    if (item.system?.slot) {
      updateData["system.slot"] = null;
    }

    await item.update(updateData);
    ui.notifications.info(`${item.name} has been unequipped`);
    return true;
  }

  static async _applyArmorModifiers(actor, armor) {
    const armorSystem = armor.system;
    const armorName = armor.name;
    const armorId = armor.id;

    try {
      await this._removeArmorModifiers(actor, armor);

      if (armorSystem?.baseThresholds?.major && armorSystem.baseThresholds.major > 0) {
        await ModifierManager.addModifier(actor, "system.threshold.major", {
          id: `armor_${armorId}_threshold_major`,
          name: armorName,
          value: armorSystem.baseThresholds.major,
          enabled: true,
          permanent: true
        });
      }

      if (armorSystem?.baseThresholds?.severe && armorSystem.baseThresholds.severe > 0) {
        await ModifierManager.addModifier(actor, "system.threshold.severe", {
          id: `armor_${armorId}_threshold_severe`,
          name: armorName,
          value: armorSystem.baseThresholds.severe,
          enabled: true,
          permanent: true
        });
      }

      if (armorSystem?.baseScore && armorSystem.baseScore > 0) {
        await ModifierManager.addModifier(actor, "system.defenses.armor", {
          id: `armor_${armorId}_defense_armor`,
          name: armorName,
          value: armorSystem.baseScore,
          enabled: true,
          permanent: true
        });
      }

      console.log(`EquipmentSystem | Applied armor modifiers for ${armorName} to ${actor.name}`);
    } catch (error) {
      console.error(`EquipmentSystem | Error applying armor modifiers for ${armorName}:`, error);
    }
  }

  static async _removeArmorModifiers(actor, armor) {
    const armorName = armor.name;
    const armorId = armor.id;

    try {
      await ModifierManager.removeModifierByIdDirect(actor, `armor_${armorId}_threshold_major`, true);
      await ModifierManager.removeModifierByIdDirect(actor, `armor_${armorId}_threshold_severe`, true);
      await ModifierManager.removeModifierByIdDirect(actor, `armor_${armorId}_defense_armor`, true);

      await ModifierManager.removeModifier(actor, "system.threshold.major", armorName, true);
      await ModifierManager.removeModifier(actor, "system.threshold.severe", armorName, true);
      await ModifierManager.removeModifier(actor, "system.defenses.armor", armorName, true);

      console.log(`EquipmentSystem | Removed armor modifiers for ${armorName} from ${actor.name}`);
    } catch (error) {
      console.error(`EquipmentSystem | Error removing armor modifiers for ${armorName}:`, error);
    }
  }
}

if (typeof globalThis.daggerheart === "undefined") {
  globalThis.daggerheart = {};
}
globalThis.daggerheart.EquipmentSystem = EquipmentSystem;