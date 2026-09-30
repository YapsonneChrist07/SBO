import request from './client'

export const getProductTypes = () => request('/lookup/product-types')
export const getProductTypesByLine = (lineID) =>
  request(`/lookup/product-types${lineID ? `?lineID=${lineID}` : ''}`)

export const getCities = () => request('/lookup/cities')

export const getProductDivisions = () => request('/lookup/product-divisions')
export const getProductLines = (divisionID) =>
  request(`/lookup/product-lines${divisionID ? `?divisionID=${divisionID}` : ''}`)

export const createDivision = (fields, token) =>
  request('/lookup/product-divisions', { method: 'POST', body: fields, token })
export const updateDivision = (id, fields, token) =>
  request(`/lookup/product-divisions/${id}`, { method: 'PUT', body: fields, token })
export const deleteDivision = (id, token) =>
  request(`/lookup/product-divisions/${id}`, { method: 'DELETE', token })

export const createLine = (fields, token) =>
  request('/lookup/product-lines', { method: 'POST', body: fields, token })
export const updateLine = (id, fields, token) =>
  request(`/lookup/product-lines/${id}`, { method: 'PUT', body: fields, token })
export const deleteLine = (id, token) =>
  request(`/lookup/product-lines/${id}`, { method: 'DELETE', token })

export const createType = (fields, token) =>
  request('/lookup/product-types', { method: 'POST', body: fields, token })
export const updateType = (id, fields, token) =>
  request(`/lookup/product-types/${id}`, { method: 'PUT', body: fields, token })
export const deleteType = (id, token) =>
  request(`/lookup/product-types/${id}`, { method: 'DELETE', token })
