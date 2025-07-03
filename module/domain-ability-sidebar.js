import { buildItemCardChat } from "./helper.js";
import { DaggerheartDialogHelper } from "./dialog-helper.js";
export class DomainAbilitySidebar {
  constructor(actorSheet) {
    this.actorSheet = actorSheet;
    this.actor = actorSheet.actor;
    this.sidebarElement = null;
    this.previewTimeout = null;
    this.previewElement = null;
    this.previewPinned = false;
    this.pinnedItemId = null;
  }
  initialize() {
    this.render();
  }
  render() {
    const sheet = this.actorSheet.element;
    if (!sheet || !sheet.length) return;
    sheet.find('.domain-abilities-sidebar').remove();
    const windowContent = sheet.find('.window-content');
    if (windowContent.length === 0) return;
    const buttonsHtml = this._renderAbilityButtons();
    if (!buttonsHtml) return; 
    const sidebarHtml = `<div class="domain-abilities-sidebar">${buttonsHtml}</div>`;
    windowContent.first().append(sidebarHtml);
    this.sidebarElement = sheet.find('.domain-abilities-sidebar');
    this._activateListeners();
  }
  _getDomainAbilityItems() {
    return this.actor.items.filter((item) => {
      const loc = item.system?.location;
      const isAbilityLocation =
        loc === 'abilities' ||
        loc === 'domain' || 
        loc === undefined ||
        loc === null;
      const isDomainType = item.type === 'domain' || item.type === 'item' || item.type === 'ability';
      return isAbilityLocation && isDomainType;
    });
  }
  _renderAbilityButtons() {
    const abilityItems = this._getDomainAbilityItems();
    const maxSlots = 5;
    abilityItems.sort((a, b) => a.name.localeCompare(b.name));
    let html = abilityItems
      .slice(0, maxSlots)
      .map(
        (item) => `
        <div class="domain-ability-button" data-item-id="${item.id}" title="${item.name}">
          <img class="ability-img" src="${item.img}" />
          <div class="ability-overlay">
            <a class="item-control" data-action="edit" title="Edit"><i class="fas fa-edit"></i></a>
            <a class="item-control" data-action="delete" title="Delete"><i class="fas fa-trash"></i></a>
            <a class="item-control" data-action="send-to-vault" title="Send to Vault"><i class="fas fa-arrow-right"></i></a>
          </div>
          <span class="ability-name">${item.name}</span>
        </div>`
      )
      .join('');
    const emptyCount = Math.max(0, maxSlots - abilityItems.length);
    for (let i = 0; i < emptyCount; i++) {
      html += `<div class="domain-ability-slot empty" title="Drag a Domain Ability here"></div>`;
    }
    return html;
  }
  _activateListeners() {
    if (!this.sidebarElement) return;
    this.sidebarElement.on('click', '.item-control', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const action = ev.currentTarget.dataset.action || 'edit';
      const itemId = $(ev.currentTarget).closest('[data-item-id]').data('item-id');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      switch (action) {
        case 'edit':
          if (item) return item.sheet.render(true);
          break;
        case 'delete':
          if (item) {
            const confirmResult = await DaggerheartDialogHelper.showDialog({
              title: 'Delete Ability',
              content: `<p>Are you sure you want to delete <strong>${item.name}</strong> from the sheet? This cannot be undone.</p>`,
              dialogClass: 'confirm-dialog',
              buttons: {
                confirm: {
                  label: 'Delete',
                  icon: '<i class="fas fa-trash"></i>',
                  callback: () => true
                },
                cancel: {
                  label: 'Cancel',
                  callback: () => null
                }
              },
              default: 'cancel'
            });
            if (!confirmResult) break;
            await item.delete();
            this.render();
          }
          break;
        case 'send-to-vault':
          if (item) {
            const confirmResult = await DaggerheartDialogHelper.showDialog({
              title: 'Move to Vault',
              content: `<p>Are you sure you want to move <strong>${item.name}</strong> to the vault?</p>`,
              dialogClass: 'confirm-dialog',
              buttons: {
                confirm: {
                  label: 'Move',
                  icon: '<i class="fas fa-archive"></i>',
                  callback: () => true
                },
                cancel: {
                  label: 'Cancel',
                  callback: () => null
                }
              },
              default: 'cancel'
            });
            if (!confirmResult) break;
            await item.update({ 'system.location': 'vault' });
            this.render();
          }
          break;
      }
    });
    this.sidebarElement.on('click', '.domain-ability-button', async (ev) => {
      if ($(ev.target).closest('.ability-overlay').length) return;
      const itemId = $(ev.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      try {
        const itemData = item.system;
        const chatCard = buildItemCardChat({
          itemId: item.id,
          actorId: this.actor.id,
          image: item.img,
          name: item.name,
          category: itemData.category || '',
          rarity: itemData.rarity || '',
          description: itemData.description || '',
          extraClasses: 'domain-preview-card'
        });
        ChatMessage.create({
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: chatCard
        });
      } catch (err) {
        console.error('Failed to create ability chat card:', err);
      }
    });
    this.sidebarElement.on('mouseenter', '.domain-ability-button', (ev) => {
      const buttonEl = ev.currentTarget;
      const hoveredItemId = $(buttonEl).data('item-id');
      if (this.previewPinned && hoveredItemId !== this.pinnedItemId) {
        this._unpinPreview();
      }
      clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => {
        this._showPreview(buttonEl);
      }, 350);
    });
    this.sidebarElement.on('mouseleave', '.domain-ability-button', () => {
      clearTimeout(this.previewTimeout);
      if (!this.previewPinned) this._hidePreview();
    });
    this.sidebarElement.on('mousedown', '.domain-ability-button', (ev) => {
      if (ev.which !== 2) return;
      ev.preventDefault();
      ev.stopPropagation();
      const buttonEl = ev.currentTarget;
      if (this.previewPinned) {
        this._unpinPreview();
      } else {
        const itemId = $(buttonEl).data('item-id');
        if (!this.previewElement || !this.previewElement.hasClass('show') || this.pinnedItemId !== itemId) {
          clearTimeout(this.previewTimeout);
          this._showPreview(buttonEl);
        }
        this._pinPreview();
      }
    });
    this.sidebarElement.on('dragover', '.domain-ability-slot.empty, .domain-abilities-sidebar', (ev) => {
      ev.preventDefault();
      $(ev.currentTarget).addClass('drag-over');
    });
    this.sidebarElement.on('dragleave', '.domain-ability-slot.empty, .domain-abilities-sidebar', (ev) => {
      $(ev.currentTarget).removeClass('drag-over');
    });
    this.sidebarElement.on('drop', '.domain-ability-slot.empty, .domain-abilities-sidebar', async (ev) => {
      ev.preventDefault();
      $(ev.currentTarget).removeClass('drag-over');
      await this._handleDrop(ev);
    });
  }
  async _showPreview(buttonEl) {
    const itemId = $(buttonEl).data('item-id');
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const itemData = item.system;
    const description = await TextEditor.enrichHTML(itemData.description, { secrets: this.actor.isOwner, async: true });
    const cardHtml = buildItemCardChat({
      itemId: item.id,
      image: item.img,
      name: item.name,
      category: itemData.category || '',
      rarity: itemData.rarity || '',
      description,
      extraClasses: 'domain-preview-card'
    });
    const hintHtml = `<div class="preview-hint"><i class="fas fa-mouse"></i> Middle-click to pin</div>`;
    const fullHtml = cardHtml + hintHtml;
    if (!this.previewElement) {
      this.previewElement = $('<div class="domain-ability-preview"></div>').appendTo('body');
    }
    this.previewElement.html(fullHtml);
    const rect = buttonEl.getBoundingClientRect();
    this._anchorRect = rect;
    const previewRect = this.previewElement[0].getBoundingClientRect();
    let left = rect.right + 12;
    let top = rect.top + (rect.height/2) - (previewRect.height/2);
    if (left + previewRect.width > window.innerWidth - 10) left = rect.left - previewRect.width - 12;
    if (top < 10) top = 10;
    if (top + previewRect.height > window.innerHeight - 10) top = window.innerHeight - previewRect.height - 10;
    this.previewElement.css({ left: left + 'px', top: top + 'px' }).addClass('show');
    this.previewElement.attr('data-item-id', item.id);
  }
  _hidePreview() {
    if (this.previewElement) {
      this.previewElement.removeClass('show pinned');
      this.previewElement.css('pointer-events', 'none');
    }
  }
  _pinPreview() {
    if (!this.previewElement) return;
    this.previewPinned = true;
    this.pinnedItemId = this.previewElement.attr('data-item-id');
    this.previewElement.addClass('pinned');
    this.previewElement.css('pointer-events', 'auto');
    this.previewElement.find('.preview-hint').html('<i class="fas fa-mouse"></i> Middle-click to unpin');
    const oldRect = this.previewElement[0].getBoundingClientRect();
    const newRect = this.previewElement[0].getBoundingClientRect();
    const dx = (newRect.width - oldRect.width) / 2;
    const dy = (newRect.height - oldRect.height) / 2;
    const newLeft = parseFloat(this.previewElement.css('left')) - dx;
    const newTop = parseFloat(this.previewElement.css('top')) - dy;
    this.previewElement.css({ left: `${newLeft}px`, top: `${newTop}px` });
    const offHandler = (ev) => {
      if ($(ev.target).closest('.domain-ability-preview').length) return;
      this._unpinPreview();
    };
    $(document).on('mousedown.domainPreview', offHandler);
  }
  _unpinPreview() {
    this.previewPinned = false;
    this.pinnedItemId = null;
    $(document).off('mousedown.domainPreview');
    this._hidePreview();
  }
  async _handleDrop(event) {
    const dragEvent = event.originalEvent ?? event;
    if (this._getDomainAbilityItems().length >= 5) {
      ui.notifications?.warn('Maximum of 5 Domain Abilities reached.');
      return false;
    }
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(dragEvent);
    if (data.type !== 'Item') return false;
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;
    if (this.actor.items.has(item.id)) {
      const existing = this.actor.items.get(item.id);
      await existing.update({ 'system.location': 'domain' });
      this.render();
      return true;
    }
    const newItemData = duplicate(item.toObject());
    newItemData.system = newItemData.system || {};
    newItemData.system.location = 'domain';
    await this.actor.createEmbeddedDocuments('Item', [newItemData]);
    this.render();
    return true;
  }
} 
