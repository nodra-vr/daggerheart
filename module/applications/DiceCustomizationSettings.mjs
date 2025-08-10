export class DiceCustomizationSettings extends FormApplication {
    constructor(options = {}) {
        super(options);
        this.unsavedChanges = false;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "daggerheart-dice-customization",
            template: "systems/daggerheart-unofficial/templates/settings/dice-customization.hbs",
            title: "DAGGERHEART.SETTINGS.DiceCustomization.title",
            width: 600,
            height: 500,
            resizable: true,
            submitOnClose: false,
            submitOnChange: false,
            closeOnSubmit: false,
            tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "hope"}]
        });
    }

    /**
     * Prepare context data for rendering the application
     */
    async getData(options) {
        console.debug('DiceCustomizationSettings: Preparing context for rendering');
        
        try {
            const context = await super.getData(options);
            
            // Check if Dice So Nice module is available and active
            context.hasDiceSoNice = this._checkDiceSoNiceAvailability();
            
            // Get current dice appearance settings with validation
            context.settings = this._getValidatedSettings();
            
            if (context.hasDiceSoNice) {
                try {
                    context.availableTextures = this._getAvailableTextures();
                    context.availableMaterials = this._getAvailableMaterials();
                    context.availableSystems = this._getAvailableSystems();
                } catch (optionsError) {
                    console.warn('DiceCustomizationSettings: Error loading available options:', optionsError);
                    // Provide fallback options
                    context.availableTextures = [{ value: 'ice', label: 'Ice' }];
                    context.availableMaterials = [{ value: 'glass', label: 'Glass' }];
                    context.availableSystems = [{ value: 'standard', label: 'Standard' }];
                }
            }
            
            // Define tabs for the interface
            context.tabs = [
                { 
                    id: 'hope', 
                    label: 'DAGGERHEART.DICE.Hope', 
                    icon: 'fas fa-sun',
                    description: 'DAGGERHEART.SETTINGS.DiceCustomization.hopeDescription'
                },
                { 
                    id: 'fear', 
                    label: 'DAGGERHEART.DICE.Fear', 
                    icon: 'fas fa-moon',
                    description: 'DAGGERHEART.SETTINGS.DiceCustomization.fearDescription'
                },
                { 
                    id: 'advantage', 
                    label: 'DAGGERHEART.DICE.Advantage', 
                    icon: 'fas fa-plus',
                    description: 'DAGGERHEART.SETTINGS.DiceCustomization.advantageDescription'
                },
                { 
                    id: 'disadvantage', 
                    label: 'DAGGERHEART.DICE.Disadvantage', 
                    icon: 'fas fa-minus',
                    description: 'DAGGERHEART.SETTINGS.DiceCustomization.disadvantageDescription'
                }
            ];
            
            console.debug('DiceCustomizationSettings: Context preparation successful');
            return context;
            
        } catch (error) {
            console.error('DiceCustomizationSettings: Error preparing context:', error);
            
            // Return minimal safe context
            return {
                hasDiceSoNice: false,
                settings: this._getDefaultSettings(),
                tabs: [],
                error: true,
                errorMessage: 'Failed to load dice customization settings'
            };
        }
    }
    
    /**
     * Check Dice So Nice availability with detailed logging
     * @returns {boolean} True if Dice So Nice is available
     * @private
     */
    _checkDiceSoNiceAvailability() {
        const module = game.modules.get('dice-so-nice');
        
        if (!module) {
            console.debug('DiceCustomizationSettings: Dice So Nice module not found');
            return false;
        }
        
        if (!module.active) {
            console.debug('DiceCustomizationSettings: Dice So Nice module found but not active');
            return false;
        }
        
        if (!game.dice3d) {
            console.warn('DiceCustomizationSettings: Dice So Nice module active but game.dice3d not available');
            return false;
        }
        
        console.debug('DiceCustomizationSettings: Dice So Nice module is available and active');
        return true;
    }
    
    /**
     * Get validated settings with error handling
     * @returns {Object} Validated settings object
     * @private
     */
    _getValidatedSettings() {
        try {
            const rawSettings = game.settings.get('daggerheart-unofficial', 'diceAppearance');
            
            if (!rawSettings) {
                console.debug('DiceCustomizationSettings: No settings found, using defaults');
                return this._getDefaultSettings();
            }
            
            // Validate the settings structure
            const requiredDiceTypes = ['hope', 'fear', 'advantage', 'disadvantage'];
            const validatedSettings = {};
            
            for (const diceType of requiredDiceTypes) {
                if (!rawSettings[diceType] || typeof rawSettings[diceType] !== 'object') {
                    console.warn(`DiceCustomizationSettings: Invalid ${diceType} settings, using defaults`);
                    validatedSettings[diceType] = this._getDefaultSettings()[diceType];
                } else {
                    validatedSettings[diceType] = this._validateDiceTypeSettings(rawSettings[diceType], diceType);
                }
            }
            
            return validatedSettings;
            
        } catch (error) {
            console.error('DiceCustomizationSettings: Error getting validated settings:', error);
            return this._getDefaultSettings();
        }
    }
    
    /**
     * Validate settings for a single dice type
     * @param {Object} settings - Settings to validate
     * @param {string} diceType - Type of dice
     * @returns {Object} Validated settings
     * @private
     */
    _validateDiceTypeSettings(settings, diceType) {
        const defaults = this._getDefaultSettings()[diceType];
        const validated = {};
        
        // Validate color fields
        const colorFields = ['foreground', 'background', 'outline', 'edge'];
        for (const field of colorFields) {
            const color = settings[field];
            if (this._validateColor(color)) {
                validated[field] = color;
            } else {
                console.warn(`DiceCustomizationSettings: Invalid ${field} color for ${diceType}: ${color}`);
                validated[field] = defaults[field];
            }
        }
        
        // Validate other fields with fallbacks
        validated.texture = settings.texture || defaults.texture;
        validated.material = settings.material || defaults.material;
        validated.system = settings.system || defaults.system;
        
        return validated;
    }





    /**
     * Handle form submission
     */
    async _updateObject(event, formData) {
        console.debug('DiceCustomizationSettings: Processing form submission');
        
        try {
            if (!formData) {
                throw new Error('Invalid form data received');
            }
            
            // Validate the form data
            const validatedData = this._validateFormData(formData);
            
            if (!validatedData) {
                throw new Error('Form data validation failed');
            }
            
            console.debug('DiceCustomizationSettings: Form data validated successfully');
            
            // Save the settings
            await game.settings.set('daggerheart-unofficial', 'diceAppearance', validatedData);
            console.log('DiceCustomizationSettings: Settings saved successfully');
            
            // Clear unsaved changes flag
            this.unsavedChanges = false;
            
            // Show success notification
            ui.notifications.info(game.i18n.localize("DAGGERHEART.SETTINGS.DiceCustomization.saveSuccess"));
            
            // Settings are client-scoped and preset-based - no re-registration needed
            console.debug('DiceCustomizationSettings: Client-scoped settings saved successfully');
            
        } catch (error) {
            console.error("DiceCustomizationSettings: Error saving dice customization settings:", error);
            
            let errorMessage = "DAGGERHEART.SETTINGS.DiceCustomization.saveError";
            
            // Provide more specific error messages based on error type
            if (error.message.includes('validation')) {
                errorMessage = "DAGGERHEART.SETTINGS.DiceCustomization.validationError";
            } else if (error.message.includes('permission')) {
                errorMessage = "DAGGERHEART.SETTINGS.DiceCustomization.permissionError";
            }
            
            ui.notifications.error(game.i18n.localize(errorMessage));
        }
    }

    /**
     * Handle reset action
     */
    async _onReset(event) {
        if (!event) return;
        event.preventDefault();
        console.debug('DiceCustomizationSettings: Reset action triggered');
        
        try {
            const confirmed = await Dialog.confirm({
                title: game.i18n.localize("DAGGERHEART.SETTINGS.DiceCustomization.resetTitle"),
                content: game.i18n.localize("DAGGERHEART.SETTINGS.DiceCustomization.resetConfirm"),
                yes: () => true,
                no: () => false
            });
            
            if (!confirmed) {
                console.debug('DiceCustomizationSettings: Reset cancelled by user');
                return;
            }
            
            // Reset to default settings
            const defaultSettings = this._getDefaultSettings();
            
            if (!defaultSettings) {
                throw new Error('Unable to get default settings');
            }
            
            await game.settings.set('daggerheart-unofficial', 'diceAppearance', defaultSettings);
            console.log('DiceCustomizationSettings: Settings reset to defaults');
            
            // Clear unsaved changes flag
            this.unsavedChanges = false;
            
            // Re-render the application
            await this.render();
            console.debug('DiceCustomizationSettings: Application re-rendered after reset');
            
            // Show success notification
            ui.notifications.info(game.i18n.localize("DAGGERHEART.SETTINGS.DiceCustomization.resetSuccess"));
            
            // Settings are client-scoped and preset-based - no re-registration needed
            console.debug('DiceCustomizationSettings: Client-scoped settings reset successfully');
            
        } catch (error) {
            console.error("DiceCustomizationSettings: Error resetting dice customization settings:", error);
            
            let errorMessage = "DAGGERHEART.SETTINGS.DiceCustomization.resetError";
            
            if (error.message.includes('permission')) {
                errorMessage = "DAGGERHEART.SETTINGS.DiceCustomization.permissionError";
            }
            
            ui.notifications.error(game.i18n.localize(errorMessage));
        }
    }



    /**
     * Validate form data and ensure all required fields are present
     */
    _validateFormData(formData) {
        console.debug('DiceCustomizationSettings: Validating form data');
        
        try {
            if (!formData || typeof formData !== 'object') {
                console.error('DiceCustomizationSettings: Invalid form data object');
                return null;
            }
            
            const validated = {};
            const diceTypes = ['hope', 'fear', 'advantage', 'disadvantage'];
            let validationErrors = 0;
            
            for (const diceType of diceTypes) {
                try {
                    const diceData = {
                        foreground: this._validateColor(formData[`${diceType}.foreground`]) || '#ffffff',
                        background: this._validateColor(formData[`${diceType}.background`]) || this._getDefaultColor(diceType, 'background'),
                        outline: this._validateColor(formData[`${diceType}.outline`]) || '#000000',
                        edge: this._validateColor(formData[`${diceType}.edge`]) || this._getDefaultColor(diceType, 'edge'),
                        texture: formData[`${diceType}.texture`] || 'ice',
                        material: formData[`${diceType}.material`] || 'glass',
                        system: formData[`${diceType}.system`] || 'standard'
                    };
                    
                    // Additional validation for each field
                    if (!this._validateColor(diceData.foreground)) {
                        console.warn(`DiceCustomizationSettings: Invalid foreground color for ${diceType}`);
                        diceData.foreground = '#ffffff';
                        validationErrors++;
                    }
                    
                    if (!this._validateColor(diceData.background)) {
                        console.warn(`DiceCustomizationSettings: Invalid background color for ${diceType}`);
                        diceData.background = this._getDefaultColor(diceType, 'background');
                        validationErrors++;
                    }
                    
                    if (!this._validateColor(diceData.outline)) {
                        console.warn(`DiceCustomizationSettings: Invalid outline color for ${diceType}`);
                        diceData.outline = '#000000';
                        validationErrors++;
                    }
                    
                    if (!this._validateColor(diceData.edge)) {
                        console.warn(`DiceCustomizationSettings: Invalid edge color for ${diceType}`);
                        diceData.edge = this._getDefaultColor(diceType, 'edge');
                        validationErrors++;
                    }
                    
                    validated[diceType] = diceData;
                    
                } catch (diceError) {
                    console.error(`DiceCustomizationSettings: Error validating ${diceType} data:`, diceError);
                    validated[diceType] = this._getDefaultSettings()[diceType];
                    validationErrors++;
                }
            }
            
            if (validationErrors > 0) {
                console.warn(`DiceCustomizationSettings: Form validation completed with ${validationErrors} errors corrected`);
            } else {
                console.debug('DiceCustomizationSettings: Form validation successful');
            }
            
            return validated;
            
        } catch (error) {
            console.error('DiceCustomizationSettings: Critical error during form validation:', error);
            return null;
        }
    }

    /**
     * Validate color value format
     */
    _validateColor(color) {
        if (!color || typeof color !== 'string') return null;
        return /^#[0-9A-F]{6}$/i.test(color) ? color : null;
    }

    /**
     * Get default color for a dice type and color property
     */
    _getDefaultColor(diceType, colorProperty) {
        const defaults = this._getDefaultSettings();
        return defaults[diceType]?.[colorProperty] || '#ffffff';
    }

    /**
     * Get default settings for all dice types
     */
    _getDefaultSettings() {
        return {
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
    }

    /**
     * Get available texture options from Dice So Nice
     */
    _getAvailableTextures() {
        if (!game.dice3d) {
            return [
                { value: 'none', label: 'DAGGERHEART.SETTINGS.DiceCustomization.textureNone' },
                { value: 'ice', label: 'DAGGERHEART.SETTINGS.DiceCustomization.textureIce' }
            ];
        }
        
        try {
            // Get textures from Dice So Nice exports
            const textures = game.dice3d.exports?.TEXTURELIST || {};
            const options = [{ value: 'none', label: 'DAGGERHEART.SETTINGS.DiceCustomization.textureNone' }];
            
            for (const [key, texture] of Object.entries(textures)) {
                options.push({
                    value: key,
                    label: texture.name || `DAGGERHEART.SETTINGS.DiceCustomization.texture${key.charAt(0).toUpperCase() + key.slice(1)}`
                });
            }
            
            return options;
        } catch (error) {
            console.warn('DiceCustomizationSettings: Error getting textures from Dice So Nice:', error);
            return [
                { value: 'none', label: 'DAGGERHEART.SETTINGS.DiceCustomization.textureNone' },
                { value: 'ice', label: 'DAGGERHEART.SETTINGS.DiceCustomization.textureIce' }
            ];
        }
    }

    /**
     * Get available material options from Dice So Nice
     */
    _getAvailableMaterials() {
        if (!game.dice3d) {
            return [
                { value: 'plastic', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialPlastic' },
                { value: 'metal', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialMetal' },
                { value: 'glass', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialGlass' }
            ];
        }
        
        try {
            // Get materials from Dice So Nice DiceFactory
            const materialOptions = game.dice3d.DiceFactory?.material_options || {};
            const options = [];
            
            for (const key of Object.keys(materialOptions)) {
                options.push({
                    value: key,
                    label: `DICESONICE.Material${key.charAt(0).toUpperCase() + key.slice(1)}`
                });
            }
            
            // Fallback to default materials if none found
            if (options.length === 0) {
                return [
                    { value: 'plastic', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialPlastic' },
                    { value: 'metal', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialMetal' },
                    { value: 'glass', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialGlass' }
                ];
            }
            
            return options;
        } catch (error) {
            console.warn('DiceCustomizationSettings: Error getting materials from Dice So Nice:', error);
            return [
                { value: 'plastic', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialPlastic' },
                { value: 'metal', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialMetal' },
                { value: 'glass', label: 'DAGGERHEART.SETTINGS.DiceCustomization.materialGlass' }
            ];
        }
    }

    /**
     * Get available system options
     */
    _getAvailableSystems() {
        if (!game.dice3d) {
            return [
                { value: 'standard', label: 'DAGGERHEART.SETTINGS.DiceCustomization.systemStandard' }
            ];
        }
        
        try {
            // Get systems from Dice So Nice DiceFactory
            const systems = game.dice3d.DiceFactory?.systems || new Map();
            const options = [];
            
            for (const [key, system] of systems.entries()) {
                options.push({
                    value: key,
                    label: system.name || `DAGGERHEART.SETTINGS.DiceCustomization.system${key.charAt(0).toUpperCase() + key.slice(1)}`
                });
            }
            
            // Fallback to standard if none found
            if (options.length === 0) {
                return [
                    { value: 'standard', label: 'DAGGERHEART.SETTINGS.DiceCustomization.systemStandard' }
                ];
            }
            
            return options;
        } catch (error) {
            console.warn('DiceCustomizationSettings: Error getting systems from Dice So Nice:', error);
            return [
                { value: 'standard', label: 'DAGGERHEART.SETTINGS.DiceCustomization.systemStandard' }
            ];
        }
    }



    /**
     * Handle input changes to track unsaved changes
     */
    _onChangeInput(event) {
        this.unsavedChanges = true;
    }

    /**
     * Handle close button action
     */
    async _onClose(event) {
        if (!event) return;
        event.preventDefault();
        await this.close();
    }

    /**
     * Handle save button action
     */
    async _onSave(event) {
        if (!event) return;
        event.preventDefault();
        
        const form = this.element.find('form')[0];
        if (!form) {
            console.error('DiceCustomizationSettings: Form element not found');
            return;
        }
        
        const formData = new FormDataExtended(form).object;
        await this._updateObject(event, formData);
    }

    /**
     * Override close method to warn about unsaved changes
     */
    async close(options = {}) {
        if (this.unsavedChanges && !options.force) {
            const confirmed = await Dialog.confirm({
                title: game.i18n.localize("DAGGERHEART.SETTINGS.DiceCustomization.unsavedTitle"),
                content: game.i18n.localize("DAGGERHEART.SETTINGS.DiceCustomization.unsavedContent"),
                yes: () => true,
                no: () => false
            });
            
            if (!confirmed) return;
        }
        
        return super.close(options);
    }

    /**
     * Activate event listeners after rendering
     */
    activateListeners(html) {
        super.activateListeners(html);
        
        // Add change listeners to form inputs to track unsaved changes
        html.find('input, select').on('change', this._onChangeInput.bind(this));
        
        // Handle reset button
        html.find('[data-action="reset"]').click(this._onReset.bind(this));
        
        // Handle close button
        html.find('[data-action="close"]').click(this._onClose.bind(this));
        
        // Handle save button (form submission)
        html.find('button[type="submit"]').click(this._onSave.bind(this));
    }
}