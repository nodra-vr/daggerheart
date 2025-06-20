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
    Hooks.on("updateSetting", (setting, value) => {
      if (setting.key === "daggerheart.counterValue") {
        this.count = parseInt(value.value) || 0;
        this.count = Math.max(0, Math.min(12, this.count));
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