export class FearParticleSettings extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: 'daggerheart-fear-particles',
			template: 'systems/daggerheart-unofficial/templates/settings/fear-particles.hbs',
			title: 'Fear Particle Settings',
			width: 420,
			height: 'auto',
			resizable: false,
			submitOnClose: false,
			submitOnChange: false,
			closeOnSubmit: false,
		});
	}

	async getData(options) {
		const context = await super.getData(options);
		const s = game.settings.get('daggerheart-unofficial', 'fearParticleSettings') || {};
		context.count = Number.isFinite(s.count) ? s.count : 8;
		context.smoke = s.smoke !== false;
		context.icon = s.icon || 'fa-duotone fa-skull';
		const sc = parseFloat(s.scale);
		context.scale = Number.isFinite(sc) ? sc : 1;
		return context;
	}

	async _updateObject(event, formData) {
		const count = Math.max(0, Math.min(50, parseInt(formData.count ?? 8)));
		const smoke = !!formData.smoke;
		const icon = String(formData.icon || 'fa-duotone fa-skull').trim();
		const scaleRaw = Number(formData.scale);
		const scale = Number.isFinite(scaleRaw) ? Math.min(4, scaleRaw) : 1;
		await game.settings.set('daggerheart-unofficial', 'fearParticleSettings', { count, smoke, icon, scale });
		ui.notifications.info('Fear particle settings saved');
	}

	activateListeners(html) {
		super.activateListeners(html);
		html.find('[data-action="reset"]').on('click', this._onReset.bind(this));
		html.find('[data-action="close"]').on('click', this._onClose.bind(this));
	}

	async _onReset(event) {
		event.preventDefault();
		await game.settings.set('daggerheart-unofficial', 'fearParticleSettings', {
			count: 8,
			smoke: true,
			icon: 'fa-duotone fa-skull',
			scale: 1,
		});
		await this.render();
	}

	async _onClose(event) {
		event.preventDefault();
		await this.close();
	}
}
