/**
 * Dialog Helper Module
 * Provides reusable dialog functionality for the Daggerheart system
 */

export class DaggerheartDialogHelper {
  /**
   * Show a styled dialog with custom content
   * @param {Object} config - Dialog configuration
   * @param {string} config.title - Dialog title
   * @param {string} config.content - HTML content for the dialog
   * @param {Object} config.buttons - Button configuration object
   * @param {string} config.dialogClass - Additional CSS class for styling
   * @param {Function} config.render - Optional render callback
   * @param {string} config.default - Default button key
   * @returns {Promise} - Resolves with the dialog result
   */
  static async showDialog(config) {
    const dialogClass = `daggerheart-dialog ${config.dialogClass || ''}`;
    
    return new Promise(resolve => {
      const dialogButtons = {};
      
      // Process buttons to wrap callbacks with resolve
      for (const [key, button] of Object.entries(config.buttons || {})) {
        dialogButtons[key] = {
          ...button,
          callback: (html) => {
            const result = button.callback ? button.callback(html) : { html, button: key };
            resolve(result);
          }
        };
      }
      
      new Dialog({
        title: config.title,
        content: config.content,
        buttons: dialogButtons,
        default: config.default || Object.keys(dialogButtons)[0],
        render: config.render,
        close: () => {
          // Only resolve null if not already resolved
          if (resolve) resolve(null);
        }
      }, {
        classes: [dialogClass]
      }).render(true);
    });
  }

  /**
   * Show a checkbox selection dialog
   * @param {Object} config - Dialog configuration
   * @param {string} config.title - Dialog title
   * @param {string} config.description - Optional description text
   * @param {Array} config.options - Array of {id, label, value} objects for checkboxes
   * @param {boolean} config.singleSelect - If true, only one option can be selected
   * @returns {Promise} - Resolves with selected options or null
   */
  static async showCheckboxDialog(config) {
    const content = `
      <form>
        <div class="daggerheart-dialog-content">
          ${config.description ? `<p class="dialog-description">${config.description}</p>` : ''}
          <div class="checkbox-group">
            ${config.options.map(option => `
              <div class="checkbox-item">
                <input type="${config.singleSelect ? 'radio' : 'checkbox'}" 
                       id="${option.id}" 
                       name="${config.singleSelect ? 'selection' : option.id}" 
                       value="${option.value || option.id}"
                       ${option.checked ? 'checked' : ''}>
                <label for="${option.id}">${option.label}</label>
              </div>
            `).join('')}
          </div>
        </div>
      </form>
    `;

    const result = await this.showDialog({
      title: config.title,
      content,
      dialogClass: 'checkbox-dialog',
      buttons: {
        confirm: {
          label: config.confirmLabel || "Confirm",
          icon: '<i class="fas fa-check"></i>',
          callback: (html) => {
            if (config.singleSelect) {
              const selectedInput = html.find('input[type="radio"]:checked');
              const selected = selectedInput.length > 0 ? selectedInput.val() : null;
              return { html, button: 'confirm', selected };
            } else {
              const selected = {};
              html.find('input[type="checkbox"]:checked').each((i, el) => {
                selected[el.id] = true;
              });
              return { html, button: 'confirm', selected };
            }
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => null
        }
      }
    });

    return result;
  }

  /**
   * Show the Death Move dialog
   * @param {string} characterName - The name of the character
   * @returns {Promise} - Resolves with the selected death move or null
   */
  static async showDeathMoveDialog(characterName) {
    const options = [
      { id: 'blaze-of-glory', label: 'Blaze of Glory', value: 'Blaze of Glory' },
      { id: 'avoid-death', label: 'Avoid Death', value: 'Avoid Death' },
      { id: 'risk-it-all', label: 'Risk it All', value: 'Risk it All' }
    ];

    const result = await this.showCheckboxDialog({
      title: `Death Move - ${characterName}`,
      description: 'Choose your character\'s death move:',
      options,
      singleSelect: true,
      confirmLabel: 'Choose Death Move'
    });

    if (result && result.selected) {
      // Send message to chat with italicized flavor text
      const message = `<p><em>${characterName} has chosen ${result.selected} as their Death Move.</em></p>`;
      await ChatMessage.create({
        content: message,
        speaker: ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });

      // Show notification about future functionality
      ui.notifications.info(`Death Move selected: ${result.selected}. Functionality will come in the future.`);
      
      return result.selected;
    }

    return null;
  }
} 