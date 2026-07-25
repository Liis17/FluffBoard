import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { api } from './api.js'
import {
  applyOverrides,
  buildColumns,
  getColumnDraft,
  getMetrics,
  getMoveOverrides,
  getProgress,
  toPayload,
  visibleTasks,
} from './board.js'
import { BoardView } from './components/BoardView.jsx'
import { Header } from './components/Header.jsx'
import { LabelFilter } from './components/LabelFilter.jsx'
import { ListView } from './components/ListView.jsx'
import { LoginScreen } from './components/LoginScreen.jsx'
import { NewTaskModal } from './components/NewTaskModal.jsx'
import { ProgressPanel } from './components/ProgressPanel.jsx'
import { StatTiles } from './components/StatTiles.jsx'
import { TableView } from './components/TableView.jsx'
import { TaskModal } from './components/TaskModal.jsx'
import { Toolbar } from './components/Toolbar.jsx'

// Вид доски живёт в URL, чтобы его можно было переслать ссылкой.
function readView() {
  const params = new URLSearchParams(window.location.search)
  return {
    view: params.get('view') || 'board',
    groupBy: params.get('group') || 'status',
    query: params.get('q') || '',
    filters: params.get('labels')?.split(',').filter(Boolean) || [],
  }
}

function writeView({ view, groupBy, query, filters }) {
  const params = new URLSearchParams()
  if (view !== 'board') params.set('view', view)
  if (groupBy !== 'status') params.set('group', groupBy)
  if (query) params.set('q', query)
  if (filters.length > 0) params.set('labels', filters.join(','))

  const search = params.toString()
  window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname)
}

// Назначить можно и логин, которого нет среди участников доски: в репозитории такие уже есть.
// Логины GitHub регистронезависимы, поэтому склейка идёт без учёта регистра, а показывается
// написание из задач — оно совпадает с настоящим.
function getAssigneeCandidates(issues, users, assignable) {
  const candidates = new Map()

  for (const issue of issues) {
    for (const assignee of issue.assignees) {
      candidates.set(assignee.login.toLowerCase(), assignee.login)
    }
  }

  for (const login of assignable) {
    if (!candidates.has(login.toLowerCase())) {
      candidates.set(login.toLowerCase(), login)
    }
  }

  for (const user of users) {
    if (user.gitHubLogin && !candidates.has(user.gitHubLogin.toLowerCase())) {
      candidates.set(user.gitHubLogin.toLowerCase(), user.gitHubLogin)
    }
  }

  return [...candidates.values()].sort((left, right) => left.localeCompare(right))
}

function App() {
  const [user, setUser] = useState(null)
  const [issues, setIssues] = useState([])
  const [statuses, setStatuses] = useState([])
  const [labels, setLabels] = useState([])
  const [users, setUsers] = useState([])
  // Логины, которых GitHub примет исполнителями: у остальных назначение молча пропадёт.
  const [assignable, setAssignable] = useState([])

  const [board, setBoard] = useState(readView)
  const [openNumber, setOpenNumber] = useState(null)
  // Заготовка новой задачи: пустая при создании из шапки, с полем колонки — из колонки.
  const [creating, setCreating] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [overColumn, setOverColumn] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => writeView(board), [board])

  const patchBoard = (change) => setBoard((current) => ({ ...current, ...change }))

  const loadBoard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [loadedIssues, loadedStatuses, loadedLabels, loadedUsers, loadedAssignable] = await Promise.all([
        api('/api/board/issues'),
        api('/api/board/statuses'),
        api('/api/board/labels'),
        api('/api/board/users'),
        api('/api/board/assignees'),
      ])
      setIssues(loadedIssues)
      setStatuses(loadedStatuses)
      setLabels(loadedLabels)
      setUsers(loadedUsers)
      setAssignable(loadedAssignable)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function restoreSession() {
      try {
        setUser(await api('/api/board/me'))
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

  const candidates = useMemo(() => getAssigneeCandidates(issues, users, assignable), [issues, users, assignable])
  const filtered = useMemo(() => visibleTasks(issues, board.query, board.filters), [issues, board.query, board.filters])
  const columns = useMemo(
    () => buildColumns(filtered, board.groupBy, { statuses, candidates, labels }),
    [filtered, board.groupBy, statuses, candidates, labels],
  )
  const metrics = useMemo(() => getMetrics(issues), [issues])
  const progress = useMemo(
    () => getProgress(issues, board.groupBy, { statuses, candidates }),
    [issues, board.groupBy, statuses, candidates],
  )

  const openIssue = issues.find((issue) => issue.number === openNumber) || null

  async function login(username, password) {
    setLoading(true)
    setError('')
    try {
      setUser(await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }))
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
    setOpenNumber(null)
    setError('')
  }

  async function save(task, number) {
    setSaving(true)
    setError('')
    try {
      await (number
        ? api(`/api/board/issues/${number}`, { method: 'PUT', body: JSON.stringify(task) })
        : api('/api/board/issues', { method: 'POST', body: JSON.stringify(task) }))
      setOpenNumber(null)
      setCreating(null)
      await loadBoard()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  // Карточка переезжает в интерфейсе сразу, а при отказе GitHub возвращается на место.
  async function moveTask(number, columnKey) {
    const issue = issues.find((candidate) => candidate.number === number)
    const overrides = issue && getMoveOverrides(issue, board.groupBy, columnKey)
    if (!overrides) {
      return
    }

    const restore = issues
    setIssues((current) => current.map((item) => (
      item.number === number ? applyOverrides(item, overrides, labels) : item
    )))
    setError('')

    try {
      const saved = await api(`/api/board/issues/${number}`, {
        method: 'PUT',
        body: JSON.stringify(toPayload(issue, overrides)),
      })
      setIssues((current) => current.map((item) => (item.number === number ? saved : item)))
    } catch (requestError) {
      setIssues(restore)
      setError(`Не удалось перенести #${number}: ${requestError.message}`)
    }
  }

  // Файл уходит как есть, без JSON: base64 раздул бы его на треть.
  async function uploadAsset(file) {
    const body = new FormData()
    body.append('file', file)
    return api('/api/board/assets', { method: 'POST', body })
  }

  // Ошибку не глотаем: её показывает модалка, где метку и заводят, а общий баннер она перекрывает.
  // Порядок совпадает с тем, в котором метки приходят из GitHub, — по алфавиту без учёта регистра.
  async function createLabel(name) {
    const label = await api('/api/board/labels', { method: 'POST', body: JSON.stringify({ name }) })
    setLabels((current) => [...current, label].sort((left, right) => left.name.localeCompare(right.name)))
    return label
  }

  async function addColumn(name) {
    setSaving(true)
    setError('')
    try {
      const status = await api('/api/board/statuses', { method: 'POST', body: JSON.stringify({ name }) })
      setStatuses((current) => [...current, status])
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
    <div className="page">
      <Header
        user={user}
        loading={loading}
        onRefresh={loadBoard}
        onCreate={() => setCreating({})}
        onLogout={logout}
      />

      <StatTiles metrics={metrics} />

      <Toolbar
        query={board.query}
        view={board.view}
        groupBy={board.groupBy}
        onQuery={(query) => patchBoard({ query })}
        onView={(view) => patchBoard({ view })}
        onGroupBy={(groupBy) => patchBoard({ groupBy })}
      />

      <LabelFilter
        labels={labels}
        filters={board.filters}
        onToggle={(name) => patchBoard({
          filters: board.filters.includes(name)
            ? board.filters.filter((filter) => filter !== name)
            : [...board.filters, name],
        })}
        onReset={() => patchBoard({ filters: [] })}
      />

      <ProgressPanel progress={progress} />

      {error && <p className="message message-error" role="alert">{error}</p>}

      {loading && <p className="message">Загружаем актуальные задачи из GitHub…</p>}

      {!loading && board.view === 'list' && (
        <ListView columns={columns} onOpen={(issue) => setOpenNumber(issue.number)} />
      )}

      {!loading && board.view === 'table' && (
        <TableView columns={columns} statuses={statuses} onOpen={(issue) => setOpenNumber(issue.number)} />
      )}

      {!loading && board.view === 'board' && (
        <BoardView
          columns={columns}
          draggedId={draggedId}
          overColumn={overColumn}
          saving={saving}
          onOpen={(issue) => setOpenNumber(issue.number)}
          onDragStart={setDraggedId}
          onDragEnd={() => {
            setDraggedId(null)
            setOverColumn(null)
          }}
          onDragOver={(event, key) => {
            event.preventDefault()
            setOverColumn(key)
          }}
          onDrop={(key) => {
            setOverColumn(null)
            if (draggedId !== null) {
              moveTask(draggedId, key)
            }
          }}
          onCreateTask={(key) => setCreating(getColumnDraft(board.groupBy, key))}
          onAddColumn={board.groupBy === 'status' ? addColumn : undefined}
        />
      )}

      {creating && (
        <NewTaskModal
          prefill={creating}
          statuses={statuses}
          labels={labels}
          candidates={candidates}
          saving={saving}
          onClose={() => setCreating(null)}
          onCreate={(task) => save(task)}
          onCreateLabel={createLabel}
          onUpload={uploadAsset}
        />
      )}

      {openIssue && (
        <TaskModal
          key={openIssue.number}
          issue={openIssue}
          statuses={statuses}
          labels={labels}
          candidates={candidates}
          saving={saving}
          onClose={() => setOpenNumber(null)}
          onSave={(task) => save(task, openIssue.number)}
          onCreateLabel={createLabel}
          onUpload={uploadAsset}
        />
      )}
    </div>
  )
}

export default App
