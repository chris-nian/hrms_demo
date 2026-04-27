# Requirements Specification Document - Recruiting Interview and Hiring Management

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-27 | CoStrict | Initial requirements draft |

---

## 1. Project Overview

### 1.1 Background

HRMS-Eng currently provides a basic recruiting module (`backend/routers/candidates.py`, `frontend/src/pages/Recruiting.tsx`) that allows users to create candidates, assign them to positions and owners, and track their progress through six fixed stages: new, screening, interview, offer, hired, rejected. This is displayed as a simple kanban board with basic CRUD operations.

The existing `Candidate` model stores minimal information (name, email, phone, position_id, owner_id, stage, source, notes). There is no support for structured interview rounds, interviewer assignments, evaluation scoring, offer letter management, or seamless handoff to the employee onboarding flow. As the organization scales, HR and hiring managers need a more structured recruiting process to ensure consistent candidate evaluation and traceable hiring decisions.

### 1.2 Objectives

The objective of this module enhancement is to transform the basic candidate tracker into a comprehensive recruiting interview and hiring management system that supports:

- Structured candidate pipeline management with configurable stages
- Multi-round interview scheduling with date, time, location, and mode
- Assignment of multiple interviewers to each interview round
- Standardized evaluation forms and scoring per interview round
- Hiring workflow progression with stage-gate controls
- Offer letter generation and approval workflow
- One-click conversion of hired candidates into employee records for onboarding

### 1.3 Scope

#### In Scope

- Enhancement of candidate data model and pipeline tracking
- Interview schedule creation, update, and cancellation
- Interview round management (multiple rounds per candidate)
- Interviewer assignment and availability tracking
- Evaluation form templates and per-interview scoring
- Hiring stage workflow with stage transition validation
- Offer management (create, edit, approve, send, withdraw)
- Candidate-to-employee conversion integration
- Dashboard updates to include recruiting metrics

#### Out of Scope

- External job board integrations (resume parsing from third-party sources)
- Email/SMS notification system (the product explicitly does not implement email notifications)
- Calendar system integrations (Google Calendar, Outlook, etc.)
- Advanced BI reporting and trend analytics
- Resume file upload and storage (file attachments are not implemented in the system)
- Background check or reference check automation
- Multi-language offer letter generation beyond Chinese and English

---

## 2. Functional Requirements

### 2.1 User Roles

| Role Name | Description | Permissions |
|-----------|-------------|-------------|
| HR Administrator (hr) | Full authority over recruiting module configuration and candidate lifecycle | Manage candidates, interviews, evaluations, offers, hiring decisions, and candidate-to-employee conversion |
| Hiring Manager (manager) | Reviews candidates for their open positions and participates in interviews | View assigned candidates, manage interviews for their positions, submit evaluations, approve/reject offer proposals |
| Interviewer (employee) | Participates in interviews and submits evaluations | View interview schedule, submit evaluation scores and feedback |

> **Note**: The system uses the existing three-role model (`employee`, `manager`, `hr`). The HR and Hiring Manager roles drive workflow approval actions. Interviewers are any employees assigned to an interview round.

### 2.2 Feature List

#### 2.2.1 Candidate Pipeline Management

- **Requirement ID**: FR-001
- **Requirement Description**: Extend the existing candidate model to support richer candidate profiles and pipeline tracking. Candidates must retain name, email, phone, position, owner, source, and notes. The stage field must support an extended set of stages: `new`, `screening`, `phone_interview`, `onsite_interview`, `evaluation`, `offer_pending`, `offer_sent`, `offer_accepted`, `hired`, `rejected`, `withdrawn`.
- **Priority**: High
- **Acceptance Criteria**:
  - Existing candidate records with stages `new`, `screening`, `interview`, `offer`, `hired`, `rejected` migrate cleanly (map `interview` → `onsite_interview`, `offer` → `offer_pending`)
  - The kanban board on the Recruiting page reflects the new stage set
  - Stage transitions follow a defined state machine (see FR-006)
- **Dependencies**: None

- **Requirement ID**: FR-002
- **Requirement Description**: Allow candidates to be viewed in both kanban board and list table formats. The list view must support sorting by name, stage, position, source, owner, and created date. Filtering must support stage, position, source, and owner multi-select.
- **Priority**: High
- **Acceptance Criteria**:
  - Toggle between kanban and list view on the Recruiting page
  - Sorting controls are available in list view
  - Multi-select filters reduce the displayed candidate set correctly
- **Dependencies**: FR-001

- **Requirement ID**: FR-003
- **Requirement Description**: Add a candidate detail view that aggregates all candidate information, interview history, evaluation summaries, and activity timeline. The detail view must be accessible by clicking a candidate card in either kanban or list view.
- **Priority**: High
- **Acceptance Criteria**:
  - Detail view displays candidate profile, current stage, position, owner, source
  - Interview history is listed chronologically
  - Evaluation scores are aggregated per round
  - Activity timeline shows stage changes, interview schedules, and offer events
- **Dependencies**: FR-001

#### 2.2.2 Interview Scheduling and Rounds

- **Requirement ID**: FR-004
- **Requirement Description**: Support creating interview schedules for a candidate. An interview schedule consists of one or more interview rounds. Each round must have: round name/title (e.g., "Technical Interview", "HR Interview"), scheduled date, scheduled start time, scheduled end time, interview mode (`online`, `onsite`, `phone`), location or meeting link, and status (`scheduled`, `in_progress`, `completed`, `cancelled`).
- **Priority**: High
- **Acceptance Criteria**:
  - HR and Hiring Manager can add, edit, and delete interview rounds for a candidate
  - Round times do not overlap for the same candidate
  - Changing a round status to `completed` is only allowed if the round's scheduled date has passed or if explicitly confirmed
- **Dependencies**: FR-001

- **Requirement ID**: FR-005
- **Requirement Description**: Display interview schedules in a calendar or timeline view within the recruiting module. Users must be able to view interviews by day, week, or candidate.
- **Priority**: Medium
- **Acceptance Criteria**:
  - A timeline/calendar section shows upcoming interviews
  - Filtering by interviewer or candidate is supported
  - Clicking an interview round opens its detail and evaluation panel
- **Dependencies**: FR-004

#### 2.2.3 Interviewer Assignments

- **Requirement ID**: FR-006
- **Requirement Description**: Allow assignment of one or more employees as interviewers to each interview round. The assigned interviewers must be notified (via in-app UI updates, not email) that they have an interview to attend. Interviewers must be able to view their upcoming interviews on the Recruiting page.
- **Priority**: High
- **Acceptance Criteria**:
  - Each interview round can have 1–5 interviewers assigned
  - Assigned interviewers appear in the round detail
  - Interviewers can see a "My Interviews" filter on the Recruiting page
  - Only assigned interviewers, the candidate owner, and HR can view and submit evaluations for that round
- **Dependencies**: FR-004

#### 2.2.4 Evaluation and Scoring

- **Requirement ID**: FR-007
- **Requirement Description**: Provide a standardized evaluation form per interview round. The form must support configurable criteria (e.g., "Technical Skills", "Communication", "Cultural Fit") each scored on a numeric scale of 1–5. Each criterion has a weight factor, and the system computes a weighted average score. Interviewers must also provide free-text feedback.
- **Priority**: High
- **Acceptance Criteria**:
  - Evaluation criteria are defined at the module level by HR and applied to all interview rounds
  - Each interviewer submits scores for each criterion independently
  - Weighted average is calculated automatically after all assigned interviewers submit
  - Free-text feedback is stored per interviewer
  - Evaluation submission is only allowed after the round status is `completed`
- **Dependencies**: FR-006

- **Requirement ID**: FR-008
- **Requirement Description**: Aggregate evaluation results across all completed rounds for a candidate. The candidate detail view must show per-round average scores and an overall candidate score. HR and Hiring Managers can view all interviewer submissions; interviewers can only view their own submissions.
- **Priority**: High
- **Acceptance Criteria**:
  - Per-round average score is the mean of all interviewer weighted averages for that round
  - Overall candidate score is the mean of all round averages
  - Score visibility respects role permissions
- **Dependencies**: FR-007

#### 2.2.5 Hiring Workflow and Stages

- **Requirement ID**: FR-009
- **Requirement Description**: Define a stage transition state machine for candidates. Valid forward transitions: `new` → `screening` → `phone_interview` → `onsite_interview` → `evaluation` → `offer_pending` → `offer_sent` → `offer_accepted` → `hired`. Candidates can move to `rejected` or `withdrawn` from any stage except `hired`. Moving to `hired` requires all interview rounds to be completed and at least one evaluation to exist.
- **Priority**: High
- **Acceptance Criteria**:
  - Invalid stage transitions are blocked by the backend
  - Moving to `hired` is blocked if interview rounds are incomplete or evaluations are missing
  - Rejection and withdrawal require a reason comment
- **Dependencies**: FR-001, FR-004

- **Requirement ID**: FR-010
- **Requirement Description**: Implement a hiring approval workflow using the existing approval engine (`draft → pending_manager → pending_hr → approved|rejected`) for transitioning a candidate to `hired`. When a Hiring Manager proposes to hire a candidate, an approval flow of type `hire_proposal` is created. Upon final HR approval, the candidate stage automatically updates to `hired`.
- **Priority**: High
- **Acceptance Criteria**:
  - Hire proposal contains candidate ID, position ID, and proposed hire date
  - Manager approves first, then HR approves
  - On final approval, candidate stage transitions to `hired`
  - Rejection reverts the candidate to `evaluation` stage with a comment
- **Dependencies**: FR-009

#### 2.2.6 Offer Management

- **Requirement ID**: FR-011
- **Requirement Description**: Support creation and management of offer records for candidates. An offer must contain: candidate ID, position ID, proposed base salary, bonus amount, proposed start date, employment type (`full_time`, `contractor`, `intern`), work location, offer status (`draft`, `pending_approval`, `approved`, `sent`, `accepted`, `rejected`, `withdrawn`), and notes. Offer creation is only allowed when the candidate stage is `evaluation` or later.
- **Priority**: High
- **Acceptance Criteria**:
  - HR can create and edit offers
  - Offers are linked to a candidate and visible in the candidate detail view
  - Offer status changes follow a logical progression
  - An offer must be approved (via the hiring approval workflow FR-010) before status can become `sent`
- **Dependencies**: FR-009

- **Requirement ID**: FR-012
- **Requirement Description**: Track offer acceptance or rejection. When an offer is marked `accepted`, the candidate stage must automatically transition to `offer_accepted`. When an offer is marked `rejected`, the candidate stage transitions to `rejected` with a rejection reason.
- **Priority**: High
- **Acceptance Criteria**:
  - Accepting an offer updates both offer status and candidate stage
  - Rejecting an offer requires a reason and updates candidate stage
  - Only HR can mark an offer as accepted or rejected on behalf of the candidate
- **Dependencies**: FR-011

#### 2.2.7 Candidate-to-Employee Onboarding Integration

- **Requirement ID**: FR-013
- **Requirement Description**: Provide a one-click "Convert to Employee" action for candidates in `hired` stage. This action must create a new `Employee` record using candidate data (name, email, phone, position). The hire date must be set to the offer's proposed start date. After conversion, the candidate record remains in `hired` stage with a reference to the new employee ID.
- **Priority**: High
- **Acceptance Criteria**:
  - Conversion is only available for candidates in `hired` stage with an accepted offer
  - A new employee record is created with auto-generated employee number
  - Position and department are pre-filled from the candidate's assigned position
  - The candidate record is updated with the new employee ID to maintain traceability
  - After conversion, HR is redirected to the employee detail page to complete remaining fields (salary config, manager, etc.)
- **Dependencies**: FR-010, FR-012

#### 2.2.8 Recruiting Dashboard Metrics

- **Requirement ID**: FR-014
- **Requirement Description**: Extend the existing Dashboard page to include recruiting metrics. The recruiting metrics section must display: total active candidates, candidates by stage distribution, average days-in-stage, upcoming interviews count, pending evaluations count, pending hire proposals count, and offer acceptance rate.
- **Priority**: Medium
- **Acceptance Criteria**:
  - Dashboard displays recruiting metric cards
  - Metrics are computed from candidate, interview, evaluation, and offer data
  - Data updates reflect the current state without requiring page refresh
- **Dependencies**: FR-001, FR-004, FR-007, FR-011

---

## 3. User Stories

### 3.1 Candidate Pipeline Tracking

**As an** HR Administrator  
**I want** to view all candidates in a kanban board and list view with filtering and sorting  
**So that** I can quickly understand the pipeline status and locate specific candidates

**Acceptance Conditions**:
- Kanban board shows candidates grouped by stage with drag-and-drop style visualization
- List view supports pagination, multi-column sorting, and multi-select filters
- Candidate detail view opens with one click and shows complete profile and history

### 3.2 Interview Round Scheduling

**As a** Hiring Manager  
**I want** to schedule multiple interview rounds for a candidate with specific times, modes, and locations  
**So that** the interview process is organized and all participants know when and where to attend

**Acceptance Conditions**:
- I can add, edit, and remove rounds from a candidate's interview schedule
- Rounds cannot overlap in time for the same candidate
- I can assign interviewers to each round from the employee directory
- Interviewers see the round in their "My Interviews" view

### 3.3 Submitting Interview Evaluations

**As an** Interviewer  
**I want** to submit scored evaluations using a standardized form after completing my interview  
**So that** the hiring team has structured, comparable feedback for each candidate

**Acceptance Conditions**:
- The evaluation form presents the criteria defined by HR (e.g., Technical Skills, Communication, Cultural Fit)
- I can score each criterion from 1 to 5 and provide written feedback
- I can only submit after the round status is marked completed
- My scores contribute to the round's aggregated average

### 3.4 Aggregated Hiring Decision View

**As a** Hiring Manager  
**I want** to see all evaluation scores and feedback across rounds for a candidate  
**So that** I can make an informed hire/no-hire recommendation

**Acceptance Conditions**:
- The candidate detail view shows per-round average scores and overall score
- I can read all interviewer feedback
- I can initiate a hire proposal that routes through the approval workflow

### 3.5 Offer Creation and Tracking

**As an** HR Administrator  
**I want** to create an offer letter record with salary and employment details for a candidate  
**So that** we can formally propose employment and track the candidate's response

**Acceptance Conditions**:
- I can create an offer only for candidates who have completed all interview rounds
- Offers require approval through the existing manager-then-HR workflow
- Once approved, I can mark the offer as sent, and later as accepted or rejected
- Offer status changes automatically update the candidate's stage

### 3.6 Convert Candidate to Employee

**As an** HR Administrator  
**I want** to convert a hired candidate into an employee record with one action  
**So that** the onboarding process begins without re-entering basic candidate information

**Acceptance Conditions**:
- The convert action is available only for candidates in `hired` stage with an accepted offer
- A new employee record is created pre-filled with candidate name, email, phone, position
- Employee number is auto-generated
- I am taken to the employee edit page to complete remaining required fields
- The candidate record retains a link to the new employee for audit purposes

---

## 4. Data Requirements

### 4.1 Data Entities

- **Candidate**: Extended from existing model. Adds `employee_id` (foreign key to Employee, nullable), `current_stage_entered_at` (datetime), and `rejection_reason` (text, nullable).
- **InterviewRound**: New entity. Represents a single round in a candidate's interview process. Attributes: id, candidate_id, title, scheduled_date, start_time, end_time, mode, location, status, created_at, updated_at.
- **InterviewAssignment**: New entity. Links employees to interview rounds. Attributes: id, interview_round_id, employee_id.
- **EvaluationCriterion**: New entity. Configurable criteria template. Attributes: id, name, description, weight, sort_order, is_active.
- **Evaluation**: New entity. Contains a single interviewer's evaluation for a round. Attributes: id, interview_round_id, interviewer_id, submitted_at.
- **EvaluationScore**: New entity. Individual scores within an evaluation. Attributes: id, evaluation_id, criterion_id, score (1–5).
- **Offer**: New entity. Represents an employment offer. Attributes: id, candidate_id, position_id, base_salary, bonus, proposed_start_date, employment_type, work_location, status, created_at, updated_at, sent_at, responded_at, notes.

### 4.2 Data Flow

1. **Candidate Entry**: HR creates a Candidate record (or uses existing). Candidate enters `new` stage.
2. **Pipeline Progression**: As the candidate advances, HR or Hiring Manager updates the stage following the state machine.
3. **Interview Scheduling**: HR/Hiring Manager creates InterviewRounds and assigns Interviewers via InterviewAssignments.
4. **Evaluation Submission**: After a round is completed, assigned Interviewers create Evaluation records with EvaluationScores.
5. **Hiring Proposal**: Hiring Manager initiates a hire proposal, creating an ApprovalFlow of type `hire_proposal`.
6. **Offer Creation**: Upon approval (or in parallel), HR creates an Offer record linked to the candidate.
7. **Offer Acceptance**: HR marks offer as accepted; candidate stage becomes `offer_accepted`.
8. **Conversion**: HR triggers candidate-to-employee conversion, creating an Employee record and linking it back to the Candidate.

---

## 5. Assumptions and Dependencies

### 5.1 Assumptions

- The existing `Candidate` model in `backend/models.py` will be extended with new columns; existing data requires a schema migration via the project's custom SQLite schema upgrade mechanism.
- The existing approval engine state machine (`draft → pending_manager → pending_hr → approved|rejected`) is reused as-is for hire proposals.
- The frontend will continue using the existing semantic CSS design system (`.surface-panel`, `.btn-primary`, `.data-table`, `.status-badge`, etc.) and React 18 + Tailwind stack.
- Chinese remains the default UI language; all new UI text must be added to both `zh.json` and `en.json` localization files.
- The client-side role switcher (`employee` / `manager` / `hr`) continues to drive UI permissions; backend enforces real role checks for approval actions.

### 5.2 Dependencies

- **Existing Employee module**: Candidate-to-employee conversion depends on `employees.py` router and `Employee` model for creating new records.
- **Existing Position module**: Offers and candidates depend on `positions.py` and `Position` model for department and job context.
- **Existing Approval module**: Hire proposals depend on `approvals.py` router and `approval_engine.py` state machine.
- **Existing Localization system**: New labels depend on `react-i18next` and the `frontend/src/locales/` files.
- **Existing Recruiting page**: The enhanced module will extend `frontend/src/pages/Recruiting.tsx` rather than replace it.

---

## 6. Traceability Matrix

| Requirement ID | User Story | Priority | Related Requirement |
|----------------|------------|----------|---------------------|
| FR-001 | Candidate Pipeline Tracking | High | — |
| FR-002 | Candidate Pipeline Tracking | High | FR-001 |
| FR-003 | Candidate Pipeline Tracking | High | FR-001 |
| FR-004 | Interview Round Scheduling | High | FR-001 |
| FR-005 | Interview Round Scheduling | Medium | FR-004 |
| FR-006 | Interview Round Scheduling | High | FR-004 |
| FR-007 | Submitting Interview Evaluations | High | FR-006 |
| FR-008 | Aggregated Hiring Decision View | High | FR-007 |
| FR-009 | Aggregated Hiring Decision View | High | FR-001, FR-004 |
| FR-010 | Aggregated Hiring Decision View | High | FR-009 |
| FR-011 | Offer Creation and Tracking | High | FR-009 |
| FR-012 | Offer Creation and Tracking | High | FR-011 |
| FR-013 | Convert Candidate to Employee | High | FR-010, FR-012 |
| FR-014 | — | Medium | FR-001, FR-004, FR-007, FR-011 |
