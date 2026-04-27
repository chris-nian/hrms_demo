import pytest
from datetime import datetime, date, timedelta


class TestCandidatePipeline:
    """Test candidate pipeline management (FR-001, FR-002, FR-003)"""

    def test_create_candidate(self, client, api_prefix):
        res = client.post(f"{api_prefix}/candidates", json={
            "name": "Alice",
            "email": "alice@example.com",
            "phone": "1234567890",
            "stage": "new",
            "source": "LinkedIn",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Alice"
        assert data["stage"] == "new"
        assert data["email"] == "alice@example.com"

    def test_list_candidates_with_filters(self, client, api_prefix):
        client.post(f"{api_prefix}/candidates", json={"name": "Bob", "stage": "screening", "source": "Referral"})
        client.post(f"{api_prefix}/candidates", json={"name": "Charlie", "stage": "new", "source": "LinkedIn"})

        res = client.get(f"{api_prefix}/candidates?stage=new")
        assert res.status_code == 200
        data = res.json()
        assert all(c["stage"] == "new" for c in data["items"])

        res = client.get(f"{api_prefix}/candidates?search=Bob")
        assert res.status_code == 200
        data = res.json()
        assert any(c["name"] == "Bob" for c in data["items"])

    def test_candidate_detail(self, client, api_prefix):
        create_res = client.post(f"{api_prefix}/candidates", json={"name": "Dave", "stage": "new"})
        candidate_id = create_res.json()["id"]

        res = client.get(f"{api_prefix}/candidates/{candidate_id}/detail")
        assert res.status_code == 200
        data = res.json()
        assert data["candidate"]["name"] == "Dave"
        assert "interview_rounds" in data
        assert "evaluations" in data
        assert "offers" in data

    def test_update_candidate_stage(self, client, api_prefix):
        create_res = client.post(f"{api_prefix}/candidates", json={"name": "Eve", "stage": "new"})
        candidate_id = create_res.json()["id"]

        res = client.put(f"{api_prefix}/candidates/{candidate_id}/stage", json={"stage": "screening"})
        assert res.status_code == 200
        assert res.json()["stage"] == "screening"

    def test_invalid_stage_transition_blocked(self, client, api_prefix):
        create_res = client.post(f"{api_prefix}/candidates", json={"name": "Frank", "stage": "hired"})
        candidate_id = create_res.json()["id"]

        res = client.put(f"{api_prefix}/candidates/{candidate_id}/stage", json={"stage": "new"})
        assert res.status_code == 400

    def test_reject_requires_reason(self, client, api_prefix):
        create_res = client.post(f"{api_prefix}/candidates", json={"name": "Grace", "stage": "new"})
        candidate_id = create_res.json()["id"]

        res = client.put(f"{api_prefix}/candidates/{candidate_id}/stage", json={"stage": "rejected"})
        assert res.status_code == 422

        res = client.put(f"{api_prefix}/candidates/{candidate_id}/stage", json={"stage": "rejected", "reason": "Not a fit"})
        assert res.status_code == 200
        assert res.json()["rejection_reason"] == "Not a fit"


class TestInterviewScheduling:
    """Test interview scheduling and rounds (FR-004, FR-005, FR-006)"""

    def test_create_interview_round(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Hank", "stage": "new"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        res = client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Technical Interview",
            "scheduled_date": "2026-05-01",
            "start_time": "2026-05-01T10:00:00",
            "end_time": "2026-05-01T11:00:00",
            "mode": "onsite",
            "location": "Room 101",
            "interviewer_ids": [emp_id],
        })
        assert res.status_code == 200
        data = res.json()
        assert data["title"] == "Technical Interview"
        assert data["status"] == "scheduled"
        assert len(data["interviewers"]) == 1

    def test_interview_conflict_detection(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Ivy", "stage": "new"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Round 1",
            "scheduled_date": "2026-05-02",
            "start_time": "2026-05-02T10:00:00",
            "end_time": "2026-05-02T11:00:00",
            "mode": "onsite",
            "interviewer_ids": [emp_id],
        })

        res = client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Round 2",
            "scheduled_date": "2026-05-02",
            "start_time": "2026-05-02T10:30:00",
            "end_time": "2026-05-02T11:30:00",
            "mode": "onsite",
            "interviewer_ids": [emp_id],
        })
        assert res.status_code == 400
        assert "overlap" in res.json()["detail"].lower()

    def test_list_my_interviews(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Jack", "stage": "new"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "HR Interview",
            "scheduled_date": "2026-05-03",
            "start_time": "2026-05-03T14:00:00",
            "end_time": "2026-05-03T15:00:00",
            "mode": "phone",
            "interviewer_ids": [emp_id],
        })

        res = client.get(f"{api_prefix}/interviews/my/{emp_id}")
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) >= 1

    def test_update_interview_status(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Kate", "stage": "new"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        round_res = client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Final Interview",
            "scheduled_date": "2026-05-04",
            "start_time": "2026-05-04T09:00:00",
            "end_time": "2026-05-04T10:00:00",
            "mode": "online",
            "interviewer_ids": [emp_id],
        })
        round_id = round_res.json()["id"]

        res = client.put(f"{api_prefix}/interviews/{round_id}/status", params={"status": "completed"})
        assert res.status_code == 200
        assert res.json()["status"] == "completed"


class TestEvaluations:
    """Test evaluation criteria and scoring (FR-007, FR-008)"""

    def test_evaluation_criteria_crud(self, client, api_prefix):
        res = client.post(f"{api_prefix}/evaluations/criteria", json={
            "name": "Technical Skills",
            "description": "Coding and system design",
            "weight": 2.0,
            "sort_order": 1,
        })
        assert res.status_code == 200
        criterion_id = res.json()["id"]

        res = client.get(f"{api_prefix}/evaluations/criteria")
        assert res.status_code == 200
        assert any(c["name"] == "Technical Skills" for c in res.json()["items"])

        res = client.put(f"{api_prefix}/evaluations/criteria/{criterion_id}", json={"name": "Technical Skills", "weight": 3.0})
        assert res.status_code == 200
        assert res.json()["weight"] == 3.0

        res = client.delete(f"{api_prefix}/evaluations/criteria/{criterion_id}")
        assert res.status_code == 200

    def test_submit_evaluation(self, client, api_prefix):
        # Setup candidate, interview round, and criterion
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Leo", "stage": "new"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        criterion_res = client.post(f"{api_prefix}/evaluations/criteria", json={"name": "Communication", "weight": 1.0})
        criterion_id = criterion_res.json()["id"]

        round_res = client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Behavioral",
            "scheduled_date": "2026-05-05",
            "start_time": "2026-05-05T10:00:00",
            "end_time": "2026-05-05T11:00:00",
            "mode": "onsite",
            "interviewer_ids": [emp_id],
        })
        round_id = round_res.json()["id"]

        # Evaluation blocked before round is completed
        res = client.post(f"{api_prefix}/evaluations/round/{round_id}", json={
            "scores": [{"criterion_id": criterion_id, "score": 4}],
            "feedback": "Good communication",
            "interviewer_id": emp_id,
        })
        assert res.status_code == 400
        assert "completed" in res.json()["detail"].lower()

        # Complete the round
        client.put(f"{api_prefix}/interviews/{round_id}/status", params={"status": "completed"})

        # Now evaluation should succeed
        res = client.post(f"{api_prefix}/evaluations/round/{round_id}", json={
            "scores": [{"criterion_id": criterion_id, "score": 4}],
            "feedback": "Good communication",
            "interviewer_id": emp_id,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["weighted_average"] == 4.0

    def test_duplicate_evaluation_blocked(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Mia", "stage": "new"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        criterion_res = client.post(f"{api_prefix}/evaluations/criteria", json={"name": "Cultural Fit", "weight": 1.0})
        criterion_id = criterion_res.json()["id"]

        round_res = client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Culture Fit",
            "scheduled_date": "2026-05-06",
            "start_time": "2026-05-06T10:00:00",
            "end_time": "2026-05-06T11:00:00",
            "mode": "phone",
            "interviewer_ids": [emp_id],
        })
        round_id = round_res.json()["id"]
        client.put(f"{api_prefix}/interviews/{round_id}/status", params={"status": "completed"})

        client.post(f"{api_prefix}/evaluations/round/{round_id}", json={
            "scores": [{"criterion_id": criterion_id, "score": 5}],
            "feedback": "Excellent",
            "interviewer_id": emp_id,
        })

        res = client.post(f"{api_prefix}/evaluations/round/{round_id}", json={
            "scores": [{"criterion_id": criterion_id, "score": 3}],
            "feedback": "Retry",
            "interviewer_id": emp_id,
        })
        assert res.status_code == 400
        assert "already submitted" in res.json()["detail"].lower()


class TestOffers:
    """Test offer lifecycle management (FR-011, FR-012)"""

    def test_create_offer(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Noah", "stage": "evaluation"})
        candidate_id = candidate_res.json()["id"]

        res = client.post(f"{api_prefix}/offers/candidate/{candidate_id}", json={
            "base_salary": 15000,
            "bonus": 2000,
            "proposed_start_date": "2026-06-01",
            "employment_type": "full_time",
            "work_location": "Shanghai",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["base_salary"] == 15000
        assert data["status"] == "draft"

    def test_offer_status_transitions(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Olivia", "stage": "evaluation"})
        candidate_id = candidate_res.json()["id"]

        offer_res = client.post(f"{api_prefix}/offers/candidate/{candidate_id}", json={
            "base_salary": 20000,
            "employment_type": "full_time",
        })
        offer_id = offer_res.json()["id"]

        # Invalid transition: draft -> sent (must go through approved)
        res = client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "sent"})
        assert res.status_code == 400

        # Valid: draft -> pending_approval -> approved -> sent
        res = client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "pending_approval"})
        assert res.status_code == 200

        res = client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "approved"})
        assert res.status_code == 200

        res = client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "sent"})
        assert res.status_code == 200
        assert res.json()["sent_at"] is not None

    def test_offer_accepted_updates_candidate_stage(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Peter", "stage": "evaluation"})
        candidate_id = candidate_res.json()["id"]

        offer_res = client.post(f"{api_prefix}/offers/candidate/{candidate_id}", json={
            "base_salary": 25000,
            "employment_type": "full_time",
        })
        offer_id = offer_res.json()["id"]

        client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "pending_approval"})
        client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "approved"})
        client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "sent"})

        res = client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "accepted"})
        assert res.status_code == 200

        candidate_res = client.get(f"{api_prefix}/candidates/{candidate_id}")
        assert candidate_res.json()["stage"] == "offer_accepted"


class TestHireProposalAndConversion:
    """Test hiring workflow and candidate-to-employee conversion (FR-009, FR-010, FR-013)"""

    def test_hire_blocked_without_evaluations(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Quinn", "stage": "evaluation"})
        candidate_id = candidate_res.json()["id"]

        res = client.put(f"{api_prefix}/candidates/{candidate_id}/stage", json={"stage": "hired"})
        assert res.status_code == 400
        assert "interview" in res.json()["detail"].lower()

    def test_hire_with_completed_rounds_and_evaluations(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Ruby", "stage": "evaluation"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        criterion_res = client.post(f"{api_prefix}/evaluations/criteria", json={"name": "Overall", "weight": 1.0})
        criterion_id = criterion_res.json()["id"]

        round_res = client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Final",
            "scheduled_date": "2026-05-07",
            "start_time": "2026-05-07T10:00:00",
            "end_time": "2026-05-07T11:00:00",
            "mode": "onsite",
            "interviewer_ids": [emp_id],
        })
        round_id = round_res.json()["id"]
        client.put(f"{api_prefix}/interviews/{round_id}/status", params={"status": "completed"})

        client.post(f"{api_prefix}/evaluations/round/{round_id}", json={
            "scores": [{"criterion_id": criterion_id, "score": 5}],
            "feedback": "Great candidate",
            "interviewer_id": emp_id,
        })

        res = client.put(f"{api_prefix}/candidates/{candidate_id}/stage", json={"stage": "hired"})
        assert res.status_code == 200
        assert res.json()["stage"] == "hired"

    def test_convert_candidate_to_employee(self, client, api_prefix):
        # Create candidate with interview rounds, evaluations, and accepted offer
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Sam", "stage": "evaluation"})
        candidate_id = candidate_res.json()["id"]

        employees = client.get(f"{api_prefix}/employees").json()["items"]
        emp_id = employees[0]["id"] if employees else 1

        criterion_res = client.post(f"{api_prefix}/evaluations/criteria", json={"name": "Overall", "weight": 1.0})
        criterion_id = criterion_res.json()["id"]

        round_res = client.post(f"{api_prefix}/interviews/candidate/{candidate_id}", json={
            "title": "Final",
            "scheduled_date": "2026-05-07",
            "start_time": "2026-05-07T10:00:00",
            "end_time": "2026-05-07T11:00:00",
            "mode": "onsite",
            "interviewer_ids": [emp_id],
        })
        round_id = round_res.json()["id"]
        client.put(f"{api_prefix}/interviews/{round_id}/status", params={"status": "completed"})

        client.post(f"{api_prefix}/evaluations/round/{round_id}", json={
            "scores": [{"criterion_id": criterion_id, "score": 5}],
            "feedback": "Great candidate",
            "interviewer_id": emp_id,
        })

        offer_res = client.post(f"{api_prefix}/offers/candidate/{candidate_id}", json={
            "base_salary": 18000,
            "employment_type": "full_time",
            "proposed_start_date": "2026-07-01",
        })
        offer_id = offer_res.json()["id"]
        client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "pending_approval"})
        client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "approved"})
        client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "sent"})
        client.put(f"{api_prefix}/offers/{offer_id}/status", json={"status": "accepted"})

        # Must be in hired stage
        client.put(f"{api_prefix}/candidates/{candidate_id}/stage", json={"stage": "hired"})

        res = client.post(f"{api_prefix}/candidates/{candidate_id}/convert")
        assert res.status_code == 200
        employee_id = res.json()["employee_id"]
        assert employee_id > 0

        # Verify candidate now has employee_id
        candidate_res = client.get(f"{api_prefix}/candidates/{candidate_id}")
        assert candidate_res.json()["employee_id"] == employee_id

        # Verify employee was created
        emp_res = client.get(f"{api_prefix}/employees/{employee_id}")
        assert emp_res.status_code == 200
        assert emp_res.json()["name"] == "Sam"

    def test_convert_blocked_without_accepted_offer(self, client, api_prefix):
        candidate_res = client.post(f"{api_prefix}/candidates", json={"name": "Tina", "stage": "hired"})
        candidate_id = candidate_res.json()["id"]

        res = client.post(f"{api_prefix}/candidates/{candidate_id}/convert")
        assert res.status_code == 400
        assert "accepted offer" in res.json()["detail"].lower()


class TestDashboardRecruitingMetrics:
    """Test dashboard recruiting metrics (FR-014)"""

    def test_dashboard_includes_recruiting_metrics(self, client, api_prefix):
        client.post(f"{api_prefix}/candidates", json={"name": "Uma", "stage": "new"})
        client.post(f"{api_prefix}/candidates", json={"name": "Victor", "stage": "screening"})

        res = client.get(f"{api_prefix}/dashboard/stats")
        assert res.status_code == 200
        data = res.json()
        assert "recruiting" in data
        assert data["recruiting"]["total_active_candidates"] >= 2
        assert "candidates_by_stage" in data["recruiting"]
