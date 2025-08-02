export class TopBarUI {
  constructor() {
    this.element = null;
  }

  async initialize() {
    await this.render();
    this.activateListeners();
  }

  async render() {
    this.cleanupListeners();
    if (this.element) {
      this.element.remove();
    }

    const html = ``; //To be implemented

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
  }

  activateListeners() {
    if (!this.element) return;

    this.cleanupListeners();

    const environmentActions = this.element.querySelector('.top-bar-section--environment-actions');
    const possibleAdversaries = this.element.querySelector('.top-bar-section--possible-adversaries');

    if (environmentActions) {
      environmentActions.addEventListener('click', (e) => {
        console.log('Environment Actions clicked');
      });
    }

    if (possibleAdversaries) {
      possibleAdversaries.addEventListener('click', (e) => {
        console.log('Possible Adversaries clicked');
      });
    }
  }

  cleanupListeners() {
    if (this.element) {
      const environmentActions = this.element.querySelector('.top-bar-section--environment-actions');
      const possibleAdversaries = this.element.querySelector('.top-bar-section--possible-adversaries');
      
      if (environmentActions) {
        environmentActions.removeEventListener('click', environmentActions._clickHandler);
      }
      
      if (possibleAdversaries) {
        possibleAdversaries.removeEventListener('click', possibleAdversaries._clickHandler);
      }
    }
  }
} 