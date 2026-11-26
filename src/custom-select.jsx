import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'

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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => document.getElementById(`${listId}-option-${highlighted}`)?.focus())
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        requestAnimationFrame(() => triggerRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, listId, highlighted])

  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const choose = index => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange?.({ target: { value: option.value } })
    close()
  }

  const focusOption = index => {
    const next = Math.max(0, Math.min(options.length - 1, index))
    setHighlighted(next)
    requestAnimationFrame(() => document.getElementById(`${listId}-option-${next}`)?.focus())
  }

  const handleTriggerKeyDown = event => {
    if (disabled || !options.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setHighlighted(selectedIndex)
      setOpen(true)
    }
  }

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(index + 1) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(index - 1) }
    else if (event.key === 'Home') { event.preventDefault(); focusOption(0) }
    else if (event.key === 'End') { event.preventDefault(); focusOption(options.length - 1) }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  }

  return <div className={`custom-select ${className}`} ref={rootRef}>
    <button
      id={id}
      ref={triggerRef}
      type="button"
      className="custom-select-trigger"
      role="combobox"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? `${listId}-dialog` : undefined}
      disabled={disabled}
      onClick={() => {
        if (disabled || !options.length) return
        setHighlighted(selectedIndex)
        setOpen(true)
      }}
      onKeyDown={handleTriggerKeyDown}
    >
      <span className="custom-select-value">{selected?.label ?? placeholder}</span>
      <ChevronDown className={`custom-select-chevron ${open ? 'open' : ''}`} size={16} aria-hidden="true"/>
    </button>
    {open && createPortal(<div className="custom-select-backdrop" onMouseDown={event => event.target === event.currentTarget && close()} onTouchStart={event => event.target === event.currentTarget && close()}>
      <section className="custom-select-dialog" id={`${listId}-dialog`} role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <div className="custom-select-dialog-head">
          <div><span className="custom-select-eyebrow">TOOLS SLATE · PILIHAN</span><h2>{ariaLabel || 'Pilih opsi'}</h2><p>Pilih satu opsi dari daftar berikut.</p></div>
          <button type="button" className="custom-select-close" aria-label="Tutup pilihan" onClick={close}><X size={18}/></button>
        </div>
        <div className="custom-select-popup" id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => <button
            key={`${option.value}-${index}`}
            id={`${listId}-option-${index}`}
            type="button"
            role="option"
            aria-selected={String(option.value) === String(value)}
            disabled={option.disabled}
            className={`custom-select-option ${index === highlighted ? 'highlighted' : ''} ${String(option.value) === String(value) ? 'selected' : ''}`}
            onFocus={() => setHighlighted(index)}
            onKeyDown={event => handleOptionKeyDown(event, index)}
            onClick={() => choose(index)}
          >
            <span>{option.label}</span>
            {String(option.value) === String(value) && <Check size={16} aria-hidden="true"/>}
          </button>)}
        </div>
      </section>
    </div>, document.body)}
  </div>
}
