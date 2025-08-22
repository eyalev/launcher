import { useEffect, useRef } from 'react'

function SearchInput({ value, onChange, placeholder }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      className="search-input clickable"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
    />
  )
}

export default SearchInput