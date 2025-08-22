function ResultsList({ results, selectedIndex, onItemClick, loading }) {
  if (loading) {
    return <div className="loading">Searching...</div>
  }

  if (results.length === 0) {
    return <div className="no-results">Type to search windows and Chrome tabs</div>
  }

  const getIcon = (type) => {
    switch (type) {
      case 'window':
        return '🪟'
      case 'chrome_tab':
        return '🌐'
      default:
        return '📄'
    }
  }

  return (
    <div className="results-container">
      {results.map((result, index) => (
        <div
          key={result.id}
          className={`result-item clickable ${index === selectedIndex ? 'selected' : ''}`}
          data-type={result.type}
          onClick={() => onItemClick(result)}
          onMouseEnter={() => {
            // Optional: Update selection on mouse hover
            // setSelectedIndex(index)
          }}
        >
          <div className="result-icon">
            {getIcon(result.type)}
          </div>
          <div className="result-content">
            <div className="result-title">{result.title}</div>
            <div className="result-subtitle">{result.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ResultsList