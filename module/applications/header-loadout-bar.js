import { buildItemCardChat } from "../helpers/helper.js";
import { DaggerheartDialogHelper } from "../helpers/dialog-helper.js";

export class HeaderLoadoutBar {
  constructor(actorSheet) {
    this.actorSheet = actorSheet;
    this.actor = actorSheet.actor;
    this.container = null;
    this.slotTypes = [
      { key: 'class', label: 'Class' },
      { key: 'subclass', label: 'Subclass' },
      { key: 'ancestry', label: 'Ancestry' },
      { key: 'community', label: 'Community' }
    ];
    this.previewTimeout = null;
    this.previewElement = null;
    this.previewPinned = false;
    this.pinnedItemId = null;
  }

  initialize() {
    this.render();
  }

  _findContainer() {
    if (!this.actorSheet.element?.length) return null;
    const cont = this.actorSheet.element.find('.header-loadout-bar');
    return cont.length ? cont : null;
  }

  render() {
    this.container = this._findContainer();
    if (!this.container) return;

    const html = this.slotTypes.map(t => this._buildSlotHTML(t)).join('');
    this.container.html(html);

    this._activateListeners();
  }

  _getItemForType(typeKey) {
    return this.actor.items.find(i => (i.system?.location ?? i.type) === typeKey);
  }

  _buildSlotHTML(slot) {
    const item = this._getItemForType(slot.key);
    if (item) {
      return `
      <div class="loadout-card-slot" data-slot-type="${slot.key}" data-item-id="${item.id}" title="${item.name}">
        <img class="slot-img" src="${item.img}" />
        <div class="slot-overlay">
          <a class="slot-control" data-action="edit" title="Edit"><i class="fas fa-edit"></i></a>
          <a class="slot-control" data-action="delete" title="Delete"><i class="fas fa-trash"></i></a>
        </div>
        <span class="slot-name">${item.name}</span>
      </div>`;
    }
    return `<div class="loadout-card-slot empty" data-slot-type="${slot.key}" title="Drag ${slot.label} card here">
      <span class="slot-placeholder">${slot.label}</span>
    </div>`;
  }

  _activateListeners() {
    if (!this.container) return;

    this.container.on('click', '.slot-control', async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const action = ev.currentTarget.dataset.action;
      const wrapper = $(ev.currentTarget).closest('.loadout-card-slot');
      const item = this.actor.items.get(wrapper.data('item-id'));
      if (!item) return;
      switch(action) {
        case 'edit':
          return item.sheet.render(true);
        case 'delete': {
          const confirmResult = await DaggerheartDialogHelper.showDialog({
            title: 'Delete Item',
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
          if (!confirmResult) return;
          await item.delete();
          return this.render();
        }
      }
    });

    this.container.on('dragover', '.loadout-card-slot', ev => { ev.preventDefault(); $(ev.currentTarget).addClass('drag-over'); });
    this.container.on('dragleave', '.loadout-card-slot', ev => { $(ev.currentTarget).removeClass('drag-over'); });
    this.container.on('drop', '.loadout-card-slot', async ev => {
      ev.preventDefault();
      const slotEl = $(ev.currentTarget);
      slotEl.removeClass('drag-over');
      const typeKey = slotEl.data('slot-type');
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev.originalEvent ?? ev);
      if (data.type !== 'Item') return;
      const item = await Item.implementation.fromDropData(data);
      if (!item) return;

      if (this.actor.items.has(item.id)) {
        await this.actor.items.get(item.id).update({ 'system.location': typeKey });
      } else {

        const toCreate = duplicate(item.toObject());
        toCreate.system = toCreate.system || {};
        toCreate.system.location = typeKey;
        await this.actor.createEmbeddedDocuments('Item', [toCreate]);
      }
      this.render();
    });

    this.container.on('mouseenter', '.loadout-card-slot:not(.empty)', (ev) => {
      const el = ev.currentTarget;
      const hoveredItemId = $(el).data('item-id');
      if (this.previewPinned && hoveredItemId !== this.pinnedItemId) {
        this._unpinPreview();
      }
      clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => this._showPreview(el), 350);
    });
    this.container.on('mouseleave', '.loadout-card-slot:not(.empty)', () => {
      clearTimeout(this.previewTimeout);
      if (!this.previewPinned) this._hidePreview();
    });

    this.container.on('click', '.loadout-card-slot:not(.empty)', async (ev) => {
      if ($(ev.target).closest('.slot-control').length) return; 
      const itemId = $(ev.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      await this._postToChat(item);
    });

    this.container.on('mousedown', '.loadout-card-slot:not(.empty)', (ev) => {
      if (ev.which !== 2) return;
      ev.preventDefault();
      ev.stopPropagation();

      const slotEl = ev.currentTarget;
      if (this.previewPinned) {
        this._unpinPreview();
      } else {
        const itemId = $(slotEl).data('item-id');
        if (!this.previewElement || !this.previewElement.hasClass('show') || this.pinnedItemId !== itemId) {
          clearTimeout(this.previewTimeout);
          this._showPreview(slotEl);
        }
        this._pinPreview();
      }
    });
  }

  async _postToChat(item) {
    const itemData = item.system;

    const chatCard = buildItemCardChat({
      itemId: item.id,
      actorId: this.actor.id,
      image: item.img,
      name: item.name,
      category: itemData.category || '',
      rarity: itemData.rarity || '',
      description: itemData.description || '',
      itemType: item.type,
      system: item.system
    });
    ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: chatCard });
  }

  async _showPreview(el) {
    const itemId = $(el).data('item-id');
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
      extraClasses: 'domain-preview-card',
      itemType: item.type,
      system: item.system
    });
    const hintHtml = `<div class="preview-hint"><i class="fas fa-mouse"></i> Middle-click to pin</div>`;
    const fullHtml = cardHtml + hintHtml;
    if (!this.previewElement) this.previewElement = $('<div class="domain-ability-preview"></div>').appendTo('body');
    this.previewElement.html(fullHtml);
    this.previewElement.attr('data-item-id', item.id);
    const rect = el.getBoundingClientRect();
    this._anchorRect = rect;
    const previewRect = this.previewElement[0].getBoundingClientRect();
    let left = rect.left + (rect.width/2) - (previewRect.width/2);
    let top = rect.bottom + 8;
    if (left < 10) left = 10;
    if (left + previewRect.width > window.innerWidth - 10) left = window.innerWidth - previewRect.width - 10;
    if (top + previewRect.height > window.innerHeight - 10) top = rect.top - previewRect.height - 8;
    if (top < 10) top = 10;
    this.previewElement.css({ left:left+'px', top:top+'px' }).addClass('show');
  }

  _hidePreview() {
    if (!this.previewElement) return;
    this.previewElement.removeClass('show pinned');
    this.previewElement.css('pointer-events', 'none');
  }

  _pinPreview() {
    if (!this.previewElement) return;
    this.previewPinned = true;
    this.pinnedItemId = this.previewElement.attr('data-item-id');
    this.previewElement.addClass('pinned');
    this.previewElement.css('pointer-events', 'auto');

    this.previewElement.find('.preview-hint').html('<i class="fas fa-mouse"></i> Middle-click to unpin');

    const old = this.previewElement[0].getBoundingClientRect();
    const updated = this.previewElement[0].getBoundingClientRect();
    const dx = (updated.width - old.width) / 2;
    const dy = (updated.height - old.height) / 2;
    const leftPos = parseFloat(this.previewElement.css('left')) - dx;
    const topPos = parseFloat(this.previewElement.css('top')) - dy;
    this.previewElement.css({ left: `${leftPos}px`, top: `${topPos}px` });

    const offHandler = (ev) => {
      if ($(ev.target).closest('.domain-ability-preview').length) return;
      this._unpinPreview();
    };
    $(document).on('mousedown.loadoutPreview', offHandler);
  }

  _unpinPreview() {
    this.previewPinned = false;
    this.pinnedItemId = null;
    $(document).off('mousedown.loadoutPreview');
    this._hidePreview();
  }
}