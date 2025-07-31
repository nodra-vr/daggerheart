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

    const html = `
      <div id="top-bar-ui" class="top-bar-ui">
        <div class="top-bar-background"></div>
        <div class="top-bar-gradient-mask"></div>
        <div class="top-bar-content">
          <div class="top-bar-section top-bar-section--environment-actions">
            <div class="top-bar-section-icon">
              <i class="fas fa-cogs"></i>
            </div>
            <div class="top-bar-section-text">Environment Actions</div>
          </div>
          
          <div class="top-bar-divider"></div>
          
          <div class="top-bar-section top-bar-section--environment-name">
            <div class="environment-name-container">
              <div class="environment-name-primary">ABANDONED GROVE</div>
              <div class="environment-name-secondary">Tier 1 • Exploration</div>
            </div>
          </div>
          
          <div class="top-bar-divider"></div>
          
          <div class="top-bar-section top-bar-section--possible-adversaries">
            <div class="top-bar-section-icon">
              <i class="fas fa-skull"></i>
            </div>
            <div class="top-bar-section-text">Possible Adversaries</div>
          </div>
        </div>
      </div>
    `;

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