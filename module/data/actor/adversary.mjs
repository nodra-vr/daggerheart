// Removed tooltip links on:
// system.health.tooltip
// system.stress.tooltip
// system.defenses.armor.tooltip
// system.defenses.evasion.tooltip
// system.defenses.armor-slots.tooltip

import { ActorBase } from '../_base/actor-base.mjs';

import { ValueField } from './_fields/value.mjs';
import { WeaponSlotField } from './_fields/weapon-slot.mjs';

import { ActorTrackerData } from './_templates/actor-tracker.mjs';
import { ActorDefensesData } from './_templates/actor-defenses.mjs';
import { ActorDescriptionData } from './_templates/actor-description.mjs';

const { NumberField, SchemaField } = foundry.data.fields;

export default class AdversaryData extends ActorBase.mixin(ActorTrackerData, ActorDefensesData, ActorDescriptionData) {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			health: new ValueField({ max: 6 }),
			stress: new ValueField({ max: 6 }),

			'weapon-off': new WeaponSlotField(),
			'weapon-main': new WeaponSlotField(),

			threshold: new SchemaField({
				major: new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
					initial: 4,
				}),
				severe: new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
					initial: 12,
				}),
			}),
		});
	}
}
