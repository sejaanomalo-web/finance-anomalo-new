import { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useOrg } from '../contexts/useOrg';
import { setTheme } from '../components/app/themeStore';
import { supabase } from '../integrations/supabase/client';
import { useAppSettings, useUpsertAppSetting } from '../hooks/useSupabaseData';
import { Panel } from '../components/ui/Ui';

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const appSettings = useAppSettings(orgId);
  const upsertSetting = useUpsertAppSetting(orgId, user?.id);

  const [profileForm, setProfileForm] = useState({ fullName: profile?.full_name ?? '', avatarUrl: profile?.avatar_url ?? '' });
  const [password, setPassword] = useState('');

  const notificationSetting = useMemo(
    () => (appSettings.data ?? []).find((item) => item.setting_key === 'notification_preferences')?.setting_value ?? { email: true, push: true },
    [appSettings.data],
  );

  const currentTheme = useMemo(
    () => (appSettings.data ?? []).find((item) => item.setting_key === 'appearance_theme')?.setting_value ?? 'dark',
    [appSettings.data],
  );

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profileForm.fullName, avatar_url: profileForm.avatarUrl })
      .eq('id', user.id);

    if (error) throw error;
    await refreshProfile();
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setPassword('');
  };

  return (
    <div className="space-y-4">
      <Panel title="Perfil">
        <form className="grid gap-2 md:grid-cols-3" onSubmit={saveProfile}>
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" placeholder="Nome completo" value={profileForm.fullName} onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))} required />
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" placeholder="URL do avatar" value={profileForm.avatarUrl} onChange={(event) => setProfileForm((prev) => ({ ...prev, avatarUrl: event.target.value }))} />
          <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]" type="submit">Salvar perfil</button>
        </form>
      </Panel>

      <Panel title="Notificações">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] px-3 py-2"
            onClick={() =>
              upsertSetting.mutate({
                key: 'notification_preferences',
                value: { ...(notificationSetting as any), email: !(notificationSetting as any).email },
              })
            }
          >
            E-mail: {(notificationSetting as any).email ? 'Ativo' : 'Inativo'}
          </button>
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] px-3 py-2"
            onClick={() =>
              upsertSetting.mutate({
                key: 'notification_preferences',
                value: { ...(notificationSetting as any), push: !(notificationSetting as any).push },
              })
            }
          >
            Push: {(notificationSetting as any).push ? 'Ativo' : 'Inativo'}
          </button>
        </div>
      </Panel>

      <Panel title="Segurança">
        <form className="grid gap-2 md:grid-cols-3" onSubmit={savePassword}>
          <input className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" type="password" placeholder="Nova senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <div />
          <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]" type="submit">Trocar senha</button>
        </form>
      </Panel>

      <Panel title="Aparência">
        <div className="flex flex-wrap gap-2">
          {(['dark', 'midnight', 'light'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={`rounded-xl border px-3 py-2 ${String(currentTheme) === theme ? 'border-[var(--accent)] bg-[var(--accent)]/20' : 'border-[var(--border)]'}`}
              onClick={() => {
                setTheme(theme);
                upsertSetting.mutate({ key: 'appearance_theme', value: theme });
              }}
            >
              {theme}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
