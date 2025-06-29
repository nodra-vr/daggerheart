const { HTMLField } = foundry.data.fields;

export class ActorDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const schema = {};

        schema.notes = new HTMLField({
            required: true, blank: true
        });
        schema.biography = new HTMLField({
            required: true, blank: true
        });

        return schema;
    }
}
