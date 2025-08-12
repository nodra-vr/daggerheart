export class EquipmentHandler {
	/**
	 * Get all equipped weapons for an actor
	 * @param {foundry.documents.Actor} actor - The actor to check
	 * @returns {foundry.documents.Item[]} Array of equipped weapon items
	 * @static
	 */
	static getEquippedWeapons(actor) {
		return actor.items.filter(
			item => item.type === 'weapon' && foundry.utils.getProperty(item, 'system.equipped') === true
		);
	}

	/**
	 * Get the primary weapon (weapon assigned to primary slot)
	 * @param {foundry.documents.Actor} actor - The actor to check
	 * @returns {foundry.documents.Item|null} The primary weapon item or null
	 * @static
	 */
	static getPrimaryWeapon(actor) {
		return (
			actor.items.find(
				item =>
					item.type === 'weapon' &&
					foundry.utils.getProperty(item, 'system.equipped') === true &&
					foundry.utils.getProperty(item, 'system.weaponSlot') === 'primary'
			) || null
		);
	}

	/**
	 * Get the secondary weapon (weapon assigned to secondary slot)
	 * @param {foundry.documents.Actor} actor - The actor to check
	 * @returns {foundry.documents.Item|null} The secondary weapon item or null
	 * @static
	 */
	static getSecondaryWeapon(actor) {
		return (
			actor.items.find(
				item =>
					item.type === 'weapon' &&
					foundry.utils.getProperty(item, 'system.equipped') === true &&
					foundry.utils.getProperty(item, 'system.weaponSlot') === 'secondary'
			) || null
		);
	}

	/**
	 * Equip a weapon to the primary slot
	 * @param {foundry.documents.Actor} actor - The actor
	 * @param {foundry.documents.Item} weapon - The weapon to equip
	 * @returns {Promise<boolean>} Success status
	 * @static
	 */
	static async equipPrimaryWeapon(actor, weapon) {
		// Re-route to the shared equip helper
		return this._equip(actor, weapon, 'primary');
	}

	/**
	 * Equip a weapon to the secondary slot
	 * @param {foundry.documents.Actor} actor - The actor
	 * @param {foundry.documents.Item} weapon - The weapon to equip
	 * @returns {Promise<boolean>} Success status
	 * @static
	 */
	static async equipSecondaryWeapon(actor, weapon) {
		// Re-route to the shared equip helper
		return this._equip(actor, weapon, 'secondary');
	}

	// slot keys
	static MAIN = 'weapon-main'; // main
	static OFF = 'weapon-off'; // off

	// helper – quick deep compare using JSON (good enough for our small structures)
	static _same(a, b) {
		return JSON.stringify(a) === JSON.stringify(b);
	} // compare

	/**
	 * Shared implementation used by both slot handlers.
	 * Handles the two-weapon limit and slot transitions.
	 * @private
	 * @param {foundry.documents.Actor} actor
	 * @param {foundry.documents.Item} weapon
	 * @param {"primary"|"secondary"} slot
	 */
	static async _equip(actor, weapon, slot) {
		if (!weapon || weapon.type !== 'weapon') {
			ui.notifications.error(game.i18n?.localize?.('DH.InvalidWeapon') ?? 'Invalid weapon');
			return false;
		}

		// Enforce the two-weapon limit (ignoring the weapon we might be re-assigning)
		const otherEquipped = this.getEquippedWeapons(actor).filter(w => w.id !== weapon.id);
		const isCurrentlyEquipped = weapon.system?.equipped === true;
		const currentSlotWeapon = slot === 'primary' ? this.getPrimaryWeapon(actor) : this.getSecondaryWeapon(actor);

		// Only enforce the limit if we're not replacing a weapon in the target slot
		if (!isCurrentlyEquipped && !currentSlotWeapon && otherEquipped.length >= 2) {
			ui.notifications.warn(game.i18n?.localize?.('DH.MaxTwoWeapons') ?? 'You can only equip two weapons at a time.');
			return false;
		}

		try {
			// Toggle off if the weapon is already in that slot
			if (currentSlotWeapon && currentSlotWeapon.id === weapon.id) {
				await weapon.update({ 'system.equipped': false, 'system.weaponSlot': null });
				await this.updateWeaponSlots(actor);
				ui.notifications.info(`${weapon.name} unequipped from ${slot} slot`);
				return true;
			}

			// Unequip whatever is currently occupying the slot
			const itemUpdates = [];
			if (currentSlotWeapon) {
				itemUpdates.push({ _id: currentSlotWeapon.id, 'system.equipped': false, 'system.weaponSlot': null });
			}

			// If the weapon is equipped in the opposite slot just change the slot property;
			// otherwise equip it fresh.
			if (isCurrentlyEquipped) {
				itemUpdates.push({ _id: weapon.id, 'system.weaponSlot': slot });
			} else {
				itemUpdates.push({ _id: weapon.id, 'system.equipped': true, 'system.weaponSlot': slot });
			}

			// batch
			if (itemUpdates.length) await actor.updateEmbeddedDocuments('Item', itemUpdates);
			await this.updateWeaponSlots(actor);
			ui.notifications.info(`${weapon.name} equipped as ${slot} weapon`);
			return true;
		} catch (error) {
			console.error('Failed to equip weapon:', error);
			ui.notifications.error(`Failed to equip ${weapon.name}`);
			return false;
		}
	}

	/**
	 * Legacy method for backward compatibility - now defaults to primary
	 * @param {foundry.documents.Actor} actor - The actor
	 * @param {foundry.documents.Item} weapon - The weapon to toggle
	 * @returns {Promise<boolean>} Success status
	 * @static
	 */
	static async toggleWeaponEquip(actor, weapon) {
		// For backward compatibility, default to primary slot
		return this.equipPrimaryWeapon(actor, weapon);
	}

	/**
	 * Get the equipped slot for a specific weapon
	 * @param {foundry.documents.Actor} actor - The actor to check
	 * @param {foundry.documents.Item} weapon - The weapon to check
	 * @returns {string|null} - 'primary', 'secondary', or null if not equipped
	 * @static
	 */
	static getWeaponEquippedSlot(actor, weapon) {
		if (!weapon || weapon.type !== 'weapon' || !foundry.utils.getProperty(weapon, 'system.equipped')) {
			return null;
		}

		return foundry.utils.getProperty(weapon, 'system.weaponSlot') || null;
	}

	/**
	 * Get weapon display data for the actor sheet
	 * @param {foundry.documents.Actor} actor - The actor
	 * @returns {Object} Object with primary and secondary weapon data
	 * @static
	 */
	static getWeaponDisplayData(actor) {
		const primaryWeapon = this.getPrimaryWeapon(actor);
		const secondaryWeapon = this.getSecondaryWeapon(actor);

		return {
			primary: {
				name: primaryWeapon ? primaryWeapon.name : 'Primary Weapon',
				weapon: primaryWeapon,
				hasWeapon: !!primaryWeapon,
			},
			secondary: {
				name: secondaryWeapon ? secondaryWeapon.name : 'Secondary Weapon',
				weapon: secondaryWeapon,
				hasWeapon: !!secondaryWeapon,
			},
		};
	}

	/**
	 * Get the complete weapon damage formula (all weapon modifiers combined)
	 * @param {foundry.documents.Item} weapon - The weapon item
	 * @param {foundry.documents.Actor} actor - The actor (for @prof processing)
	 * @returns {string} - Complete weapon damage formula
	 * @static
	 */
	static getWeaponTotalDamage(weapon, actor) {
		if (!weapon || weapon.type !== 'weapon') {
			return '1d8';
		}

		// Get the weapon's damage data
		const weaponDamage = foundry.utils.getProperty(weapon, 'system.damage');

		let weaponFormula = '1d8';
		let weaponModifiers = [];

		if (typeof weaponDamage === 'object' && weaponDamage !== null) {
			// Structured damage system
			weaponFormula = weaponDamage.baseValue || weaponDamage.value || '1d8';
			weaponModifiers = Array.isArray(weaponDamage.modifiers) ? weaponDamage.modifiers : [];
		} else if (typeof weaponDamage === 'string' && weaponDamage.trim()) {
			// Simple string damage
			weaponFormula = weaponDamage.trim();
		}

		// Process inline references like @prof
		const { EntitySheetHelper } = globalThis.daggerheart || {};
		if (EntitySheetHelper) {
			try {
				weaponFormula = EntitySheetHelper.processInlineReferences(weaponFormula, actor);
			} catch (error) {
				console.warn('Daggerheart | Error processing inline references:', error);
			}
		}

		// Combine weapon base + weapon modifiers into single formula
		let totalWeaponDamage = weaponFormula;
		if (weaponModifiers.length > 0) {
			const enabledModifiers = weaponModifiers.filter(mod => mod.enabled !== false);
			if (enabledModifiers.length > 0) {
				const modifierStrings = enabledModifiers.map(mod => mod.value || mod.name || mod).filter(v => v);
				if (modifierStrings.length > 0) {
					totalWeaponDamage = `${weaponFormula} + ${modifierStrings.join(' + ')}`;
				}
			}
		}

		// console.log(`Daggerheart | Weapon ${weapon.name} total damage: ${totalWeaponDamage}`);
		return totalWeaponDamage;
	}

	/**
	 * Get the weapon's attack trait value from the actor
	 * @param {foundry.documents.Item} weapon - The weapon item
	 * @param {foundry.documents.Actor} actor - The actor
	 * @returns {number} - The trait value for attack rolls
	 * @static
	 */
	static getWeaponTraitValue(weapon, actor) {
		if (!weapon || weapon.type !== 'weapon') {
			return 0;
		}

		const traitName = foundry.utils.getProperty(weapon, 'system.trait');
		if (!traitName) {
			return 0;
		}

		const traitValue = foundry.utils.getProperty(actor, `system.${traitName}.value`) ?? 0;
		// console.log(`Daggerheart | Weapon ${weapon.name} trait ${traitName}: ${traitValue}`);
		return traitValue;
	}

	/**
	 * Get dynamically resolved weapon data for a slot
	 * @param {foundry.documents.Actor} actor - The actor
	 * @param {string} slot - Either "primary" or "secondary"
	 * @returns {Object} - Weapon data with calculated damage and to-hit
	 * @static
	 */
	static getDynamicWeaponData(actor, slot) {
		const weapon = slot === 'primary' ? this.getPrimaryWeapon(actor) : this.getSecondaryWeapon(actor);
		const slotKey = slot === 'primary' ? this.MAIN : this.OFF;

		if (!weapon) {
			// No weapon equipped - preserve any existing player-entered values instead of resetting
			const currentData = foundry.utils.getProperty(actor, `system.${slotKey}`) || {};

			// Resolve previously saved base values (falling back to sensible defaults)
			const dmgBase = currentData.damage?.baseValue ?? currentData.damage?.value ?? '1d8';
			const hitBase = currentData['to-hit']?.baseValue ?? currentData['to-hit']?.value ?? 0;
			const dmgMods = Array.isArray(currentData.damage?.modifiers) ? currentData.damage.modifiers : [];
			const hitMods = Array.isArray(currentData['to-hit']?.modifiers) ? currentData['to-hit'].modifiers : [];

			return {
				name: currentData.name ?? '',
				weaponId: null,
				damage: {
					baseValue: dmgBase,
					modifiers: dmgMods,
					value: this._calculateTotal(dmgBase, dmgMods),
				},
				'to-hit': {
					baseValue: hitBase,
					modifiers: hitMods,
					value: this._calculateTotal(hitBase, hitMods),
				},
			};
		}

		// Weapon equipped - weapon total becomes base value, character modifiers preserved
		const currentData = foundry.utils.getProperty(actor, `system.${slotKey}`) || {};
		const weaponTotalDamage = this.getWeaponTotalDamage(weapon, actor);
		const weaponTraitValue = this.getWeaponTraitValue(weapon, actor);

		// Preserve existing character modifiers (spells, blessings, etc.)
		const characterDamageModifiers = currentData.damage?.modifiers || [];
		const characterAttackModifiers = currentData['to-hit']?.modifiers || [];

		return {
			name: weapon.name,
			weaponId: weapon.id,
			damage: {
				baseValue: weaponTotalDamage, // Complete weapon damage as base
				modifiers: characterDamageModifiers, // Character bonuses only
				value: this._calculateTotal(weaponTotalDamage, characterDamageModifiers),
			},
			'to-hit': {
				baseValue: weaponTraitValue, // Weapon trait value as base
				modifiers: characterAttackModifiers, // Character bonuses only
				value: this._calculateTotal(weaponTraitValue, characterAttackModifiers),
			},
		};
	}

	/**
	 * Calculate total value from base + modifiers
	 * @param {string|number} baseValue - The base value
	 * @param {Array} modifiers - Array of modifier objects
	 * @returns {string|number} - Calculated total
	 * @private
	 * @static
	 */
	static _calculateTotal(baseValue, modifiers) {
		if (!modifiers || modifiers.length === 0) return baseValue; // no mods
		const enabled = modifiers.filter(m => m.enabled !== false);
		if (!enabled.length) return baseValue;

		if (typeof baseValue === 'number') {
			const modSum = enabled.reduce((t, m) => t + (parseInt(m.value || m.modifier || m) || 0), 0);
			return baseValue + modSum;
		}

		// stringify mods – strip leading +/- then join once
		const parts = enabled
			.map(m => `${m.value || m.name || m}`.trim())
			.filter(Boolean)
			.map(v => v.replace(/^([+\-])?/, '+$1' === '+$1' ? v.slice(1) : v));
		return parts.length ? `${baseValue} + ${parts.join(' + ')}` : baseValue;
	}

	/**
	 * Update the actor's weapon slots with current equipped weapon data
	 * This replaces the complex baseValue system with simple data updates
	 * @param {foundry.documents.Actor} actor - The actor to update
	 * @returns {Promise<void>}
	 * @static
	 */
	static async updateWeaponSlots(actor) {
		const primary = this.getDynamicWeaponData(actor, 'primary');
		const secondary = this.getDynamicWeaponData(actor, 'secondary');

		const curP = actor.system?.[this.MAIN];
		const curS = actor.system?.[this.OFF];
		if (this._same(primary, curP) && this._same(secondary, curS)) return; // no change

		await actor.update({ [`system.${this.MAIN}`]: primary, [`system.${this.OFF}`]: secondary });
	}

	// ---------------------------------------------
	// COMPATIBILITY SHIM
	// ---------------------------------------------
	/**
	 * Legacy helper kept for backwards-compatibility.
	 * Simply forwards to updateWeaponSlots.
	 * @deprecated – use updateWeaponSlots instead.
	 */
	static async syncEquippedWeapons(actor /*, sheet */) {
		return this.updateWeaponSlots(actor);
	}
}
