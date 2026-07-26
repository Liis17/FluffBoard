import assert from 'node:assert/strict'
import test from 'node:test'
import { buildColumns, doneKey, getColumnDraft, getMoveOverrides, getProgress, mergeBoardIssues } from '../src/board.js'

const issue = (number, priority, status = 'todo') => ({
  number,
  priority,
  status,
  platforms: [],
  labels: [],
  assignees: [],
})

test('группирует активные задачи по срочности, а завершённые оставляет отдельно', () => {
  const columns = buildColumns([
    issue(1, 'urgent'),
    issue(2, 'medium'),
    issue(3, 'low', 'done'),
  ], 'priority', { statuses: [], candidates: [], labels: [] })

  assert.deepEqual(columns.map((column) => column.key), ['urgent', 'high', 'medium', 'low', 'none', doneKey])
  assert.deepEqual(columns.find((column) => column.key === 'urgent').issues.map((task) => task.number), [1])
  assert.deepEqual(columns.find((column) => column.key === 'medium').issues.map((task) => task.number), [2])
  assert.deepEqual(columns.at(-1).issues.map((task) => task.number), [3])
})

test('перенос и создание в разрезе срочности задают приоритет', () => {
  assert.deepEqual(getMoveOverrides(issue(1, 'low'), 'priority', 'high'), { priority: 'high' })
  assert.deepEqual(getColumnDraft('priority', 'urgent'), { priority: 'urgent' })
  assert.equal(getProgress([issue(1, 'urgent'), issue(2, 'none')], 'priority', { statuses: [], candidates: [] }).mode, 'share')
})

test('фоновая загрузка не затирает неподтверждённую карточку', () => {
  const pending = new Set([1, -1])
  const current = [{ ...issue(1, 'urgent'), title: 'Локальная правка' }, { ...issue(-1, 'medium'), title: 'Создаём' }]
  const loaded = [{ ...issue(1, 'low'), title: 'Старая версия' }, issue(2, 'none')]

  assert.deepEqual(mergeBoardIssues(current, loaded, pending), [current[0], loaded[1], current[1]])
})
