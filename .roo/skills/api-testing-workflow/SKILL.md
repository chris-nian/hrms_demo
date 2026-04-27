---
name: api-testing-workflow
description: Generate and run API tests for the HRMS FastAPI backend. Use when the user needs to create tests for new endpoints, add test coverage for existing routers, or run the backend test suite. Follows the existing pytest conventions in backend/tests/.
---

# API Testing Workflow

## Overview

This skill automates the creation and execution of API tests for the HRMS FastAPI backend. Tests use pytest with the existing fixtures in `backend/tests/conftest.py`.

## When to Use This Skill

Use this skill when:

- A new router or endpoint is added and needs tests
- The user says "write tests", "add test coverage", or "test this API"
- Existing tests need to be updated after schema changes
- The user wants to run the test suite

## Project Test Conventions

- Tests live in `backend/tests/`
- Run from the `backend/` directory: `python3 -m pytest tests/ -v`
- Use the `./run-tests.sh backend` script from the project root
- `conftest.py` provides a `client` fixture (TestClient) and test isolation
- `HRMS_DATA_DIR` must be set to a temp directory before importing `main` to avoid seeding conflicts

## Workflow

### Step 1: Inspect Existing Tests

Read the relevant existing test file to understand patterns:
- `backend/tests/test_employees.py`
- `backend/tests/test_departments.py`
- `backend/tests/test_workflows.py`

Key patterns to follow:
- Use the `client` fixture from `conftest.py`
- Use `client.post("/api/employees/", json={...})` for create
- Use `client.get("/api/employees/1")` for read
- Use `client.put("/api/employees/1", json={...})` for update
- Use `client.delete("/api/employees/1")` for soft-delete (sets status to "inactive")
- Assert on `response.status_code` and `response.json()`

### Step 2: Generate Test File for New Router

Create `backend/tests/test_<entity>.py` following this template:

```python
import pytest

# If testing a new model, you may need to import it
from models import NewEntity


def test_create_entity(client):
    payload = {
        "name": "Test Entity",
        "status": "active",
    }
    response = client.post("/api/entities/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]
    assert "id" in data


def test_list_entities(client):
    response = client.get("/api/entities/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


def test_get_entity(client):
    # Create first
    create_resp = client.post("/api/entities/", json={"name": "Get Me"})
    entity_id = create_resp.json()["id"]

    response = client.get(f"/api/entities/{entity_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Get Me"


def test_update_entity(client):
    create_resp = client.post("/api/entities/", json={"name": "Old Name"})
    entity_id = create_resp.json()["id"]

    response = client.put(f"/api/entities/{entity_id}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


def test_delete_entity_soft(client):
    create_resp = client.post("/api/entities/", json={"name": "To Delete"})
    entity_id = create_resp.json()["id"]

    response = client.delete(f"/api/entities/{entity_id}")
    assert response.status_code == 200

    get_resp = client.get(f"/api/entities/{entity_id}")
    assert get_resp.json()["status"] == "inactive"
```

### Step 3: Handle Special Cases

#### Approval Workflow Tests

If testing approval endpoints, remember:
- The approval state machine is: `draft → pending_manager → pending_hr → approved|rejected`
- Side effects (attendance records, salary updates) happen in `routers/approvals.py`, not in `services/approval_engine.py`
- Test each transition and verify side effects

#### Auth/Role Tests

If testing role-based access:
- The backend approval router enforces real role checks
- Use different role payloads or mock the role context as needed

### Step 4: Run Tests

From the project root:
```bash
./run-tests.sh backend
```

Or from the backend directory:
```bash
cd backend && python3 -m pytest tests/ -v
```

For a specific test file:
```bash
cd backend && python3 -m pytest tests/test_entities.py -v
```

For a specific test:
```bash
cd backend && python3 -m pytest tests/test_entities.py::test_create_entity -v
```

### Step 5: Fix Failures

If tests fail:
1. Read the error traceback
2. Check if the router returns the expected status code
3. Check if the response schema matches the test assertions
4. Update the test or fix the router accordingly

## Rules

- Tests must be deterministic — do not rely on external state or timing
- Clean up any created resources in tests if needed (though `conftest.py` handles database isolation)
- Do not use `print()` for debugging; use `pytest -v` and assertions
- Follow the naming convention: `test_<action>_<entity>`
- Keep tests focused — one behavior per test function
