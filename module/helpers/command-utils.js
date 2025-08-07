import { validateTrait, validateDieSize, validateAdvantageFormula } from './command-parser.js';

export function parseDiceFormula(formula) {
    if (!formula || typeof formula !== 'string') {
        return { d4: 0, d6: 0, d8: 0, d10: 0 };
    }
    
    const dicePattern = /(\d+)d(\d+)/g;
    const result = { d4: 0, d6: 0, d8: 0, d10: 0 };
    
    let match;
    while ((match = dicePattern.exec(formula)) !== null) {
        const count = parseInt(match[1]);
        const dieSize = `d${match[2]}`;
        
        if (result.hasOwnProperty(dieSize)) {
            result[dieSize] += count;
        }
    }
    
    return result;
}

export function getTraitValue(actor, traitName) {
    if (!actor || !traitName) return 0;
    
    const normalizedTrait = traitName.toLowerCase();
    if (!validateTrait(normalizedTrait)) {
        console.warn(`Daggerheart | Invalid trait: ${traitName}`);
        return 0;
    }
    
    const traitPath = `system.${normalizedTrait}.value`;
    return foundry.utils.getProperty(actor, traitPath) || 0;
}

export function getCommandTarget(options = {}) {
    const { allowNull = false } = options;
    let target = null;
    
    if (game.user.isGM) {
        target = game.canvas.tokens.controlled.length > 0 
            ? game.canvas.tokens.controlled[0].actor 
            : null;
    } else {
        target = game.user.character;
        if (!target && !allowNull) {
            ui.notifications.error(game.i18n.localize('DAGGERHEART.CHAT.DR.noCharacter'));
            return null;
        }
    }
    
    return target;
}

export function validateCommandParams(params) {
    const errors = [];
    
    if (params.trait && !validateTrait(params.trait)) {
        errors.push(game.i18n.format('DAGGERHEART.CHAT.DR.invalidTrait', { trait: params.trait }));
    }
    
    if (params.hope && !validateDieSize(params.hope)) {
        errors.push(game.i18n.format('DAGGERHEART.CHAT.DR.invalidHopeDie', { die: params.hope }));
    }
    
    if (params.fear && !validateDieSize(params.fear)) {
        errors.push(game.i18n.format('DAGGERHEART.CHAT.DR.invalidFearDie', { die: params.fear }));
    }
    
    if (params.advantage && !validateAdvantageFormula(params.advantage)) {
        errors.push(game.i18n.format('DAGGERHEART.CHAT.DR.invalidAdvantage', { formula: params.advantage }));
    }
    
    if (params.disadvantage && !validateAdvantageFormula(params.disadvantage)) {
        errors.push(game.i18n.format('DAGGERHEART.CHAT.DR.invalidDisadvantage', { formula: params.disadvantage }));
    }
    
    return errors;
}

export function createDualityRollLink(params, label = null) {
    const parts = [];
    
    if (params.trait) parts.push(`trait=${params.trait}`);
    if (params.hope) parts.push(`hope=${params.hope}`);
    if (params.fear) parts.push(`fear=${params.fear}`);
    if (params.modifier) parts.push(`modifier=${params.modifier}`);
    if (params.advantage) parts.push(`advantage=${params.advantage}`);
    if (params.disadvantage) parts.push(`disadvantage=${params.disadvantage}`);
    if (params.reaction) parts.push('reaction=true');
    if (params.messageType && params.messageType !== 'public') parts.push(`messageType=${params.messageType}`);
    
    const formula = parts.join(' ');
    const finalLabel = label || (params.trait ? `${params.trait} Check` : 'Duality Roll');
    
    return `[[/dr ${formula}]]{${finalLabel}}`;
}
