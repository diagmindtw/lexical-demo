import './App.css'
import Editor from './Editor'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Lexical multi-user demo</h1>
        <p className="sub">
          One shared document. Open in two tabs (or two browsers) to see edits sync via{' '}
          <code>cow.diagmindtw.com/apis/lexical/*</code> → MySQL on Bluehost. No auth — demo only.
        </p>
      </header>
      <Editor />
      <footer className="app-footer">
        <span>Frontend: React + Vite + Lexical 0.44 on GitHub Pages.</span>
        <span>Backend: PHP 8.5 + pdo_mysql.</span>
        <span>Sync: HTTP short-poll, ~2.5s + optimistic-lock save with conflict refresh.</span>
      </footer>
    </div>
  )
}
