import { useCallback, useEffect, useState } from 'react'
import './App.css'

// Порядок и цвета — из docs/handoff_fluffboard_board/01-tokens.md.
const priorities = [
  { id: 'urgent', title: 'Срочно', color: '#dc2626' },
  { id: 'high', title: 'Высокий', color: '#ea580c' },
  { id: 'medium', title: 'Средний', color: '#ca8a04' },
  { id: 'low', title: 'Низкий', color: '#64748b' },
  { id: 'none', title: 'Без приоритета', color: '#94a3b8' },
]

function getPriority(id) {
  return priorities.find((priority) => priority.id === id) || priorities.at(-1)
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    throw new Error(data?.detail || data?.title || 'Не удалось выполнить запрос.')
  }

  return data
}

function TaskEditor({ issue, statuses, labels, users, onCancel, onSave, saving }) {
  const [title, setTitle] = useState(issue?.title || '')
  const [body, setBody] = useState(issue?.body || '')
  const [status, setStatus] = useState(issue?.status || 'todo')
  const [priority, setPriority] = useState(issue?.priority || 'medium')
  const [selectedLabels, setSelectedLabels] = useState(() => issue?.labels.map((label) => label.name) || [])
  const [assignee, setAssignee] = useState(issue?.assignees[0]?.login || '')

  function toggleLabel(labelName) {
    setSelectedLabels((current) => (
      current.includes(labelName)
        ? current.filter((label) => label !== labelName)
        : [...current, labelName]
    ))
  }

  function submit(event) {
    event.preventDefault()
    onSave({
      title,
      body,
      labels: selectedLabels,
      assignee: assignee || null,
      status,
      priority,
    })
  }

  return (
    <section className="editor" aria-label={issue ? 'Редактирование задачи' : 'Новая задача'}>
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{issue ? `Задача #${issue.number}` : 'Новая задача'}</p>
          <h2>{issue ? 'Редактировать задачу' : 'Создать задачу'}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Закрыть">×</button>
      </div>

      <form className="task-form" onSubmit={submit}>
        <label>
          Название
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="256" required autoFocus />
        </label>
        <label>
          Описание
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows="5" placeholder="Контекст задачи в GitHub Markdown" />
        </label>
        <label>
          Статус
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((column) => <option value={column.key} key={column.key}>{column.name}</option>)}
          </select>
        </label>
        <label>
          Приоритет
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            {priorities.map((level) => <option value={level.id} key={level.id}>{level.title}</option>)}
          </select>
        </label>
        <label>
          Исполнитель
          <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">Не назначен</option>
            {assignee && !users.some((user) => user.gitHubLogin === assignee) && (
              <option value={assignee}>@{assignee} (аккаунт GitHub не привязан к доске)</option>
            )}
            {users.filter((user) => user.gitHubLogin).map((user) => (
              <option value={user.gitHubLogin} key={user.id}>
                {user.username} (@{user.gitHubLogin})
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Метки GitHub</legend>
          <div className="label-picker">
            {labels.map((label) => (
              <label className="label-option" key={label.name}>
                <input
                  type="checkbox"
                  checked={selectedLabels.includes(label.name)}
                  onChange={() => toggleLabel(label.name)}
                />
                <span className="label-dot" style={{ backgroundColor: `#${label.color}` }} />
                {label.name}
              </label>
            ))}
            {labels.length === 0 && <span className="empty">Меток в репозитории нет.</span>}
          </div>
        </fieldset>
        <div className="editor-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Отмена</button>
          <button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : issue ? 'Сохранить в GitHub' : 'Создать в GitHub'}</button>
        </div>
      </form>
    </section>
  )
}

function TaskCard({ issue, onEdit }) {
  const assignees = issue.assignees.length > 0 ? issue.assignees.map((assignee) => assignee.login).join(', ') : 'Не назначен'
  const priority = getPriority(issue.priority)

  return (
    <article className="task-card" style={{ borderLeft: `3px solid ${priority.color}` }}>
      <button className="task-card-button" type="button" onClick={() => onEdit(issue)}>
        <span className="task-number">#{issue.number}</span>
        <strong>{issue.title}</strong>
        {issue.labels.length > 0 && (
          <span className="task-labels">
            {issue.labels.map((label) => (
              <span className="task-label" key={label.name} style={{ backgroundColor: `#${label.color}` }}>{label.name}</span>
            ))}
          </span>
        )}
        <span className="task-assignee">{assignees}</span>
      </button>
      <a className="github-link" href={issue.htmlUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
    </article>
  )
}

function LoginScreen({ onLogin, error, loading }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function submit(event) {
    event.preventDefault()
    onLogin(username, password)
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">FluffBoard</p>
        <h1>Вход на доску</h1>
        <p>Задачи этой доски синхронизированы с GitHub.</p>
        <label>
          Логин
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Пароль
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="message error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Входим…' : 'Войти'}</button>
      </form>
    </main>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [issues, setIssues] = useState([])
  const [statuses, setStatuses] = useState([])
  const [labels, setLabels] = useState([])
  const [users, setUsers] = useState([])
  const [editorIssue, setEditorIssue] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadBoard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [loadedIssues, loadedStatuses, loadedLabels, loadedUsers] = await Promise.all([
        api('/api/board/issues'),
        api('/api/board/statuses'),
        api('/api/board/labels'),
        api('/api/board/users'),
      ])
      setIssues(loadedIssues)
      setStatuses(loadedStatuses)
      setLabels(loadedLabels)
      setUsers(loadedUsers)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function restoreSession() {
      try {
        const currentUser = await api('/api/board/me')
        setUser(currentUser)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (user) {
      loadBoard()
    }
  }, [user, loadBoard])

  async function login(username, password) {
    setLoading(true)
    setError('')
    try {
      const currentUser = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setUser(currentUser)
    } catch (requestError) {
      setError(requestError.message)
      setLoading(false)
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setIssues([])
    setStatuses([])
    setEditorIssue(undefined)
    setError('')
  }

  async function saveTask(task) {
    setSaving(true)
    setError('')
    try {
      if (editorIssue) {
        await api(`/api/board/issues/${editorIssue.number}`, { method: 'PUT', body: JSON.stringify(task) })
      } else {
        await api('/api/board/issues', { method: 'POST', body: JSON.stringify(task) })
      }
      setEditorIssue(undefined)
      await loadBoard()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return <LoginScreen onLogin={login} error={error} loading={loading} />
  }

  return (
    <main className="board-page">
      <header className="board-header">
        <div>
          <p className="eyebrow">FluffBoard · GitHub issues</p>
          <h1>Доска задач</h1>
        </div>
        <div className="account-controls">
          <span>{user.username}</span>
          <button className="secondary-button" type="button" onClick={logout}>Выйти</button>
        </div>
      </header>

      <div className="board-toolbar">
        <p>Все изменения задач сразу записываются в GitHub.</p>
        <button type="button" onClick={() => setEditorIssue(null)}>+ Новая задача</button>
      </div>

      {error && <p className="message error" role="alert">{error}</p>}
      {loading ? (
        <p className="message">Загружаем актуальные задачи из GitHub…</p>
      ) : (
        <section className="kanban" aria-label="Доска задач">
          {statuses.map((column) => {
            const columnIssues = issues.filter((issue) => issue.status === column.key)
            return (
              <section className="kanban-column" key={column.key}>
                <header>
                  <h2>{column.name}</h2>
                  <span>{columnIssues.length}</span>
                </header>
                <div className="task-stack">
                  {columnIssues.map((issue) => <TaskCard issue={issue} onEdit={setEditorIssue} key={issue.number} />)}
                  {columnIssues.length === 0 && <p className="empty-column">Нет задач</p>}
                </div>
              </section>
            )
          })}
        </section>
      )}

      {editorIssue !== undefined && (
        <TaskEditor
          issue={editorIssue}
          statuses={statuses}
          labels={labels}
          users={users}
          onCancel={() => setEditorIssue(undefined)}
          onSave={saveTask}
          saving={saving}
          key={editorIssue?.number || 'new'}
        />
      )}
    </main>
  )
}

export default App
