const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model for modifier values.
 *
 * @property {string} id         // Modifier id.
 * @property {string} name       // Modifier name.
 * @property {string} value      // Modifier value.
 * @property {string} enabled    // Modifier state.
 */
export class ModifierField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			id: new StringField({
				blank: true,
				required: true,
			}),
			name: new StringField({
				blank: true,
				required: true,
				initial: options.name ?? 'Modifier',
			}),
			value: new StringField({
				blank: false,
				required: true,
				initial: options.value ?? '1',
			}),
			enabled: new BooleanField({
				required: true,
				initial: true,
			}),
		};
		super(fields, schemaOptions);
	}
}

/**
 * Data model to modify number values.
 * Legacy has number fields with string mods.
 *
 * @property {number} value              // Modified Value.
 * @property {number} baseValue          // Unmodified Value.
 * @property {boolean} leveled           // Track leveled values.
 * @property {array} modifiers           // List of modifiers.
 * @property {array} permanentModifiers  // List of fixed modifiers.
 */
export class LeveledModifierField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			value: new NumberField({
				min: 0,
				integer: true,
				required: true,
				positive: false,
				initial: 0,
			}),
			baseValue: new NumberField({
				min: 0,
				integer: true,
				required: true,
				positive: false,
				initial: 0,
			}),
			// TODO Migrate the original typo
			levelled: new BooleanField({ initial: false }),
			modifiers: new ArrayField(new ModifierField()),
			permanentModifiers: new ArrayField(new ModifierField()),
		};
		super(fields, schemaOptions);
	}
}

/**
 * Data model to modify number values.
 * Legacy has number fields with string mods.
 *
 * @property {number} value              // Modified Value.
 * @property {number} baseValue          // Unmodified Value.
 * @property {array} modifiers           // List of modifiers.
 * @property {array} permanentModifiers  // List of fixed modifiers.
 */
export class ModifiedNumberField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			value: new NumberField({
				min: 0,
				integer: true,
				required: true,
				positive: false,
				initial: 0,
			}),
			baseValue: new NumberField({
				min: 0,
				integer: true,
				required: true,
				positive: false,
				initial: 0,
			}),
			modifiers: new ArrayField(new ModifierField()),
			permanentModifiers: new ArrayField(new ModifierField()),
		};
		super(fields, schemaOptions);
	}
}

/**
 * Data model for modify string values.
 *
 * @property {string} value              // Modified Value.
 * @property {string} baseValue          // Unmodified Value.
 * @property {array} modifiers           // List of modifiers.
 * @property {array} permanentModifiers  // List of fixed modifiers.
 */
export class ModifiedStringField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			value: new StringField({
				blank: false,
				required: true,
				initial: '1d6',
			}),
			baseValue: new StringField({
				blank: false,
				required: true,
				initial: '1d6',
			}),
			modifiers: new ArrayField(new ModifierField()),
			permanentModifiers: new ArrayField(new ModifierField()),
		};
		super(fields, schemaOptions);
	}
}
