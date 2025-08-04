#!/bin/bash
# AI Toolbox Backend - Local Production Mode Runner (Shell)
# Use this script to run the backend service locally using production settings.

set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
COMPOSE_FILE="docker-compose.prod.yml"

# --- Logging Functions ---
# Color definitions
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Helper Functions ---

# Function to check for required command-line tools.
check_dependencies() {
    log_info "Checking dependencies..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH."
        log_info "Please install Docker from: https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose is not installed or not in PATH."
        log_info "Please install Docker Compose or use Docker Desktop."
        exit 1
    fi
    log_success "Docker and docker-compose are available."
    
    # Check if Docker daemon is running
    log_info "Checking Docker daemon status..."
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running or not accessible."
        log_info "Please start Docker Desktop and ensure it's fully initialized."
        log_info "On Linux, you may need to start the Docker service: sudo systemctl start docker"
        exit 1
    fi
    
    # Check for warnings but don't treat them as errors
    docker_info=$(docker info 2>&1)
    if echo "$docker_info" | grep -i "WARNING" > /dev/null; then
        log_warning "Docker is running with some limitations:"
        echo "$docker_info" | grep -i "WARNING" | while read -r line; do
            log_warning "  $line"
        done
        log_info "These warnings are common and usually don't affect functionality."
    fi
    
    log_success "Docker daemon is running and accessible."
}

# Function to ensure the .env file exists.
initialize_environment() {
    log_info "Checking environment configuration..."
    if [ ! -f "backend/.env" ]; then
        log_warning "'backend/.env' not found."
        if [ -f "backend/env.production.template" ]; then
            log_info "Copying from template 'backend/env.production.template'..."
            cp "backend/env.production.template" "backend/.env"
            log_warning "IMPORTANT: Please edit 'backend/.env' and fill in the required values."
            log_info "You can generate a secure SECRET_KEY with: python3 -c 'import secrets; print(secrets.token_urlsafe(32))'"
            read -p "Press Enter to continue after you have configured the .env file..."
        else
            log_error "Environment template not found at 'backend/env.production.template'. Cannot proceed."
            exit 1
        fi
    fi
    log_success "Environment configuration is ready."
}

# Function to start the services using Docker Compose.
start_service() {
    log_info "Starting services in production mode using '$COMPOSE_FILE'..."
    
    # Allow skipping the build with a flag, e.g., ./scripts/deploy.sh --no-build
    if [[ " $* " != *" --no-build "* ]]; then
        log_info "Building images..."
        docker-compose -f "$COMPOSE_FILE" build
    else
        log_info "Skipping build as per --no-build flag."
    fi

    docker-compose -f "$COMPOSE_FILE" up -d

    log_success "Services started successfully."
    log_info "Run 'docker-compose -f $COMPOSE_FILE logs -f' to see the logs."
    log_info "Run 'docker-compose -f $COMPOSE_FILE down' to stop the services."
}

# --- Main Execution ---
main() {
    # Cleanup on exit
    trap 'log_error "Script interrupted."; docker-compose -f $COMPOSE_FILE down --remove-orphans >/dev/null 2>&1; exit 1' INT TERM

    log_info "🚀 Starting AI Toolbox in Local Production Mode..."
    
    check_dependencies
    initialize_environment
    start_service

    log_success "🎉 All services are up and running."
}

# --- Run ---
main "$@"
