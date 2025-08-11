import { ItemBase } from '../_base/item-base.mjs';
import { CombatTierData } from '../_templates/combat-tier.mjs';
import { ItemTrackerData, ItemLootableData, ItemDescriptionData } from './_templates/_module.mjs';

const { BooleanField, ObjectField, StringField } = foundry.data.fields;

export default class WeaponData extends ItemBase.mixin(
	CombatTierData,
	ItemTrackerData,
	ItemLootableData,
	ItemDescriptionData
) {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			location: new StringField({ required: true, initial: 'backpack' }),

			trait: new StringField({ required: true, blank: true }),
			range: new StringField({ required: true, blank: true }),

			damage: new ObjectField({ required: true }),
			damageType: new StringField({ required: true, blank: true }),

			equipped: new BooleanField({ required: true, initial: false }),
			weaponSlot: new StringField({ required: false, blank: true }),
		});
	}
}
