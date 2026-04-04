import styles from '../App.module.css'

export default function AppHeader({ placesCount, themeMode, onToggleTheme, onAddPlace }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logoSection}>
          <img src="/img/logo.png" alt="Mappy Logo" className={styles.logoImg} />
          <div>
            <h1 className={styles.logo}>Mappy</h1>
            <p className={styles.tagline}>
              {placesCount} {placesCount === 1 ? 'lugar guardado' : 'lugares guardados'}
            </p>
          </div>
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
          <button className={styles.btnAdd} onClick={onAddPlace}>
            + Agregar lugar
          </button>
        </div>
      </div>
    </header>
  )
}
