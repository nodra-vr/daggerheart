export class EquipmentHandler {
  
  /**
   * Get all equipped weapons for an actor
   * @param {Actor} actor - The actor to check
   * @returns {Array} Array of equipped weapon items
   */
  static getEquippedWeapons(actor) {
    return actor.items.filter(item => 
      item.type === "weapon" && item.system.equipped === true
    );
  }
  
  /**
   * Get the primary weapon (weapon assigned to primary slot)
   * @param {Actor} actor - The actor to check
   * @returns {Item|null} The primary weapon item or null
   */
  static getPrimaryWeapon(actor) {
    return actor.items.find(item => 
      item.type === "weapon" && 
      item.system.equipped === true && 
      item.system.weaponSlot === "primary"
    ) || null;
  }
  
  /**
   * Get the secondary weapon (weapon assigned to secondary slot)
   * @param {Actor} actor - The actor to check
   * @returns {Item|null} The secondary weapon item or null
   */
  static getSecondaryWeapon(actor) {
    return actor.items.find(item => 
      item.type === "weapon" && 
      item.system.equipped === true && 
      item.system.weaponSlot === "secondary"
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
   * @param {Actor} actor - The actor to sync
   * @param {ActorSheet} sheet - Optional sheet instance to use instead of actor.sheet
   */
  static async syncEquippedWeapons(actor, sheet = null) {
    const primaryWeapon = this.getPrimaryWeapon(actor);
    const secondaryWeapon = this.getSecondaryWeapon(actor);
    const actorSheet = sheet || actor.sheet;
    
    if (!actorSheet || !actorSheet.baseValue) {
      console.warn("Actor sheet or baseValue system not available");
      return;
    }
    
    console.log("Daggerheart | Syncing equipped weapons for actor:", actor.name);
    console.log("Daggerheart | Primary weapon:", primaryWeapon?.name || "none");
    console.log("Daggerheart | Secondary weapon:", secondaryWeapon?.name || "none");
    
    // Collect all updates to apply in a single actor.update() call
    const updateData = {};
    
    // Handle primary weapon
    if (primaryWeapon) {
      console.log("Daggerheart | Setting primary weapon:", primaryWeapon.name);
      console.log("Daggerheart | Primary weapon data:", primaryWeapon.system);
      
      // Extract weapon damage formula
      let damageFormula = primaryWeapon.system.damage;
      console.log("Daggerheart | Raw damage data:", damageFormula, "Type:", typeof damageFormula);
      
      if (typeof damageFormula === 'object' && damageFormula !== null) {
        // New structured format
        if (damageFormula.baseValue) {
          damageFormula = damageFormula.baseValue;
        } else if (damageFormula.value) {
          damageFormula = damageFormula.value;
        } else {
          damageFormula = "1d8";
        }
      } else if (typeof damageFormula === 'string' && damageFormula.trim()) {
        // Old string format - use as is
        damageFormula = damageFormula.trim();
      } else {
        // Fallback
        damageFormula = "1d8";
      }
      console.log("Daggerheart | Primary weapon damage formula:", damageFormula);
      
      // Set damage as locked base value
      await actorSheet.baseValue("system.weapon-main.damage", damageFormula, false);
      
      // Extract weapon trait and get trait value
      const traitName = primaryWeapon.system.trait;
      if (traitName && actor.system[traitName]) {
        const traitValue = actor.system[traitName]?.value || 0;
        console.log("Daggerheart | Primary weapon trait:", traitName, "value:", traitValue);
        await actorSheet.baseValue("system.weapon-main.to-hit", traitValue, false);
      } else {
        console.warn("Daggerheart | Primary weapon missing trait or trait not found:", traitName);
        await actorSheet.baseValue("system.weapon-main.to-hit", 0, false);
      }
      
      // Update weapon name
      updateData["system.weapon-main.name"] = primaryWeapon.name;
    } else {
      console.log("Daggerheart | Clearing primary weapon");
      
      // Release restrictions when no weapon equipped
      await actorSheet.removeBaseValueRestriction("system.weapon-main.damage");
      await actorSheet.removeBaseValueRestriction("system.weapon-main.to-hit");
      
      // Reset to default values
      updateData["system.weapon-main.name"] = "";
      updateData["system.weapon-main.damage"] = {
        baseValue: "1d8",
        modifiers: [],
        value: "1d8"
      };
      updateData["system.weapon-main.to-hit"] = {
        baseValue: 0,
        modifiers: [],
        value: 0
      };
    }
    
    // Handle secondary weapon
    if (secondaryWeapon) {
      console.log("Daggerheart | Setting secondary weapon:", secondaryWeapon.name);
      console.log("Daggerheart | Secondary weapon data:", secondaryWeapon.system);
      
      // Extract weapon damage formula
      let damageFormula = secondaryWeapon.system.damage;
      console.log("Daggerheart | Raw damage data:", damageFormula, "Type:", typeof damageFormula);
      
      if (typeof damageFormula === 'object' && damageFormula !== null) {
        // New structured format
        if (damageFormula.baseValue) {
          damageFormula = damageFormula.baseValue;
        } else if (damageFormula.value) {
          damageFormula = damageFormula.value;
        } else {
          damageFormula = "1d8";
        }
      } else if (typeof damageFormula === 'string' && damageFormula.trim()) {
        // Old string format - use as is
        damageFormula = damageFormula.trim();
      } else {
        // Fallback
        damageFormula = "1d8";
      }
      console.log("Daggerheart | Secondary weapon damage formula:", damageFormula);
      
      // Set damage as locked base value
      await actorSheet.baseValue("system.weapon-off.damage", damageFormula, false);
      
      // Extract weapon trait and get trait value
      const traitName = secondaryWeapon.system.trait;
      if (traitName && actor.system[traitName]) {
        const traitValue = actor.system[traitName]?.value || 0;
        console.log("Daggerheart | Secondary weapon trait:", traitName, "value:", traitValue);
        await actorSheet.baseValue("system.weapon-off.to-hit", traitValue, false);
      } else {
        console.warn("Daggerheart | Secondary weapon missing trait or trait not found:", traitName);
        await actorSheet.baseValue("system.weapon-off.to-hit", 0, false);
      }
      
      // Update weapon name
      updateData["system.weapon-off.name"] = secondaryWeapon.name;
    } else {
      console.log("Daggerheart | Clearing secondary weapon");
      
      // Release restrictions when no weapon equipped
      await actorSheet.removeBaseValueRestriction("system.weapon-off.damage");
      await actorSheet.removeBaseValueRestriction("system.weapon-off.to-hit");
      
      // Reset to default values
      updateData["system.weapon-off.name"] = "";
      updateData["system.weapon-off.damage"] = {
        baseValue: "1d8",
        modifiers: [],
        value: "1d8"
      };
      updateData["system.weapon-off.to-hit"] = {
        baseValue: 0,
        modifiers: [],
        value: 0
      };
    }
    
    // Apply the consolidated update if there are changes
    if (Object.keys(updateData).length > 0) {
      console.log("Daggerheart | Applying weapon sync updates:", updateData);
      await actor.update(updateData);
    }
    
    console.log("Daggerheart | Weapon sync complete 2");
  }
} 