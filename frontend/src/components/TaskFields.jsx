import { useState } from 'react'
import { getLabelColors, platforms, priorities } from '../board.js'
import { Avatar } from './atoms.jsx'
import { Icon } from './icons.jsx'

function toggle(current, value) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}

/**
 * Метка заводится прямо из задачи, для которой понадобилась, и сразу к ней прикрепляется.
 * Формы здесь быть не может: поля задачи уже лежат внутри формы модалки, а вложенные формы
 * запрещены — поэтому Enter обрабатывается вручную и не отправляет задачу целиком.
 */
function NewLabelChip({ onCreate }) {
  const [name, setName] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    const value = name.trim()
    if (value.length === 0) {
      return
    }

    setBusy(true)
    setError('')
    try {
      await onCreate(value)
      setName(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  function close() {
    setName(null)
    setError('')
  }

  if (name === null) {
    return (
      <button className="chip chip-add" type="button" title="Создать метку" onClick={() => setName('')}>
        <Icon name="plus" />
      </button>
    )
  }

  return (
    <span className="chip chip-new">
      <input
        value={name}
        maxLength="50"
        placeholder="Название метки"
        aria-label="Название новой метки"
        disabled={busy}
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            create()
          }
          if (event.key === 'Escape') {
            close()
          }
        }}
      />
      <button type="button" aria-label="Создать метку" disabled={busy} onClick={create}>
        {busy ? '…' : '✓'}
      </button>
      <button type="button" aria-label="Отмена" onClick={close}>×</button>
      {error && <span className="chip-error">{error}</span>}
    </span>
  )
}

/** Общий набор полей для создания и редактирования: статус, приоритет, лейблы, исполнители. */
export function TaskFields({ draft, statuses, labels, candidates, avatarUrls = new Map(), onChange, onCreateLabel }) {
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
              {level.icon && <span aria-hidden="true">{level.icon}</span>}
              {level.title}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        {/* Платформ у задачи может быть несколько — это выбор, а не переключатель. */}
        <span className="field-label">Платформы</span>
        <div className="pill-row">
          {platforms.map((platform) => {
            const active = draft.platforms.includes(platform.id)
            return (
              <button
                key={platform.id}
                type="button"
                aria-pressed={active}
                className={active ? 'pill pill-active' : 'pill'}
                style={active ? { background: platform.color, borderColor: platform.color } : undefined}
                onClick={() => patch({ platforms: toggle(draft.platforms, platform.id) })}
              >
                <Icon name={platform.id} />
                {platform.title}
              </button>
            )
          })}
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
          <NewLabelChip
            onCreate={async (name) => {
              const label = await onCreateLabel(name)
              patch({ labels: [...draft.labels, label.name] })
            }}
          />
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
                <Avatar login={login} avatarUrl={avatarUrls.get(login.toLowerCase())} size={18} />
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
