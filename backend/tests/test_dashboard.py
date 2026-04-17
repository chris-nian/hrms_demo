import pytest
from fastapi.testclient import TestClient


class TestDashboardAPI:
    """仪表盘 API 测试"""

    def test_get_dashboard_stats(self, client: TestClient):
        """测试获取仪表盘统计数据"""
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_employees" in data
        assert "active_employees" in data
        assert "department_count" in data
        assert "pending_approvals" in data
        assert "attendance_rate" in data
        assert "recent_approvals" in data
