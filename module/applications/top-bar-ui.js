import { buildItemCardChat } from "../helpers/helper.js";

export class TopBarUI {
  constructor() {
    this.element = null;
    this._onActionsClick = null;
    this._onEnvironmentClick = null;
    this._onAdversariesClick = null;
    this._onSettingChange = null;
  }

  async initialize() {
    await this.render();
    this.activateListeners();
    this._onSettingChange = (setting) => {
      if (setting.key === "daggerheart.activeEnvironment") this._refreshActiveEnvironment();
    };
    Hooks.on("updateSetting", this._onSettingChange);
  }

  async render() {
    this.cleanupListeners();
    if (this.element) {
      this.element.remove();
    }

    const html = `
      <div id="top-bar-ui" class="top-bar-ui">
        <div class="top-bar-content">
          <div class="top-bar-section top-bar-section--actions" tabindex="0">
            <div class="top-bar-section-header">Actions</div>
            <div class="top-bar-section-body actions-body"></div>
          </div>
          <div class="top-bar-section top-bar-section--environment" tabindex="0">
            <div class="env-bg"></div>
            <div class="top-bar-section-header"><span class="env-title">Environment</span><button type="button" class="env-unset" title="Unset" aria-label="Unset" style="display:none;">✕</button></div>
            <div class="top-bar-section-body environment-body"></div>
          </div>
          <div class="top-bar-section top-bar-section--adversaries" tabindex="0">
            <div class="top-bar-section-header">Adversaries</div>
            <div class="top-bar-section-body adversaries-body"></div>
          </div>
        </div>
      </div>`;

    let topBarWrapper = document.getElementById("top-bar-wrapper");
    if (!topBarWrapper) {
      const wrapperHtml = '<div id="top-bar-wrapper" class="top-bar-wrapper"></div>';

      const uiTop = document.getElementById("ui-top");
      if (!uiTop) {
        console.error("Could not find ui-top element");
        return;
      }

      uiTop.insertAdjacentHTML("afterbegin", wrapperHtml);
      topBarWrapper = document.getElementById("top-bar-wrapper");
    }

    topBarWrapper.innerHTML = html;
    this.element = document.getElementById("top-bar-ui");
    await this._refreshActiveEnvironment();
  }

  activateListeners() {
    if (!this.element) return;

    this.cleanupListeners();

    const actions = this.element.querySelector('.top-bar-section--actions');
    const environment = this.element.querySelector('.top-bar-section--environment');
    const adversaries = this.element.querySelector('.top-bar-section--adversaries');

    if (actions) {
      this._onActionsClick = () => console.log('Top Bar: Actions');
      actions.addEventListener('click', this._onActionsClick);
    }

    if (environment) {
      this._onEnvironmentClick = () => console.log('Top Bar: Environment');
      environment.addEventListener('click', this._onEnvironmentClick);

      environment.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        environment.classList.add('drag-over');
      });
      environment.addEventListener('dragleave', (ev) => {
        if (!environment.contains(ev.relatedTarget)) environment.classList.remove('drag-over');
      });
      environment.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        environment.classList.remove('drag-over');
        try {
          const dragEvent = ev.originalEvent ?? ev;
          const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(dragEvent);
          if (data?.type === 'Actor') {
            const actor = await fromUuid(data.uuid);
            if (actor?.type === 'environment') {
              await game.settings.set('daggerheart', 'activeEnvironment', data.uuid);
              await this._refreshActiveEnvironment();
            } else if (actor) {
              ui.notifications?.warn('Only Environment actors can be set as active.');
            }
          }
        } catch (e) {
          console.error('TopBarUI drop error', e);
        }
      });

      const unsetBtn = environment.querySelector('.env-unset');
      if (unsetBtn) {
        unsetBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await game.settings.set('daggerheart', 'activeEnvironment', '');
          await this._refreshActiveEnvironment();
        });
      }
    }

    if (adversaries) {
      this._onAdversariesClick = () => console.log('Top Bar: Adversaries');
      adversaries.addEventListener('click', this._onAdversariesClick);
    }
  }

  cleanupListeners() {
    if (this.element) {
      const actions = this.element.querySelector('.top-bar-section--actions');
      const environment = this.element.querySelector('.top-bar-section--environment');
      const adversaries = this.element.querySelector('.top-bar-section--adversaries');
      if (actions && this._onActionsClick) actions.removeEventListener('click', this._onActionsClick);
      if (environment && this._onEnvironmentClick) environment.removeEventListener('click', this._onEnvironmentClick);
      if (adversaries && this._onAdversariesClick) adversaries.removeEventListener('click', this._onAdversariesClick);
    }
  }

  async _refreshActiveEnvironment() {
    if (!this.element) return;
    const envSec = this.element.querySelector('.top-bar-section--environment');
    const titleEl = envSec?.querySelector('.env-title');
    const unsetBtn = envSec?.querySelector('.env-unset');
    const bgEl = envSec?.querySelector('.env-bg');
    const envBody = envSec?.querySelector('.environment-body');
    const actionsBody = this.element.querySelector('.actions-body');
    const adversariesBody = this.element.querySelector('.adversaries-body');

    if (!envSec || !titleEl || !unsetBtn || !bgEl || !envBody || !actionsBody || !adversariesBody) return;

    const uuid = game.settings.get('daggerheart', 'activeEnvironment') || '';
    if (!uuid) {
      titleEl.textContent = 'Environment';
      unsetBtn.style.display = 'none';
      bgEl.style.backgroundImage = '';
      envBody.innerHTML = '';
      actionsBody.innerHTML = '';
      adversariesBody.innerHTML = '';
      return;
    }

    try {
      const actor = await fromUuid(uuid);
      titleEl.textContent = actor?.name || 'Environment';
      unsetBtn.style.display = 'inline-flex';
      bgEl.style.backgroundImage = actor?.img ? `url('${actor.img}')` : '';

      const tags = [actor?.system?.tier, actor?.system?.typing].filter(Boolean);
      const difficulty = actor?.system?.defenses?.difficulty?.value ?? '';
      envBody.innerHTML = `
        <div class="env-meta">
          <div class="env-tags">${tags.map(t => `<span class="env-tag">${foundry.utils.escapeHTML(String(t))}</span>`).join('')}</div>
          <div class="env-difficulty"><span class="label">Difficulty</span><span class="value">${difficulty}</span></div>
        </div>
      `;

      const actionItems = (actor?.items || []).filter(i => (i.system?.location === 'actions') || (!i.system?.location && i.type === 'item'));
      const enriched = await Promise.all(actionItems.map(async i => ({
        id: i.id,
        name: i.name,
        img: i.img,
        system: i.system,
        enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(i.system?.description || '', { secrets: actor.isOwner, async: true }),
        type: i.type
      })));
      actionsBody.innerHTML = enriched.length
        ? `<ul class="env-actions">${enriched.map(i => `
            <li class="env-action item" data-item-id="${i.id}">
              <div class="item-main-row">
                <div class="item-top-row">
                  <img class="item-control" data-action="edit" src="${i.img || ''}" title="${foundry.utils.escapeHTML(i.name)}" width="22" height="22" />
                  <h4 class="item-name" data-action="toggle-description">${foundry.utils.escapeHTML(i.name)}</h4>
                </div>
              </div>
              <div class="item-description" style="display:none;">${i.enrichedDescription}</div>
            </li>`).join('')}
          </ul>`
        : `<div class="empty">No actions</div>`;

      const advRefs = actor?.system?.potentialAdversaries || [];
      const advActors = [];
      for (const ref of advRefs) {
        try { const a = await fromUuid(ref.uuid); if (a) advActors.push(a); } catch {}
      }
      adversariesBody.innerHTML = advActors.length
        ? `<div class="env-adversaries">${advActors.map(a => `<div class="adv-chip" draggable="true" data-actor-uuid="${a.uuid}"><img draggable="true" src="${a.img || ''}"/><span>${foundry.utils.escapeHTML(a.name)}</span></div>`).join('')}</div>`
        : `<div class="empty">No adversaries</div>`;

      this._bindActionAndAdversaryHandlers(actor);
    } catch {
      titleEl.textContent = 'Environment';
      unsetBtn.style.display = 'none';
      envBody.innerHTML = '';
      actionsBody.innerHTML = '';
      adversariesBody.innerHTML = '';
    }
  }

  _bindActionAndAdversaryHandlers(actor) {
    if (!this.element) return;
    const actionsContainer = this.element.querySelector('.actions-body');
    const advContainer = this.element.querySelector('.adversaries-body');
    if (actionsContainer) {
      actionsContainer.querySelectorAll('.item-name[data-action="toggle-description"]').forEach(el => {
        el.addEventListener('click', (ev) => {
          const li = ev.currentTarget.closest('.item');
          const desc = li?.querySelector('.item-description');
          if (desc) desc.style.display = desc.style.display === 'none' ? '' : 'none';
        });
      });
      actionsContainer.querySelectorAll('img.item-control[data-action="edit"]').forEach(img => {
        img.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const li = ev.currentTarget.closest('.item');
          const itemId = li?.dataset.itemId;
          const item = actor.items.get(itemId);
          if (!item) return;
          const chatCard = buildItemCardChat({
            itemId: item.id,
            actorId: actor.id,
            image: item.img,
            name: item.name,
            category: item.system?.category || '',
            rarity: item.system?.rarity || '',
            description: item.system?.description || '',
            itemType: item.type,
            system: item.system
          });
          await ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: chatCard });
        });
      });
    }
    if (advContainer) {
      advContainer.querySelectorAll('.adv-chip').forEach(chip => {
        chip.addEventListener('dragstart', (event) => {
          const uuid = chip.dataset.actorUuid;
          const dragData = { type: 'Actor', uuid };
          event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
          event.dataTransfer.setData('application/json', JSON.stringify(dragData));
          event.dataTransfer.effectAllowed = 'move';
        });
        chip.addEventListener('click', async () => {
          try { const a = await fromUuid(chip.dataset.actorUuid); a?.sheet?.render(true); } catch {}
        });
      });
    }
  }
} 