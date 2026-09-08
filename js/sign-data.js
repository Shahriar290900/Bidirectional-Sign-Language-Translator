// SIGN DATA — Loads data/signs.json and resolves Bengali words to signs.
// Shared by both translation directions.

const SignData = {
    signs: [],
    _byWord: new Map(),
    _byClass: new Map(),

    // Longest first, so "গুলো" is tried before "ো".
    SUFFIXES: ["গুলো", "গুলি", "ছিল", "দের", "ের", "তে", "ছি", "ছে", "বো", "বে",
               "কে", "তা", "টা", "টি", "র", "এ", "য়"].sort((a, b) => b.length - a.length),

    async load() {
        const resp = await fetch(CONFIG.SIGNS_PATH);
        if (!resp.ok) throw new Error('signs.json not found');
        this.signs = (await resp.json()).signs;

        for (const sign of this.signs) {
            this._byWord.set(this.normalize(sign.bn), sign);
            for (const variant of sign.variants) {
                this._byWord.set(this.normalize(variant), sign);
            }
            if (sign.classIndex !== null) this._byClass.set(sign.classIndex, sign);
        }
        Utils.log(`[SignData] ${this.signs.length} signs, ${this._byWord.size} searchable words`, 'success');
    },

    // NFC everywhere: the JSON, the filenames and the speech-recognition output must agree.
    normalize(text) {
        return text.normalize('NFC');
    },

    byClassIndex(index) {
        return this._byClass.get(index) || null;
    },

    lookup(word) {
        const normalized = this.normalize(word);
        const direct = this._byWord.get(normalized);
        if (direct) return direct;

        for (const suffix of this.SUFFIXES) {
            if (normalized.length > suffix.length && normalized.endsWith(suffix)) {
                const root = normalized.slice(0, -suffix.length);
                if (root.length < 2) continue;
                const match = this._byWord.get(root);
                if (match) return match;
            }
        }
        return null;
    },

    avatarUrl(sign) {
        return CONFIG.AVATAR_DIR + sign.avatar;
    },

    audioUrl(sign, language) {
        if (!sign.hasAudio) return null;
        return `${CONFIG.AUDIO_DIR}${sign.slug}_${language}.mp3`;
    }
};
