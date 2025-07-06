/**
 * ModifierManager - Programmatic interface for managing actor modifiers
 * Provides API for adding, removing, and updating modifiers on actor attributes
 * Works with the existing modifier system architecture in Daggerheart
 */
export class ModifierManager {
  
  /**
   * Add a modifier to an actor's attribute
   * @param {Actor} actor - The actor to modify
   * @param {string} fieldPath - The field path (e.g., "system.finesse.value", "system.weapon-main.to-hit")
   * @param {Object} modifierData - The modifier data
   * @param {string} modifierData.name - Name of the modifier
   * @param {number|string} modifierData.value - Value of the modifier (number for traits, string for damage)
   * @param {boolean} [modifierData.enabled=true] - Whether the modifier is enabled
   * @param {string} [modifierData.color] - Future: Color for the modifier (not yet implemented)
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  static async addModifier(actor, fieldPath, modifierData) {
    if (!actor || !fieldPath || !modifierData) {
      console.error("ModifierManager | Invalid parameters for addModifier");
      return false;
    }

    try {
      // Get current attribute data
      const currentData = foundry.utils.getProperty(actor, fieldPath);
      
      // Determine if this is a damage modifier or numeric modifier
      const isDamageModifier = fieldPath.includes('.damage');
      
      // Prepare the modifier
      const modifier = {
        name: modifierData.name || 'Modifier',
        value: modifierData.value || (isDamageModifier ? '+1' : 0),
        enabled: modifierData.enabled !== false
      };

      // If color is provided, store it (future enhancement)
      if (modifierData.color) {
        modifier.color = modifierData.color;
      }

      let structuredData;
      
      // Handle different current data states
      if (typeof currentData === 'object' && currentData !== null && 'baseValue' in currentData) {
        // Already structured - use existing structure
        structuredData = {
          baseValue: currentData.baseValue,
          modifiers: [...(currentData.modifiers || [])],
          value: currentData.value
        };
      } else if (typeof currentData === 'object' && currentData !== null && 'value' in currentData) {
        // Has .value but missing structure - migrate
        const currentValue = currentData.value || (isDamageModifier ? '1d8' : 0);
        structuredData = {
          baseValue: currentValue,
          modifiers: [...(currentData.modifiers || [])],
          value: currentValue
        };
      } else {
        // Simple value - create structure
        const simpleValue = currentData || (isDamageModifier ? '1d8' : 0);
        structuredData = {
          baseValue: simpleValue,
          modifiers: [],
          value: simpleValue
        };
      }

      // Add the new modifier
      structuredData.modifiers.push(modifier);

      // Calculate new total value
      let newTotalValue;
      if (isDamageModifier) {
        newTotalValue = this._calculateDamageTotal(structuredData);
      } else {
        newTotalValue = this._calculateNumericTotal(structuredData);
      }

      // Build update data
      const updateData = {};
      
      // Handle weapon modifiers and other special cases
      const isWeaponModifier = fieldPath.includes('weapon-main.') || fieldPath.includes('weapon-off.');
      
      let basePath;
      if (isWeaponModifier) {
        // For weapon modifiers, the field itself is the base path
        basePath = fieldPath;
      } else {
        // For other attributes, remove .value from the path if present
        basePath = fieldPath.endsWith('.value') ? 
          fieldPath.substring(0, fieldPath.lastIndexOf('.')) : fieldPath;
      }

      updateData[`${basePath}.baseValue`] = structuredData.baseValue;
      updateData[`${basePath}.modifiers`] = structuredData.modifiers;
      updateData[`${basePath}.value`] = newTotalValue;

      // Update the actor
      await actor.update(updateData);
      
      console.log(`ModifierManager | Added modifier "${modifier.name}" to ${actor.name} at ${fieldPath}`);
      return true;

    } catch (error) {
      console.error("ModifierManager | Error adding modifier:", error);
      return false;
    }
  }

  /**
   * Convenience method to add a modifier by actor name
   * @param {string} actorName - Name of the actor to find
   * @param {string} fieldPath - The field path 
   * @param {string} modifierName - Name of the modifier
   * @param {number|string} modifierValue - Value of the modifier
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.enabled=true] - Whether modifier is enabled
   * @param {string} [options.color] - Color for the modifier
   * @param {string} [options.searchScope='all'] - Where to search: 'all', 'scene', 'world'
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  static async addModifierByName(actorName, fieldPath, modifierName, modifierValue, options = {}) {
    const actor = this._findActorByName(actorName, options.searchScope);
    
    if (!actor) {
      console.error(`ModifierManager | Actor "${actorName}" not found`);
      return false;
    }

    return this.addModifier(actor, fieldPath, {
      name: modifierName,
      value: modifierValue,
      enabled: options.enabled !== false,
      color: options.color
    });
  }

  /**
   * Remove a modifier from an actor's attribute
   * @param {Actor} actor - The actor to modify
   * @param {string} fieldPath - The field path
   * @param {string} modifierName - Name of the modifier to remove
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  static async removeModifier(actor, fieldPath, modifierName) {
    if (!actor || !fieldPath || !modifierName) {
      console.error("ModifierManager | Invalid parameters for removeModifier");
      return false;
    }

    try {
      const currentData = foundry.utils.getProperty(actor, fieldPath);
      
      if (!currentData || !currentData.modifiers || !Array.isArray(currentData.modifiers)) {
        console.warn(`ModifierManager | No modifiers found at ${fieldPath} for ${actor.name}`);
        return false;
      }

      // Find and remove the modifier
      const modifierIndex = currentData.modifiers.findIndex(mod => mod.name === modifierName);
      if (modifierIndex === -1) {
        console.warn(`ModifierManager | Modifier "${modifierName}" not found at ${fieldPath} for ${actor.name}`);
        return false;
      }

      const updatedModifiers = [...currentData.modifiers];
      updatedModifiers.splice(modifierIndex, 1);

      // Recalculate total
      const isDamageModifier = fieldPath.includes('.damage');
      let newTotalValue;
      
      if (isDamageModifier) {
        newTotalValue = this._calculateDamageTotal({
          baseValue: currentData.baseValue,
          modifiers: updatedModifiers
        });
      } else {
        newTotalValue = this._calculateNumericTotal({
          baseValue: currentData.baseValue,
          modifiers: updatedModifiers
        });
      }

      // Build update data
      const updateData = {};
      const isWeaponModifier = fieldPath.includes('weapon-main.') || fieldPath.includes('weapon-off.');
      const basePath = isWeaponModifier ? fieldPath : 
        (fieldPath.endsWith('.value') ? fieldPath.substring(0, fieldPath.lastIndexOf('.')) : fieldPath);

      updateData[`${basePath}.modifiers`] = updatedModifiers;
      updateData[`${basePath}.value`] = newTotalValue;

      await actor.update(updateData);
      
      console.log(`ModifierManager | Removed modifier "${modifierName}" from ${actor.name} at ${fieldPath}`);
      return true;

    } catch (error) {
      console.error("ModifierManager | Error removing modifier:", error);
      return false;
    }
  }

  /**
   * Get all modifiers for a specific field
   * @param {Actor} actor - The actor
   * @param {string} fieldPath - The field path
   * @returns {Array} - Array of modifiers
   */
  static getModifiers(actor, fieldPath) {
    if (!actor || !fieldPath) return [];
    
    const currentData = foundry.utils.getProperty(actor, fieldPath);
    if (!currentData || !currentData.modifiers) return [];
    
    return [...currentData.modifiers];
  }

  /**
   * Enable or disable a modifier
   * @param {Actor} actor - The actor
   * @param {string} fieldPath - The field path
   * @param {string} modifierName - Name of the modifier
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {Promise<boolean>} - True if successful
   */
  static async toggleModifier(actor, fieldPath, modifierName, enabled) {
    if (!actor || !fieldPath || !modifierName) return false;

    try {
      const currentData = foundry.utils.getProperty(actor, fieldPath);
      if (!currentData || !currentData.modifiers) return false;

      const modifierIndex = currentData.modifiers.findIndex(mod => mod.name === modifierName);
      if (modifierIndex === -1) return false;

      const updatedModifiers = [...currentData.modifiers];
      updatedModifiers[modifierIndex] = {
        ...updatedModifiers[modifierIndex],
        enabled: enabled
      };

      // Recalculate total
      const isDamageModifier = fieldPath.includes('.damage');
      let newTotalValue;
      
      if (isDamageModifier) {
        newTotalValue = this._calculateDamageTotal({
          baseValue: currentData.baseValue,
          modifiers: updatedModifiers
        });
      } else {
        newTotalValue = this._calculateNumericTotal({
          baseValue: currentData.baseValue,
          modifiers: updatedModifiers
        });
      }

      // Update
      const updateData = {};
      const isWeaponModifier = fieldPath.includes('weapon-main.') || fieldPath.includes('weapon-off.');
      const basePath = isWeaponModifier ? fieldPath : 
        (fieldPath.endsWith('.value') ? fieldPath.substring(0, fieldPath.lastIndexOf('.')) : fieldPath);

      updateData[`${basePath}.modifiers`] = updatedModifiers;
      updateData[`${basePath}.value`] = newTotalValue;

      await actor.update(updateData);
      return true;

    } catch (error) {
      console.error("ModifierManager | Error toggling modifier:", error);
      return false;
    }
  }

  /**
   * Calculate numeric total (for traits, attacks, etc.)
   * @param {Object} data - The structured data with baseValue and modifiers
   * @returns {number} - The calculated total
   * @private
   */
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

  /**
   * Calculate damage total (for damage formulas)
   * @param {Object} data - The structured data with baseValue and modifiers
   * @returns {string} - The calculated formula
   * @private
   */
  static _calculateDamageTotal(data) {
    let baseFormula = data.baseValue || '1d8';
    const enabledModifiers = (data.modifiers || []).filter(mod => mod.enabled !== false && mod.value);

    if (enabledModifiers.length === 0) {
      return baseFormula;
    }

    const modifierStrings = enabledModifiers.map(modifier => {
      let modValue = String(modifier.value).trim();
      // Ensure proper formatting - add + if it doesn't start with + or -
      if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
        modValue = '+' + modValue;
      }
      return modValue;
    }).filter(v => v);

    if (modifierStrings.length > 0) {
      return `${baseFormula} ${modifierStrings.join(' ')}`;
    }

    return baseFormula;
  }

  /**
   * Find an actor by name
   * @param {string} actorName - Name to search for
   * @param {string} [scope='all'] - Search scope: 'all', 'scene', 'world'
   * @returns {Actor|null} - The found actor or null
   * @private
   */
  static _findActorByName(actorName, scope = 'all') {
    // First try current scene tokens
    if (scope === 'all' || scope === 'scene') {
      const token = canvas.tokens?.placeables?.find(t => 
        t.actor && t.actor.name === actorName
      );
      if (token && token.actor) return token.actor;
    }

    // Then try world actors
    if (scope === 'all' || scope === 'world') {
      const actor = game.actors?.find(a => a.name === actorName);
      if (actor) return actor;
    }

    return null;
  }

  /**
   * List all available modifiers for an actor (for debugging/inspection)
   * @param {Actor} actor - The actor to inspect
   * @returns {Object} - Object mapping field paths to their modifiers
   */
  static listAllModifiers(actor) {
    if (!actor) return {};

    const result = {};
    
    // Common modifier fields to check
    const commonFields = [
      'system.agility.value',
      'system.finesse.value', 
      'system.instinct.value',
      'system.knowledge.value',
      'system.presence.value',
      'system.strength.value',
      'system.weapon-main.to-hit',
      'system.weapon-off.to-hit',
      'system.weapon-main.damage',
      'system.weapon-off.damage'
    ];

    commonFields.forEach(field => {
      const data = foundry.utils.getProperty(actor, field);
      if (data && data.modifiers && Array.isArray(data.modifiers) && data.modifiers.length > 0) {
        result[field] = data.modifiers;
      }
    });

    return result;
  }
}

// Export for global access
export default ModifierManager;

// Global convenience functions for easy access
globalThis.addModifier = function(actorName, fieldPath, modifierName, modifierValue, options = {}) {
  return ModifierManager.addModifierByName(actorName, fieldPath, modifierName, modifierValue, options);
};

globalThis.removeModifier = function(actorName, fieldPath, modifierName) {
  const actor = ModifierManager._findActorByName(actorName);
  if (!actor) {
    console.error(`Actor "${actorName}" not found`);
    return Promise.resolve(false);
  }
  return ModifierManager.removeModifier(actor, fieldPath, modifierName);
};

globalThis.listModifiers = function(actorName, fieldPath = null) {
  const actor = ModifierManager._findActorByName(actorName);
  if (!actor) {
    console.error(`Actor "${actorName}" not found`);
    return {};
  }
  
  if (fieldPath) {
    return ModifierManager.getModifiers(actor, fieldPath);
  } else {
    return ModifierManager.listAllModifiers(actor);
  }
};

// Register ModifierManager globally
if (typeof globalThis.daggerheart === "undefined") {
  globalThis.daggerheart = {};
}
globalThis.daggerheart.ModifierManager = ModifierManager;

// Also expose on window for browser console access
if (typeof window !== 'undefined') {
  window.ModifierManager = ModifierManager;
}