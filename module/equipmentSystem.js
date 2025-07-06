/**
 * Centralized Equipment System for Daggerheart
 * Handles all equipment operations (equip/unequip) with standardized behavior
 */
import { ModifierManager } from './modifierManager.js';

export class EquipmentSystem {
  
  /**
   * Check if an item is equipped
   * @param {foundry.documents.Item} item - The item to check
   * @returns {boolean} - True if equipped
   * @static
   */
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
  
  /**
   * Get equipment slot for an item
   * @param {foundry.documents.Item} item - The item to check
   * @returns {string|null} - The slot name or null
   * @static
   */
  static getEquipmentSlot(item) {
    if (!item || !this.isEquipped(item)) return null;
    
    switch (item.type) {
      case "weapon":
        return item.system?.weaponSlot || null;
      case "armor":
        return "armor"; // Simple armor slot
      default:
        return item.system?.slot || null;
    }
  }
  
  /**
   * Get equipment tag class for an item
   * @param {foundry.documents.Item} item - The item to check
   * @returns {string} - CSS class for equipment tag
   * @static
   */
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
  
  /**
   * Get equipment tag text for display
   * @param {foundry.documents.Item} item - The item to check
   * @returns {string} - Display text for equipment tag
   * @static
   */
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
  
  /**
   * Equip an item with standardized behavior
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} item - The item to equip
   * @param {string} [slot] - Optional slot specification
   * @returns {Promise<boolean>} - Success status
   * @static
   */
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
  
  /**
   * Unequip an item with standardized behavior
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} item - The item to unequip
   * @returns {Promise<boolean>} - Success status
   * @static
   */
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
  
  /**
   * Toggle equipment state for an item
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} item - The item to toggle
   * @param {string} [slot] - Optional slot specification
   * @returns {Promise<boolean>} - Success status
   * @static
   */
  static async toggle(actor, item, slot = null) {
    if (this.isEquipped(item)) {
      return await this.unequip(actor, item);
    } else {
      return await this.equip(actor, item, slot);
    }
  }
  
  /* -------------------------------------------- */
  /* Private Methods */
  /* -------------------------------------------- */
  
  /**
   * Equip a weapon using the existing EquipmentHandler
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} weapon - The weapon to equip
   * @param {string} slot - The weapon slot ("primary" or "secondary")
   * @returns {Promise<boolean>} - Success status
   * @private
   * @static
   */
  static async _equipWeapon(actor, weapon, slot) {
    // Import the existing EquipmentHandler
    const { EquipmentHandler } = globalThis.daggerheart || {};
    if (!EquipmentHandler) {
      console.error("EquipmentHandler not available");
      return false;
    }
    
    // Default to primary if no slot specified
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
  
  /**
   * Unequip a weapon
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} weapon - The weapon to unequip
   * @returns {Promise<boolean>} - Success status
   * @private
   * @static
   */
  static async _unequipWeapon(actor, weapon) {
    await weapon.update({
      "system.equipped": false,
      "system.weaponSlot": null
    });
    
    // Update weapon slots if using the EquipmentHandler system
    const { EquipmentHandler } = globalThis.daggerheart || {};
    if (EquipmentHandler && actor.type === "character") {
      await EquipmentHandler.updateWeaponSlots(actor);
    }
    
    ui.notifications.info(`${weapon.name} unequipped`);
    return true;
  }
  
  /**
   * Equip armor
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} armor - The armor to equip
   * @returns {Promise<boolean>} - Success status
   * @private
   * @static
   */
  static async _equipArmor(actor, armor) {
    // Check if already equipped
    if (armor.system?.equipped === true) {
      ui.notifications.info(`${armor.name} is already equipped`);
      return true;
    }
    
    // Update the armor item
    await armor.update({
      "system.equipped": true
    });
    
    // Apply armor modifiers using ModifierManager
    await this._applyArmorModifiers(actor, armor);
    
    ui.notifications.info(`${armor.name} has been equipped`);
    return true;
  }
  
  /**
   * Unequip armor
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} armor - The armor to unequip
   * @returns {Promise<boolean>} - Success status
   * @private
   * @static
   */
  static async _unequipArmor(actor, armor) {
    // Remove armor modifiers using ModifierManager
    await this._removeArmorModifiers(actor, armor);
    
    await armor.update({
      "system.equipped": false
    });
    
    ui.notifications.info(`${armor.name} has been unequipped`);
    return true;
  }
  
  /**
   * Equip a generic item
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} item - The item to equip
   * @param {string} slot - The equipment slot
   * @returns {Promise<boolean>} - Success status
   * @private
   * @static
   */
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
  
  /**
   * Unequip a generic item
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} item - The item to unequip
   * @returns {Promise<boolean>} - Success status
   * @private
   * @static
   */
  static async _unequipGeneric(actor, item) {
    const updateData = {
      "system.equipped": false
    };
    
    // Clear slot if it exists
    if (item.system?.slot) {
      updateData["system.slot"] = null;
    }
    
    await item.update(updateData);
    ui.notifications.info(`${item.name} has been unequipped`);
    return true;
  }
  
  /* -------------------------------------------- */
  /* Armor Modifier Management */
  /* -------------------------------------------- */
  
  /**
   * Apply armor modifiers to character thresholds and armor score
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} armor - The armor item
   * @returns {Promise<void>}
   * @private
   * @static
   */
  static async _applyArmorModifiers(actor, armor) {
    const armorSystem = armor.system;
    const armorName = armor.name;
    
    try {
      // Add major threshold modifier if armor has baseThresholds.major
      if (armorSystem?.baseThresholds?.major && armorSystem.baseThresholds.major > 0) {
        await ModifierManager.addModifier(actor, "system.threshold.major", {
          name: armorName,
          value: armorSystem.baseThresholds.major,
          enabled: true
        });
      }
      
      // Add severe threshold modifier if armor has baseThresholds.severe
      if (armorSystem?.baseThresholds?.severe && armorSystem.baseThresholds.severe > 0) {
        await ModifierManager.addModifier(actor, "system.threshold.severe", {
          name: armorName,
          value: armorSystem.baseThresholds.severe,
          enabled: true
        });
      }
      
      // Add armor score modifier if armor has baseScore
      if (armorSystem?.baseScore && armorSystem.baseScore > 0) {
        await ModifierManager.addModifier(actor, "system.defenses.armor", {
          name: armorName,
          value: armorSystem.baseScore,
          enabled: true
        });
      }
      
      console.log(`EquipmentSystem | Applied armor modifiers for ${armorName} to ${actor.name}`);
    } catch (error) {
      console.error(`EquipmentSystem | Error applying armor modifiers for ${armorName}:`, error);
    }
  }
  
  /**
   * Remove armor modifiers from character thresholds and armor score
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} armor - The armor item
   * @returns {Promise<void>}
   * @private
   * @static
   */
  static async _removeArmorModifiers(actor, armor) {
    const armorName = armor.name;
    
    try {
      // Remove modifiers with the armor's name from all relevant fields
      await ModifierManager.removeModifier(actor, "system.threshold.major", armorName);
      await ModifierManager.removeModifier(actor, "system.threshold.severe", armorName);
      await ModifierManager.removeModifier(actor, "system.defenses.armor", armorName);
      
      console.log(`EquipmentSystem | Removed armor modifiers for ${armorName} from ${actor.name}`);
    } catch (error) {
      console.error(`EquipmentSystem | Error removing armor modifiers for ${armorName}:`, error);
    }
  }
}

// Register the equipment system globally for easy access
if (typeof globalThis.daggerheart === "undefined") {
  globalThis.daggerheart = {};
}
globalThis.daggerheart.EquipmentSystem = EquipmentSystem;