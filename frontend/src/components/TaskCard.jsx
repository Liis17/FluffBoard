import { getPriority } from '../board.js'
import { AvatarStack, GitHubLink, LabelChip, PlatformChip, PriorityPill } from './atoms.jsx'

export function TaskCard({ issue, onOpen, dragging, pending, onDragStart, onDragEnd }) {
  return (
    <article
      className={pending ? 'task-card task-card-pending' : dragging ? 'task-card task-card-dragging' : 'task-card'}
      style={{ borderLeftColor: getPriority(issue.priority).color }}
      draggable={!pending}
      aria-disabled={pending}
      onDragStart={(event) => {
        if (pending) {
          event.preventDefault()
          return
        }
        event.dataTransfer.effectAllowed = 'move'
        // Без setData перетаскивание не стартует в Firefox.
        event.dataTransfer.setData('text/plain', String(issue.number))
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={() => !pending && onOpen(issue)}
    >
      <div className="task-card-head">
        <PriorityPill priority={issue.priority} />
        <span className="task-number">{issue.number > 0 ? `#${issue.number}` : 'Создаём…'}</span>
      </div>

      <h3 className="task-title">{issue.title}</h3>

      {(issue.platforms.length > 0 || issue.labels.length > 0) && (
        <div className="task-labels">
          {issue.platforms.map((platform) => <PlatformChip key={platform} id={platform} />)}
          {issue.labels.map((label) => <LabelChip key={label.name} label={label} />)}
        </div>
      )}

      <div className="task-card-foot">
        <AvatarStack assignees={issue.assignees} />
        {issue.htmlUrl && <GitHubLink url={issue.htmlUrl} />}
      </div>
    </article>
  )
}
