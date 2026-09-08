// APP CONTROLLER — Boot sequence, settings modal, permissions, status bar

const App = {
    async init() {
        Utils.log('App initializing...', 'info');

        // Settings and interface language first, so the UI is correct while models load.
        Settings.init();
        I18n.apply();

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

    setupEventListeners() {
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
                document.getElementById(onLabel)?.classList.toggle('active', granted);
                const label = document.getElementById(onLabel);
                if (label) label.textContent = granted ? I18n.t('settings.granted') : I18n.t('settings.allow');
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

// BOOTSTRAP
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
window.addEventListener('beforeunload', () => SignToSpeech.stopCamera());
