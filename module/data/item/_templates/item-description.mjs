const { HTMLField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template with item descriptions.
 *
 * @property {string} description    Full item description.
 * @mixin
 */
export class ItemDescriptionData extends TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({
				blank: true,
				required: true,
			}),
		};
	}
}
