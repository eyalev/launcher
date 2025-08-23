import { memo } from 'react'

const ResultItem = memo(({ result, index, selectedIndex, onItemClick }) => {
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
    <div
      className={`result-item clickable ${index === selectedIndex ? 'selected' : ''}`}
      data-type={result.type}
      onClick={() => onItemClick(result)}
    >
      <div className="result-icon">
        {getIcon(result.type)}
      </div>
      <div className="result-content">
        <div className="result-title">{result.title}</div>
        <div className="result-subtitle">{result.subtitle}</div>
      </div>
    </div>
  )
})

const ResultsList = memo(({ results, selectedIndex, onItemClick, loading }) => {
  if (loading) {
    return <div className="loading">Searching...</div>
  }

  if (results.length === 0) {
    return <div className="no-results">Type to search windows and Chrome tabs</div>
  }

  return (
    <div className="results-container">
      {results.map((result, index) => (
        <ResultItem
          key={`${result.type}-${result.id}`}
          result={result}
          index={index}
          selectedIndex={selectedIndex}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )
})

export default ResultsList