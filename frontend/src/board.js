// Чистые функции над списком задач: фильтрация, группировка, метрики.
// Соответствуют docs/handoff_fluffboard_board/03-state-and-data.md.

export const priorities = [
  { id: 'urgent', title: 'Срочно', icon: '🔥', color: '#dc2626', bg: '#fef2f2' },
  { id: 'high', title: 'Высокий', icon: '↑', color: '#ea580c', bg: '#fff7ed' },
  { id: 'medium', title: 'Средний', icon: '=', color: '#ca8a04', bg: '#fefce8' },
  { id: 'low', title: 'Низкий', icon: '↓', color: '#64748b', bg: '#f1f5f9' },
  { id: 'none', title: 'Без', icon: '·', color: '#94a3b8', bg: '#f8fafc' },
]

export const groupings = [
  { id: 'status', title: 'Статус' },
  { id: 'assignee', title: 'Исполнитель' },
  { id: 'label', title: 'Лейбл' },
]

export const views = [
  { id: 'board', title: 'Доска' },
  { id: 'list', title: 'Список' },
  { id: 'table', title: 'Таблица' },
]

const avatarPalette = ['#2563eb', '#db2777', '#7c3aed', '#0891b2', '#ca8a04']
const emptyColor = '#94a3b8'

export const unassignedKey = '__none'
export const unlabelledKey = '__nolabel'

export function getPriority(id) {
  return priorities.find((priority) => priority.id === id) || priorities.at(-1)
}

function parseHex(hex) {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function toHex(channels) {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

function luminance([red, green, blue]) {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const ratio = channel / 255
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(left, right) {
  const [bright, dark] = [luminance(left), luminance(right)].sort((first, second) => second - first)
  return (bright + 0.05) / (dark + 0.05)
}

/**
 * У лейбла в GitHub только один hex, а чипу нужны фон и текст. Фон — тот же цвет,
 * подмешанный к белому; текст — он же, затемнённый до контраста 4.5:1.
 */
export function getLabelColors(hex) {
  const base = parseHex(hex)
  const background = base.map((channel) => 255 + 0.18 * (channel - 255))

  let text = base
  for (let scale = 1; scale > 0.05 && contrast(text, background) < 4.5; scale -= 0.05) {
    text = base.map((channel) => channel * scale)
  }

  return { background: toHex(background), color: toHex(text) }
}

// Цвет аватара выводится из логина, чтобы не держать список участников в коде.
export function getAvatarColor(login) {
  let hash = 0
  for (const character of login.toLowerCase()) {
    hash = (hash * 31 + character.codePointAt(0)) % 100000
  }
  return avatarPalette[hash % avatarPalette.length]
}

export function visibleTasks(issues, query, filters) {
  const needle = query.trim().toLowerCase()

  return issues.filter((issue) => {
    const matchesQuery = needle.length === 0
      || issue.title.toLowerCase().includes(needle)
      || String(issue.number).includes(needle)
    // Фильтр по лейблам работает как AND: задача должна иметь все выбранные.
    const matchesFilters = filters.every((filter) => issue.labels.some((label) => label.name === filter))

    return matchesQuery && matchesFilters
  })
}

export function buildColumns(issues, groupBy, { statuses, candidates, labels }) {
  if (groupBy === 'assignee') {
    const columns = candidates.map((login) => ({
      key: login,
      name: login,
      color: getAvatarColor(login),
      droppable: true,
      // Задача с несколькими исполнителями попадает в несколько колонок — это осознанно.
      issues: issues.filter((issue) => issue.assignees.some((assignee) => assignee.login === login)),
    }))

    return [...columns, {
      key: unassignedKey,
      name: 'Не назначен',
      color: emptyColor,
      droppable: true,
      issues: issues.filter((issue) => issue.assignees.length === 0),
    }]
  }

  if (groupBy === 'label') {
    const columns = labels.map((label) => ({
      key: label.name,
      name: label.name,
      color: `#${label.color}`,
      droppable: true,
      issues: issues.filter((issue) => issue.labels.some((own) => own.name === label.name)),
    }))

    // В макете задач без лейблов не видно; на реальных данных они есть, и терять их нельзя.
    // Бросать сюда нечего: это означало бы снять все лейблы разом, чего никто не ожидает.
    return [...columns, {
      key: unlabelledKey,
      name: 'Без лейбла',
      color: emptyColor,
      droppable: false,
      issues: issues.filter((issue) => issue.labels.length === 0),
    }]
  }

  return statuses.map((status) => ({
    key: status.key,
    name: status.name,
    color: `#${status.color}`,
    droppable: true,
    issues: issues.filter((issue) => issue.status === status.key),
  }))
}

/**
 * Что меняется при переносе карточки: перетаскивание правит именно то поле,
 * по которому построены колонки. Возвращает null, если менять нечего.
 */
export function getMoveOverrides(issue, groupBy, columnKey) {
  if (groupBy === 'assignee') {
    const assignees = columnKey === unassignedKey ? [] : [columnKey]
    const unchanged = issue.assignees.length === assignees.length
      && issue.assignees.every((assignee) => assignee.login === assignees[0])
    return unchanged ? null : { assignees }
  }

  if (groupBy === 'label') {
    // Лейбл добавляется, а не заменяет остальные; повторное добавление игнорируется.
    if (columnKey === unlabelledKey || issue.labels.some((label) => label.name === columnKey)) {
      return null
    }
    return { labels: [...issue.labels.map((label) => label.name), columnKey] }
  }

  return issue.status === columnKey ? null : { status: columnKey }
}

/** PUT заменяет задачу целиком, поэтому в запрос идут все поля, а не только изменённые. */
export function toPayload(issue, overrides = {}) {
  return {
    title: issue.title,
    body: issue.body,
    labels: issue.labels.map((label) => label.name),
    assignees: issue.assignees.map((assignee) => assignee.login),
    status: issue.status,
    priority: issue.priority,
    ...overrides,
  }
}

/** Оптимистичная версия задачи: те же изменения, но в форме, которую ждёт интерфейс. */
export function applyOverrides(issue, overrides, labels) {
  return {
    ...issue,
    ...overrides,
    labels: overrides.labels
      ? overrides.labels.map((name) => labels.find((label) => label.name === name) || { name, color: 'e2e8f0' })
      : issue.labels,
    assignees: overrides.assignees
      ? overrides.assignees.map((login) => ({ login, avatarUrl: '' }))
      : issue.assignees,
  }
}

// Метрики и прогресс считаются по всем задачам, а не по отфильтрованным.
export function getMetrics(issues) {
  const count = (status) => issues.filter((issue) => issue.status === status).length
  const done = count('done')
  const urgent = issues.filter((issue) => (
    issue.status !== 'done' && (issue.priority === 'urgent' || issue.priority === 'high')
  )).length

  return [
    { label: 'Всего задач', value: issues.length, suffix: 'issues', color: emptyColor, muted: true },
    {
      label: 'Готово',
      value: done,
      suffix: `${issues.length === 0 ? 0 : Math.round((done / issues.length) * 100)}%`,
      color: '#16a34a',
    },
    { label: 'В работе', value: count('in-progress'), suffix: 'активны', color: '#2563eb' },
    { label: 'К выполнению', value: count('todo'), suffix: 'в очереди', color: '#f59e0b' },
    {
      label: 'Приоритетные',
      value: urgent,
      suffix: urgent === 0 ? 'нет' : 'требуют внимания',
      color: '#dc2626',
      muted: urgent === 0,
    },
  ]
}

export function getProgress(issues, statuses) {
  const done = issues.filter((issue) => issue.status === 'done').length

  return {
    total: issues.length,
    done,
    percent: issues.length === 0 ? 0 : Math.round((done / issues.length) * 100),
    segments: statuses.map((status) => {
      const count = issues.filter((issue) => issue.status === status.key).length
      return {
        key: status.key,
        name: status.name,
        color: `#${status.color}`,
        count,
        share: issues.length === 0 ? 0 : (count / issues.length) * 100,
      }
    }),
  }
}
