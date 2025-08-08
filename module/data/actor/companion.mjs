// Removed tooltip links on:
// system.stress.tooltip
// system.defenses.evasion.tooltip

import { ActorBase } from '../_base/actor-base.mjs';

import { ValueField } from './_fields/value.mjs';
import { WeaponSlotField } from './_fields/weapon-slot.mjs';
import { ModifiedNumberField } from './_fields/modifier.mjs';

import { ActorTrackerData } from './_templates/actor-tracker.mjs';
import { ActorExperienceData } from './_templates/actor-experience.mjs';
import { ActorDescriptionData } from './_templates/actor-description.mjs';

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class CompanionData extends ActorBase.mixin(
	ActorTrackerData,
	ActorExperienceData,
	ActorDescriptionData
) {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			stress: new ValueField({ max: 6 }),

			// TODO Check within a migration? to-hit/damage may be flat values
			// Note: the stored data does not align with the old template
			'weapon-main': new WeaponSlotField(),

			defenses: new SchemaField({
				evasion: new ModifiedNumberField(),
			}),
		});
	}
}
