import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('Connecting to the backend…')

  useEffect(() => {
    fetch('http://localhost:5279/api/hello')
      .then((response) => {
        if (!response.ok) throw new Error('Backend is unavailable')
        return response.json()
      })
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Start the backend to see its greeting.'))
  }, [])

  return (
    <main>
      <p className="eyebrow">FluffBoard</p>
      <h1>Hello, world!</h1>
      <p className="description">Your React frontend is ready.</p>
      <p className="backend-message">{message}</p>
    </main>
  )
}

export default App
