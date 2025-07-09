export function createEmptyAdvantageSet() {
  return {
    d4: 0,
    d6: 0,
    d8: 0,
    d10: 0
  };
}

export function validateAdvantageSet(advantageSet) {
  if (!advantageSet || typeof advantageSet !== 'object') {
    return false;
  }
  
  const dieTypes = ['d4', 'd6', 'd8', 'd10'];
  for (const dieType of dieTypes) {
    const value = advantageSet[dieType];
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
      return false;
    }
  }
  
  return true;
}

export function convertLegacyFormat(value) {
  if (typeof value !== 'number' || value < 0) {
    return createEmptyAdvantageSet();
  }
  
  return {
    d4: 0,
    d6: Math.floor(value),
    d8: 0,
    d10: 0
  };
}

export function normalizeAdvantageData(input) {
  if (input == null) {
    return createEmptyAdvantageSet();
  }
  
  if (typeof input === 'number') {
    return convertLegacyFormat(input);
  }
  
  if (typeof input === 'object') {
    const normalized = createEmptyAdvantageSet();
    const dieTypes = ['d4', 'd6', 'd8', 'd10'];
    
    for (const dieType of dieTypes) {
      if (typeof input[dieType] === 'number' && input[dieType] >= 0) {
        normalized[dieType] = Math.floor(input[dieType]);
      }
    }
    
    return normalized;
  }
  
  return createEmptyAdvantageSet();
}

export function getTotalDiceCount(advantageSet) {
  const dieTypes = ['d4', 'd6', 'd8', 'd10'];
  return dieTypes.reduce((total, dieType) => total + (advantageSet[dieType] || 0), 0);
}

export function calculateFinalDice(advantage, disadvantage) {
  const normalizedAdvantage = normalizeAdvantageData(advantage);
  const normalizedDisadvantage = normalizeAdvantageData(disadvantage);
  
  const finalAdvantage = { ...normalizedAdvantage };
  const remainingDisadvantage = { ...normalizedDisadvantage };
  
  const dieTypes = ['d4', 'd6', 'd8', 'd10'];
  
  for (const dieType of dieTypes) {
    const cancelled = Math.min(finalAdvantage[dieType], remainingDisadvantage[dieType]);
    finalAdvantage[dieType] -= cancelled;
    remainingDisadvantage[dieType] -= cancelled;
  }
  
  const totalRemainingDisadvantage = getTotalDiceCount(remainingDisadvantage);
  let toCancel = totalRemainingDisadvantage;
  
  for (const dieType of dieTypes) {
    if (toCancel <= 0) break;
    
    const cancelled = Math.min(finalAdvantage[dieType], toCancel);
    finalAdvantage[dieType] -= cancelled;
    toCancel -= cancelled;
  }
  
  return finalAdvantage;
}

export function generateAdvantageFormula(advantageSet) {
  const normalized = normalizeAdvantageData(advantageSet);
  const diceParts = [];
  const dieTypes = ['d4', 'd6', 'd8', 'd10'];
  
  for (const dieType of dieTypes) {
    const count = normalized[dieType];
    if (count > 0) {
      diceParts.push(`${count}${dieType}`);
    }
  }
  
  if (diceParts.length === 0) {
    return '';
  } else if (diceParts.length === 1) {
    return ` + ${diceParts[0]}kh`;
  } else {
    return ` + {${diceParts.join(', ')}}kh`;
  }
}

export function getAdvantageDescription(advantageSet) {
  const normalized = normalizeAdvantageData(advantageSet);
  const parts = [];
  const dieTypes = ['d4', 'd6', 'd8', 'd10'];
  
  for (const dieType of dieTypes) {
    const count = normalized[dieType];
    if (count > 0) {
      parts.push(`${count}${dieType}`);
    }
  }
  
  if (parts.length === 0) {
    return 'No advantage';
  }
  
  return parts.join(', ') + ' advantage';
}

export function cloneAdvantageSet(advantageSet) {
  const normalized = normalizeAdvantageData(advantageSet);
  return { ...normalized };
}

export function addDice(advantageSet, dieType, count = 1) {
  const normalized = normalizeAdvantageData(advantageSet);
  const result = { ...normalized };
  
  if (['d4', 'd6', 'd8', 'd10'].includes(dieType) && typeof count === 'number' && count > 0) {
    result[dieType] = Math.max(0, result[dieType] + Math.floor(count));
  }
  
  return result;
}

export function removeDice(advantageSet, dieType, count = 1) {
  const normalized = normalizeAdvantageData(advantageSet);
  const result = { ...normalized };
  
  if (['d4', 'd6', 'd8', 'd10'].includes(dieType) && typeof count === 'number' && count > 0) {
    result[dieType] = Math.max(0, result[dieType] - Math.floor(count));
  }
  
  return result;
}

export function calculateNetResult(advantage, disadvantage) {
  const normalizedAdvantage = normalizeAdvantageData(advantage);
  const normalizedDisadvantage = normalizeAdvantageData(disadvantage);
  
  const workingAdvantage = { ...normalizedAdvantage };
  const workingDisadvantage = { ...normalizedDisadvantage };
  
  const dieTypes = ['d4', 'd6', 'd8', 'd10'];
  
  for (const dieType of dieTypes) {
    const cancelled = Math.min(workingAdvantage[dieType], workingDisadvantage[dieType]);
    workingAdvantage[dieType] -= cancelled;
    workingDisadvantage[dieType] -= cancelled;
  }
  
  let totalRemainingDisadvantage = getTotalDiceCount(workingDisadvantage);
  let totalDisadvantageCancelled = 0;
  
  for (const dieType of dieTypes) {
    if (totalRemainingDisadvantage <= 0) break;
    
    const cancelled = Math.min(workingAdvantage[dieType], totalRemainingDisadvantage);
    workingAdvantage[dieType] -= cancelled;
    totalRemainingDisadvantage -= cancelled;
    totalDisadvantageCancelled += cancelled;
  }
  
  let toReduceDisadvantage = totalDisadvantageCancelled;
  for (const dieType of dieTypes) {
    if (toReduceDisadvantage <= 0) break;
    
    const reduction = Math.min(workingDisadvantage[dieType], toReduceDisadvantage);
    workingDisadvantage[dieType] -= reduction;
    toReduceDisadvantage -= reduction;
  }
  
  let totalRemainingAdvantage = getTotalDiceCount(workingAdvantage);
  let totalAdvantageCancelled = 0;
  
  for (const dieType of dieTypes) {
    if (totalRemainingAdvantage <= 0) break;
    
    const cancelled = Math.min(workingDisadvantage[dieType], totalRemainingAdvantage);
    workingDisadvantage[dieType] -= cancelled;
    totalRemainingAdvantage -= cancelled;
    totalAdvantageCancelled += cancelled;
  }
  
  let toReduceAdvantage = totalAdvantageCancelled;
  for (const dieType of dieTypes) {
    if (toReduceAdvantage <= 0) break;
    
    const reduction = Math.min(workingAdvantage[dieType], toReduceAdvantage);
    workingAdvantage[dieType] -= reduction;
    toReduceAdvantage -= reduction;
  }
  
  return {
    advantage: workingAdvantage,
    disadvantage: workingDisadvantage
  };
}

export function generateDisadvantageFormula(disadvantageSet) {
  const normalized = normalizeAdvantageData(disadvantageSet);
  const diceParts = [];
  const dieTypes = ['d4', 'd6', 'd8', 'd10'];
  
  for (const dieType of dieTypes) {
    const count = normalized[dieType];
    if (count > 0) {
      diceParts.push(`${count}${dieType}`);
    }
  }
  
  if (diceParts.length === 0) {
    return '';
  } else if (diceParts.length === 1) {
    return ` - ${diceParts[0]}kh`;
  } else {
    return ` - {${diceParts.join(', ')}}kh`;
  }
}