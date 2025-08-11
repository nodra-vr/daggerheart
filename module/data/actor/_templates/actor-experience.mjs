const { NumberField, SchemaField, StringField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template with actor experiences.
 *
 * @property {object} experience    List of experiences.
 * @mixin
 */
export class ActorExperienceData extends TypeDataModel {
	static defineSchema() {
		return {
			experience: new SchemaField({
				'1Name': new StringField({
					blank: true,
					required: true,
				}),
				'1level': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'1Mod': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'1Name2': new StringField({
					blank: true,
					required: true,
				}),
				'11level': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'1Mod2': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'2Name': new StringField({
					blank: true,
					required: true,
				}),
				'2level': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'2Mod': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'5Name': new StringField({
					blank: true,
					required: true,
				}),
				'5level': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'5Mod': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'8Name': new StringField({
					blank: true,
					required: true,
				}),
				'8level': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
				'8Mod': new NumberField({
					min: 0,
					integer: true,
					required: true,
					positive: false,
				}),
			}),
		};
	}
}
