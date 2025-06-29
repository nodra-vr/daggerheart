import { ActorDataModel } from "./base/actor-data.mjs";

const {
    HTMLField, ArrayField, NumberField,
    SchemaField, StringField,
} = foundry.data.fields;

export class AdversaryDataModel extends ActorDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        /*
         * # Tier
         * 
         * Each adversary is designed to oppose PCs of a certain tier.
         * If you confront the party with an adversary from 
         * another tier, adjust their stats.
         */
        schema.tier = new NumberField({
            required: true, integer: true,
            positive: true, initial: 1,
            min: 1, max: 4
        });

        /*
         * # Dificulty
         * 
         * The Difficulty of any roll made against 
         * the adversary, unless otherwise noted.
         */
        schema.dificulty = new NumberField({
            required: true, positive: true,
            integer: true, initial: 1,
            min: 1, max: 20
        });

        /*
         * # Type
         * 
         * The adversary’s type appears alongside their tier.
         * An adversary’s type represents the role 
         * they play in a conflict.
         */
        schema.type = new StringField({
            required: true, blank: true,
            trim: true, textSearch: true,
        });

        /*
         * # Motives & Tactics
         * 
         * A list of suggusted impulses, actions 
         * and goals for the adversary.
         */
        schema.behavior = new ArrayField(new StringField({
            required: true, blank: true,
            trim: true, textSearch: true,
        }));

        /*
         * # Description
         * 
         * A summary of the adversary's appearance and demeanor.
         */
        schema.description = new HTMLField({
            required: true, blank: true,
            trim: true
        });

        /*
         * # Stress, Hit Points and Treasholds
         * 
         * These systems function the same way they do for PCs.
         */
        schema.stress = new SchemaField({
            value: new NumberField({
                required: true, integer: true,
                positive: false, initial: 0, min: 0
            }),
            max: new NumberField({
                required: true, integer: true,
                positive: true, initial: 6, min: 1
            })
        });
        schema.health = new SchemaField({
            value: new NumberField({
                required: true, integer: true,
                positive: false, initial: 0, min: 0
            }),
            max: new NumberField({
                required: true, integer: true,
                positive: true, initial: 6, min: 1
            })
        });
        schema.threshold = new SchemaField({
            minor: new NumberField({
                required: true, integer: true,
                positive: true, initial: 7, min: 1
            }),
            major: new NumberField({
                required: true, integer: true,
                positive: true, initial: 12, min: 2
            })
        });

        /*
         * # Attack Modifier
         * 
         * When you attack with the adversary, apply
         * this bonus or penalty to your roll.
         */
        schema.modifier = new NumberField({
            required: true, integer: true,
            positive: false, initial: 1,
            min: -20, max: 20
        });

        /*
         * # Standard Attack
         * 
         * A description of the primary mode of inflicting harm on
         * the PCs. It includes the attack’s name, its effective 
         * range, and the damage it deals on a success. Using 
         * an adversary’s standard attack is a GM move.
         */
        schema.attack = new SchemaField({
            name: new StringField({
                required: true, blank: true,
                trim: true, textSearch: false,
            }),
            range: new StringField({
                required: true, blank: true,
                trim: true, textSearch: false,
            }),
            damage: new SchemaField({
                type: new StringField({
                    required: true, blank: true,
                    trim: true, textSearch: false,
                }),
                base: new StringField({
                    required: true, blank: false,
                    trim: true, initial: "1d8",
                }),
                value: new StringField({
                    required: true, blank: false,
                    trim: true, initial: "1d8",
                }),
                modifiers: new ArrayField(new NumberField({
                    required: true, integer: true,
                    positive: false, initial: 0,
                    min: -20, max: +20
                })),
            }),
            description: new StringField({
                required: true, blank: true,
                trim: true, textSearch: false,
            }),
        });

        /*
         * # Fear Features
         * 
         * High-impact effects that cost a Fear to activate. These 
         * have to be one of the base features types: 
         * actions, reactions, or passive.
         * 
         * If a feature has a Fear requirement, it must be spent in 
         * addition to any Fear already spent—for instance, to 
         * interrupt the PCs and grab the spotlight.
         */
        schema.powers = new NumberField({
            required: true, integer: true,
            positive: true, initial: 1,
            min: 1, max: 4
        });

        /*
         * # Base Features
         * 
         * There are three kinds of base features: actions, reactions, 
         * and passives. Note: each adversaries stress is tracked 
         * individually. If a feature requires the GM to spend 
         * Stress to activate it, the Stress must come from 
         * the adversary whose feature is being activate. 
         */
        schema.features = new NumberField({
            required: true, integer: true,
            positive: true, initial: 1,
            min: 1, max: 4
        });

        /*
         * # Experiences
         * 
         * The GM can spend a Fear to add an adversary’s relevant
         * Experience to raise their attack roll or increase
         * the Difficulty of a roll made against them.
         */
        schema.experiences = new NumberField({
            required: true, integer: true,
            positive: true, initial: 1,
            min: 1, max: 4
        });

        return schema;
    };
}
