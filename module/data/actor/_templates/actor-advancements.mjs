const { ArrayField, BooleanField, HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Data model template with actor advancements.
 *
 * @property {string} description    Full item description.
 * @mixin
 */
export class ActorAdvancementsData extends TypeDataModel {
	static defineSchema() {
		return {
			advancementnotes: new HTMLField({
				blank: true,
				required: true,
			}),
			advancements: new SchemaField({
				totals: new SchemaField({
					hp: new NumberField({
						min: 0,
						integer: true,
						required: true,
						positive: false,
					}),
					stress: new NumberField({
						min: 0,
						integer: true,
						required: true,
						positive: false,
					}),
					evasion: new NumberField({
						min: 0,
						integer: true,
						required: true,
						positive: false,
					}),
					proficiency: new NumberField({
						min: 0,
						integer: true,
						required: true,
						positive: false,
					}),
				}),
				tier2: new SchemaField({
					exp: new BooleanField({
						required: true,
						initial: false,
					}),
					evasion: new BooleanField({
						required: true,
						initial: false,
					}),
					subclass: new BooleanField({
						required: true,
						initial: false,
					}),
					domaincard: new BooleanField({
						required: true,
						initial: false,
					}),

					hp1: new BooleanField({
						required: true,
						initial: false,
					}),
					hp2: new BooleanField({
						required: true,
						initial: false,
					}),

					stress1: new BooleanField({
						required: true,
						initial: false,
					}),
					stress2: new BooleanField({
						required: true,
						initial: false,
					}),

					proficiency1: new BooleanField({
						required: true,
						initial: false,
					}),
					proficiency2: new BooleanField({
						required: true,
						initial: false,
					}),

					traits1: new BooleanField({
						required: true,
						initial: false,
					}),
					traits2: new BooleanField({
						required: true,
						initial: false,
					}),
					traits3: new BooleanField({
						required: true,
						initial: false,
					}),

					traits1Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
					traits2Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
					traits3Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
				}),
				tier3: new SchemaField({
					exp: new BooleanField({
						required: true,
						initial: false,
					}),
					evasion: new BooleanField({
						required: true,
						initial: false,
					}),
					subclass: new BooleanField({
						required: true,
						initial: false,
					}),
					domaincard: new BooleanField({
						required: true,
						initial: false,
					}),

					hp1: new BooleanField({
						required: true,
						initial: false,
					}),
					hp2: new BooleanField({
						required: true,
						initial: false,
					}),

					stress1: new BooleanField({
						required: true,
						initial: false,
					}),
					stress2: new BooleanField({
						required: true,
						initial: false,
					}),

					multiclass1: new BooleanField({
						required: true,
						initial: false,
					}),
					multiclass2: new BooleanField({
						required: true,
						initial: false,
					}),

					proficiency1: new BooleanField({
						required: true,
						initial: false,
					}),
					proficiency2: new BooleanField({
						required: true,
						initial: false,
					}),

					traits1: new BooleanField({
						required: true,
						initial: false,
					}),
					traits2: new BooleanField({
						required: true,
						initial: false,
					}),
					traits3: new BooleanField({
						required: true,
						initial: false,
					}),

					traits1Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
					traits2Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
					traits3Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
				}),
				tier4: new SchemaField({
					exp: new BooleanField({
						required: true,
						initial: false,
					}),
					evasion: new BooleanField({
						required: true,
						initial: false,
					}),
					subclass: new BooleanField({
						required: true,
						initial: false,
					}),
					domaincard: new BooleanField({
						required: true,
						initial: false,
					}),

					hp1: new BooleanField({
						required: true,
						initial: false,
					}),
					hp2: new BooleanField({
						required: true,
						initial: false,
					}),

					stress1: new BooleanField({
						required: true,
						initial: false,
					}),
					stress2: new BooleanField({
						required: true,
						initial: false,
					}),

					multiclass1: new BooleanField({
						required: true,
						initial: false,
					}),
					multiclass2: new BooleanField({
						required: true,
						initial: false,
					}),

					proficiency1: new BooleanField({
						required: true,
						initial: false,
					}),
					proficiency2: new BooleanField({
						required: true,
						initial: false,
					}),

					traits1: new BooleanField({
						required: true,
						initial: false,
					}),
					traits2: new BooleanField({
						required: true,
						initial: false,
					}),
					traits3: new BooleanField({
						required: true,
						initial: false,
					}),

					traits1Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
					traits2Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
					traits3Traits: new ArrayField(
						new StringField({
							blank: false,
							required: true,
						})
					),
				}),
			}),
		};
	}
}
