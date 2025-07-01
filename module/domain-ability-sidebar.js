// DomainAbilitySidebar: Adds a left-side icon bar displaying an actor's Domain Ability items
// This is intentionally simple at first – it duplicates the existing list of items that appear
// in the Loadout > Domain Abilities section, but presents them as icon-only buttons docked to
// the left side of the sheet (mirroring the Sheet Tracker which sits on the right).

export class DomainAbilitySidebar {
  constructor(actorSheet) {
    this.actorSheet = actorSheet;
    this.actor = actorSheet.actor;
    this.sidebarElement = null;
    this.previewTimeout = null;
    this.previewElement = null;
  }

  /** Re-creates the sidebar every time the sheet renders */
  initialize() {
    this.render();
  }

  /** Build and insert the sidebar DOM */
  render() {
    const sheet = this.actorSheet.element;
    if (!sheet || !sheet.length) return;

    // Remove any previous instance to avoid duplicates on re-render
    sheet.find('.domain-abilities-sidebar').remove();

    const windowContent = sheet.find('.window-content');
    if (windowContent.length === 0) return;

    // Build buttons for every relevant ability item
    const buttonsHtml = this._renderAbilityButtons();
    if (!buttonsHtml) return; // Nothing to display

    const sidebarHtml = `<div class="domain-abilities-sidebar">${buttonsHtml}</div>`;

    // Append to the FIRST window-content element so it stays inside the sheet chrome
    windowContent.first().append(sidebarHtml);

    this.sidebarElement = sheet.find('.domain-abilities-sidebar');
    this._activateListeners();
  }

  /** Pull Domain Ability items from the actor */
  _getDomainAbilityItems() {
    return this.actor.items.filter((item) => {
      const loc = item.system?.location;
      const isAbilityLocation = loc === 'abilities' || loc === undefined || loc === null;
      const isDomainType = item.type === 'domain' || item.type === 'item';
      return isAbilityLocation && isDomainType;
    });
  }

  /** Produce HTML for each button */
  _renderAbilityButtons() {
    const abilityItems = this._getDomainAbilityItems();
    // Limit to 5 display slots
    const maxSlots = 5;

    // Sort alphabetically
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

    // Add empty slots up to max
    const emptyCount = Math.max(0, maxSlots - abilityItems.length);
    for (let i = 0; i < emptyCount; i++) {
      html += `<div class="domain-ability-slot empty" title="Drag a Domain Ability here"></div>`;
    }

    return html;
  }

  /** Wire up click handlers */
  _activateListeners() {
    if (!this.sidebarElement) return;

    // Edit / delete buttons inside overlay
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
            await item.delete();
            this.render();
          }
          break;
        case 'send-to-vault':
          if (item) {
            await item.update({ 'system.location': 'vault' });
            this.render();
          }
          break;
      }
    });

    // Click on the main button/image to post the item to chat
    this.sidebarElement.on('click', '.domain-ability-button', async (ev) => {
      // Ignore clicks that originated on overlay controls
      if ($(ev.target).closest('.ability-overlay').length) return;

      const itemId = $(ev.currentTarget).data('item-id');
      const item = this.actor.items.get(itemId);
      if (!item) return;

      // Post to chat – use Foundry's built-in method if available
      try {
        const itemData = item.system;
        const description = await TextEditor.enrichHTML(itemData.description, { secrets: this.actor.isOwner, async: true });

        const chatCard = `
        <div class="item-card-chat" data-item-id="${item.id}" data-actor-id="${this.actor.id}">
          <div class="card-image-container" style="background-image: url('${item.img}')">
            <div class="card-header-text"><h3>${item.name}</h3></div>
          </div>
          <div class="card-content">
            <div class="card-subtitle"><span>${itemData.category || ''} - ${itemData.rarity || ''}</span></div>
            <div class="card-description">${description}</div>
          </div>
        </div>`;

        ChatMessage.create({
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: chatCard
        });
      } catch (err) {
        console.error('Failed to create ability chat card:', err);
      }
    });

    // Hover preview (350 ms delay)
    this.sidebarElement.on('mouseenter', '.domain-ability-button', (ev) => {
      const buttonEl = ev.currentTarget;
      // Prevent multiple timers
      clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => {
        this._showPreview(buttonEl);
      }, 350);
    });

    this.sidebarElement.on('mouseleave', '.domain-ability-button', () => {
      clearTimeout(this.previewTimeout);
      this._hidePreview();
    });

    // Drag & Drop handlers for adding abilities
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

  /** Build and display preview card near the button */
  async _showPreview(buttonEl) {
    const itemId = $(buttonEl).data('item-id');
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Generate HTML card (same as chat)
    const itemData = item.system;
    const description = await TextEditor.enrichHTML(itemData.description, { secrets: this.actor.isOwner, async: true });
    const cardHtml = `
      <div class="item-card-chat domain-preview-card" data-item-id="${item.id}">
        <div class="card-image-container" style="background-image: url('${item.img}')">
          <div class="card-header-text"><h3>${item.name}</h3></div>
        </div>
        <div class="card-content">
          <div class="card-subtitle"><span>${itemData.category || ''} - ${itemData.rarity || ''}</span></div>
          <div class="card-description">${description}</div>
        </div>
      </div>`;

    // If preview element exists update, else create
    if (!this.previewElement) {
      this.previewElement = $('<div class="domain-ability-preview"></div>').appendTo('body');
    }
    this.previewElement.html(cardHtml);

    // Position: to the right of sidebar button (or at cursor)
    const rect = buttonEl.getBoundingClientRect();
    const previewRect = this.previewElement[0].getBoundingClientRect();
    let left = rect.right + 12;
    let top = rect.top + (rect.height/2) - (previewRect.height/2);

    // keep on screen
    if (left + previewRect.width > window.innerWidth - 10) left = rect.left - previewRect.width - 12;
    if (top < 10) top = 10;
    if (top + previewRect.height > window.innerHeight - 10) top = window.innerHeight - previewRect.height - 10;

    this.previewElement.css({ left: left + 'px', top: top + 'px' }).addClass('show');
  }

  _hidePreview() {
    if (this.previewElement) {
      this.previewElement.removeClass('show');
    }
  }

  /** Handle item drops to add new domain ability */
  async _handleDrop(event) {
    const dragEvent = event.originalEvent ?? event;
    // Respect max slots
    if (this._getDomainAbilityItems().length >= 5) {
      ui.notifications?.warn('Maximum of 5 Domain Abilities reached.');
      return false;
    }

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(dragEvent);
    if (data.type !== 'Item') return false;

    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;

    // If same actor already has item
    if (this.actor.items.has(item.id)) {
      const existing = this.actor.items.get(item.id);
      // Update location to abilities if not already
      await existing.update({ 'system.location': 'abilities' });
      this.render();
      return true;
    }

    // Otherwise create a copy on the actor with location abilities
    const newItemData = duplicate(item.toObject());
    newItemData.system = newItemData.system || {};
    newItemData.system.location = 'abilities';

    await this.actor.createEmbeddedDocuments('Item', [newItemData]);
    this.render();
    return true;
  }
} 