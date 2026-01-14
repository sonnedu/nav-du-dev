import { useEffect, useMemo, useState } from 'react';

import navYaml from '../data/nav.yaml?raw';

import { parseNavConfigFromYaml, sortCategories } from './navLoad';
import type { NavConfig } from './navTypes';
import { isNavConfig } from './navValidate';
import { apiGetNavConfig, apiPutNavConfig } from './navApi';

function loadBaseConfig(): NavConfig {
  return sortCategories(parseNavConfigFromYaml(navYaml));
}

export function useNavConfig(): {
  baseConfig: NavConfig;
  config: NavConfig;
  isRemoteLoaded: boolean;
  saveConfigRemote: (next: NavConfig) => Promise<boolean>;
  resetRemoteToBase: () => Promise<boolean>;
  reloadRemote: () => Promise<void>;
} {
  const baseConfig = useMemo(() => loadBaseConfig(), []);

  const [config, setConfig] = useState<NavConfig>(baseConfig);
  const [isRemoteLoaded, setIsRemoteLoaded] = useState(false);

  const reloadRemote = async () => {
    const remote = await apiGetNavConfig();
    if (remote && isNavConfig(remote)) {
      setConfig(sortCategories(remote));
    }
    setIsRemoteLoaded(true);
  };

  useEffect(() => {
    let cancelled = false;

    apiGetNavConfig()
      .then((remote) => {
        if (cancelled) return;
        if (remote && isNavConfig(remote)) setConfig(sortCategories(remote));
      })
      .finally(() => {
        if (!cancelled) setIsRemoteLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveConfigRemote = async (next: NavConfig) => {
    const sorted = sortCategories(next);
    const ok = await apiPutNavConfig(sorted);
    if (ok) setConfig(sorted);
    return ok;
  };

  const resetRemoteToBase = async () => {
    return saveConfigRemote(baseConfig);
  };

  return { baseConfig, config, isRemoteLoaded, saveConfigRemote, resetRemoteToBase, reloadRemote };
}
