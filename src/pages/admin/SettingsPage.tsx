import { useState, useEffect, useMemo } from 'react';
import type { NavConfig, NavSite, ThemeMode } from '../../lib/navTypes';
import { useI18n } from '../../lib/useI18n';
import { AdminCombobox } from './AdminCombobox';

interface SettingsPageProps {
  config: NavConfig;
  onSave: (next: NavConfig) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onReset?: () => void;
}

export function SettingsPage({ config, onSave, onDirtyChange, onReset }: SettingsPageProps) {
  const { m } = useI18n();
  const [site, setSite] = useState<NavSite>(config.site);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = JSON.stringify(site) !== JSON.stringify(config.site);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ ...config, site });
    setIsSaving(false);
  };

  const handleChange = <K extends keyof NavSite>(key: K, value: NavSite[K]) => {
    setSite(prev => ({ ...prev, [key]: value }));
  };

  const themeOptions = useMemo(() => [
    { value: 'system', label: m.admin.themeSystem },
    { value: 'light', label: m.admin.themeLight },
    { value: 'dark', label: m.admin.themeDark },
  ], [m.admin]);

  return (
    <div className="admin-settings-page">
      <header className="admin-header">
        <h1 className="admin-title">{m.admin.settings}</h1>
        <div className="admin-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? m.admin.saving : m.admin.save}
          </button>
        </div>
      </header>

      <div className="admin-settings-container">
        <section className="admin-settings-section">
          <header className="admin-settings-section-header">
            <h2 className="admin-settings-section-title">
              {m.admin.settingsGeneral}
            </h2>
          </header>
          <div className="admin-settings-section-body">
            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.siteTitle}</label>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.title}
                onChange={e => handleChange('title', e.target.value)}
              />
            </div>

            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.sidebarTitle}</label>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.sidebarTitle || ''}
                onChange={e => handleChange('sidebarTitle', e.target.value)}
              />
            </div>

            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.bannerTitle}</label>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.bannerTitle || ''}
                onChange={e => handleChange('bannerTitle', e.target.value)}
              />
            </div>

            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.siteDescription}</label>
              </div>
              <textarea
                className="admin-input"
                rows={3}
                value={site.description || ''}
                onChange={e => handleChange('description', e.target.value)}
              />
            </div>

            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.timeZone}</label>
                <span className="admin-settings-hint">e.g. Asia/Shanghai</span>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.timeZone || ''}
                onChange={e => handleChange('timeZone', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="admin-settings-section">
          <header className="admin-settings-section-header">
            <h2 className="admin-settings-section-title">
              {m.admin.settingsAppearance}
            </h2>
          </header>
          <div className="admin-settings-section-body">
            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.defaultTheme}</label>
              </div>
              <AdminCombobox
                className="admin-combobox"
                inputClassName="admin-select"
                listClassName="admin-combobox-list"
                options={themeOptions}
                value={site.defaultTheme || 'system'}
                onChange={val => handleChange('defaultTheme', val as ThemeMode)}
              />
            </div>

            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.sidebarAvatar}</label>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.sidebarAvatarSrc || ''}
                onChange={e => handleChange('sidebarAvatarSrc', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="admin-settings-section">
          <header className="admin-settings-section-header">
            <h2 className="admin-settings-section-title">
              {m.admin.settingsAdvanced}
            </h2>
          </header>
          <div className="admin-settings-section-body">
            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.deployedDomain}</label>
                <span className="admin-settings-hint">e.g. nav.du.dev</span>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.deployedDomain || ''}
                onChange={e => handleChange('deployedDomain', e.target.value)}
              />
            </div>

            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.faviconProxy}</label>
                <span className="admin-settings-hint">e.g. /ico</span>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.faviconProxyBase || ''}
                onChange={e => handleChange('faviconProxyBase', e.target.value)}
              />
            </div>

            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.adminPath}</label>
                <span className="admin-settings-hint">default: /admin</span>
              </div>
              <input
                type="text"
                className="admin-input"
                value={site.adminPath || ''}
                onChange={e => handleChange('adminPath', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="admin-settings-section is-danger">
          <header className="admin-settings-section-header">
            <h2 className="admin-settings-section-title">
              {m.admin.settingsDangerZone}
            </h2>
          </header>
          <div className="admin-settings-section-body">
            <div className="admin-settings-item">
              <div className="admin-settings-label-wrap">
                <label className="admin-settings-label">{m.admin.reset}</label>
                <span className="admin-settings-hint">{m.admin.resetConfirm}</span>
              </div>
              <div className="admin-settings-actions">
                <button
                  className="btn btn-danger"
                  onClick={onReset}
                >
                  {m.admin.reset}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
