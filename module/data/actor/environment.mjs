// Removed tooltip links on:
// system.defenses.difficulty.tooltip

import { ActorBase } from '../_base/actor-base.mjs';

import { RefrenceField } from './_fields/refrence.mjs';
import { ModifiedNumberField } from './_fields/modifier.mjs';

import { ActorTrackerData } from './_templates/actor-tracker.mjs';

const { ArrayField, SchemaField, StringField } = foundry.data.fields;

export default class EnvironmentData extends ActorBase.mixin(ActorTrackerData) {
	static defineSchema() {
		return this.mergeSchema(super.defineSchema(), {
			tier: new StringField({
				blank: true,
				required: true,
			}),
			notes: new StringField({
				blank: true,
				required: true,
			}),
			typing: new StringField({
				blank: true,
				required: true,
			}),
			impulses: new StringField({
				blank: true,
				required: true,
			}),
			shortDescription: new StringField({
				blank: true,
				required: true,
			}),

			defenses: new SchemaField({
				difficulty: new ModifiedNumberField(),
			}),

			potentialAdversaries: new ArrayField(new RefrenceField()),
		});
	}
}
