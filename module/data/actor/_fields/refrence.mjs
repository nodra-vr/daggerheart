const { SchemaField, StringField } = foundry.data.fields;

export class RefrenceField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			uuid: new StringField({
				blank: false,
				required: true,
			}),
			name: new StringField({
				blank: false,
				required: true,
			}),
			img: new StringField({
				blank: false,
				required: true,
			}),
		};
		super(fields, schemaOptions);
	}
}
