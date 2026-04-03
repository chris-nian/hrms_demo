# HRMS - 人力资源管理系统设计文档

## 1. 项目概述

构建一个轻量级 HRMS 演示系统，用于向客户展示人力资源管理能力。系统需满足：

- 界面精美大气，商务专业风格（深蓝主色调）
- 单容器运行，无外部依赖
- 基础增删改查 + 薪酬计算器 + 状态机审批流
- 支持中英文切换
- 无登录，直接进入系统

## 2. 技术架构

### 2.1 架构图

```
┌─────────────────────────────────────────┐
│              Docker Container           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  FastAPI (port 8000)            │    │
│  │  ├── /api/*    REST endpoints   │    │
│  │  └── /*        React static     │    │
│  └──────────┬──────────────────────┘    │
│             │                           │
│  ┌──────────▼──────────────────────┐    │
│  │  SQLite (data.db)               │    │
│  │  单文件数据库，零配置            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- 单进程、单端口：FastAPI 同时服务 API 和前端静态文件
- SQLite：数据持久化到容器内单文件，可挂载 volume 持久化
- 前端 React build 产物放在 `frontend/dist/`，FastAPI 做 static file mount

### 2.2 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 类型安全 |
| 样式 | Tailwind CSS 4 | 原子化 CSS |
| 路由 | React Router v7 | SPA 路由 |
| 状态管理 | Zustand | 轻量，无 boilerplate |
| 图表 | Recharts | 薪酬计算器饼图 |
| 国际化 | react-i18next | 中英切换 |
| HTTP | Axios | API 请求 |
| 后端 | FastAPI + Uvicorn | 异步高性能 |
| ORM | SQLAlchemy + Alembic | 数据库模型 + 迁移 |
| 数据库 | SQLite | 零配置 |
| 容器 | Docker multi-stage | 前端构建 + 后端运行 |

## 3. 数据模型

### Department (部门)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| name | String | 部门名称 |
| description | String | 描述 |
| created_at | DateTime | 创建时间 |

### Position (职位)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| title | String | 职位名称 |
| department_id | Integer FK | 所属部门 |
| level | String | 职级 |
| created_at | DateTime | 创建时间 |

### Employee (员工)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| name | String | 姓名 |
| email | String | 邮箱 |
| phone | String | 电话 |
| gender | String | 性别 |
| avatar | String | 头像 URL |
| department_id | Integer FK | 部门 |
| position_id | Integer FK | 职位 |
| hire_date | Date | 入职日期 |
| status | String | active/inactive |
| created_at | DateTime | 创建时间 |

### Attendance (考勤)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| employee_id | Integer FK | 员工 |
| date | Date | 日期 |
| check_in | Time | 签到时间 |
| check_out | Time | 签退时间 |
| status | String | normal/late/absent/leave |

### SalaryConfig (薪酬配置)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| employee_id | Integer FK | 员工（唯一） |
| base_salary | Float | 基本工资 |
| housing_fund_rate | Float | 公积金比例 |
| social_insurance_rate | Float | 社保比例 |
| bonus | Float | 奖金 |
| deduction | Float | 扣款 |

### ApprovalFlow (审批流)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| title | String | 审批标题 |
| type | String | leave/salary_adjust/other |
| applicant_id | Integer FK | 申请人 |
| content | JSON | 申请内容详情 |
| state | String | draft/pending_manager/pending_hr/approved/rejected |
| current_approver_id | Integer FK | 当前审批人 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

### ApprovalRecord (审批记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| flow_id | Integer FK | 审批流 |
| approver_id | Integer FK | 审批人 |
| action | String | approve/reject |
| comment | String | 审批意见 |
| created_at | DateTime | 操作时间 |

## 4. API 设计

### 4.1 部门管理

- `GET /api/departments` - 部门列表
- `POST /api/departments` - 新增部门
- `PUT /api/departments/{id}` - 编辑部门
- `DELETE /api/departments/{id}` - 删除部门

### 4.2 职位管理

- `GET /api/positions` - 职位列表（支持 ?department_id= 筛选）
- `POST /api/positions` - 新增职位
- `PUT /api/positions/{id}` - 编辑职位
- `DELETE /api/positions/{id}` - 删除职位

### 4.3 员工管理

- `GET /api/employees` - 员工列表（支持搜索、筛选、分页）
- `GET /api/employees/{id}` - 员工详情
- `POST /api/employees` - 新增员工
- `PUT /api/employees/{id}` - 编辑员工
- `DELETE /api/employees/{id}` - 删除员工

### 4.4 考勤管理

- `GET /api/attendance` - 考勤记录（支持 ?employee_id=&month= 筛选）
- `GET /api/attendance/stats` - 考勤统计

### 4.5 薪酬计算

- `GET /api/salary/config/{employee_id}` - 获取员工薪酬配置
- `PUT /api/salary/config/{employee_id}` - 更新薪酬配置
- `POST /api/salary/calculate` - 计算薪酬明细（输入参数，返回计算结果）

### 4.6 审批流

- `GET /api/approvals` - 审批列表（支持 ?role=&status= 筛选）
- `GET /api/approvals/{id}` - 审批详情
- `POST /api/approvals` - 发起审批
- `POST /api/approvals/{id}/approve` - 批准
- `POST /api/approvals/{id}/reject` - 驳回

### 4.7 其他

- `GET /api/dashboard/stats` - Dashboard 统计数据
- `POST /api/seed` - 初始化演示数据

## 5. 页面设计

### 5.1 布局

```
┌────────┬─────────────────────────────────┐
│  Logo  │  页面标题          EN/中文  👤   │
├────────┼─────────────────────────────────┤
│        │                                 │
│ 概览   │                                 │
│ 员工   │         页面内容区域             │
│ 部门   │                                 │
│ 考勤   │                                 │
│ 薪酬   │                                 │
│ 审批   │                                 │
│        │                                 │
├────────┤                                 │
│ v1.0.0 │                                 │
└────────┴─────────────────────────────────┘
```

- 左侧固定侧边栏（~240px），可折叠为图标模式（~64px）
- 右侧为顶栏 + 内容区
- 侧边栏底部显示版本号

### 5.2 视觉风格

- **主色调**：深蓝 (#1e3a5f) + 蓝色 (#2563eb)
- **背景**：浅灰 (#f8fafc)
- **卡片**：白色圆角卡片，微阴影
- **状态色**：绿(通过) / 蓝(进行中) / 黄(待处理) / 红(驳回)
- **字体**：Inter (英文) + 系统中文字体

### 5.3 页面列表

| 页面 | 路由 | 功能 |
|------|------|------|
| Dashboard | `/` | 数据概览卡片、最近审批动态 |
| 员工管理 | `/employees` | 员工列表（搜索、筛选、分页）、CRUD |
| 部门管理 | `/departments` | 部门列表、CRUD、显示部门下员工数 |
| 考勤管理 | `/attendance` | 表格视图查看考勤记录、按月统计 |
| 薪酬计算器 | `/salary` | 实时计算税前/税后/社保/公积金/个税 |
| 审批中心 | `/approvals` | 审批列表、发起申请、审批操作、状态机可视化 |

## 6. 薪酬计算器

### 6.1 计算逻辑（中国大陆标准）

```
税前工资 = 基本工资 + 奖金 - 扣款
社保个人 = 税前工资 × 社保比例（默认 10.5%）
公积金个人 = 税前工资 × 公积金比例（默认 12%）
应纳税所得额 = 税前工资 - 社保个人 - 公积金个人 - 5000（起征点）
个人所得税 = 按7级累进税率计算
实发工资 = 税前工资 - 社保个人 - 公积金个人 - 个税
```

### 6.2 七级累进税率

| 级数 | 应纳税所得额 | 税率 | 速算扣除数 |
|------|-------------|------|-----------|
| 1 | ≤3,000 | 3% | 0 |
| 2 | 3,001~12,000 | 10% | 210 |
| 3 | 12,001~25,000 | 20% | 1,410 |
| 4 | 25,001~35,000 | 25% | 2,660 |
| 5 | 35,001~55,000 | 30% | 4,410 |
| 6 | 55,001~80,000 | 35% | 7,160 |
| 7 | >80,000 | 45% | 15,160 |

### 6.3 页面布局

- 左侧：输入区（选员工、基本工资、奖金、扣款、社保/公积金比例滑块）
- 右侧：结果区（实发工资大字展示、各项明细、饼图展示工资构成）
- 实时计算，拖动滑块即更新结果
- 支持导出工资条（打印视图）

## 7. 审批流状态机

### 7.1 状态流转

```
draft ──提交──▶ pending_manager ──批准──▶ pending_hr ──批准──▶ approved
                     │                       │
                     ▼                       ▼
                  rejected                rejected
```

### 7.2 审批类型

- 请假申请：选日期范围、请假类型（年假/事假/病假）
- 薪资调整：填写调整金额和理由
- 其他申请：自由文本

### 7.3 页面功能

- **审批列表**：Tab 切换（我发起的 / 待我审批 / 全部），卡片式展示
- **审批详情**：顶部流程进度条可视化，申请信息，时间线审批记录，审批操作区
- **身份切换**：页面顶部"当前身份"切换器（员工/主管/HR），无需登录即可模拟不同角色

### 7.4 状态标签颜色

- 草稿：灰色
- 待审批：蓝色
- 已通过：绿色
- 已驳回：红色

## 8. 国际化

- 使用 `react-i18next`
- 语言文件：`frontend/src/locales/zh.json` 和 `en.json`
- 右上角语言切换按钮，存入 localStorage 持久化
- 覆盖所有导航菜单、按钮、表头、提示信息
- 业务数据（员工姓名等）不翻译

## 9. 项目结构

```
hrms/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── database.py          # SQLAlchemy 配置
│   ├── models.py            # 数据库模型
│   ├── schemas.py           # Pydantic schemas
│   ├── routers/
│   │   ├── departments.py
│   │   ├── positions.py
│   │   ├── employees.py
│   │   ├── attendance.py
│   │   ├── salary.py
│   │   ├── approvals.py
│   │   └── dashboard.py
│   ├── services/
│   │   ├── salary_calculator.py   # 薪酬计算逻辑
│   │   └── approval_engine.py     # 审批状态机引擎
│   ├── seed.py              # 演示数据初始化
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   ├── pages/           # 页面组件
│   │   ├── stores/          # Zustand stores
│   │   ├── api/             # Axios API 封装
│   │   ├── locales/         # i18n 语言文件
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 10. 演示数据

系统启动时自动 seed 以下演示数据：

- 5 个部门（技术部、产品部、市场部、人事部、财务部）
- 10 个职位
- 20 个员工（含头像、随机数据）
- 当月考勤记录
- 5 条不同状态的审批流
- 每个员工的薪酬配置
