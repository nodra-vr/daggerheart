const { StringField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template that defines a combat tier.
 *
 * @property {number} tier    The combat tier.
 * @mixin
 */
export class CombatTierData extends TypeDataModel {
	static defineSchema() {
		return {
			tier: new StringField({
				blank: true,
				required: true,
				initial: 'Tier 1',
			}),
		};
	}
}
