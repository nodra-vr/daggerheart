
// Manage and animate full screen overlays,
// zero distraction edit dialogs for sheets.
export class OverlayManager {
    _state = {
        scale: 0.8,
        opacity: 0.0,
    };

    _isOpen = false;

    _id = null;     // The ID
    _sheet = null;  // The Owner
    _target = null; // The Type

    _onClose = null;
    _onOpened = null;
    _onClosed = null;
    _onOpening = null;
    _onClosing = null;


    get state() {
        return { ...this._state };
    }

    get isOpen() {
        return this._isOpen;
    }


    constructor(options = {}) {
        this._sheet = options?.sheet;

        this._onClose = options?.onClose;
        this._onOpened = options?.onOpened;
        this._onClosed = options?.onClosed;
        this._onOpening = options?.onOpening;
        this._onClosing = options?.onClosing;
    }


    async onKeydown(event) {
        if (!this.isOpen) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
            this._onEscapeDown(event);
        }
    }

    _onEscapeDown(event) {
        // Escape deselects any focused input and then closes
        if (['INPUT', 'TEXTAREA', 'SELECT', 'CHECKBOX'
        ].includes(document.activeElement?.tagName)) {
            document.activeElement.blur();
            this._sheet.element.focus();
            return;
        }
        this._onClose(this._target);
    }


    async open(overlay) {
        if (!this._id && !this._isOpen) {
            this._id = overlay.id;
            this._target = overlay.dataset.type;
            await this._animateOpening();
        }
    }

    async close(overlay) {
        if (this._id === overlay.id) {
            await this._animateClosing();
        }
    }

    async _animateOpening() {
        let start = null;
        const duration = 180;

        this._isOpen = true;

        if (this._onOpening) {
            await this._onOpening(
                this._target
            );
        }

        // Fresh Query as opening may rerender state
        const overlay = document.getElementById(this._id);
        const popup = overlay.querySelector('.popup-container');

        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);

            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);

            const scale = 0.8 + (0.2 * eased); // From 0.8 to 1.0
            const opacity = eased; // From 0 to 1

            // TODO Animate the backdrop transparacy in
            popup.style.setProperty("--dh-popup-scale", scale);
            popup.style.setProperty("--dh-popup-opacity", opacity);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this._state.scale = 1.0;
                this._state.opacity = 1.0;
                this._onOpened && this._onOpened(
                    this._target
                );
            }
        };

        requestAnimationFrame(animate);
    }

    async _animateClosing() {
        let start = null;
        const duration = 120;

        this._isOpen = false;

        if (this._onClosing) {
            await this._onClosing(
                this._target
            );
        }

        // Fresh Query as closing may rerender state
        const overlay = document.getElementById(this._id);
        const popup = overlay.querySelector('.popup-container');

        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);

            // Easing function (ease-in)
            const eased = Math.pow(progress, 2);

            const scale = 1.0 - (0.2 * eased); // From 1.0 to 0.8
            const opacity = 1 - eased; // From 1 to 0

            // TODO Animate the backdrop transparacy out
            popup.style.setProperty("--dh-popup-scale", scale);
            popup.style.setProperty("--dh-popup-opacity", opacity);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                const target = this._target;

                this._id = null;
                this._target = null;
                this._state.scale = 0.8;
                this._state.opacity = 0.0;

                if (this._onClosed) {
                    this._onClosed(
                        target
                    );
                }
            }
        };

        requestAnimationFrame(animate);
    }
}
