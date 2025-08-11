import { ItemBase } from '../_base/item-base.mjs';
import { ItemTrackerData, ItemDescriptionData } from './_templates/_module.mjs';

const { StringField } = foundry.data.fields;

export default class AncestryData extends ItemBase.mixin(ItemTrackerData, ItemDescriptionData) {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			location: new StringField({ required: true, initial: 'ancestry' }),
		});
	}
}
