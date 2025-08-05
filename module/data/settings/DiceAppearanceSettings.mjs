/**
 * Settings schema for 3D dice appearance customization
 * Defines the data structure for Hope, Fear, Advantage, and Disadvantage dice customization
 * Based on existing hardcoded colorsets from rollHandler.js
 */
export const DiceAppearanceSettings = new foundry.data.fields.SchemaField({
  hope: new foundry.data.fields.SchemaField({
    foreground: new foundry.data.fields.ColorField({
      required: true,
      initial: "#ffffff", // White foreground from existing Hope colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.foreground"
    }),
    background: new foundry.data.fields.ColorField({
      required: true,
      initial: "#ffa200", // Orange background from existing Hope colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.background"
    }),
    outline: new foundry.data.fields.ColorField({
      required: true,
      initial: "#000000", // Black outline from existing Hope colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.outline"
    }),
    edge: new foundry.data.fields.ColorField({
      required: true,
      initial: "#ff8000", // Orange edge from existing Hope colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.edge"
    }),
    texture: new foundry.data.fields.StringField({
      required: true,
      initial: "ice", // Ice texture from existing Hope colorset
      choices: {
        "none": "DAGGERHEART.SETTINGS.DiceCustomization.texture.none",
        "ice": "DAGGERHEART.SETTINGS.DiceCustomization.texture.ice",
        "fire": "DAGGERHEART.SETTINGS.DiceCustomization.texture.fire",
        "water": "DAGGERHEART.SETTINGS.DiceCustomization.texture.water",
        "earth": "DAGGERHEART.SETTINGS.DiceCustomization.texture.earth",
        "air": "DAGGERHEART.SETTINGS.DiceCustomization.texture.air"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.texture"
    }),
    material: new foundry.data.fields.StringField({
      required: true,
      initial: "glass", // Glass material from existing Hope colorset
      choices: {
        "plastic": "DAGGERHEART.SETTINGS.DiceCustomization.material.plastic",
        "metal": "DAGGERHEART.SETTINGS.DiceCustomization.material.metal",
        "glass": "DAGGERHEART.SETTINGS.DiceCustomization.material.glass",
        "wood": "DAGGERHEART.SETTINGS.DiceCustomization.material.wood",
        "stone": "DAGGERHEART.SETTINGS.DiceCustomization.material.stone"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.material"
    }),
    system: new foundry.data.fields.StringField({
      required: true,
      initial: "standard", // Standard system from existing Hope colorset
      choices: {
        "standard": "DAGGERHEART.SETTINGS.DiceCustomization.system.standard"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.system"
    })
  }),
  
  fear: new foundry.data.fields.SchemaField({
    foreground: new foundry.data.fields.ColorField({
      required: true,
      initial: "#b5d5ff", // Light blue foreground from existing Fear colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.foreground"
    }),
    background: new foundry.data.fields.ColorField({
      required: true,
      initial: "#021280", // Dark blue background from existing Fear colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.background"
    }),
    outline: new foundry.data.fields.ColorField({
      required: true,
      initial: "#000000", // Black outline from existing Fear colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.outline"
    }),
    edge: new foundry.data.fields.ColorField({
      required: true,
      initial: "#210e6b", // Dark purple edge from existing Fear colorset
      label: "DAGGERHEART.SETTINGS.DiceCustomization.edge"
    }),
    texture: new foundry.data.fields.StringField({
      required: true,
      initial: "ice", // Ice texture from existing Fear colorset
      choices: {
        "none": "DAGGERHEART.SETTINGS.DiceCustomization.texture.none",
        "ice": "DAGGERHEART.SETTINGS.DiceCustomization.texture.ice",
        "fire": "DAGGERHEART.SETTINGS.DiceCustomization.texture.fire",
        "water": "DAGGERHEART.SETTINGS.DiceCustomization.texture.water",
        "earth": "DAGGERHEART.SETTINGS.DiceCustomization.texture.earth",
        "air": "DAGGERHEART.SETTINGS.DiceCustomization.texture.air"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.texture"
    }),
    material: new foundry.data.fields.StringField({
      required: true,
      initial: "metal", // Metal material from existing Fear colorset
      choices: {
        "plastic": "DAGGERHEART.SETTINGS.DiceCustomization.material.plastic",
        "metal": "DAGGERHEART.SETTINGS.DiceCustomization.material.metal",
        "glass": "DAGGERHEART.SETTINGS.DiceCustomization.material.glass",
        "wood": "DAGGERHEART.SETTINGS.DiceCustomization.material.wood",
        "stone": "DAGGERHEART.SETTINGS.DiceCustomization.material.stone"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.material"
    }),
    system: new foundry.data.fields.StringField({
      required: true,
      initial: "standard", // Standard system from existing Fear colorset
      choices: {
        "standard": "DAGGERHEART.SETTINGS.DiceCustomization.system.standard"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.system"
    })
  }),
  
  advantage: new foundry.data.fields.SchemaField({
    foreground: new foundry.data.fields.ColorField({
      required: true,
      initial: "#ffffff", // White foreground for Advantage dice (green theme)
      label: "DAGGERHEART.SETTINGS.DiceCustomization.foreground"
    }),
    background: new foundry.data.fields.ColorField({
      required: true,
      initial: "#008000", // Green background for Advantage dice
      label: "DAGGERHEART.SETTINGS.DiceCustomization.background"
    }),
    outline: new foundry.data.fields.ColorField({
      required: true,
      initial: "#000000", // Black outline for Advantage dice
      label: "DAGGERHEART.SETTINGS.DiceCustomization.outline"
    }),
    edge: new foundry.data.fields.ColorField({
      required: true,
      initial: "#004000", // Dark green edge for Advantage dice
      label: "DAGGERHEART.SETTINGS.DiceCustomization.edge"
    }),
    texture: new foundry.data.fields.StringField({
      required: true,
      initial: "none", // No texture for Advantage dice (simpler appearance)
      choices: {
        "none": "DAGGERHEART.SETTINGS.DiceCustomization.texture.none",
        "ice": "DAGGERHEART.SETTINGS.DiceCustomization.texture.ice",
        "fire": "DAGGERHEART.SETTINGS.DiceCustomization.texture.fire",
        "water": "DAGGERHEART.SETTINGS.DiceCustomization.texture.water",
        "earth": "DAGGERHEART.SETTINGS.DiceCustomization.texture.earth",
        "air": "DAGGERHEART.SETTINGS.DiceCustomization.texture.air"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.texture"
    }),
    material: new foundry.data.fields.StringField({
      required: true,
      initial: "plastic", // Plastic material for Advantage dice
      choices: {
        "plastic": "DAGGERHEART.SETTINGS.DiceCustomization.material.plastic",
        "metal": "DAGGERHEART.SETTINGS.DiceCustomization.material.metal",
        "glass": "DAGGERHEART.SETTINGS.DiceCustomization.material.glass",
        "wood": "DAGGERHEART.SETTINGS.DiceCustomization.material.wood",
        "stone": "DAGGERHEART.SETTINGS.DiceCustomization.material.stone"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.material"
    }),
    system: new foundry.data.fields.StringField({
      required: true,
      initial: "standard", // Standard system for Advantage dice
      choices: {
        "standard": "DAGGERHEART.SETTINGS.DiceCustomization.system.standard"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.system"
    })
  }),
  
  disadvantage: new foundry.data.fields.SchemaField({
    foreground: new foundry.data.fields.ColorField({
      required: true,
      initial: "#ffffff", // White foreground for Disadvantage dice (red theme)
      label: "DAGGERHEART.SETTINGS.DiceCustomization.foreground"
    }),
    background: new foundry.data.fields.ColorField({
      required: true,
      initial: "#b30000", // Red background for Disadvantage dice
      label: "DAGGERHEART.SETTINGS.DiceCustomization.background"
    }),
    outline: new foundry.data.fields.ColorField({
      required: true,
      initial: "#000000", // Black outline for Disadvantage dice
      label: "DAGGERHEART.SETTINGS.DiceCustomization.outline"
    }),
    edge: new foundry.data.fields.ColorField({
      required: true,
      initial: "#800000", // Dark red edge for Disadvantage dice
      label: "DAGGERHEART.SETTINGS.DiceCustomization.edge"
    }),
    texture: new foundry.data.fields.StringField({
      required: true,
      initial: "none", // No texture for Disadvantage dice (simpler appearance)
      choices: {
        "none": "DAGGERHEART.SETTINGS.DiceCustomization.texture.none",
        "ice": "DAGGERHEART.SETTINGS.DiceCustomization.texture.ice",
        "fire": "DAGGERHEART.SETTINGS.DiceCustomization.texture.fire",
        "water": "DAGGERHEART.SETTINGS.DiceCustomization.texture.water",
        "earth": "DAGGERHEART.SETTINGS.DiceCustomization.texture.earth",
        "air": "DAGGERHEART.SETTINGS.DiceCustomization.texture.air"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.texture"
    }),
    material: new foundry.data.fields.StringField({
      required: true,
      initial: "plastic", // Plastic material for Disadvantage dice
      choices: {
        "plastic": "DAGGERHEART.SETTINGS.DiceCustomization.material.plastic",
        "metal": "DAGGERHEART.SETTINGS.DiceCustomization.material.metal",
        "glass": "DAGGERHEART.SETTINGS.DiceCustomization.material.glass",
        "wood": "DAGGERHEART.SETTINGS.DiceCustomization.material.wood",
        "stone": "DAGGERHEART.SETTINGS.DiceCustomization.material.stone"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.material"
    }),
    system: new foundry.data.fields.StringField({
      required: true,
      initial: "standard", // Standard system for Disadvantage dice
      choices: {
        "standard": "DAGGERHEART.SETTINGS.DiceCustomization.system.standard"
      },
      label: "DAGGERHEART.SETTINGS.DiceCustomization.system"
    })
  })
});

/**
 * Validation helper for dice appearance settings
 */
export class DiceSettingsValidator {
  /**
   * Validates and sanitizes dice appearance settings
   * @param {Object} settings - The settings object to validate
   * @returns {Object} Validated and sanitized settings
   */
  static validateSettings(settings) {
    const defaults = DiceAppearanceSettings.getInitialValue();
    
    return foundry.utils.mergeObject(defaults, settings, {
      enforceTypes: true,
      insertKeys: false,
      insertValues: false
    });
  }
  
  /**
   * Validates a color value
   * @param {string} color - The color value to validate
   * @returns {string} Valid color value or default white
   */
  static validateColorValue(color) {
    return /^#[0-9A-F]{6}$/i.test(color) ? color : '#ffffff';
  }
  
  /**
   * Validates texture choice
   * @param {string} texture - The texture value to validate
   * @returns {string} Valid texture value or default 'ice'
   */
  static validateTexture(texture) {
    const validTextures = ['none', 'ice', 'fire', 'water', 'earth', 'air'];
    return validTextures.includes(texture) ? texture : 'ice';
  }
  
  /**
   * Validates material choice
   * @param {string} material - The material value to validate
   * @returns {string} Valid material value or default 'glass'
   */
  static validateMaterial(material) {
    const validMaterials = ['plastic', 'metal', 'glass', 'wood', 'stone'];
    return validMaterials.includes(material) ? material : 'glass';
  }
  
  /**
   * Validates system choice
   * @param {string} system - The system value to validate
   * @returns {string} Valid system value or default 'standard'
   */
  static validateSystem(system) {
    const validSystems = ['standard'];
    return validSystems.includes(system) ? system : 'standard';
  }
}