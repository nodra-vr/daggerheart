export class EntitySheetHelper {
  static getAttributeData(data) {
    if (!data.system.attributes) {
      data.system.attributes = {};
    }
    if (!data.system.groups) {
      data.system.groups = {};
    }
    for ( let attr of Object.values(data.system.attributes) ) {
      if ( attr.dtype ) {
        attr.isCheckbox = attr.dtype === "Boolean";
        attr.isResource = attr.dtype === "Resource";
        attr.isFormula = attr.dtype === "Formula";
      }
    }
    data.system.ungroupedAttributes = {};
    const groups = data.system.groups || {};
    let groupKeys = Object.keys(groups).sort((a, b) => {
      let aSort = groups[a].label ?? a;
      let bSort = groups[b].label ?? b;
      return aSort.localeCompare(bSort);
    });
    for ( let key of groupKeys ) {
      let group = data.system.attributes[key] || {};
      if ( !data.system.groups[key]['attributes'] ) data.system.groups[key]['attributes'] = {};
      Object.keys(group).sort((a, b) => a.localeCompare(b)).forEach(attr => {
        if ( typeof group[attr] != "object" || !group[attr]) return;
        group[attr]['isCheckbox'] = group[attr]['dtype'] === 'Boolean';
        group[attr]['isResource'] = group[attr]['dtype'] === 'Resource';
        group[attr]['isFormula'] = group[attr]['dtype'] === 'Formula';
        data.system.groups[key]['attributes'][attr] = group[attr];
      });
    }
    const keys = Object.keys(data.system.attributes).filter(a => !groupKeys.includes(a));
    keys.sort((a, b) => a.localeCompare(b));
    for ( const key of keys ) data.system.ungroupedAttributes[key] = data.system.attributes[key];
    if ( data.items ) {
      data.items.forEach(item => {
        for ( let [k, v] of Object.entries(item.system.attributes) ) {
          if ( !v.dtype ) {
            for ( let [gk, gv] of Object.entries(v) ) {
              if ( gv.dtype ) {
                if ( !gv.label ) gv.label = gk;
                if ( gv.dtype === "Formula" ) {
                  gv.isFormula = true;
                }
                else {
                  gv.isFormula = false;
                }
              }
            }
          }
          else {
            if ( !v.label ) v.label = k;
            if ( v.dtype === "Formula" ) {
              v.isFormula = true;
            }
            else {
              v.isFormula = false;
            }
          }
        }
      });
    }
  }
  static onSubmit(event) {
    if ( event.currentTarget ) {
      if ( (event.currentTarget.tagName.toLowerCase() === 'input') && !event.currentTarget.hasAttribute('name')) {
        return false;
      }
      let attr = false;
      const el = event.currentTarget;
      if ( el.classList.contains("attribute-key") ) {
        let val = el.value;
        let oldVal = el.closest(".attribute").dataset.attribute;
        let attrError = false;
        let groups = document.querySelectorAll('.group-key');
        for ( let i = 0; i < groups.length; i++ ) {
          if (groups[i].value === val) {
            ui.notifications.error(game.i18n.localize("SIMPLE.NotifyAttrDuplicate") + ` (${val})`);
            el.value = oldVal;
            attrError = true;
            break;
          }
        }
        if ( !attrError ) {
          oldVal = oldVal.includes('.') ? oldVal.split('.')[1] : oldVal;
          attr = $(el).attr('name').replace(oldVal, val);
        }
      }
      return attr ? attr : true;
    }
  }
  static async onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    switch ( action ) {
      case "create":
        return EntitySheetHelper.createAttribute(event, this);
      case "delete":
        return EntitySheetHelper.deleteAttribute(event, this);
    }
  }
  static async onClickAttributeGroupControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    switch ( action ) {
      case "create-group":
        return EntitySheetHelper.createAttributeGroup(event, this);
      case "delete-group":
        return EntitySheetHelper.deleteAttributeGroup(event, this);
    }
  }
  static onAttributeRoll(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const label = button.closest(".attribute").querySelector(".attribute-label")?.value;
    const chatLabel = label ?? button.parentElement.querySelector(".attribute-key").value;
    const shorthand = game.settings.get("daggerheart", "macroShorthand");
    const rollData = this.actor.getRollData();
    let formula = button.closest(".attribute").querySelector(".attribute-value")?.value;
    if ( formula ) {
      let replacement = null;
      if ( formula.includes('@item.') && this.item ) {
        let itemName = this.item.name.slugify({strict: true}); 
        replacement = !!shorthand ? `@items.${itemName}.` : `@items.${itemName}.attributes.`;
        formula = formula.replace('@item.', replacement);
      }
      let r = new Roll(formula, rollData);
      try {
        return (async () => {
          await r.evaluate();
          const chatMessage = await ChatMessage.create({
            content: `
              <div class="dice-roll">
                <div class="dice-result">
                  <div class="dice-formula">${r.formula}</div>
                  <div class="dice-total">${r.total}</div>
                </div>
              </div>
            `,
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `${chatLabel}`,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            rolls: [r]
          });
          if (chatMessage?.id && game.dice3d) {
            await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);
          }
          return chatMessage;
        })();
      } catch (error) {
        console.error("Error creating attribute roll chat message:", error);
        ui.notifications.warn("Chat message failed to send, but roll was completed.");
      }
    }
  }
  static getAttributeHtml(items, index, group = false) {
    let result = '<div style="display: none;">';
    for (let [key, item] of Object.entries(items)) {
      result = result + `<input type="${item.type}" name="system.attributes${group ? '.' + group : '' }.attr${index}.${key}" value="${item.value}"/>`;
    }
    return result + '</div>';
  }
  static validateGroup(groupName, document) {
    let groups = Object.keys(document.system.groups || {});
    let attributes = Object.keys(document.system.attributes).filter(a => !groups.includes(a));
    if ( groups.includes(groupName) ) {
      ui.notifications.error(game.i18n.localize("SIMPLE.NotifyGroupDuplicate") + ` (${groupName})`);
      return false;
    }
    if ( attributes.includes(groupName) ) {
      ui.notifications.error(game.i18n.localize("SIMPLE.NotifyGroupAttrDuplicate") + ` (${groupName})`);
      return false;
    }
    if ( ["attr", "attributes"].includes(groupName) ) {
      ui.notifications.error(game.i18n.format("SIMPLE.NotifyGroupReserved", {key: groupName}));
      return false;
    }
    if ( groupName.match(/[\s|\.]/i) ) {
      ui.notifications.error(game.i18n.localize("SIMPLE.NotifyGroupAlphanumeric"));
      return false;
    }
    return true;
  }
  static async createAttribute(event, app) {
    const a = event.currentTarget;
    const group = a.dataset.group;
    let dtype = a.dataset.dtype;
    const attrs = app.object.system.attributes;
    const groups = app.object.system.groups;
    const form = app.form;
    let objKeys = Object.keys(attrs).filter(k => !Object.keys(groups).includes(k));
    let nk = Object.keys(attrs).length + 1;
    let newValue = `attr${nk}`;
    let newKey = document.createElement("div");
    while ( objKeys.includes(newValue) ) {
      ++nk;
      newValue = `attr${nk}`;
    }
    let htmlItems = {
      key: {
        type: "text",
        value: newValue
      }
    };
    if ( group ) {
      objKeys = attrs[group] ? Object.keys(attrs[group]) : [];
      nk = objKeys.length + 1;
      newValue = `attr${nk}`;
      while ( objKeys.includes(newValue) ) {
        ++nk;
        newValue =  `attr${nk}`;
      }
      htmlItems.key.value = newValue;
      htmlItems.group = {
        type: "hidden",
        value: group
      };
      htmlItems.dtype = {
        type: "hidden",
        value: dtype
      };
    }
    else {
      if (!dtype) {
        let lastAttr = document.querySelector('.attributes > .attributes-group .attribute:last-child .attribute-dtype')?.value;
        dtype = lastAttr ? lastAttr : "String";
        htmlItems.dtype = {
          type: "hidden",
          value: dtype
        };
      }
    }
    newKey.innerHTML = EntitySheetHelper.getAttributeHtml(htmlItems, nk, group);
    newKey = newKey.children[0];
    form.appendChild(newKey);
    await app._onSubmit(event);
  }
  static async deleteAttribute(event, app) {
    const a = event.currentTarget;
    const li = a.closest(".attribute");
    if ( li ) {
      li.parentElement.removeChild(li);
      await app._onSubmit(event);
    }
  }
  static async createAttributeGroup(event, app) {
    const a = event.currentTarget;
    const form = app.form;
    let newValue = $(a).siblings('.group-prefix').val();
    if ( newValue.length > 0 && EntitySheetHelper.validateGroup(newValue, app.object) ) {
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="system.groups.${newValue}.key" value="${newValue}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await app._onSubmit(event);
    }
  }
  static async deleteAttributeGroup(event, app) {
    const a = event.currentTarget;
    let groupHeader = a.closest(".group-header");
    let groupContainer = groupHeader.closest(".group");
    let group = $(groupHeader).find('.group-key');
    new Dialog({
      title: game.i18n.localize("SIMPLE.DeleteGroup"),
      content: `${game.i18n.localize("SIMPLE.DeleteGroupContent")} <strong>${group.val()}</strong>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-trash"></i>',
          label: game.i18n.localize("Yes"),
          callback: async () => {
            groupContainer.parentElement.removeChild(groupContainer);
            await app._onSubmit(event);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("No"),
        }
      }
    }).render(true);
  }
  static updateAttributes(formData, document) {
    let groupKeys = [];
    const formAttrs = foundry.utils.expandObject(formData)?.system?.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let attrs = [];
      let group = null;
      if ( !v["key"] ) {
        attrs = Object.keys(v);
        attrs.forEach(attrKey => {
          group = v[attrKey]['group'];
          groupKeys.push(group);
          let attr = v[attrKey];
          const k = this.cleanKey(v[attrKey]["key"] ? v[attrKey]["key"].trim() : attrKey.trim());
          delete attr["key"];
          if ( !obj[group] ) {
            obj[group] = {};
          }
          obj[group][k] = attr;
        });
      }
      else {
        const k = this.cleanKey(v["key"].trim());
        delete v["key"];
        if ( !group ) {
          obj[k] = v;
        }
      }
      return obj;
    }, {});
    for ( let k of Object.keys(document.system.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }
    for ( let group of groupKeys) {
      if ( document.system.attributes[group] ) {
        for ( let k of Object.keys(document.system.attributes[group]) ) {
          if ( !attributes[group].hasOwnProperty(k) ) attributes[group][`-=${k}`] = null;
        }
      }
    }
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {_id: document.id, "system.attributes": attributes});
    return formData;
  }
  static updateGroups(formData, document) {
    const formGroups = foundry.utils.expandObject(formData).system.groups || {};
    const documentGroups = Object.keys(document.system.groups || {});
    const groups = Object.entries(formGroups).reduce((obj, [k, v]) => {
      const validGroup = documentGroups.includes(k) || this.validateGroup(k, document);
      if ( validGroup )  obj[k] = v;
      return obj;
    }, {});
    for ( let k of Object.keys(document.system.groups)) {
      if ( !groups.hasOwnProperty(k) ) groups[`-=${k}`] = null;
    }
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.groups")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {_id: document.id, "system.groups": groups});
    return formData;
  }
  static async createDialog(data={}, options={}) {
    const documentName = this.metadata.name;
    const folders = game.folders.filter(f => (f.type === documentName) && f.displayed);
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format("DOCUMENT.Create", {type: label});
    const types = {};
    if ( this.TYPES.length > 1 ) {
      const actorTypes = this.TYPES.filter(t => t !== CONST.BASE_DOCUMENT_TYPE);
      for ( let t of actorTypes ) {
        types[t] = game.i18n.localize(CONFIG[documentName].typeLabels[t]);
      }
    }
    const collection = game.collections.get(this.documentName);
    const templates = collection.filter(a => a.getFlag("daggerheart", "isTemplate"));
    if ( templates.length > 0 ) {
      if ( Object.keys(types).length > 0 ) {
        types["---"] = {label: "--- Templates ---", disabled: true};
      }
      for ( let a of templates ) {
        types[a.id] = a.name;
      }
    }
    const template = "templates/sidebar/document-create.html";
    const defaultType = data.type || "";
    const html = await renderTemplate(template, {
      name: data.name || game.i18n.format("DOCUMENT.New", {type: label}),
      folder: data.folder,
      folders: folders,
      hasFolders: folders.length > 1,
      type: defaultType,
      types: types,
      hasTypes: Object.keys(types).length > 1
    });
    return Dialog.prompt({
      title: title,
      content: html,
      label: title,
      callback: html => {
        const form = html[0].querySelector("form");
        const fd = new foundry.applications.ux.FormDataExtended(form);
        let createData = fd.object;
        const template = collection.get(form.type.value);
        if ( template ) {
          createData = foundry.utils.mergeObject(template.toObject(), createData);
          createData.type = template.type;
          delete createData.flags.daggerheart.isTemplate;
        } else {
          createData.type = form.type.value;
        }
        createData = foundry.utils.mergeObject(createData, data, { inplace: false });
        return this.create(createData, {renderSheet: true});
      },
      rejectClose: false,
      options: options
    });
  }
  static clampResourceValues(attrs) {
    const flat = foundry.utils.flattenObject(attrs);
    for ( const [attr, value] of Object.entries(flat) ) {
      const parts = attr.split(".");
      if ( parts.pop() !== "value" ) continue;
      const current = foundry.utils.getProperty(attrs, parts.join("."));
      if ( current?.dtype !== "Resource" ) continue;
      foundry.utils.setProperty(attrs, attr, Math.clamped(value, current.min || 0, current.max || 0));
    }
  }
  static cleanKey(key) {
    const clean = key.replace(/[\s.]/g, "");
    if ( clean !== key ) ui.notifications.error("SIMPLE.NotifyAttrInvalid", { localize: true });
    return clean;
  }
  static processInlineReferences(formula, actor) {
    if (!formula || typeof formula !== 'string' || !actor) {
      return formula;
    }
    let processedFormula = formula;
    const references = {
      '@prof': () => foundry.utils.getProperty(actor, 'system.proficiency.value') ?? 0,
      '@proficiency_value': () => foundry.utils.getProperty(actor, 'system.proficiency.value') ?? 0,
      '@lvl': () => foundry.utils.getProperty(actor, 'system.level.value') ?? 1,
      '@level_value': () => foundry.utils.getProperty(actor, 'system.level.value') ?? 1,
      '@tier': () => foundry.utils.getProperty(actor, 'system.tier.value') ?? 1,
      '@agi': () => foundry.utils.getProperty(actor, 'system.agility.value') ?? 0,
      '@str': () => foundry.utils.getProperty(actor, 'system.strength.value') ?? 0,
      '@fin': () => foundry.utils.getProperty(actor, 'system.finesse.value') ?? 0,
      '@ins': () => foundry.utils.getProperty(actor, 'system.instinct.value') ?? 0,
      '@pre': () => foundry.utils.getProperty(actor, 'system.presence.value') ?? 0,
      '@kno': () => foundry.utils.getProperty(actor, 'system.knowledge.value') ?? 0,
      '@hp': () => foundry.utils.getProperty(actor, 'system.health.value') ?? 0,
      '@hp_max': () => foundry.utils.getProperty(actor, 'system.health.max') ?? 0,
      '@stress_value': () => foundry.utils.getProperty(actor, 'system.stress.value') ?? 0,
      '@stress_max': () => foundry.utils.getProperty(actor, 'system.stress.max') ?? 0,
      '@hope_value': () => foundry.utils.getProperty(actor, 'system.hope.value') ?? 0,
      '@hope_max': () => foundry.utils.getProperty(actor, 'system.hope.max') ?? 0,
      '@evasion': () => foundry.utils.getProperty(actor, 'system.evasion.value') ?? 0,
      '@armor': () => foundry.utils.getProperty(actor, 'system.armor.value') ?? 0,
      '@armor_slots': () => foundry.utils.getProperty(actor, 'system.armorSlots.value') ?? 0,
      '@severe': () => foundry.utils.getProperty(actor, 'system.severe.value') ?? 0,
      '@major': () => foundry.utils.getProperty(actor, 'system.major.value') ?? 0,
      '@minor': () => foundry.utils.getProperty(actor, 'system.minor.value') ?? 0
    };
    for (const [reference, valueGetter] of Object.entries(references)) {
      if (processedFormula.includes(reference)) {
        try {
          const value = valueGetter();
          const escapedReference = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          processedFormula = processedFormula.replace(new RegExp(escapedReference, 'g'), value);
        } catch (error) {
          console.warn(`Daggerheart | Failed to process inline reference ${reference}:`, error);
        }
      }
    }
    return processedFormula;
  }
}
export function buildItemCardChat({ itemId, actorId = "", image, name, category = "", rarity = "", description = "", extraClasses = "" }) {
  const classAttr = extraClasses && extraClasses.trim().length ? `item-card-chat ${extraClasses.trim()}` : "item-card-chat";
  return `
  <div class="${classAttr}" data-item-id="${itemId}" data-actor-id="${actorId}">
      <div class="card-image-container" style="background-image: url('${image}')">
          <div class="card-header-text"><h3>${name}</h3></div>
      </div>
      <div class="card-content">
          <div class="card-subtitle"><span>${category} - ${rarity}</span></div>
          <div class="card-description">
              ${description}
          </div>
      </div>
  </div>`;
}
if (typeof globalThis !== 'undefined') {
  globalThis.daggerheart = globalThis.daggerheart || {};
  globalThis.daggerheart.buildItemCardChat = buildItemCardChat;
}
