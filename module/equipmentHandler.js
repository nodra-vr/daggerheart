export class EquipmentHandler {
  static getEquippedWeapons(actor) {
    return actor.items.filter(item => 
      item.type === "weapon" && foundry.utils.getProperty(item, 'system.equipped') === true
    );
  }
  static getPrimaryWeapon(actor) {
    return actor.items.find(item => 
      item.type === "weapon" && 
      foundry.utils.getProperty(item, 'system.equipped') === true && 
      foundry.utils.getProperty(item, 'system.weaponSlot') === "primary"
    ) || null;
  }
  static getSecondaryWeapon(actor) {
    return actor.items.find(item => 
      item.type === "weapon" && 
      foundry.utils.getProperty(item, 'system.equipped') === true && 
      foundry.utils.getProperty(item, 'system.weaponSlot') === "secondary"
    ) || null;
  }
  static async equipPrimaryWeapon(actor, weapon) {
    return this._equip(actor, weapon, "primary");
  }
  static async equipSecondaryWeapon(actor, weapon) {
    return this._equip(actor, weapon, "secondary");
  }
  static MAIN = "weapon-main"; 
  static OFF  = "weapon-off";  
  static _same(a,b){return JSON.stringify(a)===JSON.stringify(b);} 
  static async _equip(actor, weapon, slot) {
    if (!weapon || weapon.type !== "weapon") {
      ui.notifications.error(game.i18n?.localize?.("DH.InvalidWeapon") ?? "Invalid weapon");
      return false;
    }
    const otherEquipped = this.getEquippedWeapons(actor).filter(w => w.id !== weapon.id);
    const isCurrentlyEquipped = weapon.system?.equipped === true;
    if (!isCurrentlyEquipped && otherEquipped.length >= 2) {
      ui.notifications.warn(game.i18n?.localize?.("DH.MaxTwoWeapons") ?? "You can only equip two weapons at a time.");
      return false;
    }
    const currentSlotWeapon = slot === "primary" ? this.getPrimaryWeapon(actor) : this.getSecondaryWeapon(actor);
    try {
      if (currentSlotWeapon && currentSlotWeapon.id === weapon.id) {
        await weapon.update({ "system.equipped": false, "system.weaponSlot": null });
        await this.updateWeaponSlots(actor);
        ui.notifications.info(`${weapon.name} unequipped from ${slot} slot`);
        return true;
      }
      const itemUpdates = [];
      if (currentSlotWeapon) {
        itemUpdates.push({ _id: currentSlotWeapon.id, "system.equipped": false, "system.weaponSlot": null });
      }
      if (isCurrentlyEquipped) {
        itemUpdates.push({ _id: weapon.id, "system.weaponSlot": slot });
      } else {
        itemUpdates.push({ _id: weapon.id, "system.equipped": true, "system.weaponSlot": slot });
      }
      if(itemUpdates.length) await actor.updateEmbeddedDocuments("Item", itemUpdates);
      await this.updateWeaponSlots(actor);
      ui.notifications.info(`${weapon.name} equipped as ${slot} weapon`);
      return true;
    } catch (error) {
      console.error("Failed to equip weapon:", error);
      ui.notifications.error(`Failed to equip ${weapon.name}`);
      return false;
    }
  }
  static async toggleWeaponEquip(actor, weapon) {
    return this.equipPrimaryWeapon(actor, weapon);
  }
  static getWeaponEquippedSlot(actor, weapon) {
    if (!weapon || weapon.type !== "weapon" || !foundry.utils.getProperty(weapon, 'system.equipped')) {
      return null;
    }
    return foundry.utils.getProperty(weapon, 'system.weaponSlot') || null;
  }
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
  static getWeaponTotalDamage(weapon, actor) {
    if (!weapon || weapon.type !== "weapon") {
      return "1d8";
    }
    const weaponDamage = foundry.utils.getProperty(weapon, 'system.damage');
    let weaponFormula = "1d8";
    let weaponModifiers = [];
    if (typeof weaponDamage === 'object' && weaponDamage !== null) {
      weaponFormula = weaponDamage.baseValue || weaponDamage.value || "1d8";
      weaponModifiers = Array.isArray(weaponDamage.modifiers) ? weaponDamage.modifiers : [];
    } else if (typeof weaponDamage === 'string' && weaponDamage.trim()) {
      weaponFormula = weaponDamage.trim();
    }
    const { EntitySheetHelper } = globalThis.daggerheart || {};
    if (EntitySheetHelper) {
      try {
        weaponFormula = EntitySheetHelper.processInlineReferences(weaponFormula, actor);
      } catch (error) {
        console.warn("Daggerheart | Error processing inline references:", error);
      }
    }
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
    return totalWeaponDamage;
  }
  static getWeaponTraitValue(weapon, actor) {
    if (!weapon || weapon.type !== "weapon") {
      return 0;
    }
    const traitName = foundry.utils.getProperty(weapon, 'system.trait');
    if (!traitName) {
      return 0;
    }
    const traitValue = foundry.utils.getProperty(actor, `system.${traitName}.value`) ?? 0;
    return traitValue;
  }
  static getDynamicWeaponData(actor, slot) {
    const weapon = slot === "primary" ? this.getPrimaryWeapon(actor) : this.getSecondaryWeapon(actor);
    const slotKey = slot === "primary" ? this.MAIN : this.OFF;
    if (!weapon) {
      const currentData = foundry.utils.getProperty(actor, `system.${slotKey}`) || {};
      const dmgBase  = currentData.damage?.baseValue ?? currentData.damage?.value ?? "1d8";
      const hitBase  = currentData["to-hit"]?.baseValue ?? currentData["to-hit"]?.value ?? 0;
      const dmgMods  = Array.isArray(currentData.damage?.modifiers)   ? currentData.damage.modifiers   : [];
      const hitMods  = Array.isArray(currentData["to-hit"]?.modifiers)? currentData["to-hit"].modifiers: [];
      return {
        name     : currentData.name ?? "",
        weaponId : null,
        damage   : {
          baseValue : dmgBase,
          modifiers : dmgMods,
          value     : this._calculateTotal(dmgBase, dmgMods)
        },
        "to-hit" : {
          baseValue : hitBase,
          modifiers : hitMods,
          value     : this._calculateTotal(hitBase, hitMods)
        }
      };
    }
    const currentData = foundry.utils.getProperty(actor, `system.${slotKey}`) || {};
    const weaponTotalDamage = this.getWeaponTotalDamage(weapon, actor);
    const weaponTraitValue = this.getWeaponTraitValue(weapon, actor);
    const characterDamageModifiers = currentData.damage?.modifiers || [];
    const characterAttackModifiers = currentData["to-hit"]?.modifiers || [];
    return {
      name: weapon.name,
      weaponId: weapon.id,
      damage: {
        baseValue: weaponTotalDamage, 
        modifiers: characterDamageModifiers, 
        value: this._calculateTotal(weaponTotalDamage, characterDamageModifiers)
      },
      "to-hit": {
        baseValue: weaponTraitValue, 
        modifiers: characterAttackModifiers, 
        value: this._calculateTotal(weaponTraitValue, characterAttackModifiers)
      }
    };
  }
  static _calculateTotal(baseValue, modifiers) {
    if (!modifiers || modifiers.length === 0) return baseValue; 
    const enabled = modifiers.filter(m=>m.enabled!==false);
    if (!enabled.length) return baseValue;
    if (typeof baseValue === 'number') {
      const modSum = enabled.reduce((t,m)=>t+(parseInt(m.value||m.modifier||m)||0),0);
      return baseValue + modSum;
    }
    const parts = enabled.map(m=>`${m.value||m.name||m}`.trim()).filter(Boolean).map(v=>v.replace(/^([+\-])?/,'+$1'==='+$1'?v.slice(1):v));
    return parts.length ? `${baseValue} + ${parts.join(' + ')}` : baseValue;
  }
  static async updateWeaponSlots(actor) {
    const primary = this.getDynamicWeaponData(actor, "primary");
    const secondary = this.getDynamicWeaponData(actor, "secondary");
    const curP = actor.system?.[this.MAIN];
    const curS = actor.system?.[this.OFF];
    if(this._same(primary,curP) && this._same(secondary,curS)) return; 
    await actor.update({[`system.${this.MAIN}`]:primary,[`system.${this.OFF}`]:secondary});
  }
  static async syncEquippedWeapons(actor ) {
    return this.updateWeaponSlots(actor);
  }
} 
