import { EntitySheetHelper } from "./helper.js";
import {ATTRIBUTE_TYPES} from "./constants.js";

/**
* Extend the basic ActorSheet with some very simple modifications
* @extends {ActorSheet}
*/
export class SimpleActorSheet extends foundry.appv1.sheets.ActorSheet {
  
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
    
    // Add draggable for Macro creation
    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });
    
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
    console.log("this is being called");
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    let r = new Roll(button.data('roll'), this.actor.getRollData());
    return await r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h4>${item.name}</h4><a>${button.text()}</a>`
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
    const fieldName = displayElement.dataset.field;
    
    // Extract trait name from the parent trait element
    const traitElement = displayElement.closest(".trait");
    const traitName = traitElement ? traitElement.dataset.trait : null;
    
    if (!traitName) {
      console.error("Could not determine trait name");
      return;
    }
    
    // Get current value and label dynamically
    const currentValue = this.actor.system[traitName]?.value || 0;
    const label = traitName.charAt(0).toUpperCase() + traitName.slice(1); // Capitalize trait name
    
    this._showTraitEditPopup(fieldName, currentValue, label, displayElement);
  }
  
  /* -------------------------------------------- */
  
  _showTraitEditPopup(fieldName, currentValue, label, displayElement) {
    // Create or get the popup overlay
    let overlay = this.element.find('.trait-edit-popup-overlay');
    if (overlay.length === 0) {
      overlay = this.element.find('.trait-edit-popup-overlay');
    }
    
    // Extract trait name for data access
    const traitName = fieldName.split('.')[1]; // e.g., "system.strength.value" -> "strength"
    const traitData = this.actor.system[traitName] || {};
    
    // Set up the popup content
    overlay.find('.trait-edit-label').text(label);
    
    // Set base value (fallback to current value if no baseValue exists)
    const baseInput = overlay.find('.trait-base-input');
    const baseValue = traitData.baseValue !== undefined ? traitData.baseValue : currentValue;
    baseInput.val(baseValue);
    
    // Store trait info for later use
    overlay.data('trait-name', traitName);
    overlay.data('field-name', fieldName);
    overlay.data('display-element', displayElement);
    
    // Load existing modifiers
    this._loadModifiers(overlay, traitData.modifiers || []);
    
    // Calculate and display total
    this._updateTotal(overlay);
    
    // Show the popup with animation
    overlay.show();
    const popup = overlay.find('.trait-edit-popup');
    
    // Animate in with JavaScript for smooth backdrop-filter
    this._animatePopupIn(popup, () => {
      baseInput.focus().select();
    });
    
    // Set up event handlers
    this._setupPopupEventHandlers(overlay);
  }
  
  /* -------------------------------------------- */
  
  _setupPopupEventHandlers(overlay) {
    // Clear any existing handlers
    overlay.off('.trait-edit');
    overlay.find('*').off('.trait-edit');
    
    // Base value input handler
    const baseInput = overlay.find('.trait-base-input');
    baseInput.on('input', () => this._updateTotal(overlay));
    
    // Keyboard shortcuts
    overlay.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideTraitEditPopup(overlay);
      }
    });
    
    // Add modifier button
    overlay.find('.add-modifier-btn').on('click', () => {
      this._addModifier(overlay);
    });
    
    // Close button
    overlay.find('.trait-edit-close').on('click', () => {
      this._submitTraitEdit(overlay);
    });
    
    // Click outside to close (only on the overlay background)
    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitTraitEdit(overlay);
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
    const baseValue = parseInt(overlay.find('.trait-base-input').val()) || 0;
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
    overlay.find('.trait-total-value').text(total);
    
    return total;
  }
  
  /* -------------------------------------------- */
  
  async _submitTraitEdit(overlay) {
    const traitName = overlay.data('trait-name');
    const baseValue = parseInt(overlay.find('.trait-base-input').val()) || 0;
    
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
    
    // Update the actor with new structure
    const updateData = {};
    updateData[`system.${traitName}.baseValue`] = baseValue;
    updateData[`system.${traitName}.modifiers`] = modifiers;
    updateData[`system.${traitName}.value`] = totalValue;
    
    await this.actor.update(updateData);
    
    // Update the display element
    const displayElement = overlay.data('display-element');
    $(displayElement).text(totalValue);
    
    this._hideTraitEditPopup(overlay);
  }
  
  /* -------------------------------------------- */
  
  _hideTraitEditPopup(overlay) {
    const popup = overlay.find('.trait-edit-popup');
    this._animatePopupOut(popup, () => {
      overlay.hide();
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
    const rollModifier = rollModifierElement ? parseInt(rollModifierElement.value) || 0 : 0;
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
    const tergetForm = rollableElement.closest("form");
    
    const rollProfInput = tergetForm.querySelector("#prof")?.value || "";
    const rollName = rollNameInput.value;
    const rollType = rollableElement.dataset.rollType || "unknown";
    
    // Store roll type for later use
    this._pendingRollType = rollType;
    this._pendingWeaponName = rollName;
    
    let rollValue;
    
    // Check if this is a weapon damage roll
    if (rollValueInput && rollValueInput.classList.contains("weapon-damage")) {
        const proficiency = Math.max(1, parseInt(rollProfInput) || 1);
        const diceInput = rollValueInput.value.trim();
        
        // parse dice notation
        const diceMatch = diceInput.match(/^(\d*)d(\d+)(.*)$/i);
        if (diceMatch) {
            const diceCount = diceMatch[1] || proficiency; // count
            const dieType = diceMatch[2]; // type
            const modifier = diceMatch[3] || ""; // modifier
            rollValue = `${diceCount}d${dieType}${modifier}`;
        } else {
            // fallback logic
            rollValue = rollProfInput + diceInput;
        }
    } else {
        // Original logic for non-weapon damage rolls
        rollValue = rollProfInput + rollValueInput.value;
    }

    console.log("Current value: ", rollValue);
    
    await this._rollBasic(rollName, rollValue);
  }
  
  /* -------------------------------------------- */
  
  async _rollBasic(basicName, basicValue) {
    console.log("Current value: ", basicValue);
    
    const roll = new Roll(basicValue);
    
    await roll.toMessage({
      flavor: basicName,
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rollMode: "roll",
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
  
  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);

    if (game.dice3d) {
      game.dice3d.addColorset({
        name: "Hope",
        category: "Hope Die",
        description: "Hope",
        texture: "ice",
        foreground: "#ffbb00",
        background: "#ffffff",
        outline: "#000000",
        edge: "#ffbb00",
        material: "glass",
        font: "Modesto Condensed",
      });
      game.dice3d.addColorset({
        name: "Fear",
        category: "Fear Die",
        description: "Fear",
        texture: "fire",
        foreground: "#FFFFFF",
        background: "#523333",
        outline: "#b30012",
        edge: "#800013",
        material: "metal",
        font: "Modesto Condensed",
      });
      game.dice3d.addColorset({
        name: "Modifier",
        category: "Modifier Die",
        description: "Modifier",
        texture: "marble",
        foreground: "#222222",
        background: "#DDDDDD",
        outline: "#000000",
        edge: "#555555",
        material: "plastic",
        font: "Arial",
      });
    }

    const dialogContent = `
    <form>
    <div class="flex-col" style="align-items: stretch; gap: 2rem">
        <div class="flex-row" style="justify-content: center; gap: 2rem;">
            <div class="flex-col">
                <span class="label-bar">Hope Die</span>
                <select name="hopeDieSize" id="hopeDieSize">
                    <option value="d12" selected>d12</option>
                    <option value="d20">d20</option>
                </select>
            </div>
            <div class="flex-col">
                <span class="label-bar">Fear Die</span>
                <select name="fearDieSize" id="fearDieSize">
                    <option value="d12" selected>d12</option>
                    <option value="d20">d20</option>
                </select>
            </div>
        </div>
      <div class="flex-row">
        <div class="flex-col stepper-group">
          <span class="label-bar">Advantage</span>
          <div class="flex-row">
            <button id="adv-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceAdvantageInput" min="0" name="advantage" step="1" type="number" value="0"/>
            <button id="adv-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
        <div class="flex-col stepper-group">
          <span class="label-bar">Disadvantage</span>
          <div class="flex-row">
            <button id="dis-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceDisadvantageInput" min="0" name="disadvantage" step="1" type="number" value="0"/>
            <button id="dis-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
      </div>
      <div class="flex-row">
        <div class="flex-col stepper-group">
          <span class="label-bar">Flat Modifier</span>
          <div class="flex-row">
            <button id="mod-minus" class="clicker-button clicker-minus-button" type="button"></button>
            <input id="dualityDiceModifierInput" autofocus name="modifier" step="1" type="number" value="0"/>
            <button id="mod-plus" class="clicker-button clicker-plus-button" type="button"></button>
          </div>
        </div>
      </div>
    </div>
    </form>
    `;

    const dialogChoice = await new Promise(resolve => {
        new Dialog({
            title: `Roll for ${traitNamePrint}`,
            content: dialogContent,
            buttons: {
                roll: {
                    label: "Roll",
                    icon: "<i class='fas fa-dice-d12'></i>",
                    callback: (html) => {
                        const advantage = parseInt(html.find('#dualityDiceAdvantageInput').val()) || 0;
                        const disadvantage = parseInt(html.find('#dualityDiceDisadvantageInput').val()) || 0;
                        const modifier = parseInt(html.find('#dualityDiceModifierInput').val()) || 0;
                        const hopeDieSize = html.find('#hopeDieSize').val();
                        const fearDieSize = html.find('#fearDieSize').val();
                        resolve({ advantage, disadvantage, modifier, hopeDieSize, fearDieSize });
                    }
                },
                rollReaction: {
                    label: "Reaction",
                    icon: "<i class='fas fa-dice-d12'></i>",
                    callback: (html) => {
                        const advantage = parseInt(html.find('#dualityDiceAdvantageInput').val()) || 0;
                        const disadvantage = parseInt(html.find('#dualityDiceDisadvantageInput').val()) || 0;
                        const modifier = parseInt(html.find('#dualityDiceModifierInput').val()) || 0;
                        const hopeDieSize = html.find('#hopeDieSize').val();
                        const fearDieSize = html.find('#fearDieSize').val();
                        resolve({ advantage, disadvantage, modifier, hopeDieSize, fearDieSize, reaction: true });
                    }
                },
                cancel: {
                    label: "Cancel",
                    callback: () => resolve(null)
                }
            },
            default: 'roll',
            render: (html) => {
                function incrementInput(selector, by, clampLo = null) {
                    let input = html.find(selector);
                    if (input.length === 0) return;
                    let newValue = (parseInt(input.val()) || 0) + by;
                    if (clampLo !== null) newValue = Math.max(clampLo, newValue);
                    input.val(newValue);
                }

                html.find('#adv-plus').click(() => incrementInput('#dualityDiceAdvantageInput', 1, 0));
                html.find('#adv-minus').click(() => incrementInput('#dualityDiceAdvantageInput', -1, 0));
                html.find('#dis-plus').click(() => incrementInput('#dualityDiceDisadvantageInput', 1, 0));
                html.find('#dis-minus').click(() => incrementInput('#dualityDiceDisadvantageInput', -1, 0));
                html.find('#mod-plus').click(() => incrementInput('#dualityDiceModifierInput', 1));
                html.find('#mod-minus').click(() => incrementInput('#dualityDiceModifierInput', -1));

                for (const input of html.find("input[type=number]")) {
                    input.addEventListener("wheel", (event) => {
                        if (input === document.activeElement) {
                            event.preventDefault();
                            event.stopPropagation();
                            const step = Math.sign(-1 * event.deltaY);
                            const oldValue = Number(input.value) || 0;
                            input.value = String(oldValue + step);
                        }
                    });
                }
            },
            close: () => resolve(null)
        }, {
            classes: ["daggerheart-roll-dialog"]
        }).render(true);
    });

    if (!dialogChoice) { return; }

    const { advantage, disadvantage, modifier, hopeDieSize, fearDieSize, reaction } = dialogChoice;
    const totalAdvantage = advantage - disadvantage;

    let rollType = "Normal";
    let coreFormula = `1${hopeDieSize} + 1${fearDieSize}`;
    let flavorSuffix = "";
    if (totalAdvantage > 0) {
        coreFormula += ` + ${totalAdvantage}d6kh1`;
        rollType = "Advantage";
        flavorSuffix = ` with ${totalAdvantage} Advantage`;
    } else if (totalAdvantage < 0) {
        const disAdv = Math.abs(totalAdvantage);
        coreFormula += ` - ${disAdv}d6kh1`;
        rollType = "Disadvantage";
        flavorSuffix = ` with ${disAdv} Disadvantage`;
    }

    const fullRollFormula = `${coreFormula} + ${traitValue + modifier}`;
    const roll = new Roll(fullRollFormula);
    await roll.evaluate();

    let hopeDieValue, fearDieValue;
    let isCrit = false;

    if (roll.dice.length >= 2) {
      roll.dice[0].options.flavor = "Hope";
      hopeDieValue = roll.dice[0].total;

      roll.dice[1].options.flavor = "Fear";
      fearDieValue = roll.dice[1].total;

      isCrit = hopeDieValue === fearDieValue;

      if (roll.dice.length >= 3) {
        roll.dice[2].options.flavor = "Modifier";
      }
    } else {
      console.error(`Daggerheart | Critical error during ${traitNamePrint} roll: Less than two primary dice terms found. Roll object:`, roll);
      return;
    }

    const isHope = !reaction && hopeDieValue > fearDieValue;
    const isFear = !reaction && hopeDieValue < fearDieValue;

    let finalFlavor = `<p class="roll-flavor-line"><b>${traitNamePrint}</b>${flavorSuffix}`;
    if (modifier !== 0) {
        finalFlavor += modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
    }

    if (isCrit) {
      finalFlavor += ` <b>Critical</b> Success!</p>`;
      if (!reaction) {
        finalFlavor += `<p class="roll-effect">You gain 1 Hope and clear 1 Stress</p>`;
        
        // Apply mechanical effects for critical success
        await this._applyCriticalSuccess();
      }
    } else if (isHope) {
      finalFlavor += ` Rolled with <b>Hope</b>!</p><p class="roll-effect">You gain 1 Hope</p>`;
      
      // Apply mechanical effects for hope result
      await this._applyHopeGain();
    } else if (isFear) {
      finalFlavor += ` Rolled with <b>Fear</b>!</p><p class="roll-effect">The GM gains 1 Fear</p>`;
      
      // Apply mechanical effects for fear result
      await this._applyFearGain();
    }
    
    // Check for targeting if this is an attack roll
    if (this._pendingRollType === "attack") {
      finalFlavor += this._getTargetingResults(roll.total);
    }
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: finalFlavor,
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
      this.actor.update({
        [`system.${field}`]: updateValue
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
    let r = new Roll(button.data('roll'), this.actor.getRollData());
    return await r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`
    });
  }
  
  /* -------------------------------------------- */
  
  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
    const roll = new Roll(`1d20 + @mod`, {mod: traitValue});
    await roll.evaluate();
  
    const d20Term = roll.terms.find(t => t.faces === 20);
    const d20result = d20Term.results[0].result;
  
    let flavor = `${traitNamePrint}`;
    if (d20result === 20) {
      flavor += ` - Critical Success!`;
      
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