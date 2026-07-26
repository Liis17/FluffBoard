import { useState } from 'react'
import { getAvatarColor, getLabelColors, getPlatform, getPriority } from '../board.js'
import { Icon } from './icons.jsx'

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
      {level.icon && <span aria-hidden="true">{level.icon}</span>}
      {level.title}
    </span>
  )
}

/** Статус в режиме чтения. Цвет приходит из лейбла GitHub, второго источника правды у колонок нет. */
export function StatusChip({ status }) {
  return (
    <span className="status-chip" style={{ color: `#${status.color}`, borderColor: `#${status.color}55` }}>
      <span className="pill-dot" style={{ background: `#${status.color}` }} />
      {status.name}
    </span>
  )
}

export function LabelChip({ label }) {
  return <span className="label-chip" style={getLabelColors(label.color)}>{label.name}</span>
}

/** Платформа отличается от лейбла контуром и иконкой: цвет берётся из каталога, а не из GitHub. */
export function PlatformChip({ id }) {
  const platform = getPlatform(id)

  return (
    <span className="platform-chip" style={{ color: platform.color, borderColor: `${platform.color}55` }}>
      <Icon name={id} />
      {platform.title}
    </span>
  )
}

// GitHub уже возвращает прямую CDN-ссылку в задаче, поэтому не создаём отдельный редирект на
// каждый аватар. Для оптимистичной карточки ссылки ещё нет — остаётся буквенный fallback.
export function Avatar({ login, avatarUrl, size = 24 }) {
  const [broken, setBroken] = useState(false)

  return (
    <span
      className="avatar"
      style={{ background: getAvatarColor(login), width: size, height: size, fontSize: size <= 18 ? 9 : 11 }}
      title={login}
    >
      {login.slice(0, 1).toUpperCase()}
      {!broken && avatarUrl && (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
    </span>
  )
}

export function AvatarStack({ assignees }) {
  if (assignees.length === 0) {
    return <span className="assignee-names">Не назначен</span>
  }

  return (
    <span className="avatar-stack">
      {assignees.map((assignee) => <Avatar key={assignee.login} login={assignee.login} avatarUrl={assignee.avatarUrl} />)}
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
