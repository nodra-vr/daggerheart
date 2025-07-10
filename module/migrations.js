import { ModifierManager } from "./modifierManager.js";

export class DaggerheartMigrations {

  static CURRENT_VERSION = "1.2.3";

  static async migrateDocument(document) {
    let needsUpdate = false;
    const systemData = document.system;
    const currentVersion = document.getFlag('daggerheart', 'migrationVersion') || "1.0.0";

    if (this.compareVersions(currentVersion, this.CURRENT_VERSION) < 0) {
      console.log(`🔄 Migrating ${document.documentName} "${document.name}" from v${currentVersion} to v${this.CURRENT_VERSION}`);

      if (this.compareVersions(currentVersion, "1.1.0") < 0) {
        needsUpdate = this._migrateToLocationBased(document) || needsUpdate;
      }

      if (this.compareVersions(currentVersion, "1.1.1") < 0) {
        needsUpdate = this._migrateWeaponEquipped(document) || needsUpdate;
      }

      const updateData = {};

      if (this.compareVersions(currentVersion, "1.2.0") < 0 && document.documentName === "Actor") {
        const weaponMigration = this._migrateWeaponDataStructure(document);
        if (weaponMigration) {
          Object.assign(updateData, weaponMigration);
          needsUpdate = true;
        }
      }

      if (this.compareVersions(currentVersion, "1.2.0") < 0 && document.documentName === "Item") {
        const weaponItemMigration = this._migrateWeaponItemDataStructure(document);
        if (weaponItemMigration) {
          Object.assign(updateData, weaponItemMigration);
          needsUpdate = true;
        }
      }

      if (this.compareVersions(currentVersion, "1.2.1") < 0 && document.documentName === "Actor" && document.type === "character") {
        try {
          const thresholdMigration = this._migrateThresholdDataStructure(document);
          if (thresholdMigration) {
            Object.assign(updateData, thresholdMigration);
            needsUpdate = true;
          }
        } catch (error) {
          console.error(`❌ Error migrating threshold data for "${document.name}":`, error);
          ui.notifications.error(`Migration error for character "${document.name}". Please check the console for details.`);
        }
      }

      if (this.compareVersions(currentVersion, "1.2.2") < 0 && document.documentName === "Actor" && document.type === "character") {
        try {
          const thresholdFix = this._fixZeroThresholdDefaults(document);
          if (thresholdFix) {
            Object.assign(updateData, thresholdFix);
            needsUpdate = true;
          }
        } catch (error) {
          console.error(`❌ Error fixing zero threshold defaults for "${document.name}":`, error);
        }
      }

      if (this.compareVersions(currentVersion, "1.2.3") < 0 && document.documentName === "Actor" && document.type === "character") {
        try {
          const characterLevelModifier = this._addCharacterLevelModifier(document);
          if (characterLevelModifier) {
            Object.assign(updateData, characterLevelModifier);
            needsUpdate = true;
          }
        } catch (error) {
          console.error(`❌ Error adding character level modifier for "${document.name}":`, error);
        }
      }

      if (document.documentName === "Actor" && document.type === "character") {
        const safetyScan = this._safetyCheckThresholdData(document);
        if (safetyScan) {
          Object.assign(updateData, safetyScan);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {

        updateData["flags.daggerheart.migrationVersion"] = this.CURRENT_VERSION;
        await document.update(updateData);
        console.log(`✅ Successfully migrated "${document.name}" to v${this.CURRENT_VERSION}`);
      }
    }

    return needsUpdate;
  }

  static _migrateToLocationBased(document) {
    let needsUpdate = false;
    const updates = {};

    if (document.documentName === "Item" && !document.system.location) {
      const location = this._getDefaultLocationForType(document.type);
      updates["system.location"] = location;
      needsUpdate = true;

      console.log(`📦 Setting location for ${document.type} "${document.name}" → "${location}"`);
    }

    if (needsUpdate && Object.keys(updates).length > 0) {
      document.updateSource(updates);
    }

    return needsUpdate;
  }

  static _migrateWeaponEquipped(document) {
    let needsUpdate = false;
    const updates = {};

    if (document.documentName === "Item" && document.type === "weapon" && document.system.equipped === undefined) {
      updates["system.equipped"] = false;
      needsUpdate = true;

      console.log(`⚔️ Adding equipped field to weapon "${document.name}" → false`);
    }

    if (needsUpdate && Object.keys(updates).length > 0) {
      document.updateSource(updates);
    }

    return needsUpdate;
  }

  static _getDefaultLocationForType(type) {
    switch (type) {
      case "worn":
        return "worn";
      case "inventory":
        return "backpack";
      case "vault":
        return "vault";
      case "class":
        return "class";
      case "subclass":
        return "subclass";
      case "ancestry":
        return "ancestry";
      case "community":
        return "community";
      case "domain":
      case "item":
        return "abilities";
      case "weapon":
        return "backpack";
      default:
        console.warn(`Unknown item type "${type}", defaulting to backpack`);
        return "backpack";
    }
  }

  static compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;

      if (a < b) return -1;
      if (a > b) return 1;
    }

    return 0;
  }

  static async migrateWorld() {
    console.log("🌍 Starting world migration...");

    const migrationPromises = [];

    for (const actor of game.actors) {
      migrationPromises.push(this.migrateDocument(actor));

      for (const item of actor.items) {
        migrationPromises.push(this.migrateDocument(item));
      }
    }

    for (const item of game.items) {
      migrationPromises.push(this.migrateDocument(item));
    }

    const results = await Promise.all(migrationPromises);
    const migratedCount = results.filter(Boolean).length;

    if (migratedCount > 0) {
      console.log(`✅ Migration complete! Updated ${migratedCount} documents.`);
      ui.notifications.info(`Migration complete! Updated ${migratedCount} items to new inventory system.`);
    } else {
      console.log("✅ No migration needed - all documents up to date.");
    }
  }

  static _migrateWeaponDataStructure(actor) {
    const updateData = {};
    let needsUpdate = false;

    if (actor.system["weapon-main"]?.damage) {
      const damage = actor.system["weapon-main"].damage;
      if (typeof damage === 'string' || typeof damage === 'number') {
        updateData["system.weapon-main.damage"] = {
          baseValue: damage || "1d8",
          modifiers: [],
          value: damage || "1d8"
        };
        needsUpdate = true;
      }
    }

    if (actor.system["weapon-main"]?.["to-hit"]) {
      const toHit = actor.system["weapon-main"]["to-hit"];
      if (typeof toHit === 'string' || typeof toHit === 'number') {
        updateData["system.weapon-main.to-hit"] = {
          baseValue: parseInt(toHit) || 0,
          modifiers: [],
          value: parseInt(toHit) || 0
        };
        needsUpdate = true;
      }
    }

    if (actor.system["weapon-off"]?.damage) {
      const damage = actor.system["weapon-off"].damage;
      if (typeof damage === 'string' || typeof damage === 'number') {
        updateData["system.weapon-off.damage"] = {
          baseValue: damage || "1d8",
          modifiers: [],
          value: damage || "1d8"
        };
        needsUpdate = true;
      }
    }

    if (actor.system["weapon-off"]?.["to-hit"]) {
      const toHit = actor.system["weapon-off"]["to-hit"];
      if (typeof toHit === 'string' || typeof toHit === 'number') {
        updateData["system.weapon-off.to-hit"] = {
          baseValue: parseInt(toHit) || 0,
          modifiers: [],
          value: parseInt(toHit) || 0
        };
        needsUpdate = true;
      }
    }

    return needsUpdate ? updateData : null;
  }

  static _migrateWeaponItemDataStructure(item) {
    const updateData = {};
    let needsUpdate = false;

    if (item.type === "weapon") {

      if (item.system.damage) {
        const damage = item.system.damage;
        if (typeof damage === 'string' || typeof damage === 'number') {
          updateData["system.damage"] = {
            baseValue: damage || "1d8",
            modifiers: [],
            value: damage || "1d8"
          };
          needsUpdate = true;
          console.log(`⚔️ Migrating weapon "${item.name}" damage from "${damage}" to structured format`);
        }
      } else {

        updateData["system.damage"] = {
          baseValue: "1d8",
          modifiers: [],
          value: "1d8"
        };
        needsUpdate = true;
        console.log(`⚔️ Adding default damage structure to weapon "${item.name}"`);
      }
    }

    return needsUpdate ? updateData : null;
  }

  static _getDefaultThresholdValues() {
    return {
      major: {
        baseValue: 8,
        modifiers: [],
        value: 8
      },
      severe: {
        baseValue: 12,
        modifiers: [],
        value: 12
      }
    };
  }

  static _migrateThresholdDataStructure(actor) {
    const updateData = {};
    let needsUpdate = false;

    if (actor.system.threshold) {
      const threshold = actor.system.threshold;

      if (threshold.major !== undefined && threshold.major !== null) {

        const isStructured = typeof threshold.major === 'object' &&
                            threshold.major !== null &&
                            'baseValue' in threshold.major &&
                            'modifiers' in threshold.major &&
                            'value' in threshold.major;

        if (!isStructured) {

          const originalValue = typeof threshold.major === 'string' ?
                               parseInt(threshold.major) || 0 :
                               (typeof threshold.major === 'number' ? threshold.major : 0);

          updateData["system.threshold.major"] = {
            baseValue: originalValue,
            modifiers: [],
            value: originalValue
          };
          needsUpdate = true;
          console.log(`🎯 Migrating major threshold for "${actor.name}" from ${threshold.major} to structured format (${originalValue})`);
        }
      } else {

        updateData["system.threshold.major"] = this._getDefaultThresholdValues().major;
        needsUpdate = true;
        console.log(`🎯 Adding default major threshold for "${actor.name}" (8)`);
      }

      if (threshold.severe !== undefined && threshold.severe !== null) {

        const isStructured = typeof threshold.severe === 'object' &&
                            threshold.severe !== null &&
                            'baseValue' in threshold.severe &&
                            'modifiers' in threshold.severe &&
                            'value' in threshold.severe;

        if (!isStructured) {

          const originalValue = typeof threshold.severe === 'string' ?
                               parseInt(threshold.severe) || 0 :
                               (typeof threshold.severe === 'number' ? threshold.severe : 0);

          updateData["system.threshold.severe"] = {
            baseValue: originalValue,
            modifiers: [],
            value: originalValue
          };
          needsUpdate = true;
          console.log(`🎯 Migrating severe threshold for "${actor.name}" from ${threshold.severe} to structured format (${originalValue})`);
        }
      } else {

        updateData["system.threshold.severe"] = this._getDefaultThresholdValues().severe;
        needsUpdate = true;
        console.log(`🎯 Adding default severe threshold for "${actor.name}" (12)`);
      }
    } else {

      updateData["system.threshold"] = this._getDefaultThresholdValues();
      needsUpdate = true;
      console.log(`🎯 Creating default threshold structure for "${actor.name}" (major: 8, severe: 12)`);
    }

    return needsUpdate ? updateData : null;
  }

  static async _migrateToV121(actor) {
    console.log(`Daggerheart | Migrating ${actor.name} to v1.2.1 (weapon slots)`);

    const updateData = {};
    let hasChanges = false;

    for (let item of actor.items) {
      if (item.type === "weapon") {
        const itemUpdateData = {};

        if (item.system.weaponSlot === undefined) {

          if (item.system.equipped) {
            const equippedWeapons = actor.items.filter(i => 
              i.type === "weapon" && 
              i.system.equipped && 
              i.system.weaponSlot
            );

            const hasPrimary = equippedWeapons.some(w => w.system.weaponSlot === "primary");
            const hasSecondary = equippedWeapons.some(w => w.system.weaponSlot === "secondary");

            if (!hasPrimary) {
              itemUpdateData["system.weaponSlot"] = "primary";
            } else if (!hasSecondary) {
              itemUpdateData["system.weaponSlot"] = "secondary";
            } else {

              itemUpdateData["system.equipped"] = false;
              itemUpdateData["system.weaponSlot"] = null;
            }
          } else {
            itemUpdateData["system.weaponSlot"] = null;
          }

          if (Object.keys(itemUpdateData).length > 0) {
            await item.update(itemUpdateData);
            console.log(`Daggerheart | Updated weapon ${item.name} with slot data:`, itemUpdateData);
          }
        }
      }
    }

    updateData["system.version"] = "1.2.1";
    hasChanges = true;

    if (hasChanges) {
      await actor.update(updateData);
      console.log(`Daggerheart | ${actor.name} migrated to v1.2.1`);
    }
  }

  static _fixZeroThresholdDefaults(actor) {
    const updateData = {};
    let needsUpdate = false;

    if (actor.system.threshold) {
      const threshold = actor.system.threshold;

      if (threshold.major && typeof threshold.major === 'object') {
        if (threshold.major.baseValue === 0 && threshold.major.value === 0) {
          console.log(`🔧 Fixing zero major threshold for "${actor.name}" (0 → 8)`);
          updateData["system.threshold.major"] = this._getDefaultThresholdValues().major;
          needsUpdate = true;
        }
      }

      if (threshold.severe && typeof threshold.severe === 'object') {
        if (threshold.severe.baseValue === 0 && threshold.severe.value === 0) {
          console.log(`🔧 Fixing zero severe threshold for "${actor.name}" (0 → 12)`);
          updateData["system.threshold.severe"] = this._getDefaultThresholdValues().severe;
          needsUpdate = true;
        }
      }
    }

    return needsUpdate ? updateData : null;
  }

  static _safetyCheckThresholdData(actor) {
    const updateData = {};
    let needsUpdate = false;

    if (actor.system.threshold) {
      const threshold = actor.system.threshold;

      if (threshold.major !== undefined && threshold.major !== null) {
        if (typeof threshold.major === 'object') {

          if (!('baseValue' in threshold.major) || !('modifiers' in threshold.major) || !('value' in threshold.major)) {
            console.warn(`🔧 Fixing corrupted major threshold structure for "${actor.name}"`);
            const fallbackValue = threshold.major.value || threshold.major.baseValue || this._getDefaultThresholdValues().major.baseValue;
            updateData["system.threshold.major"] = {
              baseValue: fallbackValue,
              modifiers: Array.isArray(threshold.major.modifiers) ? threshold.major.modifiers : [],
              value: fallbackValue
            };
            needsUpdate = true;
          }

          else if (!Array.isArray(threshold.major.modifiers)) {
            console.warn(`🔧 Fixing corrupted major threshold modifiers for "${actor.name}"`);
            updateData["system.threshold.major.modifiers"] = [];
            needsUpdate = true;
          }
        }
      }

      if (threshold.severe !== undefined && threshold.severe !== null) {
        if (typeof threshold.severe === 'object') {

          if (!('baseValue' in threshold.severe) || !('modifiers' in threshold.severe) || !('value' in threshold.severe)) {
            console.warn(`🔧 Fixing corrupted severe threshold structure for "${actor.name}"`);
            const fallbackValue = threshold.severe.value || threshold.severe.baseValue || this._getDefaultThresholdValues().severe.baseValue;
            updateData["system.threshold.severe"] = {
              baseValue: fallbackValue,
              modifiers: Array.isArray(threshold.severe.modifiers) ? threshold.severe.modifiers : [],
              value: fallbackValue
            };
            needsUpdate = true;
          }

          else if (!Array.isArray(threshold.severe.modifiers)) {
            console.warn(`🔧 Fixing corrupted severe threshold modifiers for "${actor.name}"`);
            updateData["system.threshold.severe.modifiers"] = [];
            needsUpdate = true;
          }
        }
      }
    }

    return needsUpdate ? updateData : null;
  }

  static async migrateActor(actor) {
    const currentVersion = actor.system.version || "1.0.0";
    console.log(`Daggerheart | Checking migration for ${actor.name}, current version: ${currentVersion}`);

    if (foundry.utils.isNewerVersion("1.2.0", currentVersion)) {
      await this._migrateToV120(actor);
    }

    if (foundry.utils.isNewerVersion("1.2.1", currentVersion)) {
      await this._migrateToV121(actor);
    }

    console.log(`Daggerheart | Migration complete for ${actor.name}`);
  }

  static _addCharacterLevelModifier(actor) {
    const updateData = {};
    let needsUpdate = false;

    if (actor.system.threshold) {
      const level = parseInt(actor.system.level?.value) || 1;
      const modifierName = "Character Level";

      // Check major threshold
      if (actor.system.threshold.major && typeof actor.system.threshold.major === 'object') {
        const majorModifiers = actor.system.threshold.major.modifiers || [];
        const hasCharacterLevelModifier = majorModifiers.some(mod => mod.name === modifierName);
        
        if (!hasCharacterLevelModifier) {
          const newModifiers = [...majorModifiers, {
            name: modifierName,
            value: level,
            enabled: true,
            permanent: true
          }];
          
          const newValue = this._calculateNumericTotal({
            baseValue: actor.system.threshold.major.baseValue,
            modifiers: newModifiers
          });

          updateData["system.threshold.major.modifiers"] = newModifiers;
          updateData["system.threshold.major.value"] = newValue;
          needsUpdate = true;
          console.log(`🔧 Adding Character Level modifier (+${level}) to major threshold for "${actor.name}"`);
        }
      }

      // Check severe threshold
      if (actor.system.threshold.severe && typeof actor.system.threshold.severe === 'object') {
        const severeModifiers = actor.system.threshold.severe.modifiers || [];
        const hasCharacterLevelModifier = severeModifiers.some(mod => mod.name === modifierName);
        
        if (!hasCharacterLevelModifier) {
          const newModifiers = [...severeModifiers, {
            name: modifierName,
            value: level,
            enabled: true,
            permanent: true
          }];
          
          const newValue = this._calculateNumericTotal({
            baseValue: actor.system.threshold.severe.baseValue,
            modifiers: newModifiers
          });

          updateData["system.threshold.severe.modifiers"] = newModifiers;
          updateData["system.threshold.severe.value"] = newValue;
          needsUpdate = true;
          console.log(`🔧 Adding Character Level modifier (+${level}) to severe threshold for "${actor.name}"`);
        }
      }
    }

    return needsUpdate ? updateData : null;
  }

  static _calculateNumericTotal(data) {
    const baseValue = parseInt(data.baseValue) || 0;
    let modifierTotal = 0;

    if (Array.isArray(data.modifiers)) {
      data.modifiers.forEach(modifier => {
        if (modifier.enabled !== false) {
          modifierTotal += parseInt(modifier.value) || 0;
        }
      });
    }

    return baseValue + modifierTotal;
  }
}