import { ActorDataModel } from "./base/actor-data.mjs";

const {
  HTMLField, ArrayField, BooleanField,
  NumberField, SchemaField, StringField,
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
    schema.tier = new StringField({
      required: true, blank: true,
      trim: true, textSearch: true,
      initial: "Tier 1"
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
      initial: "Solo"
    });

    /*
     * # Dificulty
     * 
     * The Difficulty of any roll made against 
     * the adversary, unless otherwise noted.
     */
    schema.dificulty = new NumberField({
      required: true, positive: true,
      integer: true, initial: 12,
      min: 1, max: 99
    });

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
      major: new NumberField({
        required: true, integer: true,
        positive: true, initial: 7, min: 1
      }),
      severe: new NumberField({
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
    schema.attack = new SchemaField({
      base: new StringField({
        trim: true, blank: false, initial: "1",
        required: true, textSearch: false
      }),
      total: new StringField({
        trim: true, blank: false, initial: "1",
        required: true, textSearch: false
      }),
      modifiers: new ArrayField(new SchemaField({
        name: new StringField({
          required: true, blank: true,
          trim: true, textSearch: false
        }),
        value: new StringField({
          trim: true, blank: false, initial: "+1",
          required: true, textSearch: false,
        }),
        enabled: new BooleanField({
          required: true, initial: false,
        })
      })),
    }),

      /*
       * # Standard Attack
       * 
       * A description of the primary mode of inflicting harm on
       * the PCs. It includes the attack’s name, its effective 
       * range, and the damage it deals on a success. Using 
       * an adversary’s standard attack is a GM move.
       */
      schema.primary = new SchemaField({
        name: new StringField({
          required: true, blank: true,
          trim: true, textSearch: false,
          initial: "Primary Attack",
        }),
        range: new StringField({
          required: true, blank: true,
          trim: true, textSearch: false,
          initial: "Close",
        }),
        damage: new SchemaField({
          type: new StringField({
            required: true, blank: true,
            trim: true, textSearch: false,
            initial: "bludgeoning",
          }),
          base: new StringField({
            trim: true, blank: false, initial: "1d6",
            required: true, textSearch: false,
          }),
          total: new StringField({
            trim: true, blank: false, initial: "1d6",
            required: true, textSearch: false,
          }),
          modifiers: new ArrayField(new SchemaField({
            name: new StringField({
              required: true, blank: true,
              trim: true, textSearch: false
            }),
            value: new StringField({
              trim: true, blank: false, initial: "+1",
              required: true, textSearch: false,
            }),
            enabled: new BooleanField({
              required: true, initial: false,
            })
          })),
        }),
        description: new StringField({
          required: true, blank: true,
          trim: true, textSearch: false,
          initial: "Hands | 1H | Blunt",
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
    schema.powers = new ArrayField(new NumberField({
      required: true, integer: true,
      positive: false, initial: 0,
      min: -20, max: +20
    }));

    /*
     * # Base Features
     * 
     * There are three kinds of base features: actions, reactions, 
     * and passives. Note: each adversaries stress is tracked 
     * individually. If a feature requires the GM to spend 
     * Stress to activate it, the Stress must come from 
     * the adversary whose feature is being activate. 
     */
    schema.features = new ArrayField(new NumberField({
      required: true, integer: true,
      positive: false, initial: 0,
      min: -20, max: +20
    }));

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
     * # Experiences
     * 
     * The GM can spend a Fear to add an adversary’s relevant
     * Experience to raise their attack roll or increase
     * the Difficulty of a roll made against them.
     */
    schema.experiences = new ArrayField(new HTMLField({
      required: true, blank: false,
      trim: true, textSearch: true,
    }));

    return schema;
  };
}
