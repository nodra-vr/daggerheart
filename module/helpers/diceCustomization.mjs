/**
 * Helper class for managing dice customization and integration with Dice So Nice module
 */
export class DiceCustomizationHelper {
    
    /**
     * Generate dice presets for all dice types from user settings
     * @param {string} hopeFaces - Hope die faces (e.g., 'd12')
     * @param {string} fearFaces - Fear die faces (e.g., 'd12')
     * @param {string} advantageFaces - Advantage die faces (e.g., 'd6')
     * @param {string} disadvantageFaces - Disadvantage die faces (e.g., 'd6')
     * @returns {Promise<Object>} Object containing presets for hope, fear, advantage, and disadvantage dice
     */
    static async generateDicePresets(hopeFaces, fearFaces, advantageFaces = 'd6', disadvantageFaces = 'd6') {
        console.debug('DiceCustomizationHelper: Generating dice presets from user settings');
        
        try {
            const settings = this._getValidatedSettings();
            
            if (!settings) {
                console.warn('DiceCustomizationHelper: No valid dice appearance settings found, using defaults');
                settings = this._getDefaultSettings();
            }
            
            const getPreset = async (type, faces) => {
                if (!game.dice3d?.DiceFactory?.systems) {
                    console.warn('DiceCustomizationHelper: Dice So Nice DiceFactory not available');
                    return null;
                }
                
                const system = game.dice3d.DiceFactory.systems.get(type.system || 'standard');
                if (!system) {
                    console.warn(`DiceCustomizationHelper: Dice system ${type.system} not found`);
                    return null;
                }
                
                const diceSystem = system.dice.get(faces);
                if (!diceSystem) {
                    console.warn(`DiceCustomizationHelper: Dice faces ${faces} not found in system`);
                    return null;
                }
                
                if (!diceSystem.modelLoaded) {
                    await diceSystem.loadModel(game.dice3d.DiceFactory.loaderGLTF);
                }

                return {
                    modelFile: diceSystem.modelFile,
                    appearance: {
                        ...diceSystem.appearance,
                        ...type
                    }
                };
            };
            
            const presets = {
                hope: await getPreset(settings.hope, hopeFaces),
                fear: await getPreset(settings.fear, fearFaces),
                advantage: await getPreset(settings.advantage, advantageFaces),
                disadvantage: await getPreset(settings.disadvantage, disadvantageFaces)
            };
            
            console.debug('DiceCustomizationHelper: Successfully generated dice presets for all dice types');
            return presets;
            
        } catch (error) {
            console.error('DiceCustomizationHelper: Critical error generating dice presets:', error);
            console.warn('DiceCustomizationHelper: Falling back to default presets due to error');
            return this._getDefaultPresets(hopeFaces, fearFaces, advantageFaces, disadvantageFaces);
        }
    }
    
    /**
     * Create a colorset configuration for a specific dice type
     * @param {string} name - Display name for the dice type
     * @param {Object} config - Configuration object with color and appearance settings
     * @returns {Object} Dice So Nice colorset configuration
     */
    static createColorset(name, config) {
        console.debug(`DiceCustomizationHelper: Creating colorset for ${name} dice`);
        
        try {
            if (!name || typeof name !== 'string') {
                console.error('DiceCustomizationHelper: Invalid dice name provided to createColorset');
                throw new Error('Invalid dice name');
            }
            
            if (!config || typeof config !== 'object') {
                console.warn(`DiceCustomizationHelper: No valid config provided for ${name}, using defaults`);
                config = this._getDefaultConfigForType(name.toLowerCase());
            }
            
            // Validate and sanitize the configuration
            const validatedConfig = this._validateColorsetConfig(config, name);
            
            const colorset = {
                name: name, // Colorsets are no longer used with preset-based approach
                category: `${name} Die`,
                description: name,
                texture: validatedConfig.texture || 'ice',
                foreground: validatedConfig.foreground,
                background: validatedConfig.background,
                outline: validatedConfig.outline,
                edge: validatedConfig.edge,
                material: validatedConfig.material || 'glass',
                font: "Modesto Condensed",
                colorset: "custom",
                system: validatedConfig.system || 'standard'
            };
            
            console.debug(`DiceCustomizationHelper: Successfully created colorset for ${name} dice`);
            return colorset;
            
        } catch (error) {
            console.error(`DiceCustomizationHelper: Error creating colorset for ${name}:`, error);
            console.warn(`DiceCustomizationHelper: Using default configuration for ${name} dice`);
            
            // Return a safe default colorset
            const safeName = (name && typeof name === 'string') ? name.toLowerCase() : 'hope';
            const defaultConfig = this._getDefaultConfigForType(safeName);
            
            return {
                name: name,
                category: `${name} Die`,
                description: name,
                texture: defaultConfig.texture,
                foreground: defaultConfig.foreground,
                background: defaultConfig.background,
                outline: defaultConfig.outline,
                edge: defaultConfig.edge,
                material: defaultConfig.material,
                font: "Modesto Condensed",
                colorset: "custom",
                system: defaultConfig.system
            };
        }
    }
    
    /**
     * Apply dice customization to a roll object for Dice So Nice integration using presets
     * @param {Roll} roll - The roll object to customize
     * @param {Array<string>} diceTypes - Array of dice types corresponding to each die in the roll
     * @param {string} hopeFaces - Hope die faces (e.g., 'd12')
     * @param {string} fearFaces - Fear die faces (e.g., 'd12')
     * @param {string} advantageFaces - Advantage die faces (e.g., 'd6')
     * @param {string} disadvantageFaces - Disadvantage die faces (e.g., 'd6')
     * @returns {Promise<void>}
     */
    static async applyDiceCustomization(roll, diceTypes, hopeFaces = 'd12', fearFaces = 'd12', advantageFaces = 'd6', disadvantageFaces = 'd6') {
        console.debug('DiceCustomizationHelper: Applying dice customization to roll using presets');
        
        // Check if Dice So Nice module is available and active
        const diceSoNiceStatus = this._checkDiceSoNiceStatus();
        if (!diceSoNiceStatus.available) {
            console.debug(`DiceCustomizationHelper: ${diceSoNiceStatus.reason}, skipping customization`);
            return;
        }
        
        try {
            // Validate roll object
            if (!this._validateRollObject(roll)) {
                console.warn('DiceCustomizationHelper: Invalid roll object provided, skipping customization');
                return;
            }
            
            // Validate dice types array
            if (!this._validateDiceTypesArray(diceTypes, roll.dice.length)) {
                console.warn('DiceCustomizationHelper: Invalid dice types array, skipping customization');
                return;
            }
            
            // Generate presets for this roll
            const presets = await this.generateDicePresets(hopeFaces, fearFaces, advantageFaces, disadvantageFaces);
            
            if (!presets) {
                console.warn('DiceCustomizationHelper: Failed to generate presets, skipping customization');
                return;
            }
            
            // Apply presets to each die in the roll
            let appliedCount = 0;
            roll.dice.forEach((die, index) => {
                try {
                    const diceType = diceTypes[index];
                    if (diceType && this._isValidDiceType(diceType) && presets[diceType]) {
                        // Apply the preset to the die
                        die.options = presets[diceType];
                        appliedCount++;
                        
                        console.debug(`DiceCustomizationHelper: Applied ${diceType} preset to die ${index + 1}`);
                    } else if (diceType) {
                        console.warn(`DiceCustomizationHelper: Invalid dice type '${diceType}' or missing preset for die ${index + 1}`);
                    }
                } catch (dieError) {
                    console.error(`DiceCustomizationHelper: Error applying customization to die ${index + 1}:`, dieError);
                }
            });
            
            console.debug(`DiceCustomizationHelper: Successfully applied customization to ${appliedCount}/${roll.dice.length} dice`);
            
        } catch (error) {
            console.error('DiceCustomizationHelper: Critical error applying dice customization:', error);
            console.warn('DiceCustomizationHelper: Dice customization failed, rolls will use default appearance');
        }
    }
    
    /**
     * Check if Dice So Nice module is available and active
     * @returns {boolean} True if Dice So Nice is available
     * @private
     */
    static _isDiceSoNiceAvailable() {
        return !!(game.dice3d && game.modules.get('dice-so-nice')?.active);
    }
    
    /**
     * Check Dice So Nice module status with detailed information
     * @returns {Object} Status object with availability and reason
     * @private
     */
    static _checkDiceSoNiceStatus() {
        try {
            if (!game.modules.get('dice-so-nice')) {
                return {
                    available: false,
                    reason: 'Dice So Nice module is not installed'
                };
            }
            
            if (!game.modules.get('dice-so-nice').active) {
                return {
                    available: false,
                    reason: 'Dice So Nice module is installed but not active'
                };
            }
            
            if (!game.dice3d) {
                return {
                    available: false,
                    reason: 'Dice So Nice module is active but game.dice3d is not available'
                };
            }
            
            return {
                available: true,
                reason: 'Dice So Nice module is available and active'
            };
        } catch (error) {
            return {
                available: false,
                reason: `Error checking Dice So Nice status: ${error.message}`
            };
        }
    }
    
    /**
     * Validate a roll object for dice customization
     * @param {Roll} roll - Roll object to validate
     * @returns {boolean} True if roll is valid
     * @private
     */
    static _validateRollObject(roll) {
        if (!roll) {
            console.error('DiceCustomizationHelper: Roll object is null or undefined');
            return false;
        }
        
        if (!roll.dice) {
            console.error('DiceCustomizationHelper: Roll object missing dice property');
            return false;
        }
        
        if (!Array.isArray(roll.dice)) {
            console.error('DiceCustomizationHelper: Roll.dice is not an array');
            return false;
        }
        
        if (roll.dice.length === 0) {
            console.warn('DiceCustomizationHelper: Roll contains no dice');
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate dice types array
     * @param {Array} diceTypes - Array of dice types to validate
     * @param {number} expectedLength - Expected length to match roll dice
     * @returns {boolean} True if dice types array is valid
     * @private
     */
    static _validateDiceTypesArray(diceTypes, expectedLength) {
        if (!Array.isArray(diceTypes)) {
            console.error('DiceCustomizationHelper: diceTypes must be an array');
            return false;
        }
        
        if (diceTypes.length !== expectedLength) {
            console.error(`DiceCustomizationHelper: diceTypes array length (${diceTypes.length}) must match roll dice length (${expectedLength})`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if a dice type is valid
     * @param {string} diceType - Dice type to validate
     * @returns {boolean} True if dice type is valid
     * @private
     */
    static _isValidDiceType(diceType) {
        const validTypes = ['hope', 'fear', 'advantage', 'disadvantage'];
        return typeof diceType === 'string' && validTypes.includes(diceType.toLowerCase());
    }
    
    /**
     * Get validated settings with fallback to defaults
     * @returns {Object|null} Validated settings or null if unavailable
     * @private
     */
    static _getValidatedSettings() {
        try {
            const rawSettings = game.settings.get('daggerheart-unofficial', 'diceAppearance');
            
            if (!rawSettings) {
                console.debug('DiceCustomizationHelper: No dice appearance settings found in game settings');
                return null;
            }
            
            // Validate the structure of the settings
            const requiredDiceTypes = ['hope', 'fear', 'advantage', 'disadvantage'];
            const validatedSettings = {};
            
            for (const diceType of requiredDiceTypes) {
                if (!rawSettings[diceType] || typeof rawSettings[diceType] !== 'object') {
                    console.warn(`DiceCustomizationHelper: Missing or invalid settings for ${diceType} dice, using defaults`);
                    validatedSettings[diceType] = this._getDefaultConfigForType(diceType);
                } else {
                    validatedSettings[diceType] = this._validateAndSanitizeDiceConfig(rawSettings[diceType], diceType);
                }
            }
            
            return validatedSettings;
            
        } catch (error) {
            console.error('DiceCustomizationHelper: Error retrieving dice appearance settings:', error);
            return null;
        }
    }
    
    /**
     * Validate and sanitize a single dice configuration
     * @param {Object} config - Configuration to validate
     * @param {string} diceType - Type of dice for context
     * @returns {Object} Validated configuration
     * @private
     */
    static _validateAndSanitizeDiceConfig(config, diceType) {
        const defaultConfig = this._getDefaultConfigForType(diceType);
        const sanitized = {};
        
        // Validate color fields
        const colorFields = ['foreground', 'background', 'outline', 'edge'];
        colorFields.forEach(field => {
            if (this._isValidHexColor(config[field])) {
                sanitized[field] = config[field];
            } else {
                console.warn(`DiceCustomizationHelper: Invalid ${field} color for ${diceType} dice: ${config[field]}, using default`);
                sanitized[field] = defaultConfig[field];
            }
        });
        
        // Validate texture
        const validTextures = this._getValidTextures();
        if (validTextures.includes(config.texture)) {
            sanitized.texture = config.texture;
        } else {
            console.warn(`DiceCustomizationHelper: Invalid texture for ${diceType} dice: ${config.texture}, using default`);
            sanitized.texture = defaultConfig.texture;
        }
        
        // Validate material
        const validMaterials = this._getValidMaterials();
        if (validMaterials.includes(config.material)) {
            sanitized.material = config.material;
        } else {
            console.warn(`DiceCustomizationHelper: Invalid material for ${diceType} dice: ${config.material}, using default`);
            sanitized.material = defaultConfig.material;
        }
        
        // Validate system
        const validSystems = this._getValidSystems();
        if (validSystems.includes(config.system)) {
            sanitized.system = config.system;
        } else {
            console.warn(`DiceCustomizationHelper: Invalid system for ${diceType} dice: ${config.system}, using default`);
            sanitized.system = defaultConfig.system;
        }
        
        return sanitized;
    }
    
    /**
     * Validate colorset configuration and provide fallbacks for invalid values
     * @param {Object} config - Configuration to validate
     * @param {string} diceType - Type of dice for better error context
     * @returns {Object} Validated configuration
     * @private
     */
    static _validateColorsetConfig(config, diceType = 'unknown') {
        console.debug(`DiceCustomizationHelper: Validating colorset config for ${diceType} dice`);
        
        try {
            const validated = { ...config };
            let validationErrors = 0;
            
            // Validate color fields (must be valid hex colors)
            const colorFields = ['foreground', 'background', 'outline', 'edge'];
            colorFields.forEach(field => {
                if (!this._isValidHexColor(validated[field])) {
                    console.warn(`DiceCustomizationHelper: Invalid ${field} color for ${diceType} dice: ${validated[field]}`);
                    validated[field] = this._getDefaultColor(field);
                    validationErrors++;
                }
            });
            
            // Validate texture field
            const validTextures = this._getValidTextures();
            if (!validTextures.includes(validated.texture)) {
                console.warn(`DiceCustomizationHelper: Invalid texture for ${diceType} dice: ${validated.texture}`);
                validated.texture = 'ice';
                validationErrors++;
            }
            
            // Validate material field
            const validMaterials = this._getValidMaterials();
            if (!validMaterials.includes(validated.material)) {
                console.warn(`DiceCustomizationHelper: Invalid material for ${diceType} dice: ${validated.material}`);
                validated.material = 'glass';
                validationErrors++;
            }
            
            // Validate system field
            const validSystems = this._getValidSystems();
            if (!validSystems.includes(validated.system)) {
                console.warn(`DiceCustomizationHelper: Invalid system for ${diceType} dice: ${validated.system}`);
                validated.system = 'standard';
                validationErrors++;
            }
            
            if (validationErrors > 0) {
                console.warn(`DiceCustomizationHelper: Fixed ${validationErrors} validation errors for ${diceType} dice configuration`);
            } else {
                console.debug(`DiceCustomizationHelper: Configuration for ${diceType} dice passed validation`);
            }
            
            return validated;
            
        } catch (error) {
            console.error(`DiceCustomizationHelper: Critical error validating ${diceType} dice configuration:`, error);
            console.warn(`DiceCustomizationHelper: Using default configuration for ${diceType} dice due to validation error`);
            return this._getDefaultConfigForType(diceType);
        }
    }
    
    /**
     * Check if a string is a valid hex color
     * @param {string} color - Color string to validate
     * @returns {boolean} True if valid hex color
     * @private
     */
    static _isValidHexColor(color) {
        return typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color);
    }
    
    /**
     * Get default color for a specific field
     * @param {string} field - Color field name
     * @returns {string} Default hex color
     * @private
     */
    static _getDefaultColor(field) {
        const defaults = {
            foreground: '#ffffff',
            background: '#000000',
            outline: '#000000',
            edge: '#333333'
        };
        return defaults[field] || '#ffffff';
    }
    
    /**
     * Get default colorsets for all dice types
     * @returns {Object} Default colorsets
     * @private
     */
    static _getDefaultColorsets() {
        return {
            hope: this.createColorset('Hope', this._getDefaultConfigForType('hope')),
            fear: this.createColorset('Fear', this._getDefaultConfigForType('fear')),
            advantage: this.createColorset('Advantage', this._getDefaultConfigForType('advantage')),
            disadvantage: this.createColorset('Disadvantage', this._getDefaultConfigForType('disadvantage'))
        };
    }
    
    /**
     * Get default configuration for a specific dice type
     * @param {string} type - Dice type (hope, fear, advantage, disadvantage)
     * @returns {Object} Default configuration
     * @private
     */
    static _getDefaultConfigForType(type) {
        const defaults = {
            hope: {
                foreground: '#ffffff',
                background: '#ffa200',
                outline: '#000000',
                edge: '#ff8000',
                texture: 'ice',
                material: 'glass',
                system: 'standard'
            },
            fear: {
                foreground: '#b5d5ff',
                background: '#021280',
                outline: '#000000',
                edge: '#210e6b',
                texture: 'ice',
                material: 'metal',
                system: 'standard'
            },
            advantage: {
                foreground: '#ffffff',
                background: '#008000',
                outline: '#000000',
                edge: '#004000',
                texture: 'none',
                material: 'plastic',
                system: 'standard'
            },
            disadvantage: {
                foreground: '#ffffff',
                background: '#b30000',
                outline: '#000000',
                edge: '#800000',
                texture: 'none',
                material: 'plastic',
                system: 'standard'
            }
        };
        
        return defaults[type] || defaults.hope;
    }
    
    /**
     * Get the flavor name used by Dice So Nice for a dice type
     * @param {string} diceType - The dice type (hope, fear, advantage, disadvantage)
     * @returns {string} The flavor name for Dice So Nice
     * @private
     */
    static _getDiceFlavorName(diceType) {
        const flavorMap = {
            hope: 'Hope',
            fear: 'Fear',
            advantage: 'Advantage',
            disadvantage: 'Disadvantage'
        };
        return flavorMap[diceType.toLowerCase()] || diceType;
    }
    
    /**
     * Get default settings for dice appearance
     * @returns {Object} Default settings object
     * @private
     */
    static _getDefaultSettings() {
        return {
            hope: this._getDefaultConfigForType('hope'),
            fear: this._getDefaultConfigForType('fear'),
            advantage: this._getDefaultConfigForType('advantage'),
            disadvantage: this._getDefaultConfigForType('disadvantage')
        };
    }
    
    /**
     * Get default presets for dice when settings are unavailable
     * @param {string} hopeFaces - Hope die faces
     * @param {string} fearFaces - Fear die faces  
     * @param {string} advantageFaces - Advantage die faces
     * @param {string} disadvantageFaces - Disadvantage die faces
     * @returns {Promise<Object>} Default presets object
     * @private
     */
    static async _getDefaultPresets(hopeFaces, fearFaces, advantageFaces, disadvantageFaces) {
        console.debug('DiceCustomizationHelper: Generating default presets');
        
        const defaultSettings = this._getDefaultSettings();
        
        try {
            return {
                hope: await this._generateSinglePreset(defaultSettings.hope, hopeFaces),
                fear: await this._generateSinglePreset(defaultSettings.fear, fearFaces),
                advantage: await this._generateSinglePreset(defaultSettings.advantage, advantageFaces),
                disadvantage: await this._generateSinglePreset(defaultSettings.disadvantage, disadvantageFaces)
            };
        } catch (error) {
            console.error('DiceCustomizationHelper: Error generating default presets:', error);
            return null;
        }
    }
    
    /**
     * Generate a single preset for a dice type
     * @param {Object} type - Dice type configuration
     * @param {string} faces - Die faces
     * @returns {Promise<Object|null>} Preset object or null if failed
     * @private
     */
    static async _generateSinglePreset(type, faces) {
        try {
            if (!game.dice3d?.DiceFactory?.systems) {
                return null;
            }
            
            const system = game.dice3d.DiceFactory.systems.get(type.system || 'standard');
            if (!system) {
                return null;
            }
            
            const diceSystem = system.dice.get(faces);
            if (!diceSystem) {
                return null;
            }
            
            if (!diceSystem.modelLoaded) {
                await diceSystem.loadModel(game.dice3d.DiceFactory.loaderGLTF);
            }

            return {
                modelFile: diceSystem.modelFile,
                appearance: {
                    ...diceSystem.appearance,
                    ...type
                }
            };
        } catch (error) {
            console.error('DiceCustomizationHelper: Error generating single preset:', error);
            return null;
        }
    }
    
    /**
     * Get valid texture options from Dice So Nice
     * @returns {Array<string>} Array of valid texture keys
     * @private
     */
    static _getValidTextures() {
        if (!game.dice3d?.exports?.TEXTURELIST) {
            return ['none', 'ice'];
        }
        
        try {
            const textures = Object.keys(game.dice3d.exports.TEXTURELIST);
            return ['none', ...textures];
        } catch (error) {
            console.warn('DiceCustomizationHelper: Error getting valid textures:', error);
            return ['none', 'ice'];
        }
    }
    
    /**
     * Get valid material options from Dice So Nice
     * @returns {Array<string>} Array of valid material keys
     * @private
     */
    static _getValidMaterials() {
        if (!game.dice3d?.DiceFactory?.material_options) {
            return ['plastic', 'metal', 'glass'];
        }
        
        try {
            return Object.keys(game.dice3d.DiceFactory.material_options);
        } catch (error) {
            console.warn('DiceCustomizationHelper: Error getting valid materials:', error);
            return ['plastic', 'metal', 'glass'];
        }
    }
    
    /**
     * Get valid system options from Dice So Nice
     * @returns {Array<string>} Array of valid system keys
     * @private
     */
    static _getValidSystems() {
        if (!game.dice3d?.DiceFactory?.systems) {
            return ['standard'];
        }
        
        try {
            return Array.from(game.dice3d.DiceFactory.systems.keys());
        } catch (error) {
            console.warn('DiceCustomizationHelper: Error getting valid systems:', error);
            return ['standard'];
        }
    }
    
    /**
     * Validate the entire dice customization system
     * This method can be called to check system health
     * @returns {Object} Validation results
     */
    static validateSystem() {
        console.debug('DiceCustomizationHelper: Running system validation');
        
        const results = {
            diceSoNice: this._checkDiceSoNiceStatus(),
            settings: null,
            colorsets: null,
            overall: false
        };
        
        try {
            // Check settings
            const settings = this._getValidatedSettings();
            results.settings = {
                available: !!settings,
                valid: !!settings,
                message: settings ? 'Settings are valid' : 'Settings are missing or invalid'
            };
            
            // Check if we can generate colorsets
            if (settings) {
                try {
                    const testColorsets = {
                        hope: this.createColorset('Hope', settings.hope),
                        fear: this.createColorset('Fear', settings.fear),
                        advantage: this.createColorset('Advantage', settings.advantage),
                        disadvantage: this.createColorset('Disadvantage', settings.disadvantage)
                    };
                    
                    results.colorsets = {
                        available: true,
                        valid: Object.keys(testColorsets).length === 4,
                        message: 'Colorsets can be generated successfully'
                    };
                } catch (colorsetError) {
                    results.colorsets = {
                        available: false,
                        valid: false,
                        message: `Error generating colorsets: ${colorsetError.message}`
                    };
                }
            } else {
                results.colorsets = {
                    available: false,
                    valid: false,
                    message: 'Cannot generate colorsets without valid settings'
                };
            }
            
            // Overall system health
            results.overall = results.diceSoNice.available && results.settings.valid && results.colorsets.valid;
            
            console.log('DiceCustomizationHelper: System validation completed', results);
            return results;
            
        } catch (error) {
            console.error('DiceCustomizationHelper: Error during system validation:', error);
            results.overall = false;
            return results;
        }
    }
}