/**
 * A persistent counter UI element that appears above the hotbar
 */
export class CounterUI {
  constructor() {
    this.element = null;
    this.count = 0;
    this.isUpdating = false; // Flag to prevent concurrent operations
  }

  /**
   * Initialize the counter UI
   */
  async initialize() {
    // Get the saved counter value and validate it
    this.count = game.settings.get("daggerheart", "counterValue");
    
    // Ensure count is a valid number between 0 and 12
    if (isNaN(this.count) || this.count === null || this.count === undefined) {
      this.count = 0;
      await game.settings.set("daggerheart", "counterValue", 0);
    } else {
      this.count = Math.max(0, Math.min(12, parseInt(this.count)));
    }
    
    // Render the counter
    await this.render();
    
    // Listen for setting changes
    Hooks.on("updateSetting", (namespace, key, value) => {
      if (namespace === "daggerheart" && key === "counterValue") {
        const parsed = parseInt(value);
        this.count = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(12, parsed));
        this.updateDisplay();
      }
    });
  }

  /**
   * Render the counter UI element
   */
  async render() {
    // modify permissions
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT");
    
    // Create the counter HTML with inline styles for z-index
    // Only include buttons if the user has permission
    const html = `
      <div id="counter-ui" class="faded-ui counter-ui" style="position: relative; z-index: 9999;">
        ${canModify ? `
        <button type="button" class="counter-minus" title="Decrease" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-minus"></i>
        </button>
        ` : ''}
        <div class="counter-display">
          <div class="counter-value">${this.count}</div>
          <div class="counter-label">Fear</div>
        </div>
        ${canModify ? `
        <button type="button" class="counter-plus" title="Increase" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-plus"></i>
        </button>
        ` : ''}
      </div>
    `;
    
    // Find or create the counters wrapper
    let countersWrapper = document.getElementById("counters-wrapper");
    if (!countersWrapper) {
      // Create wrapper
      const wrapperHtml = '<div id="counters-wrapper" class="counters-wrapper"></div>';
      
      // Find the ui-bottom element
      const uiBottom = document.getElementById("ui-bottom");
      if (!uiBottom) {
        console.error("Could not find ui-bottom element");
        return;
      }
      
      // Insert the wrapper before the hotbar
      const hotbar = document.getElementById("hotbar");
      if (hotbar) {
        hotbar.insertAdjacentHTML("beforebegin", wrapperHtml);
      } else {
        uiBottom.insertAdjacentHTML("afterbegin", wrapperHtml);
      }
      
      countersWrapper = document.getElementById("counters-wrapper");
    }
    
    // Insert the counter into the wrapper
    countersWrapper.insertAdjacentHTML("beforeend", html);
    
    // Store reference to the element
    this.element = document.getElementById("counter-ui");
    
    // Activate listeners with a small delay to ensure DOM is ready
    // Only activate if user can modify
    if (canModify) {
      setTimeout(() => {
        this.activateListeners();
      }, 100);
    }
  }

  /**
   * Activate event listeners
   */
  activateListeners() {
    // Add multiple event types to ensure we catch the interaction
    ["click", "mousedown", "pointerdown"].forEach(eventType => {
      document.body.addEventListener(eventType, async (e) => {
        // Check if clicked element is the plus button - use ID selector to be specific
        if (e.target.closest("#counter-ui .counter-plus")) {
          e.preventDefault();
          e.stopPropagation();
          // plus btn
          if (eventType === "click") { // Only process on click to avoid multiple triggers
            await this.increase();
          }
        }
        // Check if clicked element is the minus button - use ID selector to be specific
        else if (e.target.closest("#counter-ui .counter-minus")) {
          e.preventDefault();
          e.stopPropagation();
          // minus btn
          if (eventType === "click") { // Only process on click to avoid multiple triggers
            await this.decrease();
          }
        }
      }, true); // Use capture phase
    });

    // Add right-click/left-click functionality to the counter display itself
    const counterDisplay = document.querySelector("#counter-ui .counter-display");
    if (counterDisplay) {
      // Prevent default context menu on the counter display
      counterDisplay.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // Handle left-click (increment) and right-click (decrement) on counter display
      counterDisplay.addEventListener("mousedown", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.button === 0) { // Left click
          await this.increase();
        } else if (e.button === 2) { // Right click
          await this.decrease();
        }
      });

      // Add visual feedback for interactivity
      counterDisplay.style.cursor = "pointer";
      counterDisplay.style.userSelect = "none";
      counterDisplay.title = "Left-click to increase, Right-click to decrease";
    }
  }

  /**
   * Increase the counter
   */
  async increase() {
    // Check permissions
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can modify the fear counter");
      return;
    }
    
    // Prevent concurrent operations
    if (this.isUpdating) {
      return;
    }
    
    // Maximum value is 12
    if (this.count < 12) {
      this.isUpdating = true;
      try {
        const newCount = this.count + 1;
        await game.settings.set("daggerheart", "counterValue", newCount);
        this.count = newCount;
        this.updateDisplay();
      } finally {
        this.isUpdating = false;
      }
    }
  }

  /**
   * Decrease the counter
   */
  async decrease() {
    // Check permissions
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can modify the fear counter");
      return;
    }
    
    // Prevent concurrent operations
    if (this.isUpdating) {
      return;
    }
    
    // Minimum value is 0
    if (this.count > 0) {
      this.isUpdating = true;
      try {
        const newCount = this.count - 1;
        await game.settings.set("daggerheart", "counterValue", newCount);
        this.count = newCount;
        this.updateDisplay();
      } finally {
        this.isUpdating = false;
      }
    }
  }

  /**
   * Spend (decrease) the counter by a specified amount
   * @param {number} amount - The amount of fear to spend
   */
  async spendFear(amount = 1) {
    // Check if game is paused
    if (game.paused) {
      console.log("Daggerheart | Fear spending skipped - game is paused");
      ui.notifications.info("Fear spending skipped - game is paused");
      return false;
    }
    
    // Check permissions
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can spend fear");
      ui.notifications.warn("Only GMs and Assistant GMs can spend fear.");
      return false;
    }
    
    // Validate amount parameter
    if (!Number.isInteger(amount) || amount <= 0) {
      console.warn("Fear amount must be a positive integer");
      ui.notifications.warn("Fear amount must be a positive integer.");
      return false;
    }
    
    // Prevent concurrent operations
    if (this.isUpdating) {
      return false;
    }
    
    // Check if we have enough fear to spend
    if (this.count < amount) {
      console.warn(`Cannot spend ${amount} fear. Current fear: ${this.count}`);
      ui.notifications.warn(`Cannot spend ${amount} fear. Current fear: ${this.count}`);
      return false;
    }
    
    this.isUpdating = true;
    try {
      const newCount = Math.max(0, this.count - amount);
      await game.settings.set("daggerheart", "counterValue", newCount);
      this.count = newCount;
      this.updateDisplay();
      
      // Success notification
      const message = amount === 1 ? 
        `Spent 1 fear. Remaining fear: ${this.count}` : 
        `Spent ${amount} fear. Remaining fear: ${this.count}`;
      ui.notifications.info(message);
      
      // Send to chat
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: `<div class="fear-spend-message">
          <h3><i class="fas fa-skull"></i> Fear Spent</h3>
          <p>The GM has spent <strong>${amount}</strong> fear.</p>
          <p>Remaining fear: <strong>${this.count}</strong></p>
        </div>`,
        flags: {
          daggerheart: {
            messageType: "fearSpent",
            amountSpent: amount,
            remainingFear: this.count
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error("Error spending fear:", error);
      ui.notifications.error("Error spending fear. Check console for details.");
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Gain (increase) the counter by a specified amount
   * @param {number} amount - The amount of fear to gain
   */
  async gainFear(amount = 1) {
    // Check if game is paused
    if (game.paused) {
      console.log("Daggerheart | Fear gain skipped - game is paused");
      ui.notifications.info("Fear gain skipped - game is paused");
      return false;
    }
    
    // Check permissions
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can gain fear");
      ui.notifications.warn("Only GMs and Assistant GMs can gain fear.");
      return false;
    }
    
    // Validate amount parameter
    if (!Number.isInteger(amount) || amount <= 0) {
      console.warn("Fear amount must be a positive integer");
      ui.notifications.warn("Fear amount must be a positive integer.");
      return false;
    }
    
    // Prevent concurrent operations
    if (this.isUpdating) {
      return false;
    }
    
    // Check if we can add more fear (maximum is 12)
    if (this.count >= 12) {
      console.warn(`Cannot gain fear. Fear is already at maximum (12)`);
      ui.notifications.warn(`Cannot gain fear. Fear is already at maximum.`);
      return false;
    }
    
    this.isUpdating = true;
    try {
      const newCount = Math.min(12, this.count + amount);
      const actualAmount = newCount - this.count;
      await game.settings.set("daggerheart", "counterValue", newCount);
      this.count = newCount;
      this.updateDisplay();
      
      // Success notification
      const message = actualAmount === 1 ? 
        `Gained 1 fear. Current fear: ${this.count}` : 
        `Gained ${actualAmount} fear. Current fear: ${this.count}`;
      ui.notifications.info(message);
      
      // Send to chat
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: `<div class="fear-gain-message">
          <h3><i class="fas fa-skull"></i> Fear Gained</h3>
          <p>The GM has gained <strong>${actualAmount}</strong> fear.</p>
          <p>Current fear: <strong>${this.count}</strong></p>
          ${this.count >= 12 ? '<p class="fear-warning"><em>Maximum fear reached!</em></p>' : ''}
        </div>`,
        flags: {
          daggerheart: {
            messageType: "fearGained",
            amountGained: actualAmount,
            currentFear: this.count
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error("Error gaining fear:", error);
      ui.notifications.error("Error gaining fear. Check console for details.");
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Automatically gain fear from game mechanics (bypasses GM check)
   * @param {number} amount - The amount of fear to gain
   * @param {string} source - The source of the fear gain (for logging)
   */
  async autoGainFear(amount = 1, source = "game mechanics") {
    // Check if game is paused
    if (game.paused) {
      console.log(`Daggerheart | Automatic fear gain from ${source} skipped - game is paused`);
      return false;
    }
    
    // Validate amount parameter
    if (!Number.isInteger(amount) || amount <= 0) {
      console.warn("Fear amount must be a positive integer");
      return false;
    }
    
    // Prevent concurrent operations
    if (this.isUpdating) {
      return false;
    }
    
    // Check if we can add more fear (maximum is 12)
    if (this.count >= 12) {
      console.warn(`Cannot gain fear. Fear is already at maximum (12)`);
      return false;
    }
    
    this.isUpdating = true;
    try {
      const newCount = Math.min(12, this.count + amount);
      const actualAmount = newCount - this.count;
      await game.settings.set("daggerheart", "counterValue", newCount);
      this.count = newCount;
      this.updateDisplay();
      
      console.log(`Daggerheart | Automatic fear gain from ${source}: +${actualAmount} (Current: ${this.count})`);
      
      // Success notification (less intrusive for automatic gains)
      const message = actualAmount === 1 ? 
        `GM gained 1 fear from ${source}. Current fear: ${this.count}` : 
        `GM gained ${actualAmount} fear from ${source}. Current fear: ${this.count}`;
      ui.notifications.info(message);
      
      // Send to chat (only if someone other than GM triggered it)
      if (!game.user.isGM) {
        ChatMessage.create({
          user: game.user.id,
          speaker: ChatMessage.getSpeaker(),
          content: `<div class="fear-gain-message">
            <h3><i class="fas fa-skull"></i> Fear Gained</h3>
            <p>The GM has gained <strong>${actualAmount}</strong> fear from <em>${source}</em>.</p>
            <p>Current fear: <strong>${this.count}</strong></p>
            ${this.count >= 12 ? '<p class="fear-warning"><em>Maximum fear reached!</em></p>' : ''}
          </div>`,
          flags: {
            daggerheart: {
              messageType: "fearGained",
              amountGained: actualAmount,
              currentFear: this.count,
              source: source,
              automatic: true
            }
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error gaining fear automatically:", error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update the counter display
   */
  updateDisplay() {
    if (!this.element) return;
    const valueElement = this.element.querySelector(".counter-value");
    if (valueElement) {
      // Ensure count is valid
      const displayValue = isNaN(this.count) ? 0 : this.count;
      valueElement.textContent = displayValue;
    }
  }
} 