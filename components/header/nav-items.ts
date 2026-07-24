// Central nav config (Nav_Footer_Slice_Spec_v1 §1-C). The nav owns config only; each page
// slice updates its own item's href/enabled (decision §7-①). `enabled: false` = not rendered
// (no dead links, decision §7-②). Labels resolve via `nav.<key>` message keys.

export type NavItem = {
  /** Message key under the `nav` namespace and React list key. */
  key: string;
  /** Current (temporary) route; page slices rename later (§7-①). */
  href: string;
  /** When false the item is not rendered until its owning slice turns it on. */
  enabled: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { key: 'service', href: '/service', enabled: false }, // SERVICE slice turns on
  { key: 'studios', href: '/rental', enabled: true }, // STUDIOS slice renames to /studios
  { key: 'product', href: '/experience', enabled: true }, // PRODUCT slice renames to /product
  { key: 'review', href: '/reviews', enabled: false }, // REVIEW slice turns on
  { key: 'blog', href: '/blog', enabled: false }, // BLOG slice turns on
];
