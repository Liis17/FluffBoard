import { groupings, views } from '../board.js'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

export function Toolbar({ query, view, groupBy, onQuery, onView, onGroupBy }) {
  return (
    <div className="toolbar">
      <div className="search">
        <SearchIcon />
        <input
          type="search"
          value={query}
          placeholder="Поиск задач…"
          aria-label="Поиск задач"
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>

      <div className="tabs" role="tablist" aria-label="Режим отображения">
        {views.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            className={view === option.id ? 'tab tab-active' : 'tab'}
            onClick={() => onView(option.id)}
          >
            {option.title}
          </button>
        ))}
      </div>

      <label className="group-select">
        Группировка
        <select value={groupBy} onChange={(event) => onGroupBy(event.target.value)}>
          {groupings.map((option) => <option value={option.id} key={option.id}>{option.title}</option>)}
        </select>
      </label>
    </div>
  )
}
