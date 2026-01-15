import type { NavCategory } from './navTypes';

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  dev: '💻',
  ai: '🤖',
  tools: '🧰',
  docs: '📚',
  search: '🔎',
  productivity: '✅',
  design: '🎨',
  cloud: '☁️',
  devops: '⚙️',
  news: '📰',
  video: '🎬',
  shopping: '🛒',
  finance: '💰',
  misc: '📌',
};

export function getCategoryIcon(category: NavCategory): string {
  return category.icon || DEFAULT_CATEGORY_ICONS[category.id] || '📌';
}
