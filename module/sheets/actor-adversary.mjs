const {
    api, sheets
} = foundry.applications;

/**
 * Extend the basic ActorSheet with modifications for daggerheart
 * @extends {ActorSheetV2}
 */
export class AdversaryActorSheet extends api.HandlebarsApplicationMixin(
    sheets.ActorSheetV2
) {
    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["adversary"],
        document: null,
        editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
        position: {
            width: 600,
            height: 600
        },
        actions: {},
        form: { submitOnChange: true },
        dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }]
    };

    /** @override */
    static PARTS = {
        base: {
            template: "./systems/daggerheart/templates/actor-sheet-adversary.html",
        }
    }
}