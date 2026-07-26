import { useEffect, useState } from 'react'
import { renderMarkdown } from '../markdown.js'
import { MarkdownEditor } from './MarkdownEditor.jsx'
import { Modal } from './Modal.jsx'
import { TaskComments } from './TaskComments.jsx'
import { TaskFields } from './TaskFields.jsx'
import { GitHubLink, LabelChip } from './atoms.jsx'

function toDraft(issue) {
  return {
    title: issue.title,
    body: issue.body,
    status: issue.status,
    priority: issue.priority,
    labels: issue.labels.map((label) => label.name),
    assignees: issue.assignees.map((assignee) => assignee.login),
    platforms: issue.platforms,
  }
}

export function TaskModal({ issue, statuses, labels, candidates, saving, onClose, onSave, onCreateLabel, onUpload, onLoadComments }) {
  // Задача открывается на чтение, а поля появляются по «Редактировать»: чаще в неё заходят
  // посмотреть, а не править.
  const [editing, setEditing] = useState(false)
  // Правки живут в локальной копии и уезжают в GitHub только по «Сохранить».
  const [draft, setDraft] = useState(() => toDraft(issue))

  // null — ещё не загружены; модалка живёт под ключом задачи, поэтому запрос идёт один раз.
  const [comments, setComments] = useState(null)
  const [commentsError, setCommentsError] = useState('')

  useEffect(() => {
    let active = true

    onLoadComments(issue.number)
      .then((loaded) => active && setComments(loaded))
      .catch((requestError) => active && setCommentsError(requestError.message))

    return () => {
      active = false
    }
  }, [issue.number, onLoadComments])

  function submit(event) {
    event.preventDefault()
    if (draft.title.trim().length > 0) {
      onSave(draft)
    }
  }

  // Отмена возвращает к чтению и откатывает правки: иначе они дожили бы до следующего входа в форму.
  function cancel() {
    setDraft(toDraft(issue))
    setEditing(false)
  }

  const head = (
    <header className="modal-head">
      <div>
        <div className="modal-meta">
          <span className="task-number">#{issue.number}</span>
          <GitHubLink url={issue.htmlUrl} />
        </div>
        {!editing && <h2>{issue.title}</h2>}
      </div>
      <button className="icon-button" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
    </header>
  )

  if (!editing) {
    return (
      <Modal label={`Задача #${issue.number}`} wide onClose={onClose}>
        <div className="modal-shell">
          {head}

          <div className="modal-body">
            {issue.body.trim().length > 0
              ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(issue.body) }} />
              : <p className="markdown-body markdown-empty">Описания пока нет.</p>}

            <TaskComments comments={comments} error={commentsError} />

            {issue.labels.length > 0 && (
              <div className="pill-row">
                {issue.labels.map((label) => <LabelChip key={label.name} label={label} />)}
              </div>
            )}
          </div>

          <footer className="modal-foot">
            <div className="modal-foot-right">
              <button className="button-outline" type="button" onClick={onClose}>Закрыть</button>
              <button className="button-primary" type="button" onClick={() => setEditing(true)}>
                Редактировать
              </button>
            </div>
          </footer>
        </div>
      </Modal>
    )
  }

  return (
    <Modal label={`Задача #${issue.number}`} wide onClose={onClose}>
      <form onSubmit={submit}>
        {head}

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
            <button className="button-outline" type="button" onClick={cancel}>Отмена</button>
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  )
}
