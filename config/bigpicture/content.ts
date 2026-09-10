import logoSrc from '@/assets/bigpicture/footer_logos.png'

export interface ContentConfig {
  footer: {
    links: { label: string; href: string; external?: boolean }[]
    contact: { email: string }
    fundingText: string
    logoSrc: string
    logoAlt: string
  }
  help: {
    sections: { id: string; title: string; html: string }[]
  }
  search: {
    filterHintHtml: string
  }
}

export const contentConfig: ContentConfig = {
  footer: {
    links: [
      { label: 'About', href: 'https://discovery.bigpicture.eu/' },
      { label: 'Datasets', href: 'https://datasets.bp.nbis.se/index.html' },
      {
        label: 'Privacy policy',
        href: 'https://bigpicture.eu/bigpicture-privacy-notice',
        external: true,
      },
    ],
    contact: { email: 'support@bigpicture.eu' },
    fundingText:
      "This project has received funding from the Innovative Medicines Initiative 2 Joint Undertaking under grant agreement No 945358. This Joint Undertaking receives support from the European Union's Horizon 2020 research and innovation program and EFPIA. www.imi.europa.eu",
    logoSrc,
    logoAlt: 'Logos of BigPicture project partners including EU, IMI, and EFPIA',
  },
  help: {
    sections: [
      {
        id: 'help-filters',
        title: 'How the filters work together',
        html: `<p>When you apply the filters in the dropdown lists, the search combines them in two different ways:</p>
<p><strong>1. Selecting multiple values in the same field:</strong><br>If you select several values within one filter field, the search uses OR logic.<br><em>Example:</em> Selecting <em>Liver</em> and <em>Kidney</em> from the Anatomical Site dropdown will return records related to Liver, Kidney, or both.</p>
<p><strong>2. Combining filters from different fields:</strong><br>When you apply filters in different fields, the search uses AND logic.<br><em>Example:</em> If you select Anatomical Site = <em>Liver</em> and Staining Procedure = <em>H&amp;E stain</em>, the results will only include records that match both criteria.</p>`,
      },
      {
        id: 'help-snomed',
        title: 'The hierarchical SNOMED CT terms',
        html: `<p>The fields <strong>Staining procedure</strong>, <strong>Staining substance</strong>, and <strong>Diagnosis</strong> use SNOMED CT, which organizes concepts in a hierarchy from broad to more specific terms. When a broad term is selected, records coded with any of its more specific subtypes are automatically included.</p>
<p><em>Example:</em> When selecting <em>adenocarcinoma</em> from the Diagnosis dropdown, the search also returns records coded with <em>adenocarcinoma morphologic abnormality</em> as it is one of the subtypes of adenocarcinoma.</p>`,
      },
    ],
  },
  search: {
    filterHintHtml:
      'The fields display available values and the number of matching images. Selecting multiple values within the same field uses OR logic, while selections across different fields use AND logic. For more information, click the <strong>?</strong> Help icon in the top-right corner.',
  },
}
