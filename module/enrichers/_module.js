import { processUnifiedDualityCommand } from '../helpers/unified-duality-processor.js';

Hooks.once('setup', () => {
	// Add our enricher to the BEGINNING of the array so it runs before Foundry's built-in enrichers
	CONFIG.TextEditor.enrichers.unshift({
		pattern: /\[\[\/dr\s?(.*?)\]\]({([^}]+)})?/g,
		enricher: (match, options) => {
			//console.log('Daggerheart | Duality enricher triggered:', { match, options });

			// Only block enricher in chat INPUT contexts, not in rendered chat messages
			const chatInputContext =
				options?.relativeTo?.closest?.('#chat-form') ||
				options?.relativeTo?.closest?.('textarea[name="content"]') ||
				options?.relativeTo?.closest?.('.chat-form');

			if (chatInputContext) {
				// In chat input context, return original text and let the chat command system handle it
				//console.log('Daggerheart | Skipping enricher in chat input context');
				return match[0];
			}

			return createDualityRollEnricher(match, options);
		},
	});

	//console.log('Daggerheart | Registered duality roll enricher at high priority');
});

function createDualityRollEnricher(match, options) {
	const commandText = match[1] || '';
	const customLabel = match[3];

	//console.log('Daggerheart | Creating enricher for:', { commandText, customLabel, fullMatch: match[0] });

	const label =
		customLabel || (commandText.includes('trait=') ? commandText.match(/trait=(\w+)/)?.[1] + ' Check' : 'Duality Roll');

	const anchor = document.createElement('a');
	anchor.className = 'content-link duality-roll-inline';
	anchor.dataset.dualityCommand = commandText;
	anchor.dataset.tooltip = 'Click to roll duality dice';

	const icon = document.createElement('i');
	icon.className = 'fas fa-dice-d20';
	anchor.appendChild(icon);

	const text = document.createTextNode(` ${label}`);
	anchor.appendChild(text);

	//('Daggerheart | Created enricher element:', anchor);
	return anchor;
}

// Simple unified click handler using event delegation
Hooks.once('ready', () => {
	$(document).on('click.duality', 'a[data-duality-command]', async event => {
		event.preventDefault();
		const command = event.currentTarget.dataset.dualityCommand;
		if (command !== undefined) {
			await processUnifiedDualityCommand(command, {
				source: 'enricher',
			});
		}
	});

	console.log('Daggerheart | Registered unified duality roll click handler');
});
