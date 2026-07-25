import { getLabelColors, priorities } from '../board.js'
import { Avatar } from './atoms.jsx'

function toggle(current, value) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}

/** Общий набор полей для создания и редактирования: статус, приоритет, лейблы, исполнители. */
export function TaskFields({ draft, statuses, labels, candidates, onChange }) {
  const patch = (change) => onChange({ ...draft, ...change })

  return (
    <>
      <div className="field-group">
        <span className="field-label">Статус</span>
        <div className="pill-row">
          {statuses.map((status) => (
            <button
              key={status.key}
              type="button"
              aria-pressed={draft.status === status.key}
              className={draft.status === status.key ? 'pill pill-active' : 'pill'}
              onClick={() => patch({ status: status.key })}
            >
              <span className="pill-dot" style={{ background: `#${status.color}` }} />
              {status.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">Приоритет</span>
        <div className="pill-row">
          {priorities.map((level) => (
            <button
              key={level.id}
              type="button"
              aria-pressed={draft.priority === level.id}
              className={draft.priority === level.id ? 'pill pill-active' : 'pill'}
              style={draft.priority === level.id ? { background: level.color, borderColor: level.color } : undefined}
              onClick={() => patch({ priority: level.id })}
            >
              <span aria-hidden="true">{level.icon}</span>
              {level.title}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">Лейблы</span>
        <div className="pill-row">
          {labels.map((label) => {
            const active = draft.labels.includes(label.name)
            return (
              <button
                key={label.name}
                type="button"
                aria-pressed={active}
                className={active ? 'chip chip-active' : 'chip'}
                style={active ? getLabelColors(label.color) : undefined}
                onClick={() => patch({ labels: toggle(draft.labels, label.name) })}
              >
                {label.name}
              </button>
            )
          })}
          {labels.length === 0 && <span className="field-empty">Меток в репозитории нет.</span>}
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">Исполнители</span>
        <div className="pill-row">
          {candidates.map((login) => {
            const active = draft.assignees.includes(login)
            return (
              <button
                key={login}
                type="button"
                aria-pressed={active}
                className={active ? 'chip chip-avatar chip-active' : 'chip chip-avatar'}
                onClick={() => patch({ assignees: toggle(draft.assignees, login) })}
              >
                <Avatar login={login} size={18} />
                {login}
              </button>
            )
          })}
          {candidates.length === 0 && (
            <span className="field-empty">Некого назначить: у участников доски не привязан GitHub.</span>
          )}
        </div>
      </div>
    </>
  )
}
