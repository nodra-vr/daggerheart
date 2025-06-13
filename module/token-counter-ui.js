/**
 * A persistent counter UI element that displays HP and Hope for the selected token
 */
export class TokenCounterUI {
  constructor() {
    this.element = null;
    this.selectedToken = null;
    this.hp = { current: 0, max: 0 };
    this.hope = { current: 0, max: 0 };
    this.stress = { current: 0, max: 0 };
    this.actorType = null;
  }

  /**
   * Initialize the token counter UI
   */
  async initialize() {
    // render counter
    await this.render();
    
    // control token hook
    Hooks.on("controlToken", (token, controlled) => {
      if (controlled) {
        this.setSelectedToken(token);
      } else {
        // check controlled tokens
        const controlledTokens = canvas.tokens?.controlled || [];
        if (controlledTokens.length === 0) {
          this.setSelectedToken(null);
        }
      }
    });

    // token update hook
    Hooks.on("updateToken", (token, change, options, userId) => {
      if (token === this.selectedToken?.document) {
        this.updateFromToken(token.object);
      }
    });

    // actor update hook
    Hooks.on("updateActor", (actor, change, options, userId) => {
      if (this.selectedToken && this.selectedToken.document.actorId === actor.id) {
        this.updateFromToken(this.selectedToken);
      }
    });

    // canvas ready hook
    Hooks.on("canvasReady", () => {
      this.setSelectedToken(null);
    });
  }

  /**
   * Show or hide control buttons based on permissions
   */
  updateButtonVisibility(show) {
    const actor = this.selectedToken?.actor;
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT") || (actor && actor.isOwner);
    const display = show && canModify ? 'flex' : 'none';

    if (this.hpElement) {
        this.hpElement.querySelectorAll('button').forEach(btn => btn.style.display = display);
    }
    if (this.hopeElement) {
        this.hopeElement.querySelectorAll('button').forEach(btn => btn.style.display = display);
    }
  }

  /**
   * Set the selected token and update the display
   */
  setSelectedToken(token) {
    this.selectedToken = token;
    if (token) {
      this.updateFromToken(token);
      this.show();
      this.updateButtonVisibility(true);
    } else {
      this.hide();
      this.updateButtonVisibility(false);
    }
  }

  /**
   * Update values from the selected token
   */
  updateFromToken(token) {
    if (!token || !token.actor) return;
    
    const actor = token.actor;
    const system = actor.system;
    this.actorType = actor.type;
    
    // npc data init
    if (this.actorType === 'npc') {
      // health check
      if (!system.health) {
        system.health = { value: 0, max: 0 };
      }
      // stress check
      if (!system.stress) {
        system.stress = { value: 0, max: 0 };
      }
    }
    
    // hp values
    if (system.health) {
      this.hp.current = parseInt(system.health.value) || 0;
      this.hp.max = parseInt(system.health.max) || 0;
    } else {
      // default hp
      this.hp.current = 0;
      this.hp.max = 0;
    }
    
    // character hope
    if (this.actorType === 'character') {
      if (system.hope) {
        this.hope.current = parseInt(system.hope.value) || 0;
        this.hope.max = parseInt(system.hope.max) || 0;
      } else {
        this.hope.current = 0;
        this.hope.max = 0;
      }
      // clear stress
      this.stress.current = 0;
      this.stress.max = 0;
    }
    // npc stress
    else if (this.actorType === 'npc') {
      if (system.stress) {
        this.stress.current = parseInt(system.stress.value) || 0;
        this.stress.max = parseInt(system.stress.max) || 0;
      } else {
        this.stress.current = 0;
        this.stress.max = 0;
      }
      // clear hope
      this.hope.current = 0;
      this.hope.max = 0;
    }
    
    this.updateDisplay();
  }

  /**
   * Render the token counter UI element
   */
  async render() {
    // hp counter html
    const hpHtml = `
      <div id="token-hp-counter" class="faded-ui counter-ui token-counter" style="position: relative; z-index: 9998; display: none;">
        <button type="button" class="counter-minus hp-minus" title="Decrease HP" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-minus"></i>
        </button>
        <div class="counter-display">
          <div class="counter-value hp-value">0/0</div>
          <div class="counter-label">HP</div>
        </div>
        <button type="button" class="counter-plus hp-plus" title="Increase HP" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `;
    
    // hope/stress html
    const hopeStressHtml = `
      <div id="token-hope-counter" class="faded-ui counter-ui token-counter" style="position: relative; z-index: 9998; display: none;">
        <button type="button" class="counter-minus hope-stress-minus" title="Decrease" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-minus"></i>
        </button>
        <div class="counter-display">
          <div class="counter-value hope-stress-value">0/0</div>
          <div class="counter-label hope-stress-label">Hope</div>
        </div>
        <button type="button" class="counter-plus hope-stress-plus" title="Increase" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `;
    
    // find/create wrapper
    let countersWrapper = document.getElementById("counters-wrapper");
    if (!countersWrapper) {
      // create wrapper
      const wrapperHtml = '<div id="counters-wrapper" class="counters-wrapper"></div>';
      
      const hotbar = document.getElementById("hotbar");
      if (hotbar) {
        hotbar.insertAdjacentHTML("beforebegin", wrapperHtml);
      } else {
        const uiBottom = document.getElementById("ui-bottom");
        if (uiBottom) {
          uiBottom.insertAdjacentHTML("afterbegin", wrapperHtml);
        }
      }
      
      countersWrapper = document.getElementById("counters-wrapper");
    }
    
    // position around fear counter
    const counterUI = document.getElementById("counter-ui");
    if (counterUI) {
      // hp before fear
      counterUI.insertAdjacentHTML("beforebegin", hpHtml);
      // hope/stress after fear
      counterUI.insertAdjacentHTML("afterend", hopeStressHtml);
    } else {
      // no fear counter
      countersWrapper.insertAdjacentHTML("afterbegin", hpHtml);
      countersWrapper.insertAdjacentHTML("beforeend", hopeStressHtml);
    }
    
    // store element refs
    this.hpElement = document.getElementById("token-hp-counter");
    this.hopeElement = document.getElementById("token-hope-counter");
    this.element = { hp: this.hpElement, hope: this.hopeElement };
    
    // activate listeners
    setTimeout(() => {
      this.activateListeners();
    }, 100);
  }

  /**
   * Activate event listeners
   */
  activateListeners() {
    // event listeners
    ["click", "mousedown", "pointerdown"].forEach(eventType => {
      document.body.addEventListener(eventType, async (e) => {
        // hp buttons
        if (e.target.closest("#token-hp-counter .hp-plus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyHP(1);
          }
        } else if (e.target.closest("#token-hp-counter .hp-minus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyHP(-1);
          }
        }
        // hope/stress buttons
        else if (e.target.closest("#token-hope-counter .hope-stress-plus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyHopeOrStress(1);
          }
        } else if (e.target.closest("#token-hope-counter .hope-stress-minus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyHopeOrStress(-1);
          }
        }
      }, true); // capture phase
    });
  }

  /**
   * Modify HP value
   */
  async modifyHP(delta) {
    if (!this.selectedToken || !this.selectedToken.actor) return;
    
    const actor = this.selectedToken.actor;
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT") || actor.isOwner;

    // permission check
    if (!canModify) {
      console.warn("User does not have permission to modify token values");
      ui.notifications.warn("You do not have permission to modify this token's values.");
      return;
    }
    
    // health data check
    if (!actor.system.health) {
      console.warn("This actor does not have health data");
      return;
    }
    
    const currentHP = parseInt(actor.system.health.value) || 0;
    const maxHP = parseInt(actor.system.health.max) || 0;
    const newHP = Math.max(0, Math.min(maxHP, currentHP + delta));
    
    await actor.update({
      "system.health.value": newHP
    });
  }

  /**
   * Modify Hope or Stress value based on actor type
   */
  async modifyHopeOrStress(delta) {
    if (!this.selectedToken || !this.selectedToken.actor) return;
    
    const actor = this.selectedToken.actor;
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT") || actor.isOwner;

    // permission check
    if (!canModify) {
      console.warn("User does not have permission to modify token values");
      ui.notifications.warn("You do not have permission to modify this token's values.");
      return;
    }
    
    // character hope
    if (this.actorType === 'character') {
      // hope data check
      if (!actor.system.hope) {
        console.warn("This actor does not have hope data");
        return;
      }
      
      const currentHope = parseInt(actor.system.hope.value) || 0;
      const maxHope = parseInt(actor.system.hope.max) || 0;
      const newHope = Math.max(0, Math.min(maxHope, currentHope + delta));
      
      await actor.update({
        "system.hope.value": newHope
      });
    }
    // npc stress
    else if (this.actorType === 'npc') {
      // stress data check
      if (!actor.system.stress) {
        console.warn("This actor does not have stress data");
        return;
      }
      
      const currentStress = parseInt(actor.system.stress.value) || 0;
      const maxStress = parseInt(actor.system.stress.max) || 0;
      const newStress = Math.max(0, Math.min(maxStress, currentStress + delta));
      
      await actor.update({
        "system.stress.value": newStress
      });
    }
  }

  /**
   * Update the counter display
   */
  updateDisplay() {
    if (!this.hpElement || !this.hopeElement) return;
    
    // hp display
    const hpValue = this.hpElement.querySelector(".hp-value");
    if (hpValue) {
      hpValue.textContent = `${this.hp.current}/${this.hp.max}`;
    }
    
    // hope/stress display
    const hopeStressValue = this.hopeElement.querySelector(".hope-stress-value");
    const hopeStressLabel = this.hopeElement.querySelector(".hope-stress-label");
    
    if (hopeStressValue && hopeStressLabel) {
      if (this.actorType === 'character') {
        hopeStressValue.textContent = `${this.hope.current}/${this.hope.max}`;
        hopeStressLabel.textContent = "Hope";
      } else if (this.actorType === 'npc') {
        hopeStressValue.textContent = `${this.stress.current}/${this.stress.max}`;
        hopeStressLabel.textContent = "Stress";
      }
    }
  }

  /**
   * Show the counter UI
   */
  show() {
    if (this.hpElement) {
      this.hpElement.style.display = "flex";
    }
    if (this.hopeElement) {
      this.hopeElement.style.display = "flex";
    }
  }

  /**
   * Hide the counter UI
   */
  hide() {
    if (this.hpElement) {
      this.hpElement.style.display = "none";
    }
    if (this.hopeElement) {
      this.hopeElement.style.display = "none";
    }
  }
} 