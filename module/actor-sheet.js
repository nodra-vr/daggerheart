import { EntitySheetHelper } from "./helper.js";
import {ATTRIBUTE_TYPES} from "./constants.js";
import { DaggerheartDialogHelper } from "./dialog-helper.js";
import { SheetTracker } from "./sheet-tracker.js";

/**
* Extend the basic ActorSheet with some very simple modifications
* @extends {ActorSheet}
*/
export class SimpleActorSheet extends foundry.appv1.sheets.ActorSheet {

  _pendingRollType = null;
  sheetTracker = null;
  getPendingRollType() {
    return this._pendingRollType;
  }
  setPendingRollType(newValue){
    this._pendingRollType = newValue;
  }
  _pendingWeaponName = null;

  getPendingWeaponName() {
    return this._pendingWeaponName;
  }
  setPendingWeaponName(newValue){
    this._pendingWeaponName = newValue;
  }

  
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
          classes: ["daggerheart", "sheet", "actor"],
    template: "systems/daggerheart/templates/actor-sheet.html",
      width: 690,
      height: 980,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      scrollY: [".biography", ".items", ".attributes"],
      dragDrop: [
        { dragSelector: ".item-list .item", dropSelector: null },
        { dragSelector: ".card", dropSelector: ".domains-section" }
      ]
    });
  }
  
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    EntitySheetHelper.getAttributeData(context.data);
    context.shorthand = !!game.settings.get("daggerheart", "macroShorthand");
    context.systemData = context.data.system;
    context.domains = this.actor.system.domains;
    context.dtypes = ATTRIBUTE_TYPES;
    
    // Ensure tooltip properties exist for resources (migration fallback)
    if (!context.systemData.health?.tooltip) {
      context.systemData.health = context.systemData.health || {};
      context.systemData.health.tooltip = "Your character's health and well-being are represented by Hit Points and Stress. Hit Points (sometimes called HP) are an abstract reflection of your physical fortitude and ability to take hits from both blade and magic.";
    }
    if (!context.systemData.stress?.tooltip) {
      context.systemData.stress = context.systemData.stress || {};
      context.systemData.stress.tooltip = "Your character's health and well-being are represented by Hit Points and Stress. Hit Points (sometimes called HP) are an abstract reflection of your physical fortitude and ability to take hits from both blade and magic.";
    }
    if (!context.systemData.hope?.tooltip) {
      context.systemData.hope = context.systemData.hope || {};
      context.systemData.hope.tooltip = "Hope and Fear are currencies used by the players and the GM to represent the way fate turns for or against the characters during the game.";
    }
    
    // htmlFields
    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    context.inventoryHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.inventory, {
      secrets: this.document.isOwner,
      async: true
    });

    // Migration is now handled by the system-level migration system

    // Enrich item descriptions
    for (let item of context.data.items) {
      item.system.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, {
        secrets: this.document.isOwner,
        async: true
      });
    }
    
    context.actor = this.actor; // Add this line to include the actor object in the context
    
    const imageLink = context.data.img;
    context.imageStyle = `background: url(${imageLink});`;
    
    // Check if character is dying/dead (hit points maxed out)
    const health = context.systemData.health;
    context.isDying = health && health.value === health.max && health.max > 0;
    
    return context;
  }
  
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  async activateListeners(html) {
    super.activateListeners(html);
    
    // Initialize Sheet Tracker
    if (!this.sheetTracker) {
      this.sheetTracker = new SheetTracker(this);
    }
    // Always initialize on re-render to recreate the DOM
    this.sheetTracker.initialize();
    
    // Disable all transitions during initialization to prevent unwanted animations
    this._disableTransitions();

    // Load and restore persistent vault state
    await this._loadVaultState();

    const vaultList = html.find('.item-list[data-location="vault"]');
    const icon = html.find('.vault-toggle i');

    if (this._vaultOpen) {
      vaultList.removeClass('vault-collapsed');
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
      vaultList.addClass('vault-collapsed');
      icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    }

    // Load and restore persistent category states
    await this._loadCategoryStates();

    const categories = ['class', 'subclass', 'ancestry', 'community', 'abilities', 'worn', 'backpack'];
    categories.forEach(category => {
      const categoryList = html.find(`.item-list[data-location="${this._getCategoryDataType(category)}"]`);
      const categoryIcon = html.find(`.category-toggle[data-category="${category}"] i`);
      const categoryHeader = html.find(`.category-toggle[data-category="${category}"]`).closest('.tab-category');

      if (this._categoryStates[category]) {
        categoryList.removeClass('category-collapsed');
        categoryHeader.removeClass('section-collapsed');
        categoryIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      } else {
        categoryList.addClass('category-collapsed');
        categoryHeader.addClass('section-collapsed');
        categoryIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      }
    });

    // Initialize dynamic spacing for all categories (without transitions)
    this._updateDynamicSpacing(false);

    // Re-enable transitions after initialization is complete
    this._enableTransitions();

    // Mark empty item lists
    this._markEmptyItemLists(html);
    
    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // Setup drag and drop visual feedback
    this._setupDragDropListeners(html);
    
    // Resource Management
    html.find(".resource-control").click(this._onResourceControl.bind(this));
    
    // Attribute Management
    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));
    
    //Clickable Labels Block
    html.find(".traits").on("click", ".trait label", this._onTraitLabelClick.bind(this));
    html.find(".click-rollable-group").on("click", ".click-rollable", this._onRollableClick.bind(this));
    html.find(".basic-rollable-group").on("click", ".basic-rollable", this._onBasicRollableClick.bind(this));
    
    // Item Controls
    html.find(".item-control").click(this._onItemControl.bind(this));
    html.find(".rollable").on("click", this._onItemRoll.bind(this));
    
    // Weapon toggle equip functionality (placeholder)
    html.find('.weapon-toggle-equip').click(this._onToggleWeaponEquip.bind(this));
    
    // Handle toggling item description visibility
    html.find(".item-name[data-action=\"toggle-description\"]").click(this._onToggleDescription.bind(this));
    
    //Cards System
    html.find('.remove-card').click(this._onRemoveCard.bind(this));
    
    // Vault Toggle
    html.find('.vault-toggle').click(this._onToggleVault.bind(this));
    
    // Category Toggle
    html.find('.category-toggle').click(this._onToggleCategory.bind(this));
    
    // Death overlay click handler
    html.find('.death-overlay').click(this._onDeathOverlayClick.bind(this));
    
    // Rest button click handlers
    html.find('.rest-button').click(this._onRestClick.bind(this));
    
    // Nav gem click handler (temporary - runs roll macro)
    html.find('.nav-gem').click(this._onNavGemClick.bind(this));
    
    // Add draggable for Macro creation
    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });
    
    // Make nav-gem draggable for macro creation
    const navGem = html.find('.nav-gem')[0];
    if (navGem) {
      navGem.setAttribute("draggable", true);
      navGem.addEventListener("dragstart", (ev) => {
        // Create the macro data that will be used to create a new macro
        const macroData = {
          name: "Duality Dice Roll",
          type: "script",
          scope: "global",
          img: "https://i.imgur.com/VSTKJWt.png",
          command: `// Duality Dice Roll Macro
// Uses the centralized rollHandler system for consistent dice rolling
// Will use selected token's actor or the user's assigned character

await game.daggerheart.rollHandler.dualityWithDialog({
  title: "Duality Dice Roll"
});`
        };
        
        // Set the drag data in the format Foundry expects
        const dragData = {
          type: "Macro",
          data: macroData
        };
        
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    }
    
    // Tooltip functionality with 50ms delay
    let tooltipElement = null;
    html.find("[data-trait-tooltip]").each((i, element) => {
      let tooltipTimeout;
      
      element.addEventListener("mouseenter", (e) => {
        const tooltipText = element.getAttribute("data-trait-tooltip");
        if (tooltipText && tooltipText.trim() !== "") {
          tooltipTimeout = setTimeout(() => {
            // Create tooltip element
            if (!tooltipElement) {
              tooltipElement = document.createElement('div');
              tooltipElement.className = 'daggerheart-tooltip';
              tooltipElement.innerHTML = `
                <div class="tooltip-arrow"></div>
                <div class="tooltip-content"></div>
              `;
              document.body.appendChild(tooltipElement);
            }
            
            // Set content and show
            tooltipElement.querySelector('.tooltip-content').textContent = tooltipText;
            tooltipElement.classList.add('show');
            
            // Position tooltip
            const rect = element.getBoundingClientRect();
            const tooltipRect = tooltipElement.getBoundingClientRect();
            
            // Calculate position
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            let top = rect.top - tooltipRect.height - 8;
            
            // Keep tooltip on screen
            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) {
              left = window.innerWidth - tooltipRect.width - 10;
            }
            if (top < 10) {
              // Show below if not enough space above
              top = rect.bottom + 8;
              tooltipElement.classList.add('below');
            } else {
              tooltipElement.classList.remove('below');
            }
            
            tooltipElement.style.left = left + 'px';
            tooltipElement.style.top = top + 'px';
          }, 50);
        }
      });
      
      element.addEventListener("mouseleave", () => {
        clearTimeout(tooltipTimeout);
        if (tooltipElement) {
          tooltipElement.classList.remove('show');
        }
      });
    });
    
    // Trait value popup functionality
    html.find(".trait-value-display").click(this._onTraitValueClick.bind(this));
    
    // Generic attribute value popup functionality
    html.find(".attribute-value-display").click(this._onAttributeValueClick.bind(this));
    
    // Damage value popup functionality
    html.find(".damage-value-display").click(this._onDamageValueClick.bind(this));
    
    // Threshold HP marking functionality
    html.find(".threshold-clickable").click(this._onThresholdClick.bind(this));
    
    // Dynamic text sizing for inputs
    function adjustTextSize(input, baseFontSizeEm = 1, minFontSizeEm = 0.5) {
      const $input = $(input);
      const text = $input.val();
      const maxWidth = $input.width();
      
      // Convert em to px for calculation
      const parentFontSize = parseInt($input.parent().css('font-size'));
      const baseFontSize = baseFontSizeEm * parentFontSize;
      const minFontSize = minFontSizeEm * parentFontSize;
      
      // Create a temporary span to measure text width
      const $temp = $('<span>').css({
        visibility: 'hidden',
        position: 'absolute',
        fontSize: baseFontSize + 'px',
        fontFamily: $input.css('font-family'),
        fontWeight: $input.css('font-weight'),
        letterSpacing: $input.css('letter-spacing'),
        textTransform: $input.css('text-transform'),
        whiteSpace: 'nowrap'
      }).text(text || $input.attr('placeholder') || '');
      
      $('body').append($temp);
      
      let fontSize = baseFontSize;
      let textWidth = $temp.width();
      
      // Calculate appropriate font size
      if (textWidth > maxWidth) {
        fontSize = Math.max(minFontSize, Math.floor(baseFontSize * (maxWidth / textWidth) * 0.9));
      }
      
      $temp.remove();
      
      // Convert back to em
      const fontSizeEm = fontSize / parentFontSize;
      $input.css('font-size', fontSizeEm + 'em');
    }
    
    // Domain input dynamic text sizing
    const domainInputs = html.find('.header-domain input');
    
    // Apply sizing on initial load
    domainInputs.each(function() {
      adjustTextSize(this, 1, 0.625); // 16px base (1em), 10px min (0.625em)
    });
    
    // Apply sizing on input change
    domainInputs.on('input', function() {
      adjustTextSize(this, 1, 0.625);
    });
    
    // Character name dynamic text sizing
    const charnameInput = html.find('.charname input');
    
    // Apply sizing on initial load
    charnameInput.each(function() {
      adjustTextSize(this, 2.5, 1.2); // 2.5em base, 1.2em min
    });
    
    // Apply sizing on input change
    charnameInput.on('input', function() {
      adjustTextSize(this, 2.5, 1.2);
    });
    
    // Dealing with Input width
    let el = html.find(".input-wrap .input");
    let widthMachine = html.find(".input-wrap .width-machine");
    el.on("keyup", () => {
      widthMachine.html(el.val());
    });
    
    // Dealing with Textarea Height
    function calcHeight(value) {
      let numberOfLineBreaks = (value.match(/\n/g) || []).length;
      // min-height + lines x line-height + padding + border
      let newHeight = 20 + numberOfLineBreaks * 20 + 12 + 2;
      return newHeight;
    }
    
    let textarea = html.find(".resize-ta");
    textarea.on("keyup", () => {
      textarea.css("height", calcHeight(textarea.val()) + "px");
    });



  }

  /* -------------------------------------------- */
  
  /**
   * Handle toggle equip for weapon items
   * @param {Event} event The click event
   * @private
   */
  async _onToggleWeaponEquip(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item || item.type !== "weapon") {
      console.warn("Toggle equip called on non-weapon item");
      return;
    }
    
    // Toggle the equipped state
    const newEquippedState = !item.system.equipped;
    
    try {
      await item.update({
        "system.equipped": newEquippedState
      });
      
      // Update button visual state immediately
      if (newEquippedState) {
        button.classList.add('equipped');
        button.title = 'Unequip';
      } else {
        button.classList.remove('equipped');
        button.title = 'Equip';
      }
      
      console.log(`${item.name} ${newEquippedState ? 'equipped' : 'unequipped'}`);
      
    } catch (error) {
      console.error("Failed to toggle weapon equipped state:", error);
      ui.notifications.error(`Failed to ${newEquippedState ? 'equip' : 'unequip'} ${item.name}`);
    }
  }

  /* -------------------------------------------- */
  
  // Migration system has been moved to module/migrations.js and runs at system level

  /* -------------------------------------------- */
  
  /**
   * Setup drag and drop visual feedback
   * @param {jQuery} html The rendered HTML
   * @private
   */
  _setupDragDropListeners(html) {
    const form = html[0];
    
    // Add drag start listener to set dragging state
    form.addEventListener('dragstart', (event) => {
      if (event.target.closest('.item')) {
        form.classList.add('dragging');
      }
    });
    
    // Add drag end listener to remove dragging state
    form.addEventListener('dragend', (event) => {
      form.classList.remove('dragging');
      // Remove all drag-over states
      form.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });
    
    // Add drag over listeners for item lists
    html.find('.item-list').on('dragover', (event) => {
      event.preventDefault();
      event.currentTarget.classList.add('drag-over');
    });
    
    html.find('.item-list').on('dragleave', (event) => {
      // Only remove if we're leaving the element, not entering a child
      if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('drag-over');
      }
    });
    
    // Add drag over listeners for section headers
    html.find('.tab-category').on('dragover', (event) => {
      event.preventDefault();
      event.currentTarget.classList.add('drag-over');
    });
    
    html.find('.tab-category').on('dragleave', (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('drag-over');
      }
    });

    // Add drop listeners for section headers
    html.find('.tab-category').on('drop', (event) => {
      event.preventDefault();
      const category = event.currentTarget;
      
      // find item list
      let itemList = category.nextElementSibling;
      while (itemList && !itemList.classList.contains('item-list')) {
        itemList = itemList.nextElementSibling;
      }
      
      if (itemList && itemList.classList.contains('item-list')) {
        // Trigger the drop on the associated item list
        const dropEvent = new DragEvent('drop', {
          dataTransfer: event.originalEvent.dataTransfer,
          bubbles: true,
          cancelable: true
        });
        itemList.dispatchEvent(dropEvent);
      }
      
      category.classList.remove('drag-over');
    });
  }
  
  /* -------------------------------------------- */
  
  /**
  * Handle click events for Item control buttons within the Actor Sheet
  * @param event
  * @private
  */
  async _onItemControl(event) {
    event.preventDefault();
    
    // Obtain event data
    const button = event.currentTarget;
    const li = button.closest(".item");
    const item = this.actor.items.get(li?.dataset.itemId);
    const action = button.dataset.action;

    // If the clicked element is an IMG with data-action="edit" (the item's image)
    if (item && action === "edit" && button.tagName === 'IMG' && button.classList.contains('item-control')) {
      const itemData = item.system;
      const description = await TextEditor.enrichHTML(itemData.description, {secrets: this.actor.isOwner, async: true});
      const chatCard = `
      <div class="item-card-chat" data-item-id="${item.id}" data-actor-id="${this.actor.id}">
          <div class="card-image-container" style="background-image: url('${item.img}')">
              <div class="card-header-text">
                  <h3>${item.name}</h3>
              </div>
          </div>
          <div class="card-content">
              <div class="card-subtitle">
                  <span>${itemData.category || ''} - ${itemData.rarity || ''}</span>
              </div>
              <div class="card-description">
                  ${description}
              </div>
          </div>
      </div>
      `;

      ChatMessage.create({
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: chatCard
      });
      return; // Done, don't proceed to open edit sheet
    }
    
    const type = button.dataset.type; // Ensure type is read for create actions
    const location = button.dataset.location; // Get location for new items
    
    switch (action) {
      case "create":
      const clsi = getDocumentClass("Item");
      return clsi.create({
        name: "New Ability", 
        type: type,
        system: { location: location || "abilities" }
      }, {parent: this.actor});
      case "create-item":
      const cls = getDocumentClass("Item");
      return cls.create({
        name: "New Item", 
        type: type,
        system: { location: location || "backpack" }
      }, {parent: this.actor});
      case "create-domain":
      const clsd = getDocumentClass("Item");
      return clsd.create({
        name: "New Domain", 
        type: type,
        system: { location: location || "abilities" }
      }, {parent: this.actor});
      case "create-ancestry":
      const clsa = getDocumentClass("Item");
      return clsa.create({
        name: "New Ancestry", 
        type: type,
        system: { location: location || "ancestry" }
      }, {parent: this.actor});
      case "create-community":
      const clscom = getDocumentClass("Item");
      return clscom.create({
        name: "New Community", 
        type: type,
        system: { location: location || "community" }
      }, {parent: this.actor});
      case "create-class":
      const clscl = getDocumentClass("Item");
      return clscl.create({
        name: "New Class", 
        type: type,
        system: { location: location || "class" }
      }, {parent: this.actor});
      case "create-subclass":
      const clssc = getDocumentClass("Item");
      return clssc.create({
        name: "New Subclass", 
        type: type,
        system: { location: location || "subclass" }
      }, {parent: this.actor});
      case "edit": // edit icon
        if (item) return item.sheet.render(true);
        break;
      case "delete":
        if (item) return item.delete();
        break;
      case "send-to-vault":
        if (item) {
          // Simply change location to vault - preserve item type and all other data
          return item.update({
            "system.location": "vault"
          });
        }
        break;
      case "send-to-domain":
        if (item && item.system.location === "vault") {
          // Simply change location to abilities - preserve item type and all other data
          return item.update({
            "system.location": "abilities"
          });
        }
        break;
    }
  }
  
  /* -------------------------------------------- */
  
  /**
  * Listen for roll buttons on items.
  * @param {MouseEvent} event    The originating left click event
  */
  async _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    
    // Use the rollHandler for consistent roll handling
    await game.daggerheart.rollHandler.quickRoll(button.data('roll'), {
      flavor: `<p class="roll-flavor-line"><b>${item.name}</b> - ${button.text()}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }
  
  /* -------------------------------------------- */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    
    if (data.type === "Card") {
      event.preventDefault();
      const card = await fromUuid(data.uuid);
      const domains = this.actor.system.domains || [];
      const newCardId = foundry.utils.randomID(); // Generate a unique ID for the new card instance
      domains.push({ _id: newCardId, name: card.name, img: card.img });
      await this.actor.update({"system.domains": domains});
      return;
    }
    
    super._onDrop(event);
  }
  
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;

    const targetList = event.target.closest('.item-list');
    if (!targetList) return false;

    // Use location instead of type for organization
    const newLocation = targetList.dataset.location;
    if (!newLocation) return false;

    const item = await Item.implementation.fromDropData(data);
    
    // Clean up drag states
    this.element[0].classList.remove('dragging');
    this.element[0].querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    
    // same actor move - only change location, preserve type
    if (this.actor.items.has(item.id)) {
        const existingItem = this.actor.items.get(item.id);
        
        // Check if location is already the same
        if (existingItem.system.location === newLocation) {
          return;
        }

        // Update location only - preserve item type and all other data
        try {
          const result = await existingItem.update({
            "system.location": newLocation
          });
          return result;
        } catch (error) {
          ui.notifications?.error(`Failed to move ${item.name}: ${error.message}`);
          return false;
        }

    } else {
      // Creating a new item from external drop - set location but preserve type
      const newItemData = item.toObject();
      newItemData.system.location = newLocation;
      
      try {
        const result = await this.actor.createEmbeddedDocuments("Item", [newItemData]);
        return result;
      } catch (error) {
        ui.notifications?.error(`Failed to create ${item.name}: ${error.message}`);
        return false;
      }
    }
  }
  /* -------------------------------------------- */
  
  
  async _onRemoveCard(event) {
    event.preventDefault();
    const cardId = event.currentTarget.dataset.cardId;
    const domains = this.actor.system.domains || [];
    const updatedDomains = domains.filter(domain => domain._id !== cardId);
    await this.actor.update({"system.domains": updatedDomains});
  }
  
  /* -------------------------------------------- */
  
  
  /** @inheritdoc */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    
    
    formData = EntitySheetHelper.updateAttributes(formData, this.object);
    formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }
  
  /* -------------------------------------------- */
  
  
  async _onTraitLabelClick(event) {
    event.preventDefault();
    const traitName = event.currentTarget.closest(".trait").dataset.trait;
    const traitValue = this.actor.system[traitName].value;
    await this._rollTrait(traitName, traitValue);
  }
  
  /* -------------------------------------------- */
  
  async _onTraitValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;
    
    // Use the new generic attribute system
    this._onAttributeValueClick(event);
  }
  
  /* -------------------------------------------- */
  
  async _onDamageValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;
    
    // Get configuration from data attributes or derive from context
    const config = {
      field: displayElement.dataset.field,
      label: displayElement.dataset.label,
      type: displayElement.dataset.editType || 'damage',
      hasModifiers: displayElement.dataset.hasModifiers !== 'false',
      min: displayElement.dataset.min ? parseInt(displayElement.dataset.min) : null,
      max: displayElement.dataset.max ? parseInt(displayElement.dataset.max) : null
    };
    
    // If no label provided, use a default
    if (!config.label) {
      config.label = 'Weapon Damage';
    }
    
    // Get the actual damage data using the field path
    let damageData = foundry.utils.getProperty(this.actor, config.field);
    
    // Normalize the damage data to structured format
    if (typeof damageData === 'object' && damageData !== null && 'baseValue' in damageData) {
      // Already structured - but check for corrupted baseValue that might contain flattened formula
      const baseValue = damageData.baseValue || '1d8';
      const modifiers = damageData.modifiers || [];
      
      // If baseValue contains spaces and we have no modifiers, it might be a flattened formula
      // that got corrupted - try to extract the real base value
      if (baseValue.includes(' ') && modifiers.length === 0) {
        // Extract just the first dice part as the real base
        const match = baseValue.match(/^(\d*d\d+)/);
        if (match) {
          damageData.baseValue = match[1];
          damageData.modifiers = [];
          damageData.value = match[1];
        }
      }
    } else if (typeof damageData === 'object' && damageData !== null && 'value' in damageData) {
      // Has .value but missing structure - this is a legacy mixed case
      const displayValue = damageData.value || '1d8';
      damageData = {
        baseValue: displayValue, // Treat the existing value as base (might be flattened)
        modifiers: damageData.modifiers || [],
        value: displayValue
      };
    } else {
      // Simple string/primitive - convert to structure
      const simpleValue = damageData || '1d8';
      damageData = {
        baseValue: simpleValue,
        modifiers: [],
        value: simpleValue
      };
    }
    
    // Ensure modifiers is always an array
    if (!Array.isArray(damageData.modifiers)) {
      damageData.modifiers = [];
    }
    
    // Show the damage modifier popup
    this._showDamageModifierEditPopup(config, damageData, displayElement);
  }
  
  /* -------------------------------------------- */
  
  async _onAttributeValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;
    
    // Get configuration from data attributes or derive from context
    const config = {
      field: displayElement.dataset.field,
      label: displayElement.dataset.label,
      type: displayElement.dataset.editType || 'modifiers',
      hasModifiers: displayElement.dataset.hasModifiers !== 'false',
      min: displayElement.dataset.min ? parseInt(displayElement.dataset.min) : null,
      max: displayElement.dataset.max ? parseInt(displayElement.dataset.max) : null
    };
    
    // If no label provided, try to extract from parent element
    if (!config.label) {
      const parentElement = displayElement.closest("[data-trait], [data-defense]");
      if (parentElement) {
        const attrName = parentElement.dataset.trait || parentElement.dataset.defense || 'Value';
        config.label = attrName.charAt(0).toUpperCase() + attrName.slice(1);
      } else {
        config.label = 'Value';
      }
    }
    
    // Get the current value using the field path
    let currentValue = foundry.utils.getProperty(this.actor, config.field);
    
    // Handle both simple values and complex objects with .value
    if (typeof currentValue === 'object' && currentValue !== null && 'value' in currentValue) {
      currentValue = currentValue.value || 0;
    } else {
      currentValue = currentValue || 0;
    }
    
    // Get attribute data for modifiers if applicable
    const pathParts = config.field.split('.');
    let attributeData = this.actor;
    for (let i = 0; i < pathParts.length - 1; i++) {
      attributeData = attributeData[pathParts[i]] || {};
    }
    
    // For weapon modifiers, if the data is empty, get the actual field value
    const isWeaponModifier = config.field.includes('weapon-main.to-hit') || config.field.includes('weapon-off.to-hit');
    if (isWeaponModifier && (!attributeData || Object.keys(attributeData).length === 0)) {
      attributeData = currentValue;
    }
    
    // Ensure modifiers is always an array
    if (config.hasModifiers && !Array.isArray(attributeData.modifiers)) {
      attributeData.modifiers = [];
    }
    
    // Show the appropriate popup
    if (config.hasModifiers) {
      this._showModifierEditPopup(config, currentValue, attributeData, displayElement);
    } else {
      this._showSimpleEditPopup(config, currentValue, displayElement);
    }
  }
  
  /* -------------------------------------------- */
  
  _showModifierEditPopup(config, currentValue, attributeData, displayElement) {
    // Create the popup HTML if it doesn't exist
    let overlay = this.element.find('.attribute-edit-popup-overlay');
    if (overlay.length === 0) {
      const popupHtml = `
        <div class="attribute-edit-popup-overlay trait-edit-popup-overlay" style="display: none;">
          <div class="attribute-edit-popup trait-edit-popup">
            <div class="attribute-edit-header trait-edit-header">
              <span class="attribute-edit-label trait-edit-label"></span>
              <button type="button" class="attribute-edit-close trait-edit-close">×</button>
            </div>
            <div class="attribute-edit-content trait-edit-content">
              <div class="attribute-base-value trait-base-value">
                <label>Base Value</label>
                <div class="base-value-controls">
                  <button type="button" class="base-value-decrement">-</button>
                  <input type="number" class="attribute-base-input trait-base-input" />
                  <button type="button" class="base-value-increment">+</button>
                </div>
              </div>
              <div class="attribute-modifiers-section trait-modifiers-section">
                <div class="modifiers-header">
                  <span>Modifiers</span>
                  <button type="button" class="add-modifier-btn">+</button>
                </div>
                <div class="modifiers-list"></div>
              </div>
              <div class="attribute-total trait-total">
                <label>Total</label>
                <span class="attribute-total-value trait-total-value">0</span>
              </div>
            </div>
          </div>
        </div>
      `;
      this.element.append(popupHtml);
      overlay = this.element.find('.attribute-edit-popup-overlay');
    }
    
    // Extract attribute name for data access
    const pathParts = config.field.split('.');
    const attributeName = pathParts[pathParts.length - 2]; // e.g., "system.strength.value" -> "strength"
    
    // Set up the popup content
    overlay.find('.attribute-edit-label').text(config.label);
    
    // Set base value (fallback to current value if no baseValue exists)
    const baseInput = overlay.find('.attribute-base-input');
    let baseValue;
    
    // Handle weapon modifiers which might store data directly at the field path
    if (typeof attributeData === 'object' && 'baseValue' in attributeData) {
      baseValue = attributeData.baseValue;
    } else if (typeof attributeData === 'object' && 'value' in attributeData && 'modifiers' in attributeData) {
      // Already has complex structure but no baseValue - use current total as base
      baseValue = currentValue;
    } else {
      // Simple value - use it as base
      baseValue = currentValue;
    }
    
    baseInput.val(baseValue);
    
    // Apply min/max constraints if specified
    if (config.min !== null) baseInput.attr('min', config.min);
    if (config.max !== null) baseInput.attr('max', config.max);
    
    // Store config for later use
    overlay.data('config', config);
    overlay.data('attribute-name', attributeName);
    overlay.data('field-name', config.field);
    overlay.data('display-element', displayElement);
    
    // Load existing modifiers
    this._loadModifiers(overlay, attributeData.modifiers || []);
    
    // Calculate and display total
    this._updateTotal(overlay);
    
    // Show the popup with animation
    overlay.show();
    const popup = overlay.find('.attribute-edit-popup');
    
    // Animate in with JavaScript for smooth backdrop-filter
    this._animatePopupIn(popup, () => {
      baseInput.focus().select();
    });
    
    // Set up event handlers
    this._setupPopupEventHandlers(overlay);
  }
  
  /* -------------------------------------------- */
  
  _showSimpleEditPopup(config, currentValue, displayElement) {
    // Create simple popup HTML
    let overlay = this.element.find('.attribute-edit-popup-overlay');
    if (overlay.length === 0) {
      const popupHtml = `
        <div class="attribute-edit-popup-overlay trait-edit-popup-overlay" style="display: none;">
          <div class="attribute-edit-popup trait-edit-popup attribute-edit-simple">
            <div class="attribute-edit-header trait-edit-header">
              <span class="attribute-edit-label trait-edit-label"></span>
              <button type="button" class="attribute-edit-close trait-edit-close">×</button>
            </div>
            <div class="attribute-edit-content trait-edit-content">
              <div class="attribute-simple-value">
                <input type="number" class="attribute-simple-input" />
              </div>
            </div>
          </div>
        </div>
      `;
      this.element.append(popupHtml);
      overlay = this.element.find('.attribute-edit-popup-overlay');
    }
    
    // Set up the popup
    overlay.find('.attribute-edit-label').text(config.label);
    const input = overlay.find('.attribute-simple-input');
    input.val(currentValue);
    
    // Apply constraints
    if (config.min !== null) input.attr('min', config.min);
    if (config.max !== null) input.attr('max', config.max);
    
    // Store config
    overlay.data('config', config);
    overlay.data('display-element', displayElement);
    
    // Show the popup
    overlay.show();
    const popup = overlay.find('.attribute-edit-popup');
    
    this._animatePopupIn(popup, () => {
      input.focus().select();
    });
    
    // Set up event handlers for simple popup
    this._setupSimplePopupEventHandlers(overlay);
  }
  
  /* -------------------------------------------- */
  
  _showDamageModifierEditPopup(config, damageData, displayElement) {
    // Create the damage popup HTML if it doesn't exist
    let overlay = this.element.find('.damage-edit-popup-overlay');
    if (overlay.length === 0) {
      const popupHtml = `
        <div class="damage-edit-popup-overlay attribute-edit-popup-overlay" style="display: none;">
          <div class="damage-edit-popup attribute-edit-popup">
            <div class="damage-edit-header attribute-edit-header">
              <span class="damage-edit-label attribute-edit-label"></span>
              <button type="button" class="damage-edit-close attribute-edit-close">×</button>
            </div>
            <div class="damage-edit-content attribute-edit-content">
              <div class="damage-base-value attribute-base-value">
                <label>Base Formula</label>
                <div class="base-value-controls">
                  <input type="text" class="damage-base-input attribute-base-input" placeholder="1d8" />
                </div>
              </div>
              <div class="damage-modifiers-section attribute-modifiers-section">
                <div class="modifiers-header">
                  <span>Damage Modifiers</span>
                  <button type="button" class="add-damage-modifier-btn add-modifier-btn">+</button>
                </div>
                <div class="damage-modifiers-list modifiers-list"></div>
              </div>
              <div class="damage-total attribute-total">
                <label>Total Formula</label>
                <span class="damage-total-value attribute-total-value">1d8</span>
              </div>
            </div>
          </div>
        </div>
      `;
      this.element.append(popupHtml);
      overlay = this.element.find('.damage-edit-popup-overlay');
    }
    
    // Extract attribute name for data access
    const pathParts = config.field.split('.');
    const attributeName = pathParts[pathParts.length - 2]; // e.g., "system.weapon-main.damage" -> "weapon-main"
    
    // Set up the popup content
    overlay.find('.damage-edit-label').text(config.label);
    
    // Set base value from structured damage data
    const baseInput = overlay.find('.damage-base-input');
    const baseValue = damageData.baseValue || '1d8';
    
    baseInput.val(baseValue);
    
    // Store config for later use
    overlay.data('config', config);
    overlay.data('attribute-name', attributeName);
    overlay.data('field-name', config.field);
    overlay.data('display-element', displayElement);
    
    // Load existing modifiers
    this._loadDamageModifiers(overlay, damageData.modifiers || []);
    
    // Calculate and display total
    this._updateDamageTotal(overlay);
    
    // Show the popup with animation
    overlay.show();
    const popup = overlay.find('.damage-edit-popup');
    
    // Animate in with JavaScript for smooth backdrop-filter
    this._animatePopupIn(popup, () => {
      baseInput.focus().select();
    });
    
    // Set up event handlers
    this._setupDamagePopupEventHandlers(overlay);
  }
  
  /* -------------------------------------------- */
  
  _setupPopupEventHandlers(overlay) {
    // Clear any existing handlers
    overlay.off('.attribute-edit');
    overlay.find('*').off('.attribute-edit');
    
    // Base value input handler
    const baseInput = overlay.find('.attribute-base-input');
    baseInput.on('input', () => this._updateTotal(overlay));
    
    // Base value increment/decrement buttons
    overlay.find('.base-value-increment').on('click', () => {
      const currentValue = parseInt(baseInput.val()) || 0;
      baseInput.val(currentValue + 1);
      this._updateTotal(overlay);
    });
    
    overlay.find('.base-value-decrement').on('click', () => {
      const currentValue = parseInt(baseInput.val()) || 0;
      const newValue = Math.max(-3, currentValue - 1); // Allow values down to -3 for traits
      baseInput.val(newValue);
      this._updateTotal(overlay);
    });
    
    // Keyboard shortcuts
    overlay.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideAttributeEditPopup(overlay);
      }
    });
    
    // Add modifier button
    overlay.find('.add-modifier-btn').on('click', () => {
      this._addModifier(overlay);
    });
    
    // Close button
    overlay.find('.attribute-edit-close').on('click', () => {
      this._submitAttributeEdit(overlay);
    });
    
    // Click outside to close (only on the overlay background)
    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitAttributeEdit(overlay);
      }
    });
  }
  
  /* -------------------------------------------- */
  
  _setupSimplePopupEventHandlers(overlay) {
    // Clear any existing handlers
    overlay.off('.attribute-edit');
    overlay.find('*').off('.attribute-edit');
    
    const input = overlay.find('.attribute-simple-input');
    
    // Enter key to submit
    input.on('keydown', (e) => {
      if (e.key === 'Enter') {
        this._submitSimpleEdit(overlay);
      } else if (e.key === 'Escape') {
        this._hideAttributeEditPopup(overlay);
      }
    });
    
    // Close button
    overlay.find('.attribute-edit-close').on('click', () => {
      this._submitSimpleEdit(overlay);
    });
    
    // Click outside to close
    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitSimpleEdit(overlay);
      }
    });
  }
  
  /* -------------------------------------------- */
  
  _loadModifiers(overlay, modifiers) {
    const modifiersList = overlay.find('.modifiers-list');
    modifiersList.empty();
    
    // Ensure modifiers is an array
    if (!Array.isArray(modifiers)) {
      modifiers = [];
    }
    
    modifiers.forEach((modifier, index) => {
      this._createModifierRow(overlay, modifier, index);
    });
  }
  
  /* -------------------------------------------- */
  
  _createModifierRow(overlay, modifier, index) {
    const modifiersList = overlay.find('.modifiers-list');
    const row = $(`
      <div class="modifier-row ${modifier.enabled === false ? 'disabled' : ''}" data-index="${index}">
        <input type="text" class="modifier-name" placeholder="Modifier name" value="${modifier.name || ''}" />
        <input type="number" class="modifier-value" placeholder="±0" value="${modifier.value || 0}" />
        <input type="checkbox" class="modifier-toggle" ${modifier.enabled !== false ? 'checked' : ''} />
        <button type="button" class="modifier-delete">×</button>
      </div>
    `);
    
    // Simple event handlers without propagation issues
    row.find('.modifier-name, .modifier-value').on('input', () => this._updateTotal(overlay));
    
    row.find('.modifier-toggle').on('click change', (e) => {
      e.stopPropagation();
      const checkbox = $(e.currentTarget);
      const isEnabled = checkbox.prop('checked');
      row.toggleClass('disabled', !isEnabled);
      this._updateTotal(overlay);
    });
    
    row.find('.modifier-delete').on('click', (e) => {
      e.stopPropagation();
      row.remove();
      this._updateTotal(overlay);
    });
    
    modifiersList.append(row);
  }
  
  /* -------------------------------------------- */
  
  _setupDamagePopupEventHandlers(overlay) {
    // Clear any existing handlers
    overlay.off('.damage-edit');
    overlay.find('*').off('.damage-edit');
    
    // Base value input handler
    const baseInput = overlay.find('.damage-base-input');
    baseInput.on('input', () => this._updateDamageTotal(overlay));
    
    // Keyboard shortcuts
    overlay.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideDamageEditPopup(overlay);
      }
    });
    
    // Add modifier button
    overlay.find('.add-damage-modifier-btn').on('click', () => {
      this._addDamageModifier(overlay);
    });
    
    // Close button
    overlay.find('.damage-edit-close').on('click', () => {
      this._submitDamageEdit(overlay);
    });
    
    // Click outside to close (only on the overlay background)
    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitDamageEdit(overlay);
      }
    });
  }
  
  /* -------------------------------------------- */
  
  _loadDamageModifiers(overlay, modifiers) {
    const modifiersList = overlay.find('.damage-modifiers-list');
    modifiersList.empty();
    
    // Ensure modifiers is an array
    if (!Array.isArray(modifiers)) {
      modifiers = [];
    }
    
    modifiers.forEach((modifier, index) => {
      this._createDamageModifierRow(overlay, modifier, index);
    });
  }
  
  /* -------------------------------------------- */
  
  _createDamageModifierRow(overlay, modifier, index) {
    const modifiersList = overlay.find('.damage-modifiers-list');
    const row = $(`
      <div class="damage-modifier-row modifier-row ${modifier.enabled === false ? 'disabled' : ''}" data-index="${index}">
        <input type="text" class="damage-modifier-name modifier-name" placeholder="Modifier name" value="${modifier.name || ''}" />
        <input type="text" class="damage-modifier-value modifier-value" placeholder="±1 or ±1d4" value="${modifier.value || ''}" />
        <input type="checkbox" class="damage-modifier-toggle modifier-toggle" ${modifier.enabled !== false ? 'checked' : ''} />
        <button type="button" class="damage-modifier-delete modifier-delete">×</button>
      </div>
    `);
    
    // Simple event handlers without propagation issues
    row.find('.damage-modifier-name, .damage-modifier-value').on('input', () => this._updateDamageTotal(overlay));
    
    row.find('.damage-modifier-toggle').on('click change', (e) => {
      e.stopPropagation();
      const checkbox = $(e.currentTarget);
      const isEnabled = checkbox.prop('checked');
      row.toggleClass('disabled', !isEnabled);
      this._updateDamageTotal(overlay);
    });
    
    row.find('.damage-modifier-delete').on('click', (e) => {
      e.stopPropagation();
      row.remove();
      this._updateDamageTotal(overlay);
    });
    
    modifiersList.append(row);
  }
  
  /* -------------------------------------------- */
  
  _addDamageModifier(overlay) {
    const newModifier = {
      name: 'Modifier',
      value: '+1',
      enabled: true
    };
    
    const modifiersList = overlay.find('.damage-modifiers-list');
    const index = modifiersList.children().length;
    
    this._createDamageModifierRow(overlay, newModifier, index);
    
    // Focus the name input of the new modifier and select the text
    const newRow = modifiersList.children().last();
    const nameInput = newRow.find('.damage-modifier-name');
    nameInput.focus().select();
  }
  
  /* -------------------------------------------- */
  
  _updateDamageTotal(overlay) {
    const baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    let modifierParts = [];
    
    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      const isEnabled = $row.find('.damage-modifier-toggle').is(':checked');
      
      if (isEnabled) {
        const value = $row.find('.damage-modifier-value').val().trim();
        if (value) {
          // Ensure proper formatting - add + if it doesn't start with + or -
          let formattedValue = value;
          if (value && !value.startsWith('+') && !value.startsWith('-')) {
            formattedValue = '+' + value;
          }
          modifierParts.push(formattedValue);
        }
      }
    });
    
    // Build the total formula
    let totalFormula = baseValue;
    if (modifierParts.length > 0) {
      totalFormula += ' ' + modifierParts.join(' ');
    }
    
    // Update the popup preview total
    overlay.find('.damage-total-value').text(totalFormula);
    
    // DO NOT update the display element during editing - only for preview
    // This preserves the structured data for future editing
    
    return totalFormula;
  }
  
  /* -------------------------------------------- */
  
  async _submitDamageEdit(overlay) {
    const config = overlay.data('config');
    const attributeName = overlay.data('attribute-name');
    const baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    
    // Collect modifiers
    const modifiers = [];
    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      let name = $row.find('.damage-modifier-name').val().trim();
      const value = $row.find('.damage-modifier-value').val().trim();
      const enabled = $row.find('.damage-modifier-toggle').is(':checked');
      
      // Only save modifiers that have a value (even if name is empty)
      if (value) {
        // Default name if empty
        if (!name) {
          name = 'Modifier';
        }
        modifiers.push({
          name: name,
          value: value,
          enabled: enabled
        });
      }
    });
    
    // Calculate final formula for the value field
    let totalFormula = baseValue;
    const enabledModifiers = modifiers.filter(mod => mod.enabled !== false && mod.value);
    
    if (enabledModifiers.length > 0) {
      enabledModifiers.forEach(modifier => {
        let modValue = modifier.value.trim();
        // Ensure proper formatting - add + if it doesn't start with + or -
        if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
          modValue = '+' + modValue;
        }
        totalFormula += ' ' + modValue;
      });
    }
    
    // Build update data based on the field path
    const updateData = {};
    
    // Check if we're dealing with weapon damage
    const isWeaponDamage = config.field.includes('weapon-main.damage') || config.field.includes('weapon-off.damage');
    
    let basePath;
    if (isWeaponDamage) {
      // For weapon damage, the field itself is the base path
      basePath = config.field;
    } else {
      // For other attributes, remove .value from the path
      basePath = config.field.substring(0, config.field.lastIndexOf('.'));
    }
    
    updateData[`${basePath}.baseValue`] = baseValue;
    updateData[`${basePath}.modifiers`] = modifiers;
    updateData[`${basePath}.value`] = totalFormula;
    
    await this.actor.update(updateData);
    
    // DO NOT update the display element directly - let the sheet re-render
    // This preserves the structured data for future editing
    
    this._hideDamageEditPopup(overlay);
  }
  
  /* -------------------------------------------- */
  
  _hideDamageEditPopup(overlay) {
    const popup = overlay.find('.damage-edit-popup');
    this._animatePopupOut(popup, () => {
      overlay.hide();
      overlay.remove(); // Clean up the popup
    });
  }
  
  /* -------------------------------------------- */
  
  _addModifier(overlay) {
    const newModifier = {
      name: 'Modifier',
      value: 0,
      enabled: true
    };
    
    const modifiersList = overlay.find('.modifiers-list');
    const index = modifiersList.children().length;
    
    this._createModifierRow(overlay, newModifier, index);
    
    // Focus the name input of the new modifier and select the text
    const newRow = modifiersList.children().last();
    const nameInput = newRow.find('.modifier-name');
    nameInput.focus().select();
  }
  
  /* -------------------------------------------- */
  
  _updateTotal(overlay) {
    const baseValue = parseInt(overlay.find('.attribute-base-input').val()) || 0;
    let modifierTotal = 0;
    
    overlay.find('.modifier-row').each((index, row) => {
      const $row = $(row);
      const isEnabled = $row.find('.modifier-toggle').is(':checked');
      
      if (isEnabled) {
        const value = parseInt($row.find('.modifier-value').val()) || 0;
        modifierTotal += value;
      }
    });
    
    const total = baseValue + modifierTotal;
    overlay.find('.attribute-total-value').text(total);
    
    // Update the display element immediately
    const displayElement = overlay.data('display-element');
    if (displayElement) {
      $(displayElement).text(total);
    }
    
    return total;
  }
  
  /* -------------------------------------------- */
  
  async _submitAttributeEdit(overlay) {
    const config = overlay.data('config');
    const attributeName = overlay.data('attribute-name');
    const baseValue = parseInt(overlay.find('.attribute-base-input').val()) || 0;
    
    // Collect modifiers
    const modifiers = [];
    overlay.find('.modifier-row').each((index, row) => {
      const $row = $(row);
      let name = $row.find('.modifier-name').val().trim();
      const value = parseInt($row.find('.modifier-value').val()) || 0;
      const enabled = $row.find('.modifier-toggle').is(':checked');
      
      // Only save modifiers that have a value (even if name is empty)
      if (value !== 0) {
        // Default name if empty
        if (!name) {
          name = 'Modifier';
        }
        modifiers.push({
          name: name,
          value: value,
          enabled: enabled
        });
      }
    });
    
    // Calculate final value
    const totalValue = this._updateTotal(overlay);
    
    // Build update data based on the field path
    const updateData = {};
    
    // Check if we're dealing with weapon modifiers
    const isWeaponModifier = config.field.includes('weapon-main.to-hit') || config.field.includes('weapon-off.to-hit');
    
    let basePath;
    if (isWeaponModifier) {
      // For weapon modifiers, the field itself is the base path
      basePath = config.field;
    } else {
      // For other attributes, remove .value from the path
      basePath = config.field.substring(0, config.field.lastIndexOf('.'));
    }
    
    updateData[`${basePath}.baseValue`] = baseValue;
    updateData[`${basePath}.modifiers`] = modifiers;
    updateData[`${basePath}.value`] = totalValue;
    
    await this.actor.update(updateData);
    
    // Update the display element
    const displayElement = overlay.data('display-element');
    $(displayElement).text(totalValue);
    
    this._hideAttributeEditPopup(overlay);
  }
  
  /* -------------------------------------------- */
  
  async _submitSimpleEdit(overlay) {
    const config = overlay.data('config');
    const value = parseInt(overlay.find('.attribute-simple-input').val()) || 0;
    
    // Build update data
    const updateData = {};
    updateData[config.field] = value;
    
    await this.actor.update(updateData);
    
    // Update the display element
    const displayElement = overlay.data('display-element');
    $(displayElement).text(value);
    
    this._hideAttributeEditPopup(overlay);
  }
  
  /* -------------------------------------------- */
  
  _hideAttributeEditPopup(overlay) {
    const popup = overlay.find('.attribute-edit-popup');
    this._animatePopupOut(popup, () => {
      overlay.hide();
      overlay.remove(); // Clean up the popup
    });
  }
  
  /* -------------------------------------------- */
  
  _animatePopupIn(popup, callback) {
    let start = null;
    const duration = 200; // 200ms animation
    
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const scale = 0.8 + (0.2 * eased); // From 0.8 to 1.0
      const opacity = eased; // From 0 to 1
      
      popup.css({
        'transform': `scale(${scale})`,
        'opacity': opacity
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback && callback();
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /* -------------------------------------------- */
  
  _animatePopupOut(popup, callback) {
    let start = null;
    const duration = 150; // Slightly faster out animation
    
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      
      // Easing function (ease-in)
      const eased = Math.pow(progress, 2);
      
      const scale = 1.0 - (0.2 * eased); // From 1.0 to 0.8
      const opacity = 1 - eased; // From 1 to 0
      
      popup.css({
        'transform': `scale(${scale})`,
        'opacity': opacity
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback && callback();
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /*async _onWeaponLabelClick(event) {
    event.preventDefault();
    
    // Identify if it's the primary or secondary weapon
    const weaponLabel = event.currentTarget.textContent.trim().toLowerCase(); // "primary" or "secondary"
    // Extract weapon name and to-hit value
    
    const weaponName = weaponLabel === "primary" ? "Primary Weapon" : "Secondary Weapon";
    const weaponPrefix = weaponLabel === "primary" ? "weapon-main" : "weapon-off";
    
    
    const weaponToHit = this.actor.system[weaponPrefix]['to-hit'];
    
    // Assuming _rollWeapon is a method to handle the weapon roll
    await this._rollTrait(weaponName, weaponToHit);
  }*/
  
  async _onRollableClick(event) {
    event.preventDefault();
    
    const rollableElement = event.currentTarget;
    const weaponBox = rollableElement.closest(".click-rollable-group");
    
    const rollNameInput = weaponBox.querySelector(".click-rollable-name");
    const rollModifierElement = weaponBox.querySelector(".click-rollable-modifier");
    
    const rollName = rollNameInput ? rollNameInput.value.trim() : "";
    let rollModifier = 0;
    
    // Check for old-style input modifier
    if (rollModifierElement) {
      rollModifier = parseInt(rollModifierElement.value) || 0;
    } else {
      // Check for new attribute-value-display system
      const attributeDisplay = weaponBox.querySelector(".attribute-value-display");
      if (attributeDisplay) {
        const fieldPath = attributeDisplay.dataset.field;
        if (fieldPath) {
          const attrValue = foundry.utils.getProperty(this.actor, fieldPath);
          // Handle both simple values and complex objects with .value
          if (typeof attrValue === 'object' && attrValue !== null && 'value' in attrValue) {
            rollModifier = parseInt(attrValue.value) || 0;
          } else {
            rollModifier = parseInt(attrValue) || 0;
          }
        }
      }
    }
    
    const rollType = rollableElement.dataset.rollType || "unknown";
    
    // Store roll type for later use
    this._pendingRollType = rollType;
    this._pendingWeaponName = rollName;
    
    // Assuming _rollTrait is a method to handle the trait roll
    await this._rollTrait(rollName, rollModifier);
  }
  
  async _onBasicRollableClick(event) {
    event.preventDefault();
    
    const rollableElement = event.currentTarget;
    const rollableGroup = rollableElement.closest(".basic-rollable-group");
    const rollNameInput = rollableGroup.querySelector(".basic-rollable-name");
    
    // Check for damage-value-display (new damage modifier system)
    const damageValueDisplay = rollableGroup.querySelector(".damage-value-display");
    const rollValueInput = rollableGroup.querySelector(".basic-rollable-value");
    
    // Get proficiency directly from actor system data
    const proficiencyValue = this.actor.system.proficiency?.value || 1;
    const rollName = rollNameInput.value;
    const rollType = rollableElement.dataset.rollType || "unknown";
    
    // Store roll type for later use
    this._pendingRollType = rollType;
    this._pendingWeaponName = rollName;
    
    let rollValue;
    
    // Check if this is a weapon damage roll with the new damage modifier system
    if (damageValueDisplay && rollType === "damage") {
        const fieldPath = damageValueDisplay.dataset.field;
        
        if (fieldPath) {
          const damageData = foundry.utils.getProperty(this.actor, fieldPath);
          
          // Work with structured damage data properly
          if (typeof damageData === 'object' && damageData !== null && 'baseValue' in damageData) {
            // New damage modifier system - build formula from structure
            rollValue = this._buildDamageFormulaFromStructure(damageData, this.actor.type === "character" ? parseInt(proficiencyValue) || 1 : null);
          } else {
            // Legacy simple string format or fallback
            const simpleFormula = damageData || '1d8';
            if (this.actor.type === "character") {
              const proficiency = Math.max(1, parseInt(proficiencyValue) || 1);
              rollValue = this._applyProficiencyToDamageFormula(simpleFormula, proficiency);
            } else {
              rollValue = simpleFormula;
            }
          }
        } else {
          // Fallback to display text
          const displayFormula = damageValueDisplay.textContent.trim() || '1d8';
          if (this.actor.type === "character") {
            const proficiency = Math.max(1, parseInt(proficiencyValue) || 1);
            rollValue = this._applyProficiencyToDamageFormula(displayFormula, proficiency);
          } else {
            rollValue = displayFormula;
          }
        }
    } else if (rollValueInput && rollValueInput.classList.contains("weapon-damage")) {
        // Legacy weapon damage handling (if any remain)
        const proficiency = Math.max(1, parseInt(proficiencyValue) || 1);
        const diceInput = rollValueInput.value.trim();
        
        // parse dice notation
        const diceMatch = diceInput.match(/^(\d*)d(\d+)(.*)$/i);
        if (diceMatch) {
            const diceCount = diceMatch[1] || proficiency; // count
            const dieType = diceMatch[2]; // type
            const modifier = diceMatch[3] || ""; // modifier
            rollValue = `${diceCount}d${dieType}${modifier}`;
        } else {
            // fallback logic - if not dice notation, just use the value as-is
            rollValue = diceInput;
        }
    } else if (rollValueInput) {
        // Original logic for non-weapon damage rolls
        rollValue = rollValueInput.value;
    } else {
        // Fallback if no value input found
        rollValue = '1d8';
    }

    // console.log("Current value: ", rollValue);
    
    await this._rollBasic(rollName, rollValue);
  }
  
  /* -------------------------------------------- */
  
  /**
   * Build damage formula from structured damage data
   * @param {Object} damageData - The damage data object with baseValue and modifiers
   * @param {number|null} proficiency - The character's proficiency value (null for NPCs)
   * @returns {string} - The complete damage formula for rolling
   * @private
   */
  _buildDamageFormulaFromStructure(damageData, proficiency = null) {
    let baseFormula = damageData.baseValue || '1d8';
    
    // Apply proficiency to base formula if character
    if (proficiency) {
      baseFormula = this._applyProficiencyToDamageFormula(baseFormula, proficiency);
    }
    
    // Add enabled modifiers
    const modifiers = damageData.modifiers || [];
    const enabledModifiers = modifiers.filter(mod => mod.enabled !== false && mod.value);
    
    if (enabledModifiers.length === 0) {
      return baseFormula;
    }
    
    let formula = baseFormula;
    enabledModifiers.forEach(modifier => {
      let modValue = modifier.value.trim();
      // Ensure proper formatting - add + if it doesn't start with + or -
      if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
        modValue = '+' + modValue;
      }
      formula += ' ' + modValue;
    });
    
    return formula;
  }

  /**
   * Apply proficiency logic to damage formulas for characters
   * @param {string} damageFormula - The damage formula (e.g., "1d8 + 1 + 1d4")
   * @param {number} proficiency - The character's proficiency value
   * @returns {string} - The modified damage formula with proficiency applied
   * @private
   */
  _applyProficiencyToDamageFormula(damageFormula, proficiency) {
    // Use the same logic as the original weapon damage handling
    // Parse dice notation at the beginning of the formula
    const diceMatch = damageFormula.match(/^(\d*)d(\d+)(.*)$/i);
    
    if (diceMatch) {
      const diceCount = diceMatch[1] || proficiency; // Use proficiency if no count specified
      const dieType = diceMatch[2]; // Die type (8, 6, etc.)
      const remainder = diceMatch[3] || ""; // Everything after the first dice (modifiers, additional dice, etc.)
      
      return `${diceCount}d${dieType}${remainder}`;
    } else {
      // If it doesn't match dice notation, return as-is
      return damageFormula;
    }
  }
  
  /* -------------------------------------------- */
  
  async _rollBasic(basicName, basicValue) {
    // Check if this is a damage or healing roll and use appropriate function
    if (this._pendingRollType === "damage") {
      // Use the damage rolling function which will add application buttons
      await game.daggerheart.damageApplication.rollDamage(basicValue, {
        flavor: `<p class="roll-flavor-line"><b>${basicName}</b></p>`,
        sourceActor: this.actor
      });
    } else if (this._pendingRollType === "healing") {
      // Use the healing rolling function which will add application buttons
      await game.daggerheart.damageApplication.rollHealing(basicValue, {
        flavor: `<p class="roll-flavor-line"><b>${basicName}</b></p>`,
        sourceActor: this.actor
      });
    } else {
      // Use the rollHandler for other roll types
      await game.daggerheart.rollHandler.quickRoll(basicValue, {
        flavor: basicName,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      });
    }
    
    // Clear pending roll data
    this._pendingRollType = null;
    this._pendingWeaponName = null;
  }
  
  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
    const title = `Roll for ${traitNamePrint}`;
    await game.daggerheart.rollHandler.dualityWithDialog({title, traitValue, actor: this.actor});
  }

  /**
   * Handle hope/fear/crit results, depending on roll.
   * @param {{isCrit,isFear,isHope}} config 
   */
  async handleDualityResult({isCrit, isFear, isHope}) {
    if (isCrit) {
      await this._applyCriticalSuccess();
    } else if (isHope) {
      await this._applyHopeGain();
    } else if (isFear) {
      await this._applyFearGain();
    }
  }

  /**
   * Apply mechanical effects for critical success: gain 1 Hope and clear 1 Stress
   * @private
   */
  async _applyCriticalSuccess() {
    const updateData = {};
    
    if (this.actor.type === "character") {
      // Gain 1 Hope (up to max)
      const currentHope = parseInt(this.actor.system.hope?.value) || 0;
      const maxHope = parseInt(this.actor.system.hope?.max) || 0;
      const newHope = Math.min(maxHope, currentHope + 1);
      updateData["system.hope.value"] = newHope;
      
      // Clear 1 Stress (minimum 0)
      const currentStress = parseInt(this.actor.system.stress?.value) || 0;
      const newStress = Math.max(0, currentStress - 1);
      updateData["system.stress.value"] = newStress;
    } else if (this.actor.type === "npc") {
      // NPCs don't have Hope, but we can still clear Stress
      const currentStress = parseInt(this.actor.system.stress?.value) || 0;
      const newStress = Math.max(0, currentStress - 1);
      updateData["system.stress.value"] = newStress;
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.actor.update(updateData);
    }
  }

  /**
   * Apply mechanical effects for hope result: gain 1 Hope
   * @private
   */
  async _applyHopeGain() {
    if (this.actor.type === "character") {
      const currentHope = parseInt(this.actor.system.hope?.value) || 0;
      const maxHope = parseInt(this.actor.system.hope?.max) || 0;
      const newHope = Math.min(maxHope, currentHope + 1);
      
      await this.actor.update({
        "system.hope.value": newHope
      });
    }
  }

  /**
   * Apply mechanical effects for fear result: GM gains 1 Fear
   * @private
   */
  async _applyFearGain() {
    // Increase the global fear counter
    if (game.daggerheart?.counter) {
      await game.daggerheart.counter.increase();
    }
  }

  /**
   * Get targeting results for attack rolls
   * @param {number} attackTotal - The total of the attack roll
   * @returns {string} - Additional flavor text for targeting results
   * @private
   */
  _getTargetingResults(attackTotal) {
    // Check if there are any targeted tokens
    if (!game.user.targets || game.user.targets.size === 0) {
      return ""; // No targets, return empty string
    }

    let targetingText = "";
    
    // Process each targeted token
    for (let target of game.user.targets) {
      const targetActor = target.actor;
      if (!targetActor) continue;
      
      let defenseValue;
      let defenseName;
      
      // Determine defense value based on target type
      if (targetActor.type === "character") {
        defenseValue = parseInt(targetActor.system.defenses?.evasion?.value) || 0;
        defenseName = "Evasion";
      } else if (targetActor.type === "npc") {
        defenseValue = parseInt(targetActor.system.defenses?.evasion?.value) || 0;
        defenseName = "Difficulty";
      } else {
        continue; // Unknown actor type
      }
      
      // Compare attack total to defense
      const hit = attackTotal >= defenseValue;
      
      if (hit) {
        targetingText += `</p><p><b class="roll-outcome success">Success!</b></p>`;
      } else {
        targetingText += `</p><p><b class="roll-outcome failure">Failure!</b></p>`;
      }
    }
    
    return targetingText;
  }

  async _onToggleVault(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');
    const vaultList = this.element.find('.item-list[data-location="vault"]');

    if (vaultList.hasClass('vault-collapsed')) {
        // Expanding
        vaultList.removeClass('vault-collapsed');
        icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        this._vaultOpen = true;
    } else {
        // Collapsing
        vaultList.addClass('vault-collapsed');
        icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        this._vaultOpen = false;
    }

    // Save the updated vault state persistently
    await this._saveVaultState();
  }

  async _onToggleCategory(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');
    const category = button.data('category');
    const dataType = this._getCategoryDataType(category);
    const categoryList = this.element.find(`.item-list[data-location="${dataType}"]`);
    const categoryHeader = button.closest('.tab-category');

    if (!this._categoryStates) {
      this._categoryStates = {};
    }

    if (categoryList.hasClass('category-collapsed')) {
        // Expanding
        categoryList.removeClass('category-collapsed');
        categoryHeader.removeClass('section-collapsed');
        // Add dynamic spacing class for expanded state
        categoryHeader.addClass('section-expanded');
        icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        this._categoryStates[category] = true;

        // Apply dynamic spacing to all collapsed sections (with transitions)
        this._updateDynamicSpacing(true);
    } else {
        // Collapsing
        categoryList.addClass('category-collapsed');
        categoryHeader.addClass('section-collapsed');
        // Remove expanded class
        categoryHeader.removeClass('section-expanded');
        icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        this._categoryStates[category] = false;

        // Apply dynamic spacing to all collapsed sections (with transitions)
        this._updateDynamicSpacing(true);
    }

    // Save the updated state persistently
    await this._saveCategoryStates();
  }

  /**
   * Update dynamic spacing for all category sections based on their collapsed/expanded states
   * @param {boolean} enableTransitions - Whether to enable CSS transitions during this update
   * @private
   */
  _updateDynamicSpacing(enableTransitions = true) {
    const allCategoryHeaders = this.element.find('.tab-category');
    const sheetElement = this.element;

    // Control transitions based on the parameter
    if (enableTransitions) {
      sheetElement.addClass('transitions-enabled');
    } else {
      sheetElement.removeClass('transitions-enabled');
    }

    allCategoryHeaders.each((index, header) => {
      const $header = $(header);
      const isCollapsed = $header.hasClass('section-collapsed');

      if (isCollapsed) {
        // Apply minimal spacing for collapsed sections
        $header.addClass('dynamic-collapsed');
        $header.removeClass('dynamic-expanded');
      } else {
        // Apply normal spacing for expanded sections
        $header.addClass('dynamic-expanded');
        $header.removeClass('dynamic-collapsed');
      }
    });

    // If transitions were disabled for initialization, re-enable them after a brief delay
    // to allow for future user interactions
    if (!enableTransitions) {
      setTimeout(() => {
        if (this.element) {
          this.element.addClass('transitions-enabled');
        }
      }, 100);
    }
  }

  /**
   * Load persistent category states from actor flags
   * @private
   */
  async _loadCategoryStates() {
    if (!this.actor) return;

    // Get saved states from actor flags
    const savedStates = this.actor.getFlag('daggerheart', 'categoryStates') || {};

    // Initialize _categoryStates with saved values or defaults
    this._categoryStates = {
      'class': savedStates.class ?? false,
      'subclass': savedStates.subclass ?? false,
      'ancestry': savedStates.ancestry ?? false,
      'community': savedStates.community ?? false,
      'abilities': savedStates.abilities ?? false,
      'worn': savedStates.worn ?? false,
      'backpack': savedStates.backpack ?? false
    };

    console.log(`Loaded category states for ${this.actor.name}:`, this._categoryStates);
  }

  /**
   * Save persistent category states to actor flags
   * @private
   */
  async _saveCategoryStates() {
    if (!this.actor || !this._categoryStates) return;

    try {
      await this.actor.setFlag('daggerheart', 'categoryStates', this._categoryStates);
      console.log(`Saved category states for ${this.actor.name}:`, this._categoryStates);
    } catch (error) {
      console.error('Failed to save category states:', error);
    }
  }

  /**
   * Load persistent vault state from actor flags
   * @private
   */
  async _loadVaultState() {
    if (!this.actor) return;

    // Get saved vault state from actor flags, default to false (collapsed)
    this._vaultOpen = this.actor.getFlag('daggerheart', 'vaultOpen') ?? false;

    console.log(`Loaded vault state for ${this.actor.name}:`, this._vaultOpen);
  }

  /**
   * Save persistent vault state to actor flags
   * @private
   */
  async _saveVaultState() {
    if (!this.actor) return;

    try {
      await this.actor.setFlag('daggerheart', 'vaultOpen', this._vaultOpen);
      console.log(`Saved vault state for ${this.actor.name}:`, this._vaultOpen);
    } catch (error) {
      console.error('Failed to save vault state:', error);
    }
  }

  /**
   * Disable CSS transitions to prevent unwanted animations during initialization
   * @private
   */
  _disableTransitions() {
    if (this.element) {
      this.element.removeClass('transitions-enabled');
      // Also add a temporary class to completely disable transitions
      this.element.addClass('no-transitions');
    }
  }

  /**
   * Enable CSS transitions for smooth user-initiated animations
   * @private
   */
  _enableTransitions() {
    if (this.element) {
      // Use a small delay to ensure DOM updates are complete
      setTimeout(() => {
        if (this.element) {
          this.element.removeClass('no-transitions');
          this.element.addClass('transitions-enabled');
        }
      }, 50);
    }
  }

  _getCategoryDataType(category) {
    const mapping = {
      'class': 'class',
      'subclass': 'subclass',
      'ancestry': 'ancestry',
      'community': 'community',
      'abilities': 'abilities',
      'worn': 'worn',
      'backpack': 'backpack'
    };
    return mapping[category] || category;
  }

  async _onToggleDescription(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const descriptionDiv = li.querySelector(".item-description");

    if (!descriptionDiv) return;
    
    // Simple class toggle - CSS handles the animation
    li.classList.toggle("expanded");
  }
  
  async _onDeathOverlayClick(event) {
    event.preventDefault();
    
    // Show the Death Move dialog
    const characterName = this.actor.name;
    await DaggerheartDialogHelper.showDeathMoveDialog(characterName, this.actor);
  }

  async _onRestClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const restType = button.dataset.restType;
    const characterName = this.actor.name;
    
    if (restType === 'short') {
      // Show the Short Rest dialog
      await DaggerheartDialogHelper.showShortRestDialog(characterName, this.actor);
    } else if (restType === 'long') {
      // Show the Long Rest dialog
      await DaggerheartDialogHelper.showLongRestDialog(characterName, this.actor);
    }
  }

  async _onNavGemClick(event) {
    event.preventDefault();
    
    // Use the rollHandler for the duality roll with dialog
    await game.daggerheart.rollHandler.dualityWithDialog({
      title: "Duality Dice Roll",
      actor: this.actor
    });
  }

  async _onResourceControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const field = a.dataset.field;

    const value = foundry.utils.getProperty(this.actor.system, field);
    let updateValue;

    if (action === 'increment') {
      updateValue = Number(value) + 1;
    } else if (action === 'decrement') {
      updateValue = Number(value) - 1;
    }

    if (updateValue !== undefined) {
      updateValue = Math.max(0, updateValue);
      
      const fieldPath = field.split('.');
      const resourceName = fieldPath[0];
      if ((resourceName === 'health' || resourceName === 'stress' || resourceName === 'hope') && field.endsWith('.value')) {
        const maxValue = foundry.utils.getProperty(this.actor.system, fieldPath[0] + '.max');
        if (maxValue !== undefined) {
          updateValue = Math.min(updateValue, maxValue);
        }
      } else if (field === 'defenses.armor-slots.value') {
        const maxValue = foundry.utils.getProperty(this.actor.system, 'defenses.armor.value');
        if (maxValue !== undefined) {
          updateValue = Math.min(updateValue, maxValue);
        }
      }
      
      this.actor.update({
        [`system.${field}`]: updateValue
      });
    }
  }



  /* -------------------------------------------- */

  async _modifyAttributeValue(field, delta) {
    // Get current value
    let currentValue = foundry.utils.getProperty(this.actor, field);
    
    // Handle both simple values and complex objects with .value
    if (typeof currentValue === 'object' && currentValue !== null && 'value' in currentValue) {
      currentValue = parseInt(currentValue.value) || 0;
    } else {
      currentValue = parseInt(currentValue) || 0;
    }
    
    const newValue = Math.max(0, currentValue + delta);
    
    // For complex attribute structures, update just the value part
    const pathParts = field.split('.');
    if (pathParts.length > 2 && pathParts[pathParts.length - 1] === 'value') {
      // Check if this is a complex structure that needs special handling
      const attrPath = pathParts.slice(0, -1).join('.');
      const attrData = foundry.utils.getProperty(this.actor, attrPath);
      
      if (typeof attrData === 'object' && attrData !== null) {
        // Update the complex structure
        await this.actor.update({
          [field]: newValue
        });
      } else {
        // Simple value
        await this.actor.update({
          [field]: newValue
        });
      }
    } else {
      // Direct value update
      await this.actor.update({
        [field]: newValue
      });
    }
  }

  /**
   * Mark empty item lists with a CSS class for styling
   * @param {jQuery} html The rendered HTML
   * @private
   */
  _markEmptyItemLists(html) {
    html.find('.item-list').each((index, element) => {
      const $list = $(element);
      const hasItems = $list.find('.item').length > 0;
      
      if (hasItems) {
        $list.removeClass('is-empty');
      } else {
        $list.addClass('is-empty');
      }
    });
  }

  /**
   * Handle threshold HP marking clicks
   * @param {Event} event - The click event
   * @private
   */
  async _onThresholdClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const hpAmount = parseInt(element.dataset.hpAmount);
    
    if (!hpAmount || !this.actor.system.health) {
      return;
    }
    
    // Add damage (mark HP)
    await this._addDamage(hpAmount);
  }

  /**
   * Add damage to current health value (mark HP)
   * @param {number} damage - The amount of damage to add
   * @private
   */
  async _addDamage(damage) {
    const currentHP = parseInt(this.actor.system.health.value) || 0;
    const maxHP = parseInt(this.actor.system.health.max) || 0;
    const newHP = Math.max(0, Math.min(maxHP, currentHP + damage));
    
    await this.actor.update({
      "system.health.value": newHP
    });
  }
}


/**
* Extend the basic ActorSheet with some very simple modifications
* @extends {ActorSheet}
*/
export class NPCActorSheet extends SimpleActorSheet {
  
  /** @inheritdoc */
  static get defaultOptions() {
    // Calculate responsive dimensions based on screen size
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    
    // Calculate optimal height for NPC sheet (typically smaller than PC sheet)
    const maxHeight = Math.floor(screenHeight * 0.85);
    const minHeight = 500; // Minimum usable height for NPC
    const preferredHeight = 840; // Ideal height for larger screens
    
    const height = Math.max(minHeight, Math.min(preferredHeight, maxHeight));
    
    // Calculate width for NPC sheet
    const maxWidth = Math.floor(screenWidth * 0.9);
    const minWidth = 690; // Maintain minimum width for usability
    const preferredWidth = 650; // Standard width for NPC
    
    const width = Math.max(minWidth, Math.min(preferredWidth, maxWidth));
    
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "npc"],
      template: "systems/daggerheart/templates/actor-sheet-npc.html",
      width: width,
      height: height,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "experience"}],
      scrollY: [".biography", ".items", ".attributes"],
      dragDrop: [
        { dragSelector: ".item-list .item", dropSelector: null },
        { dragSelector: ".card", dropSelector: ".domains-section" }
      ]
    });
  }
  
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    EntitySheetHelper.getAttributeData(context.data);
    context.shorthand = !!game.settings.get("daggerheart", "macroShorthand");
    context.systemData = context.data.system;
    context.domains = this.actor.system.domains;
    context.dtypes = ATTRIBUTE_TYPES;
    
    // htmlFields
    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    context.inventoryHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.inventory, {
      secrets: this.document.isOwner,
      async: true
    });

    // Enrich item descriptions
    for (let item of context.data.items) {
      item.system.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, {
        secrets: this.document.isOwner,
        async: true
      });
    }
    
    context.actor = this.actor; // Add this line to include the actor object in the context
    
    const imageLink = context.data.img;
    context.imageStyle = `background: url(${imageLink});`;
    
    // Check if NPC is dying/dead (hit points maxed out)
    const health = context.systemData.health;
    context.isDying = health && health.value === health.max && health.max > 0;
    
    return context;
  }
  
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Initialize Sheet Tracker for NPCs
    if (!this.sheetTracker) {
      console.log("Creating new SheetTracker for NPC:", this.actor.name);
      this.sheetTracker = new SheetTracker(this);
    }
    // Always initialize on re-render to recreate the DOM
    console.log("Initializing SheetTracker for NPC:", this.actor.name);

    // Add a small delay to ensure DOM is ready
    setTimeout(async () => {
      try {
        await this.sheetTracker.initialize();
        console.log("SheetTracker initialized successfully for NPC:", this.actor.name);
      } catch (error) {
        console.error("Error initializing SheetTracker for NPC:", this.actor.name, error);
      }
    }, 100);
    
    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;
    
    // Attribute Management
    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));
    
    // Item Controls
    html.find(".item-control").click(this._onItemControl.bind(this));
    html.find(".items .rollable").on("click", this._onItemRoll.bind(this));
    
    
    
    
    // Add draggable for Macro creation
    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });
    
    let el = html.find(".input-wrap .input");
    let widthMachine = html.find(".input-wrap .width-machine");
    el.on("keyup", () => {
      widthMachine.html(el.val());
    });
    
    function calcHeight(value) {
      let numberOfLineBreaks = (value.match(/\n/g) || []).length;
      // min-height + lines x line-height + padding + border
      let newHeight = 20 + numberOfLineBreaks * 20 + 12 + 2;
      return newHeight;
    }
    
    let textarea = html.find(".resize-ta");
    textarea.on("keyup", () => {
      textarea.css("height", calcHeight(textarea.val()) + "px");
    });
    
  }
  
  /* -------------------------------------------- */
  
  /**
  * Handle click events for Item control buttons within the Actor Sheet
  * @param event
  * @private
  */
  async _onItemControl(event) {
    event.preventDefault();
    
    // Obtain event data
    const button = event.currentTarget;
    const li = button.closest(".item");
    const item = this.actor.items.get(li?.dataset.itemId);
    const action = button.dataset.action;

    // If the clicked element is an IMG with data-action="edit" (the item's image)
    if (item && action === "edit" && button.tagName === 'IMG' && button.classList.contains('item-control')) {
      const itemData = item.system;
      const description = await TextEditor.enrichHTML(itemData.description, {secrets: this.actor.isOwner, async: true});
      const chatCard = `
      <div class="item-card-chat" data-item-id="${item.id}" data-actor-id="${this.actor.id}">
          <div class="card-image-container" style="background-image: url('${item.img}')">
              <div class="card-header-text">
                  <h3>${item.name}</h3>
              </div>
          </div>
          <div class="card-content">
              <div class="card-subtitle">
                  <span>${itemData.category || ''} - ${itemData.rarity || ''}</span>
              </div>
              <div class="card-description">
                  ${description}
              </div>
          </div>
      </div>
      `;

      ChatMessage.create({
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: chatCard
      });
      return; // Done, don't proceed to open edit sheet
    }
    
    // Handle different actions
    switch ( button.dataset.action ) {
      case "create":
      const cls = getDocumentClass("Item");
      return cls.create({name: game.i18n.localize("SIMPLE.ItemNew"), type: "item"}, {parent: this.actor});
      case "edit": 
        if (item) return item.sheet.render(true);
        break;
      case "delete":
        if (item) return item.delete();
        break;
    }
  }
  
  /* -------------------------------------------- */
  
  /**
  * Listen for roll buttons on items.
  * @param {MouseEvent} event    The originating left click event
  */
  async _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    
    // Use the rollHandler for consistent roll handling
    await game.daggerheart.rollHandler.quickRoll(button.data('roll'), {
      flavor: `<p class="roll-flavor-line"><b>${item.name}</b> - ${button.text()}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  /**
   * Handle crit results, depending on roll.
   * @param {{isCrit}} config 
   */
  async handleNPCResult({isCrit}) {
    if (isCrit) {
      await this._applyCriticalSuccess();
    }
  }
  
  /* -------------------------------------------- */
  
  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
    const title = `Roll for ${traitNamePrint}`;
    
    // For NPCs, we'll call for an npc dialog roll
    await game.daggerheart.rollHandler.npcRollWithDialog({title, traitValue, actor: this.actor});
  }
  
  /** @inheritdoc */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    if (this.actor.type === "npc") {
      formData["system.isNPC"] = true;
    }
    return formData;
  }
}