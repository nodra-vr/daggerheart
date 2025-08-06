const { ObjectField, StringField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Base data model for system items.
 *
 * @property {string} rarity
 * @property {string} category
 *
 * @property {object} groups
 * @property {object} attributes
 * @mixin
 */
export class ItemBase extends TypeDataModel {
	static _templates = [];
	static _not_mixable = new Set(['name', 'mixed', 'length', 'prototype', 'defineSchema']);

	static defineSchema() {
		const schema = {
			rarity: new StringField({ blank: true, required: true }),
			category: new StringField({ blank: true, required: true }),

			groups: new ObjectField({ required: true }),
			attributes: new ObjectField({ required: true }),
		};
		for (const template of this._templates) {
			if (!template.defineSchema) {
				throw new Error(`Invalid template mixin ${template} defined on class ${this.constructor}`);
			}
			this.mergeSchema(schema, template.defineSchema());
		}
		return schema;
	}

	static mergeSchema(a, b) {
		Object.assign(a, b);
		return a;
	}

	static mixin(...templates) {
		for (const template of templates) {
			if (!(template.prototype instanceof TypeDataModel)) {
				throw new Error(`${template.name} is not a subclass of TypeDataModel`);
			}
		}

		const Base = class extends this {};
		Object.defineProperty(Base, '_templates', {
			value: Object.seal([...this._templates, ...templates]),
			writable: false,
			configurable: false,
		});

		for (const template of templates) {
			// Take all static methods and fields and mix in to base class
			for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(template))) {
				if (this._not_mixable.has(key)) continue;
				Object.defineProperty(Base, key, descriptor);
			}
			// Take all instance methods and fields and mix in to base class
			for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(template.prototype))) {
				if (['constructor'].includes(key)) continue;
				Object.defineProperty(Base.prototype, key, descriptor);
			}
		}

		return Base;
	}
}
