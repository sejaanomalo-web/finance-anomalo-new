import { useEffect } from 'react';
import { useAppSettings } from '../../hooks/useSupabaseData';
import { useOrg } from '../../contexts/useOrg';
import { getStoredTheme, normalizeTheme, setTheme } from './themeStore';

export function AppThemeSync() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const { data } = useAppSettings(orgId);

  useEffect(() => {
    const theme = getStoredTheme();
    setTheme(theme);
  }, []);

  useEffect(() => {
    if (!data) return;

    const themeSetting = data.find((item) => item.setting_key === 'appearance_theme');
    const theme = normalizeTheme(themeSetting?.setting_value);
    setTheme(theme);
  }, [data]);

  return null;
}
