'use client';

import { useActionState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { loginAction, type LoginState } from './actions';

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="mt-7 space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <label>
        <span className="atlas-label">用户名</span>
        <input className="atlas-input" name="username" autoComplete="username" required autoFocus />
      </label>
      <label>
        <span className="atlas-label">访问密码</span>
        <input className="atlas-input" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div> : null}
      <button disabled={pending} className="atlas-button-primary h-11 w-full disabled:cursor-wait disabled:opacity-70">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {pending ? '正在验证…' : '验证并进入'}
      </button>
    </form>
  );
}
