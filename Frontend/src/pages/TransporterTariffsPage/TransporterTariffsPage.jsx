import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useRequireRole from '../../hooks/useRequireRole'
import { getTariffZones, getZoneTariffs, saveTariffs } from '../../api/transporterPortal'
import '../AdminPage/AdminPage.css'
import '../AdminOrdersPage/AdminOrdersPage.css'
import '../SupplierProductsPage/SupplierPages.css'
import '../AdminNewPurchasePage/AdminNewPurchasePage.css'

const ALL = '' // "whole zone" destination value
const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`
const kg = (n) => `${Number(n).toLocaleString('fr-FR')} kg`

export default function TransporterTariffsPage() {
  const allowed = useRequireRole('transporter')
  const { token } = useAuth()
  const [zones, setZones] = useState(null)
  const [zoneID, setZoneID] = useState('')
  const [grid, setGrid] = useState(null)
  const [trajectID, setTrajectID] = useState(ALL)
  // weightLimitID → typed value (string)
  const [inputs, setInputs] = useState({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!allowed) return
    getTariffZones(token).then((data) => {
      setZones(data.zones)
      if (data.zones.length) setZoneID(data.zones[0].zoneID)
    }).catch((err) => setStatus({ error: true, text: err.message }))
  }, [allowed, token])

  const loadGrid = useCallback(() => {
    if (!zoneID) return
    getZoneTariffs(zoneID, token).then(setGrid).catch((err) => setStatus({ error: true, text: err.message }))
  }, [zoneID, token])

  useEffect(() => {
    setGrid(null)
    setTrajectID(ALL)
    loadGrid()
  }, [loadGrid])

  // Current cost(s) per bracket for the selection: a single value, a range, or nothing.
  const current = useMemo(() => {
    if (!grid) return {}
    const targets = trajectID === ALL ? grid.destinations.map((d) => d.trajectID) : [trajectID]
    const byBracket = {}
    for (const b of grid.brackets) {
      const costs = grid.rates
        .filter((r) => r.weightLimitID === b.weightLimitID && targets.includes(r.trajectID))
        .map((r) => r.transportCost)
      const min = Math.min(...costs)
      const max = Math.max(...costs)
      byBracket[b.weightLimitID] = { count: costs.length, of: targets.length, min, max, uniform: costs.length === targets.length && min === max }
    }
    return byBracket
  }, [grid, trajectID])

  // Pre-fill each input with the current value when there is a single one.
  useEffect(() => {
    if (!grid) return
    setInputs(Object.fromEntries(grid.brackets.map((b) => {
      const c = current[b.weightLimitID]
      return [b.weightLimitID, c && c.count && c.min === c.max ? String(c.min) : '']
    })))
  }, [grid, current])

  const initialValue = (weightLimitID) => {
    const c = current[weightLimitID]
    return c && c.count && c.min === c.max ? String(c.min) : ''
  }
  const changed = grid ? grid.brackets.filter((b) => (inputs[b.weightLimitID] ?? '') !== initialValue(b.weightLimitID)) : []

  const handleSave = async () => {
    for (const b of changed) {
      const v = inputs[b.weightLimitID]
      if (v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)) {
        setStatus({ error: true, text: `Tarif invalide pour la tranche ≤ ${kg(b.weightMax)}.` })
        return
      }
    }
    setSaving(true)
    setStatus(null)
    try {
      await saveTariffs({
        zoneID,
        trajectID: trajectID || undefined,
        rates: changed.map((b) => ({ weightLimitID: b.weightLimitID, transportCost: inputs[b.weightLimitID] === '' ? null : Number(inputs[b.weightLimitID]) })),
      }, token)
      const target = trajectID === ALL ? `les ${grid.destinations.length} pays de la zone` : grid.destinations.find((d) => d.trajectID === trajectID)?.country
      setStatus({ error: false, text: `Tarifs enregistrés pour ${target}.` })
      loadGrid()
      getTariffZones(token).then((data) => setZones(data.zones)).catch(() => {})
    } catch (err) {
      setStatus({ error: true, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (!allowed) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page supplier-page">
      <div className="admin-page__header">
        <div>
          <h1>Mes tarifs</h1>
          <p className="admin-page__muted">Coût de transport au départ de la Côte d’Ivoire, par destination et tranche de poids</p>
        </div>
        <Link to="/" className="admin-page__back">Mon espace</Link>
      </div>

      <section className="admin-panel">
        <div className="new-purchase__row">
          <label className="new-purchase__field">
            <span>Zone</span>
            <select value={zoneID} onChange={(e) => { setZoneID(e.target.value); setStatus(null) }} disabled={!zones}>
              {zones?.map((z) => (
                <option key={z.zoneID} value={z.zoneID}>
                  Zone {z.zoneID} — {z.destinationCount} pays{Number(z.rateCount) > 0 ? ` (${z.rateCount} tarifs)` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="new-purchase__field">
            <span>Destination</span>
            <select value={trajectID} onChange={(e) => { setTrajectID(e.target.value); setStatus(null) }} disabled={!grid}>
              <option value={ALL}>Toute la zone{grid ? ` (${grid.destinations.length} pays)` : ''}</option>
              {grid?.destinations.map((d) => <option key={d.trajectID} value={d.trajectID}>{d.country}</option>)}
            </select>
          </label>
        </div>
        {grid && (
          <p className="supplier-page__notice" style={{ marginTop: '1rem' }}>
            {trajectID === ALL
              ? `Pays de la zone : ${grid.destinations.map((d) => d.country).join(', ')}. Un tarif saisi ici s’applique à tous ces pays ; choisissez un pays pour un tarif spécifique.`
              : 'Tarif spécifique à ce pays. Videz une case et enregistrez pour ne plus desservir cette tranche.'}
          </p>
        )}
      </section>

      {grid && (
        <section className="admin-panel" style={{ marginTop: '1.5rem' }}>
          <div className="admin-orders__table-wrap">
            <table className="admin-orders__table new-purchase__table">
              <thead>
                <tr>
                  <th>Poids jusqu’à</th>
                  <th>Tarif actuel</th>
                  <th>Nouveau tarif (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {grid.brackets.map((b) => {
                  const c = current[b.weightLimitID]
                  const isChanged = changed.includes(b)
                  return (
                    <tr key={b.weightLimitID} className={isChanged ? 'new-purchase__line--active' : ''}>
                      <td><strong>{kg(b.weightMax)}</strong></td>
                      <td className="admin-page__muted">
                        {!c?.count && 'Non desservi'}
                        {c?.count > 0 && c.min === c.max && fcfa(c.min)}
                        {c?.count > 0 && c.min !== c.max && `Varie : ${fcfa(c.min)} – ${fcfa(c.max)}`}
                        {c?.count > 0 && c.count < c.of && ` (${c.count}/${c.of} pays)`}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          placeholder={c?.count && c.min !== c.max ? 'Prix unique…' : '—'}
                          value={inputs[b.weightLimitID] ?? ''}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [b.weightLimitID]: e.target.value }))}
                          aria-label={`Tarif jusqu’à ${kg(b.weightMax)}`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {status && (
            <p className={`supplier-form__status ${status.error ? 'supplier-form__status--error' : ''}`}>{status.text}</p>
          )}
          <div className="supplier-page__actions" style={{ marginTop: '1rem' }}>
            <button className="supplier-page__primary" disabled={saving || changed.length === 0} onClick={handleSave}>
              {saving ? 'Enregistrement…' : `Enregistrer${changed.length ? ` (${changed.length})` : ''}`}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
