import { ModifierManager } from './modifierManager.js';

export class ArmorCleanup {

  static async cleanupActor(actor) {
    if (!actor) {
      return { success: false, error: "Invalid actor" };
    }

    const results = {
      success: true,
      actorName: actor.name,
      actorId: actor.id,
      fieldsProcessed: 0,
      modifiersRemoved: 0,
      errors: []
    };

    try {
      const fields = [
        'system.threshold.major',
        'system.threshold.severe', 
        'system.defenses.armor'
      ];

      for (const fieldPath of fields) {
        const fieldResult = await this._cleanupField(actor, fieldPath);
        results.fieldsProcessed++;
        results.modifiersRemoved += fieldResult.removed;

        if (fieldResult.errors.length > 0) {
          results.errors.push(...fieldResult.errors);
        }
      }

      console.log(`ArmorCleanup | Cleaned up ${results.modifiersRemoved} duplicate modifiers from ${actor.name}`);

    } catch (error) {
      results.success = false;
      results.errors.push(`Cleanup failed: ${error.message}`);
      console.error("ArmorCleanup | Error during cleanup:", error);
    }

    return results;
  }

  static async cleanupAllActors() {
    const results = {
      success: true,
      totalActors: 0,
      processedActors: 0,
      totalModifiersRemoved: 0,
      actorResults: [],
      errors: []
    };

    try {
      const actors = game.actors.filter(actor => actor.type === 'character');
      results.totalActors = actors.length;

      for (const actor of actors) {
        const actorResult = await this.cleanupActor(actor);
        results.actorResults.push(actorResult);
        results.processedActors++;

        if (actorResult.success) {
          results.totalModifiersRemoved += actorResult.modifiersRemoved;
        } else {
          results.errors.push(`Failed to process ${actor.name}: ${actorResult.errors.join(', ')}`);
        }
      }

      console.log(`ArmorCleanup | Processed ${results.processedActors} actors, removed ${results.totalModifiersRemoved} duplicate modifiers`);

    } catch (error) {
      results.success = false;
      results.errors.push(`Global cleanup failed: ${error.message}`);
      console.error("ArmorCleanup | Error during global cleanup:", error);
    }

    return results;
  }

  static async _cleanupField(actor, fieldPath) {
    const result = {
      fieldPath,
      removed: 0,
      errors: []
    };

    try {
      const currentData = foundry.utils.getProperty(actor, fieldPath);

      if (!currentData || !currentData.modifiers || !Array.isArray(currentData.modifiers)) {
        return result;
      }

      const modifiers = currentData.modifiers;
      const armorModifiers = modifiers.filter(mod => 
        mod.name && (
          mod.name.toLowerCase().includes('armor') ||
          mod.name.toLowerCase().includes('chainmail') ||
          mod.name.toLowerCase().includes('leather') ||
          mod.name.toLowerCase().includes('plate') ||
          mod.name.toLowerCase().includes('mail')
        )
      );

      if (armorModifiers.length <= 1) {
        return result;
      }

      const duplicateGroups = this._groupByName(armorModifiers);

      for (const [name, duplicates] of Object.entries(duplicateGroups)) {
        if (duplicates.length > 1) {
          const toRemove = duplicates.slice(1);

          for (const duplicate of toRemove) {
            try {
              if (duplicate.id) {
                await ModifierManager.removeModifierByIdDirect(actor, duplicate.id, true);
              } else {
                await ModifierManager.removeModifier(actor, fieldPath, duplicate.name, true);
              }
              result.removed++;
            } catch (error) {
              result.errors.push(`Failed to remove ${duplicate.name}: ${error.message}`);
            }
          }
        }
      }

    } catch (error) {
      result.errors.push(`Field processing error: ${error.message}`);
    }

    return result;
  }

  static _groupByName(modifiers) {
    const groups = {};

    for (const modifier of modifiers) {
      const name = modifier.name || 'Unknown';
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(modifier);
    }

    return groups;
  }

  static analyzeActor(actor) {
    if (!actor) {
      return { success: false, error: "Invalid actor" };
    }

    const analysis = {
      actorName: actor.name,
      actorId: actor.id,
      fields: {},
      totalDuplicates: 0
    };

    const fields = [
      'system.threshold.major',
      'system.threshold.severe',
      'system.defenses.armor'
    ];

    for (const fieldPath of fields) {
      const currentData = foundry.utils.getProperty(actor, fieldPath);

      if (!currentData || !currentData.modifiers || !Array.isArray(currentData.modifiers)) {
        analysis.fields[fieldPath] = { modifiers: 0, duplicates: 0, names: [] };
        continue;
      }

      const modifiers = currentData.modifiers;
      const armorModifiers = modifiers.filter(mod => 
        mod.name && (
          mod.name.toLowerCase().includes('armor') ||
          mod.name.toLowerCase().includes('chainmail') ||
          mod.name.toLowerCase().includes('leather') ||
          mod.name.toLowerCase().includes('plate') ||
          mod.name.toLowerCase().includes('mail')
        )
      );

      const duplicateGroups = this._groupByName(armorModifiers);
      const duplicateCount = Object.values(duplicateGroups)
        .reduce((sum, group) => sum + Math.max(0, group.length - 1), 0);

      analysis.fields[fieldPath] = {
        modifiers: armorModifiers.length,
        duplicates: duplicateCount,
        names: Object.keys(duplicateGroups)
      };

      analysis.totalDuplicates += duplicateCount;
    }

    return analysis;
  }
}

globalThis.ArmorCleanup = ArmorCleanup;

if (typeof globalThis.daggerheart === "undefined") {
  globalThis.daggerheart = {};
}
globalThis.daggerheart.ArmorCleanup = ArmorCleanup;