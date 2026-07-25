import { TaskCard } from './TaskCard.jsx'

export function BoardView({ columns, draggedId, overColumn, onOpen, onDragStart, onDragEnd, onDragOver, onDrop }) {
  return (
    <div className="board" role="list">
      {columns.map((column) => (
        <section
          className={overColumn === column.key ? 'board-column board-column-over' : 'board-column'}
          key={column.key}
          role="listitem"
          onDragOver={(event) => onDragOver(event, column.key)}
          onDrop={() => onDrop(column.key)}
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
            {column.issues.length === 0 && <p className="column-empty">Перетащите сюда</p>}
          </div>
        </section>
      ))}
    </div>
  )
}
