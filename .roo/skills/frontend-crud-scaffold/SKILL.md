---
name: frontend-crud-scaffold
description: Scaffold a complete frontend CRUD page for a new entity in the HRMS React application. Use when the user wants to add a new management page (list, create, edit, delete) following the existing UI patterns, CSS design system, and API conventions.
---

# Frontend CRUD Scaffold

## Overview

This skill generates a complete frontend CRUD page for a new entity in the HRMS React + TypeScript application. It follows the existing architectural patterns:

- **Pages**: `src/pages/<Entity>.tsx` — functional component with hooks
- **API**: `src/api/index.ts` — TypeScript interfaces and axios methods
- **Routing**: `src/App.tsx` — React Router route registration
- **Styling**: Semantic CSS classes from `src/index.css` (`.surface-panel`, `.metric-card`, `.data-table`, `.btn-primary`, `.field`, `.status-badge`)
- **i18n**: `src/locales/zh.json` and `src/locales/en.json` — translation keys

## When to Use This Skill

Use this skill when:

- A new backend entity needs a management UI
- The user says "add a page for X", "create the frontend for Y", or "scaffold a CRUD UI"
- You need to extend the existing page set: Dashboard, Employees, Departments, Positions, Attendance, Salary, Approvals

## Workflow

### Step 1: Add API Types and Methods

Edit `frontend/src/api/index.ts`:

1. Add the TypeScript interface:

```typescript
export interface Entity {
  id: number
  name: string
  description?: string
  status: string
  created_at: string
}
```

2. Add CRUD API functions after the existing ones:

```typescript
// Entity APIs
export const getEntities = (params?: Record<string, unknown>) =>
  api.get<ListResponse<Entity>>('/entities/', { params })

export const getEntity = (id: number) =>
  api.get<Entity>(`/entities/${id}`)

export const createEntity = (data: Partial<Entity>) =>
  api.post<Entity>('/entities/', data)

export const updateEntity = (id: number, data: Partial<Entity>) =>
  api.put<Entity>(`/entities/${id}`, data)

export const deleteEntity = (id: number) =>
  api.delete(`/entities/${id}`)
```

### Step 2: Create the Page Component

Create `frontend/src/pages/Entities.tsx` following the existing page patterns:

```tsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getEntities, createEntity, updateEntity, deleteEntity, type Entity } from '../api'
import { Modal, Button } from '../components/ui'

export default function Entities() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Entity | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'active' })

  const fetchItems = async () => {
    setLoading(true)
    const res = await getEntities()
    setItems(res.data.items)
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleSubmit = async () => {
    if (editing) {
      await updateEntity(editing.id, form)
    } else {
      await createEntity(form)
    }
    setModalOpen(false)
    setEditing(null)
    setForm({ name: '', description: '', status: 'active' })
    fetchItems()
  }

  const handleEdit = (item: Entity) => {
    setEditing(item)
    setForm({ name: item.name, description: item.description || '', status: item.status })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('common.confirm_delete'))) return
    await deleteEntity(id)
    fetchItems()
  }

  return (
    <div className="surface-panel">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{t('entities.title')}</h1>
        <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          {t('common.add')}
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>{t('entities.name')}</th>
            <th>{t('entities.status')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td><span className={`status-badge ${item.status}`}>{item.status}</span></td>
              <td>
                <button className="btn-secondary" onClick={() => handleEdit(item)}>{t('common.edit')}</button>
                <button className="btn-danger" onClick={() => handleDelete(item.id)}>{t('common.delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalOpen && (
        <Modal title={editing ? t('entities.edit') : t('entities.create')} onClose={() => setModalOpen(false)}>
          <div className="field">
            <label>{t('entities.name')}</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>{t('entities.description')}</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit}>{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

### Step 3: Register the Route

Edit `frontend/src/App.tsx` and add:

```tsx
import Entities from './pages/Entities'

// Inside the Routes:
<Route path="/entities" element={<Entities />} />
```

Also add the navigation link in `frontend/src/components/Layout.tsx` (if it has a sidebar/menu).

### Step 4: Add i18n Translations

Edit `frontend/src/locales/zh.json`:

```json
{
  "entities": {
    "title": "实体管理",
    "name": "名称",
    "status": "状态",
    "description": "描述",
    "create": "创建实体",
    "edit": "编辑实体"
  }
}
```

Edit `frontend/src/locales/en.json`:

```json
{
  "entities": {
    "title": "Entity Management",
    "name": "Name",
    "status": "Status",
    "description": "Description",
    "create": "Create Entity",
    "edit": "Edit Entity"
  }
}
```

### Step 5: Build and Verify

Run the frontend build to check for TypeScript errors:

```bash
cd frontend && npm run build
```

Or start the dev server:

```bash
cd frontend && npm run dev
```

Verify:
- The page loads without errors
- CRUD operations work correctly
- Styling matches existing pages
- Translations display correctly

## Design System Reference

Use these semantic CSS classes (defined in `index.css`) instead of raw Tailwind utilities:

| Class | Usage |
|-------|-------|
| `.surface-panel` | Main content container |
| `.metric-card` | Dashboard/stat cards |
| `.data-table` | Tables with styled headers/rows |
| `.btn-primary` | Primary action buttons |
| `.btn-secondary` | Secondary action buttons |
| `.btn-danger` | Delete/danger actions |
| `.field` | Form input groups |
| `.status-badge` | Status labels (combine with `.active`, `.inactive`) |
| `.info-cell` | Detail view cells |

## Rules

- Always add both `zh` and `en` translations
- Use existing `ui.tsx` components (Modal, Button, etc.) when available
- Follow the existing page file naming: singular noun, PascalCase (`Employees.tsx`, not `EmployeeList.tsx`)
- Import types with `type` keyword: `import { type Entity } from '../api'`
- Keep API calls in `api/index.ts`, not inline in components
- Default language is Chinese (`zh`), so test in Chinese first
