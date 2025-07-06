/**
 * Sheet Tracker System
 * A customizable tracker management system for character sheets
 * Allows players to create, manage, and track various resources with custom colors
 */
export class SheetTracker {
  /**
   * Static API Methods - These can be called from macros or other code
   */
  
  /**
   * Add a new tracker to an actor
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @param {string} trackerName - Name for the tracker
   * @param {string} hexColor - Hex color code (e.g., "#ff0000")
   * @param {number} initialValue - Starting value (default: 0)
   * @param {number} maxValue - Maximum value (optional)
   * @returns {Promise<Object>} The created tracker data
   */
  static async addTracker(actorRef, trackerName, hexColor = "#f3c267", initialValue = 0, maxValue = null) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    
    // Create new tracker object
    const tracker = {
      id: `tracker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trackerName || "Tracker",
      value: Math.max(0, parseInt(initialValue) || 0),
      maxValue: maxValue ? Math.max(1, parseInt(maxValue)) : null,
      color: hexColor || "#f3c267",
      order: (actor.system.resourceTrackers?.length || 0)
    };
    
    // Get existing trackers
    const trackers = [...(actor.system.resourceTrackers || [])];
    trackers.push(tracker);
    
    // Update actor
    await actor.update({ "system.resourceTrackers": trackers });
    
    // Refresh any open sheets
    this._refreshActorSheets(actor);
    
    return tracker;
  }
  
  /**
   * Update a tracker's value
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @param {string} trackerNameOrId - Tracker name or ID
   * @param {number} newValue - New value to set
   * @returns {Promise<Object>} The updated tracker data
   */
  static async updateTrackerValue(actorRef, trackerNameOrId, newValue) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    
    const trackers = [...(actor.system.resourceTrackers || [])];
    const tracker = trackers.find(t => t.id === trackerNameOrId || t.name === trackerNameOrId);
    
    if (!tracker) throw new Error(`Tracker not found: ${trackerNameOrId}`);
    
    // Update value
    tracker.value = Math.max(0, parseInt(newValue) || 0);
    if (tracker.maxValue !== null) {
      tracker.value = Math.min(tracker.value, tracker.maxValue);
    }
    
    // Update actor
    await actor.update({ "system.resourceTrackers": trackers });
    
    // Refresh any open sheets
    this._refreshActorSheets(actor);
    
    return tracker;
  }
  
  /**
   * Modify a tracker's value by a delta
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @param {string} trackerNameOrId - Tracker name or ID
   * @param {number} delta - Amount to change by (can be negative)
   * @returns {Promise<Object>} The updated tracker data
   */
  static async modifyTrackerValue(actorRef, trackerNameOrId, delta) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    
    const trackers = [...(actor.system.resourceTrackers || [])];
    const tracker = trackers.find(t => t.id === trackerNameOrId || t.name === trackerNameOrId);
    
    if (!tracker) throw new Error(`Tracker not found: ${trackerNameOrId}`);
    
    // Modify value
    tracker.value = Math.max(0, tracker.value + (parseInt(delta) || 0));
    if (tracker.maxValue !== null) {
      tracker.value = Math.min(tracker.value, tracker.maxValue);
    }
    
    // Update actor
    await actor.update({ "system.resourceTrackers": trackers });
    
    // Refresh any open sheets
    this._refreshActorSheets(actor);
    
    return tracker;
  }
  
  /**
   * Remove a tracker from an actor
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @param {string} trackerNameOrId - Tracker name or ID
   * @returns {Promise<boolean>} Success status
   */
  static async removeTracker(actorRef, trackerNameOrId) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    
    const trackers = [...(actor.system.resourceTrackers || [])];
    const index = trackers.findIndex(t => t.id === trackerNameOrId || t.name === trackerNameOrId);
    
    if (index === -1) throw new Error(`Tracker not found: ${trackerNameOrId}`);
    
    // Remove tracker
    trackers.splice(index, 1);
    
    // Reorder remaining trackers
    trackers.forEach((t, i) => t.order = i);
    
    // Update actor
    await actor.update({ "system.resourceTrackers": trackers });
    
    // Refresh any open sheets
    this._refreshActorSheets(actor);
    
    return true;
  }
  
  /**
   * Get all trackers for an actor
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @returns {Array} Array of tracker objects
   */
  static getTrackers(actorRef) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    
    return [...(actor.system.resourceTrackers || [])];
  }
  
  /**
   * Get a specific tracker
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @param {string} trackerNameOrId - Tracker name or ID
   * @returns {Object|null} The tracker object or null if not found
   */
  static getTracker(actorRef, trackerNameOrId) {
    const actor = this._resolveActor(actorRef);
    if (!actor) return null;
    
    const trackers = actor.system.resourceTrackers || [];
    return trackers.find(t => t.id === trackerNameOrId || t.name === trackerNameOrId) || null;
  }
  
  /**
   * Clear all trackers for an actor
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @returns {Promise<void>}
   */
  static async clearAllTrackers(actorRef) {
    const actor = this._resolveActor(actorRef);
    if (!actor) throw new Error(`Actor not found: ${actorRef}`);
    
    await actor.update({ "system.resourceTrackers": [] });
    
    // Refresh any open sheets
    this._refreshActorSheets(actor);
  }
  
  /**
   * Batch update multiple trackers
   * @param {string|Actor} actorRef - Actor name, ID, or Actor object
   * @param {Array<Object>} updates - Array of {nameOrId, value} objects
   * @returns {Promise<Array>} Updated trackers
   */
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
    
    // Update actor
    await actor.update({ "system.resourceTrackers": trackers });
    
    // Refresh any open sheets
    this._refreshActorSheets(actor);
    
    return updatedTrackers;
  }
  
  /**
   * Helper method to resolve an actor from various input types
   * @private
   */
  static _resolveActor(actorRef) {
    // If already an actor object
    if (actorRef instanceof Actor) return actorRef;
    
    // Try to find by ID first
    let actor = game.actors.get(actorRef);
    
    // If not found by ID, try by name
    if (!actor) {
      actor = game.actors.find(a => a.name === actorRef);
    }
    
    return actor;
  }
  
  /**
   * Helper method to refresh any open actor sheets
   * @private
   */
  static _refreshActorSheets(actor) {
    // Find all open windows for this actor
    for (const app of Object.values(ui.windows)) {
      if (app.actor && app.actor.id === actor.id) {
        // If the app has a sheet tracker instance, update it
        if (app.sheetTracker) {
          app.sheetTracker._loadTrackers();
          app.sheetTracker._renderTrackerButtons();
          app.sheetTracker._updateTrackerList();
        }
      }
    }
  }
  
  /**
   * Instance Methods
   */
  constructor(actorSheet) {
    this.actorSheet = actorSheet;
    this.actor = actorSheet.actor;
    this.element = null;
    this.sidebarElement = null;
    this.managerElement = null;
    this.isExpanded = false;
    this.trackers = [];
    this.isUpdating = false; // Prevent concurrent updates
    this._hookId = null; // Store hook ID for cleanup
  }

  /**
   * Initialize the sheet tracker system
   */
  async initialize() {
    // Clean up any existing hooks first
    this._cleanupHooks();
    
    // Load existing trackers from actor data
    this._loadTrackers();
    
    // Render the sidebar UI
    await this.render();
    
    // Set up event listeners
    this.activateListeners();
    
    // Listen for actor updates
    this._setupUpdateHooks();

    // Highlight the currently active tab in the sidebar navigation (character sheets only)
    if (this.sidebarElement && this.sidebarElement.find('.sidebar-nav-buttons').length > 0) {
      const currentTab = this.actorSheet.element.find('.sheet-tabs .item.active').data('tab') || 'character';
      this._updateNavActiveState(currentTab);
    }
  }

  /**
   * Load trackers from actor data
   */
  _loadTrackers() {
    const trackerData = this.actor.system.resourceTrackers || [];
    this.trackers = trackerData.map(t => ({
      id: t.id || this._generateId(),
      name: t.name || "Tracker",
      value: parseInt(t.value) || 0,
      maxValue: t.maxValue ? parseInt(t.maxValue) : null,
      color: t.color || "#f3c267", // Default gold color
      order: t.order || 0
    }));
  }

  /**
   * Generate a unique ID for a tracker
   */
  _generateId() {
    return `tracker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Render the tracker sidebar
   */
  async render() {
    // Find the character sheet element
    const sheet = this.actorSheet.element;
    if (!sheet || !sheet.length) {
      console.error("SheetTracker: No sheet element found");
      return;
    }

    console.log("SheetTracker: Rendering for actor", this.actor.name, "sheet type:", this.actorSheet.constructor.name);

    // Save expansion state before removing
    const wasExpanded = this.isExpanded;

    // Remove any existing sidebar first
    sheet.find('.sheet-tracker-sidebar').remove();

    // Check if this is a character sheet to determine if navigation buttons should be shown
    const isCharacterSheet = this.actor.type === "character" && this.actorSheet.constructor.name === "SimpleActorSheet";
    
    // Create the sidebar container
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

    // Find the window-content element
    const windowContent = sheet.find('.window-content');
    console.log("SheetTracker: Found window-content elements:", windowContent.length);

    if (windowContent.length === 0) {
      console.error("SheetTracker: No .window-content element found in sheet");
      return;
    }

    // Insert the sidebar into the sheet
    windowContent.first().append(sidebarHtml);
    console.log("SheetTracker: Sidebar HTML appended to sheet");
    
    // Store references
    this.sidebarElement = sheet.find('.sheet-tracker-sidebar');
    this.managerElement = this.sidebarElement.find('.tracker-manager-panel');
    
    // Render existing tracker buttons
    this._renderTrackerButtons();
    
    // Update the tracker list in the manager
    this._updateTrackerList();
    
    // Restore expansion state
    if (wasExpanded) {
      this.toggleManager(true);
    }
  }

  /**
   * Render individual tracker buttons
   */
  _renderTrackerButtons() {
    const container = this.sidebarElement.find('.tracker-buttons-container');
    container.empty();
    
    // Sort trackers by order
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

  /**
   * Update the tracker list in the manager panel
   */
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

  /**
   * Activate event listeners
   */
  activateListeners() {
    if (!this.sidebarElement) return;

    // Main button click - toggle manager
    this.sidebarElement.find('.tracker-main-button').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleManager();
    });

    // Close button
    this.sidebarElement.find('.tracker-manager-close').on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleManager(false);
    });

    // Add tracker button
    this.sidebarElement.find('.tracker-add-button').on('click', async (e) => {
      e.preventDefault();
      await this._handleAddTracker();
    });

    // Tracker button interactions
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

    // Delete tracker button
    this.sidebarElement.on('click', '.tracker-item-delete', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const trackerId = $(e.currentTarget).closest('.tracker-list-item').data('tracker-id');
      await this._deleteTracker(trackerId);
    });

    // Color input preview
    this.sidebarElement.find('.tracker-color-input').on('input', (e) => {
      const color = $(e.target).val();
      this.sidebarElement.find('.color-preview').css('background-color', color);
    });

    /* ----------------------------------------- */
    /* Sidebar Navigation Buttons                */
    /* ----------------------------------------- */

    // Only set up navigation button listeners if they exist (character sheets only)
    if (this.sidebarElement.find('.sidebar-nav-buttons').length > 0) {
      // Navigate to the corresponding tab when a nav button is clicked
      this.sidebarElement.on('click', '.nav-button', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tab = $(e.currentTarget).data('tab');
        if (!tab) return;

        // Mimic original nav behaviour by programmatically clicking the corresponding (hidden) nav anchor
        const anchor = this.actorSheet.element.find(`.sheet-tabs .item[data-tab="${tab}"]`);
        if (anchor.length) {
          // Use native click to ensure all handlers fire (jQuery + DOM)
          anchor[0].click();
        }

        this._updateNavActiveState(tab);
      });

      // Keep sidebar navigation state in sync with other tab changes
      this.actorSheet.element.find('.sheet-tabs .item').on('click', (e) => {
        const tab = $(e.currentTarget).data('tab');
        this._updateNavActiveState(tab);
      });
    }
  }

  /**
   * Toggle the manager panel
   */
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

  /**
   * Handle adding a new tracker
   */
  async _handleAddTracker() {
    const name = this.sidebarElement.find('.tracker-name-input').val().trim() || 'Resource';
    const value = parseInt(this.sidebarElement.find('.tracker-value-input').val()) || 0;
    const maxValue = parseInt(this.sidebarElement.find('.tracker-max-input').val()) || null;
    const color = this.sidebarElement.find('.tracker-color-input').val();

    // Create new tracker
    const tracker = {
      id: this._generateId(),
      name: name,
      value: Math.max(0, value),
      maxValue: maxValue && maxValue > 0 ? Math.max(1, maxValue) : null,
      color: color,
      order: this.trackers.length
    };

    await this._addTracker(tracker);

    // Reset form
    this.sidebarElement.find('.tracker-name-input').val('Resource');
    this.sidebarElement.find('.tracker-value-input').val('0');
    this.sidebarElement.find('.tracker-max-input').val('');
    this.sidebarElement.find('.tracker-color-input').val('#f3c267');
    this.sidebarElement.find('.color-preview').css('background-color', '#f3c267');
  }

  /**
   * Add a tracker to the actor's data
   */
  async _addTracker(trackerData) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      // Add to local array
      this.trackers.push(trackerData);
      
      // Save to actor
      await this._saveTrackers();
      
      // Update UI
      this._renderTrackerButtons();
      this._updateTrackerList();
    } catch (error) {
      console.error('Error adding tracker:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Delete a tracker
   */
  async _deleteTracker(trackerId) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      // Remove from local array
      this.trackers = this.trackers.filter(t => t.id !== trackerId);
      
      // Reorder remaining trackers
      this.trackers.forEach((t, i) => t.order = i);
      
      // Save to actor
      await this._saveTrackers();
      
      // Update UI
      this._renderTrackerButtons();
      this._updateTrackerList();
    } catch (error) {
      console.error('Error deleting tracker:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Modify a tracker's value
   */
  async _modifyTrackerValue(trackerId, delta) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      const tracker = this.trackers.find(t => t.id === trackerId);
      if (!tracker) return;

      // Update value
      tracker.value = Math.max(0, tracker.value + delta);
      if (tracker.maxValue !== null && tracker.maxValue > 0) {
        tracker.value = Math.min(tracker.value, tracker.maxValue);
      }

      // Save to actor
      await this._saveTrackers();
      
      // Update just this tracker's button and list item
      this._updateTrackerButton(trackerId);
      this._updateTrackerListItem(trackerId);
    } catch (error) {
      console.error('Error modifying tracker value:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update a specific tracker button
   */
  _updateTrackerButton(trackerId) {
    const tracker = this.trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    const button = this.sidebarElement.find(`[data-tracker-id="${trackerId}"]`);
    if (button.length) {
      button.find('.tracker-button-value').text(tracker.value);
      button.attr('title', `${tracker.name}: ${tracker.value}${tracker.maxValue ? '/' + tracker.maxValue : ''}`);
    }
  }

  /**
   * Update a specific tracker list item
   */
  _updateTrackerListItem(trackerId) {
    const tracker = this.trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    const listItem = this.managerElement.find(`.tracker-list-item[data-tracker-id="${trackerId}"]`);
    if (listItem.length) {
      listItem.find('.tracker-item-value').text(`${tracker.value}${tracker.maxValue ? '/' + tracker.maxValue : ''}`);
    }
  }

  /**
   * Update which sidebar navigation button is marked as active
   * @private
   */
  _updateNavActiveState(activeTab) {
    if (!this.sidebarElement) return;
    
    // Only update navigation state if navigation buttons exist (character sheets only)
    const navButtons = this.sidebarElement.find('.nav-button');
    if (navButtons.length > 0) {
      navButtons.removeClass('active');
      this.sidebarElement.find(`.nav-button[data-tab="${activeTab}"]`).addClass('active');
    }
  }

  /**
   * Save trackers to actor data
   */
  async _saveTrackers() {
    await this.actor.update({
      "system.resourceTrackers": this.trackers
    });
  }

  /**
   * Set up hooks to listen for actor updates
   */
  _setupUpdateHooks() {
    // Listen for updates to this specific actor
    const hookFunction = (actor, change, options, userId) => {
      // Only respond to updates for our actor
      if (actor.id !== this.actor.id) return;
      
      // Only respond to tracker changes
      if (!change.system?.resourceTrackers) return;
      
      // Avoid infinite loops - don't respond to our own updates
      if (this.isUpdating) return;
      
      // Reload and re-render
      this._loadTrackers();
      this._renderTrackerButtons();
      this._updateTrackerList();
    };
    
    this._hookId = Hooks.on('updateActor', hookFunction);
  }

  /**
   * Clean up event hooks
   */
  _cleanupHooks() {
    if (this._hookId) {
      Hooks.off('updateActor', this._hookId);
      this._hookId = null;
    }
  }

  /**
   * Destroy the sheet tracker (cleanup)
   */
  destroy() {
    this._cleanupHooks();
    if (this.sidebarElement) {
      this.sidebarElement.remove();
    }
  }
} 