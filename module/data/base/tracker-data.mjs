const { NumberField, SchemaField, StringField } = foundry.data.fields;

export class ResourceDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const schema = {};

        schema.id = new StringField({
            required: true, blank: false
        });

        schema.name = new StringField({
            required: true, blank: false,
            initial: 'Tracker',
        });
        schema.color = new StringField({
            required: true, blank: false,
            initial: '#f3c267',
        });

        schema.max = new NumberField({
            required: true, integer: true,
            positive: true, initial: 1
        });
        schema.value = new NumberField({
            required: true, integer: true,
            positive: false, initial: 0, min: 0
        });

        schema.order = new NumberField({
            required: true, integer: true,
            positive: false, initial: 0, min: 0
        });

        return schema;
    }

    static defineShemaField() {
        const schema = this.defineSchema();
        return new SchemaField(schema);
    }
}