import * as CookieConsent from 'vanilla-cookieconsent'
import 'vanilla-cookieconsent/dist/cookieconsent.css'
import type { App } from 'vue'

const config: CookieConsent.CookieConsentConfig = {
  guiOptions: {
    consentModal: {
      layout: 'box',
      position: 'bottom right',
      equalWeightButtons: false,
      flipButtons: false,
    },
  },
  categories: {
    necessary: {
      readOnly: true,
      enabled: true,
    },
  },
  language: {
    default: 'en',
    translations: {
      en: {
        consentModal: {
          title: 'Cookie notice',
          description:
            'This website uses essential authentication cookies to keep you logged in during your session.',
          acceptAllBtn: 'OK',
          footer: `<a href="https://bigpicture.eu/bigpicture-privacy-notice" target="_blank" rel="noopener noreferrer">Privacy policy</a>`,
        },
        preferencesModal: {
          title: 'Cookie preferences',
          acceptAllBtn: 'OK',
          savePreferencesBtn: 'Save',
          closeIconLabel: 'Close',
          sections: [],
        },
      },
    },
  },
}

export default {
  install: (app: App) => {
    app.config.globalProperties.$CookieConsent = CookieConsent
    CookieConsent.run(config)
  },
}
