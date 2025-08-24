import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import SearchInput from './components/SearchInput'
import ResultsList from './components/ResultsList'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allItems, setAllItems] = useState([]) // Cache all available items
  const searchTimeoutRef = useRef(null)
  const lastQueryRef = useRef('')

  // Load all items once when app starts
  const loadAllItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Loading all items...')
      const allResults = await window.electronAPI.searchItems('') // Empty query to get all items
      console.log('Loaded all items:', allResults.length)
      setAllItems(allResults)
    } catch (err) {
      console.error('Failed to load items:', err)
      setError(err.message)
      setAllItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Filter items locally - no network calls
  const filterItems = useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const query = searchQuery.toLowerCase()
    const filteredResults = allItems.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query)
    )

    console.log(`Local filter: "${searchQuery}" -> ${filteredResults.length} results`)
    
    // Use a stable sort to maintain consistent order
    filteredResults.sort((a, b) => {
      // Prioritize exact matches in title
      const aExact = a.title.toLowerCase() === query
      const bExact = b.title.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      // Then by title length (shorter = more relevant)
      const lenDiff = a.title.length - b.title.length
      if (lenDiff !== 0) return lenDiff
      
      // Finally alphabetical
      return a.title.localeCompare(b.title)
    })

    setResults(filteredResults)
    setSelectedIndex(0)
  }, [allItems])

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

  // Debounced local filtering (much faster, no debounce needed)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Very short debounce for local filtering
    searchTimeoutRef.current = setTimeout(() => {
      filterItems(query)
    }, 10) // Much shorter since it's just local filtering

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, filterItems])

  // Load all items when app starts
  useEffect(() => {
    loadAllItems()
  }, [loadAllItems])

  // Refresh data when window is shown
  useEffect(() => {
    const handleClearSearch = () => {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setError(null)
      // Refresh all items when window is shown
      loadAllItems()
      
      // Re-focus input
      setTimeout(() => {
        const input = document.querySelector('.search-input')
        if (input) {
          input.focus()
        }
      }, 100)
    }

    window.electronAPI.onClearSearch(handleClearSearch)

    return () => {
      window.electronAPI.removeAllListeners('clear-search')
    }
  }, [loadAllItems])

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Focus input on mount  
  useEffect(() => {
    const input = document.querySelector('.search-input')
    if (input) {
      input.focus()
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