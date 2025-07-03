export class TokenCounterUI {
  constructor() {
    this.element = null;
    this.selectedToken = null;
    this.hp = { current: 0, max: 0 };
    this.hope = { current: 0, max: 0 };
    this.stress = { current: 0, max: 0 };
    this.armorSlots = { current: 0, max: 0 };
    this.characterStress = { current: 0, max: 0 };
    this.actorType = null;
  }
  async initialize() {
    await this.render();
    Hooks.on("controlToken", (token, controlled) => {
      if (controlled) {
        this.setSelectedToken(token);
      } else {
        const controlledTokens = canvas.tokens?.controlled || [];
        if (controlledTokens.length === 0) {
          this.setSelectedToken(null);
        }
      }
    });
    Hooks.on("updateToken", (token, change, options, userId) => {
      if (token === this.selectedToken?.document) {
        this.updateFromToken(token.object);
      }
    });
    Hooks.on("updateActor", (actor, change, options, userId) => {
      if (this.selectedToken && this.selectedToken.document.actorId === actor.id) {
        this.updateFromToken(this.selectedToken);
      }
    });
    Hooks.on("canvasReady", () => {
      this.setSelectedToken(null);
    });
  }
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
    if (this.armorSlotsElement) {
        this.armorSlotsElement.querySelectorAll('button').forEach(btn => btn.style.display = display);
    }
    if (this.characterStressElement) {
        this.characterStressElement.querySelectorAll('button').forEach(btn => btn.style.display = display);
    }
  }
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
  updateFromToken(token) {
    if (!token || !token.actor) return;
    const actor = token.actor;
    const system = actor.system;
    this.actorType = actor.type;
    if (this.actorType === 'npc') {
      if (!system.health) {
        system.health = { value: 0, max: 0 };
      }
      if (!system.stress) {
        system.stress = { value: 0, max: 0 };
      }
    }
    if (system.health) {
      this.hp.current = parseInt(system.health.value) || 0;
      this.hp.max = parseInt(system.health.max) || 0;
    } else {
      this.hp.current = 0;
      this.hp.max = 0;
    }
    if (this.actorType === 'character') {
      if (system.hope) {
        this.hope.current = parseInt(system.hope.value) || 0;
        this.hope.max = parseInt(system.hope.max) || 0;
      } else {
        this.hope.current = 0;
        this.hope.max = 0;
      }
      if (system.stress) {
        this.characterStress.current = parseInt(system.stress.value) || 0;
        this.characterStress.max = parseInt(system.stress.max) || 0;
      } else {
        this.characterStress.current = 0;
        this.characterStress.max = 0;
      }
      if (system.defenses && system.defenses['armor-slots'] && system.defenses.armor) {
        this.armorSlots.current = parseInt(system.defenses['armor-slots'].value) || 0;
        this.armorSlots.max = parseInt(system.defenses.armor.value) || 0;
      } else {
        this.armorSlots.current = 0;
        this.armorSlots.max = 0;
      }
      this.stress.current = 0;
      this.stress.max = 0;
    }
    else if (this.actorType === 'npc') {
      if (system.stress) {
        this.stress.current = parseInt(system.stress.value) || 0;
        this.stress.max = parseInt(system.stress.max) || 0;
      } else {
        this.stress.current = 0;
        this.stress.max = 0;
      }
      this.hope.current = 0;
      this.hope.max = 0;
      this.characterStress.current = 0;
      this.characterStress.max = 0;
      this.armorSlots.current = 0;
      this.armorSlots.max = 0;
    }
    this.updateDisplay();
  }
  async render() {
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
    const armorSlotsHtml = `
      <div id="token-armor-slots-counter" class="faded-ui counter-ui token-counter" style="position: relative; z-index: 9998; display: none;">
        <button type="button" class="counter-minus armor-slots-minus" title="Decrease Armor Slots" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-minus"></i>
        </button>
        <div class="counter-display">
          <div class="counter-value armor-slots-value">0/0</div>
          <div class="counter-label">Armor</div>
        </div>
        <button type="button" class="counter-plus armor-slots-plus" title="Increase Armor Slots" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `;
    const characterStressHtml = `
      <div id="token-character-stress-counter" class="faded-ui counter-ui token-counter" style="position: relative; z-index: 9998; display: none;">
        <button type="button" class="counter-minus character-stress-minus" title="Decrease Stress" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-minus"></i>
        </button>
        <div class="counter-display">
          <div class="counter-value character-stress-value">0/0</div>
          <div class="counter-label">Stress</div>
        </div>
        <button type="button" class="counter-plus character-stress-plus" title="Increase Stress" style="position: relative; z-index: 10000; pointer-events: all;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `;
    let countersWrapper = document.getElementById("counters-wrapper");
    if (!countersWrapper) {
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
    const counterUI = document.getElementById("counter-ui");
    if (counterUI) {
      counterUI.insertAdjacentHTML("beforebegin", hpHtml);
      counterUI.insertAdjacentHTML("beforebegin", armorSlotsHtml);
      counterUI.insertAdjacentHTML("afterend", characterStressHtml);
      counterUI.insertAdjacentHTML("afterend", hopeStressHtml);
    } else {
      countersWrapper.insertAdjacentHTML("afterbegin", hpHtml);
      countersWrapper.insertAdjacentHTML("beforeend", armorSlotsHtml);
      countersWrapper.insertAdjacentHTML("beforeend", characterStressHtml);
      countersWrapper.insertAdjacentHTML("beforeend", hopeStressHtml);
    }
    this.hpElement = document.getElementById("token-hp-counter");
    this.hopeElement = document.getElementById("token-hope-counter");
    this.armorSlotsElement = document.getElementById("token-armor-slots-counter");
    this.characterStressElement = document.getElementById("token-character-stress-counter");
    this.element = {
      hp: this.hpElement,
      hope: this.hopeElement,
      armorSlots: this.armorSlotsElement,
      characterStress: this.characterStressElement
    };
    setTimeout(() => {
      this.activateListeners();
    }, 100);
  }
  activateListeners() {
    ["click", "mousedown", "pointerdown"].forEach(eventType => {
      document.body.addEventListener(eventType, async (e) => {
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
        else if (e.target.closest("#token-armor-slots-counter .armor-slots-plus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyArmorSlots(1);
          }
        } else if (e.target.closest("#token-armor-slots-counter .armor-slots-minus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyArmorSlots(-1);
          }
        }
        else if (e.target.closest("#token-character-stress-counter .character-stress-plus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyCharacterStress(1);
          }
        } else if (e.target.closest("#token-character-stress-counter .character-stress-minus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyCharacterStress(-1);
          }
        }
        else if (e.target.closest("#token-armor-slots-counter .armor-slots-plus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyArmorSlots(1);
          }
        } else if (e.target.closest("#token-armor-slots-counter .armor-slots-minus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyArmorSlots(-1);
          }
        }
        else if (e.target.closest("#token-character-stress-counter .character-stress-plus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyCharacterStress(1);
          }
        } else if (e.target.closest("#token-character-stress-counter .character-stress-minus")) {
          e.preventDefault();
          e.stopPropagation();
          if (eventType === "click") {
            await this.modifyCharacterStress(-1);
          }
        }
      }, true); 
    });
    const setupCounterDisplay = (selector, modifyFunction) => {
      const counterDisplay = document.querySelector(`${selector} .counter-display`);
      if (counterDisplay) {
        counterDisplay.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        counterDisplay.addEventListener("mousedown", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.button === 0) { 
            await modifyFunction(1);
          } else if (e.button === 2) { 
            await modifyFunction(-1);
          }
        });
        counterDisplay.style.cursor = "pointer";
        counterDisplay.style.userSelect = "none";
        counterDisplay.title = "Left-click to increase, Right-click to decrease";
      }
    };
    setupCounterDisplay("#token-hp-counter", this.modifyHP.bind(this));
    setupCounterDisplay("#token-hope-counter", this.modifyHopeOrStress.bind(this));
    setupCounterDisplay("#token-armor-slots-counter", this.modifyArmorSlots.bind(this));
    setupCounterDisplay("#token-character-stress-counter", this.modifyCharacterStress.bind(this));
  }
  async modifyHP(delta) {
    if (!this.selectedToken || !this.selectedToken.actor) return;
    const actor = this.selectedToken.actor;
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT") || actor.isOwner;
    if (!canModify) {
      console.warn("User does not have permission to modify token values");
      ui.notifications.warn("You do not have permission to modify this token's values.");
      return;
    }
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
  async modifyHopeOrStress(delta) {
    if (!this.selectedToken || !this.selectedToken.actor) return;
    const actor = this.selectedToken.actor;
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT") || actor.isOwner;
    if (!canModify) {
      console.warn("User does not have permission to modify token values");
      ui.notifications.warn("You do not have permission to modify this token's values.");
      return;
    }
    if (this.actorType === 'character') {
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
    else if (this.actorType === 'npc') {
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
  async modifyArmorSlots(delta) {
    if (!this.selectedToken || !this.selectedToken.actor) return;
    const actor = this.selectedToken.actor;
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT") || actor.isOwner;
    if (!canModify) {
      console.warn("User does not have permission to modify token values");
      ui.notifications.warn("You do not have permission to modify this token's values.");
      return;
    }
    if (this.actorType !== 'character') {
      console.warn("Armor slots are only available for character actors");
      return;
    }
    if (!actor.system.defenses || !actor.system.defenses['armor-slots']) {
      console.warn("This actor does not have armor slots data");
      return;
    }
    const currentArmorSlots = parseInt(actor.system.defenses['armor-slots'].value) || 0;
    const maxArmorSlots = parseInt(actor.system.defenses.armor.value) || 0;
    const newArmorSlots = Math.max(0, Math.min(maxArmorSlots, currentArmorSlots + delta));
    await actor.update({
      "system.defenses.armor-slots.value": newArmorSlots
    });
  }
  async modifyCharacterStress(delta) {
    if (!this.selectedToken || !this.selectedToken.actor) return;
    const actor = this.selectedToken.actor;
    const canModify = game.user.isGM || game.user.hasRole("ASSISTANT") || actor.isOwner;
    if (!canModify) {
      console.warn("User does not have permission to modify token values");
      ui.notifications.warn("You do not have permission to modify this token's values.");
      return;
    }
    if (this.actorType !== 'character') {
      console.warn("Character stress is only available for character actors");
      return;
    }
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
  updateDisplay() {
    if (!this.hpElement || !this.hopeElement) return;
    const hpValue = this.hpElement.querySelector(".hp-value");
    if (hpValue) {
      hpValue.textContent = `${this.hp.current}/${this.hp.max}`;
    }
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
    if (this.armorSlotsElement && this.actorType === 'character') {
      const armorSlotsValue = this.armorSlotsElement.querySelector(".armor-slots-value");
      if (armorSlotsValue) {
        armorSlotsValue.textContent = `${this.armorSlots.current}/${this.armorSlots.max}`;
      }
    }
    if (this.characterStressElement && this.actorType === 'character') {
      const characterStressValue = this.characterStressElement.querySelector(".character-stress-value");
      if (characterStressValue) {
        characterStressValue.textContent = `${this.characterStress.current}/${this.characterStress.max}`;
      }
    }
  }
  show() {
    if (this.hpElement) {
      this.hpElement.style.display = "flex";
    }
    if (this.hopeElement) {
      this.hopeElement.style.display = "flex";
    }
    if (this.actorType === 'character') {
      if (this.armorSlotsElement) {
        this.armorSlotsElement.style.display = "flex";
      }
      if (this.characterStressElement) {
        this.characterStressElement.style.display = "flex";
      }
    } else {
      if (this.armorSlotsElement) {
        this.armorSlotsElement.style.display = "none";
      }
      if (this.characterStressElement) {
        this.characterStressElement.style.display = "none";
      }
    }
  }
  hide() {
    if (this.hpElement) {
      this.hpElement.style.display = "none";
    }
    if (this.hopeElement) {
      this.hopeElement.style.display = "none";
    }
    if (this.armorSlotsElement) {
      this.armorSlotsElement.style.display = "none";
    }
    if (this.characterStressElement) {
      this.characterStressElement.style.display = "none";
    }
  }
} 
