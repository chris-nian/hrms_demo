"""Approval state machine engine.

State transitions:
  draft -> pending_manager (submit)
  pending_manager -> pending_hr (approve)
  pending_manager -> rejected (reject)
  pending_hr -> approved (approve)
  pending_hr -> rejected (reject)
"""

VALID_TRANSITIONS = {
    "draft": {"submit": "pending_manager"},
    "pending_manager": {"approve": "pending_hr", "reject": "rejected"},
    "pending_hr": {"approve": "approved", "reject": "rejected"},
    "approved": {},
    "rejected": {},
}


def can_transition(current_state: str, action: str) -> bool:
    transitions = VALID_TRANSITIONS.get(current_state, {})
    return action in transitions


def next_state(current_state: str, action: str) -> str | None:
    transitions = VALID_TRANSITIONS.get(current_state, {})
    return transitions.get(action)
