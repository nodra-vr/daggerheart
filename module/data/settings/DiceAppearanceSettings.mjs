/**
 * Schema definition for dice appearance customization settings
 * Defines the structure and validation for Hope, Fear, Advantage, and Disadvantage dice customization
 */

/**
 * Available texture options for dice
 */
const TEXTURE_CHOICES = {
	none: 'DAGGERHEART.SETTINGS.DiceCustomization.textures.none',
	ice: 'DAGGERHEART.SETTINGS.DiceCustomization.textures.ice',
	fire: 'DAGGERHEART.SETTINGS.DiceCustomization.textures.fire',
	water: 'DAGGERHEART.SETTINGS.DiceCustomization.textures.water',
	earth: 'DAGGERHEART.SETTINGS.DiceCustomization.textures.earth',
	air: 'DAGGERHEART.SETTINGS.DiceCustomization.textures.air',
};

/**
 * Available material options for dice
 */
const MATERIAL_CHOICES = {
	plastic: 'DAGGERHEART.SETTINGS.DiceCustomization.materials.plastic',
	metal: 'DAGGERHEART.SETTINGS.DiceCustomization.materials.metal',
	glass: 'DAGGERHEART.SETTINGS.DiceCustomization.materials.glass',
	wood: 'DAGGERHEART.SETTINGS.DiceCustomization.materials.wood',
	stone: 'DAGGERHEART.SETTINGS.DiceCustomization.materials.stone',
};

/**
 * Available system options for dice
 */
const SYSTEM_CHOICES = {
	standard: 'DAGGERHEART.SETTINGS.DiceCustomization.systems.standard',
};

/**
 * Creates a schema field for a single dice type configuration
 * @param {Object} defaults - Default color and appearance values
 * @returns {foundry.data.fields.SchemaField} Schema field for dice configuration
 */
function createDiceTypeSchema(defaults) {
	return new foundry.data.fields.SchemaField({
		foreground: new foundry.data.fields.ColorField({
			required: true,
			initial: defaults.foreground,
			label: 'DAGGERHEART.SETTINGS.DiceCustomization.foreground',
			hint: 'DAGGERHEART.SETTINGS.DiceCustomization.foregroundHint',
		}),
		background: new foundry.data.fields.ColorField({
			required: true,
			initial: defaults.background,
			label: 'DAGGERHEART.SETTINGS.DiceCustomization.background',
			hint: 'DAGGERHEART.SETTINGS.DiceCustomization.backgroundHint',
		}),
		outline: new foundry.data.fields.ColorField({
			required: true,
			initial: defaults.outline,
			label: 'DAGGERHEART.SETTINGS.DiceCustomization.outline',
			hint: 'DAGGERHEART.SETTINGS.DiceCustomization.outlineHint',
		}),
		edge: new foundry.data.fields.ColorField({
			required: true,
			initial: defaults.edge,
			label: 'DAGGERHEART.SETTINGS.DiceCustomization.edge',
			hint: 'DAGGERHEART.SETTINGS.DiceCustomization.edgeHint',
		}),
		texture: new foundry.data.fields.StringField({
			required: true,
			initial: defaults.texture,
			choices: TEXTURE_CHOICES,
			label: 'DAGGERHEART.SETTINGS.DiceCustomization.texture',
			hint: 'DAGGERHEART.SETTINGS.DiceCustomization.textureHint',
		}),
		material: new foundry.data.fields.StringField({
			required: true,
			initial: defaults.material,
			choices: MATERIAL_CHOICES,
			label: 'DAGGERHEART.SETTINGS.DiceCustomization.material',
			hint: 'DAGGERHEART.SETTINGS.DiceCustomization.materialHint',
		}),
		system: new foundry.data.fields.StringField({
			required: true,
			initial: defaults.system,
			choices: SYSTEM_CHOICES,
			label: 'DAGGERHEART.SETTINGS.DiceCustomization.system',
			hint: 'DAGGERHEART.SETTINGS.DiceCustomization.systemHint',
		}),
	});
}

/**
 * Main schema field for all dice appearance settings
 * Includes Hope, Fear, Advantage, and Disadvantage dice configurations
 */
export const DiceAppearanceSettings = new foundry.data.fields.SchemaField({
	hope: createDiceTypeSchema({
		foreground: '#ffffff',
		background: '#ffa200',
		outline: '#000000',
		edge: '#ff8000',
		texture: 'ice',
		material: 'glass',
		system: 'standard',
	}),
	fear: createDiceTypeSchema({
		foreground: '#b5d5ff',
		background: '#021280',
		outline: '#000000',
		edge: '#210e6b',
		texture: 'ice',
		material: 'metal',
		system: 'standard',
	}),
	advantage: createDiceTypeSchema({
		foreground: '#ffffff',
		background: '#008000',
		outline: '#000000',
		edge: '#004000',
		texture: 'none',
		material: 'plastic',
		system: 'standard',
	}),
	disadvantage: createDiceTypeSchema({
		foreground: '#ffffff',
		background: '#b30000',
		outline: '#000000',
		edge: '#800000',
		texture: 'none',
		material: 'plastic',
		system: 'standard',
	}),
});

/**
 * Gets the default values for all dice appearance settings
 * @returns {Object} Default settings object
 */
export function getDefaultDiceAppearanceSettings() {
	return DiceAppearanceSettings.getInitialValue();
}

/**
 * Validates dice appearance settings data
 * @param {Object} settings - Settings data to validate
 * @returns {Object} Validated and normalized settings data
 */
export function validateDiceAppearanceSettings(settings) {
	console.debug('DiceAppearanceSettings: Validating dice appearance settings');

	try {
		if (!settings || typeof settings !== 'object') {
			console.warn('DiceAppearanceSettings: Settings is not a valid object, using defaults');
			return getDefaultDiceAppearanceSettings();
		}

		// Use the schema to validate and clean the data
		const validatedSettings = DiceAppearanceSettings.clean(settings);
		console.debug('DiceAppearanceSettings: Settings validation successful');
		return validatedSettings;
	} catch (error) {
		console.error('DiceAppearanceSettings: Validation error:', error);
		console.warn('DiceAppearanceSettings: Using default settings due to validation failure');
		return getDefaultDiceAppearanceSettings();
	}
}

/**
 * Validates settings with detailed error reporting
 * @param {Object} settings - Settings data to validate
 * @returns {Object} Validation result with details
 */
export function validateDiceAppearanceSettingsDetailed(settings) {
	console.debug('DiceAppearanceSettings: Running detailed validation');

	const result = {
		isValid: false,
		validatedSettings: null,
		errors: [],
		warnings: [],
	};

	try {
		if (!settings || typeof settings !== 'object') {
			result.errors.push('Settings is not a valid object');
			result.validatedSettings = getDefaultDiceAppearanceSettings();
			return result;
		}

		const diceTypes = ['hope', 'fear', 'advantage', 'disadvantage'];
		const validatedSettings = {};

		for (const diceType of diceTypes) {
			try {
				if (!settings[diceType] || typeof settings[diceType] !== 'object') {
					result.warnings.push(`Missing or invalid ${diceType} dice settings, using defaults`);
					validatedSettings[diceType] = getDefaultDiceAppearanceSettings()[diceType];
					continue;
				}

				// Validate individual dice type settings
				const diceValidation = validateDiceTypeSettings(settings[diceType], diceType);
				validatedSettings[diceType] = diceValidation.settings;

				if (diceValidation.errors.length > 0) {
					result.errors.push(...diceValidation.errors.map(err => `${diceType}: ${err}`));
				}

				if (diceValidation.warnings.length > 0) {
					result.warnings.push(...diceValidation.warnings.map(warn => `${diceType}: ${warn}`));
				}
			} catch (diceError) {
				result.errors.push(`Error validating ${diceType} settings: ${diceError.message}`);
				validatedSettings[diceType] = getDefaultDiceAppearanceSettings()[diceType];
			}
		}

		result.validatedSettings = validatedSettings;
		result.isValid = result.errors.length === 0 && result.warnings.length === 0;

		if (result.errors.length > 0) {
			console.warn('DiceAppearanceSettings: Validation completed with errors:', result.errors);
		}

		if (result.warnings.length > 0) {
			console.warn('DiceAppearanceSettings: Validation completed with warnings:', result.warnings);
		}

		if (result.isValid) {
			console.debug('DiceAppearanceSettings: Detailed validation successful');
		}

		return result;
	} catch (error) {
		console.error('DiceAppearanceSettings: Critical error during detailed validation:', error);
		result.errors.push(`Critical validation error: ${error.message}`);
		result.validatedSettings = getDefaultDiceAppearanceSettings();
		return result;
	}
}

/**
 * Validates settings for a single dice type
 * @param {Object} diceSettings - Settings for a single dice type
 * @param {string} diceType - Type of dice being validated
 * @returns {Object} Validation result for the dice type
 */
function validateDiceTypeSettings(diceSettings, diceType) {
	const result = {
		settings: {},
		errors: [],
		warnings: [],
	};

	const defaults = getDefaultDiceAppearanceSettings()[diceType];

	// Validate color fields
	const colorFields = ['foreground', 'background', 'outline', 'edge'];
	for (const field of colorFields) {
		const color = diceSettings[field];
		const validatedColor = validateColorValue(color, defaults[field]);

		if (validatedColor !== color) {
			result.warnings.push(`Invalid ${field} color '${color}', using default '${validatedColor}'`);
		}

		result.settings[field] = validatedColor;
	}

	// Validate texture
	const validTextures = Object.keys(TEXTURE_CHOICES);
	if (!validTextures.includes(diceSettings.texture)) {
		result.warnings.push(`Invalid texture '${diceSettings.texture}', using default '${defaults.texture}'`);
		result.settings.texture = defaults.texture;
	} else {
		result.settings.texture = diceSettings.texture;
	}

	// Validate material
	const validMaterials = Object.keys(MATERIAL_CHOICES);
	if (!validMaterials.includes(diceSettings.material)) {
		result.warnings.push(`Invalid material '${diceSettings.material}', using default '${defaults.material}'`);
		result.settings.material = defaults.material;
	} else {
		result.settings.material = diceSettings.material;
	}

	// Validate system
	const validSystems = Object.keys(SYSTEM_CHOICES);
	if (!validSystems.includes(diceSettings.system)) {
		result.warnings.push(`Invalid system '${diceSettings.system}', using default '${defaults.system}'`);
		result.settings.system = defaults.system;
	} else {
		result.settings.system = diceSettings.system;
	}

	return result;
}

/**
 * Validates a single color value
 * @param {string} color - Color value to validate
 * @param {string} fallback - Fallback color if validation fails
 * @returns {string} Valid color value
 */
export function validateColorValue(color, fallback = '#ffffff') {
	if (typeof color !== 'string') return fallback;

	// Check for valid hex color format
	const hexPattern = /^#[0-9A-Fa-f]{6}$/;
	return hexPattern.test(color) ? color : fallback;
}

/**
 * Validates a choice field value against available options
 * @param {string} value - Value to validate
 * @param {Object} choices - Available choices object
 * @param {string} fallback - Fallback value if validation fails
 * @returns {string} Valid choice value
 */
export function validateChoiceValue(value, choices, fallback) {
	if (typeof value !== 'string') return fallback;
	return Object.keys(choices).includes(value) ? value : fallback;
}

/**
 * Export available choices for external use
 */
export { TEXTURE_CHOICES, MATERIAL_CHOICES, SYSTEM_CHOICES };
