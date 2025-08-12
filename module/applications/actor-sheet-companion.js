import { SheetTracker } from './sheet-tracker.js';
import { SimpleActorSheet } from './actor-sheet.js';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CompanionActorSheet extends SimpleActorSheet {
	/** @inheritdoc */
	static get defaultOptions() {
		// Calculate responsive dimensions based on screen size
		const screenHeight = window.innerHeight;
		const screenWidth = window.innerWidth;

		// Calculate optimal height for companion sheet (typically smaller than PC sheet)
		const maxHeight = Math.floor(screenHeight * 0.85);
		const minHeight = 500; // Minimum usable height for companion
		const preferredHeight = 840; // Ideal height for larger screens

		const height = Math.max(minHeight, Math.min(preferredHeight, maxHeight));

		// Calculate width for companion sheet
		const maxWidth = Math.floor(screenWidth * 0.9);
		const minWidth = 690; // Maintain minimum width for usability
		const preferredWidth = 650; // Standard width for companion

		const width = Math.max(minWidth, Math.min(preferredWidth, maxWidth));

		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['daggerheart', 'sheet', 'companion'],
			template: 'systems/daggerheart-unofficial/templates/actor-sheet-companion.html',
			width: width,
			height: height,
			tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'companion' }],
			scrollY: ['.biography', '.items', '.attributes'],
			dragDrop: [],
		});
	}

	/** @inheritdoc */
	async getData(options) {
		const context = await super.getData(options);

		context.systemData = context.data.system;
		context.domains = this.actor.system.domains;
		context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
			context.systemData.biography,
			{
				secrets: this.document.isOwner,
				async: true,
			}
		);
		context.actor = this.actor;
		context.imageStyle = `background: url(${context.data.img});`;

		const stress = context.systemData.stress;
		context.isOutOfScene = stress && stress.value === stress.max && stress.max > 0;

		return context;
	}

	/** @inheritdoc */
	async activateListeners(html) {
		super.activateListeners(html);

		// Initialize or reinitialize sheet tracker
		if (this.sheetTracker) {
			this.sheetTracker.destroy();
		}
		this.sheetTracker = new SheetTracker(this);
		await this.sheetTracker.initialize();
	}

	async _rollTrait(traitName, traitValue) {
		const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
		const title = `Roll for ${traitNamePrint}`;

		// For companions, we'll call for an npc dialog roll (same as NPCs)
		await game.daggerheart.rollHandler.npcRollWithDialog({ title, traitValue, actor: this.actor });
	}

	/** @inheritdoc */
	_getSubmitData(updateData) {
		let formData = super._getSubmitData(updateData);
		if (this.actor.type === 'companion') {
			formData['system.isCompanion'] = true;
		}
		return formData;
	}
}
