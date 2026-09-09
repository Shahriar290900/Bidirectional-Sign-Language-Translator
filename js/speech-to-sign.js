// SPEECH TO SIGN MODULE — Voice/text input → Avatar display
// Vocabulary lives in data/signs.json and is resolved through SignData.

const SpeechToSign = {
    recognition: null,
    isListening: false,
    silenceTimeout: null,
    isAnimating: false,
    resumeAfterAudio: false,
    baseText: '',
    SILENCE_DURATION: 2000,
    AVATAR_DISPLAY_TIME: 1000, // Minimum time (in ms) to show each avatar AFTER it loads
    neutralPose: 'neutral.webp',

    // INITIALIZATION
    async init() {
        Utils.log('[Speech→Sign] Initializing...', 'info');

        // Hold a skeleton until the neutral pose has actually decoded
        this.showAvatarSkeleton();
        const neutralImg = new Image();
        neutralImg.onload = () => this.showAvatarPlaceholder();
        neutralImg.src = CONFIG.AVATAR_DIR + this.neutralPose;

        // Warn if page is not served securely (Web Speech API needs HTTPS)
        if (window.location.protocol === 'file:' ||
            (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
            Utils.log('[Speech→Sign] WARNING: Voice input requires HTTPS. Run "python serve.py" to use voice.', 'warning');
        }

        // Browser check: Suggest Chrome for best speech support
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        if (!isChrome) {
            this.showError('Best experience in Google Chrome. Other browsers may have limited voice support.');
            Utils.log('[Speech→Sign] Non-Chrome browser detected. Voice recognition may be unstable.', 'info');
        }

        // Setup speech recognition
        this.setupSpeechRecognition();

        Utils.log('[Speech→Sign] Ready', 'success');
    },

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const btn = document.getElementById('sptsVoiceBtn');
            if (btn) { btn.disabled = true; btn.textContent = I18n.t('spts.notSupported'); }
            Utils.log('[Speech→Sign] Speech recognition not supported', 'warning');
            return;
        }

        this.recognition = new SpeechRecognition();

        // Edge backend (Azure) struggles with bn-BD, but accepts bn-IN more reliably.
        // Chrome/Google backend handles bn-BD perfectly.
        const isEdge = navigator.userAgent.indexOf("Edg") > -1;
        this.recognition.lang = isEdge ? 'bn-IN' : (navigator.language.startsWith('bn') ? navigator.language : 'bn-BD');

        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onstart = () => {
            this.isListening = true;

            // Capture the existing text in the input box when the session starts
            const input = document.getElementById('sptsTextInput');
            this.baseText = input ? input.value.trim() : '';

            const btn = document.getElementById('sptsVoiceBtn');
            if (btn) { btn.classList.add('recording'); btn.textContent = I18n.t('spts.listeningBtn'); }
            const status = document.getElementById('sptsVoiceStatus');
            if (status) {
                status.className = 'voice-status listening';
                status.textContent = I18n.t('spts.listening');
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let sessionFinals = [];

            // 1. Collect all finals and interims from the event
            for (let i = 0; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.trim();
                if (event.results[i].isFinal) {
                    sessionFinals.push(transcript);
                } else {
                    interimTranscript += transcript + ' ';
                }
            }

            // 2. Reconstruct the clean session text
            let reconstructedSessionText = '';
            for (let chunk of sessionFinals) {
                // If the new chunk starts with our accumulated text, it's the Android cumulative bug.
                // Or if it's identical, it's Android repeating the same final.
                if (reconstructedSessionText && chunk.toLowerCase().startsWith(reconstructedSessionText.toLowerCase())) {
                    reconstructedSessionText = chunk;
                } else {
                    reconstructedSessionText = (reconstructedSessionText + ' ' + chunk).trim();
                }
            }

            // 3. Instead of appending, we completely overwrite the input with baseText + new session text
            const input = document.getElementById('sptsTextInput');
            if (input) {
                const finalStr = (this.baseText + (this.baseText && reconstructedSessionText ? ' ' : '') + reconstructedSessionText).trim();
                input.value = finalStr;
            }

            // 4. Reset silence timeout
            if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
            this.silenceTimeout = setTimeout(() => {
                if (this.isListening) {
                    this.isListening = false;

                    // Force UI update directly here for mobile
                    const status = document.getElementById('sptsVoiceStatus');
                    if (status) status.textContent = I18n.t('spts.stopped');
                    const btn = document.getElementById('sptsVoiceBtn');
                    if (btn) { btn.classList.remove('recording'); btn.textContent = I18n.t('spts.voiceInput'); }

                    try { this.recognition.stop(); } catch (e) { }
                }
            }, this.SILENCE_DURATION);

            if (interimTranscript) {
                const status = document.getElementById('sptsVoiceStatus');
                if (status) status.textContent = `🎙️ "${interimTranscript}"`;
            }
        };

        this.recognition.onerror = (event) => {
            const status = document.getElementById('sptsVoiceStatus');
            if (status) {
                status.className = 'voice-status error';

                // Provide specific, actionable messages for known errors
                const errorMessages = {
                    'network': '❌ Network error, Use Chrome Browser, it should fix this',
                    'not-allowed': '❌ Microphone permission denied — Click the lock icon in the address bar to allow',
                    'no-speech': '🔇 No speech detected — Try again',
                    'audio-capture': '❌ No microphone found — Check your audio device',
                    'aborted': '⏹️ Voice input cancelled',
                    'service-not-allowed': '❌ Speech service blocked — Use Chrome or Edge browser'
                };

                status.textContent = errorMessages[event.error] || `❌ Error: ${event.error}`;
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            const btn = document.getElementById('sptsVoiceBtn');
            if (btn) { btn.classList.remove('recording'); btn.textContent = I18n.t('spts.voiceInput'); }
            if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        };
    },

    /**
     * Hold recognition while `audio` plays, then resume it. Without this the microphone
     * hears the app's own spoken output and feeds it straight back in as input.
     */
    suspendWhile(audio) {
        if (!this.recognition || !this.isListening) return;

        this.resumeAfterAudio = true;
        try { this.recognition.stop(); } catch (e) { }

        const resume = () => {
            audio.removeEventListener('ended', resume);
            audio.removeEventListener('error', resume);
            if (!this.resumeAfterAudio) return;
            this.resumeAfterAudio = false;
            try { this.recognition.start(); } catch (e) { }
        };
        audio.addEventListener('ended', resume);
        audio.addEventListener('error', resume);
    },

    // VOICE CONTROL
    toggleVoice() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.resumeAfterAudio = false;   // an explicit stop outranks a pending resume
            this.recognition.stop();
            if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        } else {
            const input = document.getElementById('sptsTextInput');
            if (input) input.focus();
            this.recognition.start();
        }
    },

    // TEXT PROCESSING

    removePunctuation(word) {
        return word.replace(/^[^ঀ-৿0-9_a-zA-Z]+|[^ঀ-৿0-9_a-zA-Z]+$/g, '');
    },

    splitIntoWords(text) {
        return SignData.normalize(text)
            .split(/\s+/)
            .map(w => this.removePunctuation(w))
            .filter(w => w.length > 0);
    },

    /**
     * Resolve each word to a sign, preferring the longest multi-word phrase
     * so "দাঁত মাজা" wins over "দাঁত".
     */
    processText(text) {
        const words = this.splitIntoWords(text);
        const result = [];
        let i = 0;

        while (i < words.length) {
            let matched = false;

            for (let len = Math.min(3, words.length - i); len > 1; len--) {
                const phrase = words.slice(i, i + len).join(' ');
                const sign = SignData.lookup(phrase);
                if (sign) {
                    result.push({ word: phrase, sign });
                    i += len;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                result.push({ word: words[i], sign: SignData.lookup(words[i]) });
                i++;
            }
        }

        return result;
    },

    // ANIMATION — Show avatars sequentially
    async translate() {
        const input = document.getElementById('sptsTextInput');
        if (!input || !input.value.trim()) {
            this.showError(I18n.t('spts.needInput'));
            return;
        }

        const items = this.processText(input.value.trim());
        if (items.length === 0) {
            this.showError('No words found');
            return;
        }

        this.hideError();
        this.isAnimating = true;
        document.getElementById('sptsTranslateBtn').disabled = true;
        document.getElementById('sptsVoiceBtn').disabled = true;

        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const info = document.getElementById('sptsSignInfo');
                if (info) info.textContent = `${I18n.number(i + 1)}/${I18n.number(items.length)}: ${item.word}`;

                if (item.sign) {
                    await this.showAvatar(item.sign, item.word);
                } else {
                    await this.showFallback(item.word);
                }

                // Wait minimum display time AFTER the image has fully loaded
                await this.sleep(this.AVATAR_DISPLAY_TIME);
            }

            const info = document.getElementById('sptsSignInfo');
            if (info) info.textContent = I18n.t('spts.complete');
            this.showAvatarPlaceholder();
        } catch (error) {
            this.showError(`Animation error: ${error.message}`);
        } finally {
            this.isAnimating = false;
            document.getElementById('sptsTranslateBtn').disabled = false;
            const voiceBtn = document.getElementById('sptsVoiceBtn');
            if (voiceBtn) voiceBtn.disabled = !this.recognition;
        }
    },

    showAvatar(sign, label) {
        return new Promise((resolve) => {
            const display = document.getElementById('sptsSignImage');
            if (!display) {
                resolve();
                return;
            }

            const img = new Image();
            img.className = 'avatar-img';
            img.alt = label;
            img.onload = () => {
                display.innerHTML = '';
                display.appendChild(img);
                if (sign.avatarKind === 'photo') {
                    const badge = document.createElement('div');
                    badge.className = 'avatar-badge';
                    badge.textContent = 'Reference photo';
                    display.appendChild(badge);
                }
                resolve();
            };
            img.onerror = () => {
                this.showFallback(label).then(resolve);
            };
            img.src = SignData.avatarUrl(sign);
        });
    },

    /* === TOGGLE: MISSING AVATAR FALLBACK === */
    showFallback(word) {
        return new Promise((resolve) => {
            const display = document.getElementById('sptsSignImage');
            if (!display) {
                resolve();
                return;
            }
            display.innerHTML = '';

            if (CONFIG.MISSING_AVATAR_MODE === 'text') {
                // Mode A: Show word in big font
                const div = document.createElement('div');
                div.className = 'fallback-text';
                div.textContent = word;
                display.appendChild(div);
                resolve();
            } else {
                // Mode B: Show neutral pose
                const img = new Image();
                img.className = 'avatar-img';
                img.alt = word;
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = CONFIG.AVATAR_DIR + this.neutralPose;
                const label = document.createElement('div');
                label.className = 'fallback-label';
                label.textContent = word;
                display.appendChild(img);
                display.appendChild(label);
            }
        });
    },
    /* === END TOGGLE: MISSING AVATAR FALLBACK === */

    showAvatarSkeleton() {
        const display = document.getElementById('sptsSignImage');
        if (!display) return;
        display.innerHTML = '';
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-avatar';
        display.appendChild(skeleton);
    },

    showAvatarPlaceholder() {
        const display = document.getElementById('sptsSignImage');
        if (display) {
            display.innerHTML = '';
            const img = new Image();
            img.className = 'avatar-img';
            img.alt = I18n.t('spts.waiting');
            img.src = CONFIG.AVATAR_DIR + this.neutralPose;
            display.appendChild(img);
        }
    },

    // HELPERS
    clearInput() {
        const input = document.getElementById('sptsTextInput');
        if (input) input.value = '';
        this.showAvatarPlaceholder();
        const info = document.getElementById('sptsSignInfo');
        if (info) info.textContent = I18n.t('spts.ready');
        const status = document.getElementById('sptsVoiceStatus');
        if (status) { status.textContent = ''; status.className = 'voice-status'; }
        this.hideError();
    },

    showError(msg) {
        const el = document.getElementById('sptsError');
        if (el) { el.textContent = msg; el.classList.add('show'); }
    },

    hideError() {
        const el = document.getElementById('sptsError');
        if (el) { el.textContent = ''; el.classList.remove('show'); }
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
