import { EntitySheetHelper } from "./helper.js";
import {ATTRIBUTE_TYPES} from "./constants.js";
import { DaggerheartDialogHelper } from "./dialog-helper.js";

/**
* Extend the basic ActorSheet with some very simple modifications
* @extends {ActorSheet}
*/
export class SimpleActorSheet extends foundry.appv1.sheets.ActorSheet {

  _pendingRollType = null;
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
      width: 560,
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
  activateListeners(html) {
    super.activateListeners(html);
    
    // Restore vault state on re-render
    const vaultList = html.find('.item-list[data-item-type="vault"]');
    const icon = html.find('.vault-toggle i');
    
    if (this._vaultOpen) {
      vaultList.removeClass('vault-collapsed');
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
      vaultList.addClass('vault-collapsed');
      icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    }
    
    // Mark empty item lists
    this._markEmptyItemLists(html);
    
    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // Setup drag and drop visual feedback
    this._setupDragDropListeners(html);
    
    // Resource Management
    html.find(".resource-control").click(this._onResourceControl.bind(this));

    // Add right-click/left-click functionality to resource boxes
    html.find('.resource-box').each((index, resourceBox) => {
      const $resourceBox = $(resourceBox);
      const parentResource = $resourceBox.closest('.resource');
      let field = null;

      // Determine the field based on the resource type
      if (parentResource.hasClass('health')) {
        field = 'health.value';
      } else if (parentResource.hasClass('hope')) {
        field = 'hope.value';
      } else if (parentResource.hasClass('stress')) {
        field = 'stress.value';
      } else if (parentResource.hasClass('armor-slots')) {
        field = 'defenses.armor-slots.value';
      }

      if (field) {
        $resourceBox.off('click.resource-increment contextmenu.resource-decrement');
        
        $resourceBox.on('click.resource-increment', async (e) => {
          if (e.which === 1) { // Left click
            e.preventDefault();
            e.stopPropagation();
            await this._modifyResourceValue(field, 1);
          }
        });

        $resourceBox.on('contextmenu.resource-decrement', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._modifyResourceValue(field, -1);
        });
      }
    });
    
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
    
    // Handle toggling item description visibility
    html.find(".item-name[data-action=\"toggle-description\"]").click(this._onToggleDescription.bind(this));
    
    //Cards System
    html.find('.remove-card').click(this._onRemoveCard.bind(this));
    
    // Vault Toggle
    html.find('.vault-toggle').click(this._onToggleVault.bind(this));
    
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
    html.find("[data-trait-tooltip]").each((i, element) => {
      let tooltipTimeout;
      
      element.addEventListener("mouseenter", () => {
        const tooltipText = element.getAttribute("data-trait-tooltip");
        if (tooltipText && tooltipText.trim() !== "") {
          tooltipTimeout = setTimeout(() => {
            element.classList.add("show-tooltip");
          }, 50);
        }
      });
      
      element.addEventListener("mouseleave", () => {
        clearTimeout(tooltipTimeout);
        element.classList.remove("show-tooltip");
      });
    });
    
    // Trait value popup functionality
    html.find(".trait-value-display").click(this._onTraitValueClick.bind(this));
    
    // Generic attribute value popup functionality
    html.find(".attribute-value-display").click(this._onAttributeValueClick.bind(this));
    
    
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

    // Add visual feedback and tooltips for all interactive displays
    html.find('.resource-box').each((index, element) => {
      element.style.cursor = 'pointer';
      element.style.userSelect = 'none';
      $(element).attr('title', 'Left-click to increase, Right-click to decrease');
    });


  }
  
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
    
    switch (action) {
      case "create":
      const clsi = getDocumentClass("Item");
      return clsi.create({name: "New Ability", type: type}, {parent: this.actor}); // Use the type variable here
      case "create-item":
      const cls = getDocumentClass("Item");
      return cls.create({name: "New Item", type: type}, {parent: this.actor}); // Use the type variable here
      case "create-domain":
      const clsd = getDocumentClass("Item");
      return clsd.create({name: "New Domain", type: type}, {parent: this.actor}); // Use the type variable here
      case "create-ancestry":
      const clsa = getDocumentClass("Item");
      return clsa.create({name: "New Ancestry", type: type}, {parent: this.actor}); // Use the type variable here
      case "create-community":
      const clscom = getDocumentClass("Item");
      return clscom.create({name: "New Community", type: type}, {parent: this.actor}); // Use the type variable here
      case "create-class":
      const clscl = getDocumentClass("Item");
      return clscl.create({name: "New Class", type: type}, {parent: this.actor}); // Use the type variable here
      case "create-subclass":
      const clssc = getDocumentClass("Item");
      return clssc.create({name: "New Subclass", type: type}, {parent: this.actor}); // Use the type variable here
      case "edit": // edit icon
        if (item) return item.sheet.render(true);
        break;
      case "delete":
        if (item) return item.delete();
        break;
      case "send-to-vault":
        if (item) {
          // Create a new vault item with the same data
          const itemData = {
            name: item.name,
            type: "vault",
            img: item.img,
            system: item.system
          };
          // Create the new vault item
          await getDocumentClass("Item").create(itemData, {parent: this.actor});
          // Delete the original domain item
          return item.delete();
        }
        break;
      case "send-to-domain":
        if (item && item.type === "vault") {
          // Create a new domain item with the same data
          const itemData = {
            name: item.name,
            type: "domain",
            img: item.img,
            system: item.system
          };
          // Create the new domain item
          await getDocumentClass("Item").create(itemData, {parent: this.actor});
          // Delete the original vault item
          return item.delete();
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

    const newType = targetList.dataset.itemType;
    if (!newType) return false;

    const item = await Item.implementation.fromDropData(data);
    
    // Clean up drag states
    this.element[0].classList.remove('dragging');
    this.element[0].querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    
    // same actor move
    if (this.actor.items.has(item.id)) {
        const existingItem = this.actor.items.get(item.id);
        // same type check
        if (existingItem.type === newType) return;

        // new item with data
        const newItemData = existingItem.toObject();
        newItemData.type = newType;
        
        // Delete the old item and create the new one
        await existingItem.delete();
        return this.actor.createEmbeddedDocuments("Item", [newItemData]);

    } else {
      // Otherwise, we are creating a new item from a drop
      const newItemData = item.toObject();
      newItemData.type = newType;
      return this.actor.createEmbeddedDocuments("Item", [newItemData]);
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
      const newValue = Math.max(0, currentValue - 1); // Prevent negative values
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
    const rollValueInput = rollableGroup.querySelector(".basic-rollable-value");
    
    // Get proficiency directly from actor system data
    const proficiencyValue = this.actor.system.proficiency?.value || 1;
    const rollName = rollNameInput.value;
    const rollType = rollableElement.dataset.rollType || "unknown";
    
    // Store roll type for later use
    this._pendingRollType = rollType;
    this._pendingWeaponName = rollName;
    
    let rollValue;
    
    // Check if this is a weapon damage roll
    if (rollValueInput && rollValueInput.classList.contains("weapon-damage")) {
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
    } else {
        // Original logic for non-weapon damage rolls
        rollValue = rollValueInput.value;
    }

    // console.log("Current value: ", rollValue);
    
    await this._rollBasic(rollName, rollValue);
  }
  
  /* -------------------------------------------- */
  
  async _rollBasic(basicName, basicValue) {
    // Use the rollHandler for consistent roll handling
    await game.daggerheart.rollHandler.quickRoll(basicValue, {
      flavor: basicName,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
    
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
    const vaultList = this.element.find('.item-list[data-item-type="vault"]');

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

  /**
   * Helper method to modify resource values (used by right-click/left-click functionality)
   * @param {string} field - The field path to modify
   * @param {number} delta - The amount to change (+1 or -1)
   * @private
   */
  async _modifyResourceValue(field, delta) {
    const currentValue = foundry.utils.getProperty(this.actor.system, field);
    const newValue = Math.max(0, parseInt(currentValue) + delta);
    
    // Get max value for clamping if applicable
    const resourceName = field.split('.')[0];
    let maxValue = null;
    if (resourceName === 'health' || resourceName === 'stress' || resourceName === 'hope') {
      maxValue = foundry.utils.getProperty(this.actor.system, resourceName + '.max');
    }
    
    const finalValue = maxValue ? Math.min(newValue, maxValue) : newValue;
    
    await this.actor.update({
      [`system.${field}`]: finalValue
    });
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
}


/**
* Extend the basic ActorSheet with some very simple modifications
* @extends {ActorSheet}
*/
export class NPCActorSheet extends SimpleActorSheet {
  
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "npc"],
      template: "systems/daggerheart/templates/actor-sheet-npc.html",
      width: 650,
      height: 840,
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
  
  /* -------------------------------------------- */
  
  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
    const title = `Roll for ${traitNamePrint}`;
    
    // For NPCs, we'll use a simple d20 roll via quickRoll
    const result = await game.daggerheart.rollHandler.quickRoll(`1d20 + ${traitValue}`, {
      flavor: `<p class="roll-flavor-line"><b>${traitNamePrint}</b></p>`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      sendToChat: false // We'll send our own message with additional flavor
    });
    
    const roll = result.roll;
    const d20Term = roll.terms.find(t => t.faces === 20);
    const d20result = d20Term.results[0].result;
    
    let flavor = `<p class="roll-flavor-line"><b>${traitNamePrint}</b></p>`;
    if (d20result === 20) {
      flavor = `<p class="roll-flavor-line"><b>${traitNamePrint}</b> - <b>Critical Success!</b></p>`;
      
      // Apply mechanical effects for critical success (clear 1 stress for NPCs)
      await this._applyCriticalSuccess();
    }
    
    // Check for targeting if this is an attack roll
    if (this._pendingRollType === "attack") {
      flavor += this._getTargetingResults(roll.total);
    }
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavor,
      flags: {
        daggerheart: {
          rollType: this._pendingRollType || "unknown",
          weaponName: this._pendingWeaponName || "",
          actorId: this.actor.id,
          actorType: this.actor.type
        }
      }
    });
    
    // Clear pending roll data
    this._pendingRollType = null;
    this._pendingWeaponName = null;
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