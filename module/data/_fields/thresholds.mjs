const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Data model for seting damage thresholds.
 *
 * @property {number} major    // Major damage value.
 * @property {number} severe   // Severe damage value.
 */
export class ThresholdsField extends SchemaField {
	constructor(options = {}, schemaOptions = {}) {
		const fields = {
			major: new NumberField({
				min: 0,
				integer: true,
				required: true,
				positive: true,
				initial: options.major ?? 4,
			}),
			severe: new NumberField({
				min: 1,
				integer: true,
				required: true,
				positive: true,
				initial: options.severe ?? 12,
			}),
		};
		super(fields, schemaOptions);
	}
}
