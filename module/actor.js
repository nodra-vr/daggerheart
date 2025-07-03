import { EntitySheetHelper } from "./helper.js";

/**
 * Extend the base Actor document to support attributes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class SimpleActor extends Actor {

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Initialize missing properties with defaults
    this.system.health = this.system.health || { value: 6, min: 0, max: 6 };
    this.system.stress = this.system.stress || { value: 0, min: 0, max: 6 };
    this.system.defenses = this.system.defenses || { 
      armor: { value: 0 }, 
      'armor-slots': { value: 0 } 
    };
    this.system.groups = this.system.groups || {};
    this.system.attributes = this.system.attributes || {};
    
    // Ensure nested properties exist
    if (!this.system.defenses.armor) this.system.defenses.armor = { value: 0 };
    if (!this.system.defenses['armor-slots']) this.system.defenses['armor-slots'] = { value: 0 };
    
    // Enforce min/max constraints for health, stress, and hope
    if (this.system.health?.value !== undefined) {
      this.system.health.value = Math.max(0, Math.min(this.system.health.value, this.system.health.max || 0));
    }
    if (this.system.stress?.value !== undefined) {
      this.system.stress.value = Math.max(0, Math.min(this.system.stress.value, this.system.stress.max || 0));
    }
    if (this.system.hope?.value !== undefined) {
      this.system.hope.value = Math.max(0, Math.min(this.system.hope.value, this.system.hope.max || 0));
    }
    
    this.system.barHealth = {
      max: this.system.health.max || 6,
      min: 0,
      value: (this.system.health.max || 6) - (this.system.health.value || 0)
    };
    this.system.barStress = {
      max: this.system.stress.max || 6,
      min: 0,
      value: (this.system.stress.max || 6) - (this.system.stress.value || 0)
    };
    this.system.barArmor = {
      max: this.system.defenses.armor.value || 0,
      min: 0,
      value: (this.system.defenses.armor.value || 0) - (this.system.defenses['armor-slots'].value || 0)
    }
    
    EntitySheetHelper.clampResourceValues(this.system.attributes);
  }

  /* -------------------------------------------- */

  /**
   * Schedule an update to the dead state (debounced to avoid rapid calls)
   * @private
   */
  _scheduleDeadStateUpdate() {
    if (this._deadStateTimeout) {
      return;
    }
    this._deadStateTimeout = setTimeout(() => {
      this._deadStateTimeout = null;
      this._handleDeadState();
    }, 250); // Small delay to batch multiple updates
  }

  /* -------------------------------------------- */

  /**
   * Handle the dying/dead state by applying status effects and token tinting
   * @private
   */
  async _handleDeadState() {
    if (!game.user.isGM) {
      return
    }
    // Check if actor is dying/dead (hit points maxed out)
    const health = this.system.health;
    const isDying = health && health.value === health.max && health.max > 0;
    
    // Get the dead status effect
    const deadEffect = CONFIG.statusEffects.find(e => e.id === "dead");
    if (!deadEffect) return; // No dead effect configured
    
    // Check if actor currently has the dead effect
    const hasDeadEffect = this.effects.some(e => e.statuses.has("dead"));
    
    // Apply or remove dead effect based on dying state
    if (isDying && !hasDeadEffect) {
      // Apply dead status effect
      await this.createEmbeddedDocuments("ActiveEffect", [{
        name: game.i18n.localize(deadEffect.name) || "Dead",
        img: deadEffect.img || "icons/svg/skull.svg",
        statuses: ["dead"],
        flags: {
          core: {
            statusId: "dead",
            overlay: true
          }
        }
      }]);
    } else if (!isDying && hasDeadEffect) {
      // Remove dead status effect
      const deadEffectToRemove = this.effects.find(e => e.statuses.has("dead"));
      if (deadEffectToRemove) {
        await deadEffectToRemove.delete();
      }
    }
    
    // Handle token tinting for all associated tokens
    const tokens = this.getActiveTokens();
    for (const token of tokens) {
      if (isDying) {
        // Apply red tint (0x8B0000 is dark red)
        await token.document.update({ tint: "#8B0000" });
      } else {
        // Remove tint (restore to default)
        await token.document.update({ tint: null });
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    
    // Check if health values changed and handle dead state accordingly
    if (changed.system?.health) {
      this._scheduleDeadStateUpdate();
    }
  }

  /* -------------------------------------------- */

  /** @override */
  static async createDialog(data={}, options={}) {
    return EntitySheetHelper.createDialog.call(this, data, options);
  }

  /* -------------------------------------------- */

  /**
   * Is this Actor used as a template for other Actors?
   * @type {boolean}
   */
  get isTemplate() {
    return !!this.getFlag("daggerheart", "isTemplate");
  }

  /* -------------------------------------------- */
  /*  Roll Data Preparation                       */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getRollData() {

    // Copy the actor's system data
    const data = this.toObject(false).system;
    const shorthand = game.settings.get("daggerheart", "macroShorthand");
    const formulaAttributes = [];
    const itemAttributes = [];

    // Add tier of play as a computed property
    if (game.daggerheart && game.daggerheart.getTierOfPlay) {
      data.tier = game.daggerheart.getTierOfPlay(this);
    } else {
      // Fallback tier calculation if function not available
      const level = parseInt(data.level?.value) || 1;
      if (level === 1) data.tier = 1;
      else if (level >= 2 && level <= 4) data.tier = 2;
      else if (level >= 5 && level <= 7) data.tier = 3;
      else if (level >= 8 && level <= 10) data.tier = 4;
      else data.tier = 1;
    }

    // Add commonly used properties for inline rolls
    // Proficiency - the main request from the issue
    data.prof = Math.max(1, parseInt(data.proficiency?.value) || 1);
    data.proficiency_value = data.prof; // Alternative syntax

    // Level for easy access
    data.lvl = Math.max(1, parseInt(data.level?.value) || 1);
    data.level_value = data.lvl; // Alternative syntax

    // Core attributes for inline rolls
    data.agi = parseInt(data.agility?.value) || 0;
    data.str = parseInt(data.strength?.value) || 0;
    data.fin = parseInt(data.finesse?.value) || 0;
    data.ins = parseInt(data.instinct?.value) || 0;
    data.pre = parseInt(data.presence?.value) || 0;
    data.kno = parseInt(data.knowledge?.value) || 0;
    data.exp = parseInt(data.exp?.value) || 0;

    // Health and stress values
    data.hp = Math.max(0, parseInt(data.health?.value) || 0);
    data.hp_max = Math.max(1, parseInt(data.health?.max) || 6);
    data.stress_value = Math.max(0, parseInt(data.stress?.value) || 0);
    data.stress_max = Math.max(1, parseInt(data.stress?.max) || 6);
    data.hope_value = Math.max(0, parseInt(data.hope?.value) || 0);
    data.hope_max = Math.max(1, parseInt(data.hope?.max) || 5);

    // Defense values
    data.evasion = Math.max(0, parseInt(data.defenses?.evasion?.value) || 10);
    data.armor = Math.max(0, parseInt(data.defenses?.armor?.value) || 0);
    data.armor_slots = Math.max(0, parseInt(data.defenses?.['armor-slots']?.value) || 0);
    data.severe = Math.max(0, parseInt(data.threshold?.severe) || 0);
    data.major = Math.max(0, parseInt(data.threshold?.major) || 0);

    // Add tracker values for formula access
    if (data.resourceTrackers && Array.isArray(data.resourceTrackers)) {
      data.trackers = {};
      data.tracker = {}; // Alternative syntax
      
      for (const tracker of data.resourceTrackers) {
        if (tracker.name) {
          // Create safe key names for formula access
          const safeKey = tracker.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (safeKey) {
            data.trackers[safeKey] = tracker.value || 0;
            data.tracker[safeKey] = tracker.value || 0;
            
            // Also allow access by exact name if it's a valid identifier
            if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(tracker.name)) {
              data.trackers[tracker.name] = tracker.value || 0;
              data.tracker[tracker.name] = tracker.value || 0;
            }
          }
        }
      }
    }

    // shorthand formulas
    this._applyShorthand(data, formulaAttributes, shorthand);

    // item data mapping
    this._applyItems(data, itemAttributes, shorthand);

    // item formula replacements
    this._applyItemsFormulaReplacements(data, itemAttributes, shorthand);

    // formula replacements
    this._applyFormulaReplacements(data, formulaAttributes, shorthand);

    // cleanup attributes
    if ( !!shorthand ) {
      delete data.attributes;
      delete data.attr;
      delete data.groups;
    }
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Apply shorthand syntax to actor roll data.
   * @param {Object} data The actor's data object.
   * @param {Array} formulaAttributes Array of attributes that are derived formulas.
   * @param {Boolean} shorthand Whether or not the shorthand syntax is used.
   */
  _applyShorthand(data, formulaAttributes, shorthand) {
    // formula attrs processing
    for ( let [k, v] of Object.entries(data.attributes || {}) ) {
      // formula array
      if ( v.dtype === "Formula" ) formulaAttributes.push(k);
      // shorthand attrs
      if ( !!shorthand ) {
        if ( !(k in data) ) {
          // non-grouped
          if ( v.dtype ) {
            data[k] = v.value;
          }
          // grouped
          else {
            data[k] = {};
            for ( let [gk, gv] of Object.entries(v) ) {
              data[k][gk] = gv.value;
              if ( gv.dtype === "Formula" ) formulaAttributes.push(`${k}.${gk}`);
            }
          }
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Add items to the actor roll data object. Handles regular and shorthand
   * syntax, and calculates derived formula attributes on the items.
   * @param {Object} data The actor's data object.
   * @param {string[]} itemAttributes
   * @param {Boolean} shorthand Whether or not the shorthand syntax is used.
   */
  _applyItems(data, itemAttributes, shorthand) {
    // Map all items data using their slugified names
    data.items = this.items.reduce((obj, item) => {
      const key = item.name.slugify({strict: true});
      const itemData = item.toObject(false).system;

      // item attrs & formulas
      for ( let [k, v] of Object.entries(itemData.attributes) ) {
        // prepend item name
        if ( v.dtype === "Formula" ) itemAttributes.push(`${key}..${k}`);
        // shorthand attrs
        if ( !!shorthand ) {
          if ( !(k in itemData) ) {
            // non-grouped item
            if ( v.dtype ) {
              itemData[k] = v.value;
            }
            // grouped item
            else {
              if ( !itemData[k] ) itemData[k] = {};
              for ( let [gk, gv] of Object.entries(v) ) {
                itemData[k][gk] = gv.value;
                if ( gv.dtype === "Formula" ) itemAttributes.push(`${key}..${k}.${gk}`);
              }
            }
          }
        }
        // non-shorthand grouped
        else {
          if ( !v.dtype ) {
            if ( !itemData[k] ) itemData[k] = {};
            for ( let [gk, gv] of Object.entries(v) ) {
              itemData[k][gk] = gv.value;
              if ( gv.dtype === "Formula" ) itemAttributes.push(`${key}..${k}.${gk}`);
            }
          }
        }
      }

      // cleanup shorthand
      if ( !!shorthand ) {
        delete itemData.attributes;
      }
      obj[key] = itemData;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  _applyItemsFormulaReplacements(data, itemAttributes, shorthand) {
    for ( let k of itemAttributes ) {
      // parse item & key
      let item = null;
      let itemKey = k.split('..');
      item = itemKey[0];
      k = itemKey[1];

      // group keys
      let gk = null;
      if ( k.includes('.') ) {
        let attrKey = k.split('.');
        k = attrKey[0];
        gk = attrKey[1];
      }

      let formula = '';
      if ( !!shorthand ) {
        // grouped first
        if ( data.items[item][k][gk] ) {
          formula = data.items[item][k][gk].replace('@item.', `@items.${item}.`);
          data.items[item][k][gk] = Roll.replaceFormulaData(formula, data);
        }
        // non-grouped
        else if ( data.items[item][k] ) {
          formula = data.items[item][k].replace('@item.', `@items.${item}.`);
          data.items[item][k] = Roll.replaceFormulaData(formula, data);
        }
      }
      else {
        // grouped first
        if ( data.items[item]['attributes'][k][gk] ) {
          formula = data.items[item]['attributes'][k][gk]['value'].replace('@item.', `@items.${item}.attributes.`);
          data.items[item]['attributes'][k][gk]['value'] = Roll.replaceFormulaData(formula, data);
        }
        // non-grouped
        else if ( data.items[item]['attributes'][k]['value'] ) {
          formula = data.items[item]['attributes'][k]['value'].replace('@item.', `@items.${item}.attributes.`);
          data.items[item]['attributes'][k]['value'] = Roll.replaceFormulaData(formula, data);
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply replacements for derived formula attributes.
   * @param {Object} data The actor's data object.
   * @param {Array} formulaAttributes Array of attributes that are derived formulas.
   * @param {Boolean} shorthand Whether or not the shorthand syntax is used.
   */
  _applyFormulaReplacements(data, formulaAttributes, shorthand) {
    // eval formula attrs
    for ( let k of formulaAttributes ) {
      // split group.attr
      let attr = null;
      if ( k.includes('.') ) {
        let attrKey = k.split('.');
        k = attrKey[0];
        attr = attrKey[1];
      }
      // non-grouped
      if ( data.attributes[k]?.value ) {
        data.attributes[k].value = Roll.replaceFormulaData(String(data.attributes[k].value), data);
      }
      // grouped
      else if ( attr ) {
        data.attributes[k][attr].value = Roll.replaceFormulaData(String(data.attributes[k][attr].value), data);
      }

      // shorthand values
      if ( !!shorthand ) {
        // non-grouped
        if ( data.attributes[k]?.value ) {
          data[k] = data.attributes[k].value;
        }
        // grouped
        else {
          if ( attr ) {
            // init group key
            if ( !data[k] ) {
              data[k] = {};
            }
            data[k][attr] = data.attributes[k][attr].value;
          }
        }
      }
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    const current = foundry.utils.getProperty(this.system, attribute);
    if ( !isBar || !isDelta || (current?.dtype !== "Resource") ) {
      return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }
    const updates = {[`system.${attribute}.value`]: Math.clamped(current.value + value, current.min, current.max)};
    const allowed = Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates);
    return allowed !== false ? this.update(updates) : this;
  }

  async clearAllStress() {
    return this.update({"system.stress.value":0});
  }

  async clearAllHP() { 
    this.system.health.value = 0;
    return this.update({"system.health.value":0});
  }
}
