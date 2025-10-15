#!/bin/bash

################################################################################
# The Forge - Production Deployment Script
################################################################################
#
# This script automates the deployment process to the production server.
# It includes safety checks, database backup, and verification steps.
#
# Usage:
#   ./deploy.sh
#
# Prerequisites:
#   - SSH access to production server (143.244.185.41)
#   - SSH key configured for passwordless login
#   - Git changes already committed and pushed to GitHub
#
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production server details
SERVER="root@143.244.185.41"
PROJECT_PATH="/var/www/the-forge"
APP_NAME="the-forge"

################################################################################
# Helper Functions
################################################################################

print_step() {
    echo -e "\n${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  🚀 The Forge - Production Deployment                        ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

################################################################################
# Pre-Deployment Checks
################################################################################

check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check if we can SSH into server
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$SERVER" "echo 2>&1" &>/dev/null; then
        print_error "Cannot connect to production server"
        print_warning "Make sure SSH key is configured for $SERVER"
        exit 1
    fi
    print_success "SSH connection verified"

    # Check if git has uncommitted changes
    if [[ -n $(git status -s) ]]; then
        print_warning "You have uncommitted changes locally"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Check if local is ahead of remote
    git fetch origin master &>/dev/null
    if [[ $(git rev-list HEAD...origin/master --count) -ne 0 ]]; then
        print_warning "Local branch is not in sync with origin/master"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    print_success "Pre-deployment checks passed"
}

################################################################################
# Deployment Steps
################################################################################

backup_database() {
    print_step "Backing up production database..."

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="forge.db.backup-$TIMESTAMP"

    ssh "$SERVER" "cd $PROJECT_PATH && cp data/forge.db data/$BACKUP_FILE"

    # Verify backup was created
    if ssh "$SERVER" "test -f $PROJECT_PATH/data/$BACKUP_FILE"; then
        print_success "Database backed up: data/$BACKUP_FILE"
    else
        print_error "Database backup failed!"
        exit 1
    fi
}

pull_changes() {
    print_step "Pulling latest changes from GitHub..."

    ssh "$SERVER" "cd $PROJECT_PATH && git pull origin master"

    print_success "Code updated from GitHub"
}

install_dependencies() {
    print_step "Installing dependencies..."

    ssh "$SERVER" "cd $PROJECT_PATH && npm install"

    print_success "Dependencies installed"
}

build_application() {
    print_step "Building production bundle..."
    print_warning "This may take 1-2 minutes..."

    # Build and capture output
    if ssh "$SERVER" "cd $PROJECT_PATH && npm run build" 2>&1 | tee /tmp/build-output.txt; then
        print_success "Build completed successfully"
    else
        print_error "Build failed! Check output above"
        exit 1
    fi
}

restart_application() {
    print_step "Restarting application with PM2..."

    ssh "$SERVER" "pm2 restart $APP_NAME --update-env"

    print_success "Application restarted"
}

verify_deployment() {
    print_step "Verifying deployment..."

    # Check PM2 status
    PM2_STATUS=$(ssh "$SERVER" "pm2 jlist" | grep -o '"name":"the-forge".*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    if [[ "$PM2_STATUS" == "online" ]]; then
        print_success "Application is running (status: online)"
    else
        print_error "Application status: $PM2_STATUS"
        print_warning "Check logs with: ssh $SERVER 'pm2 logs $APP_NAME'"
        exit 1
    fi

    # Show recent logs
    print_step "Recent application logs:"
    ssh "$SERVER" "pm2 logs $APP_NAME --lines 10 --nostream"
}

################################################################################
# Main Deployment Process
################################################################################

main() {
    print_header

    echo "Deploying to: $SERVER"
    echo "Project path: $PROJECT_PATH"
    echo ""

    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi

    # Run deployment steps
    check_prerequisites
    backup_database
    pull_changes
    install_dependencies
    build_application
    restart_application
    verify_deployment

    # Success message
    echo ""
    print_success "════════════════════════════════════════════════════════════════"
    print_success "  Deployment completed successfully! 🎉"
    print_success "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Production URL: http://143.244.185.41:3000"
    echo ""
    echo "Useful commands:"
    echo "  Check status:  ssh $SERVER 'pm2 status'"
    echo "  View logs:     ssh $SERVER 'pm2 logs $APP_NAME'"
    echo "  Restart app:   ssh $SERVER 'pm2 restart $APP_NAME --update-env'"
    echo ""
}

# Run main function
main
