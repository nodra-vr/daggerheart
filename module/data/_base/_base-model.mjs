const { TypeDataModel } = foundry.abstract;

/**
 * Abstract data model for system mixins.
 */
export class BaseModel extends TypeDataModel {
	static _templates = [];
	static _not_mixable = new Set(['name', 'mixed', 'length', 'prototype', 'defineSchema']);

	static defineSchema() {
		const schema = {};
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
