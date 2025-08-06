import { ItemBase } from '../_base/item-base.mjs';
import { ThresholdsField } from '../_fields/thresholds.mjs';
import { CombatTierData } from '../_templates/combat-tier.mjs';
import { ItemTrackerData, ItemLootableData, ItemDescriptionData } from './_templates/_module.mjs';

const { BooleanField, NumberField, StringField } = foundry.data.fields;

export default class ArmorData extends ItemBase.mixin(
	CombatTierData,
	ItemTrackerData,
	ItemLootableData,
	ItemDescriptionData
) {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			location: new StringField({ required: true, initial: 'backpack' }),

			baseScore: new NumberField({
				min: 0,
				initial: 0,
				integer: true,
				required: true,
			}),

			equipped: new BooleanField({ required: true, initial: false }),
			baseThresholds: new ThresholdsField(),
		});
	}
}
