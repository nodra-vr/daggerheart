const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Data model for numbers with defined min/max values.
 *
 * @property {number} min      // Min Value.
 * @property {number} max      // Max Value.
 * @property {number} value    // Active Value.
 */
export class ValueField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			min: new NumberField({
				integer: true,
				required: true,
				positive: false,
				initial: options.min ?? 0,
			}),
			max: new NumberField({
				integer: true,
				required: true,
				positive: false,
				initial: options.max ?? 1,
			}),
			value: new NumberField({
				integer: true,
				required: true,
				positive: false,
				initial: options.value ?? 0,
			}),
		};
		super(fields, schemaOptions);
	}
}
