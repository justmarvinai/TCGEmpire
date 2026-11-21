import clsx from 'clsx'
import { useState, type FormEvent } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { errorText, rpc, RpcError } from '@/lib/rpc.ts'
import type { Me } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useSetMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

type Mode = 'login' | 'register'

export function AuthPage({ me, localMode }: { me: Me; localMode: boolean }) {
  const setMe = useSetMe()
  // On a fresh server nobody can log in yet: start on "Neu hier".
  const [mode, setMode] = useState<Mode>(me.server.has_invite_code ? 'login' : 'register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'register') {
        setMe(await rpc('join', { p_username: username, p_password: password, p_invite_code: invite }))
      } else {
        const res = await rpc('login', { p_username: username, p_password: password })
        if (res.error !== null) throw new RpcError(res.error)
        setMe({ player: res.player, server: res.server })
      }
      sfx('success')
    } catch (err) {
      setError(errorText(err))
      sfx('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-bg grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <PixelIcon name="card" scale={4} className="mx-auto text-accent" />
          <h1 className="mt-3 font-pixel text-5xl leading-none">
            TCG<span className="text-accent">Empire</span>
          </h1>
          <p className="mt-2 text-sm text-fg-2">{texts.brand.claim}</p>
        </div>

        <form onSubmit={submit} className="px-panel p-4">
          <div className="mb-4 grid grid-cols-2 gap-1 bg-ink p-1" role="tablist">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                  sfx('toggle')
                }}
                className={clsx('h-9 font-semibold', mode === m ? 'bg-surface-3 text-fg' : 'text-fg-3 hover:text-fg')}
              >
                {texts.auth[m]}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Field
              label={texts.auth.username}
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              hint={mode === 'register' ? texts.auth.usernameHint : undefined}
              maxLength={16}
              required
              autoFocus
            />
            <Field
              label={texts.auth.password}
              name="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={mode === 'register' ? texts.auth.passwordHint : undefined}
              maxLength={72}
              required
            />
            {mode === 'register' && (
              <Field
                label={texts.auth.invite}
                name="invite"
                autoComplete="off"
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                hint={me.server.has_invite_code ? texts.auth.inviteHint : texts.auth.firstAccount}
                maxLength={64}
                required
              />
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 bg-loss/15 p-2 text-sm text-loss animate-shake">
              <PixelIcon name="close" className="mt-0.5" />
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-4 w-full">
            {mode === 'register' ? texts.auth.submitRegister : texts.auth.submitLogin}
          </Button>
        </form>

        {localMode && <p className="mt-4 text-center text-xs text-fg-3">{texts.auth.localMode}</p>}
      </div>
    </div>
  )
}
