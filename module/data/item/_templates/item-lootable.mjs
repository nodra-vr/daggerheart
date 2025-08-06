const { NumberField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template with information on lootable items.
 *
 * @property {number} cost          Item's cost.
 * @property {number} weight        Item's weight.
 * @property {number} quantity      Number of items in a stack.
 * @mixin
 */
export class ItemLootableData extends TypeDataModel {
	static defineSchema() {
		return {
			cost: new NumberField({
				min: 0,
				initial: 0,
				integer: true,
				required: true,
				positive: false,
			}),
			weight: new NumberField({
				min: 0,
				initial: 0,
				integer: true,
				required: true,
				positive: false,
			}),
			quantity: new NumberField({
				min: 1,
				initial: 1,
				integer: true,
				required: true,
				positive: false,
			}),
		};
	}
}
