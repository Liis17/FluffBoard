import { getPriority } from '../board.js'
import { AvatarStack, GitHubLink, LabelChip, PriorityPill } from './atoms.jsx'

export function TaskCard({ issue, onOpen, dragging, onDragStart, onDragEnd }) {
  return (
    <article
      className={dragging ? 'task-card task-card-dragging' : 'task-card'}
      style={{ borderLeftColor: getPriority(issue.priority).color }}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        // Без setData перетаскивание не стартует в Firefox.
        event.dataTransfer.setData('text/plain', String(issue.number))
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(issue)}
    >
      <div className="task-card-head">
        <PriorityPill priority={issue.priority} />
        <span className="task-number">#{issue.number}</span>
      </div>

      <h3 className="task-title">{issue.title}</h3>

      {issue.labels.length > 0 && (
        <div className="task-labels">
          {issue.labels.map((label) => <LabelChip key={label.name} label={label} />)}
        </div>
      )}

      <div className="task-card-foot">
        <AvatarStack assignees={issue.assignees} />
        <GitHubLink url={issue.htmlUrl} />
      </div>
    </article>
  )
}
