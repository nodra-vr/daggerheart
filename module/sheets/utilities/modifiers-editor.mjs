
// Manage various dice rolling modifiers
// Utilizes the Modifiers Data Model
export class ModifiersEditor {
  _state = {
    path: "",
    title: "",
    display: "none",
    weapon: false,
    base: "",
    total: "",
    modifiers: [],
  }

  _id = null;     // The ID
  _sheet = null;  // The Owner

  _target = null; // The Active Target
  _targets = [];  // The Registered Targets


  get state() {
    return { ...this._state };
  }


  constructor(options = {}) {
    // Required, can not be null
    this._id = options.id;
    this._sheet = options.sheet;

    this._targets = new Map();

    if (!options.targets) return;
    options.targets.forEach((key, value) => {
      this._targets[key] = value;
    });
  }


  async open() {
    this._state.display = 'flex';
  }

  async close() {
    this._state.display = 'none';
  }


  async load(key) {
    if (this._target !== null) {
      return false;
    }
    if (!this._targets.has(key)) {
      return false;
    }
    const target = this._targets.get(key);
    const data = await target.load();
    this._target = key;
    this._state = {
      display: 'none',
      path: data.path,
      title: data.title,
      base: data.base,
      total: data.total,
      modifiers: data.modifiers
    }
    return true;
  }

  async save() {
    if (this._target === null) {
      return;
    }

    this._state.display = 'none';
    const key = this._target;
    this._target = null;

    if (!this._targets.has(key)) {
      return false;
    }

    await this._targets.get(key).save({
      path: this._state.path,
      base: this._state.base,
      total: this._state.total,
      modifiers: this._state.modifiers
    });
  }


  async delete(key) {
    this._targets.delete(key);
  }

  async register(key, callbacks) {
    this._targets.set(key, callbacks);
  }


  async create() {
    const mods = this._state.modifiers;
    if (mods.length > 0 && mods[mods.length - 1].name === 'unknown') {
      ui.notifications.error("Define the unknown modifier first.");
      return;
    }

    this._state.modifiers.push({
      name: 'unknown',
      value: '+1',
      enabled: true,
    })
    await this._sheet.render();

    // Grab the focus of the newly created input element
    const overlay = document.getElementById(`modifier-${this._id}`);
    const list = overlay.querySelectorAll('.modifier-name');
    if (list.length > 0) list[list.length - 1].focus();
    this._updateDamageTotal();
  }

  async delete(index) {
    if (index < 0 || index >= this._state.modifiers.length) {
      ui.notifications.error("Failed to delete the modifier.");
      return;
    }

    this._state.modifiers.splice(index, 1);
    await this._sheet.render();

    // Refocus the main formula input
    const overlay = this._updateDamageTotal();
    overlay.querySelector('.damage-base-input').focus();
  }


  async update(data) {
    switch (data.name) {
      case 'modifier-base':
        this._updateBaseFormula(
          data.value,
        );
        return true;
      case 'modifier-name':
        this._updateModifierName(
          data.dataset.index,
          data.value,
        );
        return true;
      case 'modifier-value':
        this._updateModifierValue(
          data.dataset.index,
          data.value,
        );
        return true;
      case 'modifier-state':
        this._updateModifierState(
          data.dataset.index,
          data.checked,
        );
        return true;
      default:
        return false;
    }
  }

  async _updateBaseFormula(value) {
    this._state.total = value;
    this._state.base = value;
    this._updateDamageTotal();
  }

  async _updateModifierName(index, name) {
    if (index < 0 || index >= this._state.modifiers.length) {
      ui.notifications.error("Failed to update the modifier name.");
      return;
    }
    this._state.modifiers[index].name = name;
  }

  async _updateModifierValue(index, value) {
    if (index < 0 || index >= this._state.modifiers.length) {
      ui.notifications.error("Failed to update the modifier value.");
      return;
    }
    this._state.modifiers[index].value = value;
    this._updateDamageTotal();
  }

  async _updateModifierState(index, enabled) {
    if (index < 0 || index >= this._state.modifiers.length) {
      ui.notifications.error("Failed to update the modifier state.");
      return;
    }
    console.log(`Enabled: ${enabled}`);
    this._state.modifiers[index].enabled = enabled;
    this._updateDamageTotal();
  }

  _updateDamageTotal() {
    let parts = [];
    // Format all to be a part of the total
    this._state.modifiers.forEach((val) => {
      if (val && val.value && val.enabled) {
        let value = val.value; // Ensure proper formatting
        if (!value.startsWith('+') && !value.startsWith('-')) {
          value = '+' + value;
        }
        parts.push(value);
      }
    })

    // Build the total formula
    let total = this._state.base;
    if (parts.length > 0) total += ' ' + parts.join(' ');

    const overlay = document.getElementById(`modifier-${this._id}`);
    overlay.querySelector('.damage-total-value').innerHTML = total;
    this._state.total = total;
    return overlay;
  }
}