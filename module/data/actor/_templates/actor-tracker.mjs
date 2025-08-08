import { ResourceField } from '../../_fields/resource.mjs';

const { ArrayField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template with a list of trackable resources.
 *
 * @property {array} resourceTrackers    A resource list.
 * @mixin
 */
export class ActorTrackerData extends TypeDataModel {
	static defineSchema() {
		return {
			resourceTrackers: new ArrayField(new ResourceField()),
		};
	}
}
