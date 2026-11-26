import React, { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export function CustomSelect({
  id,
  value,
  options = [],
  onChange,
  ariaLabel,
  placeholder = 'Pilih…',
  disabled = false,
  className = '',
}) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex(option => String(option.value) === String(value)))
  const [highlighted, setHighlighted] = useState(selectedIndex)
  const selected = options.find(option => String(option.value) === String(value))

  useEffect(() => {
    if (!open) setHighlighted(selectedIndex)
  }, [open, selectedIndex])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onWindowBlur = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [open])

  const choose = index => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange?.({ target: { value: option.value } })
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleKeyDown = event => {
    if (disabled || !options.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const startingIndex = open ? highlighted : selectedIndex
      setHighlighted((startingIndex + direction + options.length) % options.length)
      setOpen(true)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setHighlighted(event.key === 'Home' ? 0 : options.length - 1)
      setOpen(true)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(highlighted)
      else { setHighlighted(selectedIndex); setOpen(true) }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return <div className={`custom-select ${className}`} ref={rootRef}>
    <button
      id={id}
      ref={triggerRef}
      type="button"
      className="custom-select-trigger"
      role="combobox"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      aria-activedescendant={open ? `${listId}-option-${highlighted}` : undefined}
      disabled={disabled}
      onClick={() => {
        if (disabled || !options.length) return
        if (open) setOpen(false)
        else { setHighlighted(selectedIndex); setOpen(true) }
      }}
      onKeyDown={handleKeyDown}
    >
      <span className="custom-select-value">{selected?.label ?? placeholder}</span>
      <ChevronDown className={`custom-select-chevron ${open ? 'open' : ''}`} size={16} aria-hidden="true"/>
    </button>
    {open && <div className="custom-select-popup" id={listId} role="listbox" aria-label={ariaLabel}>
      {options.map((option, index) => <button
        key={`${option.value}-${index}`}
        id={`${listId}-option-${index}`}
        type="button"
        role="option"
        aria-selected={String(option.value) === String(value)}
        disabled={option.disabled}
        className={`custom-select-option ${index === highlighted ? 'highlighted' : ''} ${String(option.value) === String(value) ? 'selected' : ''}`}
        onPointerMove={() => setHighlighted(index)}
        onClick={() => choose(index)}
      >
        <span>{option.label}</span>
        {String(option.value) === String(value) && <Check size={15} aria-hidden="true"/>}
      </button>)}
    </div>}
  </div>
}
