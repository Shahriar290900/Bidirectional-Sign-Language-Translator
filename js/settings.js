// SETTINGS — Declarative two-state toggles, persisted to localStorage.
// Each toggle is a checkbox: unchecked selects options[0], checked selects options[1].

const Settings = {
    STORAGE_KEY: 'bdsl-settings',
    values: {},

    definitions: {
        textScale: {
            toggle: 'textScaleToggle',
            labels: ['textScaleSmall', 'textScaleNormal'],
            options: ['small', 'normal'],
            fallback: 'normal',
            apply(value) {
                const html = document.documentElement;
                html.classList.remove('text-scale-small', 'text-scale-normal');
                html.classList.add(`text-scale-${value}`);
            }
        },
        cameraRatio: {
            toggle: 'cameraRatioToggle',
            labels: ['cameraRatioLabelLeft', 'cameraRatioLabelRight'],
            options: ['landscape', 'portrait'],
            fallback: 'landscape',
            apply(value, isUserChange) {
                CONFIG.CAMERA_ASPECT_RATIO = value;
                document.getElementById('stsVideoContainer')
                    ?.classList.toggle('portrait', value === 'portrait');
                if (isUserChange && SignToSpeech.isRunning) {
                    SignToSpeech.stopCamera();
                    setTimeout(() => SignToSpeech.startCamera(), 300);
                }
            }
        },
        missingAvatar: {
            toggle: 'fallbackModeToggle',
            labels: ['fallbackModeLabelLeft', 'fallbackModeLabelRight'],
            options: ['text', 'neutral'],
            fallback: 'text',
            apply(value) { CONFIG.MISSING_AVATAR_MODE = value; }
        },
        voiceOutput: {
            toggle: 'ttsToggle',
            labels: ['ttsLabelLeft', 'ttsLabelRight'],
            options: ['off', 'on'],
            fallback: 'on',
            apply(value) { CONFIG.TTS_ENABLED = value === 'on'; }
        },
        voiceLanguage: {
            toggle: 'ttsLangToggle',
            labels: ['ttsLangLabelLeft', 'ttsLangLabelRight'],
            options: ['bn', 'en'],
            fallback: 'bn',
            apply(value) { CONFIG.TTS_LANGUAGE = value; }
        },
        uiLanguage: {
            toggle: 'uiLangToggle',
            labels: ['uiLangLabelLeft', 'uiLangLabelRight'],
            options: ['bn', 'en'],
            fallback: 'bn',
            apply(value) {
                CONFIG.UI_LANGUAGE = value;
                I18n.setLanguage(value);
                SignToSpeech.renderSentence();
            }
        }
    },

    init() {
        this.values = this.read();

        for (const [key, def] of Object.entries(this.definitions)) {
            if (!(key in this.values) || !def.options.includes(this.values[key])) {
                this.values[key] = def.fallback;
            }
            const toggle = document.getElementById(def.toggle);
            if (toggle) {
                toggle.checked = this.values[key] === def.options[1];
                toggle.addEventListener('change', () => {
                    this.set(key, def.options[toggle.checked ? 1 : 0]);
                });
            }
            this.reflect(key);
            def.apply(this.values[key], false);
        }
        this.write();
    },

    set(key, value) {
        this.values[key] = value;
        this.write();
        this.reflect(key);
        this.definitions[key].apply(value, true);
    },

    /** Keep the two text labels either side of the switch in sync with the value. */
    reflect(key) {
        const def = this.definitions[key];
        const selected = def.options.indexOf(this.values[key]);
        def.labels.forEach((id, i) => {
            document.getElementById(id)?.classList.toggle('active', i === selected);
        });
        const toggle = document.getElementById(def.toggle);
        if (toggle) toggle.checked = selected === 1;
    },

    read() {
        // Storage throws in private mode and in some embedded webviews.
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch (e) {
            return {};
        }
    },

    write() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.values));
        } catch (e) {
            /* settings simply won't persist */
        }
    }
};
