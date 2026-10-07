import React from 'react'
import './RoleSelector.css'

const ROLE_OPTIONS = [
  {
    value: 'client',
    label: 'Client',
    icon: (
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
    ),
  },
  {
    value: 'supplier',
    label: 'Fournisseur',
    icon: (
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    ),
  },
  {
    value: 'transporter',
    label: 'Transporteur',
    icon: (
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
    ),
  },
]

export default function RoleSelector({ value, onChange, legend = 'Je suis' }) {
  return (
    <fieldset className="role-selector">
      <legend className="role-selector__legend">{legend}</legend>
      <div className="role-selector__options">
        {ROLE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`role-selector__option${value === option.value ? ' role-selector__option--active' : ''}`}
          >
            <input
              type="radio"
              name="role"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {option.icon}
            </svg>
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
