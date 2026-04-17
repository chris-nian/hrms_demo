import pytest
from fastapi.testclient import TestClient


class TestPositionsAPI:
    """职位 API 测试"""

    def test_list_positions(self, client: TestClient):
        """测试获取职位列表"""
        response = client.get("/api/positions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_positions_by_department(self, client: TestClient, sample_department_data):
        """测试按部门筛选职位列表"""
        # 先创建一个部门
        dept_response = client.post("/api/departments", json=sample_department_data)
        assert dept_response.status_code == 200
        dept_id = dept_response.json()["id"]

        # 创建职位
        position_data = {
            "title": "测试工程师",
            "department_id": dept_id,
            "level": "P5"
        }
        pos_response = client.post("/api/positions", json=position_data)
        assert pos_response.status_code == 200

        # 按部门查询
        response = client.get(f"/api/positions?department_id={dept_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["department_id"] == dept_id

    def test_create_and_update_position(self, client: TestClient, sample_department_data):
        """测试创建和更新职位"""
        # 先创建一个部门
        dept_response = client.post("/api/departments", json=sample_department_data)
        assert dept_response.status_code == 200
        dept_id = dept_response.json()["id"]

        # 创建职位
        create_data = {
            "title": "产品经理",
            "department_id": dept_id,
            "level": "P6"
        }
        create_response = client.post("/api/positions", json=create_data)
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["title"] == create_data["title"]
        assert created["level"] == create_data["level"]
        pos_id = created["id"]

        # 更新职位
        update_data = {
            "title": "高级产品经理",
            "department_id": dept_id,
            "level": "P7"
        }
        update_response = client.put(f"/api/positions/{pos_id}", json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["title"] == update_data["title"]
        assert updated["level"] == update_data["level"]

    def test_delete_position(self, client: TestClient, sample_department_data):
        """测试删除职位"""
        # 先创建部门
        dept_response = client.post("/api/departments", json=sample_department_data)
        assert dept_response.status_code == 200
        dept_id = dept_response.json()["id"]

        # 创建职位
        create_data = {
            "title": "待删除职位",
            "department_id": dept_id,
            "level": "P1"
        }
        create_response = client.post("/api/positions", json=create_data)
        assert create_response.status_code == 200
        pos_id = create_response.json()["id"]

        # 删除职位
        delete_response = client.delete(f"/api/positions/{pos_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["ok"] is True

    def test_update_nonexistent_position(self, client: TestClient):
        """测试更新不存在的职位"""
        update_data = {
            "title": "不存在的职位",
            "department_id": 99999,
            "level": "P0"
        }
        response = client.put("/api/positions/99999", json=update_data)
        assert response.status_code == 404

    def test_delete_nonexistent_position(self, client: TestClient):
        """测试删除不存在的职位"""
        response = client.delete("/api/positions/99999")
        assert response.status_code == 404
