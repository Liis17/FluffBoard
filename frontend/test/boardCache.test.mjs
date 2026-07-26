import assert from 'node:assert/strict'
import test from 'node:test'
import { clearBoardCache, readBoardCache, writeBoardCache } from '../src/boardCache.js'

function localStorage() {
  const values = new Map()
  return {
    getItem(key) { return values.get(key) || null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
}

test('сохраняет снимок доски без временных карточек и удаляет его при выходе', () => {
  globalThis.window = { localStorage: localStorage() }
  const board = {
    issues: [{ number: 42 }, { number: -1 }],
    statuses: [],
    labels: [],
    users: [],
    assignable: [],
  }

  writeBoardCache(7, board)
  assert.deepEqual(readBoardCache(7), { ...board, issues: [{ number: 42 }] })

  clearBoardCache(7)
  assert.equal(readBoardCache(7), null)
})
