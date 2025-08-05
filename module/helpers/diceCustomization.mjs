/**
 * Dice Customization Helper System
 * Provides dynamic colorset generation and application for Daggerheart dice types
 * Integrates with Dice So Nice module for 3D dice customization
 */

import { DiceSettingsValidator } from '../data/settings/DiceAppearanceSettings.mjs';

/**
 * Helper class for managing dice customization and colorset generation
 */
export class DiceCustomizationHelper {
  
  /**
   * Generates colorsets for all dice types based on current user settings
   * @returns {Promise<Object>} Object containing colorsets for hope, fear, advantage, disadvantage
   */
  static async generateColorsets() {
    try {
      // Get current dice appearance settings from world settings
      const settings = game.settings.get('daggerheart', 'diceAppearance');
      
      // Validate settings to ensure data integrity
      const validatedSettings = DiceSettingsValidator.validateSettings(settings);
      
      return {
        hope: this.createColorset('Hope', validatedSettings.hope),
        fear: this.createColorset('Fear', validatedSettings.fear),
        advantage: this.createColorset('Advantage', validatedSettings.advantage),
        disadvantage: this.createColorset('Disadvantage', validatedSettings.disadvantage)
      };
    } catch (error) {
      console.error('DiceCustomizationHelper | Error generating colorsets:', error);
      
      // Return default colorsets on error
      return this._getDefaultColorsets();
    }
  }
  
  /**
   * Creates a Dice So Nice colorset configuration for a specific dice type
   * @param {string} name - The name of the dice type (Hope, Fear, Advantage, Disadvantage)
   * @param {Object} config - The configuration object containing color and material settings
   * @returns {Object} Dice So Nice compatible colorset object
   */
  static createColorset(name, config) {
    try {
      // Validate individual configuration values
      const validatedConfig = {
        foreground: DiceSettingsValidator.validateColorValue(config.foreground),
        background: DiceSettingsValidator.validateColorValue(config.background),
        outline: DiceSettingsValidator.validateColorValue(config.outline),
        edge: DiceSettingsValidator.validateColorValue(config.edge),
        texture: DiceSettingsValidator.validateTexture(config.texture),
        material: DiceSettingsValidator.validateMaterial(config.material),
        system: DiceSettingsValidator.validateSystem(config.system)
      };
      
      return {
        name: name,
        category: `${name} Die`,
        description: name,
        texture: validatedConfig.texture,
        foreground: validatedConfig.foreground,
        background: validatedConfig.background,
        outline: validatedConfig.outline,
        edge: validatedConfig.edge,
        material: validatedConfig.material,
        font: "Modesto Condensed", // Maintain consistent font with existing system
        colorset: "custom",
        system: validatedConfig.system
      };
    } catch (error) {
      console.error(`DiceCustomizationHelper | Error creating colorset for ${name}:`, error);
      
      // Return a safe default colorset
      return this._getDefaultColorsetForType(name);
    }
  }
  
  /**
   * Applies dice customization to a roll object by setting colorsets on individual dice
   * @param {Roll} roll - The FoundryVTT Roll object to customize
   * @param {Array<string>} diceTypes - Array of dice type names corresponding to each die in the roll
   * @returns {Promise<void>}
   */
  static async applyDiceCustomization(roll, diceTypes) {
    try {
      // Check if Dice So Nice module is available and active
      if (!this._isDiceSoNiceAvailable()) {
        console.warn('DiceCustomizationHelper | Dice So Nice module not available, skipping customization');
        return;
      }
      
      // Validate inputs
      if (!roll || !roll.dice || !Array.isArray(diceTypes)) {
        console.warn('DiceCustomizationHelper | Invalid roll or diceTypes provided');
        return;
      }
      
      // Generate current colorsets
      const colorsets = await this.generateColorsets();
      
      // Apply colorsets to each die in the roll
      roll.dice.forEach((die, index) => {
        const diceType = diceTypes[index];
        
        if (diceType && colorsets[diceType.toLowerCase()]) {
          // Initialize options object if it doesn't exist
          if (!die.options) {
            die.options = {};
          }
          
          // Apply the colorset configuration to the die
          const colorset = colorsets[diceType.toLowerCase()];
          Object.assign(die.options, {
            colorset: colorset.name,
            appearance: {
              texture: colorset.texture,
              foreground: colorset.foreground,
              background: colorset.background,
              outline: colorset.outline,
              edge: colorset.edge,
              material: colorset.material,
              font: colorset.font,
              system: colorset.system
            }
          });
        }
      });
      
    } catch (error) {
      console.error('DiceCustomizationHelper | Error applying dice customization:', error);
      // Don't throw - allow roll to continue without customization
    }
  }
  
  /**
   * Ensures that custom colorsets are registered with Dice So Nice
   * This method should be called during system initialization
   * @returns {Promise<void>}
   */
  static async ensureColorsetsRegistered() {
    try {
      if (!this._isDiceSoNiceAvailable()) {
        return;
      }
      
      const colorsets = await this.generateColorsets();
      const existingColorsets = game.dice3d.DiceColors?.getColorsets?.() || {};
      
      // Register each colorset if it doesn't already exist
      Object.values(colorsets).forEach(colorset => {
        if (!existingColorsets[colorset.name]) {
          game.dice3d.addColorset(colorset);
        }
      });
      
    } catch (error) {
      console.error('DiceCustomizationHelper | Error ensuring colorsets registered:', error);
    }
  }
  
  /**
   * Checks if the Dice So Nice module is available and active
   * @returns {boolean} True if Dice So Nice is available
   * @private
   */
  static _isDiceSoNiceAvailable() {
    return !!(game.dice3d && game.modules.get('dice-so-nice')?.active);
  }
  
  /**
   * Returns default colorsets for fallback scenarios
   * @returns {Object} Default colorsets object
   * @private
   */
  static _getDefaultColorsets() {
    return {
      hope: this._getDefaultColorsetForType('Hope'),
      fear: this._getDefaultColorsetForType('Fear'),
      advantage: this._getDefaultColorsetForType('Advantage'),
      disadvantage: this._getDefaultColorsetForType('Disadvantage')
    };
  }
  
  /**
   * Returns a default colorset for a specific dice type
   * @param {string} type - The dice type name
   * @returns {Object} Default colorset configuration
   * @private
   */
  static _getDefaultColorsetForType(type) {
    const defaults = {
      Hope: {
        name: "Hope",
        category: "Hope Die",
        description: "Hope",
        texture: "ice",
        foreground: "#ffffff",
        background: "#ffa200",
        outline: "#000000",
        edge: "#ff8000",
        material: "glass",
        font: "Modesto Condensed",
        colorset: "custom",
        system: "standard"
      },
      Fear: {
        name: "Fear",
        category: "Fear Die",
        description: "Fear",
        texture: "ice",
        foreground: "#b5d5ff",
        background: "#021280",
        outline: "#000000",
        edge: "#210e6b",
        material: "metal",
        font: "Modesto Condensed",
        colorset: "custom",
        system: "standard"
      },
      Advantage: {
        name: "Advantage",
        category: "Advantage Die",
        description: "Advantage",
        texture: "none",
        foreground: "#ffffff",
        background: "#008000",
        outline: "#000000",
        edge: "#004000",
        material: "plastic",
        font: "Modesto Condensed",
        colorset: "custom",
        system: "standard"
      },
      Disadvantage: {
        name: "Disadvantage",
        category: "Disadvantage Die",
        description: "Disadvantage",
        texture: "none",
        foreground: "#ffffff",
        background: "#b30000",
        outline: "#000000",
        edge: "#800000",
        material: "plastic",
        font: "Modesto Condensed",
        colorset: "custom",
        system: "standard"
      }
    };
    
    return defaults[type] || defaults.Hope;
  }
  
  /**
   * Validates that dice customization settings are properly configured
   * @returns {boolean} True if settings are valid
   */
  static validateCustomizationSettings() {
    try {
      const settings = game.settings.get('daggerheart', 'diceAppearance');
      const validatedSettings = DiceSettingsValidator.validateSettings(settings);
      
      // Check that all required dice types are present
      const requiredTypes = ['hope', 'fear', 'advantage', 'disadvantage'];
      return requiredTypes.every(type => 
        validatedSettings[type] && 
        typeof validatedSettings[type] === 'object'
      );
    } catch (error) {
      console.error('DiceCustomizationHelper | Error validating settings:', error);
      return false;
    }
  }
  
  /**
   * Resets dice customization to default values
   * @returns {Promise<void>}
   */
  static async resetToDefaults() {
    try {
      // Import the settings schema to get default values
      const { DiceAppearanceSettings } = await import('../data/settings/DiceAppearanceSettings.mjs');
      const defaultSettings = DiceAppearanceSettings.getInitialValue();
      
      // Save default settings
      await game.settings.set('daggerheart', 'diceAppearance', defaultSettings);
      
      // Re-register colorsets with new defaults
      await this.ensureColorsetsRegistered();
      
      console.log('DiceCustomizationHelper | Reset dice customization to defaults');
    } catch (error) {
      console.error('DiceCustomizationHelper | Error resetting to defaults:', error);
      throw error;
    }
  }
}