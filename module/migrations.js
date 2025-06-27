

export class DaggerheartMigrations {
  
  // Current version
  static CURRENT_VERSION = "1.1.1";
  
  // Run migrations
  static async migrateDocument(document) {
    let needsUpdate = false;
    const systemData = document.system;
    const currentVersion = document.getFlag('daggerheart', 'migrationVersion') || "1.0.0";
    
    // Check version
    if (this.compareVersions(currentVersion, this.CURRENT_VERSION) < 0) {
      console.log(`🔄 Migrating ${document.documentName} "${document.name}" from v${currentVersion} to v${this.CURRENT_VERSION}`);
      
      // Run updates
      if (this.compareVersions(currentVersion, "1.1.0") < 0) {
        needsUpdate = this._migrateToLocationBased(document) || needsUpdate;
      }
      
      if (this.compareVersions(currentVersion, "1.1.1") < 0) {
        needsUpdate = this._migrateWeaponEquipped(document) || needsUpdate;
      }
      
      // Mark done
      if (needsUpdate) {
        await document.setFlag('daggerheart', 'migrationVersion', this.CURRENT_VERSION);
      }
    }
    
    return needsUpdate;
  }
  
  // Add locations
  static _migrateToLocationBased(document) {
    let needsUpdate = false;
    const updates = {};
    
    // Fix items without location
    if (document.documentName === "Item" && !document.system.location) {
      const location = this._getDefaultLocationForType(document.type);
      updates["system.location"] = location;
      needsUpdate = true;
      
      console.log(`📦 Setting location for ${document.type} "${document.name}" → "${location}"`);
    }
    

    
    // Apply updates
    if (needsUpdate && Object.keys(updates).length > 0) {
      document.updateSource(updates);
    }
    
    return needsUpdate;
  }
  
  // Add equipped
  static _migrateWeaponEquipped(document) {
    let needsUpdate = false;
    const updates = {};
    
    // Fix weapons without equipped
    if (document.documentName === "Item" && document.type === "weapon" && document.system.equipped === undefined) {
      updates["system.equipped"] = false;
      needsUpdate = true;
      
      console.log(`⚔️ Adding equipped field to weapon "${document.name}" → false`);
    }
    
    // Apply updates
    if (needsUpdate && Object.keys(updates).length > 0) {
      document.updateSource(updates);
    }
    
    return needsUpdate;
  }
  
  // Get location
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
  
  // Compare versions
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
  
  // Migrate world
  static async migrateWorld() {
    console.log("🌍 Starting world migration...");
    
    const migrationPromises = [];
    
    // Fix actors
    for (const actor of game.actors) {
      migrationPromises.push(this.migrateDocument(actor));
      
      // Fix items
      for (const item of actor.items) {
        migrationPromises.push(this.migrateDocument(item));
      }
    }
    
    // Fix world items
    for (const item of game.items) {
      migrationPromises.push(this.migrateDocument(item));
    }
    
    // Wait for finish
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