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
   * Get the primary weapon (first equipped weapon)
   * @param {Actor} actor - The actor to check
   * @returns {Item|null} The primary weapon item or null
   */
  static getPrimaryWeapon(actor) {
    const equippedWeapons = this.getEquippedWeapons(actor);
    return equippedWeapons.length > 0 ? equippedWeapons[0] : null;
  }
  
  /**
   * Get the secondary weapon (second equipped weapon)
   * @param {Actor} actor - The actor to check
   * @returns {Item|null} The secondary weapon item or null
   */
  static getSecondaryWeapon(actor) {
    const equippedWeapons = this.getEquippedWeapons(actor);
    return equippedWeapons.length > 1 ? equippedWeapons[1] : null;
  }
  
  /**
   * Check if a weapon can be equipped
   * @param {Actor} actor - The actor trying to equip
   * @param {Item} weapon - The weapon being equipped
   * @returns {Object} Object with canEquip boolean and reason string
   */
  static canEquipWeapon(actor, weapon) {
    const equippedWeapons = this.getEquippedWeapons(actor);
    
    // If already equipped, can unequip
    if (weapon.system.equipped) {
      return { canEquip: true, reason: "unequip" };
    }
    
    // If less than 2 weapons equipped, can equip
    if (equippedWeapons.length < 2) {
      return { canEquip: true, reason: "equip" };
    }
    
    // Already at max weapons
    return { 
      canEquip: false, 
      reason: "Two weapons are already equipped. Unequip a weapon first." 
    };
  }
  
  /**
   * Equip weapon to a specific slot
   * @param {Actor} actor - The actor
   * @param {Item} weapon - The weapon to equip
   * @param {string} slot - 'primary' or 'secondary'
   * @returns {Promise<boolean>} Success status
   */
  static async equipWeaponToSlot(actor, weapon, slot) {
    if (!weapon || weapon.type !== "weapon") {
      ui.notifications.error("Invalid weapon");
      return false;
    }

    if (!['primary', 'secondary'].includes(slot)) {
      ui.notifications.error("Invalid weapon slot");
      return false;
    }

    const equippedWeapons = this.getEquippedWeapons(actor);
    
    // Check if weapon is already equipped
    if (weapon.system.equipped) {
      ui.notifications.warn(`${weapon.name} is already equipped`);
      return false;
    }

    // Check if target slot is occupied
    const targetSlotWeapon = slot === 'primary' ? equippedWeapons[0] : equippedWeapons[1];
    if (targetSlotWeapon) {
      // Unequip the weapon in the target slot
      await targetSlotWeapon.update({ "system.equipped": false });
      ui.notifications.info(`${targetSlotWeapon.name} unequipped to make room`);
    }

    try {
      // Equip the new weapon
      await weapon.update({ "system.equipped": true });
      
      // If equipping to secondary but no primary exists, we need to handle slot ordering
      if (slot === 'secondary' && equippedWeapons.length === 0) {
        // This will be the only weapon, so it becomes primary regardless
        ui.notifications.info(`${weapon.name} equipped as primary weapon`);
      } else if (slot === 'secondary' && equippedWeapons.length === 1) {
        // There's already a primary, so this becomes secondary
        ui.notifications.info(`${weapon.name} equipped as secondary weapon`);
      } else {
        ui.notifications.info(`${weapon.name} equipped as ${slot} weapon`);
      }
      
      return true;
    } catch (error) {
      console.error("Failed to equip weapon to slot:", error);
      ui.notifications.error(`Failed to equip ${weapon.name}`);
      return false;
    }
  }

  /**
   * Show weapon slot selection dialog
   * @param {Actor} actor - The actor
   * @param {Item} weapon - The weapon to equip
   * @returns {Promise<string|null>} Selected slot or null if cancelled
   */
  static async showWeaponSlotDialog(actor, weapon) {
    const equippedWeapons = this.getEquippedWeapons(actor);
    const primaryWeapon = equippedWeapons[0];
    const secondaryWeapon = equippedWeapons[1];

    // Build dialog content
    let content = `
      <div class="dh-popup__content">
        <div class="dh-popup__section">
          <p class="dh-text">Choose which hand to equip <strong>${weapon.name}</strong> to:</p>
        </div>
        
        <div class="dh-popup__section">
          <div class="dh-flex dh-flex--column dh-flex--gap-md">
            <div class="weapon-slot-option" data-slot="primary">
              <div class="dh-flex dh-flex--between dh-flex--center">
                <div class="dh-flex dh-flex--column">
                  <span class="dh-label">Primary Hand</span>
                  <span class="dh-text dh-text--muted">${primaryWeapon ? `Currently: ${primaryWeapon.name}` : 'Empty'}</span>
                </div>
                <button type="button" class="dh-btn dh-btn--primary slot-select-btn" data-slot="primary">
                  ${primaryWeapon ? 'Replace' : 'Equip'}
                </button>
              </div>
            </div>
            
            <div class="weapon-slot-option" data-slot="secondary">
              <div class="dh-flex dh-flex--between dh-flex--center">
                <div class="dh-flex dh-flex--column">
                  <span class="dh-label">Secondary Hand</span>
                  <span class="dh-text dh-text--muted">${secondaryWeapon ? `Currently: ${secondaryWeapon.name}` : 'Empty'}</span>
                </div>
                <button type="button" class="dh-btn dh-btn--primary slot-select-btn" data-slot="secondary">
                  ${secondaryWeapon ? 'Replace' : 'Equip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Choose Weapon Slot",
        content: content,
        buttons: {
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "cancel",
        render: (html) => {
          // Add global design system classes to dialog
          html.closest('.dialog').addClass('daggerheart-dialog weapon-slot-dialog');
          
          // Handle slot selection
          html.find('.slot-select-btn').click((event) => {
            const slot = event.currentTarget.dataset.slot;
            resolve(slot);
            dialog.close();
          });
        },
        close: () => resolve(null)
      });
      
      dialog.render(true);
    });
  }

  /**
   * Toggle weapon equipped state with slot selection
   * @param {Actor} actor - The actor
   * @param {Item} weapon - The weapon to toggle
   * @returns {Promise<boolean>} Success status
   */
  static async toggleWeaponEquip(actor, weapon) {
    if (!weapon || weapon.type !== "weapon") {
      ui.notifications.error("Invalid weapon");
      return false;
    }
    
    // If weapon is equipped, unequip it
    if (weapon.system.equipped) {
      try {
        await weapon.update({ "system.equipped": false });
        ui.notifications.info(`${weapon.name} unequipped`);
        return true;
      } catch (error) {
        console.error("Failed to unequip weapon:", error);
        ui.notifications.error(`Failed to unequip ${weapon.name}`);
        return false;
      }
    }
    
    // If weapon is not equipped, check if we can equip it
    const equippedWeapons = this.getEquippedWeapons(actor);
    
    // If no weapons equipped, equip to primary
    if (equippedWeapons.length === 0) {
      return await this.equipWeaponToSlot(actor, weapon, 'primary');
    }
    
    // If one weapon equipped, equip to secondary
    if (equippedWeapons.length === 1) {
      return await this.equipWeaponToSlot(actor, weapon, 'secondary');
    }
    
    // If both slots occupied, show dialog to choose which to replace
    if (equippedWeapons.length >= 2) {
      const selectedSlot = await this.showWeaponSlotDialog(actor, weapon);
      if (selectedSlot) {
        return await this.equipWeaponToSlot(actor, weapon, selectedSlot);
      }
      return false;
    }
    
    return false;
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
    
    const equippedWeapons = this.getEquippedWeapons(actor);
    
    // Try both id and _id for comparison
    let weaponIndex = equippedWeapons.findIndex(w => w.id === weapon.id);
    if (weaponIndex === -1) {
      weaponIndex = equippedWeapons.findIndex(w => w._id === weapon._id);
    }
    
    if (weaponIndex === 0) return 'primary';
    if (weaponIndex === 1) return 'secondary';
    return null;
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
    const equippedWeapons = this.getEquippedWeapons(actor);
    const actorSheet = sheet || actor.sheet;
    
    if (!actorSheet || !actorSheet.baseValue) {
      console.warn("Actor sheet or baseValue system not available");
      return;
    }
    
    console.log("Daggerheart | Syncing equipped weapons for actor:", actor.name);
    console.log("Daggerheart | Equipped weapons:", equippedWeapons.map(w => w.name));
    
    // Collect all updates to apply in a single actor.update() call
    const updateData = {};
    
    // Handle primary weapon (first equipped)
    const primaryWeapon = equippedWeapons[0];
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
    
    // Handle secondary weapon (second equipped)
    const secondaryWeapon = equippedWeapons[1];
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
    
    console.log("Daggerheart | Weapon sync complete");
  }
  

  

} 