import { parseDualityCommand } from './command-parser.js';
import { getTraitValue, getCommandTarget, validateCommandParams, parseDiceFormula } from './command-utils.js';
import { _rollDuality } from '../data/rollHandler.js';

export async function processUnifiedDualityCommand(commandText, options = {}) {
	console.log('Daggerheart | Processing unified /dr command:', { commandText, options });

	if (!commandText) {
		console.log('Daggerheart | Executing basic duality roll');
		return await executeBasicDualityRoll(options);
	}

	const parsedCommand = parseDualityCommand(commandText);
	console.log('Daggerheart | Parsed command:', parsedCommand);

	if (!parsedCommand) {
		ui.notifications.error(game.i18n.localize('DAGGERHEART.CHAT.DR.parseError'));
		return;
	}

	const validationErrors = validateCommandParams(parsedCommand);
	if (validationErrors.length > 0) {
		validationErrors.forEach(error => ui.notifications.error(error));
		return;
	}

	console.log('Daggerheart | Executing duality roll with params:', parsedCommand);
	return await executeDualityRollWithParams(parsedCommand, options);
}

async function executeBasicDualityRoll(options = {}) {
	const target = getCommandTarget();
	const speaker = target ? ChatMessage.getSpeaker({ actor: target }) : ChatMessage.getSpeaker();

	return await _rollDuality({
		sendToChat: true,
		speaker: options.speaker || speaker,
		...options.rollOptions,
	});
}

async function executeDualityRollWithParams(params, options = {}) {
	const target = getCommandTarget();
	const speaker = target ? ChatMessage.getSpeaker({ actor: target }) : ChatMessage.getSpeaker();

	let modifier = 0;
	let flavor = null;

	if (params.trait && target) {
		const traitValue = getTraitValue(target, params.trait);
		modifier = traitValue;

		const traitLabel = game.i18n.localize(`DAGGERHEART.TRAITS.${params.trait.toUpperCase()}`) || params.trait;
		flavor = `<p class="roll-flavor-line"><b>${traitLabel} Check</b></p>`;
	}

	let advantage = 0;
	let disadvantage = 0;

	if (params.advantage) {
		if (typeof params.advantage === 'string') {
			advantage = parseDiceFormula(params.advantage);
		} else {
			advantage = params.advantage;
		}
	}

	if (params.disadvantage) {
		if (typeof params.disadvantage === 'string') {
			disadvantage = parseDiceFormula(params.disadvantage);
		} else {
			disadvantage = params.disadvantage;
		}
	}

	const rollOptions = {
		hopeDieSize: params.hope || 'd12',
		fearDieSize: params.fear || 'd12',
		modifier: modifier + (params.modifier || 0),
		advantage: advantage,
		disadvantage: disadvantage,
		reaction: params.reaction || false,
		sendToChat: true,
		speaker: options.speaker || speaker,
		flavor: flavor,
		...options.rollOptions,
	};

	return await _rollDuality(rollOptions);
}
