/**
 * Data Migration System for Daggerheart
 * Based on Foundry VTT System Development Guide
 * https://foundryvtt.com/article/system-development/
 */

export class DaggerheartMigrations {
  
  /**
   * Current migration version
   * Increment this when adding new migrations
   */
  static CURRENT_VERSION = "1.1.1";
  
  /**
   * Run all necessary migrations
   * @param {Actor|Item} document - The document to migrate
   * @returns {boolean} - Whether migration was needed
   */
  static async migrateDocument(document) {
    let needsUpdate = false;
    const systemData = document.system;
    const currentVersion = document.getFlag('daggerheart', 'migrationVersion') || "1.0.0";
    
    // Only migrate if we haven't already migrated to current version
    if (this.compareVersions(currentVersion, this.CURRENT_VERSION) < 0) {
      console.log(`🔄 Migrating ${document.documentName} "${document.name}" from v${currentVersion} to v${this.CURRENT_VERSION}`);
      
      // Run migrations in order
      if (this.compareVersions(currentVersion, "1.1.0") < 0) {
        needsUpdate = this._migrateToLocationBased(document) || needsUpdate;
      }
      
      if (this.compareVersions(currentVersion, "1.1.1") < 0) {
        needsUpdate = this._migrateWeaponEquipped(document) || needsUpdate;
      }
      
      // Mark as migrated
      if (needsUpdate) {
        await document.setFlag('daggerheart', 'migrationVersion', this.CURRENT_VERSION);
      }
    }
    
    return needsUpdate;
  }
  
  /**
   * Migrate to location-based inventory system (v1.1.0)
   * @param {Actor|Item} document 
   * @returns {boolean}
   */
  static _migrateToLocationBased(document) {
    let needsUpdate = false;
    const updates = {};
    
    // Only migrate Items that don't have a location field
    if (document.documentName === "Item" && !document.system.location) {
      const location = this._getDefaultLocationForType(document.type);
      updates["system.location"] = location;
      needsUpdate = true;
      
      console.log(`📦 Setting location for ${document.type} "${document.name}" → "${location}"`);
    }
    

    
    // Apply updates if needed
    if (needsUpdate && Object.keys(updates).length > 0) {
      document.updateSource(updates);
    }
    
    return needsUpdate;
  }
  
  /**
   * Migrate weapons to add equipped field (v1.1.1)
   * @param {Actor|Item} document 
   * @returns {boolean}
   */
  static _migrateWeaponEquipped(document) {
    let needsUpdate = false;
    const updates = {};
    
    // Add equipped field to weapons that don't have it
    if (document.documentName === "Item" && document.type === "weapon" && document.system.equipped === undefined) {
      updates["system.equipped"] = false;
      needsUpdate = true;
      
      console.log(`⚔️ Adding equipped field to weapon "${document.name}" → false`);
    }
    
    // Apply updates if needed
    if (needsUpdate && Object.keys(updates).length > 0) {
      document.updateSource(updates);
    }
    
    return needsUpdate;
  }
  
  /**
   * Get default location based on item type
   * @param {string} type - The item type
   * @returns {string} - The default location
   */
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
  
  /**
   * Compare two version strings
   * @param {string} v1 - First version
   * @param {string} v2 - Second version
   * @returns {number} - -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
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
  
  /**
   * Migrate all documents in the world
   * Called during system initialization
   */
  static async migrateWorld() {
    console.log("🌍 Starting world migration...");
    
    const migrationPromises = [];
    
    // Migrate all actors and their items
    for (const actor of game.actors) {
      migrationPromises.push(this.migrateDocument(actor));
      
      // Migrate actor's items
      for (const item of actor.items) {
        migrationPromises.push(this.migrateDocument(item));
      }
    }
    
    // Migrate world-level items
    for (const item of game.items) {
      migrationPromises.push(this.migrateDocument(item));
    }
    
    // Wait for all migrations to complete
    const results = await Promise.all(migrationPromises);
    const migratedCount = results.filter(Boolean).length;
    
    if (migratedCount > 0) {
      console.log(`✅ Migration complete! Updated ${migratedCount} documents.`);
      ui.notifications.info(`Migration complete! Updated ${migratedCount} items to new inventory system.`);
    } else {
      console.log("✅ No migration needed - all documents up to date.");
    }
  }
} 