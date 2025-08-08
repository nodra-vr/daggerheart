import { BaseModel } from './_base-model.mjs';

const { ObjectField } = foundry.data.fields;

/**
 * Base data model for system actors.
 *
 * @property {object} groups
 * @property {object} attributes
 * @mixin
 */
export class ActorBase extends BaseModel {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			groups: new ObjectField({ required: true }),
			attributes: new ObjectField({ required: true }),
		});
	}
}
