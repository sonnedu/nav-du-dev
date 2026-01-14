import navYaml from '../data/nav.yaml?raw';

import { parseNavConfigFromYaml, sortCategories } from './navLoad';
import type { NavConfig } from './navTypes';

export function loadNavConfig(): NavConfig {
  return sortCategories(parseNavConfigFromYaml(navYaml));
}
