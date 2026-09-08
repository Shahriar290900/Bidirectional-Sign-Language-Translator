// I18N — Interface language. The app only ever translates Bengali Sign Language;
// this switches the surrounding interface text between Bengali and English.

const I18n = {
    language: 'bn',

    strings: {
        'app.welcome':        ['বাংলা ইশারা ভাষা অনুবাদকে স্বাগতম', 'Welcome to Bangla Sign Language Translator'],
        'app.poweredBy':      ['এআই দ্বারা চালিত', 'Powered by AI'],
        'app.credits':        ['ইউল্যাবের শিক্ষার্থীদের তৈরি', 'Credits to students of ULAB'],

        'card.camera':        ['ক্যামেরা', 'Camera'],
        'card.cameraDesc':    ['ইশারা থেকে লেখা', 'Sign to text'],
        'card.voice':         ['কণ্ঠস্বর', 'Voice'],
        'card.voiceDesc':     ['কথা থেকে ইশারা', 'Speak to sign'],
        'card.dictionary':    ['অভিধান', 'Dictionary'],
        'card.dictionaryDesc':['ইশারা শিখুন', 'Learn signs'],

        'panel.cameraTitle':  ['ক্যামেরা এআই', 'Camera AI'],
        'panel.voiceTitle':   ['কণ্ঠ এআই', 'Voice AI'],

        'sts.sentence':       ['শনাক্ত করা বাক্য', 'Detected Sentence'],
        'sts.placeholder':    ['শনাক্ত করা শব্দ এখানে দেখা যাবে...', 'Detected words will appear here...'],
        'sts.start':          ['ক্যামেরা চালু করুন', 'Start Camera'],
        'sts.stop':           ['বন্ধ করুন', 'Stop'],
        'sts.showHand':       ['✋ আপনার হাত দেখান', '✋ Show your hand'],
        'sts.confidence':     ['নির্ভরযোগ্যতা', 'Confidence'],

        'spts.inputLang':     ['বাংলা', 'Bengali'],
        'spts.placeholder':   ['অনুবাদ করতে লেখা লিখুন...', 'Write text to translate...'],
        'spts.translate':     ['অনুবাদ করুন', 'Translate'],
        'spts.ready':         ['প্রস্তুত', 'Ready'],
        'spts.tapToSpeak':    ['বলতে ট্যাপ করুন', 'Tap to speak'],
        'spts.waiting':       ['ইনপুটের অপেক্ষায়...', 'Waiting for input...'],
        'spts.complete':      ['✓ সম্পন্ন!', '✓ Complete!'],
        'spts.needInput':     ['অনুগ্রহ করে বাংলা লেখা লিখুন বা কণ্ঠ ব্যবহার করুন', 'Please enter Bengali text or use voice input'],
        'spts.listening':     ['🎙️ শুনছি... এখন বলুন', '🎙️ Listening... Speak now'],
        'spts.stopped':       ['⏹️ থেমে গেছে (২ সেকেন্ড নীরবতা)', '⏹️ Stopped (2s silence)'],
        'spts.voiceInput':    ['🎤 কণ্ঠ ইনপুট', '🎤 Voice Input'],
        'spts.listeningBtn':  ['🎤 শুনছি...', '🎤 Listening...'],
        'spts.notSupported':  ['🎤 সমর্থিত নয়', '🎤 Not Supported'],

        'status.loading':     ['এআই মডেল লোড হচ্ছে...', 'Loading AI models...'],
        'status.ready':       ['প্রস্তুত!', 'Ready!'],
        'status.cameraOn':    ['ক্যামেরা সক্রিয় — আপনার ইশারা দেখান!', 'Camera active — show your hand gestures!'],
        'status.cameraOff':   ['প্রস্তুত! ক্যামেরা বন্ধ।', 'Ready! Camera stopped.'],
        'status.permissionDenied':  ['অনুমতি দেওয়া হয়নি — ব্রাউজারের সেটিংসে অনুমতি দিন', 'Permission denied — allow it in your browser settings'],
        'status.revokeInBrowser':   ['অনুমতি বাতিল করতে ব্রাউজারের সেটিংস ব্যবহার করুন', 'Use your browser settings to revoke access'],

        'settings.title':     ['সেটিংস', 'Settings'],
        'settings.dictionary':['সমর্থিত ইশারার অভিধান', 'Supported Signs Dictionary'],
        'settings.textSize':  ['লেখার আকার', 'Text Size'],
        'settings.small':     ['ছোট', 'Small'],
        'settings.normal':    ['স্বাভাবিক', 'Normal'],
        'settings.cameraPerm':['ক্যামেরার অনুমতি', 'Camera Permission'],
        'settings.micPerm':   ['মাইক্রোফোনের অনুমতি', 'Microphone Permission'],
        'settings.block':     ['বন্ধ', 'Block'],
        'settings.allow':     ['অনুমতি', 'Allow'],
        'settings.granted':   ['অনুমোদিত', 'Granted'],
        'settings.cameraView':['ক্যামেরা ভিউ', 'Camera View'],
        'settings.landscape': ['আড়াআড়ি', 'Landscape'],
        'settings.portrait':  ['লম্বালম্বি', 'Portrait'],
        'settings.fallback':  ['অবতার না থাকলে', 'Missing Avatar'],
        'settings.text':      ['লেখা', 'Text'],
        'settings.pose':      ['ভঙ্গি', 'Pose'],
        'settings.voiceOut':  ['কণ্ঠ আউটপুট', 'Voice Output'],
        'settings.off':       ['বন্ধ', 'OFF'],
        'settings.on':        ['চালু', 'ON'],
        'settings.voiceLang': ['কণ্ঠের ভাষা', 'Voice Language'],
        'settings.uiLang':    ['ইন্টারফেসের ভাষা', 'Interface Language'],
        'settings.bengali':   ['বাংলা', 'Bengali'],
        'settings.english':   ['ইংরেজি', 'English'],
        'settings.supervisor':['প্রকল্প তত্ত্বাবধায়ক:', 'Project Supervisor:'],
        'settings.madeBy':    ['নির্মাতা:', 'Made by:'],
        'settings.close':     ['বন্ধ করুন', 'Close'],

        'tip.settings':       ['সেটিংস খুলুন', 'Open settings'],
        'tip.back':           ['পিছনে যান', 'Go back'],
        'tip.clearSentence':  ['বাক্য মুছে ফেলুন', 'Clear the sentence'],
        'tip.clearInput':     ['লেখা মুছে ফেলুন', 'Clear the text'],
        'tip.translate':      ['ইশারায় অনুবাদ করুন', 'Translate into signs'],
        'tip.voice':          ['কণ্ঠে বলুন', 'Speak instead of typing'],
        'tip.home':           ['হোম', 'Home'],
        'tip.textSize':       ['অ্যাপের লেখার আকার বদলান', 'Change the app text size'],
        'tip.cameraPerm':     ['ব্রাউজারের ক্যামেরা অনুমতি চান', 'Request browser camera access'],
        'tip.micPerm':        ['ব্রাউজারের মাইক্রোফোন অনুমতি চান', 'Request browser microphone access'],
        'tip.cameraView':     ['ক্যামেরা আড়াআড়ি না লম্বালম্বি', 'Landscape or portrait camera'],
        'tip.fallback':       ['কোনো শব্দের অবতার না থাকলে কী দেখানো হবে', 'What to show when a word has no avatar'],
        'tip.voiceOut':       ['শনাক্ত করা শব্দ শোনানো হবে কিনা', 'Speak detected words aloud'],
        'tip.voiceLang':      ['কোন ভাষায় শব্দ শোনানো হবে', 'Which language the audio plays in'],
        'tip.uiLang':         ['অ্যাপের লেখার ভাষা', 'Language of the app interface'],

        'dict.back':          ['← অ্যাপে ফিরে যান', '← Back to App'],
        'dict.section1':      ['বিভাগ ১: ইশারার ছবি', 'Section 1: Images of Signs'],
        'dict.section2':      ['বিভাগ ২: শনাক্ত হওয়া শব্দ', 'Section 2: Recognised Words'],
        'dict.signsTotal':    ['মোট {n}টি ইশারা — এর মধ্যে {c}টি ক্যামেরা শনাক্ত করতে পারে।',
                               '{n} signs total — {c} of them are recognised by the camera.'],
        'dict.wordsTotal':    ['{n}টি মূল শব্দ, সঙ্গে {v}টি রূপ ও সমার্থক শব্দ।',
                               '{n} core words, plus {v} inflections and synonyms that map onto them.'],
        'dict.forms':         ['+{n}টি রূপ', '+{n} forms'],
        'dict.referencePhoto':['তথ্যচিত্র', 'Reference photo'],
        'dict.loadError':     ['data/signs.json লোড করা যায়নি — ফাইলটি সরাসরি না খুলে ওয়েব সার্ভারের মাধ্যমে চালান (python3 serve.py)।',
                               'Could not load data/signs.json — run the app through a web server (python3 serve.py) rather than opening the file directly.'],
        'dict.loading':       ['অভিধান লোড হচ্ছে…', 'Loading dictionary…']
    },

    t(key, params) {
        const entry = this.strings[key];
        if (!entry) return key;
        const text = this.language === 'bn' ? entry[0] : entry[1];
        if (!params) return text;
        return text.replace(/\{(\w+)\}/g,
            (match, name) => (name in params ? this.number(params[name]) : match));
    },

    /** Bengali text uses Bengali numerals, so 66 should read ৬৬. */
    number(value) {
        const text = String(value);
        if (this.language !== 'bn') return text;
        return text.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
    },

    /** Read the language the app saved, for pages that load before Settings. */
    restore() {
        try {
            const saved = JSON.parse(localStorage.getItem('bdsl-settings'));
            if (saved && (saved.uiLanguage === 'bn' || saved.uiLanguage === 'en')) {
                this.language = saved.uiLanguage;
            }
        } catch (e) {
            /* keep the default */
        }
        return this.language;
    },

    setLanguage(language) {
        this.language = language;
        this.apply();
    },

    /** Swap every element tagged with data-i18n / data-i18n-placeholder / data-i18n-tip. */
    apply(root = document) {
        root.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = this.t(el.dataset.i18n);
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.dataset.i18nPlaceholder);
        });
        root.querySelectorAll('[data-i18n-tip]').forEach(el => {
            el.dataset.tooltip = this.t(el.dataset.i18nTip);
        });
        root.querySelectorAll('[data-i18n-aria]').forEach(el => {
            el.setAttribute('aria-label', this.t(el.dataset.i18nAria));
        });
        document.documentElement.lang = this.language;
    }
};
