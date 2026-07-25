import { useState } from 'react'

export function LoginScreen({ onLogin, error, loading }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function submit(event) {
    event.preventDefault()
    onLogin(username, password)
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="board-logo">F</span>
        <h1>Вход на доску</h1>
        <p className="login-hint">Задачи этой доски синхронизированы с GitHub.</p>

        <label className="field">
          Логин
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="message message-error" role="alert">{error}</p>}
        <button className="button-primary" type="submit" disabled={loading}>
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
