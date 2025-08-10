/**
 * Countdown Tracker System for Daggerheart
 * Provides persistent countdown/progress trackers positioned at top center of screen
 */

import { DaggerheartDialogHelper } from '../helpers/dialog-helper.js';

export class CountdownTracker {
  constructor() {
    this.element = null;
    this.trackers = [];
    this.isUpdating = false;
    this.isExpanded = false;
    this.managementDialogOpen = false;
  }

  /**
   * Initialize the countdown tracker system
   */
  async initialize() {
    // Load saved trackers from settings
    await this.loadTrackers();
    
    // Render the UI
    await this.render();
    
    // Set up event listeners
    this.activateListeners();
    
    // Listen for setting changes
    Hooks.on("updateSetting", (setting) => {
      if (setting.key === "daggerheart-unofficial.countdownTrackers") {
        this.loadTrackers();
        this.updateDisplay();
      }
    });
  }

  /**
   * Load trackers from game settings
   */
  async loadTrackers() {
    try {
      const savedTrackers = game.settings.get("daggerheart-unofficial", "countdownTrackers");
      this.trackers = Array.isArray(savedTrackers) ? savedTrackers : [];
      
      // Validate tracker data
      this.trackers = this.trackers.map(tracker => ({
        id: tracker.id || this.generateId(),
        name: tracker.name || "Tracker",
        current: Math.max(tracker.min || 0, Math.min(tracker.max || 100, parseInt(tracker.current) || 0)),
        min: parseInt(tracker.min) || 0,
        max: parseInt(tracker.max) || 100,
        color: tracker.color || "#f3c267",
        visible: tracker.visible !== false, // Default to visible
        order: tracker.order || 0
      }));
      
      // Sort by order
      this.trackers.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error("Error loading countdown trackers:", error);
      this.trackers = [];
    }
  }

  /**
   * Save trackers to game settings
   */
  async saveTrackers() {
    if (this.isUpdating) return;
    this.isUpdating = true;
    
    try {
      await game.settings.set("daggerheart-unofficial", "countdownTrackers", this.trackers);
    } catch (error) {
      console.error("Error saving countdown trackers:", error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Generate a unique ID for a tracker
   */
  generateId() {
    return `countdown-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Render the countdown tracker UI
   */
  async render() {
    // Clean up existing listeners and element
    this.cleanupListeners();
    if (this.element) {
      this.element.remove();
    }

    // Create main container
    const html = `
      <div id="countdown-tracker-ui" class="faded-ui countdown-tracker-ui">
        <div class="countdown-trackers-container">
          ${this.renderTrackers()}
        </div>
      </div>
    `;

    // Find or create the countdown wrapper at top center
    let countdownWrapper = document.getElementById("countdown-wrapper");
    if (!countdownWrapper) {
      // Create wrapper at top center
      const wrapperHtml = '<div id="countdown-wrapper" class="countdown-wrapper"></div>';

      const uiTop = document.getElementById("ui-top");
      if (!uiTop) {
        console.error("Could not find ui-top element");
        return;
      }

      // Insert at the end of ui-top to appear at top center
      uiTop.insertAdjacentHTML("beforeend", wrapperHtml);
      countdownWrapper = document.getElementById("countdown-wrapper");
    }

    // Insert the countdown tracker UI
    countdownWrapper.innerHTML = html;
    this.element = document.getElementById("countdown-tracker-ui");
  }

  /**
   * Render individual trackers
   */
  renderTrackers() {
    const visibleTrackers = this.trackers.filter(tracker => {
      // Show all trackers to GM, only visible ones to players
      return game.user.isGM || game.user.hasRole("ASSISTANT") || tracker.visible;
    });

    if (visibleTrackers.length === 0) {
      return '';
    }

    return visibleTrackers.map(tracker => {
      const progress = this.calculateProgress(tracker);
      const canModify = game.user.isGM || game.user.hasRole("ASSISTANT");
      
      return `
        <div class="countdown-tracker" data-tracker-id="${tracker.id}">
          <div class="tracker-header">
            <div class="tracker-name-section">
              <span class="tracker-name">${tracker.name}</span>
              <span class="tracker-values">${tracker.current}/${tracker.max}</span>
            </div>
            ${canModify ? `
            <div class="tracker-controls">
              <button type="button" class="tracker-btn tracker-decrease" data-action="decrease" title="Decrease">
                <i class="fas fa-minus"></i>
              </button>
              <button type="button" class="tracker-btn tracker-increase" data-action="increase" title="Increase">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            ` : ''}
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="background-color: ${tracker.color}20;">
              <div class="progress-fill" style="width: ${progress}%; background-color: ${tracker.color};" data-tracker-id="${tracker.id}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Calculate progress percentage for a tracker
   */
  calculateProgress(tracker) {
    const range = tracker.max - tracker.min;
    if (range <= 0) return 100;
    
    const current = Math.max(tracker.min, Math.min(tracker.max, tracker.current));
    const progress = ((current - tracker.min) / range) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  /**
   * Update the display without full re-render
   */
  updateDisplay() {
    if (!this.element) return;

    const container = this.element.querySelector('.countdown-trackers-container');
    if (container) {
      // Clean up existing tracker button listeners before updating
      if (this.trackerBtnHandlers) {
        this.trackerBtnHandlers.forEach(({ element, handler }) => {
          element.removeEventListener('click', handler);
        });
        this.trackerBtnHandlers = [];
      }

      container.innerHTML = this.renderTrackers();
      this.activateListeners();
    }
  }

  /**
   * Set up event listeners
   */
  activateListeners() {
    if (!this.element) return;

    // Clean up existing listeners first
    this.cleanupListeners();

    // Tracker control buttons
    this.trackerBtnHandlers = [];
    this.element.querySelectorAll('.tracker-btn').forEach(btn => {
      const handler = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const trackerId = btn.closest('.countdown-tracker').dataset.trackerId;
        const action = btn.dataset.action;

        await this.modifyTracker(trackerId, action === 'increase' ? 1 : -1);
      };

      btn.addEventListener('click', handler);
      this.trackerBtnHandlers.push({ element: btn, handler });
    });
  }

  /**
   * Clean up event listeners
   */
  cleanupListeners() {
    if (this.trackerBtnHandlers) {
      this.trackerBtnHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      this.trackerBtnHandlers = [];
    }
  }

  /**
   * Modify a tracker's current value
   */
  async modifyTracker(trackerId, delta) {
    // Check permissions
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      ui.notifications.warn("Only GMs can modify countdown trackers");
      return;
    }

    const tracker = this.trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    // Calculate new value within bounds
    const newValue = Math.max(tracker.min, Math.min(tracker.max, tracker.current + delta));

    if (newValue !== tracker.current) {
      tracker.current = newValue;
      await this.saveTrackers();
      this.updateDisplay();

      // Trigger animation based on value change
      this.animateProgressChange(trackerId, delta > 0 ? 'increase' : 'decrease');
    }
  }

  /**
   * Animate progress bar changes
   */
  animateProgressChange(trackerId, direction) {
    const progressFill = document.querySelector(`.progress-fill[data-tracker-id="${trackerId}"]`);
    if (!progressFill) return;

    // Remove any existing animation classes
    progressFill.classList.remove('value-increased', 'value-decreased');

    // Force reflow to ensure class removal takes effect
    progressFill.offsetHeight;

    // Add the appropriate animation class
    const animationClass = direction === 'increase' ? 'value-increased' : 'value-decreased';
    progressFill.classList.add(animationClass);

    // Remove the animation class after animation completes
    setTimeout(() => {
      progressFill.classList.remove(animationClass);
    }, 800);
  }

  /**
   * Show the management dialog
   */
  async showManagementDialog() {
    // Prevent multiple dialogs
    if (this.managementDialogOpen) {
      return;
    }

    this.managementDialogOpen = true;
    const content = `
      <div class="daggerheart-dialog-content countdown-management-dialog">
        <div class="dialog-section">
          <h3>Create New Tracker</h3>
          <div class="form-group">
            <label for="tracker-name">Name:</label>
            <input type="text" id="tracker-name" name="name" placeholder="Tracker Name" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="tracker-current">Current:</label>
              <input type="number" id="tracker-current" name="current" value="0" min="0">
            </div>
            <div class="form-group">
              <label for="tracker-min">Min:</label>
              <input type="number" id="tracker-min" name="min" value="0">
            </div>
            <div class="form-group">
              <label for="tracker-max">Max:</label>
              <input type="number" id="tracker-max" name="max" value="100" min="1">
            </div>
          </div>
          <div class="form-group">
            <label for="tracker-color">Color:</label>
            <input type="color" id="tracker-color" name="color" value="#f3c267">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="tracker-visible" name="visible" checked>
              Visible to Players
            </label>
          </div>
          <button type="button" class="create-tracker-btn">Create Tracker</button>
        </div>

        <div class="dialog-section">
          <h3>Existing Trackers</h3>
          <div class="trackers-list">
            ${this.renderManagementTrackers()}
          </div>
        </div>
      </div>
    `;

    try {
      await DaggerheartDialogHelper.showDialog({
        title: "Manage Countdown Trackers",
        content: content,
        dialogClass: "daggerheart-dialog countdown-management-dialog",
        buttons: {
          close: {
            label: "Close",
            callback: () => null
          }
        },
        render: (html) => {
          this.activateManagementListeners(html);
        }
      });
    } finally {
      this.managementDialogOpen = false;
    }
  }

  /**
   * Render trackers for management dialog
   */
  renderManagementTrackers() {
    if (this.trackers.length === 0) {
      return '<div class="no-trackers">No trackers created yet</div>';
    }

    return this.trackers.map(tracker => `
      <div class="management-tracker" data-tracker-id="${tracker.id}">
        <div class="tracker-info">
          <div class="tracker-name-display">${tracker.name}</div>
          <div class="tracker-details">
            ${tracker.current}/${tracker.max}
            <span class="visibility-indicator ${tracker.visible ? 'visible' : 'hidden'}"
                  title="${tracker.visible ? 'Visible to players' : 'GM only'}">
              <i class="fas fa-${tracker.visible ? 'eye' : 'eye-slash'}"></i>
            </span>
          </div>
        </div>
        <div class="tracker-actions">
          <button type="button" class="edit-tracker-btn" title="Edit Tracker">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="toggle-visibility-btn" title="Toggle Visibility">
            <i class="fas fa-${tracker.visible ? 'eye-slash' : 'eye'}"></i>
          </button>
          <button type="button" class="delete-tracker-btn" title="Delete Tracker">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Activate listeners for management dialog
   */
  activateManagementListeners(html) {
    // Create tracker button
    html.find('.create-tracker-btn').on('click', async () => {
      const trackerData = {
        name: html.find('#tracker-name').val() || 'New Tracker',
        current: parseInt(html.find('#tracker-current').val()) || 0,
        min: parseInt(html.find('#tracker-min').val()) || 0,
        max: parseInt(html.find('#tracker-max').val()) || 100,
        color: html.find('#tracker-color').val() || '#f3c267',
        visible: html.find('#tracker-visible').is(':checked')
      };

      // Validate data
      if (trackerData.min >= trackerData.max) {
        ui.notifications.error("Minimum value must be less than maximum value");
        return;
      }

      if (trackerData.current < trackerData.min || trackerData.current > trackerData.max) {
        trackerData.current = Math.max(trackerData.min, Math.min(trackerData.max, trackerData.current));
      }

      await this.addTracker(trackerData);

      // Clear form
      html.find('#tracker-name').val('');
      html.find('#tracker-current').val('0');
      html.find('#tracker-min').val('0');
      html.find('#tracker-max').val('100');
      html.find('#tracker-color').val('#f3c267');
      html.find('#tracker-visible').prop('checked', true);

      // Refresh tracker list
      html.find('.trackers-list').html(this.renderManagementTrackers());
      this.activateManagementListeners(html);

      ui.notifications.info(`Created tracker: ${trackerData.name}`);
    });

    // Edit tracker buttons
    html.find('.edit-tracker-btn').on('click', async (e) => {
      const trackerId = $(e.currentTarget).closest('.management-tracker').data('tracker-id');
      await this.showEditTrackerDialog(trackerId);

      // Refresh the management dialog
      html.find('.trackers-list').html(this.renderManagementTrackers());
      this.activateManagementListeners(html);
    });

    // Toggle visibility buttons
    html.find('.toggle-visibility-btn').on('click', async (e) => {
      const trackerId = $(e.currentTarget).closest('.management-tracker').data('tracker-id');
      const tracker = this.trackers.find(t => t.id === trackerId);

      if (tracker) {
        tracker.visible = !tracker.visible;
        await this.saveTrackers();
        this.updateDisplay();

        // Refresh the management dialog
        html.find('.trackers-list').html(this.renderManagementTrackers());
        this.activateManagementListeners(html);
      }
    });

    // Delete tracker buttons
    html.find('.delete-tracker-btn').on('click', async (e) => {
      const trackerId = $(e.currentTarget).closest('.management-tracker').data('tracker-id');
      const tracker = this.trackers.find(t => t.id === trackerId);

      if (tracker) {
        const result = await DaggerheartDialogHelper.showDialog({
          title: "Delete Tracker",
          content: `<p>Are you sure you want to delete the tracker "${tracker.name}"?</p>`,
          dialogClass: "daggerheart-dialog delete-confirmation-dialog",
          buttons: {
            yes: {
              label: "Delete",
              callback: () => true
            },
            no: {
              label: "Cancel",
              callback: () => false
            }
          }
        });

        if (result) {
          await this.removeTracker(trackerId);

          // Refresh the management dialog
          html.find('.trackers-list').html(this.renderManagementTrackers());
          this.activateManagementListeners(html);

          ui.notifications.info(`Deleted tracker: ${tracker.name}`);
        }
      }
    });
  }

  /**
   * Show edit tracker dialog
   */
  async showEditTrackerDialog(trackerId) {
    const tracker = this.trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    const content = `
      <div class="edit-tracker-dialog">
        <div class="form-group">
          <label for="edit-tracker-name">Name:</label>
          <input type="text" id="edit-tracker-name" name="name" value="${tracker.name}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="edit-tracker-current">Current:</label>
            <input type="number" id="edit-tracker-current" name="current" value="${tracker.current}">
          </div>
          <div class="form-group">
            <label for="edit-tracker-min">Min:</label>
            <input type="number" id="edit-tracker-min" name="min" value="${tracker.min}">
          </div>
          <div class="form-group">
            <label for="edit-tracker-max">Max:</label>
            <input type="number" id="edit-tracker-max" name="max" value="${tracker.max}" min="1">
          </div>
        </div>
        <div class="form-group">
          <label for="edit-tracker-color">Color:</label>
          <input type="color" id="edit-tracker-color" name="color" value="${tracker.color}">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="edit-tracker-visible" name="visible" ${tracker.visible ? 'checked' : ''}>
            Visible to Players
          </label>
        </div>
      </div>
    `;

    const result = await DaggerheartDialogHelper.showDialog({
      title: `Edit Tracker: ${tracker.name}`,
      content: content,
      dialogClass: "edit-tracker-dialog",
      buttons: {
        save: {
          label: "Save Changes",
          callback: (html) => {
            return {
              name: html.find('#edit-tracker-name').val() || tracker.name,
              current: parseInt(html.find('#edit-tracker-current').val()) || tracker.current,
              min: parseInt(html.find('#edit-tracker-min').val()) || tracker.min,
              max: parseInt(html.find('#edit-tracker-max').val()) || tracker.max,
              color: html.find('#edit-tracker-color').val() || tracker.color,
              visible: html.find('#edit-tracker-visible').is(':checked')
            };
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => null
        }
      }
    });

    if (result && result !== null) {
      const updates = result;

      // Validate data
      if (updates.min >= updates.max) {
        ui.notifications.error("Minimum value must be less than maximum value");
        return;
      }

      // Clamp current value to new bounds
      updates.current = Math.max(updates.min, Math.min(updates.max, updates.current));

      await this.updateTracker(trackerId, updates);
      ui.notifications.info(`Updated tracker: ${updates.name}`);
    }
  }

  /**
   * Add a new tracker
   */
  async addTracker(trackerData) {
    const newTracker = {
      id: this.generateId(),
      name: trackerData.name || "New Tracker",
      current: parseInt(trackerData.current) || 0,
      min: parseInt(trackerData.min) || 0,
      max: parseInt(trackerData.max) || 100,
      color: trackerData.color || "#f3c267",
      visible: trackerData.visible !== false,
      order: this.trackers.length
    };

    this.trackers.push(newTracker);
    await this.saveTrackers();
    this.updateDisplay();
    
    return newTracker;
  }

  /**
   * Remove a tracker
   */
  async removeTracker(trackerId) {
    const index = this.trackers.findIndex(t => t.id === trackerId);
    if (index !== -1) {
      this.trackers.splice(index, 1);
      await this.saveTrackers();
      this.updateDisplay();
    }
  }

  /**
   * Update an existing tracker
   */
  async updateTracker(trackerId, updates) {
    const tracker = this.trackers.find(t => t.id === trackerId);
    if (tracker) {
      Object.assign(tracker, updates);
      await this.saveTrackers();
      this.updateDisplay();
    }
  }

  /**
   * Static API methods for external use
   */
  static async createTracker(name, current = 0, min = 0, max = 100, color = "#f3c267", visible = true) {
    if (!game.daggerheart?.countdownTracker) {
      console.error("Countdown tracker not initialized");
      return null;
    }

    return await game.daggerheart.countdownTracker.addTracker({
      name, current, min, max, color, visible
    });
  }

  static async setTrackerValue(trackerId, value) {
    if (!game.daggerheart?.countdownTracker) {
      console.error("Countdown tracker not initialized");
      return false;
    }

    const tracker = game.daggerheart.countdownTracker.trackers.find(t => t.id === trackerId);
    if (tracker) {
      const clampedValue = Math.max(tracker.min, Math.min(tracker.max, value));
      await game.daggerheart.countdownTracker.updateTracker(trackerId, { current: clampedValue });
      return true;
    }
    return false;
  }

  static getTrackers() {
    if (!game.daggerheart?.countdownTracker) {
      console.error("Countdown tracker not initialized");
      return [];
    }

    return [...game.daggerheart.countdownTracker.trackers];
  }

  static async deleteTracker(trackerId) {
    if (!game.daggerheart?.countdownTracker) {
      console.error("Countdown tracker not initialized");
      return false;
    }

    await game.daggerheart.countdownTracker.removeTracker(trackerId);
    return true;
  }
}
