import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getProductDivisions, getProductLines, getProductTypesByLine,
  createDivision, updateDivision, deleteDivision,
  createLine, updateLine, deleteLine,
  createType, updateType, deleteType,
} from '../../api/lookup'
import CategoryColumn from './CategoryColumn'
import '../AdminPage/AdminPage.css'
import './AdminCategoriesPage.css'

export default function AdminCategoriesPage() {
  const { user, loading: authLoading, token } = useAuth()
  const navigate = useNavigate()

  const [divisions, setDivisions] = useState([])
  const [lines, setLines] = useState([])
  const [types, setTypes] = useState([])
  const [selectedDivision, setSelectedDivision] = useState(null)
  const [selectedLine, setSelectedLine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin/categories' } })
    } else if (!user.adminEntity) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, user, navigate])

  const loadDivisions = () => {
    setLoading(true)
    getProductDivisions()
      .then((rows) => {
        setDivisions(rows)
        setSelectedDivision((prev) => prev && rows.some((d) => d.productDivisionID === prev) ? prev : null)
      })
      .catch((err) => setError(err.message || 'Impossible de charger les divisions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user?.adminEntity) return
    loadDivisions()
  }, [user])

  const loadLines = (divisionID) => {
    if (!divisionID) { setLines([]); return }
    getProductLines(divisionID)
      .then((rows) => {
        setLines(rows)
        setSelectedLine((prev) => prev && rows.some((l) => l.productLineID === prev) ? prev : null)
      })
      .catch((err) => setError(err.message || 'Impossible de charger les rayons'))
  }

  useEffect(() => {
    loadLines(selectedDivision)
  }, [selectedDivision])

  const loadTypes = (lineID) => {
    if (!lineID) { setTypes([]); return }
    getProductTypesByLine(lineID)
      .then(setTypes)
      .catch((err) => setError(err.message || 'Impossible de charger les catégories'))
  }

  useEffect(() => {
    loadTypes(selectedLine)
  }, [selectedLine])

  if (authLoading || !user || !user.adminEntity) {
    return <main className="admin-page"><p className="admin-page__muted">Chargement…</p></main>
  }

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Catégories</h1>
          <p className="admin-page__muted">Divisions → rayons → catégories de produits</p>
        </div>
        <Link to="/admin" className="admin-page__back">Tableau de bord</Link>
      </div>

      {error && <p className="admin-page__muted">{error}</p>}

      {loading ? (
        <p className="admin-page__muted">Chargement…</p>
      ) : (
        <div className="cat-columns">
          <CategoryColumn
            title="Divisions"
            items={divisions}
            selectedID={selectedDivision}
            onSelect={(item) => setSelectedDivision(item.productDivisionID)}
            onCreate={async (name) => { await createDivision({ name }, token); loadDivisions() }}
            onUpdate={async (item, name) => { await updateDivision(item.productDivisionID, { name, description: item.description }, token); loadDivisions() }}
            onDelete={async (item) => { await deleteDivision(item.productDivisionID, token); loadDivisions() }}
          />
          <CategoryColumn
            title={selectedDivision ? 'Rayons' : 'Rayons — sélectionnez une division'}
            items={lines}
            selectedID={selectedLine}
            disabled={!selectedDivision}
            onSelect={(item) => setSelectedLine(item.productLineID)}
            onCreate={selectedDivision ? async (name) => {
              await createLine({ name, productDivisionID: selectedDivision }, token)
              loadLines(selectedDivision)
            } : null}
            onUpdate={async (item, name) => {
              await updateLine(item.productLineID, { name, description: item.description, productDivisionID: item.productDivisionID }, token)
              loadLines(selectedDivision)
            }}
            onDelete={async (item) => { await deleteLine(item.productLineID, token); loadLines(selectedDivision) }}
          />
          <CategoryColumn
            title={selectedLine ? 'Catégories' : 'Catégories — sélectionnez un rayon'}
            items={types}
            selectedID={null}
            disabled={!selectedLine}
            onCreate={selectedLine ? async (name) => {
              await createType({ name, productLineID: selectedLine }, token)
              loadTypes(selectedLine)
            } : null}
            onUpdate={async (item, name) => {
              await updateType(item.productTypeID, { name, description: item.description, productLineID: item.productLineID }, token)
              loadTypes(selectedLine)
            }}
            onDelete={async (item) => { await deleteType(item.productTypeID, token); loadTypes(selectedLine) }}
          />
        </div>
      )}
    </main>
  )
}
