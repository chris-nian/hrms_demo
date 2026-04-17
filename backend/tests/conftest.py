import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import SessionLocal, engine, Base
from models import Employee, Department, Position, Attendance, SalaryConfig, ApprovalFlow, ApprovalRecord


# 同步测试客户端
@pytest.fixture(scope="session")
def client() -> Generator:
    """同步测试客户端"""
    with TestClient(app) as c:
        yield c


# 异步测试客户端
@pytest_asyncio.fixture(scope="function")
async def async_client() -> AsyncGenerator:
    """异步测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# 数据库会话
@pytest.fixture(scope="function")
def db_session():
    """创建独立的数据库会话，每个测试函数后回滚"""
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


# 测试数据 fixtures
@pytest.fixture(scope="session")
def api_prefix():
    """API 前缀"""
    return "/api"


@pytest.fixture(scope="session")
def sample_employee_data():
    """示例员工数据"""
    return {
        "name": "测试员工",
        "email": "test@example.com",
        "phone": "13800138000",
        "department_id": 1,
        "position_id": 1,
        "hire_date": "2024-01-15",
        "status": "active"
    }


@pytest.fixture(scope="session")
def sample_department_data():
    """示例部门数据"""
    return {
        "name": "测试部门",
        "description": "用于测试的部门"
    }


@pytest.fixture(scope="session")
def sample_position_data():
    """示例职位数据"""
    return {
        "title": "测试职位",
        "level": "P3",
        "department_id": 1
    }
