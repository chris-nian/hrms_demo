# HRMS 测试指导文档

## 测试框架概述

本项目采用双栈测试机制，为前后端提供完整的测试覆盖：

- **后端测试**: pytest + pytest-asyncio + httpx
- **前端测试**: vitest + @testing-library/react + jsdom

## 快速开始

### 运行所有测试

```bash
./run-tests.sh
```

### 运行后端测试

```bash
./run-tests.sh backend
```

### 运行前端测试

```bash
./run-tests.sh frontend
```

## 后端测试 (pytest)

### 配置

- **配置文件**: [`backend/pyproject.toml`](backend/pyproject.toml:1)
- **Fixtures**: [`backend/tests/conftest.py`](backend/tests/conftest.py:1)
- **测试目录**: `backend/tests/`

### 测试文件

| 文件 | 描述 | 测试数量 |
|------|------|----------|
| [`test_employees.py`](backend/tests/test_employees.py:1) | 员工 API 测试 | 3 |
| [`test_departments.py`](backend/tests/test_departments.py:1) | 部门 API 测试 | 3 |
| [`test_dashboard.py`](backend/tests/test_dashboard.py:1) | 仪表盘 API 测试 | 2 |

### 手动运行

```bash
cd backend
python3 -m pytest tests/ -v
```

### 运行特定测试

```bash
cd backend
python3 -m pytest tests/test_employees.py -v
```

### 生成覆盖率报告

```bash
cd backend
python3 -m pytest tests/ --cov=backend --cov-report=html
```

## 前端测试 (vitest)

### 配置

- **配置文件**: [`frontend/vitest.config.ts`](frontend/vitest.config.ts:1)
- **Setup 文件**: [`frontend/src/test/setup.ts`](frontend/src/test/setup.ts:1)
- **测试目录**: `frontend/src/**/__tests__/`

### 测试文件

| 文件 | 描述 | 测试数量 |
|------|------|----------|
| [`appStore.test.ts`](frontend/src/stores/__tests__/appStore.test.ts:1) | Zustand store 测试 | 3 |
| [`index.test.ts`](frontend/src/api/__tests__/index.test.ts:1) | API 客户端测试 | 1 |
| [`Layout.test.tsx`](frontend/src/components/__tests__/Layout.test.tsx:1) | 布局组件测试 | 1 |

### 手动运行

```bash
cd frontend
npm run test
```

### 监视模式

```bash
cd frontend
npm run test:watch
```

### 覆盖率报告

```bash
cd frontend
npm run test:coverage
```

## 测试数据

### 后端 Fixtures

[`conftest.py`](backend/tests/conftest.py:1) 提供以下 fixtures：

- `client`: FastAPI 测试客户端
- `db_session`: 内存 SQLite 数据库会话
- `test_department`: 测试部门数据
- `test_employee`: 测试员工数据

### 前端 Mocks

- [`fileMock.ts`](frontend/src/test/__mocks__/fileMock.ts:1): 静态文件 mock
- [`setup.ts`](frontend/src/test/setup.ts:1): 测试环境初始化

## 编写新测试

### 后端测试示例

```python
# backend/tests/test_example.py
def test_example(client):
    response = client.get("/api/employees")
    assert response.status_code == 200
    assert "items" in response.json()
```

### 前端测试示例

```typescript
// frontend/src/components/__tests__/Example.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Example from '../Example';

describe('Example', () => {
  it('renders correctly', () => {
    render(<Example />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Run tests
        run: ./run-tests.sh
```

## 测试策略

### 后端

1. **单元测试**: 服务层函数测试
2. **集成测试**: API 端点测试（当前主要覆盖）
3. ** fixtures**: 使用内存数据库确保测试隔离

### 前端

1. **单元测试**: Store、工具函数测试
2. **组件测试**: UI 组件渲染和交互测试
3. **集成测试**: API 客户端测试

## 故障排除

### 后端测试失败

1. 检查依赖是否安装：`pip install -r backend/requirements.txt`
2. 确保使用 Python 3.11+
3. 检查 SQLite 是否可用

### 前端测试失败

1. 检查依赖是否安装：`cd frontend && npm install`
2. 确保使用 Node.js 20+
3. 检查 vitest 配置：[`vitest.config.ts`](frontend/vitest.config.ts:1)

## 参考文档

- [pytest 文档](https://docs.pytest.org/)
- [vitest 文档](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
