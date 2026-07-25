import { useState } from 'react'
import { MarkdownEditor } from './MarkdownEditor.jsx'
import { Modal } from './Modal.jsx'
import { TaskFields } from './TaskFields.jsx'
import { GitHubLink } from './atoms.jsx'

export function TaskModal({ issue, statuses, labels, candidates, saving, onClose, onSave, onCreateLabel, onUpload }) {
  // Правки живут в локальной копии и уезжают в GitHub только по «Сохранить».
  const [draft, setDraft] = useState(() => ({
    title: issue.title,
    body: issue.body,
    status: issue.status,
    priority: issue.priority,
    labels: issue.labels.map((label) => label.name),
    assignees: issue.assignees.map((assignee) => assignee.login),
    platforms: issue.platforms,
  }))

  function submit(event) {
    event.preventDefault()
    if (draft.title.trim().length > 0) {
      onSave(draft)
    }
  }

  return (
    <Modal label={`Задача #${issue.number}`} wide onClose={onClose}>
      <form onSubmit={submit}>
        <header className="modal-head">
          <div className="modal-meta">
            <span className="task-number">#{issue.number}</span>
            <GitHubLink url={issue.htmlUrl} />
          </div>
          <button className="icon-button" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <input
            className="title-input"
            value={draft.title}
            maxLength="256"
            placeholder="Название задачи"
            aria-label="Название задачи"
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />

          <div className="field-group">
            <span className="field-label">Описание</span>
            <MarkdownEditor
              value={draft.body}
              placeholder="Добавьте описание…"
              onChange={(body) => setDraft({ ...draft, body })}
              onUpload={onUpload}
            />
          </div>

          <TaskFields
            draft={draft}
            statuses={statuses}
            labels={labels}
            candidates={candidates}
            onChange={setDraft}
            onCreateLabel={onCreateLabel}
          />
        </div>

        <footer className="modal-foot">
          {/* Удалить issue через обычный API нельзя, поэтому задача переводится в «Готово» —
              это и закрывает её в GitHub. Для уже готовой задачи кнопка бессмысленна. */}
          {draft.status !== 'done' && (
            <button
              className="button-danger"
              type="button"
              disabled={saving}
              onClick={() => onSave({ ...draft, status: 'done' })}
            >
              Закрыть задачу
            </button>
          )}
          <div className="modal-foot-right">
            <button className="button-outline" type="button" onClick={onClose}>Отмена</button>
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  )
}
