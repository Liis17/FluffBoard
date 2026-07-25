import { getAvatarColor } from '../board.js'
import { Icon } from './icons.jsx'

export function Header({ user, loading, onRefresh, onCreate, onLogout }) {
  return (
    <header className="board-header">
      <div className="board-identity">
        <span className="board-logo">F</span>
        <div>
          <div className="board-title">
            <h1>Доска задач</h1>
            <span className="board-badge">GITHUB ISSUES</span>
          </div>
          <p className="board-subtitle">Все изменения задач сразу записываются в GitHub</p>
        </div>
      </div>

      <div className="board-account">
        <button
          className={loading ? 'icon-button icon-button-busy' : 'icon-button'}
          type="button"
          aria-label="Обновить данные с GitHub"
          title="Обновить данные с GitHub"
          disabled={loading}
          onClick={onRefresh}
        >
          <Icon name="refresh" />
        </button>
        <button className="button-primary" type="button" onClick={onCreate}>+ Новая задача</button>
        <div className="board-user">
          <span className="avatar" style={{ background: getAvatarColor(user.username) }}>
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <span className="board-login">{user.username}</span>
          <button className="button-outline" type="button" onClick={onLogout}>Выйти</button>
        </div>
      </div>
    </header>
  )
}
