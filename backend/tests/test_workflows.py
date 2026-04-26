from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient
from database import SessionLocal
from models import Department, Employee
from seed import seed


def _create_employee(client: TestClient, suffix: str, role: str = "employee", manager_id: int | None = None):
    dept = client.post("/api/departments", json={
        "name": f"流程测试部门{suffix}",
        "description": "测试部门",
        "headcount_plan": 3,
    }).json()
    pos = client.post("/api/positions", json={
        "title": f"流程测试职位{suffix}",
        "department_id": dept["id"],
        "level": "P5",
        "headcount_plan": 2,
    }).json()
    payload = {
        "employee_no": f"T{suffix}",
        "name": f"流程测试员工{suffix}",
        "email": f"workflow{suffix}@example.com",
        "phone": "13900000000",
        "department_id": dept["id"],
        "position_id": pos["id"],
        "manager_id": manager_id,
        "hire_date": "2024-01-01",
        "status": "active",
        "role": role,
    }
    return client.post("/api/employees", json=payload).json()


class TestAttendanceWorkflow:
    def test_create_update_and_stats(self, client: TestClient):
        suffix = datetime.utcnow().strftime("%H%M%S%f")
        manager = _create_employee(client, f"M{suffix}", role="manager")
        employee = _create_employee(client, f"E{suffix}", manager_id=manager["id"])
        work_date = str(date.today())

        create_response = client.post("/api/attendance", json={
            "employee_id": employee["id"],
            "date": work_date,
            "check_in": f"{work_date}T09:10:00",
            "check_out": f"{work_date}T18:00:00",
            "status": "late",
        })
        assert create_response.status_code == 200
        record = create_response.json()
        assert record["status"] == "late"

        update_response = client.put(f"/api/attendance/{record['id']}", json={
            "employee_id": employee["id"],
            "date": work_date,
            "check_in": f"{work_date}T08:55:00",
            "check_out": f"{work_date}T18:10:00",
            "status": "normal",
        })
        assert update_response.status_code == 200
        assert update_response.json()["status"] == "normal"

        stats = client.get(f"/api/attendance/stats?month={work_date[:7]}").json()
        assert "total_days" in stats
        assert "normal_days" in stats
        assert stats["total_days"] >= 1


class TestApprovalWorkflow:
    def test_leave_approval_links_attendance(self, client: TestClient):
        suffix = datetime.utcnow().strftime("%H%M%S%f")
        manager = _create_employee(client, f"AM{suffix}", role="manager")
        hr = _create_employee(client, f"HR{suffix}", role="hr")
        employee = _create_employee(client, f"AE{suffix}", manager_id=manager["id"])
        leave_date = str(date.today() + timedelta(days=3))

        response = client.post("/api/approvals", json={
            "title": "测试请假申请",
            "type": "leave",
            "applicant_id": employee["id"],
            "content": {"leave_type": "annual", "start_date": leave_date, "end_date": leave_date, "reason": "个人安排"},
        })
        assert response.status_code == 200
        flow = response.json()
        assert flow["applicant_id"] == employee["id"]
        assert flow["state"] == "pending_manager"
        assert flow["current_approver_id"] == manager["id"]

        manager_response = client.post(f"/api/approvals/{flow['id']}/approve", json={
            "approver_id": manager["id"],
            "comment": "同意",
        })
        assert manager_response.status_code == 200
        pending_hr = manager_response.json()
        assert pending_hr["state"] == "pending_hr"
        assert pending_hr["current_approver_id"] == hr["id"] or pending_hr["current_approver_name"]

        hr_response = client.post(f"/api/approvals/{flow['id']}/approve", json={
            "approver_id": pending_hr["current_approver_id"],
            "comment": "通过",
        })
        assert hr_response.status_code == 200
        assert hr_response.json()["state"] == "approved"

        attendance = client.get(f"/api/attendance?employee_id={employee['id']}&month={leave_date[:7]}").json()
        assert any(item["status"] == "leave" and item["date"] == leave_date for item in attendance["items"])

    def test_rejects_invalid_approval_content(self, client: TestClient):
        suffix = datetime.utcnow().strftime("%H%M%S%f")
        manager = _create_employee(client, f"BM{suffix}", role="manager")
        employee = _create_employee(client, f"BE{suffix}", manager_id=manager["id"])

        response = client.post("/api/approvals", json={
            "title": "无效请假申请",
            "type": "leave",
            "applicant_id": employee["id"],
            "content": {"start_date": "bad-date", "end_date": "bad-date"},
        })
        assert response.status_code == 400


class TestSalaryConfig:
    def test_salary_config_persists(self, client: TestClient):
        suffix = datetime.utcnow().strftime("%H%M%S%f")
        employee = _create_employee(client, f"S{suffix}")
        payload = {
            "base_salary": 18000,
            "housing_fund_rate": 0.12,
            "social_insurance_rate": 0.105,
            "bonus": 1000,
            "deduction": 100,
        }
        update_response = client.put(f"/api/salary/config/{employee['id']}", json=payload)
        assert update_response.status_code == 200

        get_response = client.get(f"/api/salary/config/{employee['id']}")
        assert get_response.status_code == 200
        assert get_response.json()["base_salary"] == payload["base_salary"]

    def test_dashboard_salary_coverage_is_capped(self, client: TestClient):
        data = client.get("/api/dashboard/stats").json()
        assert 0 <= data["salary_config_coverage"] <= 100


class TestOrganizationValidation:
    def test_rejects_invalid_position_department(self, client: TestClient):
        response = client.post("/api/positions", json={
            "title": "孤儿岗位",
            "department_id": 999999,
            "level": "P1",
        })
        assert response.status_code == 400


class TestSeedData:
    def test_seed_is_idempotent_for_existing_database(self, client: TestClient):
        db = SessionLocal()
        before = (db.query(Employee).count(), db.query(Department).count())
        db.close()

        seed()

        db = SessionLocal()
        after = (db.query(Employee).count(), db.query(Department).count())
        db.close()
        assert after == before

    def test_rejects_invalid_department_manager(self, client: TestClient):
        response = client.post("/api/departments", json={
            "name": "非法负责人部门",
            "description": "负责人不存在",
            "manager_id": 999999,
            "headcount_plan": 1,
        })
        assert response.status_code == 400
