import { useState } from 'react'
import { doneKey } from '../board.js'
import { AddColumn } from './AddColumn.jsx'
import { TaskCard } from './TaskCard.jsx'

// Завершённых накапливаются сотни, и развёрнутая колонка растягивает доску вниз.
// Свежие видно сразу, остальные — по кнопке.
const donePreview = 3

export function BoardView({
  columns,
  draggedId,
  overColumn,
  saving,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onAddColumn,
}) {
  // Колонка завершённых на доске одна, поэтому состояния на каждую колонку не нужно.
  const [allDone, setAllDone] = useState(false)

  return (
    <div className="board" role="list">
      {columns.map((column) => {
        const foldable = column.key === doneKey && column.issues.length > donePreview
        const visible = foldable && !allDone ? column.issues.slice(0, donePreview) : column.issues

        return (
          <section
            className={overColumn === column.key ? 'board-column board-column-over' : 'board-column'}
            key={column.key}
            role="listitem"
            onDragOver={column.droppable ? (event) => onDragOver(event, column.key) : undefined}
            onDrop={column.droppable ? () => onDrop(column.key) : undefined}
          >
            <header className="column-head">
              <span className="column-dot" style={{ background: column.color }} />
              <h2>{column.name}</h2>
              <span className="column-count">{column.issues.length}</span>
            </header>

            <div className="column-stack">
              {visible.map((issue) => (
                <TaskCard
                  key={issue.number}
                  issue={issue}
                  onOpen={onOpen}
                  dragging={draggedId === issue.number}
                  onDragStart={() => onDragStart(issue.number)}
                  onDragEnd={onDragEnd}
                />
              ))}
              {foldable && (
                <button type="button" className="column-more" onClick={() => setAllDone(!allDone)}>
                  {allDone ? 'Свернуть' : `Развернуть · ещё ${column.issues.length - donePreview}`}
                </button>
              )}
              {column.issues.length === 0 && (
                <p className="column-empty">{column.droppable ? 'Перетащите сюда' : 'Пусто'}</p>
              )}
            </div>
          </section>
        )
      })}

      {/* Новую колонку можно завести только при группировке по статусу: колонки
          исполнителей и лейблов задаются данными, а не пользователем. */}
      {onAddColumn && <AddColumn saving={saving} onAdd={onAddColumn} />}
    </div>
  )
}
