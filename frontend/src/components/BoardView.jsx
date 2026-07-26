import { useState } from 'react'
import { doneKey } from '../board.js'
import { AddColumn } from './AddColumn.jsx'
import { Icon } from './icons.jsx'
import { TaskCard } from './TaskCard.jsx'

// Завершённых накапливаются сотни, и развёрнутая колонка растягивает доску вниз.
// Свежие видно сразу, остальные — по кнопке.
const donePreview = 3

export function BoardView({
  columns,
  draggedId,
  overColumn,
  saving,
  pendingIssueNumbers = [],
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onCreateTask,
  onAddColumn,
}) {
  // Секция завершённых на доске одна, поэтому состояния на каждую колонку не нужно.
  const [allDone, setAllDone] = useState(false)

  return (
    <div className="board" role="list">
      {columns.map((column) => {
        // В разрезе по статусу готовые приходят обычной колонкой с ключом `done`,
        // в остальных — служебной «Завершено» с `doneKey`.
        const foldable = (column.key === doneKey || column.key === 'done') && column.issues.length > donePreview
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
                  pending={pendingIssueNumbers.includes(issue.number)}
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
              {/* В «Завершено» кнопки нет: новая задача не бывает готовой и в эту колонку
                  всё равно не попала бы. Место кнопка занимает всегда, а показывается по
                  наведению — иначе карточки прыгали бы под курсором. */}
              {column.key !== doneKey && (
                <button
                  type="button"
                  className="column-add"
                  aria-label={`Новая задача в «${column.name}»`}
                  title={`Новая задача в «${column.name}»`}
                  onClick={() => onCreateTask(column.key)}
                >
                  <Icon name="plus" />
                </button>
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
