export class EquipmentHandler {
  
  /**
   * Get all equipped weapons for an actor
   * @param {foundry.documents.Actor} actor - The actor to check
   * @returns {foundry.documents.Item[]} Array of equipped weapon items
   * @static
   */
  static getEquippedWeapons(actor) {
    return actor.items.filter(item => 
      item.type === "weapon" && foundry.utils.getProperty(item, 'system.equipped') === true
    );
  }
  
  /**
   * Get the primary weapon (weapon assigned to primary slot)
   * @param {foundry.documents.Actor} actor - The actor to check
   * @returns {foundry.documents.Item|null} The primary weapon item or null
   * @static
   */
  static getPrimaryWeapon(actor) {
    return actor.items.find(item => 
      item.type === "weapon" && 
      foundry.utils.getProperty(item, 'system.equipped') === true && 
      foundry.utils.getProperty(item, 'system.weaponSlot') === "primary"
    ) || null;
  }
  
  /**
   * Get the secondary weapon (weapon assigned to secondary slot)
   * @param {foundry.documents.Actor} actor - The actor to check
   * @returns {foundry.documents.Item|null} The secondary weapon item or null
   * @static
   */
  static getSecondaryWeapon(actor) {
    return actor.items.find(item => 
      item.type === "weapon" && 
      foundry.utils.getProperty(item, 'system.equipped') === true && 
      foundry.utils.getProperty(item, 'system.weaponSlot') === "secondary"
    ) || null;
  }
  
  /**
   * Equip a weapon to the primary slot
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} weapon - The weapon to equip
   * @returns {Promise<boolean>} Success status
   * @static
   */
  static async equipPrimaryWeapon(actor, weapon) {
    if (!weapon || weapon.type !== "weapon") {
      ui.notifications.error("Invalid weapon");
      return false;
    }
    
    try {
      // Get current primary weapon to unequip
      const currentPrimary = this.getPrimaryWeapon(actor);
      
      // If this weapon is already primary, unequip it
      if (currentPrimary && currentPrimary.id === weapon.id) {
        await weapon.update({
          "system.equipped": false,
          "system.weaponSlot": null
        });
        await this.updateWeaponSlots(actor);
        ui.notifications.info(`${weapon.name} unequipped from primary slot`);
        return true;
      }
      
      // Unequip current primary weapon if exists
      if (currentPrimary) {
        await currentPrimary.update({
          "system.equipped": false,
          "system.weaponSlot": null
        });
      }
      
      // If this weapon is currently secondary, just change its slot
      if (foundry.utils.getProperty(weapon, 'system.equipped') && foundry.utils.getProperty(weapon, 'system.weaponSlot') === "secondary") {
        await weapon.update({
          "system.weaponSlot": "primary"
        });
      } else {
        // Equip the new weapon as primary
        await weapon.update({
          "system.equipped": true,
          "system.weaponSlot": "primary"
        });
      }
      
      await this.updateWeaponSlots(actor);
      ui.notifications.info(`${weapon.name} equipped as primary weapon`);
      return true;
      
    } catch (error) {
      console.error("Failed to equip primary weapon:", error);
      ui.notifications.error(`Failed to equip ${weapon.name} as primary weapon`);
      return false;
    }
  }
  
  /**
   * Equip a weapon to the secondary slot
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} weapon - The weapon to equip
   * @returns {Promise<boolean>} Success status
   * @static
   */
  static async equipSecondaryWeapon(actor, weapon) {
    if (!weapon || weapon.type !== "weapon") {
      ui.notifications.error("Invalid weapon");
      return false;
    }
    
    try {
      // Get current secondary weapon to unequip
      const currentSecondary = this.getSecondaryWeapon(actor);
      
      // If this weapon is already secondary, unequip it
      if (currentSecondary && currentSecondary.id === weapon.id) {
        await weapon.update({
          "system.equipped": false,
          "system.weaponSlot": null
        });
        await this.updateWeaponSlots(actor);
        ui.notifications.info(`${weapon.name} unequipped from secondary slot`);
        return true;
      }
      
      // Unequip current secondary weapon if exists
      if (currentSecondary) {
        await currentSecondary.update({
          "system.equipped": false,
          "system.weaponSlot": null
        });
      }
      
      // If this weapon is currently primary, just change its slot
      if (foundry.utils.getProperty(weapon, 'system.equipped') && foundry.utils.getProperty(weapon, 'system.weaponSlot') === "primary") {
        await weapon.update({
          "system.weaponSlot": "secondary"
        });
      } else {
        // Equip the new weapon as secondary
        await weapon.update({
          "system.equipped": true,
          "system.weaponSlot": "secondary"
        });
      }
      
      await this.updateWeaponSlots(actor);
      ui.notifications.info(`${weapon.name} equipped as secondary weapon`);
      return true;
      
    } catch (error) {
      console.error("Failed to equip secondary weapon:", error);
      ui.notifications.error(`Failed to equip ${weapon.name} as secondary weapon`);
      return false;
    }
  }
  
  /**
   * Legacy method for backward compatibility - now defaults to primary
   * @param {foundry.documents.Actor} actor - The actor
   * @param {foundry.documents.Item} weapon - The weapon to toggle
   * @returns {Promise<boolean>} Success status
   * @static
   */
  static async toggleWeaponEquip(actor, weapon) {
    // For backward compatibility, default to primary slot
    return this.equipPrimaryWeapon(actor, weapon);
  }
  
  /**
   * Get the equipped slot for a specific weapon
   * @param {foundry.documents.Actor} actor - The actor to check
   * @param {foundry.documents.Item} weapon - The weapon to check
   * @returns {string|null} - 'primary', 'secondary', or null if not equipped
   * @static
   */
  static getWeaponEquippedSlot(actor, weapon) {
    if (!weapon || weapon.type !== "weapon" || !foundry.utils.getProperty(weapon, 'system.equipped')) {
      return null;
    }
    
    return foundry.utils.getProperty(weapon, 'system.weaponSlot') || null;
  }
  
  /**
   * Get weapon display data for the actor sheet
   * @param {foundry.documents.Actor} actor - The actor
   * @returns {Object} Object with primary and secondary weapon data
   * @static
   */
  static getWeaponDisplayData(actor) {
    const primaryWeapon = this.getPrimaryWeapon(actor);
    const secondaryWeapon = this.getSecondaryWeapon(actor);
    
    return {
      primary: {
        name: primaryWeapon ? primaryWeapon.name : "Primary Weapon",
        weapon: primaryWeapon,
        hasWeapon: !!primaryWeapon
      },
      secondary: {
        name: secondaryWeapon ? secondaryWeapon.name : "Secondary Weapon", 
        weapon: secondaryWeapon,
        hasWeapon: !!secondaryWeapon
      }
    };
  }
  
  /**
   * Get the complete weapon damage formula (all weapon modifiers combined)
   * @param {foundry.documents.Item} weapon - The weapon item
   * @param {foundry.documents.Actor} actor - The actor (for @prof processing)
   * @returns {string} - Complete weapon damage formula
   * @static
   */
  static getWeaponTotalDamage(weapon, actor) {
    if (!weapon || weapon.type !== "weapon") {
      return "1d8";
    }

    // Get the weapon's damage data
    const weaponDamage = foundry.utils.getProperty(weapon, 'system.damage');
    
    let weaponFormula = "1d8";
    let weaponModifiers = [];

    if (typeof weaponDamage === 'object' && weaponDamage !== null) {
      // Structured damage system
      weaponFormula = weaponDamage.baseValue || weaponDamage.value || "1d8";
      weaponModifiers = Array.isArray(weaponDamage.modifiers) ? weaponDamage.modifiers : [];
    } else if (typeof weaponDamage === 'string' && weaponDamage.trim()) {
      // Simple string damage
      weaponFormula = weaponDamage.trim();
    }

    // Process inline references like @prof
    const { EntitySheetHelper } = globalThis.daggerheart || {};
    if (EntitySheetHelper) {
      try {
        weaponFormula = EntitySheetHelper.processInlineReferences(weaponFormula, actor);
      } catch (error) {
        console.warn("Daggerheart | Error processing inline references:", error);
      }
    }

    // Combine weapon base + weapon modifiers into single formula
    let totalWeaponDamage = weaponFormula;
    if (weaponModifiers.length > 0) {
      const enabledModifiers = weaponModifiers.filter(mod => mod.enabled !== false);
      if (enabledModifiers.length > 0) {
        const modifierStrings = enabledModifiers.map(mod => mod.value || mod.name || mod).filter(v => v);
        if (modifierStrings.length > 0) {
          totalWeaponDamage = `${weaponFormula} + ${modifierStrings.join(' + ')}`;
        }
      }
    }

    console.log(`Daggerheart | Weapon ${weapon.name} total damage: ${totalWeaponDamage}`);
    return totalWeaponDamage;
  }
  
  /**
   * Get the weapon's attack trait value from the actor
   * @param {foundry.documents.Item} weapon - The weapon item
   * @param {foundry.documents.Actor} actor - The actor
   * @returns {number} - The trait value for attack rolls
   * @static
   */
  static getWeaponTraitValue(weapon, actor) {
    if (!weapon || weapon.type !== "weapon") {
      return 0;
    }

    const traitName = foundry.utils.getProperty(weapon, 'system.trait');
    if (!traitName) {
      return 0;
    }

    const traitValue = foundry.utils.getProperty(actor, `system.${traitName}.value`) ?? 0;
    console.log(`Daggerheart | Weapon ${weapon.name} trait ${traitName}: ${traitValue}`);
    return traitValue;
  }
  
  /**
   * Get dynamically resolved weapon data for a slot
   * @param {foundry.documents.Actor} actor - The actor
   * @param {string} slot - Either "primary" or "secondary"
   * @returns {Object} - Weapon data with calculated damage and to-hit
   * @static
   */
  static getDynamicWeaponData(actor, slot) {
    const weapon = slot === "primary" ? this.getPrimaryWeapon(actor) : this.getSecondaryWeapon(actor);
    const slotKey = slot === "primary" ? "weapon-main" : "weapon-off";
    
    if (!weapon) {
      // No weapon equipped - return default structure with character modifiers preserved
      const currentData = foundry.utils.getProperty(actor, `system.${slotKey}`) || {};
      return {
        name: "",
        weaponId: null,
        damage: {
          baseValue: "1d8",
          modifiers: currentData.damage?.modifiers || [],
          value: this._calculateTotal("1d8", currentData.damage?.modifiers || [])
        },
        "to-hit": {
          baseValue: 0,
          modifiers: currentData["to-hit"]?.modifiers || [],
          value: this._calculateTotal(0, currentData["to-hit"]?.modifiers || [])
        }
      };
    }

    // Weapon equipped - weapon total becomes base value, character modifiers preserved
    const currentData = foundry.utils.getProperty(actor, `system.${slotKey}`) || {};
    const weaponTotalDamage = this.getWeaponTotalDamage(weapon, actor);
    const weaponTraitValue = this.getWeaponTraitValue(weapon, actor);
    
    // Preserve existing character modifiers (spells, blessings, etc.)
    const characterDamageModifiers = currentData.damage?.modifiers || [];
    const characterAttackModifiers = currentData["to-hit"]?.modifiers || [];

    return {
      name: weapon.name,
      weaponId: weapon.id,
      damage: {
        baseValue: weaponTotalDamage, // Complete weapon damage as base
        modifiers: characterDamageModifiers, // Character bonuses only
        value: this._calculateTotal(weaponTotalDamage, characterDamageModifiers)
      },
      "to-hit": {
        baseValue: weaponTraitValue, // Weapon trait value as base
        modifiers: characterAttackModifiers, // Character bonuses only
        value: this._calculateTotal(weaponTraitValue, characterAttackModifiers)
      }
    };
  }
  
  /**
   * Calculate total value from base + modifiers
   * @param {string|number} baseValue - The base value
   * @param {Array} modifiers - Array of modifier objects
   * @returns {string|number} - Calculated total
   * @private
   * @static
   */
  static _calculateTotal(baseValue, modifiers) {
    if (!modifiers || modifiers.length === 0) {
      return baseValue;
    }

    const enabledModifiers = modifiers.filter(mod => mod.enabled !== false);
    if (enabledModifiers.length === 0) {
      return baseValue;
    }

    if (typeof baseValue === 'number') {
      // Numeric base - add modifiers numerically
      const modifierTotal = enabledModifiers.reduce((total, mod) => {
        const modValue = parseInt(mod.value || mod.modifier || mod) || 0;
        return total + modValue;
      }, 0);
      return baseValue + modifierTotal;
    } else {
      // String base (damage formula) - concatenate modifiers
      const modifierStrings = enabledModifiers.map(mod => mod.value || mod.name || mod).filter(v => v);
      if (modifierStrings.length > 0) {
        return `${baseValue} + ${modifierStrings.join(' + ')}`;
      }
      return baseValue;
    }
  }
  
  /**
   * Update the actor's weapon slots with current equipped weapon data
   * This replaces the complex baseValue system with simple data updates
   * @param {foundry.documents.Actor} actor - The actor to update
   * @returns {Promise<void>}
   * @static
   */
  static async updateWeaponSlots(actor) {
    console.log("Daggerheart | Updating weapon slots for:", actor.name);

    const primaryData = this.getDynamicWeaponData(actor, "primary");
    const secondaryData = this.getDynamicWeaponData(actor, "secondary");

    const updateData = {
      "system.weapon-main": primaryData,
      "system.weapon-off": secondaryData
    };

    console.log("Daggerheart | Weapon slot updates:", updateData);
    await actor.update(updateData);
  }
} 