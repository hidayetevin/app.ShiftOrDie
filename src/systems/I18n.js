import tr from '../locales/tr.json';
import en from '../locales/en.json';

class I18n {
    constructor() {
        this.locales = { tr, en };
        this.currentLang = this.getInitialLanguage();
    }

    getInitialLanguage() {
        const saved = localStorage.getItem('language');
        if (saved) return saved;

        const browser = navigator.language.split('-')[0];
        return ['tr', 'en'].includes(browser) ? browser : 'en';
    }

    setLanguage(lang) {
        if (this.locales[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            return true;
        }
        return false;
    }

    t(path, variables = {}) {
        const keys = path.split('.');
        let text = keys.reduce((obj, key) => obj && obj[key], this.locales[this.currentLang]);

        if (!text) return path;

        // Replace variables {{var}}
        Object.entries(variables).forEach(([key, value]) => {
            text = text.replace(`{{${key}}}`, value);
        });

        return text;
    }
}

export const i18n = new I18n();
