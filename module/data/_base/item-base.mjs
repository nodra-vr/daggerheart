import { BaseModel } from './_base-model.mjs';

const { ObjectField, StringField } = foundry.data.fields;

/**
 * Base data model for system items.
 *
 * @property {string} rarity
 * @property {string} category
 *
 * @property {object} groups
 * @property {object} attributes
 * @mixin
 */
export class ItemBase extends BaseModel {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			groups: new ObjectField({ required: true }),
			attributes: new ObjectField({ required: true }),

			rarity: new StringField({ blank: true, required: true }),
			category: new StringField({ blank: true, required: true }),
		});
	}
}
