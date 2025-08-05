import { EntitySheetHelper } from "./helper.js";
import { ATTRIBUTE_TYPES } from "./constants.js";
import { DaggerheartDialogHelper } from "./dialog-helper.js";
import { SheetTracker } from "./sheet-tracker.js";
import { EquipmentHandler } from "./equipmentHandler.js";
import { EquipmentSystem } from "./equipmentSystem.js";
import { DomainAbilitySidebar } from "./domain-ability-sidebar.js";
import { HeaderLoadoutBar } from "./header-loadout-bar.js";
import { buildItemCardChat } from "./helper.js";

export class SimpleActorSheet extends foundry.appv1.sheets.ActorSheet {

  _pendingRollType = null;
  sheetTracker = null;
  getPendingRollType() {
    return this._pendingRollType;
  }
  setPendingRollType(newValue) {
    this._pendingRollType = newValue;
  }
  _pendingWeaponName = null;

  getPendingWeaponName() {
    return this._pendingWeaponName;
  }
  setPendingWeaponName(newValue) {
    this._pendingWeaponName = newValue;
  }

  constructor(...args) {
    super(...args);

    this._debouncedRender = foundry.utils.debounce(this._performRender.bind(this), 100);
  }

  _performRender(force = false) {
    super.render(force);
  }

  render(force = false, options = {}) {
    if (options.immediate) {

      return super.render(force, options);
    } else {

      this._debouncedRender(force);
      return this;
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "actor"],
      template: "systems/daggerheart/templates/actor-sheet.html",
      width: 690,
      height: 915,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      scrollY: [".biography", ".items", ".attributes"],
      dragDrop: [
        { dragSelector: ".item-list .item", dropSelector: null },
        { dragSelector: ".card", dropSelector: ".domains-section" }
      ]
    });
  }

  async getData(options) {

    await this._loadUiState();

    const context = await super.getData(options);
    EntitySheetHelper.getAttributeData(context.data);

    context.systemData = context.data.system;
    context.domains = this.actor.system.domains;
    context.dtypes = ATTRIBUTE_TYPES;

    if (this.actor.type === "character") {

      context.systemData["weapon-main"] = EquipmentHandler.getDynamicWeaponData(this.actor, "primary");
      context.systemData["weapon-off"] = EquipmentHandler.getDynamicWeaponData(this.actor, "secondary");
    }

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

    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    context.inventoryHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.inventory, {
      secrets: this.document.isOwner,
      async: true
    });
    context.advancementHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.advancementnotes, {
      secrets: this.document.isOwner,
      async: true
    });

    for (let item of context.data.items) {
      item.system.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, {
        secrets: this.document.isOwner,
        async: true
      });

      if (item.type === "weapon" && this.actor.type === "character") {
        item.equippedSlot = EquipmentHandler.getWeaponEquippedSlot(this.actor, item);
      }
    }

    context.data.items = this._sortItemsWithWeaponsFirst(context.data.items);

    context.actor = this.actor;

    if (this.actor.type === "character") {
      context.weaponDisplay = EquipmentHandler.getWeaponDisplayData(this.actor);
    }

    const imageLink = context.data.img;
    context.imageStyle = `background: url(${imageLink});`;

    context.uiState = {
      vaultOpen: this._vaultOpen,
      categoryStates: this._categoryStates
    };

    const health = context.systemData.health;
    context.isDying = health && health.value === health.max && health.max > 0;

    return context;
  }

  async activateListeners(html) {
    super.activateListeners(html);

    // Initialize or reinitialize sheet tracker
    if (this.sheetTracker) {
      this.sheetTracker.destroy();
    }
    this.sheetTracker = new SheetTracker(this);
    await this.sheetTracker.initialize();

    if (this.actor.type === "character") {
      if (!this.domainAbilitySidebar) {
        this.domainAbilitySidebar = new DomainAbilitySidebar(this);
      }
      this.domainAbilitySidebar.initialize();
    }

    if (!this.headerLoadoutBar) {
      this.headerLoadoutBar = new HeaderLoadoutBar(this);
    }
    this.headerLoadoutBar.initialize();

    this._disableTransitions();

    await this._loadUiState();

    const vaultList = html.find('.item-list[data-location="vault"]');
    const icon = html.find('.vault-toggle i');

    if (this._vaultOpen) {
      vaultList.removeClass('vault-collapsed');
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
      vaultList.addClass('vault-collapsed');
      icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    }

    this._updateDynamicSpacing(false);

    this._enableTransitions();

    this._markEmptyItemLists(html);

    if (!this.isEditable) return;

    this._setupDragDropListeners(html);

    html.find(".resource-control").click(this._onResourceControl.bind(this));

    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));

    html.find(".traits").on("click", ".trait label", this._onTraitLabelClick.bind(this));
    html.find(".click-rollable-group").on("click", ".click-rollable", this._onRollableClick.bind(this));
    html.find(".basic-rollable-group").on("click", ".basic-rollable", this._onBasicRollableClick.bind(this));

    html.find(".item-control").click(this._onItemControl.bind(this));
    html.find(".rollable").on("click", this._onItemRoll.bind(this));

    if (this.actor.type === "character") {

      html.find('.weapon-toggle-equip').click(this._onToggleWeaponEquip.bind(this));

      html.find('.weapon-equip-primary').click(this._onEquipPrimaryWeapon.bind(this));
      html.find('.weapon-equip-secondary').click(this._onEquipSecondaryWeapon.bind(this));

      html.find('.armor-equip').click(this._onEquipArmor.bind(this));
    }

    html.find(".item-name[data-action=\"toggle-description\"]").click(this._onToggleDescription.bind(this));

    html.find('.remove-card').click(this._onRemoveCard.bind(this));

    html.find('.vault-toggle').click(this._onToggleVault.bind(this));

    html.find('.category-toggle').click(this._onToggleCategory.bind(this));

    html.find('.death-overlay').click(this._onDeathOverlayClick.bind(this));

    html.find('.rest-button').click(this._onRestClick.bind(this));

    html.find('.nav-gem').click(this._onNavGemClick.bind(this));

    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });

    const navGem = html.find('.nav-gem')[0];
    if (navGem) {
      navGem.setAttribute("draggable", true);
      navGem.addEventListener("dragstart", (ev) => {

        const macroData = {
          name: "Duality Dice Roll",
          type: "script",
          scope: "global",
          img: "https://i.imgur.com/VSTKJWt.png",
          command: `

await game.daggerheart.rollHandler.dualityWithDialog({
  title: "Duality Dice Roll"
});`
        };

        const dragData = {
          type: "Macro",
          data: macroData
        };

        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    }

    let tooltipElement = null;
    html.find("[data-trait-tooltip]").each((i, element) => {
      let tooltipTimeout;

      element.addEventListener("mouseenter", (e) => {
        const tooltipText = element.getAttribute("data-trait-tooltip");
        if (tooltipText && tooltipText.trim() !== "") {
          tooltipTimeout = setTimeout(() => {

            if (!tooltipElement) {
              tooltipElement = document.createElement('div');
              tooltipElement.className = 'daggerheart-tooltip';
              tooltipElement.innerHTML = `
                <div class="tooltip-arrow"></div>
                <div class="tooltip-content"></div>
              `;
              document.body.appendChild(tooltipElement);
            }

            tooltipElement.querySelector('.tooltip-content').textContent = tooltipText;
            tooltipElement.classList.add('show');

            const rect = element.getBoundingClientRect();
            const tooltipRect = tooltipElement.getBoundingClientRect();

            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            let top = rect.top - tooltipRect.height - 8;

            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) {
              left = window.innerWidth - tooltipRect.width - 10;
            }
            if (top < 10) {

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

    html.find(".trait-value-display").click(this._onTraitValueClick.bind(this));

    html.find(".attribute-value-display").click(this._onAttributeValueClick.bind(this));

    html.find(".damage-value-display").click(this._onDamageValueClick.bind(this));

    html.find(".threshold-clickable").click(this._onThresholdClick.bind(this));

    function adjustTextSize(input, baseFontSizeEm = 1, minFontSizeEm = 0.5) {
      const $input = $(input);
      const text = $input.val();
      const maxWidth = $input.width();

      const parentFontSize = parseInt($input.parent().css('font-size'));
      const baseFontSize = baseFontSizeEm * parentFontSize;
      const minFontSize = minFontSizeEm * parentFontSize;

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

      if (textWidth > maxWidth) {
        fontSize = Math.max(minFontSize, Math.floor(baseFontSize * (maxWidth / textWidth) * 0.9));
      }

      $temp.remove();

      const fontSizeEm = fontSize / parentFontSize;
      $input.css('font-size', fontSizeEm + 'em');
    }

    const domainInputs = html.find('.header-domain input');

    domainInputs.each(function () {
      adjustTextSize(this, 1, 0.625);
    });

    domainInputs.on('input', function () {
      adjustTextSize(this, 1, 0.625);
    });

    const charnameInput = html.find('.charname input');

    charnameInput.each(function () {
      adjustTextSize(this, 2.5, 1.2);
    });

    charnameInput.on('input', function () {
      adjustTextSize(this, 2.5, 1.2);
    });

    let el = html.find(".input-wrap .input");
    let widthMachine = html.find(".input-wrap .width-machine");
    el.on("keyup", () => {
      widthMachine.html(el.val());
    });

    function calcHeight(value) {
      let numberOfLineBreaks = (value.match(/\n/g) || []).length;

      let newHeight = 20 + numberOfLineBreaks * 20 + 12 + 2;
      return newHeight;
    }

    let textarea = html.find(".resize-ta");
    textarea.on("keyup", () => {
      textarea.css("height", calcHeight(textarea.val()) + "px");
    });

  }

  close(options) {
    // Clean up sheet tracker
    if (this.sheetTracker) {
      this.sheetTracker.destroy();
      this.sheetTracker = null;
    }

    // Clean up domain ability sidebar
    if (this.domainAbilitySidebar) {
      this.domainAbilitySidebar.destroy?.();
      this.domainAbilitySidebar = null;
    }

    // Clean up header loadout bar
    if (this.headerLoadoutBar) {
      this.headerLoadoutBar.destroy?.();
      this.headerLoadoutBar = null;
    }

    // Check if the tooltip element exists and remove it from the DOM
    let tooltipElement = document.querySelector('.daggerheart-tooltip');
    if (tooltipElement) {
      tooltipElement.remove();
    }

    return super.close(options);
  }

  async _onToggleWeaponEquip(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item || item.type !== "weapon") return;

    const success = await EquipmentHandler.toggleWeaponEquip(this.actor, item);

    if (success) {
      // Use immediate render to prevent debouncing issues with tracker
      this.render(true, { immediate: true });
    }
  }

  async _onEquipPrimaryWeapon(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item || item.type !== "weapon") return;

    const success = await EquipmentHandler.equipPrimaryWeapon(this.actor, item);

    if (success) {
      this.render(true, { immediate: true });
    }
  }

  async _onEquipSecondaryWeapon(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item || item.type !== "weapon") return;

    const success = await EquipmentHandler.equipSecondaryWeapon(this.actor, item);

    if (success) {
      this.render(true, { immediate: true });
    }
  }

  async _onEquipArmor(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item || item.type !== "armor") return;

    const success = await EquipmentSystem.toggle(this.actor, item);

    if (success) {
      this.render(true, { immediate: true });
    }
  }

  _setupDragDropListeners(html) {
    const form = html[0];

    form.addEventListener('dragstart', (event) => {
      if (event.target.closest('.item')) {
        form.classList.add('dragging');
      }
    });

    form.addEventListener('dragend', (event) => {
      form.classList.remove('dragging');

      form.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });

    html.find('.item-list').on('dragover', (event) => {
      event.preventDefault();
      event.currentTarget.classList.add('drag-over');
    });

    html.find('.item-list').on('dragleave', (event) => {

      if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('drag-over');
      }
    });

    html.find('.tab-category').on('dragover', (event) => {
      event.preventDefault();
      event.currentTarget.classList.add('drag-over');
    });

    html.find('.tab-category').on('dragleave', (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('drag-over');
      }
    });

    html.find('.tab-category').on('drop', (event) => {
      event.preventDefault();
      const category = event.currentTarget;

      let itemList = category.nextElementSibling;
      while (itemList && !itemList.classList.contains('item-list')) {
        itemList = itemList.nextElementSibling;
      }

      if (itemList && itemList.classList.contains('item-list')) {

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

  async _onItemControl(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const li = button.closest(".item");
    const item = this.actor.items.get(li?.dataset.itemId);
    const action = button.dataset.action;

    if (item && action === "edit" && button.tagName === 'IMG' && button.classList.contains('item-control')) {
      const itemData = item.system;

      const chatCard = buildItemCardChat({
        itemId: item.id,
        actorId: this.actor.id,
        image: item.img,
        name: item.name,
        category: itemData.category || '',
        rarity: itemData.rarity || '',
        description: itemData.description || ''
      });

      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: chatCard
      });
      return;
    }

    const type = button.dataset.type;
    const location = button.dataset.location;
    if (action && action.startsWith('create')) {
      const ItemCls = getDocumentClass('Item');

      const defaultNames = {
        'class': 'New Class',
        'subclass': 'New Subclass',
        'ancestry': 'New Ancestry',
        'community': 'New Community',
        'domain': 'New Domain',
        'item': 'New Item',
        'weapon': 'New Weapon',
        'passive': 'New Passive'
      };
      const itemName = defaultNames[type] || 'New Item';

      const fallbackLoc = ['item', 'weapon'].includes(type) ? 'backpack' : (type || 'abilities');
      const loc = location || fallbackLoc;

      await ItemCls.create({ name: itemName, type, system: { location: loc } }, { parent: this.actor });
      return;
    }

    switch (action) {
      case "create-item":
        const cls = getDocumentClass("Item");
        return cls.create({
          name: "New Item",
          type: type,
          system: { location: location || "backpack" }
        }, { parent: this.actor });
      case "create-domain":
        const clsd = getDocumentClass("Item");
        return clsd.create({
          name: "New Domain",
          type: type,
          system: { location: location || "abilities" }
        }, { parent: this.actor });
      case "create-ancestry":
        const clsa = getDocumentClass("Item");
        return clsa.create({
          name: "New Ancestry",
          type: type,
          system: { location: location || "ancestry" }
        }, { parent: this.actor });
      case "create-community":
        const clscom = getDocumentClass("Item");
        return clscom.create({
          name: "New Community",
          type: type,
          system: { location: location || "community" }
        }, { parent: this.actor });
      case "create-class":
        const clscl = getDocumentClass("Item");
        return clscl.create({
          name: "New Class",
          type: type,
          system: { location: location || "class" }
        }, { parent: this.actor });
      case "create-subclass":
        const clssc = getDocumentClass("Item");
        return clssc.create({
          name: "New Subclass",
          type: type,
          system: { location: location || "subclass" }
        }, { parent: this.actor });
      case "edit":
        if (item) return item.sheet.render(true);
        break;
      case "delete":
        if (item) {
          const confirmResult = await DaggerheartDialogHelper.showDialog({
            title: "Delete Item",
            content: `<p>Are you sure you want to delete <strong>${item.name}</strong>? This cannot be undone.</p>`,
            dialogClass: "confirm-dialog",
            buttons: {
              confirm: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: () => true
              },
              cancel: {
                label: "Cancel",
                callback: () => null
              }
            },
            default: "cancel"
          });
          if (!confirmResult) return;
          return item.delete();
        }
        break;
      case "send-to-vault":
        if (item) {
          const confirmResult = await DaggerheartDialogHelper.showDialog({
            title: "Move to Vault",
            content: `<p>Are you sure you want to move <strong>${item.name}</strong> to the vault?</p>`,
            dialogClass: "confirm-dialog",
            buttons: {
              confirm: {
                label: "Move",
                icon: '<i class="fas fa-archive"></i>',
                callback: () => true
              },
              cancel: {
                label: "Cancel",
                callback: () => null
              }
            },
            default: "cancel"
          });
          if (!confirmResult) return;

          return item.update({
            "system.location": "vault"
          });
        }
        break;
      case "send-to-domain":
        if (item && item.system.location === "vault") {

          return item.update({
            "system.location": "abilities"
          });
        }
        break;
    }
  }

  async _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));

    await game.daggerheart.rollHandler.quickRoll(button.data('roll'), {
      flavor: `<p class="roll-flavor-line"><b>${item.name}</b> - ${button.text()}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

    if (data.type === "Card") {
      event.preventDefault();
      const card = await fromUuid(data.uuid);
      const domains = this.actor.system.domains || [];
      const newCardId = foundry.utils.randomID();
      domains.push({ _id: newCardId, name: card.name, img: card.img });
      await this.actor.update({ "system.domains": domains });
      return;
    }

    super._onDrop(event);
  }

  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;

    const targetList = event.target.closest('.item-list');
    if (!targetList) return false;

    const newLocation = targetList.dataset.location;
    if (!newLocation) return false;

    const item = await Item.implementation.fromDropData(data);

    this.element[0].classList.remove('dragging');
    this.element[0].querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    if (this.actor.items.has(item.id)) {
      const existingItem = this.actor.items.get(item.id);

      if (existingItem.system.location === newLocation) {
        return;
      }

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

  async _onRemoveCard(event) {
    event.preventDefault();
    const cardId = event.currentTarget.dataset.cardId;
    const domains = this.actor.system.domains || [];
    const updatedDomains = domains.filter(domain => domain._id !== cardId);
    await this.actor.update({ "system.domains": updatedDomains });
  }

  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);

    formData = EntitySheetHelper.updateAttributes(formData, this.object);
    formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }

  async _onTraitLabelClick(event) {
    event.preventDefault();
    const traitName = event.currentTarget.closest(".trait").dataset.trait;
    const traitValue = this.actor.system[traitName].value;
    await this._rollTrait(traitName, traitValue);
  }

  async _onTraitValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;

    this._onAttributeValueClick(event);
  }

  async _onDamageValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;

    const config = {
      field: displayElement.dataset.field,
      label: displayElement.dataset.label,
      type: displayElement.dataset.editType || 'damage',
      hasModifiers: displayElement.dataset.hasModifiers !== 'false',
      min: displayElement.dataset.min ? parseInt(displayElement.dataset.min) : null,
      max: displayElement.dataset.max ? parseInt(displayElement.dataset.max) : null
    };

    if (!config.label) {
      config.label = 'Weapon Damage';
    }

    let damageData = foundry.utils.getProperty(this.actor, config.field);

    if (typeof damageData === 'object' && damageData !== null && 'baseValue' in damageData) {

      const baseValue = damageData.baseValue || '1d8';
      const modifiers = damageData.modifiers || [];

      if (baseValue.includes(' ') && modifiers.length === 0) {

        const match = baseValue.match(/^(\d*d\d+)/);
        if (match) {
          damageData.baseValue = match[1];
          damageData.modifiers = [];
          damageData.value = match[1];
        }
      }
    } else if (typeof damageData === 'object' && damageData !== null && 'value' in damageData) {

      const displayValue = damageData.value || '1d8';
      damageData = {
        baseValue: displayValue,
        modifiers: damageData.modifiers || [],
        value: displayValue
      };
    } else {

      const simpleValue = damageData || '1d8';
      damageData = {
        baseValue: simpleValue,
        modifiers: [],
        value: simpleValue
      };
    }

    if (!Array.isArray(damageData.modifiers)) {
      damageData.modifiers = [];
    }

    config.isFromEquippedWeapon = damageData.isFromEquippedWeapon || false;

    this._showDamageModifierEditPopup(config, damageData, displayElement);
  }

  async _onAttributeValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;

    const config = {
      field: displayElement.dataset.field,
      label: displayElement.dataset.label,
      type: displayElement.dataset.editType || 'modifiers',
      hasModifiers: displayElement.dataset.hasModifiers !== 'false',
      min: displayElement.dataset.min ? parseInt(displayElement.dataset.min) : null,
      max: displayElement.dataset.max ? parseInt(displayElement.dataset.max) : null
    };

    if (!config.label) {
      const parentElement = displayElement.closest("[data-trait], [data-defense]");
      if (parentElement) {
        const attrName = parentElement.dataset.trait || parentElement.dataset.defense || 'Value';
        config.label = attrName.charAt(0).toUpperCase() + attrName.slice(1);
      } else {
        config.label = 'Value';
      }
    }

    let currentValue = foundry.utils.getProperty(this.actor, config.field);

    if (typeof currentValue === 'object' && currentValue !== null && 'value' in currentValue) {
      currentValue = currentValue.value || 0;
    } else {
      currentValue = currentValue || 0;
    }

    const isWeaponModifier = config.field.includes('weapon-main.to-hit') || config.field.includes('weapon-off.to-hit');
    let attributeData;

    if (isWeaponModifier) {

      attributeData = foundry.utils.getProperty(this.actor, config.field);

      if (typeof attributeData !== 'object' || attributeData === null || !('baseValue' in attributeData)) {
        attributeData = {
          baseValue: currentValue,
          modifiers: [],
          value: currentValue
        };
      }
    } else {

      const pathParts = config.field.split('.');
      attributeData = this.actor;
      for (let i = 0; i < pathParts.length - 1; i++) {
        attributeData = attributeData[pathParts[i]] || {};
      }
    }

    if (config.hasModifiers) {

      if (typeof attributeData !== 'object' || attributeData === null || Array.isArray(attributeData)) {

        attributeData = {
          baseValue: currentValue,
          modifiers: [],
          value: currentValue
        };
      } else if (!Array.isArray(attributeData.modifiers)) {

        attributeData.modifiers = [];
      }
    }

    const isWeaponAttack = config.field.includes('weapon-main.to-hit') || config.field.includes('weapon-off.to-hit');
    if (isWeaponAttack && typeof attributeData === 'object' && attributeData !== null) {
      config.isFromEquippedWeapon = attributeData.isFromEquippedWeapon || false;
      config.weaponTrait = attributeData.weaponTrait || null;
    } else {
      config.isFromEquippedWeapon = false;
    }

    if (config.hasModifiers) {
      this._showModifierEditPopup(config, currentValue, attributeData, displayElement);
    } else {
      this._showSimpleEditPopup(config, currentValue, displayElement);
    }
  }

  _showModifierEditPopup(config, currentValue, attributeData, displayElement) {

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
                <label class="base-value-label">Base Value</label>
                <div class="base-value-controls">
                  <button type="button" class="base-value-decrement">-</button>
                  <input type="number" class="attribute-base-input trait-base-input" />
                  <button type="button" class="base-value-increment">+</button>
                  <div class="equipped-weapon-indicator" style="display: none;">
                    <span class="equipped-weapon-text">From equipped weapon trait</span>
                  </div>
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

    const pathParts = config.field.split('.');
    const attributeName = pathParts[pathParts.length - 2];

    overlay.find('.attribute-edit-label').text(config.label);

    const baseInput = overlay.find('.attribute-base-input');
    let baseValue;

    if (typeof attributeData === 'object' && attributeData !== null && 'baseValue' in attributeData) {
      baseValue = attributeData.baseValue;
    } else if (typeof attributeData === 'object' && attributeData !== null && 'value' in attributeData && 'modifiers' in attributeData) {

      baseValue = currentValue;
    } else {

      baseValue = currentValue;
    }

    baseInput.val(baseValue);

    const equippedIndicator = overlay.find('.equipped-weapon-indicator');
    const incrementBtn = overlay.find('.base-value-increment');
    const decrementBtn = overlay.find('.base-value-decrement');

    const hasRestriction = this.hasBaseValueRestriction(config.field);
    const restriction = this.getBaseValueRestriction(config.field);

    if (hasRestriction && restriction && !restriction.editable) {

      baseInput.prop('readonly', true).addClass('restriction-locked');
      incrementBtn.prop('disabled', true).addClass('restriction-locked');
      decrementBtn.prop('disabled', true).addClass('restriction-locked');
      equippedIndicator.show();
      overlay.find('.equipped-weapon-text').text('Base value locked by equipped weapon');
      overlay.find('.base-value-label').text('Base Value (From Equipped Weapon)');

      baseInput.val(restriction.value);
    } else {
      baseInput.prop('readonly', false).removeClass('weapon-locked restriction-locked');
      incrementBtn.prop('disabled', false).removeClass('weapon-locked restriction-locked');
      decrementBtn.prop('disabled', false).removeClass('weapon-locked restriction-locked');
      equippedIndicator.hide();
      overlay.find('.base-value-label').text('Base Value');
    }

    if (config.min !== null) baseInput.attr('min', config.min);
    if (config.max !== null) baseInput.attr('max', config.max);

    overlay.data('config', config);
    overlay.data('attribute-name', attributeName);
    overlay.data('field-name', config.field);
    overlay.data('display-element', displayElement);

    this._loadModifiers(overlay, attributeData.modifiers || []);

    this._updateTotal(overlay);

    overlay.show();
    const popup = overlay.find('.attribute-edit-popup');

    this._animatePopupIn(popup, () => {
      baseInput.focus().select();
    });

    this._setupPopupEventHandlers(overlay);
  }

  _showSimpleEditPopup(config, currentValue, displayElement) {

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

    overlay.find('.attribute-edit-label').text(config.label);
    const input = overlay.find('.attribute-simple-input');
    input.val(currentValue);

    if (config.min !== null) input.attr('min', config.min);
    if (config.max !== null) input.attr('max', config.max);

    overlay.data('config', config);
    overlay.data('display-element', displayElement);

    overlay.show();
    const popup = overlay.find('.attribute-edit-popup');

    this._animatePopupIn(popup, () => {
      input.focus().select();
    });

    this._setupSimplePopupEventHandlers(overlay);
  }

  _showDamageModifierEditPopup(config, damageData, displayElement) {

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
                <label class="base-value-label">Base Formula</label>
                <div class="base-value-controls">
                  <input type="text" class="damage-base-input attribute-base-input" placeholder="1d8" />
                  <div class="equipped-weapon-indicator" style="display: none;">
                    <span class="equipped-weapon-text">From equipped weapon</span>
                  </div>
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

    const pathParts = config.field.split('.');
    const attributeName = pathParts[pathParts.length - 2];

    overlay.find('.damage-edit-label').text(config.label);

    const baseInput = overlay.find('.damage-base-input');
    const baseValue = damageData.baseValue || '1d8';

    baseInput.val(baseValue);

    const equippedIndicator = overlay.find('.equipped-weapon-indicator');

    const hasRestriction = this.hasBaseValueRestriction(config.field);
    const restriction = this.getBaseValueRestriction(config.field);

    if (hasRestriction && restriction && !restriction.editable) {

      baseInput.prop('readonly', true).addClass('restriction-locked');
      equippedIndicator.show();
      overlay.find('.equipped-weapon-text').text('Base formula locked by equipped weapon');
      overlay.find('.base-value-label').text('Base Formula (From Equipped Weapon)');

      baseInput.val(restriction.value);
    } else {
      baseInput.prop('readonly', false).removeClass('weapon-locked restriction-locked');
      equippedIndicator.hide();
      overlay.find('.base-value-label').text('Base Formula');
    }

    overlay.data('config', config);
    overlay.data('attribute-name', attributeName);
    overlay.data('field-name', config.field);
    overlay.data('display-element', displayElement);

    this._loadDamageModifiers(overlay, damageData.modifiers || []);

    this._updateDamageTotal(overlay);

    overlay.show();
    const popup = overlay.find('.damage-edit-popup');

    this._animatePopupIn(popup, () => {
      baseInput.focus().select();
    });

    this._setupDamagePopupEventHandlers(overlay);
  }

  _setupPopupEventHandlers(overlay) {

    overlay.off('.attribute-edit');
    overlay.find('*').off('.attribute-edit');

    const baseInput = overlay.find('.attribute-base-input');
    baseInput.on('input', () => this._updateTotal(overlay));

    overlay.find('.base-value-increment').on('click', () => {
      const currentValue = parseInt(baseInput.val()) || 0;
      baseInput.val(currentValue + 1);
      this._updateTotal(overlay);
    });

    overlay.find('.base-value-decrement').on('click', () => {
      const currentValue = parseInt(baseInput.val()) || 0;
      const newValue = Math.max(-3, currentValue - 1);
      baseInput.val(newValue);
      this._updateTotal(overlay);
    });

    overlay.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideAttributeEditPopup(overlay);
      }
    });

    overlay.find('.add-modifier-btn').on('click', () => {
      this._addModifier(overlay);
    });

    overlay.find('.attribute-edit-close').on('click', () => {
      this._submitAttributeEdit(overlay);
    });

    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitAttributeEdit(overlay);
      }
    });
  }

  _setupSimplePopupEventHandlers(overlay) {

    overlay.off('.attribute-edit');
    overlay.find('*').off('.attribute-edit');

    const input = overlay.find('.attribute-simple-input');

    input.on('keydown', (e) => {
      if (e.key === 'Enter') {
        this._submitSimpleEdit(overlay);
      } else if (e.key === 'Escape') {
        this._hideAttributeEditPopup(overlay);
      }
    });

    overlay.find('.attribute-edit-close').on('click', () => {
      this._submitSimpleEdit(overlay);
    });

    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitSimpleEdit(overlay);
      }
    });
  }

  _loadModifiers(overlay, modifiers) {
    const modifiersList = overlay.find('.modifiers-list');
    modifiersList.empty();

    if (!Array.isArray(modifiers)) {
      modifiers = [];
    }

    modifiers.forEach((modifier, index) => {
      this._createModifierRow(overlay, modifier, index);
    });
  }

  _createModifierRow(overlay, modifier, index) {
    const modifiersList = overlay.find('.modifiers-list');
    const isPermanent = modifier.permanent === true;
    const toggleStyle = isPermanent ? 'style="display: none;"' : '';
    const deleteStyle = isPermanent ? 'style="display: none;"' : '';
    const permanentClass = isPermanent ? 'permanent-modifier' : '';
    const permanentIndicator = isPermanent ? '<i class="fas fa-lock permanent-indicator" title="Permanent modifier"></i>' : '';

    const row = $(`
      <div class="modifier-row ${modifier.enabled === false ? 'disabled' : ''} ${permanentClass}" data-index="${index}" data-modifier-id="${modifier.id || ''}">
        <input type="text" class="modifier-name" placeholder="Modifier name" value="${modifier.name || ''}" ${isPermanent ? 'readonly' : ''} />
        <input type="text" class="modifier-value" placeholder="±0 or @prof" value="${modifier.value || (modifier.value === 0 ? '0' : '')}" ${isPermanent ? 'readonly' : ''} />
        <input type="checkbox" class="modifier-toggle" ${modifier.enabled !== false ? 'checked' : ''} ${toggleStyle} />
        <button type="button" class="modifier-delete" ${deleteStyle}>×</button>
        ${permanentIndicator}
      </div>
    `);

    if (!isPermanent) {
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
    }

    modifiersList.append(row);
  }

  _setupDamagePopupEventHandlers(overlay) {

    overlay.off('.damage-edit');
    overlay.find('*').off('.damage-edit');

    const baseInput = overlay.find('.damage-base-input');
    baseInput.on('input', () => this._updateDamageTotal(overlay));

    overlay.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideDamageEditPopup(overlay);
      }
    });

    overlay.find('.add-damage-modifier-btn').on('click', () => {
      this._addDamageModifier(overlay);
    });

    overlay.find('.damage-edit-close').on('click', () => {
      this._submitDamageEdit(overlay);
    });

    overlay.on('click', (e) => {
      if (e.target === overlay[0]) {
        this._submitDamageEdit(overlay);
      }
    });
  }

  _loadDamageModifiers(overlay, modifiers) {
    const modifiersList = overlay.find('.damage-modifiers-list');
    modifiersList.empty();

    if (!Array.isArray(modifiers)) {
      modifiers = [];
    }

    modifiers.forEach((modifier, index) => {
      this._createDamageModifierRow(overlay, modifier, index);
    });
  }

  _createDamageModifierRow(overlay, modifier, index) {
    const modifiersList = overlay.find('.damage-modifiers-list');
    const isPermanent = modifier.permanent === true;
    const toggleStyle = isPermanent ? 'style="display: none;"' : '';
    const deleteStyle = isPermanent ? 'style="display: none;"' : '';
    const permanentClass = isPermanent ? 'permanent-modifier' : '';
    const permanentIndicator = isPermanent ? '<i class="fas fa-lock permanent-indicator" title="Permanent modifier"></i>' : '';

    const row = $(`
      <div class="damage-modifier-row modifier-row ${modifier.enabled === false ? 'disabled' : ''} ${permanentClass}" data-index="${index}" data-modifier-id="${modifier.id || ''}">
        <input type="text" class="damage-modifier-name modifier-name" placeholder="Modifier name" value="${modifier.name || ''}" ${isPermanent ? 'readonly' : ''} />
        <input type="text" class="damage-modifier-value modifier-value" placeholder="±1 or ±1d4" value="${modifier.value || ''}" ${isPermanent ? 'readonly' : ''} />
        <input type="checkbox" class="damage-modifier-toggle modifier-toggle" ${modifier.enabled !== false ? 'checked' : ''} ${toggleStyle} />
        <button type="button" class="damage-modifier-delete modifier-delete" ${deleteStyle}>×</button>
        ${permanentIndicator}
      </div>
    `);

    if (!isPermanent) {
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
    }

    modifiersList.append(row);
  }

  _addDamageModifier(overlay) {
    const newModifier = {
      name: 'Modifier',
      value: '+1',
      enabled: true
    };

    const modifiersList = overlay.find('.damage-modifiers-list');
    const index = modifiersList.children().length;

    this._createDamageModifierRow(overlay, newModifier, index);

    const newRow = modifiersList.children().last();
    const nameInput = newRow.find('.damage-modifier-name');
    nameInput.focus().select();
  }

  _updateDamageTotal(overlay) {
    const baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    let modifierParts = [];

    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      const isEnabled = $row.find('.damage-modifier-toggle').is(':checked');

      if (isEnabled) {
        const value = $row.find('.damage-modifier-value').val().trim();
        if (value) {

          let formattedValue = value;
          if (value && !value.startsWith('+') && !value.startsWith('-')) {
            formattedValue = '+' + value;
          }
          modifierParts.push(formattedValue);
        }
      }
    });

    let totalFormula = baseValue;
    if (modifierParts.length > 0) {
      totalFormula += ' ' + modifierParts.join(' ');
    }

    overlay.find('.damage-total-value').text(totalFormula);

    return totalFormula;
  }

  async _submitDamageEdit(overlay) {
    const config = overlay.data('config');
    const attributeName = overlay.data('attribute-name');

    const hasRestriction = this.hasBaseValueRestriction(config.field);
    const restriction = this.getBaseValueRestriction(config.field);

    let baseValue;
    if (hasRestriction && restriction && !restriction.editable) {

      baseValue = String(restriction.value) || '1d8';
    } else {

      baseValue = overlay.find('.damage-base-input').val().trim() || '1d8';
    }

    const modifiers = [];
    overlay.find('.damage-modifier-row').each((index, row) => {
      const $row = $(row);
      let name = $row.find('.damage-modifier-name').val().trim();
      const value = $row.find('.damage-modifier-value').val().trim();
      const enabled = $row.find('.damage-modifier-toggle').is(':checked');
      const isPermanent = $row.hasClass('permanent-modifier');
      const modifierId = $row.attr('data-modifier-id');

      if (value) {

        if (!name) {
          name = 'Modifier';
        }
        const modifier = {
          name: name,
          value: value,
          enabled: enabled
        };

        if (isPermanent) {
          modifier.permanent = true;
        }

        if (modifierId) {
          modifier.id = modifierId;
        }

        modifiers.push(modifier);
      }
    });

    let totalFormula = baseValue;
    const enabledModifiers = modifiers.filter(mod => mod.enabled !== false && mod.value);

    if (enabledModifiers.length > 0) {
      enabledModifiers.forEach(modifier => {
        let modValue = modifier.value.trim();

        if (modValue && !modValue.startsWith('+') && !modValue.startsWith('-')) {
          modValue = '+' + modValue;
        }
        totalFormula += ' ' + modValue;
      });
    }

    const updateData = {};

    const isWeaponDamage = config.field.includes('weapon-main.damage') || config.field.includes('weapon-off.damage');

    let basePath;
    if (isWeaponDamage) {

      basePath = config.field;
    } else {

      basePath = config.field.substring(0, config.field.lastIndexOf('.'));
    }

    updateData[`${basePath}.baseValue`] = baseValue;
    updateData[`${basePath}.modifiers`] = modifiers;
    updateData[`${basePath}.value`] = totalFormula;

    await this.actor.update(updateData);

    this._hideDamageEditPopup(overlay);
  }

  _hideDamageEditPopup(overlay) {
    const popup = overlay.find('.damage-edit-popup');
    this._animatePopupOut(popup, () => {
      overlay.hide();
      overlay.remove();
    });
  }

  _addModifier(overlay) {
    const newModifier = {
      name: 'Modifier',
      value: '0',
      enabled: true
    };

    const modifiersList = overlay.find('.modifiers-list');
    const index = modifiersList.children().length;

    this._createModifierRow(overlay, newModifier, index);

    const newRow = modifiersList.children().last();
    const nameInput = newRow.find('.modifier-name');
    nameInput.focus().select();
  }

  _updateTotal(overlay) {
    const baseValue = parseInt(overlay.find('.attribute-base-input').val()) || 0;
    let modifierTotal = 0;

    overlay.find('.modifier-row').each((index, row) => {
      const $row = $(row);
      const isEnabled = $row.find('.modifier-toggle').is(':checked');

      if (isEnabled) {
        let value = $row.find('.modifier-value').val().trim() || '0';

        if (value.includes('@') && globalThis.daggerheart?.EntitySheetHelper) {
          try {
            value = globalThis.daggerheart.EntitySheetHelper.processInlineReferences(value, this.actor);
          } catch (error) {
            console.warn("Daggerheart | Error processing inline references in modifier:", error);
          }
        }

        const numericValue = parseInt(value) || 0;
        modifierTotal += numericValue;
      }
    });

    const total = baseValue + modifierTotal;
    overlay.find('.attribute-total-value').text(total);

    return total;
  }

  async _submitAttributeEdit(overlay) {
    const config = overlay.data('config');
    const attributeName = overlay.data('attribute-name');

    const hasRestriction = this.hasBaseValueRestriction(config.field);
    const restriction = this.getBaseValueRestriction(config.field);

    let baseValue;
    if (hasRestriction && restriction && !restriction.editable) {

      baseValue = typeof restriction.value === 'number' ? restriction.value : parseInt(restriction.value) || 0;
    } else {

      baseValue = parseInt(overlay.find('.attribute-base-input').val()) || 0;
    }

    const modifiers = [];
    overlay.find('.modifier-row').each((index, row) => {
      const $row = $(row);
      let name = $row.find('.modifier-name').val().trim();
      const value = $row.find('.modifier-value').val().trim() || '0';
      const enabled = $row.find('.modifier-toggle').is(':checked');
      const isPermanent = $row.hasClass('permanent-modifier');
      const modifierId = $row.attr('data-modifier-id');

      if (value !== '0' && value !== 0 && value !== '') {

        if (!name) {
          name = 'Modifier';
        }
        const modifier = {
          name: name,
          value: value,
          enabled: enabled
        };

        if (isPermanent) {
          modifier.permanent = true;
        }

        if (modifierId) {
          modifier.id = modifierId;
        }

        modifiers.push(modifier);
      }
    });

    let totalValue = baseValue;
    modifiers.forEach(modifier => {
      if (modifier.enabled !== false) {
        let modValue = modifier.value;

        if (typeof modValue === 'string' && modValue.includes('@') && globalThis.daggerheart?.EntitySheetHelper) {
          try {
            modValue = globalThis.daggerheart.EntitySheetHelper.processInlineReferences(modValue, this.actor);
          } catch (error) {
            console.warn("Daggerheart | Error processing inline references in modifier:", error);
          }
        }

        const numericValue = parseInt(modValue) || 0;
        totalValue += numericValue;
      }
    });

    const updateData = {};

    const isWeaponModifier = config.field.includes('weapon-main.to-hit') || config.field.includes('weapon-off.to-hit');

    let basePath;
    if (isWeaponModifier) {

      basePath = config.field;
    } else {

      basePath = config.field.substring(0, config.field.lastIndexOf('.'));
    }

    updateData[`${basePath}.baseValue`] = baseValue;
    updateData[`${basePath}.modifiers`] = modifiers;
    updateData[`${basePath}.value`] = totalValue;

    await this.actor.update(updateData);

    this._hideAttributeEditPopup(overlay);
  }

  async _submitSimpleEdit(overlay) {
    const config = overlay.data('config');
    const value = parseInt(overlay.find('.attribute-simple-input').val()) || 0;

    const updateData = {};
    updateData[config.field] = value;

    await this.actor.update(updateData);

    const displayElement = overlay.data('display-element');
    $(displayElement).text(value);

    this._hideAttributeEditPopup(overlay);
  }

  _hideAttributeEditPopup(overlay) {
    const popup = overlay.find('.attribute-edit-popup');
    this._animatePopupOut(popup, () => {
      overlay.hide();
      overlay.remove();
    });
  }

  _animatePopupIn(popup, callback) {
    let start = null;
    const duration = 200;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);

      const scale = 0.8 + (0.2 * eased);
      const opacity = eased;

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

  _animatePopupOut(popup, callback) {
    let start = null;
    const duration = 150;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      const eased = Math.pow(progress, 2);

      const scale = 1.0 - (0.2 * eased);
      const opacity = 1 - eased;

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

  async _onRollableClick(event) {
    event.preventDefault();

    const rollableElement = event.currentTarget;
    const weaponBox = rollableElement.closest(".click-rollable-group");

    const rollNameInput = weaponBox.querySelector(".click-rollable-name");
    const rollModifierElement = weaponBox.querySelector(".click-rollable-modifier");

    const rollName = rollNameInput ? rollNameInput.value.trim() : "";
    let rollModifier = 0;

    if (rollModifierElement) {
      rollModifier = parseInt(rollModifierElement.value) || 0;
    } else {

      const attributeDisplay = weaponBox.querySelector(".attribute-value-display");
      if (attributeDisplay) {
        const fieldPath = attributeDisplay.dataset.field;
        if (fieldPath) {
          const attrValue = foundry.utils.getProperty(this.actor, fieldPath);

          if (typeof attrValue === 'object' && attrValue !== null && 'value' in attrValue) {
            rollModifier = parseInt(attrValue.value) || 0;
          } else {
            rollModifier = parseInt(attrValue) || 0;
          }
        }
      }
    }

    const rollType = rollableElement.dataset.rollType || "unknown";

    this._pendingRollType = rollType;
    this._pendingWeaponName = rollName;

    await this._rollTrait(rollName, rollModifier);
  }

  async _onBasicRollableClick(event) {
    event.preventDefault();

    const rollableElement = event.currentTarget;
    const rollableGroup = rollableElement.closest(".basic-rollable-group");
    const rollName = rollableGroup.querySelector(".basic-rollable-name")?.value || "Basic Roll";
    const rollType = rollableElement.dataset.rollType || "damage";

    event.currentTarget.dataset.actorId = this.actor.id;
    event.currentTarget.dataset.weaponName = rollName;
    event.currentTarget.dataset.weaponType = "basic";
    event.currentTarget.dataset.isCritical = "false";

    let damageData = null;
    const damageValueDisplay = rollableGroup.querySelector(".damage-value-display");
    const rollValueInput = rollableGroup.querySelector(".basic-rollable-value");

    if (damageValueDisplay && rollType === "damage") {
      const fieldPath = damageValueDisplay.dataset.field;
      damageData = foundry.utils.getProperty(this.actor, fieldPath) || damageValueDisplay.textContent.trim() || '1d8';

      // Extract weapon slot from field path for modifier filtering
      if (fieldPath && fieldPath.includes('weapon-main')) {
        event.currentTarget.dataset.weaponType = "primary";
      } else if (fieldPath && fieldPath.includes('weapon-off')) {
        event.currentTarget.dataset.weaponType = "secondary";
      }
    } else if (rollValueInput && (rollType === "damage" || rollType === "healing")) {
      damageData = rollValueInput.value.trim() || '1d8';
    } else {

      const rollValue = rollValueInput?.value || '1d8';
      this._pendingRollType = rollType;
      this._pendingWeaponName = rollName;
      await this._rollBasic(rollName, rollValue);
      return;
    }

    if (typeof damageData !== 'object' || damageData === null || !('baseValue' in damageData)) {
      damageData = { baseValue: damageData, modifiers: [], value: damageData };
    }
    event.currentTarget.dataset.weaponDamageStructure = JSON.stringify(damageData);

    await game.daggerheart.damageApplication.rollConsolidatedDamage(event);
  }

  _buildDamageFormulaFromStructure(damageData, proficiency = null) {

    if (this.actor.type === "character" && damageData?.isDynamic && damageData?.baseValue === null) {

      const weaponSlot = this._determineWeaponSlot(damageData);
      if (weaponSlot) {

        const resolvedData = EquipmentHandler.getResolvedWeaponData(this.actor, weaponSlot);
        if (resolvedData && resolvedData.damage) {
          damageData = resolvedData.damage;
        }
      }
    }

    let baseFormula = "";

    if (typeof damageData === 'string') {
      baseFormula = damageData;
    } else if (typeof damageData === 'object' && damageData !== null) {
      baseFormula = damageData.baseValue || damageData.value || "1d8";
    } else {
      baseFormula = "1d8";
    }

    if (globalThis.daggerheart?.EntitySheetHelper) {
      try {
        baseFormula = globalThis.daggerheart.EntitySheetHelper.processInlineReferences(baseFormula, this.actor);
      } catch (error) {
        console.warn("Daggerheart | Error processing inline references in damage formula:", error);

      }
    }

    if (proficiency !== null && baseFormula.includes('@prof')) {
      baseFormula = baseFormula.replace(/@prof/g, proficiency);
    }

    let finalFormula = baseFormula;
    if (typeof damageData === 'object' && damageData !== null && Array.isArray(damageData.modifiers)) {
      const enabledModifiers = damageData.modifiers.filter(mod => mod.enabled !== false);
      if (enabledModifiers.length > 0) {
        const modifierStrings = enabledModifiers.map(mod => mod.value || mod.name || mod).filter(v => v);
        if (modifierStrings.length > 0) {
          finalFormula = `${baseFormula} + ${modifierStrings.join(' + ')}`;
        }
      }
    }

    return finalFormula;
  }

  _determineWeaponSlot(damageData) {

    const primaryWeaponDamage = foundry.utils.getProperty(this.actor, 'system.weapon-main.damage');
    if (primaryWeaponDamage === damageData) {
      return "primary";
    }

    const secondaryWeaponDamage = foundry.utils.getProperty(this.actor, 'system.weapon-off.damage');
    if (secondaryWeaponDamage === damageData) {
      return "secondary";
    }
    return null;
  }

  async _rollBasic(basicName, basicValue) {

    if (this._pendingRollType === "damage") {
      // Try to determine weapon slot from the pending weapon name or basic name
      let weaponSlot = null;
      const weaponName = this._pendingWeaponName || basicName;

      // Check if this is a weapon damage roll by looking at the name or field
      if (weaponName.toLowerCase().includes('primary') || weaponName.toLowerCase().includes('main')) {
        weaponSlot = 'weapon-main';
      } else if (weaponName.toLowerCase().includes('secondary') || weaponName.toLowerCase().includes('off')) {
        weaponSlot = 'weapon-off';
      }

      await game.daggerheart.damageApplication.rollDamageWithDialog(basicValue, {
        sourceActor: this.actor,
        weaponName: weaponName,
        weaponSlot: weaponSlot
      });
    } else if (this._pendingRollType === "healing") {

      await game.daggerheart.damageApplication.rollHealing(basicValue, {
        flavor: `<p class="roll-flavor-line"><b>${basicName}</b></p>`,
        sourceActor: this.actor
      });
    } else {

      await game.daggerheart.rollHandler.quickRoll(basicValue, {
        flavor: basicName,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      });
    }

    this._pendingRollType = null;
    this._pendingWeaponName = null;
  }

  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
    const title = `Roll for ${traitNamePrint}`;
    await game.daggerheart.rollHandler.dualityWithDialog({ title, traitValue, actor: this.actor });
  }

  async handleDualityResult({ isCrit, isFear, isHope }) {
    console.log("Daggerheart | handleDualityResult called but automation is now handled globally");

    return;

  }

  async _applyCriticalSuccess() {

    if (game.paused) {
      console.log("Daggerheart | Critical success effects skipped - game is paused");
      return;
    }

    const updateData = {};

    if (this.actor.type === "character") {

      const currentHope = parseInt(this.actor.system.hope?.value) || 0;
      const maxHope = parseInt(this.actor.system.hope?.max) || 0;
      const newHope = Math.min(maxHope, currentHope + 1);
      updateData["system.hope.value"] = newHope;

      const currentStress = parseInt(this.actor.system.stress?.value) || 0;
      const newStress = Math.max(0, currentStress - 1);
      updateData["system.stress.value"] = newStress;
    } else if (this.actor.type === "npc") {

      const currentStress = parseInt(this.actor.system.stress?.value) || 0;
      const newStress = Math.max(0, currentStress - 1);
      updateData["system.stress.value"] = newStress;
    }

    if (Object.keys(updateData).length > 0) {
      await this.actor.update(updateData);
    }
  }

  async _applyHopeGain() {

    if (game.paused) {
      console.log("Daggerheart | Hope gain skipped - game is paused");
      return;
    }

    if (this.actor.type === "character") {
      const currentHope = parseInt(this.actor.system.hope?.value) || 0;
      const maxHope = parseInt(this.actor.system.hope?.max) || 0;
      const newHope = Math.min(maxHope, currentHope + 1);

      await this.actor.update({
        "system.hope.value": newHope
      });
    }
  }

  async _applyFearGain() {

    if (game.daggerheart?.counter) {
      await game.daggerheart.counter.autoGainFear(1, "duality roll with Fear");
    }
  }

  _getTargetingResults(attackTotal) {

    if (!game.user.targets || game.user.targets.size === 0) {
      return "";
    }

    let targetingText = "";

    for (let target of game.user.targets) {
      const targetActor = target.actor;
      if (!targetActor) continue;

      let defenseValue;
      let defenseName;

      if (targetActor.type === "character") {
        defenseValue = parseInt(targetActor.system.defenses?.evasion?.value) || 0;
        defenseName = "Evasion";
      } else if (targetActor.type === "npc") {
        defenseValue = parseInt(targetActor.system.defenses?.evasion?.value) || 0;
        defenseName = "Difficulty";
      } else {
        continue;
      }

      const isCritical = this.getPendingRollType() === "attack" &&
        (this._lastRollResult?.isCrit || false);

      const hit = isCritical || attackTotal >= defenseValue;

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

      vaultList.removeClass('vault-collapsed');
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      this._vaultOpen = true;
    } else {

      vaultList.addClass('vault-collapsed');
      icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      this._vaultOpen = false;
    }

    await this._saveUiState();
  }

  async _onToggleCategory(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');
    const category = button.data('category'); // Use data-category for NPC
    const dataType = this._getCategoryDataType(category);
    const categoryList = this.element.find(`.item-list[data-location="${dataType}"]`);
    const categoryHeader = button.closest('.tab-category');

    if (!this._categoryStates) {
      this._categoryStates = {};
    }

    if (categoryList.hasClass('category-collapsed')) {
      // Expand category
      categoryList.removeClass('category-collapsed');
      categoryHeader.removeClass('section-collapsed');
      categoryHeader.addClass('section-expanded');
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      this._categoryStates[category] = true;
    } else {
      // Collapse category
      categoryList.addClass('category-collapsed');
      categoryHeader.addClass('section-collapsed');
      categoryHeader.removeClass('section-expanded');
      icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      this._categoryStates[category] = false;
    }

    await this._saveUiState();
  }

  _updateDynamicSpacing(enableTransitions = true) {

    return;
  }

  _disableTransitions() {
    if (this.element) {
      this.element.removeClass('transitions-enabled');

      this.element.addClass('no-transitions');
    }
  }

  _enableTransitions() {
    if (this.element) {

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

    li.classList.toggle("expanded");
  }

  async _onDeathOverlayClick(event) {
    event.preventDefault();

    const characterName = this.actor.name;
    await DaggerheartDialogHelper.showDeathMoveDialog(characterName, this.actor);
  }

  async _onRestClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const restType = button.dataset.restType;
    const characterName = this.actor.name;

    if (restType === 'short') {

      await DaggerheartDialogHelper.showShortRestDialog(characterName, this.actor);
    } else if (restType === 'long') {

      await DaggerheartDialogHelper.showLongRestDialog(characterName, this.actor);
    }
  }

  async _onNavGemClick(event) {
    event.preventDefault();

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

  async _modifyAttributeValue(field, delta) {

    let currentValue = foundry.utils.getProperty(this.actor, field);

    if (typeof currentValue === 'object' && currentValue !== null && 'value' in currentValue) {
      currentValue = parseInt(currentValue.value) || 0;
    } else {
      currentValue = parseInt(currentValue) || 0;
    }

    const newValue = Math.max(0, currentValue + delta);

    const pathParts = field.split('.');
    if (pathParts.length > 2 && pathParts[pathParts.length - 1] === 'value') {

      const attrPath = pathParts.slice(0, -1).join('.');
      const attrData = foundry.utils.getProperty(this.actor, attrPath);

      if (typeof attrData === 'object' && attrData !== null) {

        await this.actor.update({
          [field]: newValue
        });
      } else {

        await this.actor.update({
          [field]: newValue
        });
      }
    } else {

      await this.actor.update({
        [field]: newValue
      });
    }
  }

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

  async _onThresholdClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const hpAmount = parseInt(element.dataset.hpAmount);

    if (!hpAmount || !this.actor.system.health) {
      return;
    }

    await this._addDamage(hpAmount);
  }

  async _addDamage(damage) {
    const currentHP = parseInt(this.actor.system.health.value) || 0;
    const maxHP = parseInt(this.actor.system.health.max) || 0;
    const newHP = Math.max(0, Math.min(maxHP, currentHP + damage));

    await this.actor.update({
      "system.health.value": newHP
    });
  }

  _sortItemsWithWeaponsFirst(items) {
    return items.sort((a, b) => {

      const aIsWeapon = a.type === "weapon" ? 0 : 1;
      const bIsWeapon = b.type === "weapon" ? 0 : 1;

      if (aIsWeapon !== bIsWeapon) {
        return aIsWeapon - bIsWeapon;
      }

      if (a.type === "weapon" && b.type === "weapon") {
        const aEquipped = a.system.equipped ? 0 : 1;
        const bEquipped = b.system.equipped ? 0 : 1;

        if (aEquipped !== bEquipped) {
          return aEquipped - bEquipped;
        }
      }

      return a.name.localeCompare(b.name);
    });
  }

  hasBaseValueRestriction(field) {
    if (!field) return false;

    if (this.actor.type !== "character") return false;

    const isWeaponMainDamage = field.includes('weapon-main.damage');
    const isWeaponOffDamage = field.includes('weapon-off.damage');
    const isWeaponMainToHit = field.includes('weapon-main.to-hit');
    const isWeaponOffToHit = field.includes('weapon-off.to-hit');

    if (!isWeaponMainDamage && !isWeaponOffDamage && !isWeaponMainToHit && !isWeaponOffToHit) {
      return false;
    }

    const { EquipmentHandler } = globalThis.daggerheart || {};
    if (!EquipmentHandler) {
      return false;
    }

    const primaryWeapon = EquipmentHandler.getPrimaryWeapon(this.actor);
    const secondaryWeapon = EquipmentHandler.getSecondaryWeapon(this.actor);

    if ((isWeaponMainDamage || isWeaponMainToHit) && primaryWeapon) {
      return true;
    }

    if ((isWeaponOffDamage || isWeaponOffToHit) && secondaryWeapon) {
      return true;
    }

    return false;
  }

  getBaseValueRestriction(field) {

    if (this.actor.type !== "character") return null;

    if (!this.hasBaseValueRestriction(field)) {
      return null;
    }

    const { EquipmentHandler } = globalThis.daggerheart || {};
    if (!EquipmentHandler) {
      return null;
    }

    const isWeaponMainDamage = field.includes('weapon-main.damage');
    const isWeaponOffDamage = field.includes('weapon-off.damage');
    const isWeaponMainToHit = field.includes('weapon-main.to-hit');
    const isWeaponOffToHit = field.includes('weapon-off.to-hit');

    let weapon = null;
    let restrictedValue = null;
    let reason = "";

    if (isWeaponMainDamage || isWeaponMainToHit) {
      weapon = EquipmentHandler.getPrimaryWeapon(this.actor);
      if (weapon) {
        if (isWeaponMainDamage) {
          restrictedValue = EquipmentHandler.getWeaponTotalDamage(weapon, this.actor);
          reason = `Base damage locked by ${weapon.name}`;
        } else {
          restrictedValue = EquipmentHandler.getWeaponTraitValue(weapon, this.actor);
          reason = `Base attack locked by ${weapon.name}`;
        }
      }
    } else if (isWeaponOffDamage || isWeaponOffToHit) {
      weapon = EquipmentHandler.getSecondaryWeapon(this.actor);
      if (weapon) {
        if (isWeaponOffDamage) {
          restrictedValue = EquipmentHandler.getWeaponTotalDamage(weapon, this.actor);
          reason = `Base damage locked by ${weapon.name}`;
        } else {
          restrictedValue = EquipmentHandler.getWeaponTraitValue(weapon, this.actor);
          reason = `Base attack locked by ${weapon.name}`;
        }
      }
    }

    if (weapon && restrictedValue !== null) {
      return {
        value: restrictedValue,
        editable: false,
        reason: reason,
        weaponName: weapon.name,
        weaponId: weapon.id
      };
    }

    return null;
  }

  async _loadUiState() {
    if (!this.actor) return;
    const uiState = this.actor.getFlag('daggerheart', 'uiState') || {};

    this._vaultOpen = uiState.vaultOpen ?? false;

    const keys = ['class', 'subclass', 'ancestry', 'community', 'abilities', 'worn', 'backpack', 'passives'];
    const defaults = Object.fromEntries(keys.map(k => [k, false]));
    this._categoryStates = Object.assign(defaults, uiState.categoryStates || {});
  }

  async _saveUiState() {
    if (!this.actor) return;
    const data = {
      vaultOpen: this._vaultOpen ?? false,
      categoryStates: this._categoryStates ?? {}
    };
    try {
      await this.actor.setFlag('daggerheart', 'uiState', data);
    } catch (e) {
      console.error('Failed to save UI state', e);
    }
  }

  async _loadCategoryStates() { return this._loadUiState(); }
  async _saveCategoryStates() { return this._saveUiState(); }
  async _loadVaultState() { return this._loadUiState(); }
  async _saveVaultState() { return this._saveUiState(); }
}

export class NPCActorSheet extends SimpleActorSheet {

  static get defaultOptions() {

    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    const maxHeight = Math.floor(screenHeight * 0.85);
    const minHeight = 500;
    const preferredHeight = 840;

    const height = Math.max(minHeight, Math.min(preferredHeight, maxHeight));

    const maxWidth = Math.floor(screenWidth * 0.9);
    const minWidth = 690;
    const preferredWidth = 650;

    const width = Math.max(minWidth, Math.min(preferredWidth, maxWidth));

    // Determine initial tab based on simple adversary setting
    const initialTab = game.settings?.get("daggerheart", "simpleAdversarySheets") ? "simple" : "adversary";

    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "npc"],
      template: "systems/daggerheart/templates/actor-sheet-npc.html",
      width: width,
      height: height,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: initialTab }],
      scrollY: [".biography", ".items", ".attributes"],
      dragDrop: [
        { dragSelector: ".item-list .item", dropSelector: null },
        { dragSelector: ".card", dropSelector: ".domains-section" }
      ]
    });
  }

  async getData(options) {

    const context = await super.getData(options);

    // Generate weapon display data for NPCs similar to character sheets
    context.systemData["weapon-main"] = this._getNPCWeaponData("primary");
    context.systemData["weapon-off"] = this._getNPCWeaponData("secondary");
    context.weaponDisplay = this._getWeaponDisplayData();

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

    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    context.inventoryHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.inventory, {
      secrets: this.document.isOwner,
      async: true
    });

    for (let item of context.data.items) {
      item.system.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, {
        secrets: this.document.isOwner,
        async: true
      });

    }

    context.actor = this.actor;

    const imageLink = context.data.img;
    context.imageStyle = `background: url(${imageLink});`;

    context.uiState = {
      vaultOpen: this._vaultOpen,
      categoryStates: this._categoryStates
    };

    const health = context.systemData.health;
    context.isDying = health && health.value === health.max && health.max > 0;

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.sheetTracker) {
      console.log("Creating new SheetTracker for NPC:", this.actor.name);
      this.sheetTracker = new SheetTracker(this);
    }

    console.log("Initializing SheetTracker for NPC:", this.actor.name);

    setTimeout(async () => {
      try {
        await this.sheetTracker.initialize();
        console.log("SheetTracker initialized successfully for NPC:", this.actor.name);

        // Handle simple adversary sheets
        if (game.settings.get("daggerheart", "simpleAdversarySheets")) {
          this._activateSimpleAdversaryMode(html);
        }
      } catch (error) {
        console.error("Error initializing SheetTracker for NPC:", this.actor.name, error);
      }
    }, 100);

    if (!this.isEditable) return;

    // Basic attribute and group controls
    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));

    // Item management handlers are inherited from parent class
    html.find(".items .rollable").on("click", this._onItemRoll.bind(this));

    // Threshold click handlers for marking HP
    html.find(".threshold-clickable").click(this._onThresholdClick.bind(this));

    // Damage value display click handlers for weapon damage editing
    html.find(".damage-value-display").click(this._onDamageValueClick.bind(this));

    // Category toggle handlers are already bound in parent class

    // Item description toggle handlers are inherited from parent class

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

      let newHeight = 20 + numberOfLineBreaks * 20 + 12 + 2;
      return newHeight;
    }

    let textarea = html.find(".resize-ta");
    textarea.on("keyup", () => {
      textarea.css("height", calcHeight(textarea.val()) + "px");
    });

    // Initialize category states for adversary features
    const categories = ['backpack', 'passives']; // Add 'passives' for NPC
    categories.forEach(category => {
      const categoryList = html.find(`.item-list[data-location="${this._getCategoryDataType(category)}"]`);
      const categoryIcon = html.find(`.category-toggle[data-category="${category}"] i`);
      const categoryHeader = html.find(`.category-toggle[data-category="${category}"]`).closest('.tab-category');

      if (this._categoryStates?.[category]) {
        categoryList.removeClass('category-collapsed');
        categoryHeader.removeClass('section-collapsed');
        categoryHeader.addClass('section-expanded');
        categoryIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      } else {
        categoryList.addClass('category-collapsed');
        categoryHeader.addClass('section-collapsed');
        categoryHeader.removeClass('section-expanded');
        categoryIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      }
    });
  }

  async _onItemControl(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const li = button.closest(".item");
    const item = this.actor.items.get(li?.dataset.itemId);
    const action = button.dataset.action;

    if (item && action === "edit" && button.tagName === 'IMG' && button.classList.contains('item-control')) {
      const itemData = item.system;

      const chatCard = buildItemCardChat({
        itemId: item.id,
        actorId: this.actor.id,
        image: item.img,
        name: item.name,
        category: itemData.category || '',
        rarity: itemData.rarity || '',
        description: itemData.description || ''
      });

      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: chatCard
      });
      return;
    }

    const type = button.dataset.type;
    const location = button.dataset.location;

    switch (button.dataset.action) {
      case "create-item":
        const cls = getDocumentClass("Item");
        return cls.create({
          name: "New Item",
          type: type || "item",
          system: { location: location || "backpack" }
        }, { parent: this.actor });
      case "create":
        const clsOld = getDocumentClass("Item");
        return clsOld.create({ name: game.i18n.localize("SIMPLE.ItemNew"), type: "item" }, { parent: this.actor });
      case "edit":
        if (item) return item.sheet.render(true);
        break;
      case "delete":
        if (item) {
          const confirmResult = await DaggerheartDialogHelper.showDialog({
            title: "Delete Item",
            content: `<p>Are you sure you want to delete <strong>${item.name}</strong>? This cannot be undone.</p>`,
            dialogClass: "confirm-dialog",
            buttons: {
              confirm: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: () => true
              },
              cancel: {
                label: "Cancel",
                callback: () => null
              }
            },
            default: "cancel"
          });
          if (!confirmResult) return;
          return item.delete();
        }
        break;
    }
  }

  async _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));

    await game.daggerheart.rollHandler.quickRoll(button.data('roll'), {
      flavor: `<p class="roll-flavor-line"><b>${item.name}</b> - ${button.text()}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }

  async handleNPCResult({ isCrit }) {
    if (isCrit) {
      await this._applyCriticalSuccess();
    }
  }

  async _rollTrait(traitName, traitValue) {
    const traitNamePrint = traitName.charAt(0).toUpperCase() + traitName.slice(1);
    const title = `Roll for ${traitNamePrint}`;

    await game.daggerheart.rollHandler.npcRollWithDialog({ title, traitValue, actor: this.actor });
  }

  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    if (this.actor.type === "npc") {
      formData["system.isNPC"] = true;
    }
    return formData;
  }

  /**
   * Get NPC weapon data for a specific slot
   * @param {string} slot - Either "primary" or "secondary"
   * @returns {Object} - Weapon data with calculated damage and to-hit
   * @private
   */
  _getNPCWeaponData(slot) {
    const slotKey = slot === "primary" ? "weapon-main" : "weapon-off";
    const currentData = foundry.utils.getProperty(this.actor, `system.${slotKey}`) || {};

    // For NPCs, we use the data directly from the template without equipment system
    return {
      name: currentData.name || "",
      description: currentData.description || "Range | 1H | Trait",
      damage: currentData.damage || {
        baseValue: "1d8",
        modifiers: [],
        value: "1d8"
      },
      "to-hit": currentData["to-hit"] || {
        baseValue: 0,
        modifiers: [],
        value: 0
      },
      range: currentData.range || "",
      modifier: currentData.modifier || "",
      dmgType: currentData.dmgType || ""
    };
  }

  /**
   * Get weapon display data for NPC sheet
   * @returns {Object} Object with primary and secondary weapon data
   * @private
   */
  _getWeaponDisplayData() {
    const primaryData = this._getNPCWeaponData("primary");
    const secondaryData = this._getNPCWeaponData("secondary");

    return {
      primary: {
        name: primaryData.name || "Primary Attack",
        hasWeapon: !!(primaryData.name && typeof primaryData.name === 'string' && primaryData.name.trim()),
        data: primaryData
      },
      secondary: {
        name: secondaryData.name || "Secondary Attack",
        hasWeapon: !!(secondaryData.name && typeof secondaryData.name === 'string' && secondaryData.name.trim()),
        data: secondaryData
      }
    };
  }

  /**
   * Handle rollable click events for NPC attacks
   * @param {Event} event - The click event
   * @private
   */
  async _onRollableClick(event) {
    event.preventDefault();

    const rollableElement = event.currentTarget;
    const weaponBox = rollableElement.closest(".click-rollable-group");

    const rollNameInput = weaponBox.querySelector(".click-rollable-name");
    const rollModifierElement = weaponBox.querySelector(".click-rollable-modifier");

    const rollName = rollNameInput ? rollNameInput.value.trim() : "";
    let rollModifier = 0;

    if (rollModifierElement) {
      rollModifier = parseInt(rollModifierElement.value) || 0;
    }

    const rollType = rollableElement.dataset.rollType || "unknown";

    this._pendingRollType = rollType;
    this._pendingWeaponName = rollName;

    await this._rollTrait(rollName, rollModifier);
  }

  /**
   * Handle basic rollable click events for NPC damage rolls
   * @param {Event} event - The click event
   * @private
   */
  async _onBasicRollableClick(event) {
    event.preventDefault();

    const rollableElement = event.currentTarget;
    const rollableGroup = rollableElement.closest(".basic-rollable-group");
    const rollName = rollableGroup.querySelector(".basic-rollable-name")?.value || "Basic Roll";
    const rollType = rollableElement.dataset.rollType || "damage";

    event.currentTarget.dataset.actorId = this.actor.id;
    event.currentTarget.dataset.weaponName = rollName;
    event.currentTarget.dataset.weaponType = "basic";
    event.currentTarget.dataset.isCritical = "false";

    let damageData = null;
    const damageValueDisplay = rollableGroup.querySelector(".damage-value-display");

    if (damageValueDisplay && rollType === "damage") {
      const fieldPath = damageValueDisplay.dataset.field;
      damageData = foundry.utils.getProperty(this.actor, fieldPath) || damageValueDisplay.textContent.trim() || '1d8';
    }

    if (typeof damageData !== 'object' || damageData === null || !('baseValue' in damageData)) {
      damageData = { baseValue: damageData, modifiers: [], value: damageData };
    }
    event.currentTarget.dataset.weaponDamageStructure = JSON.stringify(damageData);

    await game.daggerheart.damageApplication.rollConsolidatedDamage(event);
  }

  /**
   * Handle threshold click events for marking HP
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

    await this._addDamage(hpAmount);
  }

  /**
   * Add damage to the NPC
   * @param {number} damage - Amount of damage to add
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

  /**
   * Handle damage value display clicks for editing weapon damage
   * @param {Event} event - The click event
   * @private
   */
  async _onDamageValueClick(event) {
    event.preventDefault();
    const displayElement = event.currentTarget;

    const config = {
      field: displayElement.dataset.field,
      label: displayElement.dataset.label,
      type: displayElement.dataset.editType || 'damage',
      hasModifiers: displayElement.dataset.hasModifiers !== 'false',
      min: displayElement.dataset.min ? parseInt(displayElement.dataset.min) : null,
      max: displayElement.dataset.max ? parseInt(displayElement.dataset.max) : null
    };

    if (!config.label) {
      config.label = 'Weapon Damage';
    }

    let damageData = foundry.utils.getProperty(this.actor, config.field);

    if (typeof damageData === 'object' && damageData !== null && 'baseValue' in damageData) {
      const baseValue = damageData.baseValue || '1d8';
      const modifiers = damageData.modifiers || [];

      if (baseValue.includes(' ') && modifiers.length === 0) {
        const match = baseValue.match(/^(\d*d\d+)/);
        if (match) {
          damageData.baseValue = match[1];
          damageData.modifiers = [];
          damageData.value = match[1];
        }
      }
    } else if (typeof damageData === 'object' && damageData !== null && 'value' in damageData) {
      const displayValue = damageData.value || '1d8';
      damageData = {
        baseValue: displayValue,
        modifiers: damageData.modifiers || [],
        value: displayValue
      };
    } else {
      const simpleValue = damageData || '1d8';
      damageData = {
        baseValue: simpleValue,
        modifiers: [],
        value: simpleValue
      };
    }

    if (!Array.isArray(damageData.modifiers)) {
      damageData.modifiers = [];
    }

    config.isFromEquippedWeapon = damageData.isFromEquippedWeapon || false;

    this._showDamageModifierEditPopup(config, damageData, displayElement);
  }

  /**
   * Handle category toggle clicks for adversary features
   * @param {Event} event - The click event
   * @private
   */
  async _onToggleCategory(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const icon = button.find('i');
    const category = button.data('category'); // Use data-category for NPC
    const dataType = this._getCategoryDataType(category);
    const categoryList = this.element.find(`.item-list[data-location="${dataType}"]`);
    const categoryHeader = button.closest('.tab-category');

    if (!this._categoryStates) {
      this._categoryStates = {};
    }

    if (categoryList.hasClass('category-collapsed')) {
      // Expand category
      categoryList.removeClass('category-collapsed');
      categoryHeader.removeClass('section-collapsed');
      categoryHeader.addClass('section-expanded');
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      this._categoryStates[category] = true;
    } else {
      // Collapse category
      categoryList.addClass('category-collapsed');
      categoryHeader.addClass('section-collapsed');
      categoryHeader.removeClass('section-expanded');
      icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      this._categoryStates[category] = false;
    }

    await this._saveUiState();
  }

  /**
   * Handle item description toggle clicks
   * @param {Event} event - The click event
   * @private
   */
  async _onToggleDescription(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const descriptionDiv = li.querySelector(".item-description");

    if (!descriptionDiv) return;

    li.classList.toggle("expanded");
  }

  /**
   * Get category data type mapping
   * @param {string} category - The category name
   * @returns {string} The data type
   * @private
   */
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

  /**
   * Activate simple adversary mode - hide all tabs except simple
   */
  _activateSimpleAdversaryMode(html) {
    // Hide all tab navigation items except simple
    html.find('.sheet-tabs .item').hide();
    html.find('.sheet-tabs .item[data-tab="simple"]').show().addClass('active');

    // Hide all tab content except simple
    html.find('.sheet-body .tab').removeClass('active');
    html.find('.sheet-body .tab[data-tab="simple"]').addClass('active');

    // Weapon content is now shared via partial template - no copying needed

    // Prevent tab switching by disabling click handlers on hidden tabs
    html.find('.sheet-tabs .item:not([data-tab="simple"])').off('click');
  }

  /**
   * Override form submission to deduplicate weapon data from both tabs
   */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);

    // Only apply deduplication if we have weapon data duplicates
    const weaponFields = ['system.weapon-main', 'system.weapon-off'];
    const hasDuplicateWeaponData = weaponFields.some(field => {
      const fieldKeys = Object.keys(formData).filter(key => key.startsWith(field));
      return fieldKeys.length > 0;
    });

    if (!hasDuplicateWeaponData) {
      return formData;
    }

    // Get all form elements
    const form = this.form;
    const formElements = new FormData(form);

    // Create a clean object to store deduplicated data
    const cleanData = {};

    // Process each form field, focusing on weapon data
    for (let [key, value] of formElements.entries()) {
      // For weapon fields, only keep the first occurrence
      if (weaponFields.some(field => key.startsWith(field))) {
        if (!cleanData.hasOwnProperty(key)) {
          cleanData[key] = value;
        }
      } else {
        // For non-weapon fields, use normal processing
        cleanData[key] = value;
      }
    }

    // Convert back to the expected format
    const deduplicatedData = foundry.utils.expandObject(cleanData);

    // Apply entity sheet helper processing
    const processedData = EntitySheetHelper.updateAttributes(deduplicatedData, this.object);
    const finalData = EntitySheetHelper.updateGroups(processedData, this.object);

    return finalData;
  }
}

