import { ModifiedNumberField } from '../_fields/modifier.mjs';

const { NumberField, SchemaField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template with actor descriptions.
 *
 * @property {string} description    Full item description.
 * @mixin
 */
export class ActorDefensesData extends TypeDataModel {
	static defineSchema() {
		return {
			// TODO move this to a mix-in
			// The player has less options
			defenses: new SchemaField({
				'armor-slots': new SchemaField({
					max: new NumberField({
						min: 0,
						integer: true,
						required: true,
						positive: false,
						initial: 6,
					}),
					value: new NumberField({
						min: 0,
						integer: true,
						required: true,
						positive: false,
						initial: 6,
					}),
				}),

				armor: new ModifiedNumberField(),
				evasion: new ModifiedNumberField(),
			}),
		};
	}
}
