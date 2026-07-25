import { getAvatarColor, getLabelColors, getPriority } from '../board.js'

export function PriorityPill({ priority, bare = false }) {
  const level = getPriority(priority)

  return (
    <span
      className="priority-pill"
      style={{
        color: level.color,
        background: level.bg,
        border: bare ? '1px solid transparent' : `1px solid ${level.color}2e`,
      }}
    >
      <span aria-hidden="true">{level.icon}</span>
      {level.title}
    </span>
  )
}

export function LabelChip({ label }) {
  return <span className="label-chip" style={getLabelColors(label.color)}>{label.name}</span>
}

export function Avatar({ login, size = 24 }) {
  return (
    <span
      className="avatar"
      style={{ background: getAvatarColor(login), width: size, height: size, fontSize: size <= 18 ? 9 : 11 }}
      title={login}
    >
      {login.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function AvatarStack({ assignees }) {
  if (assignees.length === 0) {
    return <span className="assignee-names">Не назначен</span>
  }

  return (
    <span className="avatar-stack">
      {assignees.map((assignee) => <Avatar key={assignee.login} login={assignee.login} />)}
      <span className="assignee-names">{assignees.map((assignee) => assignee.login).join(', ')}</span>
    </span>
  )
}

export function GitHubLink({ url }) {
  return (
    <a
      className="github-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      GitHub ↗
    </a>
  )
}
