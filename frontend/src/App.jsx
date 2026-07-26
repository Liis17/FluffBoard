import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { api } from './api.js'
import { clearBoardCache, readBoardCache, writeBoardCache } from './boardCache.js'
import {
  applyOverrides,
  buildColumns,
  getColumnDraft,
  getMetrics,
  getMoveOverrides,
  getProgress,
  mergeBoardIssues,
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

  for (const { login } of assignable) {
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

function getAvatarUrls(issues, assignable) {
  const avatarUrls = new Map()

  for (const issue of issues) {
    for (const assignee of issue.assignees) {
      if (assignee.avatarUrl) avatarUrls.set(assignee.login.toLowerCase(), assignee.avatarUrl)
    }
  }

  for (const assignee of assignable) {
    if (assignee.avatarUrl) avatarUrls.set(assignee.login.toLowerCase(), assignee.avatarUrl)
  }

  return avatarUrls
}

function App() {
  const [user, setUser] = useState(null)
  const [issues, setIssues] = useState([])
  const [statuses, setStatuses] = useState([])
  const [labels, setLabels] = useState([])
  const [users, setUsers] = useState([])
  // Логины, которых GitHub примет исполнителями: у остальных назначение молча пропадёт.
  const [assignable, setAssignable] = useState([])
  const [boardReady, setBoardReady] = useState(false)

  const [board, setBoard] = useState(readView)
  const [openNumber, setOpenNumber] = useState(null)
  // Заготовка новой задачи: пустая при создании из шапки, с полем колонки — из колонки.
  const [creating, setCreating] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [overColumn, setOverColumn] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingIssueNumbers, setPendingIssueNumbers] = useState([])
  const [error, setError] = useState('')
  const pendingIssueNumbersRef = useRef(new Set())

  useEffect(() => writeView(board), [board])

  const patchBoard = (change) => setBoard((current) => ({ ...current, ...change }))

  const setIssuePending = useCallback((number, pending) => {
    const next = new Set(pendingIssueNumbersRef.current)
    if (pending) next.add(number)
    else next.delete(number)
    pendingIssueNumbersRef.current = next
    setPendingIssueNumbers([...next])
  }, [])

  const applyBoard = useCallback(({ issues: loadedIssues, statuses: loadedStatuses, labels: loadedLabels, users: loadedUsers, assignable: loadedAssignable }) => {
    setIssues((current) => mergeBoardIssues(current, loadedIssues, pendingIssueNumbersRef.current))
    setStatuses(loadedStatuses)
    setLabels(loadedLabels)
    setUsers(loadedUsers)
    setAssignable(loadedAssignable)
    setBoardReady(true)
  }, [])

  const loadBoard = useCallback(async (currentUser = user, useCached = true) => {
    if (!currentUser) return

    setRefreshing(true)
    const cached = useCached ? readBoardCache(currentUser.id) : null
    if (cached) {
      applyBoard(cached)
      setLoading(false)
    } else if (useCached) {
      setLoading(true)
    }
    setError('')
    try {
      const [loadedIssues, loadedStatuses, loadedLabels, loadedUsers, loadedAssignable] = await Promise.all([
        api('/api/board/issues'),
        api('/api/board/statuses'),
        api('/api/board/labels'),
        api('/api/board/users'),
        api('/api/board/assignees'),
      ])
      applyBoard({
        issues: loadedIssues,
        statuses: loadedStatuses,
        labels: loadedLabels,
        users: loadedUsers,
        assignable: loadedAssignable,
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [applyBoard, user])

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
      loadBoard(user)
    }
  }, [user, loadBoard])

  useEffect(() => {
    if (user && boardReady) {
      writeBoardCache(user.id, { issues, statuses, labels, users, assignable })
    }
  }, [user, boardReady, issues, statuses, labels, users, assignable])

  const candidates = useMemo(() => getAssigneeCandidates(issues, users, assignable), [issues, users, assignable])
  const avatarUrls = useMemo(() => getAvatarUrls(issues, assignable), [issues, assignable])
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
    clearBoardCache(user.id)
    setUser(null)
    setIssues([])
    setStatuses([])
    setLabels([])
    setUsers([])
    setAssignable([])
    setBoardReady(false)
    setPendingIssueNumbers([])
    pendingIssueNumbersRef.current = new Set()
    setOpenNumber(null)
    setError('')
  }

  async function save(task, number) {
    setError('')
    const temporaryNumber = number ? null : -Date.now()
    const original = number ? issues.find((issue) => issue.number === number) : null

    if (number && !original) return

    if (number) {
      setIssues((current) => current.map((issue) => (
        issue.number === number ? applyOverrides(issue, task, labels) : issue
      )))
    } else {
      setIssues((current) => [...current, {
        ...task,
        number: temporaryNumber,
        state: task.status === 'done' ? 'closed' : 'open',
        htmlUrl: '',
        labels: task.labels.map((name) => labels.find((label) => label.name === name) || { name, color: 'e2e8f0' }),
        assignees: task.assignees.map((login) => ({ login, avatarUrl: '' })),
      }])
    }
    setIssuePending(number || temporaryNumber, true)
    setOpenNumber(null)
    setCreating(null)

    let savedSuccessfully = false
    try {
      const saved = await (number
        ? api(`/api/board/issues/${number}`, { method: 'PUT', body: JSON.stringify(task) })
        : api('/api/board/issues', { method: 'POST', body: JSON.stringify(task) }))
      setIssues((current) => number
        ? current.map((issue) => (issue.number === number ? saved : issue))
        : current.map((issue) => (issue.number === temporaryNumber ? saved : issue)))
      savedSuccessfully = true
    } catch (requestError) {
      if (number) {
        setIssues((current) => current.map((issue) => (issue.number === number ? original : issue)))
      } else {
        setIssues((current) => current.filter((issue) => issue.number !== temporaryNumber))
      }
      setError(requestError.message)
    } finally {
      setIssuePending(number || temporaryNumber, false)
      if (savedSuccessfully) void loadBoard(user, false)
    }
  }

  // Карточка переезжает в интерфейсе сразу, а при отказе GitHub возвращается на место.
  async function moveTask(number, columnKey) {
    if (pendingIssueNumbersRef.current.has(number)) {
      return
    }
    const issue = issues.find((candidate) => candidate.number === number)
    const overrides = issue && getMoveOverrides(issue, board.groupBy, columnKey)
    if (!overrides) {
      return
    }

    const restore = issue
    setIssuePending(number, true)
    setIssues((current) => current.map((item) => (
      item.number === number ? applyOverrides(item, overrides, labels) : item
    )))
    setError('')

    let savedSuccessfully = false
    try {
      const saved = await api(`/api/board/issues/${number}`, {
        method: 'PUT',
        body: JSON.stringify(toPayload(issue, overrides)),
      })
      setIssues((current) => current.map((item) => (item.number === number ? saved : item)))
      savedSuccessfully = true
    } catch (requestError) {
      setIssues((current) => current.map((item) => (item.number === number ? restore : item)))
      setError(`Не удалось перенести #${number}: ${requestError.message}`)
    } finally {
      setIssuePending(number, false)
      if (savedSuccessfully) void loadBoard(user, false)
    }
  }

  // Комментарии нужны только открытой задаче, поэтому их держит модалка, а не доска.
  const loadComments = useCallback((number) => api(`/api/board/issues/${number}/comments`), [])

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
        loading={loading || refreshing}
        onRefresh={() => loadBoard()}
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

      {boardReady && board.view === 'list' && (
        <ListView columns={columns} pendingIssueNumbers={pendingIssueNumbers} onOpen={(issue) => setOpenNumber(issue.number)} />
      )}

      {boardReady && board.view === 'table' && (
        <TableView columns={columns} statuses={statuses} pendingIssueNumbers={pendingIssueNumbers} onOpen={(issue) => setOpenNumber(issue.number)} />
      )}

      {boardReady && board.view === 'board' && (
        <BoardView
          columns={columns}
          draggedId={draggedId}
          overColumn={overColumn}
          saving={saving}
          pendingIssueNumbers={pendingIssueNumbers}
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
          avatarUrls={avatarUrls}
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
          avatarUrls={avatarUrls}
          saving={saving}
          onClose={() => setOpenNumber(null)}
          onSave={(task) => save(task, openIssue.number)}
          onCreateLabel={createLabel}
          onUpload={uploadAsset}
          onLoadComments={loadComments}
        />
      )}
    </div>
  )
}

export default App
