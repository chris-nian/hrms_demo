# Task List - Recruiting Interview and Hiring Management

- [x] 1. Implement Candidate Pipeline Extension
  - [x] 1.1 Extend Candidate SQLAlchemy model with employee_id, current_stage_entered_at, rejection_reason columns
  - [x] 1.2 Implement stage value migration mapping existing interview to onsite_interview and offer to offer_pending
  - [x] 1.3 Update Candidate Pydantic schemas for new fields and extended stage enum values
  - [x] 1.4 Update existing candidate CRUD endpoints to support new stage values
  - [x] 1.5 Update Recruiting page kanban board columns for the extended stage set
  - [x] 1.6 Ensure sub-requirement can run independently
  - _Requirement: FR-001_

- [x] 2. Implement Candidate Discovery and Detail Views
  - [x] 2.1 Implement candidate list API endpoint with sorting, pagination, and multi-select filters
  - [x] 2.2 Implement candidate detail API endpoint returning profile and activity timeline
  - [x] 2.3 Build list table view component with sortable columns and kanban/list view toggle
  - [x] 2.4 Build filter bar with stage, position, source, owner multi-select controls
  - [x] 2.5 Build candidate detail modal with profile tab and activity timeline tab
  - [x] 2.6 Ensure sub-requirement can run independently
  - _Requirement: FR-002, FR-003_
  - _Test: List filtering by stage and position, Sorting by created_at desc, Detail endpoint returns profile and timeline_

- [x] 3. Implement Interview Scheduling and Assignment
  - [x] 3.1 Create InterviewRound and InterviewAssignment SQLAlchemy models
  - [x] 3.2 Implement interview round CRUD API endpoints with time overlap validation for same candidate
  - [x] 3.3 Implement /api/interviews/my endpoint for current user's assigned interview rounds
  - [x] 3.4 Implement interview timeline query endpoint with day, week, and candidate filters
  - [x] 3.5 Build interview schedule form modal with date, time, mode, location, and interviewer multi-select
  - [x] 3.6 Build interview calendar/timeline view and My Interviews filter in Recruiting page
  - [x] 3.7 Display assigned interviewers in round detail within candidate detail panel
  - [x] 3.8 Ensure sub-requirement can run independently
  - _Requirement: FR-004, FR-005, FR-006_
  - _Test: Create interview round with conflict checking, My interviews endpoint returns assigned rounds, Timeline query with date filter_

- [x] 4. Implement Evaluation Criteria and Submission
  - [x] 4.1 Create EvaluationCriterion, Evaluation, and EvaluationScore SQLAlchemy models
  - [x] 4.2 Implement evaluation criteria CRUD API endpoints for HR management
  - [x] 4.3 Implement evaluation submission endpoint for completed rounds with scores and feedback
  - [x] 4.4 Implement weighted average score calculation per evaluation using criterion weights
  - [x] 4.5 Build evaluation form component with 1-5 scoring per criterion and feedback textarea
  - [x] 4.6 Integrate evaluation submission UI into candidate detail evaluations tab
  - [x] 4.7 Ensure sub-requirement can run independently
  - _Requirement: FR-007_
  - _Test: Submit evaluation with criterion scores, Weighted average score calculation, Criteria CRUD operations_

- [x] 5. Implement Evaluation Aggregation and Permissions
  - [x] 5.1 Implement round average score calculation as mean of interviewer weighted averages
  - [x] 5.2 Implement overall candidate score calculation as mean of completed round averages
  - [x] 5.3 Implement score visibility logic respecting role permissions
  - [x] 5.4 Integrate per-round and overall score display into candidate detail evaluations tab
  - [x] 5.5 Ensure sub-requirement can run independently
  - _Requirement: FR-008_

- [x] 6. Implement Hiring Stage Workflow and Approval
  - [x] 6.1 Implement stage transition validator service with valid forward chain and rejection rules
  - [x] 6.2 Implement candidate stage update endpoint with transition validation and reason requirement
  - [x] 6.3 Enforce hired transition requirements checking completed rounds and existing evaluations
  - [x] 6.4 Extend approvals router to accept hire_proposal flow type and validate content
  - [x] 6.5 Implement hire proposal side effect handler updating candidate stage on final approval
  - [x] 6.6 Build stage progression controls and hire proposal initiation UI in candidate detail
  - [x] 6.7 Ensure sub-requirement can run independently
  - _Requirement: FR-009, FR-010_
  - _Test: Valid stage transition allowed, Hired transition blocked without evaluations, Hire proposal approval triggers stage change_

- [x] 7. Implement Offer Lifecycle Management
  - [x] 7.1 Create Offer SQLAlchemy model with salary, dates, employment type, status fields
  - [x] 7.2 Implement offer CRUD API endpoints with status progression validation
  - [x] 7.3 Implement offer state coordinator enforcing evaluation stage creation and approval before sent
  - [x] 7.4 Implement offer accepted handler auto-transitioning candidate stage to offer_accepted
  - [x] 7.5 Implement offer rejected handler transitioning candidate stage to rejected with reason
  - [x] 7.6 Build offer form modal, offer tab, and status action buttons in candidate detail
  - [x] 7.7 Ensure sub-requirement can run independently
  - _Requirement: FR-011, FR-012_
  - _Test: Create offer when candidate in evaluation stage, Offer sent blocked without approval, Accept offer updates candidate stage_

- [x] 8. Implement Candidate-to-Employee Conversion
  - [x] 8.1 Implement candidate-to-employee conversion endpoint
  - [x] 8.2 Implement employee creation logic with auto-generated employee_no and pre-filled fields
  - [x] 8.3 Update candidate record with employee_id link after conversion
  - [x] 8.4 Build Convert to Employee action button with redirect to employee edit page
  - [x] 8.5 Ensure sub-requirement can run independently
  - _Requirement: FR-013_
  - _Test: Conversion endpoint creates employee, Candidate gets employee_id link, Redirect to employee page_

- [x] 9. Implement Recruiting Dashboard Metrics
  - [x] 9.1 Extend dashboard stats endpoint with recruiting metrics computation
  - [x] 9.2 Implement candidate stage distribution, avg days-in-stage, upcoming interviews calculations
  - [x] 9.3 Implement pending evaluations, pending hire proposals, offer acceptance rate calculations
  - [x] 9.4 Extend DashboardStats schema and build recruiting metric cards on Dashboard page
  - [x] 9.5 Ensure sub-requirement can run independently
  - _Requirement: FR-014_
  - _Test: Dashboard recruiting metrics endpoint, Offer acceptance rate calculation_
