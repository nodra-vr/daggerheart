import { processUnifiedDualityCommand } from './unified-duality-processor.js';
import { createDualityRollLink } from './command-utils.js';

Hooks.once('ready', () => {
	const originalProcessMessage = ChatLog.prototype.processMessage;

	ChatLog.prototype.processMessage = function (message) {
		const trimmedMessage = message.trim();
		if (trimmedMessage === '/dr' || trimmedMessage.startsWith('/dr ')) {
			console.log('Daggerheart | /dr command recognized as valid');
			processDualityCommand(message);
			return '';
		}
		return originalProcessMessage.call(this, message);
	};

	console.log('Daggerheart | Registered /dr as a valid chat command');
});

async function processDualityCommand(message) {
	const commandText = message.replace(/^\/dr\s*/, '').trim();
	return await processUnifiedDualityCommand(commandText, {
		source: 'chat',
	});
}

export function showDualityRollHelp() {
	const helpText = `
<div class="daggerheart-help">
<h3>Duality Roll Commands</h3>
<p><strong>Chat Command:</strong> <code>/dr [options]</code></p>
<p><strong>Inline Roll:</strong> <code>[[/dr options]]{label}</code></p>

<h4>Examples:</h4>
<ul>
<li><code>/dr</code> - Basic duality roll</li>
<li><code>/dr trait=agility</code> - Agility check</li>
<li><code>/dr trait=strength modifier=2</code> - Strength check with +2 modifier</li>
<li><code>/dr advantage=2d6</code> - Roll with 2d6 advantage</li>
<li><code>[[/dr trait=agility modifier=2]]{Agility Check}</code> - Inline agility check</li>
<li><code>[[/dr advantage=1d8 disadvantage=1d4]]{Combat Roll}</code> - Inline combat roll</li>
</ul>

<h4>Options:</h4>
<ul>
<li><code>trait</code> - Use trait value as modifier (agility, strength, finesse, instinct, presence, knowledge)</li>
<li><code>hope</code> - Hope die size (d4, d6, d8, d10, d12, d20)</li>
<li><code>fear</code> - Fear die size (d4, d6, d8, d10, d12, d20)</li>
<li><code>modifier</code> - Flat modifier to add</li>
<li><code>advantage</code> - Advantage dice (e.g., 2d6, 1d8)</li>
<li><code>disadvantage</code> - Disadvantage dice (e.g., 1d4, 2d6)</li>
<li><code>reaction</code> - Set to true for reaction rolls</li>
<li><code>messageType</code> - public, blind, private, self</li>
</ul>
</div>`;

	ChatMessage.create({
		content: helpText,
		speaker: ChatMessage.getSpeaker(),
		type: CONST.CHAT_MESSAGE_TYPES.OOC,
	});
}
