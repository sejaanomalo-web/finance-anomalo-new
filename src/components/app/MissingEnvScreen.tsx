import { missingSupabaseEnvKeys } from '../../integrations/supabase/client';

export function MissingEnvScreen() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-red-400/40 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">Configuracao pendente</p>
          <h1 className="mt-3 text-2xl font-semibold">Variaveis de ambiente do Supabase nao encontradas</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            O deploy carregou sem as chaves obrigatorias do frontend. Configure as variaveis abaixo no projeto da
            Vercel e faca um novo deploy para liberar o app.
          </p>

          <ul className="mt-6 space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm">
            {missingSupabaseEnvKeys.map((envKey) => (
              <li key={envKey} className="text-amber-300">
                {envKey}
              </li>
            ))}
          </ul>

          <ol className="mt-6 space-y-2 text-sm leading-relaxed text-slate-300">
            <li>1. Vercel dashboard - Project - Settings - Environment Variables.</li>
            <li>2. Adicione as duas chaves faltantes para `Production`, `Preview` e `Development`.</li>
            <li>3. Clique em `Redeploy` no ultimo deployment para recompilar com as novas envs.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
