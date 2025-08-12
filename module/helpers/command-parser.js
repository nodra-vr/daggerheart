export function parseDualityCommand(text) {
	if (!text) return {};

	const PAIR_RE = /(\w+)=("(?:[^"\\]|\\.)*"|\S+)/g;
	const result = {};

	for (const [, key, raw] of text.matchAll(PAIR_RE)) {
		let value;
		if (raw.startsWith('"') && raw.endsWith('"')) {
			value = raw.slice(1, -1).replace(/\\"/g, '"');
		} else if (/^(true|false)$/i.test(raw)) {
			value = raw.toLowerCase() === 'true';
		} else if (!Number.isNaN(Number(raw))) {
			value = Number(raw);
		} else {
			value = raw;
		}
		result[key] = value;
	}

	return Object.keys(result).length > 0 ? result : null;
}

export function validateTrait(traitName) {
	const validTraits = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
	return validTraits.includes(traitName.toLowerCase());
}

export function validateDieSize(dieSize) {
	if (!dieSize || typeof dieSize !== 'string') return false;
	const validDieSizes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
	return validDieSizes.includes(dieSize.toLowerCase());
}

export function validateAdvantageFormula(formula) {
	if (!formula) return true;
	const formulaPattern = /^\d*d\d+$/;
	return formulaPattern.test(formula.toLowerCase());
}
