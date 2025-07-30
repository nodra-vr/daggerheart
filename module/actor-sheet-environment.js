import { SimpleActorSheet } from "./actor-sheet.js";

export class EnvironmentActorSheet extends SimpleActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["daggerheart", "sheet", "environment"],
      template: "systems/daggerheart/templates/actor-sheet-environment.html",
      width: 750,
      height: 850,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "actions" }],
      dragDrop: [
        { dragSelector: ".item-list .item", dropSelector: null },
        { dragSelector: ".card", dropSelector: ".domains-section" }
      ]
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.systemData = context.data.system;
    context.actor = this.actor;
    
    // Initialize UI state for environment sheet
    if (!context.uiState) {
      context.uiState = {};
    }
    if (!context.uiState.categoryStates) {
      context.uiState.categoryStates = {};
    }
    
    // Get category states from flags with defaults
    context.uiState.categoryStates.actions = this.actor.getFlag('daggerheart', 'uiState.categoryStates.actions') !== false;
    context.uiState.categoryStates.adversaries = this.actor.getFlag('daggerheart', 'uiState.categoryStates.adversaries') !== false;
    
    // Prepare notes HTML for the editor
    context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.systemData.notes, {
      secrets: this.document.isOwner,
      async: true
    });
    
    context.adversaries = [];
    if (this.actor.system.potentialAdversaries) {
      for (const adversaryRef of this.actor.system.potentialAdversaries) {
        try {
          const actor = await fromUuid(adversaryRef.uuid);
          if (actor) {
            const adversaryData = actor.toObject();
            adversaryData.uuid = adversaryRef.uuid; // Preserve the UUID for drag operations
            adversaryData.system.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
              adversaryData.system.description || "", 
              { secrets: this.actor.isOwner, async: true }
            );
            context.adversaries.push(adversaryData);
          }
        } catch (error) {
          console.warn(`Failed to load adversary ${adversaryRef.uuid}:`, error);
        }
      }
    }
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.adversary-control').click(this._onAdversaryControl.bind(this));
    html.find('.category-toggle').click(this._onToggleCategory.bind(this));
    
    // Initialize category states
    this._initializeCategoryStates(html);
    
    // Setup drag listeners for adversary slots
    this._setupAdversaryDragListeners(html);
    
    // Setup drop listeners for adversaries grid
    this._setupAdversaryDropListeners(html);
  }


  async _onAdversaryControl(event) {
    event.preventDefault();
    event.stopPropagation();
    const action = event.currentTarget.dataset.action;
    const actorId = event.currentTarget.closest('.adversary-slot').dataset.actorId;

    if (action === "edit") {
      const actor = await fromUuid(`Actor.${actorId}`);
      if (actor) {
        actor.sheet.render(true);
      }
    } else if (action === "delete") {
      await this._removeAdversary(actorId);
    }
  }





  async _addAdversary(actor) {
    const adversaries = this.actor.system.potentialAdversaries || [];
    
    // Check if adversary already exists
    const existingAdversary = adversaries.find(adv => adv.uuid === actor.uuid);
    if (existingAdversary) {
      ui.notifications.warn(`${actor.name} is already in the potential adversaries list.`);
      return;
    }
    
    adversaries.push({
      uuid: actor.uuid,
      name: actor.name,
      img: actor.img
    });
    
    await this.actor.update({
      "system.potentialAdversaries": adversaries
    });
    
    ui.notifications.info(`${actor.name} added to potential adversaries.`);
  }

  async _removeAdversary(actorId) {
    const adversaries = this.actor.system.potentialAdversaries || [];
    const adversaryToRemove = adversaries.find(adv => adv.uuid.includes(actorId));
    const updatedAdversaries = adversaries.filter(adv => !adv.uuid.includes(actorId));
    
    await this.actor.update({
      "system.potentialAdversaries": updatedAdversaries
    });
    
    if (adversaryToRemove) {
      ui.notifications.info(`${adversaryToRemove.name} removed from potential adversaries.`);
    }
  }



  _initializeCategoryStates(html) {
    const categories = ['actions', 'adversaries'];
    categories.forEach(category => {
      const categoryList = html.find(`.item-list[data-location="${category}"], .adversaries-grid[data-location="${category}"]`);
      const categoryIcon = html.find(`.category-toggle[data-category="${category}"] i`);
      const categoryHeader = html.find(`.category-toggle[data-category="${category}"]`).closest('.tab-category');

      if (this.actor.getFlag('daggerheart', `uiState.categoryStates.${category}`) !== false) {
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

  async _onToggleCategory(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const icon = button.querySelector('i');
    const category = button.dataset.category;
    const categoryList = this.element.find(`.item-list[data-location="${category}"], .adversaries-grid[data-location="${category}"]`);
    const categoryHeader = button.closest('.tab-category');

    const isCollapsed = categoryList.hasClass('category-collapsed');
    
    if (isCollapsed) {
      // Expand category
      categoryList.removeClass('category-collapsed');
      categoryHeader.classList.remove('section-collapsed');
      categoryHeader.classList.add('section-expanded');
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-up');
      await this.actor.setFlag('daggerheart', `uiState.categoryStates.${category}`, true);
    } else {
      // Collapse category
      categoryList.addClass('category-collapsed');
      categoryHeader.classList.add('section-collapsed');
      categoryHeader.classList.remove('section-expanded');
      icon.classList.remove('fa-chevron-up');
      icon.classList.add('fa-chevron-down');
      await this.actor.setFlag('daggerheart', `uiState.categoryStates.${category}`, false);
    }
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

  _setupAdversaryDragListeners(html) {
    html.find('.adversary-slot:not(.empty-slot)').each((i, el) => {
      const slot = $(el);
      const actorId = slot.data('actor-id');
      const uuid = slot.data('document-uuid');
      
      if (uuid) {
        slot[0].setAttribute('draggable', true);
        slot[0].addEventListener('dragstart', (event) => {
          const actor = game.actors.get(actorId);
          if (actor) {
            const dragData = {
              type: 'Actor',
              uuid: uuid,
              id: actorId
            };
            event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            event.dataTransfer.effectAllowed = 'move';
          }
        });
      }
    });
  }

  _setupAdversaryDragListeners(html) {
    html.find('.adversary-slot:not(.empty-slot)').each((i, el) => {
      const slot = $(el);
      const actorId = slot.data('actor-id');
      const uuid = slot.data('document-uuid');
      
      if (uuid) {
        slot[0].setAttribute('draggable', true);
        slot[0].addEventListener('dragstart', (event) => {
          const actor = game.actors.get(actorId);
          if (actor) {
            const dragData = {
              type: 'Actor',
              uuid: uuid,
              id: actorId,
              name: actor.name,
              img: actor.img
            };
            event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            event.dataTransfer.setData('application/json', JSON.stringify(dragData));
          }
        });
      }
    });
  }

  _setupAdversaryDropListeners(html) {
    const adversariesGrid = html.find('.adversaries-grid');
    
    adversariesGrid.on('dragover', (event) => {
      event.preventDefault();
      adversariesGrid.addClass('drag-over');
    });
    
    adversariesGrid.on('dragleave', (event) => {
      if (!adversariesGrid[0].contains(event.relatedTarget)) {
        adversariesGrid.removeClass('drag-over');
      }
    });
    
    adversariesGrid.on('drop', async (event) => {
      event.preventDefault();
      adversariesGrid.removeClass('drag-over');
      
      try {
        const data = event.originalEvent?.dataTransfer?.getData('text/plain');
        if (data) {
          const dragData = JSON.parse(data);
          if (dragData.type === 'Actor') {
            const actor = await fromUuid(dragData.uuid);
            if (actor && (actor.type === 'npc' || actor.type === 'companion')) {
              await this._addAdversary(actor);
            } else if (actor) {
              ui.notifications.warn('Only NPCs and Companions can be added as potential adversaries.');
            }
          }
        }
      } catch (error) {
        console.error('Error handling drop:', error);
      }
    });
  }

  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    if (this.actor.type === "environment") {
      formData["system.isEnvironment"] = true;
    }
    return formData;
  }
} 