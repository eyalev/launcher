import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import SearchInput from './components/SearchInput'
import ResultsList from './components/ResultsList'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const searchTimeoutRef = useRef(null)
  const lastQueryRef = useRef('')

  const searchItems = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([])
      setSelectedIndex(0)
      lastQueryRef.current = ''
      return
    }

    // Skip search if query hasn't really changed (just retyping same content)
    if (lastQueryRef.current === searchQuery) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      console.log('Searching for:', searchQuery)
      const searchResults = await window.electronAPI.searchItems(searchQuery)
      console.log('Got results:', searchResults.length)
      
      // Only update if the results are actually different or this is a new query
      setResults(prevResults => {
        // Compare results by checking if same items are present
        if (prevResults.length === searchResults.length) {
          const prevIds = prevResults.map(r => r.id).sort()
          const newIds = searchResults.map(r => r.id).sort()
          const sameResults = prevIds.every((id, index) => id === newIds[index])
          
          if (sameResults) {
            console.log('Results unchanged, keeping previous results to prevent re-render')
            return prevResults // Keep previous results to prevent re-render
          }
        }
        
        return searchResults
      })
      
      setSelectedIndex(0)
      lastQueryRef.current = searchQuery
    } catch (err) {
      console.error('Search failed:', err)
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const activateItem = useCallback(async (result) => {
    try {
      if (result.type === 'window') {
        await window.electronAPI.activateWindow(result.id)
      } else if (result.type === 'chrome_tab') {
        await window.electronAPI.activateChromeTab(result.id)
      }
    } catch (err) {
      console.error('Failed to activate item:', err)
      setError(err.message)
    }
  }, [])

  // Memoize props to prevent unnecessary re-renders of ResultsList
  const resultsListProps = useMemo(() => ({
    results,
    selectedIndex,
    onItemClick: activateItem,
    loading
  }), [results, selectedIndex, activateItem, loading])

  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        event.preventDefault()
        if (results[selectedIndex]) {
          activateItem(results[selectedIndex])
        }
        break
      case 'Escape':
        event.preventDefault()
        setQuery('')
        setResults([])
        setSelectedIndex(0)
        break
    }
  }, [results, selectedIndex, activateItem])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchItems(query)
    }, 50)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, searchItems])

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Focus input on mount and handle clear search event
  useEffect(() => {
    const input = document.querySelector('.search-input')
    if (input) {
      input.focus()
    }

    // Listen for clear search event from main process
    const handleClearSearch = () => {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setError(null)
      // Re-focus input
      setTimeout(() => {
        const input = document.querySelector('.search-input')
        if (input) {
          input.focus()
        }
      }, 100)
    }

    window.electronAPI.onClearSearch(handleClearSearch)

    // Cleanup
    return () => {
      window.electronAPI.removeAllListeners('clear-search')
    }
  }, [])

  return (
    <div className="launcher-container">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search windows and Chrome tabs..."
      />
      
      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          padding: '10px', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Error: {error}
        </div>
      )}
      
      <ResultsList {...resultsListProps} />
    </div>
  )
}

export default App