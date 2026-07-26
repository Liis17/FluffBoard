import { getPriority } from '../board.js'
import { Avatar, LabelChip } from './atoms.jsx'

export function ListView({ columns, pendingIssueNumbers = [], onOpen }) {
  return (
    <div className="list-view">
      {columns.filter((column) => column.issues.length > 0).map((column) => (
        <section key={column.key}>
          <header className="column-head">
            <span className="column-dot" style={{ background: column.color }} />
            <h2 className="list-group-title">{column.name}</h2>
            <span className="column-count">{column.issues.length}</span>
          </header>

          <div className="list-rows">
            {column.issues.map((issue) => {
              const priority = getPriority(issue.priority)
              return (
                <div
                  className={pendingIssueNumbers.includes(issue.number) ? 'list-row list-row-pending' : 'list-row'}
                  key={issue.number}
                  aria-disabled={pendingIssueNumbers.includes(issue.number)}
                  onClick={() => !pendingIssueNumbers.includes(issue.number) && onOpen(issue)}
                >
                  <span className="list-priority" style={{ color: priority.color }} title={priority.title}>
                    {priority.icon}
                  </span>
                  <span className="list-number">#{issue.number}</span>
                  <span className="list-title">{issue.title}</span>
                  <span className="list-labels">
                    {issue.labels.map((label) => <LabelChip key={label.name} label={label} />)}
                  </span>
                  <span className="list-avatars">
                    {issue.assignees.map((assignee) => <Avatar key={assignee.login} login={assignee.login} avatarUrl={assignee.avatarUrl} />)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
