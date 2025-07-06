export class EntitySheetHelper {

  static getAttributeData(data) {

    // Ensure attributes and groups exist
    if (!data.system.attributes) {
      data.system.attributes = {};
    }
    if (!data.system.groups) {
      data.system.groups = {};
    }

    // attr types
    for ( let attr of Object.values(data.system.attributes) ) {
      if ( attr.dtype ) {
        attr.isCheckbox = attr.dtype === "Boolean";
        attr.isResource = attr.dtype === "Resource";
        attr.isFormula = attr.dtype === "Formula";
      }
    }

    // ungrouped init
    data.system.ungroupedAttributes = {};

    // sorted groups
    const groups = data.system.groups || {};
    let groupKeys = Object.keys(groups).sort((a, b) => {
      let aSort = groups[a].label ?? a;
      let bSort = groups[b].label ?? b;
      return aSort.localeCompare(bSort);
    });

    // group attrs
    for ( let key of groupKeys ) {
      let group = data.system.attributes[key] || {};

      // attr container
      if ( !data.system.groups[key]['attributes'] ) data.system.groups[key]['attributes'] = {};

      // sort & process
      Object.keys(group).sort((a, b) => a.localeCompare(b)).forEach(attr => {
        // invalid check
        if ( typeof group[attr] != "object" || !group[attr]) return;
        // attr types
        group[attr]['isCheckbox'] = group[attr]['dtype'] === 'Boolean';
        group[attr]['isResource'] = group[attr]['dtype'] === 'Resource';
        group[attr]['isFormula'] = group[attr]['dtype'] === 'Formula';
        data.system.groups[key]['attributes'][attr] = group[attr];
      });
    }

    // remaining attrs
    const keys = Object.keys(data.system.attributes).filter(a => !groupKeys.includes(a));
    keys.sort((a, b) => a.localeCompare(b));
    for ( const key of keys ) data.system.ungroupedAttributes[key] = data.system.attributes[key];

    // item attrs
    if ( data.items ) {
      data.items.forEach(item => {
        // process attrs
        for ( let [k, v] of Object.entries(item.system.attributes) ) {
          // grouped
          if ( !v.dtype ) {
            for ( let [gk, gv] of Object.entries(v) ) {
              if ( gv.dtype ) {
                // label fallback
                if ( !gv.label ) gv.label = gk;
                // formula flag
                if ( gv.dtype === "Formula" ) {
                  gv.isFormula = true;
                }
                else {
                  gv.isFormula = false;
                }
              }
            }
          }
          // ungrouped
          else {
            // label fallback
            if ( !v.label ) v.label = k;
            // formula flag
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

  /* -------------------------------------------- */

  /** @override */
  static onSubmit(event) {
    // event check
    if ( event.currentTarget ) {
      // named attr check
      if ( (event.currentTarget.tagName.toLowerCase() === 'input') && !event.currentTarget.hasAttribute('name')) {
        return false;
      }

      let attr = false;
      // attr key focus
      const el = event.currentTarget;
      if ( el.classList.contains("attribute-key") ) {
        let val = el.value;
        let oldVal = el.closest(".attribute").dataset.attribute;
        let attrError = false;
        // duplicate check
        let groups = document.querySelectorAll('.group-key');
        for ( let i = 0; i < groups.length; i++ ) {
          if (groups[i].value === val) {
            ui.notifications.error(game.i18n.localize("SIMPLE.NotifyAttrDuplicate") + ` (${val})`);
            el.value = oldVal;
            attrError = true;
            break;
          }
        }
        // value replacement
        if ( !attrError ) {
          oldVal = oldVal.includes('.') ? oldVal.split('.')[1] : oldVal;
          attr = $(el).attr('name').replace(oldVal, val);
        }
      }

      // return key or confirm
      return attr ? attr : true;
    }
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   */
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

  /* -------------------------------------------- */

  /**
   * Listen for click events and modify attribute groups.
   * @param {MouseEvent} event    The originating left click event
   */
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

  /* -------------------------------------------- */

  /**
   * Listen for the roll button on attributes.
   * @param {MouseEvent} event    The originating left click event
   */
  static onAttributeRoll(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const label = button.closest(".attribute").querySelector(".attribute-label")?.value;
    const chatLabel = label ?? button.parentElement.querySelector(".attribute-key").value;
    const shorthand = game.settings.get("daggerheart", "macroShorthand");

    // actor rollData
    const rollData = this.actor.getRollData();
    let formula = button.closest(".attribute").querySelector(".attribute-value")?.value;

    // roll formula
    if ( formula ) {
      let replacement = null;
      if ( formula.includes('@item.') && this.item ) {
        let itemName = this.item.name.slugify({strict: true}); // item slug
        replacement = !!shorthand ? `@items.${itemName}.` : `@items.${itemName}.attributes.`;
        formula = formula.replace('@item.', replacement);
      }

      // roll & message
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
          
          // Wait for Dice So Nice! animation to complete
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

  /* -------------------------------------------- */

  /**
   * Return HTML for a new attribute to be applied to the form for submission.
   *
   * @param {Object} items  Keyed object where each item has a "type" and "value" property.
   * @param {string} index  Numeric index or key of the new attribute.
   * @param {string|boolean} group String key of the group, or false.
   *
   * @returns {string} Html string.
   */
  static getAttributeHtml(items, index, group = false) {
    // html init
    let result = '<div style="display: none;">';
    // build inputs
    for (let [key, item] of Object.entries(items)) {
      result = result + `<input type="${item.type}" name="system.attributes${group ? '.' + group : '' }.attr${index}.${key}" value="${item.value}"/>`;
    }
    // close & return
    return result + '</div>';
  }

  /* -------------------------------------------- */

  /**
   * Validate whether or not a group name can be used.
   * @param {string} groupName    The candidate group name to validate
   * @param {Document} document   The Actor or Item instance within which the group is being defined
   * @returns {boolean}
   */
  static validateGroup(groupName, document) {
    let groups = Object.keys(document.system.groups || {});
    let attributes = Object.keys(document.system.attributes).filter(a => !groups.includes(a));

    // duplicate check
    if ( groups.includes(groupName) ) {
      ui.notifications.error(game.i18n.localize("SIMPLE.NotifyGroupDuplicate") + ` (${groupName})`);
      return false;
    }

    // attr conflict
    if ( attributes.includes(groupName) ) {
      ui.notifications.error(game.i18n.localize("SIMPLE.NotifyGroupAttrDuplicate") + ` (${groupName})`);
      return false;
    }

    // reserved names
    if ( ["attr", "attributes"].includes(groupName) ) {
      ui.notifications.error(game.i18n.format("SIMPLE.NotifyGroupReserved", {key: groupName}));
      return false;
    }

    // invalid chars
    if ( groupName.match(/[\s|\.]/i) ) {
      ui.notifications.error(game.i18n.localize("SIMPLE.NotifyGroupAlphanumeric"));
      return false;
    }
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Create new attributes.
   * @param {MouseEvent} event    The originating left click event
   * @param {Object} app          The form application object.
   * @private
   */
  static async createAttribute(event, app) {
    const a = event.currentTarget;
    const group = a.dataset.group;
    let dtype = a.dataset.dtype;
    const attrs = app.object.system.attributes;
    const groups = app.object.system.groups;
    const form = app.form;

    // new attr key
    let objKeys = Object.keys(attrs).filter(k => !Object.keys(groups).includes(k));
    let nk = Object.keys(attrs).length + 1;
    let newValue = `attr${nk}`;
    let newKey = document.createElement("div");
    while ( objKeys.includes(newValue) ) {
      ++nk;
      newValue = `attr${nk}`;
    }

    // html options
    let htmlItems = {
      key: {
        type: "text",
        value: newValue
      }
    };

    // grouped
    if ( group ) {
      objKeys = attrs[group] ? Object.keys(attrs[group]) : [];
      nk = objKeys.length + 1;
      newValue = `attr${nk}`;
      while ( objKeys.includes(newValue) ) {
        ++nk;
        newValue =  `attr${nk}`;
      }

      // update options
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
    // ungrouped
    else {
      // default dtype
      if (!dtype) {
        let lastAttr = document.querySelector('.attributes > .attributes-group .attribute:last-child .attribute-dtype')?.value;
        dtype = lastAttr ? lastAttr : "String";
        htmlItems.dtype = {
          type: "hidden",
          value: dtype
        };
      }
    }

    // build form elements
    newKey.innerHTML = EntitySheetHelper.getAttributeHtml(htmlItems, nk, group);

    // append & submit
    newKey = newKey.children[0];
    form.appendChild(newKey);
    await app._onSubmit(event);
  }

  /**
   * Delete an attribute.
   * @param {MouseEvent} event    The originating left click event
   * @param {Object} app          The form application object.
   * @private
   */
  static async deleteAttribute(event, app) {
    const a = event.currentTarget;
    const li = a.closest(".attribute");
    if ( li ) {
      li.parentElement.removeChild(li);
      await app._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /**
   * Create new attribute groups.
   * @param {MouseEvent} event    The originating left click event
   * @param {Object} app          The form application object.
   * @private
   */
  static async createAttributeGroup(event, app) {
    const a = event.currentTarget;
    const form = app.form;
    let newValue = $(a).siblings('.group-prefix').val();
    // validate & create
    if ( newValue.length > 0 && EntitySheetHelper.validateGroup(newValue, app.object) ) {
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="system.groups.${newValue}.key" value="${newValue}"/>`;
      // append & submit
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await app._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /**
   * Delete an attribute group.
   * @param {MouseEvent} event    The originating left click event
   * @param {Object} app          The form application object.
   * @private
   */
  static async deleteAttributeGroup(event, app) {
    const a = event.currentTarget;
    let groupHeader = a.closest(".group-header");
    let groupContainer = groupHeader.closest(".group");
    let group = $(groupHeader).find('.group-key');
    // confirm deletion
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

  /* -------------------------------------------- */

  /**
   * Update attributes when updating an actor object.
   * @param {object} formData       The form data object to modify keys and values for.
   * @param {Document} document     The Actor or Item document within which attributes are being updated
   * @returns {object}              The updated formData object.
   */
  static updateAttributes(formData, document) {
    let groupKeys = [];

    // Handle the free-form attributes list
    const formAttrs = foundry.utils.expandObject(formData)?.system?.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let attrs = [];
      let group = null;
      // grouped attrs
      if ( !v["key"] ) {
        attrs = Object.keys(v);
        attrs.forEach(attrKey => {
          group = v[attrKey]['group'];
          groupKeys.push(group);
          let attr = v[attrKey];
          const k = this.cleanKey(v[attrKey]["key"] ? v[attrKey]["key"].trim() : attrKey.trim());
          delete attr["key"];
          // nested structure
          if ( !obj[group] ) {
            obj[group] = {};
          }
          obj[group][k] = attr;
        });
      }
      // ungrouped attrs
      else {
        const k = this.cleanKey(v["key"].trim());
        delete v["key"];
        // ungrouped only
        if ( !group ) {
          obj[k] = v;
        }
      }
      return obj;
    }, {});

    // Remove attributes which are no longer used
    for ( let k of Object.keys(document.system.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // remove unused grouped
    for ( let group of groupKeys) {
      if ( document.system.attributes[group] ) {
        for ( let k of Object.keys(document.system.attributes[group]) ) {
          if ( !attributes[group].hasOwnProperty(k) ) attributes[group][`-=${k}`] = null;
        }
      }
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {_id: document.id, "system.attributes": attributes});

    return formData;
  }

  /* -------------------------------------------- */

  /**
   * Update attribute groups when updating an actor object.
   * @param {object} formData       The form data object to modify keys and values for.
   * @param {Document} document     The Actor or Item document within which attributes are being updated
   * @returns {object}              The updated formData object.
   */
  static updateGroups(formData, document) {
    const formGroups = foundry.utils.expandObject(formData).system.groups || {};
    const documentGroups = Object.keys(document.system.groups || {});

    // Identify valid groups submitted on the form
    const groups = Object.entries(formGroups).reduce((obj, [k, v]) => {
      const validGroup = documentGroups.includes(k) || this.validateGroup(k, document);
      if ( validGroup )  obj[k] = v;
      return obj;
    }, {});

    // Remove groups which are no longer used
    for ( let k of Object.keys(document.system.groups)) {
      if ( !groups.hasOwnProperty(k) ) groups[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.groups")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {_id: document.id, "system.groups": groups});
    return formData;
  }

  /* -------------------------------------------- */

  /**
   * @see ClientDocumentMixin.createDialog
   */
  static async createDialog(data={}, options={}) {

    // Collect data
    const documentName = this.metadata.name;
    const folders = game.folders.filter(f => (f.type === documentName) && f.displayed);
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format("DOCUMENT.Create", {type: label});

    // Get the available document types
    const types = {};
    if ( this.TYPES.length > 1 ) {
      const actorTypes = this.TYPES.filter(t => t !== CONST.BASE_DOCUMENT_TYPE);
      for ( let t of actorTypes ) {
        types[t] = game.i18n.localize(CONFIG[documentName].typeLabels[t]);
      }
    }

    // Identify the template Actor types
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

    // Render the document creation form
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

    // Render the confirmation dialog window
    return Dialog.prompt({
      title: title,
      content: html,
      label: title,
      callback: html => {
        // Get the form data
        const form = html[0].querySelector("form");
        const fd = new foundry.applications.ux.FormDataExtended(form);
        let createData = fd.object;

        // Merge with template data
        const template = collection.get(form.type.value);
        if ( template ) {
          createData = foundry.utils.mergeObject(template.toObject(), createData);
          createData.type = template.type;
          delete createData.flags.daggerheart.isTemplate;
        } else {
          createData.type = form.type.value;
        }

        // Merge provided override data
        createData = foundry.utils.mergeObject(createData, data, { inplace: false });
        return this.create(createData, {renderSheet: true});
      },
      rejectClose: false,
      options: options
    });
  }

  /* -------------------------------------------- */

  /**
   * Ensure the resource values are within the specified min and max.
   * @param {object} attrs  The Document's attributes.
   */
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

  /* -------------------------------------------- */

  /**
   * Clean an attribute key, emitting an error if it contained invalid characters.
   * @param {string} key  The key to clean.
   * @returns {string}
   */
  static cleanKey(key) {
    const clean = key.replace(/[\s.]/g, "");
    if ( clean !== key ) ui.notifications.error("SIMPLE.NotifyAttrInvalid", { localize: true });
    return clean;
  }

  /* -------------------------------------------- */

  /**
   * Process inline rolling references in a formula string
   * @param {string} formula - The formula string that may contain inline references
   * @param {foundry.documents.Actor} actor - The actor to get data from
   * @returns {string} - The processed formula with inline references replaced
   * @static
   */
  static processInlineReferences(formula, actor) {
    if (!formula || typeof formula !== 'string' || !actor) {
      return formula;
    }

    let processedFormula = formula;

    // Define inline reference mappings based on Foundry actor system data structure
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

    // Process each reference using safe property access
    for (const [reference, valueGetter] of Object.entries(references)) {
      if (processedFormula.includes(reference)) {
        try {
          const value = valueGetter();
          // Replace all instances of the reference with the actual value
          // Use proper regex escaping for special characters
          const escapedReference = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          processedFormula = processedFormula.replace(new RegExp(escapedReference, 'g'), value);
        } catch (error) {
          console.warn(`Daggerheart | Failed to process inline reference ${reference}:`, error);
          // Leave the reference as-is if there's an error
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

// Make globally accessible for macros and external usage
if (typeof globalThis !== 'undefined') {
  globalThis.daggerheart = globalThis.daggerheart || {};
  globalThis.daggerheart.buildItemCardChat = buildItemCardChat;
}