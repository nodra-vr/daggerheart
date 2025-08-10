export class RangeMeasurementSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "daggerheart-range-measurement",
      template: "systems/daggerheart-unofficial/templates/settings/range-measurement.hbs",
      title: "DAGGERHEART.SETTINGS.RangeMeasurement.title",
      width: 420,
      height: "auto",
      resizable: false,
      submitOnClose: false,
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.enabled = game.settings.get("daggerheart-unofficial", "rangeMeasurementEnabled");
    context.melee = game.settings.get("daggerheart-unofficial", "rangeMeasurementMelee");
    context.veryClose = game.settings.get("daggerheart-unofficial", "rangeMeasurementVeryClose");
    context.close = game.settings.get("daggerheart-unofficial", "rangeMeasurementClose");
    context.far = game.settings.get("daggerheart-unofficial", "rangeMeasurementFar");
    context.veryFar = game.settings.get("daggerheart-unofficial", "rangeMeasurementVeryFar");
    return context;
  }

  async _updateObject(event, formData) {
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementEnabled", !!formData.enabled);
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementMelee", Number(formData.melee ?? 5));
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementVeryClose", Number(formData.veryClose ?? 15));
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementClose", Number(formData.close ?? 30));
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementFar", Number(formData.far ?? 60));
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementVeryFar", Number(formData.veryFar ?? 120));
    ui.notifications.info(game.i18n.localize("DAGGERHEART.SETTINGS.RangeMeasurement.saved"));
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="reset"]').on('click', this._onReset.bind(this));
    html.find('[data-action="close"]').on('click', this._onClose.bind(this));
  }

  async _onReset(event) {
    event.preventDefault();
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementEnabled", true);
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementMelee", 5);
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementVeryClose", 15);
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementClose", 30);
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementFar", 60);
    await game.settings.set("daggerheart-unofficial", "rangeMeasurementVeryFar", 120);
    await this.render();
  }

  async _onClose(event) {
    event.preventDefault();
    await this.close();
  }
}


