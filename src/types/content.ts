export interface ContentConfig {
  navLogo: {
    src: string
    alt: string
  }
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
