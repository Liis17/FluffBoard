import { Avatar, LabelChip, PriorityPill } from './atoms.jsx'

const headers = ['#', 'ЗАДАЧА', 'СТАТУС', 'ЛЕЙБЛЫ', 'ИСПОЛНИТЕЛЬ', 'ПРИОРИТЕТ']

export function TableView({ issues, statuses, onOpen }) {
  // Группировка к таблице не применяется — это плоский список отфильтрованных задач.
  return (
    <div className="table-view">
      <div className="table-head">
        {headers.map((header) => <span key={header}>{header}</span>)}
      </div>

      {issues.map((issue) => {
        const status = statuses.find((candidate) => candidate.key === issue.status)
        return (
          <div className="table-row" key={issue.number} onClick={() => onOpen(issue)}>
            <span className="list-number">#{issue.number}</span>
            <span className="table-title">{issue.title}</span>
            <span className="table-status" style={{ color: status ? `#${status.color}` : 'var(--muted)' }}>
              {status?.name || issue.status}
            </span>
            <span className="list-labels">
              {issue.labels.map((label) => <LabelChip key={label.name} label={label} />)}
            </span>
            <span className="list-avatars table-assignees">
              {issue.assignees.map((assignee) => <Avatar key={assignee.login} login={assignee.login} />)}
            </span>
            <span>
              <PriorityPill priority={issue.priority} bare />
            </span>
          </div>
        )
      })}

      {issues.length === 0 && <p className="table-empty">Ничего не найдено.</p>}
    </div>
  )
}
