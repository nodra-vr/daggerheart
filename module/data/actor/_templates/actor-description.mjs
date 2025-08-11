const { HTMLField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template with actor descriptions.
 *
 * @property {string} description    Full item description.
 * @mixin
 */
export class ActorDescriptionData extends TypeDataModel {
	static defineSchema() {
		return {
			biography: new HTMLField({
				blank: true,
				required: true,
			}),
		};
	}
}
