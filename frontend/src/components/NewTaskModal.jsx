import { useState } from 'react'
import { MarkdownEditor } from './MarkdownEditor.jsx'
import { Modal } from './Modal.jsx'
import { TaskFields } from './TaskFields.jsx'

const emptyDraft = {
  title: '',
  body: '',
  status: 'todo',
  priority: 'medium',
  labels: [],
  assignees: [],
  platforms: [],
}

export function NewTaskModal({ prefill, statuses, labels, candidates, saving, onClose, onCreate, onCreateLabel, onUpload }) {
  const [draft, setDraft] = useState({ ...emptyDraft, ...prefill })

  function submit(event) {
    event.preventDefault()
    if (draft.title.trim().length > 0) {
      onCreate(draft)
    }
  }

  return (
    <Modal label="Новая задача" onClose={onClose}>
      <form onSubmit={submit}>
        <header className="modal-head">
          <div>
            <p className="modal-eyebrow">НОВАЯ ЗАДАЧА</p>
            <h2>Создать issue</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <label className="field-group">
            <span className="field-label">Название</span>
            <input
              className="field-input field-input-title"
              value={draft.title}
              maxLength="256"
              placeholder="Что нужно сделать?"
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>

          <div className="field-group">
            <span className="field-label">Описание</span>
            <MarkdownEditor
              value={draft.body}
              rows={3}
              placeholder="Контекст, шаги воспроизведения, ссылки…"
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
          <button className="button-outline" type="button" onClick={onClose}>Отмена</button>
          <button className="button-primary" type="submit" disabled={saving}>
            {saving ? 'Создаём…' : 'Создать задачу'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
