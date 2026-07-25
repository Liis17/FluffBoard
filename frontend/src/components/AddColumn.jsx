import { useState } from 'react'

export function AddColumn({ saving, onAdd }) {
  const [name, setName] = useState(null)

  function submit(event) {
    event.preventDefault()
    if (name.trim().length > 0) {
      onAdd(name.trim())
      setName(null)
    }
  }

  if (name === null) {
    return (
      <button className="add-column" type="button" onClick={() => setName('')}>+ Колонка</button>
    )
  }

  return (
    <form className="add-column add-column-form" onSubmit={submit}>
      <input
        value={name}
        maxLength="40"
        placeholder="На проверке"
        aria-label="Название колонки"
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && setName(null)}
      />
      <div className="add-column-actions">
        <button className="button-outline" type="button" onClick={() => setName(null)}>Отмена</button>
        <button className="button-primary" type="submit" disabled={saving}>Создать</button>
      </div>
    </form>
  )
}
