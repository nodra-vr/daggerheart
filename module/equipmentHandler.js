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
   * @param {Actor} actor - The actor
   * @param {Item} weapon - The weapon to equip
   * @returns {Promise<boolean>} Success status
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
      if (weapon.system.equipped && weapon.system.weaponSlot === "secondary") {
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
   * @param {Actor} actor - The actor
   * @param {Item} weapon - The weapon to equip
   * @returns {Promise<boolean>} Success status
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
      if (weapon.system.equipped && weapon.system.weaponSlot === "primary") {
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
   * @param {Actor} actor - The actor
   * @param {Item} weapon - The weapon to toggle
   * @returns {Promise<boolean>} Success status
   */
  static async toggleWeaponEquip(actor, weapon) {
    // For backward compatibility, default to primary slot
    return this.equipPrimaryWeapon(actor, weapon);
  }
  
  /**
   * Get the equipped slot for a specific weapon
   * @param {Actor} actor - The actor to check
   * @param {Item} weapon - The weapon to check
   * @returns {string|null} - 'primary', 'secondary', or null if not equipped
   */
  static getWeaponEquippedSlot(actor, weapon) {
    if (!weapon || weapon.type !== "weapon" || !weapon.system.equipped) {
      return null;
    }
    
    return weapon.system.weaponSlot || null;
  }
  
  /**
   * Get weapon display data for the actor sheet
   * @param {Actor} actor - The actor
   * @returns {Object} Object with primary and secondary weapon data
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
   * Sync equipped weapons with the actor's primary/secondary weapon data
   * @param {foundry.documents.Actor} actor - The actor to sync
   * @param {foundry.applications.sheets.ActorSheet} [sheet] - Optional sheet instance to use instead of actor.sheet
   * @returns {Promise<void>}
   * @static
   */
  static async syncEquippedWeapons(actor, sheet = null) {
    const primaryWeapon = this.getPrimaryWeapon(actor);
    const secondaryWeapon = this.getSecondaryWeapon(actor);
    const actorSheet = sheet || actor.sheet;
    
    console.log("Daggerheart | Syncing equipped weapons for actor:", actor.name);
    console.log("Daggerheart | Primary weapon:", primaryWeapon?.name || "none");
    console.log("Daggerheart | Secondary weapon:", secondaryWeapon?.name || "none");
    
    // Instead of snapshotting weapon data, we'll store weapon references
    // and resolve them dynamically during rolls
    const updateData = {};
    
    // Handle primary weapon - store reference data only
    if (primaryWeapon) {
      console.log("Daggerheart | Setting primary weapon reference:", primaryWeapon.name);
      
      updateData["system.weapon-main.name"] = primaryWeapon.name;
      updateData["system.weapon-main.weaponId"] = primaryWeapon.id;
      updateData["system.weapon-main.isDynamic"] = true; // Flag to indicate dynamic resolution
      
      // Clear any old snapshotted data to force dynamic resolution
      updateData["system.weapon-main.damage"] = {
        baseValue: null, // Clear snapshotted base value
        modifiers: foundry.utils.getProperty(actor, 'system.weapon-main.damage.modifiers') || [], // Preserve existing modifiers
        value: "Dynamic", // Placeholder to indicate dynamic resolution
        isDynamic: true
      };
      
      updateData["system.weapon-main.to-hit"] = {
        baseValue: null, // Clear snapshotted base value
        modifiers: foundry.utils.getProperty(actor, 'system.weapon-main.to-hit.modifiers') || [], // Preserve existing modifiers
        value: "Dynamic", // Placeholder to indicate dynamic resolution
        isDynamic: true
      };
    } else {
      console.log("Daggerheart | Clearing primary weapon");
      
      // Clear weapon reference
      updateData["system.weapon-main.name"] = "";
      updateData["system.weapon-main.weaponId"] = null;
      updateData["system.weapon-main.isDynamic"] = false;
      
      // Remove base value restrictions when no weapon equipped
      if (actorSheet && actorSheet.removeBaseValueRestriction) {
        await actorSheet.removeBaseValueRestriction("system.weapon-main.damage");
        await actorSheet.removeBaseValueRestriction("system.weapon-main.to-hit");
      }
      
      // Reset to default values while preserving existing modifiers
      const currentDamage = foundry.utils.getProperty(actor, 'system.weapon-main.damage');
      const existingDamageModifiers = (currentDamage && Array.isArray(currentDamage.modifiers)) ? currentDamage.modifiers : [];
      
      let damageValue = "1d8";
      if (existingDamageModifiers.length > 0) {
        const modifierStrings = existingDamageModifiers.map(mod => mod.value || mod.name || mod).filter(v => v);
        if (modifierStrings.length > 0) {
          damageValue = `1d8 + ${modifierStrings.join(' + ')}`;
        }
      }
      
      updateData["system.weapon-main.damage"] = {
        baseValue: "1d8",
        modifiers: existingDamageModifiers,
        value: damageValue,
        isDynamic: false
      };
      
      // Reset to-hit
      const currentToHit = foundry.utils.getProperty(actor, 'system.weapon-main.to-hit');
      const existingToHitModifiers = (currentToHit && Array.isArray(currentToHit.modifiers)) ? currentToHit.modifiers : [];
      
      let toHitValue = 0;
      if (existingToHitModifiers.length > 0) {
        const modifierTotal = existingToHitModifiers.reduce((total, mod) => {
          const modValue = parseInt(mod.value || mod.modifier || mod) || 0;
          return total + modValue;
        }, 0);
        toHitValue = 0 + modifierTotal;
      }
      
      updateData["system.weapon-main.to-hit"] = {
        baseValue: 0,
        modifiers: existingToHitModifiers,
        value: toHitValue,
        isDynamic: false
      };
    }
    
    // Handle secondary weapon - store reference data only
    if (secondaryWeapon) {
      console.log("Daggerheart | Setting secondary weapon reference:", secondaryWeapon.name);
      
      updateData["system.weapon-off.name"] = secondaryWeapon.name;
      updateData["system.weapon-off.weaponId"] = secondaryWeapon.id;
      updateData["system.weapon-off.isDynamic"] = true; // Flag to indicate dynamic resolution
      
      // Clear any old snapshotted data to force dynamic resolution
      updateData["system.weapon-off.damage"] = {
        baseValue: null, // Clear snapshotted base value
        modifiers: foundry.utils.getProperty(actor, 'system.weapon-off.damage.modifiers') || [], // Preserve existing modifiers
        value: "Dynamic", // Placeholder to indicate dynamic resolution
        isDynamic: true
      };
      
      updateData["system.weapon-off.to-hit"] = {
        baseValue: null, // Clear snapshotted base value
        modifiers: foundry.utils.getProperty(actor, 'system.weapon-off.to-hit.modifiers') || [], // Preserve existing modifiers
        value: "Dynamic", // Placeholder to indicate dynamic resolution
        isDynamic: true
      };
    } else {
      console.log("Daggerheart | Clearing secondary weapon");
      
      // Clear weapon reference
      updateData["system.weapon-off.name"] = "";
      updateData["system.weapon-off.weaponId"] = null;
      updateData["system.weapon-off.isDynamic"] = false;
      
      // Remove base value restrictions when no weapon equipped
      if (actorSheet && actorSheet.removeBaseValueRestriction) {
        await actorSheet.removeBaseValueRestriction("system.weapon-off.damage");
        await actorSheet.removeBaseValueRestriction("system.weapon-off.to-hit");
      }
      
      // Reset to default values while preserving existing modifiers
      const currentDamage = foundry.utils.getProperty(actor, 'system.weapon-off.damage');
      const existingDamageModifiers = (currentDamage && Array.isArray(currentDamage.modifiers)) ? currentDamage.modifiers : [];
      
      let damageValue = "1d8";
      if (existingDamageModifiers.length > 0) {
        const modifierStrings = existingDamageModifiers.map(mod => mod.value || mod.name || mod).filter(v => v);
        if (modifierStrings.length > 0) {
          damageValue = `1d8 + ${modifierStrings.join(' + ')}`;
        }
      }
      
      updateData["system.weapon-off.damage"] = {
        baseValue: "1d8",
        modifiers: existingDamageModifiers,
        value: damageValue,
        isDynamic: false
      };
      
      // Reset to-hit
      const currentToHit = foundry.utils.getProperty(actor, 'system.weapon-off.to-hit');
      const existingToHitModifiers = (currentToHit && Array.isArray(currentToHit.modifiers)) ? currentToHit.modifiers : [];
      
      let toHitValue = 0;
      if (existingToHitModifiers.length > 0) {
        const modifierTotal = existingToHitModifiers.reduce((total, mod) => {
          const modValue = parseInt(mod.value || mod.modifier || mod) || 0;
          return total + modValue;
        }, 0);
        toHitValue = 0 + modifierTotal;
      }
      
      updateData["system.weapon-off.to-hit"] = {
        baseValue: 0,
        modifiers: existingToHitModifiers,
        value: toHitValue,
        isDynamic: false
      };
    }
    
    // Apply the consolidated update if there are changes
    if (Object.keys(updateData).length > 0) {
      console.log("Daggerheart | Applying weapon sync updates:", updateData);
      await actor.update(updateData);
    }
    
    console.log("Daggerheart | Weapon sync complete - using dynamic resolution");
  }

  /**
   * Dynamically resolve weapon data for rolls
   * @param {foundry.documents.Actor} actor - The actor
   * @param {string} slot - Either "primary" or "secondary"
   * @returns {Object|null} - Resolved weapon data with damage and to-hit
   * @static
   */
  static getResolvedWeaponData(actor, slot) {
    const weaponSlotKey = slot === "primary" ? "weapon-main" : "weapon-off";
    const weaponData = foundry.utils.getProperty(actor, `system.${weaponSlotKey}`);
    
    // If not dynamic, return current data as-is
    if (!weaponData?.isDynamic || !weaponData?.weaponId) {
      return weaponData;
    }
    
    // Find the actual weapon item
    const weapon = actor.items.get(weaponData.weaponId);
    if (!weapon || weapon.type !== "weapon") {
      console.warn(`Daggerheart | Weapon not found for ${slot} slot:`, weaponData.weaponId);
      return weaponData;
    }
    
    // Import the helper class (this will be synchronous since it's already loaded)
    const { EntitySheetHelper } = globalThis.daggerheart || {};
    if (!EntitySheetHelper) {
      console.warn("Daggerheart | EntitySheetHelper not available, falling back to basic resolution");
      return weaponData;
    }
    
    // Extract weapon damage formula using safe property access
    let damageFormula = foundry.utils.getProperty(weapon, 'system.damage');
    if (typeof damageFormula === 'object' && damageFormula !== null) {
      if (damageFormula.baseValue) {
        damageFormula = damageFormula.baseValue;
      } else if (damageFormula.value) {
        damageFormula = damageFormula.value;
      } else {
        damageFormula = "1d8";
      }
    } else if (typeof damageFormula === 'string' && damageFormula.trim()) {
      damageFormula = damageFormula.trim();
    } else {
      damageFormula = "1d8";
    }
    
    // Process inline references like @prof using Foundry VTT safe API
    try {
      damageFormula = EntitySheetHelper.processInlineReferences(damageFormula, actor);
    } catch (error) {
      console.warn("Daggerheart | Error processing inline references:", error);
      // Continue with unprocessed formula if there's an error
    }
    
    // Add existing modifiers
    const existingModifiers = weaponData.damage?.modifiers || [];
    let finalDamageValue = damageFormula;
    if (existingModifiers.length > 0) {
      const modifierStrings = existingModifiers.map(mod => mod.value || mod.name || mod).filter(v => v);
      if (modifierStrings.length > 0) {
        finalDamageValue = `${damageFormula} + ${modifierStrings.join(' + ')}`;
      }
    }
    
    // Calculate to-hit using safe property access
    const traitName = foundry.utils.getProperty(weapon, 'system.trait');
    let toHitValue = 0;
    if (traitName && foundry.utils.hasProperty(actor, `system.${traitName}`)) {
      toHitValue = foundry.utils.getProperty(actor, `system.${traitName}.value`) ?? 0;
    }
    
    // Add existing to-hit modifiers
    const existingToHitModifiers = weaponData["to-hit"]?.modifiers || [];
    let finalToHitValue = toHitValue;
    if (existingToHitModifiers.length > 0) {
      const modifierTotal = existingToHitModifiers.reduce((total, mod) => {
        const modValue = parseInt(mod.value || mod.modifier || mod) || 0;
        return total + modValue;
      }, 0);
      finalToHitValue = toHitValue + modifierTotal;
    }
    
    return {
      ...weaponData,
      damage: {
        baseValue: damageFormula,
        modifiers: existingModifiers,
        value: finalDamageValue,
        isDynamic: true
      },
      "to-hit": {
        baseValue: toHitValue,
        modifiers: existingToHitModifiers,
        value: finalToHitValue,
        isDynamic: true
      }
    };
  }

  /**
   * Clear any lingering weapon base value restrictions for an actor
   * Useful for fixing characters that have stuck restrictions after unequipping weapons
   * @param {foundry.documents.Actor} actor - The actor to clear restrictions for
   * @param {foundry.applications.sheets.ActorSheet} [sheet] - Optional sheet instance
   * @returns {Promise<void>}
   * @static
   */
  static async clearWeaponRestrictions(actor, sheet = null) {
    const actorSheet = sheet || actor.sheet;
    
    if (!actorSheet || !actorSheet.removeBaseValueRestriction) {
      console.warn("Daggerheart | Actor sheet or removeBaseValueRestriction method not available");
      return;
    }
    
    console.log("Daggerheart | Clearing weapon base value restrictions for:", actor.name);
    
    // Clear all weapon-related base value restrictions
    try {
      await actorSheet.removeBaseValueRestriction("system.weapon-main.damage");
      await actorSheet.removeBaseValueRestriction("system.weapon-main.to-hit");
      await actorSheet.removeBaseValueRestriction("system.weapon-off.damage");
      await actorSheet.removeBaseValueRestriction("system.weapon-off.to-hit");
      
      console.log("Daggerheart | Weapon restrictions cleared successfully");
      
      // Force a sheet refresh to show the unlocked fields
      if (actorSheet.render) {
        actorSheet.render(true);
      }
    } catch (error) {
      console.warn("Daggerheart | Error clearing weapon restrictions:", error);
    }
  }
} 