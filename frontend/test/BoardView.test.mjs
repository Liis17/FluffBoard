import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const vite = await createServer({
  configFile: 'vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
})

test('сворачивает завершённые задачи в статусной колонке', async (context) => {
  context.after(() => vite.close())

  const { BoardView } = await vite.ssrLoadModule('/src/components/BoardView.jsx')
  const issues = Array.from({ length: 4 }, (_, index) => ({
    number: index + 1,
    title: `Завершённая задача ${index + 1}`,
    priority: 'none',
    platforms: [],
    labels: [],
    assignees: [],
    htmlUrl: 'https://example.test/issue',
  }))
  const html = renderToStaticMarkup(React.createElement(BoardView, {
    columns: [{ key: 'done', name: 'Готово', color: '#16a34a', droppable: true, issues }],
    draggedId: null,
    overColumn: null,
    saving: false,
    onOpen() {},
    onDragStart() {},
    onDragEnd() {},
    onDragOver() {},
    onDrop() {},
    onCreateTask() {},
  }))

  assert.match(html, /Развернуть · ещё 1/)
  assert.equal((html.match(/class="task-card"/g) || []).length, 3)
})
