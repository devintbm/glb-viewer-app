import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import ModelDetail from './pages/ModelDetail';
import Admin from './pages/Admin';
import ThemeToggle from './components/ThemeToggle';

const THEME_KEY = 'glb-viewer-theme';

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">◆ GLB Viewer</span>
        <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/model/:id" element={<ModelDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <nav className="bottombar">
        <NavLink to="/" end className="bottombar-link">
          <span className="bottombar-icon">⌂</span>
          <span>Home</span>
        </NavLink>
        <NavLink to="/admin" className="bottombar-link">
          <span className="bottombar-icon">⚙</span>
          <span>Admin</span>
        </NavLink>
      </nav>
    </div>
  );
}
