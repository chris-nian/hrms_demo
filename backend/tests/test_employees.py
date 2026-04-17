import pytest
from fastapi.testclient import TestClient


class TestEmployeesAPI:
    """员工 API 测试"""

    def test_list_employees(self, client: TestClient):
        """测试获取员工列表"""
        response = client.get("/api/employees")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_create_and_get_employee(self, client: TestClient, sample_employee_data):
        """测试创建和获取员工"""
        # 创建员工
        create_response = client.post("/api/employees", json=sample_employee_data)
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["name"] == sample_employee_data["name"]
        assert created["email"] == sample_employee_data["email"]
        emp_id = created["id"]

        # 获取员工详情
        get_response = client.get(f"/api/employees/{emp_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["id"] == emp_id
        assert fetched["name"] == sample_employee_data["name"]

    def test_get_employee_not_found(self, client: TestClient):
        """测试获取不存在的员工"""
        response = client.get("/api/employees/99999")
        assert response.status_code == 404
