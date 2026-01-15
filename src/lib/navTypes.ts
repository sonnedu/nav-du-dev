export type ThemeMode = 'light' | 'dark' | 'system'

export type IconConfig =
  | { type: 'proxy'; value?: string }
  | { type: 'url'; value: string }
  | { type: 'base64'; value: string };

export type NavLink = {
  id: string;
  name: string;
  url: string;
  desc?: string;
  tags?: string[];
  icon?: IconConfig;
};

export type NavCategory = {
  id: string;
  name: string;
  group?: string;
  icon?: string;
  order?: number;
  items: NavLink[];
};

export type NavSite = {
  title: string;
  sidebarTitle?: string;
  bannerTitle?: string;
  description?: string;
  defaultTheme?: ThemeMode;
  timeZone?: string;
  sidebarAvatarSrc?: string;
  deployedDomain?: string;
  faviconProxyBase?: string;
  adminPath?: string;

  // Optional ordering hint for admin-managed category groups.
  // Does not affect the public schema if omitted.
  groupOrder?: string[];
};

export type NavConfig = {
  site: NavSite;
  categories: NavCategory[];
};

export type IndexedNavLink = NavLink & {
  categoryId: string;
  categoryName: string;
  urlHost: string;
  namePinyinFull: string;
  namePinyinInitials: string;
  descPinyinFull: string;
  descPinyinInitials: string;
  searchable: string;
};
