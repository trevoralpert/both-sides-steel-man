#!/bin/bash

# Production Deployment Script for Both Sides Platform
# Automates the deployment process to Vercel (frontend) and Railway (backend)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Both Sides Platform"
FRONTEND_SERVICE="Vercel"
BACKEND_SERVICE="Railway"
DEPLOYMENT_ENV="production"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log "Checking deployment dependencies..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v yarn &> /dev/null; then
        missing_deps+=("yarn")
    fi
    
    if ! command -v vercel &> /dev/null; then
        missing_deps+=("vercel")
    fi
    
    if ! command -v railway &> /dev/null; then
        missing_deps+=("railway")
    fi
    
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
    
    success "All dependencies are installed"
}

# Verify environment variables
check_environment() {
    log "Checking environment configuration..."
    
    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "CLERK_SECRET_KEY"
        "OPENAI_API_KEY"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
        echo "Please set the missing environment variables and try again."
        exit 1
    fi
    
    success "Environment variables are configured"
}

# Run pre-deployment checks
run_pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if we're on the main branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$current_branch" != "main" ]; then
        warning "Not on main branch (current: $current_branch)"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        warning "There are uncommitted changes"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Run tests
    log "Running tests..."
    if ! yarn test --passWithNoTests; then
        error "Tests failed"
        exit 1
    fi
    success "Tests passed"
    
    # Run linting
    log "Running linter..."
    if ! yarn lint; then
        error "Linting failed"
        exit 1
    fi
    success "Linting passed"
    
    # Type checking
    log "Running type check..."
    if ! yarn type-check; then
        error "Type checking failed"
        exit 1
    fi
    success "Type checking passed"
    
    # Build check
    log "Running build check..."
    if ! yarn build; then
        error "Build failed"
        exit 1
    fi
    success "Build successful"
}

# Deploy to Vercel (Frontend)
deploy_frontend() {
    log "Deploying frontend to $FRONTEND_SERVICE..."
    
    # Login to Vercel (if not already logged in)
    if ! vercel whoami &> /dev/null; then
        log "Logging in to Vercel..."
        vercel login
    fi
    
    # Deploy to production
    log "Deploying to Vercel production..."
    if vercel --prod --yes; then
        success "Frontend deployed successfully to $FRONTEND_SERVICE"
        
        # Get deployment URL
        local deployment_url=$(vercel ls --meta | grep "production" | head -1 | awk '{print $2}')
        if [ -n "$deployment_url" ]; then
            log "Frontend URL: https://$deployment_url"
        fi
    else
        error "Frontend deployment to $FRONTEND_SERVICE failed"
        exit 1
    fi
}

# Deploy to Railway (Backend)
deploy_backend() {
    log "Deploying backend to $BACKEND_SERVICE..."
    
    # Login to Railway (if not already logged in)
    if ! railway whoami &> /dev/null; then
        log "Logging in to Railway..."
        railway login
    fi
    
    # Deploy to production
    log "Deploying to Railway production..."
    if railway up --environment production; then
        success "Backend deployed successfully to $BACKEND_SERVICE"
        
        # Get deployment status
        railway status --environment production
    else
        error "Backend deployment to $RAILWAY_SERVICE failed"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Run migrations via Railway
    if railway run --environment production "yarn migrate:deploy"; then
        success "Database migrations completed"
    else
        error "Database migrations failed"
        exit 1
    fi
}

# Verify deployment health
verify_deployment() {
    log "Verifying deployment health..."
    
    local frontend_url="https://bothsides.app"
    local backend_url="https://api.bothsides.app"
    
    # Check frontend health
    log "Checking frontend health..."
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$frontend_url" || echo "000")
    if [ "$frontend_status" = "200" ]; then
        success "Frontend is healthy (HTTP $frontend_status)"
    else
        warning "Frontend health check failed (HTTP $frontend_status)"
    fi
    
    # Check backend health
    log "Checking backend health..."
    local backend_status=$(curl -s -o /dev/null -w "%{http_code}" "$backend_url/health" || echo "000")
    if [ "$backend_status" = "200" ]; then
        success "Backend is healthy (HTTP $backend_status)"
    else
        warning "Backend health check failed (HTTP $backend_status)"
    fi
    
    # Check database connectivity
    log "Checking database connectivity..."
    if railway run --environment production "yarn db:check"; then
        success "Database connectivity verified"
    else
        warning "Database connectivity check failed"
    fi
}

# Send deployment notification
send_notification() {
    local status=$1
    local message="$PROJECT_NAME deployment to $DEPLOYMENT_ENV: $status"
    
    log "Sending deployment notification..."
    
    # You can add your notification logic here (Slack, email, etc.)
    # Example: curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"'$message'"}' \
    #   $SLACK_WEBHOOK_URL
    
    success "Deployment notification sent"
}

# Rollback function (in case of failure)
rollback_deployment() {
    error "Deployment failed. Initiating rollback..."
    
    # Rollback frontend
    log "Rolling back frontend..."
    vercel rollback --yes
    
    # Rollback backend
    log "Rolling back backend..."
    railway rollback --environment production
    
    warning "Rollback completed"
    send_notification "FAILED (rolled back)"
}

# Main deployment function
main() {
    log "Starting $PROJECT_NAME production deployment..."
    
    # Trap errors and rollback
    trap rollback_deployment ERR
    
    # Pre-deployment steps
    check_dependencies
    check_environment
    run_pre_deployment_checks
    
    # Deployment steps
    deploy_backend
    run_migrations
    deploy_frontend
    
    # Post-deployment steps
    sleep 30  # Wait for services to start
    verify_deployment
    
    # Success
    success "$PROJECT_NAME deployed successfully to production!"
    send_notification "SUCCESS"
    
    log "Deployment completed at $(date)"
    log "Frontend: https://bothsides.app"
    log "Backend: https://api.bothsides.app"
    log "Realtime: wss://realtime.bothsides.app"
}

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Deploy Both Sides Platform to production"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -c, --check    Run pre-deployment checks only"
    echo "  -f, --frontend Deploy frontend only"
    echo "  -b, --backend  Deploy backend only"
    echo "  -v, --verify   Verify deployment health only"
    echo ""
    echo "Examples:"
    echo "  $0                 # Full deployment"
    echo "  $0 --check         # Check only"
    echo "  $0 --frontend      # Deploy frontend only"
    echo "  $0 --backend       # Deploy backend only"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -c|--check)
        check_dependencies
        check_environment
        run_pre_deployment_checks
        success "Pre-deployment checks completed"
        exit 0
        ;;
    -f|--frontend)
        check_dependencies
        deploy_frontend
        success "Frontend deployment completed"
        exit 0
        ;;
    -b|--backend)
        check_dependencies
        deploy_backend
        run_migrations
        success "Backend deployment completed"
        exit 0
        ;;
    -v|--verify)
        verify_deployment
        success "Deployment verification completed"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
