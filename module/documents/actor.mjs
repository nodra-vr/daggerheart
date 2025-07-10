import { EntitySheetHelper } from "../helper.js";
import { ModifierManager } from "../modifierManager.js";

export class ActorDocument extends Actor {

  prepareDerivedData() {
    super.prepareDerivedData();

    this.system.health = this.system.health || { value: 6, min: 0, max: 6 };
    this.system.stress = this.system.stress || { value: 0, min: 0, max: 6 };
    this.system.defenses = this.system.defenses || {
      armor: { value: 0 },
      'armor-slots': { value: 0 }
    };
    this.system.groups = this.system.groups || {};
    this.system.attributes = this.system.attributes || {};

    if (!this.system.defenses.armor) this.system.defenses.armor = { value: 0 };
    if (!this.system.defenses['armor-slots']) this.system.defenses['armor-slots'] = { value: 0 };

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

    // Ensure character level modifier is applied for characters
    if (this.type === 'character') {
      this._ensureCharacterLevelModifier();
    }
  }

  _ensureCharacterLevelModifier() {
    // Only run this for GMs or owners to avoid permission issues
    if (!game.user.isGM && !this.isOwner) {
      return;
    }

    // Schedule the character level modifier update
    this._scheduleCharacterLevelModifierUpdate();
  }

  _scheduleDeadStateUpdate() {
    if (this._deadStateTimeout) {
      return;
    }
    this._deadStateTimeout = setTimeout(() => {
      this._deadStateTimeout = null;
      this._handleDeadState();
    }, 250);
  }

  _scheduleCharacterLevelModifierUpdate() {
    if (this._characterLevelModifierTimeout) {
      return;
    }
    this._characterLevelModifierTimeout = setTimeout(() => {
      this._characterLevelModifierTimeout = null;
      this._handleCharacterLevelModifier();
    }, 250);
  }

  async _handleDeadState() {
    if (!game.user.isGM) {
      return
    }

    const health = this.system.health;
    const isDying = health && health.value === health.max && health.max > 0;

    const deadEffect = CONFIG.statusEffects.find(e => e.id === "dead");
    if (!deadEffect) return;

    const hasDeadEffect = this.effects.some(e => e.statuses.has("dead"));

    if (isDying && !hasDeadEffect) {

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

      const deadEffectToRemove = this.effects.find(e => e.statuses.has("dead"));
      if (deadEffectToRemove) {
        await deadEffectToRemove.delete();
      }
    }

    const tokens = this.getActiveTokens();
    for (const token of tokens) {
      if (isDying) {

        await token.document.update({ tint: "#8B0000" });
      } else {

        await token.document.update({ tint: null });
      }
    }
  }

  async _handleCharacterLevelModifier() {
    if (!game.user.isGM && !this.isOwner) {
      return;
    }

    try {
      await ModifierManager.manageCharacterLevelModifier(this);
    } catch (error) {
      console.error("Actor | Error managing character level modifier:", error);
    }
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    if (changed.system?.health) {
      this._scheduleDeadStateUpdate();
    }

    // Manage character level modifier when level changes
    if (changed.system?.level && this.type === 'character') {
      this._scheduleCharacterLevelModifierUpdate();
    }
  }

  static async createDialog(data = {}, options = {}) {
    return EntitySheetHelper.createDialog.call(this, data, options);
  }

  get isTemplate() {
    return !!this.getFlag("daggerheart", "isTemplate");
  }

  getRollData() {

    const data = this.toObject(false).system;
    const shorthand = game.settings.get("daggerheart", "macroShorthand");
    const formulaAttributes = [];
    const itemAttributes = [];

    if (game.daggerheart && game.daggerheart.getTierOfPlay) {
      data.tier = game.daggerheart.getTierOfPlay(this);
    } else {

      const level = parseInt(data.level?.value) || 1;
      if (level === 1) data.tier = 1;
      else if (level >= 2 && level <= 4) data.tier = 2;
      else if (level >= 5 && level <= 7) data.tier = 3;
      else if (level >= 8 && level <= 10) data.tier = 4;
      else data.tier = 1;
    }

    data.prof = Math.max(1, parseInt(data.proficiency?.value) || 1);
    data.proficiency_value = data.prof;

    data.lvl = Math.max(1, parseInt(data.level?.value) || 1);
    data.level_value = data.lvl;

    data.agi = parseInt(data.agility?.value) || 0;
    data.str = parseInt(data.strength?.value) || 0;
    data.fin = parseInt(data.finesse?.value) || 0;
    data.ins = parseInt(data.instinct?.value) || 0;
    data.pre = parseInt(data.presence?.value) || 0;
    data.kno = parseInt(data.knowledge?.value) || 0;
    data.exp = parseInt(data.exp?.value) || 0;

    data.hp = Math.max(0, parseInt(data.health?.value) || 0);
    data.hp_max = Math.max(1, parseInt(data.health?.max) || 6);
    data.stress_value = Math.max(0, parseInt(data.stress?.value) || 0);
    data.stress_max = Math.max(1, parseInt(data.stress?.max) || 6);
    data.hope_value = Math.max(0, parseInt(data.hope?.value) || 0);
    data.hope_max = Math.max(1, parseInt(data.hope?.max) || 5);

    data.evasion = Math.max(0, parseInt(data.defenses?.evasion?.value) || 10);
    data.armor = Math.max(0, parseInt(data.defenses?.armor?.value) || 0);
    data.armor_slots = Math.max(0, parseInt(data.defenses?.['armor-slots']?.value) || 0);

    data.severe = Math.max(0, parseInt(data.threshold?.severe?.value ?? data.threshold?.severe) || 0);
    data.major = Math.max(0, parseInt(data.threshold?.major?.value ?? data.threshold?.major) || 0);

    if (data.resourceTrackers && Array.isArray(data.resourceTrackers)) {
      data.trackers = {};
      data.tracker = {};

      for (const tracker of data.resourceTrackers) {
        if (tracker.name) {

          const safeKey = tracker.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (safeKey) {
            data.trackers[safeKey] = tracker.value || 0;
            data.tracker[safeKey] = tracker.value || 0;

            if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(tracker.name)) {
              data.trackers[tracker.name] = tracker.value || 0;
              data.tracker[tracker.name] = tracker.value || 0;
            }
          }
        }
      }
    }

    this._applyShorthand(data, formulaAttributes, shorthand);

    this._applyItems(data, itemAttributes, shorthand);

    this._applyItemsFormulaReplacements(data, itemAttributes, shorthand);

    this._applyFormulaReplacements(data, formulaAttributes, shorthand);

    if (!!shorthand) {
      delete data.attributes;
      delete data.attr;
      delete data.groups;
    }
    return data;
  }

  _applyShorthand(data, formulaAttributes, shorthand) {

    for (let [k, v] of Object.entries(data.attributes || {})) {

      if (v.dtype === "Formula") formulaAttributes.push(k);

      if (!!shorthand) {
        if (!(k in data)) {

          if (v.dtype) {
            data[k] = v.value;
          }

          else {
            data[k] = {};
            for (let [gk, gv] of Object.entries(v)) {
              data[k][gk] = gv.value;
              if (gv.dtype === "Formula") formulaAttributes.push(`${k}.${gk}`);
            }
          }
        }
      }
    }
  }

  _applyItems(data, itemAttributes, shorthand) {

    data.items = this.items.reduce((obj, item) => {
      const key = item.name.slugify({ strict: true });
      const itemData = item.toObject(false).system;

      for (let [k, v] of Object.entries(itemData.attributes)) {

        if (v.dtype === "Formula") itemAttributes.push(`${key}..${k}`);

        if (!!shorthand) {
          if (!(k in itemData)) {

            if (v.dtype) {
              itemData[k] = v.value;
            }

            else {
              if (!itemData[k]) itemData[k] = {};
              for (let [gk, gv] of Object.entries(v)) {
                itemData[k][gk] = gv.value;
                if (gv.dtype === "Formula") itemAttributes.push(`${key}..${k}.${gk}`);
              }
            }
          }
        }

        else {
          if (!v.dtype) {
            if (!itemData[k]) itemData[k] = {};
            for (let [gk, gv] of Object.entries(v)) {
              itemData[k][gk] = gv.value;
              if (gv.dtype === "Formula") itemAttributes.push(`${key}..${k}.${gk}`);
            }
          }
        }
      }

      if (!!shorthand) {
        delete itemData.attributes;
      }
      obj[key] = itemData;
      return obj;
    }, {});
  }

  _applyItemsFormulaReplacements(data, itemAttributes, shorthand) {
    for (let k of itemAttributes) {

      let item = null;
      let itemKey = k.split('..');
      item = itemKey[0];
      k = itemKey[1];

      let gk = null;
      if (k.includes('.')) {
        let attrKey = k.split('.');
        k = attrKey[0];
        gk = attrKey[1];
      }

      let formula = '';
      if (!!shorthand) {

        if (data.items[item][k][gk]) {
          formula = data.items[item][k][gk].replace('@item.', `@items.${item}.`);
          data.items[item][k][gk] = Roll.replaceFormulaData(formula, data);
        }

        else if (data.items[item][k]) {
          formula = data.items[item][k].replace('@item.', `@items.${item}.`);
          data.items[item][k] = Roll.replaceFormulaData(formula, data);
        }
      }
      else {

        if (data.items[item]['attributes'][k][gk]) {
          formula = data.items[item]['attributes'][k][gk]['value'].replace('@item.', `@items.${item}.attributes.`);
          data.items[item]['attributes'][k][gk]['value'] = Roll.replaceFormulaData(formula, data);
        }

        else if (data.items[item]['attributes'][k]['value']) {
          formula = data.items[item]['attributes'][k]['value'].replace('@item.', `@items.${item}.attributes.`);
          data.items[item]['attributes'][k]['value'] = Roll.replaceFormulaData(formula, data);
        }
      }
    }
  }

  _applyFormulaReplacements(data, formulaAttributes, shorthand) {

    for (let k of formulaAttributes) {

      let attr = null;
      if (k.includes('.')) {
        let attrKey = k.split('.');
        k = attrKey[0];
        attr = attrKey[1];
      }

      if (data.attributes[k]?.value) {
        data.attributes[k].value = Roll.replaceFormulaData(String(data.attributes[k].value), data);
      }

      else if (attr) {
        data.attributes[k][attr].value = Roll.replaceFormulaData(String(data.attributes[k][attr].value), data);
      }

      if (!!shorthand) {

        if (data.attributes[k]?.value) {
          data[k] = data.attributes[k].value;
        }

        else {
          if (attr) {

            if (!data[k]) {
              data[k] = {};
            }
            data[k][attr] = data.attributes[k][attr].value;
          }
        }
      }
    }
  }

  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    const current = foundry.utils.getProperty(this.system, attribute);
    if (!isBar || !isDelta || (current?.dtype !== "Resource")) {
      return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }
    const updates = { [`system.${attribute}.value`]: Math.clamped(current.value + value, current.min, current.max) };
    const allowed = Hooks.call("modifyTokenAttribute", { attribute, value, isDelta, isBar }, updates);
    return allowed !== false ? this.update(updates) : this;
  }

  async clearAllStress() {
    return this.update({ "system.stress.value": 0 });
  }

  async clearAllHP() {
    this.system.health.value = 0;
    return this.update({ "system.health.value": 0 });
  }
}