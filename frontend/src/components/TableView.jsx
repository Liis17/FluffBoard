import { Fragment } from 'react'
import { Avatar, LabelChip, PlatformChip, PriorityPill } from './atoms.jsx'

const headers = ['#', 'ЗАДАЧА', 'СТАТУС', 'ПЛАТФОРМЫ', 'ЛЕЙБЛЫ', 'ИСПОЛНИТЕЛЬ', 'ПРИОРИТЕТ']

export function TableView({ columns, statuses, pendingIssueNumbers = [], onOpen }) {
  // Таблица уважает выбранную группировку, поэтому один и тот же режим даёт разрез
  // по статусу, платформам или исполнителям. В многозначных разрезах задача повторяется.
  const groups = columns.filter((column) => column.issues.length > 0)

  return (
    <div className="table-view">
      <div className="table-head">
        {headers.map((header) => <span key={header}>{header}</span>)}
      </div>

      {groups.map((column) => (
        <Fragment key={column.key}>
          <div className="table-group">
            <span className="column-dot" style={{ background: column.color }} />
            <h2>{column.name}</h2>
            <span className="column-count">{column.issues.length}</span>
          </div>

          {column.issues.map((issue) => {
            const status = statuses.find((candidate) => candidate.key === issue.status)
            return (
              <div
                className={pendingIssueNumbers.includes(issue.number) ? 'table-row table-row-pending' : 'table-row'}
                key={issue.number}
                aria-disabled={pendingIssueNumbers.includes(issue.number)}
                onClick={() => !pendingIssueNumbers.includes(issue.number) && onOpen(issue)}
              >
                <span className="list-number">#{issue.number}</span>
                <span className="table-title">{issue.title}</span>
                <span className="table-status" style={{ color: status ? `#${status.color}` : 'var(--muted)' }}>
                  {status?.name || issue.status}
                </span>
                <span className="list-labels">
                  {issue.platforms.map((platform) => <PlatformChip key={platform} id={platform} />)}
                </span>
                <span className="list-labels">
                  {issue.labels.map((label) => <LabelChip key={label.name} label={label} />)}
                </span>
                <span className="list-avatars table-assignees">
                  {issue.assignees.map((assignee) => <Avatar key={assignee.login} login={assignee.login} avatarUrl={assignee.avatarUrl} />)}
                </span>
                <span>
                  <PriorityPill priority={issue.priority} bare />
                </span>
              </div>
            )
          })}
        </Fragment>
      ))}

      {groups.length === 0 && <p className="table-empty">Ничего не найдено.</p>}
    </div>
  )
}
