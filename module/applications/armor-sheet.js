import { SimpleItemSheet } from './item-sheet.js';
import { EntitySheetHelper } from '../helpers/helper.js';
import { ATTRIBUTE_TYPES } from '../helpers/constants.js';

export class SimpleArmorSheet extends SimpleItemSheet {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['daggerheart', 'sheet', 'item', 'armor'],
			template: 'systems/daggerheart-unofficial/templates/item-sheet-armor.html',
			width: 350,
			height: 650,
			resizable: true,
			scrollY: ['.card-description'],
		});
	}

	async getData(options) {
		const context = await super.getData(options);

		return context;
	}

	activateListeners(html) {
		super.activateListeners(html);

		if (!this.isEditable) return;
	}
}
