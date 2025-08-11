import { ItemBase } from '../_base/item-base.mjs';
import { ItemTrackerData, ItemLootableData, ItemDescriptionData } from './_templates/_module.mjs';

const { StringField } = foundry.data.fields;

export default class VaultData extends ItemBase.mixin(ItemTrackerData, ItemLootableData, ItemDescriptionData) {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			location: new StringField({ required: true, initial: 'vault' }),
		});
	}
}
