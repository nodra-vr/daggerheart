export class CounterUI {
  constructor() {
    this.element = null;
    this.count = 0;
    this.isUpdating = false; 
  }
  async initialize() {
    this.count = game.settings.get("daggerheart", "counterValue");
    if (isNaN(this.count) || this.count === null || this.count === undefined) {
      this.count = 0;
      await game.settings.set("daggerheart", "counterValue", 0);
    } else {
      this.count = Math.max(0, Math.min(12, parseInt(this.count)));
    }
    await this.render();
    Hooks.on("updateSetting", (namespace, key, value) => {
      if (namespace === "daggerheart" && key === "counterValue") {
        const parsed = parseInt(value);
        this.count = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(12, parsed));
        this.updateDisplay();
      }
    });
  }
  async render() {
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT");
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
    let countersWrapper = document.getElementById("counters-wrapper");
    if (!countersWrapper) {
      const wrapperHtml = '<div id="counters-wrapper" class="counters-wrapper"></div>';
      const uiBottom = document.getElementById("ui-bottom");
      if (!uiBottom) {
        console.error("Could not find ui-bottom element");
        return;
      }
      const hotbar = document.getElementById("hotbar");
      if (hotbar) {
        hotbar.insertAdjacentHTML("beforebegin", wrapperHtml);
      } else {
        uiBottom.insertAdjacentHTML("afterbegin", wrapperHtml);
      }
      countersWrapper = document.getElementById("counters-wrapper");
    }
    countersWrapper.insertAdjacentHTML("beforeend", html);
    this.element = document.getElementById("counter-ui");
    if (canModify) {
      setTimeout(() => {
        this.activateListeners();
      }, 100);
    }
  }
  activateListeners() {
    ["click", "mousedown", "pointerdown"].forEach(eventType => {
      document.body.addEventListener(eventType, async (e) => {
        if (e.target.closest("#counter-ui .counter-plus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") { 
            await this.increase();
          }
        }
        else if (e.target.closest("#counter-ui .counter-minus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") { 
            await this.decrease();
          }
        }
      }, true); 
    });
    const counterDisplay = document.querySelector("#counter-ui .counter-display");
    if (counterDisplay) {
      counterDisplay.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      counterDisplay.addEventListener("mousedown", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.button === 0) { 
          await this.increase();
        } else if (e.button === 2) { 
          await this.decrease();
        }
      });
      counterDisplay.style.cursor = "pointer";
      counterDisplay.style.userSelect = "none";
      counterDisplay.title = "Left-click to increase, Right-click to decrease";
    }
  }
  async increase() {
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can modify the fear counter");
      return;
    }
    if (this.isUpdating) {
      return;
    }
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
  async decrease() {
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can modify the fear counter");
      return;
    }
    if (this.isUpdating) {
      return;
    }
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
  async spendFear(amount = 1) {
    if (game.paused) {
      console.log("Daggerheart | Fear spending skipped - game is paused");
      ui.notifications.info("Fear spending skipped - game is paused");
      return false;
    }
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can spend fear");
      ui.notifications.warn("Only GMs and Assistant GMs can spend fear.");
      return false;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      console.warn("Fear amount must be a positive integer");
      ui.notifications.warn("Fear amount must be a positive integer.");
      return false;
    }
    if (this.isUpdating) {
      return false;
    }
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
      const message = amount === 1 ? 
        `Spent 1 fear. Remaining fear: ${this.count}` : 
        `Spent ${amount} fear. Remaining fear: ${this.count}`;
      ui.notifications.info(message);
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
  async gainFear(amount = 1) {
    if (game.paused) {
      console.log("Daggerheart | Fear gain skipped - game is paused");
      ui.notifications.info("Fear gain skipped - game is paused");
      return false;
    }
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) {
      console.warn("Only GMs and Assistant GMs can gain fear");
      ui.notifications.warn("Only GMs and Assistant GMs can gain fear.");
      return false;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      console.warn("Fear amount must be a positive integer");
      ui.notifications.warn("Fear amount must be a positive integer.");
      return false;
    }
    if (this.isUpdating) {
      return false;
    }
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
      const message = actualAmount === 1 ? 
        `Gained 1 fear. Current fear: ${this.count}` : 
        `Gained ${actualAmount} fear. Current fear: ${this.count}`;
      ui.notifications.info(message);
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
  async autoGainFear(amount = 1, source = "game mechanics") {
    if (game.paused) {
      console.log(`Daggerheart | Automatic fear gain from ${source} skipped - game is paused`);
      return false;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      console.warn("Fear amount must be a positive integer");
      return false;
    }
    if (this.isUpdating) {
      return false;
    }
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
      const message = actualAmount === 1 ? 
        `GM gained 1 fear from ${source}. Current fear: ${this.count}` : 
        `GM gained ${actualAmount} fear from ${source}. Current fear: ${this.count}`;
      ui.notifications.info(message);
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
  updateDisplay() {
    if (!this.element) return;
    const valueElement = this.element.querySelector(".counter-value");
    if (valueElement) {
      const displayValue = isNaN(this.count) ? 0 : this.count;
      valueElement.textContent = displayValue;
    }
  }
} 
