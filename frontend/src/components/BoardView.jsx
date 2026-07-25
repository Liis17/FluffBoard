import { AddColumn } from './AddColumn.jsx'
import { TaskCard } from './TaskCard.jsx'

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
  return (
    <div className="board" role="list">
      {columns.map((column) => (
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
            {column.issues.map((issue) => (
              <TaskCard
                key={issue.number}
                issue={issue}
                onOpen={onOpen}
                dragging={draggedId === issue.number}
                onDragStart={() => onDragStart(issue.number)}
                onDragEnd={onDragEnd}
              />
            ))}
            {column.issues.length === 0 && (
              <p className="column-empty">{column.droppable ? 'Перетащите сюда' : 'Пусто'}</p>
            )}
          </div>
        </section>
      ))}

      {/* Новую колонку можно завести только при группировке по статусу: колонки
          исполнителей и лейблов задаются данными, а не пользователем. */}
      {onAddColumn && <AddColumn saving={saving} onAdd={onAddColumn} />}
    </div>
  )
}
