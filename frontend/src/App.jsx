import { useState } from 'react'
import './App.css'

function App() {
  const [owner, setOwner] = useState('')
  const [repository, setRepository] = useState('')
  const [issues, setIssues] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function loadIssues(event) {
    event.preventDefault()

    const trimmedOwner = owner.trim()
    const trimmedRepository = repository.trim()

    if (!trimmedOwner || !trimmedRepository) {
      setError('Enter both the GitHub owner and repository name.')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const response = await fetch(
        `http://localhost:5279/api/github/repos/${encodeURIComponent(trimmedOwner)}/${encodeURIComponent(trimmedRepository)}/issues`,
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Could not load issues.')
      }

      setIssues(data)
      setStatus('success')
    } catch (requestError) {
      setIssues([])
      setError(requestError.message || 'Could not connect to the backend.')
      setStatus('error')
    }
  }

  return (
    <main className="board">
      <p className="eyebrow">FluffBoard</p>
      <h1>GitHub issues</h1>
      <p className="description">Choose a repository to see its issues, labels, and assignees.</p>

      <form className="repository-form" onSubmit={loadIssues}>
        <label>
          Owner
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="octocat"
          />
        </label>
        <label>
          Repository
          <input
            value={repository}
            onChange={(event) => setRepository(event.target.value)}
            placeholder="Hello-World"
          />
        </label>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading…' : 'Load issues'}
        </button>
      </form>

      {error && <p className="message error" role="alert">{error}</p>}
      {status === 'success' && issues.length === 0 && (
        <p className="message">This repository has no issues.</p>
      )}
      {issues.length > 0 && (
        <section className="issue-list" aria-label="Repository issues">
          <p className="issue-count">{issues.length} issues</p>
          {issues.map((issue) => (
            <article className="issue" key={issue.number}>
              <a href={issue.htmlUrl} target="_blank" rel="noreferrer">
                <span>#{issue.number}</span> {issue.title}
              </a>
              <div className="metadata">
                <div className="labels" aria-label="Labels">
                  {issue.labels.length > 0
                    ? issue.labels.map((label) => (
                        <span className="label" key={label.name}>{label.name}</span>
                      ))
                    : <span className="empty">No labels</span>}
                </div>
                <div className="assignees" aria-label="Assignees">
                  {issue.assignees.length > 0
                    ? issue.assignees.map((assignee) => (
                        <span className="assignee" key={assignee.login}>
                          <img src={assignee.avatarUrl} alt="" />
                          {assignee.login}
                        </span>
                      ))
                    : <span className="empty">Unassigned</span>}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default App
