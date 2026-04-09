import styles from '../App.module.css'

export default function AppHeader({ themeMode, onToggleTheme, onAddPlace, showAddPlace = true, showBack, onBack }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logoSection}>
          {showBack && (
            <button className={styles.backBtn} onClick={onBack} aria-label="Volver a viajes" title="Volver a viajes">
              ←
            </button>
          )}
          <img src="/img/logo.png" alt="Mappy Logo" className={styles.logoImg} />
          <h1 className={styles.logo}>Mappy</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.themeToggle}
            onClick={onToggleTheme}
            aria-label={themeMode === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={themeMode === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {themeMode === 'dark' ? '☀️' : '🌙'}
          </button>
          {showAddPlace && (
            <button className={styles.btnAdd} onClick={onAddPlace}>
              + Agregar lugar
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
