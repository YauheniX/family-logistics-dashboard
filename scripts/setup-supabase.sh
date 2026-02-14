#!/bin/bash

###############################################################################
# Interactive Supabase Setup Script
#
# This script helps you set up Supabase configuration by:
# - Prompting for SUPABASE_URL and SUPABASE_ANON_KEY
# - Validating credential format
# - Creating .env file with proper structure
# - Testing connection to Supabase
# - Offering to run database migrations
# - Offering to create storage bucket
# - Providing next steps guidance
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Symbols
CHECK="${GREEN}✅${NC}"
CROSS="${RED}❌${NC}"
INFO="${CYAN}ℹ️${NC}"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}"
}

print_success() {
  echo -e "${CHECK} $1"
}

print_error() {
  echo -e "${CROSS} $1"
}

print_info() {
  echo -e "${INFO} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

###############################################################################
# Validation Functions
###############################################################################

validate_supabase_url() {
  local url="$1"
  if [[ "$url" =~ ^https://[a-z0-9-]+\.supabase\.co$ ]]; then
    return 0
  else
    return 1
  fi
}

validate_supabase_key() {
  local key="$1"
  # Supabase keys are JWT tokens, typically > 100 characters
  if [ ${#key} -gt 100 ]; then
    return 0
  else
    return 1
  fi
}

###############################################################################
# Main Script
###############################################################################

clear
echo -e "${BOLD}${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         Interactive Supabase Setup Script                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_info "This script will help you set up Supabase for your project."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
  print_warning ".env file already exists!"
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Setup cancelled. Existing .env file preserved."
    exit 0
  fi
  # Backup existing .env
  cp .env .env.backup
  print_success "Backed up existing .env to .env.backup"
fi

# Step 1: Get Supabase credentials
print_header "Step 1: Supabase Credentials"

print_info "You need to get these from your Supabase project:"
print_info "https://supabase.com/dashboard/project/_/settings/api"
echo ""

# Get Supabase URL
while true; do
  read -p "Enter your SUPABASE_URL: " SUPABASE_URL
  
  if validate_supabase_url "$SUPABASE_URL"; then
    print_success "Valid Supabase URL format"
    break
  else
    print_error "Invalid URL format. Expected: https://your-project-ref.supabase.co"
  fi
done

# Get Supabase Anon Key
while true; do
  read -p "Enter your SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
  
  if validate_supabase_key "$SUPABASE_ANON_KEY"; then
    print_success "Valid Supabase anon key format"
    break
  else
    print_error "Key seems too short. Make sure you copied the full anon/public key."
  fi
done

# Step 2: Create .env file
print_header "Step 2: Creating .env File"

cat > .env << EOF
# Supabase Configuration (Production)
# Get these from: https://supabase.com/dashboard/project/_/settings/api
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_SUPABASE_STORAGE_BUCKET=wishlist-images

# Backend Mode
# Set to 'true' to use mock data (no Supabase needed)
# Set to 'false' or leave empty to use Supabase
VITE_USE_MOCK_BACKEND=false

# Base Path (for GitHub Pages deployment)
VITE_BASE_PATH=/
EOF

print_success ".env file created successfully"

# Step 3: Test connection
print_header "Step 3: Testing Connection"

print_info "Testing connection to Supabase..."

# Use Node.js to test connection
node << 'NODESCRIPT'
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL || process.argv[2];
const key = process.env.VITE_SUPABASE_ANON_KEY || process.argv[3];

if (!url || !key) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

// Test a simple query
supabase
  .from('user_profiles')
  .select('id')
  .limit(0)
  .then(({ error }) => {
    if (error && !error.message.includes('permission') && !error.message.includes('policy') && !error.message.includes('does not exist')) {
      console.error('Connection failed:', error.message);
      process.exit(1);
    } else {
      console.log('Connection successful!');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });
NODESCRIPT

if [ $? -eq 0 ]; then
  print_success "Connection to Supabase successful"
else
  print_error "Connection test failed"
  print_info "Please check your credentials and try again"
  exit 1
fi

# Step 4: Database migrations
print_header "Step 4: Database Setup"

print_info "Your Supabase database needs the following SQL scripts:"
print_info "  1. supabase/schema.sql - Creates tables and functions"
print_info "  2. supabase/rls.sql - Sets up Row Level Security policies"
echo ""

print_warning "These scripts must be run in Supabase SQL Editor:"
print_info "https://supabase.com/dashboard/project/_/sql/new"
echo ""

read -p "Have you already run these SQL scripts? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_info "Please run the SQL scripts in Supabase SQL Editor, then come back."
  print_info "1. Open: https://supabase.com/dashboard/project/_/sql/new"
  print_info "2. Copy and paste supabase/schema.sql, then click RUN"
  print_info "3. Copy and paste supabase/rls.sql, then click RUN"
fi

# Step 5: Storage bucket
print_header "Step 5: Storage Bucket Setup"

print_info "Your app needs a storage bucket named 'wishlist-images'"
echo ""

read -p "Have you created the storage bucket? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_info "Create the storage bucket in Supabase Dashboard:"
  print_info "1. Go to: https://supabase.com/dashboard/project/_/storage/buckets"
  print_info "2. Click 'New bucket'"
  print_info "3. Name: wishlist-images"
  print_info "4. Public bucket: YES"
  print_info "5. Click 'Create bucket'"
fi

# Step 6: Next steps
print_header "Next Steps"

echo -e "\n${GREEN}${BOLD}✅ Supabase setup complete!${NC}\n"

print_info "To verify your setup, run:"
echo -e "  ${CYAN}npm run supabase:verify${NC}"
echo ""

print_info "To start the development server:"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""

print_info "Don't forget to:"
echo "  • Run the SQL scripts in Supabase SQL Editor (if not done yet)"
echo "  • Create the 'wishlist-images' storage bucket (if not done yet)"
echo "  • Configure Google OAuth in Supabase Auth settings (optional)"
echo ""

print_info "For more information, see:"
echo -e "  ${CYAN}docs/SUPABASE_PRODUCTION_SETUP.md${NC}"
echo ""

print_success "Happy coding! 🚀"
