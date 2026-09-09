// APP CONTROLLER — Boot sequence, view routing, settings modal, permissions, status bar

/**
 * Each translation surface exists exactly once in the DOM and is moved into whichever
 * panel is open. Because the nodes themselves are reused, every element id stays unique
 * and every listener the modules attached keeps working.
 */
const SURFACES = {
    sign: ['#stsVideoContainer', '.sentence-section', '.floating-controls'],
    speech: ['.text-input-area', '#sptsVoiceStatus', '#sptsSignImage',
             '#sptsSignInfo', '#sptsError', '.voice-control-area']
};

const App = {
    currentPanel: 'homeView',

    async init() {
        Utils.log('App initializing...', 'info');

        // Settings applies the saved interface language, which renders the UI.
        Settings.init();

        this.setupEventListeners();
        this.setupPermissionToggles();
        this.updateStatus(I18n.t('status.loading'), 'loading');

        try {
            // Vocabulary must be loaded before either direction can resolve a word
            await Promise.all([this.waitForMediaPipe(), SignData.load()]);
            Utils.log('MediaPipe and vocabulary loaded', 'success');

            await Promise.all([
                SignToSpeech.init(),
                SpeechToSign.init()
            ]);

            this.updateStatus(I18n.t('status.ready'), 'ready');
            Utils.log('App fully initialized', 'success');
        } catch (error) {
            Utils.log(`Init error: ${error.message}`, 'error');
            console.error('Full init error:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
        }
    },

    waitForMediaPipe(timeout = 30000) {
        return new Promise((resolve, reject) => {
            const ready = () => window.FilesetResolver && window.HandLandmarker && window.PoseLandmarker;
            if (ready()) { resolve(); return; }
            const start = Date.now();
            const check = () => {
                if (ready()) resolve();
                else if (Date.now() - start > timeout) reject(new Error('MediaPipe load timeout'));
                else setTimeout(check, 100);
            };
            check();
        });
    },

    /** Move every surface into the slots of the panel being shown. */
    mountSurfaces(panel) {
        for (const [group, selectors] of Object.entries(SURFACES)) {
            const slot = panel.querySelector(`[data-slot="${group}"]`);
            if (!slot) continue;
            for (const selector of selectors) {
                const surface = document.querySelector(selector);
                if (surface) slot.appendChild(surface);
            }
        }
        // Re-parenting a <video> suspends playback in some browsers.
        if (SignToSpeech.isRunning && SignToSpeech.video) SignToSpeech.video.play();
    },

    openView(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        panel.classList.add('active');
        this.mountSurfaces(panel);
        this.currentPanel = panelId;

        // The conversation view is only useful with the camera already running.
        if (panelId === 'bidirectionalPanel') {
            if (!SignToSpeech.isRunning) SignToSpeech.startCamera();
        } else if (panelId !== 'signToSpeechPanel' && SignToSpeech.isRunning) {
            SignToSpeech.stopCamera();
        }
    },

    closeView() {
        this.openView('homeView');
    },

    setupEventListeners() {
        const rotate = document.getElementById('bidiRotateBtn');
        if (rotate) {
            rotate.addEventListener('click', () => {
                Settings.set('rotateSpeaker', Settings.values.rotateSpeaker === 'on' ? 'off' : 'on');
            });
        }

        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsModal.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                if (settingsModal.classList.contains('show') &&
                    !settingsModal.contains(e.target) && e.target !== settingsBtn) {
                    settingsModal.classList.remove('show');
                }
            });
            settingsModal.addEventListener('click', (e) => e.stopPropagation());
        }

        document.getElementById('stsStartBtn').addEventListener('click', () => SignToSpeech.startCamera());
        document.getElementById('stsStopBtn').addEventListener('click', () => SignToSpeech.stopCamera());
        document.getElementById('stsClearBtn').addEventListener('click', () => SignToSpeech.clearSentence());

        document.getElementById('sptsVoiceBtn').addEventListener('click', () => SpeechToSign.toggleVoice());
        document.getElementById('sptsTranslateBtn').addEventListener('click', () => SpeechToSign.translate());
        document.getElementById('sptsClearBtn').addEventListener('click', () => SpeechToSign.clearInput());
    },

    /**
     * Browsers cannot revoke a permission once granted, so these reflect the real state
     * rather than pretending to control it.
     */
    setupPermissionToggles() {
        const setup = (toggleId, permissionName, constraints, offLabel, onLabel) => {
            const toggle = document.getElementById(toggleId);
            if (!toggle) return;

            const paint = (granted) => {
                toggle.checked = granted;
                document.getElementById(offLabel)?.classList.toggle('active', !granted);
                const label = document.getElementById(onLabel);
                if (!label) return;
                label.classList.toggle('active', granted);
                // Retarget the key rather than just the text, so switching interface
                // language re-renders "Granted" instead of reverting it to "Allow".
                label.dataset.i18n = granted ? 'settings.granted' : 'settings.allow';
                label.textContent = I18n.t(label.dataset.i18n);
            };

            navigator.permissions?.query({ name: permissionName })
                .then(status => {
                    paint(status.state === 'granted');
                    status.onchange = () => paint(status.state === 'granted');
                })
                .catch(() => { /* Safari lacks camera/microphone in the Permissions API */ });

            toggle.addEventListener('change', async () => {
                if (!toggle.checked) {
                    // Nothing in the page can revoke access; say so instead of faking it.
                    paint(true);
                    this.updateStatus(I18n.t('status.revokeInBrowser'), 'info');
                    return;
                }
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    stream.getTracks().forEach(track => track.stop());
                    paint(true);
                    Utils.log(`${toggleId} permission granted.`, 'success');
                } catch (err) {
                    paint(false);
                    Utils.log(`${toggleId} permission denied: ${err.message}`, 'error');
                    this.updateStatus(I18n.t('status.permissionDenied'), 'error');
                }
            });
        };

        setup('cameraPermToggle', 'camera', { video: true }, 'cameraPermOff', 'cameraPermOn');
        setup('micPermToggle', 'microphone', { audio: true }, 'micPermOff', 'micPermOn');
    },

    updateStatus(message, type = 'info') {
        const text = document.getElementById('statusText');
        const icon = document.getElementById('statusIcon');
        const bar = document.getElementById('status');

        if (bar) bar.classList.remove('hidden');
        if (text) text.textContent = message;

        if (icon) {
            const icons = {
                loading: '<i data-lucide="loader-2" class="spin"></i>',
                ready: '<i data-lucide="check-circle" style="color:var(--primary)"></i>',
                error: '<i data-lucide="alert-circle" style="color:var(--danger)"></i>',
                info: '<i data-lucide="info"></i>'
            };
            icon.innerHTML = icons[type] || icons.info;
            if (window.lucide) window.lucide.createIcons();
        }

        if (type === 'ready') {
            setTimeout(() => { if (bar) bar.classList.add('hidden'); }, 2500);
        }
    }
};

// Called from onclick attributes in index.html.
function openView(panelId) { App.openView(panelId); }
function closeView() { App.closeView(); }

// BOOTSTRAP
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
window.addEventListener('beforeunload', () => SignToSpeech.stopCamera());
