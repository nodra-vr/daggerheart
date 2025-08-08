import { ModifiedStringField, ModifiedNumberField } from './modifier.mjs';

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model for tracking resources.
 *
 * @property {string} name         // Resource name.
 * @property {string} range        // Resource name.
 * @property {string} dmgType      // Resource name.
 * @property {string} modifier     // Resource ID.
 * @property {string} description  // Hex color value.
 *
 * @property {number} toHit        // Value used to sort resources.
 * @property {number} damage       // Max resource tracker value.
 */
export class WeaponSlotField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			name: new StringField({
				blank: true,
				required: true,
				initial: options.name ?? 'Fist',
			}),
			range: new StringField({
				blank: false,
				required: true,
				initial: options.range ?? 'melee',
			}),
			dmgType: new StringField({
				blank: false,
				required: true,
				initial: options.dmgType ?? 'physical',
			}),
			modifier: new StringField({
				blank: true,
				required: true,
			}),
			description: new StringField({
				blank: true,
				required: true,
				initial: options.description ?? 'Range | 1H | Trait',
			}),

			'to-hit': new ModifiedStringField(),
			damage: new ModifiedStringField(),
		};
		super(fields, schemaOptions);
	}
}
