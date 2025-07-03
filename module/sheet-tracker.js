export class SheetTracker {
  static async addTracker(actorRef, trackerName, hexColor = "#f3c267", initialValue = 0, maxValue = null) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    const tracker = {
      id: `tracker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trackerName || "Tracker",
      value: Math.max(0, parseInt(initialValue) || 0),
      maxValue: maxValue ? Math.max(1, parseInt(maxValue)) : null,
      color: hexColor || "#f3c267",
      order: (actor.system.resourceTrackers?.length || 0)
    };
    const trackers = [...(actor.system.resourceTrackers || [])];
    trackers.push(tracker);
    await actor.update({ "system.resourceTrackers": trackers });
    this._refreshActorSheets(actor);
    return tracker;
  }
  static async updateTrackerValue(actorRef, trackerNameOrId, newValue) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    const trackers = [...(actor.system.resourceTrackers || [])];
    const tracker = trackers.find(t => t.id === trackerNameOrId || t.name === trackerNameOrId);
    if (!tracker) throw new Error(`Tracker not found: ${trackerNameOrId}`);
    tracker.value = Math.max(0, parseInt(newValue) || 0);
    if (tracker.maxValue !== null) {
      tracker.value = Math.min(tracker.value, tracker.maxValue);
    }
    await actor.update({ "system.resourceTrackers": trackers });
    this._refreshActorSheets(actor);
    return tracker;
  }
  static async modifyTrackerValue(actorRef, trackerNameOrId, delta) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    const trackers = [...(actor.system.resourceTrackers || [])];
    const tracker = trackers.find(t => t.id === trackerNameOrId || t.name === trackerNameOrId);
    if (!tracker) throw new Error(`Tracker not found: ${trackerNameOrId}`);
    tracker.value = Math.max(0, tracker.value + (parseInt(delta) || 0));
    if (tracker.maxValue !== null) {
      tracker.value = Math.min(tracker.value, tracker.maxValue);
    }
    await actor.update({ "system.resourceTrackers": trackers });
    this._refreshActorSheets(actor);
    return tracker;
  }
  static async removeTracker(actorRef, trackerNameOrId) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    const trackers = [...(actor.system.resourceTrackers || [])];
    const index = trackers.findIndex(t => t.id === trackerNameOrId || t.name === trackerNameOrId);
    if (index === -1) throw new Error(`Tracker not found: ${trackerNameOrId}`);
    trackers.splice(index, 1);
    trackers.forEach((t, i) => t.order = i);
    await actor.update({ "system.resourceTrackers": trackers });
    this._refreshActorSheets(actor);
    return true;
  }
  static getTrackers(actorRef) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    return [...(actor.system.resourceTrackers || [])];
  }
  static getTracker(actorRef, trackerNameOrId) {
    const actor = this._resolveActor(actorRef);
    if (!actor) return null;
    const trackers = actor.system.resourceTrackers || [];
    return trackers.find(t => t.id === trackerNameOrId || t.name === trackerNameOrId) || null;
  }
  static async clearAllTrackers(actorRef) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    await actor.update({ "system.resourceTrackers": [] });
    this._refreshActorSheets(actor);
  }
  static async batchUpdateTrackers(actorRef, updates) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    const trackers = [...(actor.system.resourceTrackers || [])];
    const updatedTrackers = [];
    for (const update of updates) {
      const tracker = trackers.find(t => t.id === update.nameOrId || t.name === update.nameOrId);
      if (tracker) {
        tracker.value = Math.max(0, parseInt(update.value) || 0);
        if (tracker.maxValue !== null) {
          tracker.value = Math.min(tracker.value, tracker.maxValue);
        }
        updatedTrackers.push(tracker);
      }
    }
    await actor.update({ "system.resourceTrackers": trackers });
    this._refreshActorSheets(actor);
    return updatedTrackers;
  }
  static _resolveActor(actorRef) {
    if (actorRef instanceof Actor) return actorRef;
    let actor = game.actors.get(actorRef);
    if (!actor) {
      actor = game.actors.find(a => a.name === actorRef);
    }
    return actor;
  }
  static _refreshActorSheets(actor) {
    for (const app of Object.values(ui.windows)) {
      if (app.actor && app.actor.id === actor.id) {
        if (app.sheetTracker) {
          app.sheetTracker._loadTrackers();
          app.sheetTracker._renderTrackerButtons();
          app.sheetTracker._updateTrackerList();
        }
      }
    }
  }
  constructor(actorSheet) {
    this.actorSheet = actorSheet;
    this.actor = actorSheet.actor;
    this.element = null;
    this.sidebarElement = null;
    this.managerElement = null;
    this.isExpanded = false;
    this.trackers = [];
    this.isUpdating = false; 
    this._hookId = null; 
  }
  async initialize() {
    this._cleanupHooks();
    this._loadTrackers();
    await this.render();
    this.activateListeners();
    this._setupUpdateHooks();
    if (this.sidebarElement && this.sidebarElement.find('.sidebar-nav-buttons').length > 0) {
      const currentTab = this.actorSheet.element.find('.sheet-tabs .item.active').data('tab') || 'character';
      this._updateNavActiveState(currentTab);
    }
  }
  _loadTrackers() {
    const trackerData = this.actor.system.resourceTrackers || [];
    this.trackers = trackerData.map(t => ({
      id: t.id || this._generateId(),
      name: t.name || "Tracker",
      value: parseInt(t.value) || 0,
      maxValue: t.maxValue ? parseInt(t.maxValue) : null,
      color: t.color || "#f3c267", 
      order: t.order || 0
    }));
  }
  _generateId() {
    return `tracker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  async render() {
    const sheet = this.actorSheet.element;
    if (!sheet || !sheet.length) {
      console.error("SheetTracker: No sheet element found");
      return;
    }
    console.log("SheetTracker: Rendering for actor", this.actor.name, "sheet type:", this.actorSheet.constructor.name);
    const wasExpanded = this.isExpanded;
    sheet.find('.sheet-tracker-sidebar').remove();
    const isCharacterSheet = this.actor.type === "character" && this.actorSheet.constructor.name === "SimpleActorSheet";
    const sidebarHtml = `
      <div class="sheet-tracker-sidebar" data-actor-id="${this.actor.id}">
        ${isCharacterSheet ? `<!-- Sidebar Navigation Buttons -->
        <div class="sidebar-nav-buttons">
          <div class="nav-button" data-tab="character" title="Character"><i class="fas fa-user"></i></div>
          <div class="nav-button" data-tab="equipment" title="Equipment"><i class="fas fa-hammer"></i></div>
          <div class="nav-button" data-tab="loadout" title="Loadout"><i class="fas fa-suitcase"></i></div>
          <div class="nav-button" data-tab="biography" title="Biography"><i class="fas fa-book-open"></i></div>
        </div>` : ''}
        <div class="tracker-main-button" title="Resource Tracker">
          <i class="fas fa-stopwatch"></i>
        </div>
        <div class="tracker-buttons-container">
          <!-- Individual tracker buttons will be inserted here -->
        </div>
        <div class="tracker-manager-panel">
          <div class="tracker-manager-header">
            <span>Resource Tracker</span>
            <button class="tracker-manager-close" title="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="tracker-manager-content">
            <div class="tracker-add-form">
              <div class="form-group">
                <label>Name</label>
                <input type="text" class="tracker-name-input" placeholder="Resource name" value="Resource">
              </div>
              <div class="form-group-horizontal">
                <div class="form-group-half">
                  <label>Value</label>
                  <div class="value-inputs">
                    <input type="number" class="tracker-value-input" placeholder="0" value="0" min="0">
                    <span class="value-separator">/</span>
                    <input type="number" class="tracker-max-input" placeholder="Max" min="0">
                  </div>
                </div>
                <div class="form-group-half">
                  <label>Color</label>
                  <div class="color-input-wrapper">
                    <input type="color" class="tracker-color-input" value="#f3c267">
                    <span class="color-preview"></span>
                  </div>
                </div>
              </div>
              <button class="tracker-add-button">
                <i class="fas fa-plus"></i> Add Resource
              </button>
            </div>
            <div class="tracker-list">
              <div class="tracker-list-header">Existing Resources</div>
              <div class="tracker-list-items">
                <!-- Existing trackers will be listed here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const windowContent = sheet.find('.window-content');
    console.log("SheetTracker: Found window-content elements:", windowContent.length);
    if (windowContent.length === 0) {
      console.error("SheetTracker: No .window-content element found in sheet");
      return;
    }
    windowContent.first().append(sidebarHtml);
    console.log("SheetTracker: Sidebar HTML appended to sheet");
    this.sidebarElement = sheet.find('.sheet-tracker-sidebar');
    this.managerElement = this.sidebarElement.find('.tracker-manager-panel');
    this._renderTrackerButtons();
    this._updateTrackerList();
    if (wasExpanded) {
      this.toggleManager(true);
    }
  }
  _renderTrackerButtons() {
    const container = this.sidebarElement.find('.tracker-buttons-container');
    container.empty();
    const sortedTrackers = [...this.trackers].sort((a, b) => a.order - b.order);
    sortedTrackers.forEach(tracker => {
      const buttonHtml = `
        <div class="tracker-button" 
             data-tracker-id="${tracker.id}"
             data-tracker-name="${tracker.name}"
             data-tracker-color="${tracker.color}"
             title="${tracker.name}: ${tracker.value}${tracker.maxValue ? '/' + tracker.maxValue : ''}"
             style="background-color: ${tracker.color};">
          <span class="tracker-button-value">${tracker.value}</span>
        </div>
      `;
      container.append(buttonHtml);
    });
  }
  _updateTrackerList() {
    const listContainer = this.managerElement.find('.tracker-list-items');
    listContainer.empty();
    if (this.trackers.length === 0) {
      listContainer.html('<div class="no-trackers">No resources yet</div>');
      return;
    }
    const sortedTrackers = [...this.trackers].sort((a, b) => a.order - b.order);
    sortedTrackers.forEach(tracker => {
      const listItemHtml = `
        <div class="tracker-list-item" data-tracker-id="${tracker.id}">
          <span class="tracker-item-color" style="background-color: ${tracker.color};"></span>
          <span class="tracker-item-name">${tracker.name}</span>
          <span class="tracker-item-value">${tracker.value}${tracker.maxValue ? '/' + tracker.maxValue : ''}</span>
          <button class="tracker-item-delete" title="Delete resource">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      listContainer.append(listItemHtml);
    });
  }
  activateListeners() {
    if (!this.sidebarElement) return;
    this.sidebarElement.find('.tracker-main-button').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleManager();
    });
    this.sidebarElement.find('.tracker-manager-close').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleManager(false);
    });
    this.sidebarElement.find('.tracker-add-button').on('click', async (e) => {
      e.preventDefault();
      await this._handleAddTracker();
    });
    this.sidebarElement.on('click', '.tracker-button', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const trackerId = $(e.currentTarget).data('tracker-id');
      await this._modifyTrackerValue(trackerId, 1);
    });
    this.sidebarElement.on('contextmenu', '.tracker-button', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const trackerId = $(e.currentTarget).data('tracker-id');
      await this._modifyTrackerValue(trackerId, -1);
    });
    this.sidebarElement.on('click', '.tracker-item-delete', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const trackerId = $(e.currentTarget).closest('.tracker-list-item').data('tracker-id');
      await this._deleteTracker(trackerId);
    });
    this.sidebarElement.find('.tracker-color-input').on('input', (e) => {
      const color = $(e.target).val();
      this.sidebarElement.find('.color-preview').css('background-color', color);
    });
    if (this.sidebarElement.find('.sidebar-nav-buttons').length > 0) {
      this.sidebarElement.on('click', '.nav-button', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tab = $(e.currentTarget).data('tab');
        if (!tab) return;
        const anchor = this.actorSheet.element.find(`.sheet-tabs .item[data-tab="${tab}"]`);
        if (anchor.length) {
          anchor[0].click();
        }
        this._updateNavActiveState(tab);
      });
      this.actorSheet.element.find('.sheet-tabs .item').on('click', (e) => {
        const tab = $(e.currentTarget).data('tab');
        this._updateNavActiveState(tab);
      });
    }
  }
  toggleManager(show = null) {
    this.isExpanded = show !== null ? show : !this.isExpanded;
    if (this.isExpanded) {
      this.sidebarElement.addClass('expanded');
      this.managerElement.addClass('show');
    } else {
      this.sidebarElement.removeClass('expanded');
      this.managerElement.removeClass('show');
    }
  }
  async _handleAddTracker() {
    const name = this.sidebarElement.find('.tracker-name-input').val().trim() || 'Resource';
    const value = parseInt(this.sidebarElement.find('.tracker-value-input').val()) || 0;
    const maxValue = parseInt(this.sidebarElement.find('.tracker-max-input').val()) || null;
    const color = this.sidebarElement.find('.tracker-color-input').val();
    const tracker = {
      id: this._generateId(),
      name: name,
      value: Math.max(0, value),
      maxValue: maxValue && maxValue > 0 ? Math.max(1, maxValue) : null,
      color: color,
      order: this.trackers.length
    };
    await this._addTracker(tracker);
    this.sidebarElement.find('.tracker-name-input').val('Resource');
    this.sidebarElement.find('.tracker-value-input').val('0');
    this.sidebarElement.find('.tracker-max-input').val('');
    this.sidebarElement.find('.tracker-color-input').val('#f3c267');
    this.sidebarElement.find('.color-preview').css('background-color', '#f3c267');
  }
  async _addTracker(trackerData) {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      this.trackers.push(trackerData);
      await this._saveTrackers();
      this._renderTrackerButtons();
      this._updateTrackerList();
    } catch (error) {
      console.error('Error adding tracker:', error);
    } finally {
      this.isUpdating = false;
    }
  }
  async _deleteTracker(trackerId) {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      this.trackers = this.trackers.filter(t => t.id !== trackerId);
      this.trackers.forEach((t, i) => t.order = i);
      await this._saveTrackers();
      this._renderTrackerButtons();
      this._updateTrackerList();
    } catch (error) {
      console.error('Error deleting tracker:', error);
    } finally {
      this.isUpdating = false;
    }
  }
  async _modifyTrackerValue(trackerId, delta) {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      const tracker = this.trackers.find(t => t.id === trackerId);
      if (!tracker) return;
      tracker.value = Math.max(0, tracker.value + delta);
      if (tracker.maxValue !== null && tracker.maxValue > 0) {
        tracker.value = Math.min(tracker.value, tracker.maxValue);
      }
      await this._saveTrackers();
      this._updateTrackerButton(trackerId);
      this._updateTrackerListItem(trackerId);
    } catch (error) {
      console.error('Error modifying tracker value:', error);
    } finally {
      this.isUpdating = false;
    }
  }
  _updateTrackerButton(trackerId) {
    const tracker = this.trackers.find(t => t.id === trackerId);
    if (!tracker) return;
    const button = this.sidebarElement.find(`[data-tracker-id="${trackerId}"]`);
    if (button.length) {
      button.find('.tracker-button-value').text(tracker.value);
      button.attr('title', `${tracker.name}: ${tracker.value}${tracker.maxValue ? '/' + tracker.maxValue : ''}`);
    }
  }
  _updateTrackerListItem(trackerId) {
    const tracker = this.trackers.find(t => t.id === trackerId);
    if (!tracker) return;
    const listItem = this.managerElement.find(`.tracker-list-item[data-tracker-id="${trackerId}"]`);
    if (listItem.length) {
      listItem.find('.tracker-item-value').text(`${tracker.value}${tracker.maxValue ? '/' + tracker.maxValue : ''}`);
    }
  }
  _updateNavActiveState(activeTab) {
    if (!this.sidebarElement) return;
    const navButtons = this.sidebarElement.find('.nav-button');
    if (navButtons.length > 0) {
      navButtons.removeClass('active');
      this.sidebarElement.find(`.nav-button[data-tab="${activeTab}"]`).addClass('active');
    }
  }
  async _saveTrackers() {
    await this.actor.update({
      "system.resourceTrackers": this.trackers
    });
  }
  _setupUpdateHooks() {
    const hookFunction = (actor, change, options, userId) => {
      if (actor.id !== this.actor.id) return;
      if (!change.system?.resourceTrackers) return;
      if (this.isUpdating) return;
      this._loadTrackers();
      this._renderTrackerButtons();
      this._updateTrackerList();
    };
    this._hookId = Hooks.on('updateActor', hookFunction);
  }
  _cleanupHooks() {
    if (this._hookId) {
      Hooks.off('updateActor', this._hookId);
      this._hookId = null;
    }
  }
  destroy() {
    this._cleanupHooks();
    if (this.sidebarElement) {
      this.sidebarElement.remove();
    }
  }
} 
