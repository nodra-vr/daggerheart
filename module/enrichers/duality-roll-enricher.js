import { _rollDuality } from '../data/rollHandler.js';
import { getTraitValue, getCommandTarget } from '../helpers/command-utils.js';
import { parseDualityCommand } from '../helpers/command-parser.js';

export default function DhDualityRollEnricher(match, options) {
    const commandText = match[1];
    const customLabel = match[3];
    
    const parsedParams = parseDualityCommand(commandText);
    if (!parsedParams) {
        return match[0];
    }
    
    const rollOptions = {
        hopeDieSize: parsedParams.hope || 'd12',
        fearDieSize: parsedParams.fear || 'd12',
        modifier: parsedParams.modifier || 0,
        advantage: parsedParams.advantage || 0,
        disadvantage: parsedParams.disadvantage || 0,
        sendToChat: true,
        speaker: options.speaker || ChatMessage.getSpeaker(),
        reaction: parsedParams.reaction || false,
        messageType: parsedParams.messageType || 'public'
    };
    
    if (parsedParams.trait) {
        const target = getCommandTarget();
        if (target) {
            const traitValue = getTraitValue(target, parsedParams.trait);
            rollOptions.modifier += traitValue;
            
            const traitLabel = game.i18n.localize(`DAGGERHEART.TRAITS.${parsedParams.trait.toUpperCase()}`) || parsedParams.trait;
            rollOptions.flavor = `<p class="roll-flavor-line"><b>${traitLabel} Check</b></p>`;
        }
    }
    
    const label = customLabel || (parsedParams.trait ? `${parsedParams.trait} Check` : 'Duality Roll');
    
    const hopeDie = parsedParams.hope || 'd12';
    const fearDie = parsedParams.fear || 'd12';
    const dynamicFormula = `1${hopeDie}+1${fearDie}`;
    
    const anchor = document.createElement('a');
    anchor.className = 'inline-roll duality-roll-inline';
    anchor.dataset.formula = dynamicFormula;
    anchor.dataset.dualityCommand = commandText;
    anchor.dataset.tooltip = 'Click to roll duality dice';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-dice-d20';
    anchor.appendChild(icon);
    
    const text = document.createTextNode(` ${label}`);
    anchor.appendChild(text);
    
    return anchor;
}
