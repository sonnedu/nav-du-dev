import { DEFAULT_CATEGORY_ICONS } from '../navIcons';
import type { NavCategory, NavConfig, NavLink } from '../navTypes';

function normalizeGroupName(input: string): string {
  return input.trim();
}

function buildNextCategoryOrder(categories: NavCategory[]): NavCategory[] {
  return categories.map((c, index) => ({ ...c, order: (index + 1) * 10 }));
}

export function ensureGroupOrder(config: NavConfig): NavConfig {
  const seen = new Set<string>();
  const groups: string[] = [];

  for (const c of config.categories) {
    const g = normalizeGroupName(c.group ?? '');
    if (!g) continue;
    if (seen.has(g)) continue;
    seen.add(g);
    groups.push(g);
  }

  const preferred = config.site.groupOrder ?? [];
  const preferredNormalized = preferred.map(normalizeGroupName).filter(Boolean);

  const merged: string[] = [];
  const mergedSet = new Set<string>();

  for (const g of preferredNormalized) {
    if (!mergedSet.has(g)) {
      merged.push(g);
      mergedSet.add(g);
    }
  }

  for (const g of groups) {
    if (!mergedSet.has(g)) {
      merged.push(g);
      mergedSet.add(g);
    }
  }

  return {
    ...config,
    site: {
      ...config.site,
      groupOrder: merged.length ? merged : undefined,
    },
  };
}

export function ensureCategoryIconsFromDefaults(
  config: NavConfig,
  options?: { skipCategoryIds?: ReadonlySet<string> },
): NavConfig {
  const skip = options?.skipCategoryIds;

  let changed = false;

  const categories = config.categories.map((c) => {
    if (c.icon) return c;
    if (skip?.has(c.id)) return c;

    const fallback = DEFAULT_CATEGORY_ICONS[c.id];
    if (!fallback) return c;

    changed = true;
    return { ...c, icon: fallback };
  });

  if (!changed) return config;

  return { ...config, categories };
}

export function renameCategoryGroup(config: NavConfig, fromGroup: string, toGroup: string): NavConfig {
  const from = normalizeGroupName(fromGroup);
  const to = normalizeGroupName(toGroup);
  if (!from) return config;
  if (!to || to === from) return config;

  const nextCategories = config.categories.map((c) => {
    const g = normalizeGroupName(c.group ?? '');
    if (g !== from) return c;
    return { ...c, group: to };
  });

  const order = config.site.groupOrder ?? [];
  const nextOrder = order.map((g) => (normalizeGroupName(g) === from ? to : normalizeGroupName(g))).filter(Boolean);

  return ensureGroupOrder({
    ...config,
    site: { ...config.site, groupOrder: nextOrder },
    categories: nextCategories,
  });
}

export function deleteCategoryGroup(config: NavConfig, group: string): NavConfig {
  const g = normalizeGroupName(group);
  if (!g) return config;

  const nextCategories = config.categories.map((c) => {
    const cg = normalizeGroupName(c.group ?? '');
    if (cg !== g) return c;
    return { ...c, group: undefined };
  });

  const order = config.site.groupOrder ?? [];
  const nextOrder = order.map(normalizeGroupName).filter((x) => x && x !== g);

  return ensureGroupOrder({
    ...config,
    site: { ...config.site, groupOrder: nextOrder },
    categories: nextCategories,
  });
}

export function upsertLinkInCategory(config: NavConfig, categoryId: string, link: NavLink): NavConfig {
  return {
    ...config,
    categories: config.categories.map((c) => {
      if (c.id !== categoryId) return c;
      const existingIndex = c.items.findIndex((i) => i.id === link.id);
      const items = [...c.items];
      if (existingIndex >= 0) items[existingIndex] = link;
      else items.push(link);
      return { ...c, items };
    }),
  };
}

export function removeLinksFromCategory(config: NavConfig, categoryId: string, linkIds: string[]): NavConfig {
  const toRemove = new Set(linkIds);

  return {
    ...config,
    categories: config.categories.map((c) => {
      if (c.id !== categoryId) return c;
      return { ...c, items: c.items.filter((i) => !toRemove.has(i.id)) };
    }),
  };
}

export function moveLinksToCategory(
  config: NavConfig,
  fromCategoryId: string,
  toCategoryId: string,
  linkIds: string[],
): NavConfig {
  const wanted = new Set(linkIds);

  const toMove: NavLink[] = [];
  const nextCategories = config.categories.map((c) => {
    if (c.id === fromCategoryId) {
      const remaining: NavLink[] = [];
      for (const item of c.items) {
        if (wanted.has(item.id)) toMove.push(item);
        else remaining.push(item);
      }
      return { ...c, items: remaining };
    }

    if (c.id === toCategoryId) {
      return { ...c, items: [...c.items, ...toMove] };
    }

    return c;
  });

  return { ...config, categories: nextCategories };
}

export function reorderCategoriesByIds(config: NavConfig, orderedCategoryIds: string[]): NavConfig {
  const byId = new Map(config.categories.map((c) => [c.id, c] as const));
  const next: NavCategory[] = [];

  for (const id of orderedCategoryIds) {
    const c = byId.get(id);
    if (c) next.push(c);
  }

  for (const c of config.categories) {
    if (!orderedCategoryIds.includes(c.id)) next.push(c);
  }

  return ensureGroupOrder({
    ...config,
    categories: buildNextCategoryOrder(next),
  });
}

export function reorderLinksInCategoryByIds(config: NavConfig, categoryId: string, orderedLinkIds: string[]): NavConfig {
  return {
    ...config,
    categories: config.categories.map((c) => {
      if (c.id !== categoryId) return c;

      const byId = new Map(c.items.map((i) => [i.id, i] as const));
      const next: NavLink[] = [];

      for (const id of orderedLinkIds) {
        const item = byId.get(id);
        if (item) next.push(item);
      }

      for (const item of c.items) {
        if (!orderedLinkIds.includes(item.id)) next.push(item);
      }

      return { ...c, items: next };
    }),
  };
}
