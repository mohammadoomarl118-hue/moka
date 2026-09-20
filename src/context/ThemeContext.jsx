import {
  useEffect,
  useState,
} from 'react'

import { ThemeContext } from './theme-context'

export default function ThemeProvider({
  children,
}) {
  const [dark, setDark] = useState(() => {
    const saved =
      localStorage.getItem('moka-theme')

    if (saved) {
      return saved === 'dark'
    }

    return true
  })

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      dark
    )

    localStorage.setItem(
      'moka-theme',
      dark ? 'dark' : 'light'
    )
  }, [dark])

  function toggleTheme() {
    setDark((current) => !current)
  }

  return (
    <ThemeContext.Provider
      value={{
        dark,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}