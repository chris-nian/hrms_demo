#!/bin/bash

# HRMS Test Runner Script
# Supports: backend (pytest), frontend (vitest), or both

# ================= Parameter Handling =================
TEST_TARGET="all"  # Default: run all tests

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        backend|frontend|all) TEST_TARGET="$1"; shift ;;
        -h|--help)
            echo "Usage: $0 [backend|frontend|all]"
            echo ""
            echo "Options:"
            echo "  backend   Run backend pytest tests only"
            echo "  frontend  Run frontend vitest tests only"
            echo "  all       Run both backend and frontend tests (default)"
            echo "  -h, --help  Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0              # Run all tests"
            echo "  $0 backend      # Run backend tests only"
            echo "  $0 frontend     # Run frontend tests only"
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1"
            echo "Usage: $0 [backend|frontend|all]"
            exit 1
            ;;
    esac
    shift
done

# ================= Configuration =================
PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="${PROJECT_ROOT}/test_logs"

# Log file paths
BACKEND_LOG="${LOG_DIR}/backend_test.log"
BACKEND_ERROR_LOG="${LOG_DIR}/backend_test_error.log"
FRONTEND_LOG="${LOG_DIR}/frontend_test.log"
FRONTEND_ERROR_LOG="${LOG_DIR}/frontend_test_error.log"
TEST_SUMMARY="${LOG_DIR}/test_summary.txt"

# Test result tracking
BACKEND_STATUS="SKIPPED"
FRONTEND_STATUS="SKIPPED"
BACKEND_EXIT_CODE=0
FRONTEND_EXIT_CODE=0

# ================= Helper Functions =================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_separator() {
    echo "============================================================"
}

# Create logs directory
create_log_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        log "Creating logs directory: $LOG_DIR"
        mkdir -p "$LOG_DIR"
    fi
}

# Cleanup old log files
cleanup_old_logs() {
    log "Cleaning up old log files..."
    rm -f "$BACKEND_LOG" "$BACKEND_ERROR_LOG" "$FRONTEND_LOG" "$FRONTEND_ERROR_LOG" "$TEST_SUMMARY"
}

# Check if command exists
check_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log "ERROR: Required command '$1' not found. Please install it."
        return 1
    fi
    return 0
}

# Run backend tests
run_backend_tests() {
    log_separator
    log "RUNNING BACKEND TESTS (pytest)"
    log_separator

    # Check Python availability
    if ! check_command python3; then
        BACKEND_STATUS="FAILED"
        BACKEND_EXIT_CODE=1
        return 1
    fi

    # Navigate to backend directory
    cd "${PROJECT_ROOT}/backend" || {
        log "ERROR: Failed to navigate to backend directory"
        BACKEND_STATUS="FAILED"
        BACKEND_EXIT_CODE=1
        return 1
    }

    # Install test dependencies if needed
    log "Checking test dependencies..."
    if ! python3 -c "import pytest, httpx" 2>/dev/null; then
        log "Installing test dependencies..."
        pip3 install -e ".[test]" > "$BACKEND_LOG" 2> "$BACKEND_ERROR_LOG"
        if [ $? -ne 0 ]; then
            log "ERROR: Failed to install test dependencies"
            BACKEND_STATUS="FAILED"
            BACKEND_EXIT_CODE=1
            return 1
        fi
    fi

    # Run pytest
    log "Executing pytest tests..."
    python3 -m pytest tests/ -v > "$BACKEND_LOG" 2> "$BACKEND_ERROR_LOG"
    BACKEND_EXIT_CODE=$?

    if [ $BACKEND_EXIT_CODE -eq 0 ]; then
        BACKEND_STATUS="PASSED"
        log "Backend tests PASSED"
    else
        BACKEND_STATUS="FAILED"
        log "Backend tests FAILED (exit code: $BACKEND_EXIT_CODE)"
    fi

    # Return to project root
    cd "$PROJECT_ROOT" || true

    return $BACKEND_EXIT_CODE
}

# Run frontend tests
run_frontend_tests() {
    log_separator
    log "RUNNING FRONTEND TESTS (vitest)"
    log_separator

    # Check Node.js and npm availability
    if ! check_command node; then
        FRONTEND_STATUS="FAILED"
        FRONTEND_EXIT_CODE=1
        return 1
    fi

    if ! check_command npm; then
        FRONTEND_STATUS="FAILED"
        FRONTEND_EXIT_CODE=1
        return 1
    fi

    # Navigate to frontend directory
    cd "${PROJECT_ROOT}/frontend" || {
        log "ERROR: Failed to navigate to frontend directory"
        FRONTEND_STATUS="FAILED"
        FRONTEND_EXIT_CODE=1
        return 1
    }

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install > "$FRONTEND_LOG" 2> "$FRONTEND_ERROR_LOG"
        if [ $? -ne 0 ]; then
            log "ERROR: Failed to install frontend dependencies"
            FRONTEND_STATUS="FAILED"
            FRONTEND_EXIT_CODE=1
            return 1
        fi
    fi

    # Run vitest
    log "Executing vitest tests..."
    npm run test > "$FRONTEND_LOG" 2> "$FRONTEND_ERROR_LOG"
    FRONTEND_EXIT_CODE=$?

    if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
        FRONTEND_STATUS="PASSED"
        log "Frontend tests PASSED"
    else
        FRONTEND_STATUS="FAILED"
        log "Frontend tests FAILED (exit code: $FRONTEND_EXIT_CODE)"
    fi

    # Return to project root
    cd "$PROJECT_ROOT" || true

    return $FRONTEND_EXIT_CODE
}

# Generate test summary
generate_summary() {
    log_separator
    log "TEST SUMMARY"
    log_separator

    {
        echo "HRMS Test Summary"
        echo "Generated at: $(date)"
        echo "============================================================"
        echo ""
        echo "Backend Tests: $BACKEND_STATUS"
        if [ "$BACKEND_STATUS" = "FAILED" ]; then
            echo "  Exit Code: $BACKEND_EXIT_CODE"
            echo "  See: $BACKEND_LOG"
            echo "  Errors: $BACKEND_ERROR_LOG"
        fi
        echo ""
        echo "Frontend Tests: $FRONTEND_STATUS"
        if [ "$FRONTEND_STATUS" = "FAILED" ]; then
            echo "  Exit Code: $FRONTEND_EXIT_CODE"
            echo "  See: $FRONTEND_LOG"
            echo "  Errors: $FRONTEND_ERROR_LOG"
        fi
        echo ""
        echo "============================================================"

        if [ $BACKEND_EXIT_CODE -eq 0 ] && [ $FRONTEND_EXIT_CODE -eq 0 ]; then
            echo "OVERALL RESULT: ALL TESTS PASSED"
        else
            echo "OVERALL RESULT: SOME TESTS FAILED"
        fi
    } > "$TEST_SUMMARY"

    cat "$TEST_SUMMARY"
}

# ================= Main Execution Flow =================

log_separator
log "HRMS Test Runner Started"
log "Target: $TEST_TARGET"
log "Project Root: $PROJECT_ROOT"
log_separator

# Create log directory and cleanup old logs
create_log_dir
cleanup_old_logs

# Initialize summary
OVERALL_EXIT_CODE=0

# Run tests based on target
if [ "$TEST_TARGET" = "backend" ] || [ "$TEST_TARGET" = "all" ]; then
    run_backend_tests
    if [ $? -ne 0 ]; then
        OVERALL_EXIT_CODE=1
    fi
fi

if [ "$TEST_TARGET" = "frontend" ] || [ "$TEST_TARGET" = "all" ]; then
    run_frontend_tests
    if [ $? -ne 0 ]; then
        OVERALL_EXIT_CODE=1
    fi
fi

# Generate and display summary
generate_summary

log_separator
if [ $OVERALL_EXIT_CODE -eq 0 ]; then
    log "All tests completed successfully!"
else
    log "Some tests failed. Check logs in $LOG_DIR for details."
fi
log_separator

exit $OVERALL_EXIT_CODE
