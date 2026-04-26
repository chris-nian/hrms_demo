import pytest
from fastapi.testclient import TestClient


class TestDepartmentsAPI:
    """部门 API 测试"""

    def test_list_departments(self, client: TestClient):
        """测试获取部门列表"""
        response = client.get("/api/departments")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_create_and_update_department(self, client: TestClient, sample_department_data):
        """测试创建和更新部门"""
        # 创建部门
        create_response = client.post("/api/departments", json=sample_department_data)
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["name"] == sample_department_data["name"]
        dept_id = created["id"]

        # 更新部门
        update_data = {"name": "更新后的部门", "description": "更新描述"}
        update_response = client.put(f"/api/departments/{dept_id}", json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"] == update_data["name"]

    def test_delete_department(self, client: TestClient):
        """测试删除部门"""
        # 先创建一个部门
        create_data = {"name": "待删除部门", "description": "测试删除"}
        create_response = client.post("/api/departments", json=create_data)
        assert create_response.status_code == 200
        dept_id = create_response.json()["id"]

        # 删除部门
        delete_response = client.delete(f"/api/departments/{dept_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["ok"] is True
