
// Manage and track various resources
// Utilizes the Resource Data Model
export class ResourcesEditor {
  _state = {
    next: ResourcesEditor._default,
    display: 'none',
  };

  _id = null;      // The ID
  _sheet = null;   // The Owner
  _resources = []; // The Resources


  get state() {
    return {
      ...this._state,
      list: this._resources,
    };
  }

  get resources() {
    return this._resources;
  }

  static get _default() {
    return {
      id: `tracker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "Tracker",
      color: "#f3c267",
      max: 1,
      value: 0,
      order: 0,
    };
  }


  constructor(options = {}) {
    // Required, can not be null
    this._id = options.id;
    this._sheet = options.sheet;
    this._onSave = options.onSave;
    this._resources = options.resources;
  }


  async open() {
    this._state.display = 'flex';
  }

  async close() {
    this._state.display = 'none';
  }


  async create() {
    const resource = {
      id: this._state.next.id,
      name: this._state.next.name,
      color: this._state.next.color,
      max: this._state.next.max,
      value: this._state.next.value,
      order: this._resources.length,
    };

    this._resources.push(resource);
    await this._onSave(this._resources);
  }

  async delete(index) {
    if (index < 0 || index >= this._resources.length) {
      ui.notifications.error("Failed to delete the resource.");
      return;
    }

    this._resources.splice(index, 1);
    await this._sheet.render();
    await this._onSave(
      this._resources
    );

    // Grab the focus of the name input to create new elements
    const overlay = document.getElementById(`tracker-${this._id}`);
    overlay.querySelector('.tracker-name-input').focus();
  }


  async increase(index) {
    if (index < 0 || index >= this._resources.length) {
      ui.notifications.error("Failed to increase the resource value.");
      return;
    }
    const resource = this._resources[index];
    this._resources[index].value = Math.min(
      resource.value + 1, resource.max
    );
    await this._onSave(
      this._resources
    );
  }

  async decrease(index) {
    if (index < 0 || index >= this._resources.length) {
      ui.notifications.error("Failed to decrease the resource value.");
      return;
    }
    const resource = this._resources[index];
    this._resources[index].value = Math.max(
      resource.value - 1, 0
    );
    await this._onSave(
      this._resources
    );
  }


  update(data) {
    switch (data.name) {
      case 'tracker-next-name':
        this._updateNextName(
          data.value,
        );
        return true;
      case 'tracker-next-color':
        this._updateNextColor(
          data.value,
        );
        return true;
      case 'tracker-next-max':
        this._updateNextMax(
          data.value,
        );
        return true;
      case 'tracker-next-value':
        this._updateNextValue(
          data.value,
        );
        return true;
      default:
        return false;
    }
  }

  _updateNextName(value) {
    this._state.next.name = value;
  }

  _updateNextColor(value) {
    this._state.next.color = value;
  }

  _updateNextMax(value) {
    this._state.next.max = parseInt(value);
  }

  _updateNextValue(value) {
    this._state.next.value = parseInt(value);
  }

  _updateNextOrder(value) {
    this._state.next.order = value;
  }
}