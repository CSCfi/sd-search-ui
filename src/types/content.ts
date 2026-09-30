export type AnnouncementVariant = 'info' | 'warning'

/**
 * Every field is optional and may be `null`; omit or null the ones you don't need.
 * The banner is hidden unless both `id` and `html` are set.
 */
export interface AnnouncementConfig {
  /** Changing the id shows the announcement again to users who dismissed it. */
  id?: string | null
  /** Message HTML (may contain links). Comes from trusted repo config. */
  html?: string | null
  /** Defaults to 'info'. */
  variant?: AnnouncementVariant | null
  /** Defaults to true. */
  dismissible?: boolean | null
  /** ISO date/time; announcement is hidden before this. */
  startsAt?: string | null
  /** ISO date/time; announcement is hidden after this. */
  endsAt?: string | null
}

export interface ContentConfig {
  announcement?: AnnouncementConfig
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
