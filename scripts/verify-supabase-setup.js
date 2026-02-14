#!/usr/bin/env node

/**
 * Supabase Setup Verification Script
 *
 * This script verifies that:
 * - .env file exists and contains required variables
 * - Supabase credentials are valid
 * - Connection to Supabase is successful
 * - All required tables exist
 * - Storage bucket exists
 * - RLS policies are enabled
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const CHECK = '✅';
const CROSS = '❌';
const INFO = 'ℹ️';

let hasErrors = false;

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`${CHECK} ${message}`, colors.green);
}

function error(message) {
  log(`${CROSS} ${message}`, colors.red);
  hasErrors = true;
}

function info(message) {
  log(`${INFO} ${message}`, colors.cyan);
}

function header(message) {
  log(`\n${colors.bright}${colors.blue}━━━ ${message} ━━━${colors.reset}`);
}

// Required tables
const REQUIRED_TABLES = [
  'families',
  'family_members',
  'shopping_lists',
  'shopping_items',
  'wishlists',
  'wishlist_items',
  'user_profiles',
];

const STORAGE_BUCKET = 'wishlist-images';

/**
 * Load and parse .env file
 */
function loadEnvFile() {
  const envPath = resolve(ROOT_DIR, '.env');

  if (!existsSync(envPath)) {
    return null;
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      env[key] = value.trim();
    }
  });

  return env;
}

/**
 * Validate Supabase URL format
 */
function validateSupabaseUrl(url) {
  if (!url) return false;
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url);
}

/**
 * Validate Supabase anon key format
 */
function validateSupabaseKey(key) {
  if (!key) return false;
  // Supabase keys are JWT tokens, typically quite long
  return key.length > 100;
}

/**
 * Check if a table exists
 */
async function checkTableExists(supabase, tableName) {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(0);

    if (!error) {
      return true;
    }

    // Postgres error code for "undefined table"
    if (error.code === '42P01') {
      return false;
    }

    // Fallback: check common "relation does not exist" message pattern
    const message = error.message || '';
    if (/relation .* does not exist/i.test(message)) {
      return false;
    }

    // Any other error (e.g., permission/RLS) indicates the table likely exists
    return true;
  } catch {
    // On unexpected errors, assume the table exists but access is restricted
    return true;
  }
}

/**
 * Check if RLS is likely enabled on a table.
 *
 * This performs a simple SELECT and inspects any error message for
 * permission/policy-related text. It is a best-effort check and
 * returns false when RLS cannot be confirmed or the check fails.
 */
async function checkRLSEnabled(supabase, tableName) {
  try {
    // Query the table with a SELECT that should trigger RLS if it is enforced
    const { error: selectError } = await supabase.from(tableName).select('*').limit(0);

    // If there's no error, we cannot conclude that RLS is enabled.
    if (!selectError) {
      return false;
    }

    const message = String(selectError.message || '').toLowerCase();

    // Treat permission/policy-related errors as evidence that RLS (or other
    // access controls) is enabled.
    if (
      message.includes('permission denied') ||
      message.includes('permission') ||
      message.includes('policy') ||
      message.includes('not authorized') ||
      message.includes('rls')
    ) {
      return true;
    }

    // Error is unrelated to permissions/policies; do not claim RLS is enabled.
    return false;
  } catch {
    // If we can't perform the check, report that RLS is not confirmed.
    return false;
  }
}

/**
 * Check if storage bucket exists
 */
async function checkStorageBucket(supabase, bucketName) {
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      return false;
    }

    return data.some((bucket) => bucket.name === bucketName);
  } catch {
    return false;
  }
}

/**
 * Main verification function
 */
async function verifySetup() {
  log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         Supabase Setup Verification Script                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Step 1: Check .env file
  header('Step 1: Environment File Check');

  const env = loadEnvFile();

  if (!env) {
    error('.env file not found');
    info(`Create .env file by copying env.example: cp env.example .env`);
    process.exit(1);
  }

  success('.env file exists');

  // Step 2: Check environment variables
  header('Step 2: Environment Variables Check');

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  const useMockBackend = env.VITE_USE_MOCK_BACKEND;

  if (!supabaseUrl || !supabaseKey) {
    error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing');
    info('Get these from: https://supabase.com/dashboard/project/_/settings/api');
    process.exit(1);
  }

  success('VITE_SUPABASE_URL is set');
  success('VITE_SUPABASE_ANON_KEY is set');

  if (useMockBackend === 'true') {
    log(
      `${colors.yellow}⚠️  VITE_USE_MOCK_BACKEND is set to 'true' - Application will use mock mode${colors.reset}`,
    );
  }

  // Step 3: Validate credentials format
  header('Step 3: Credentials Format Validation');

  if (!validateSupabaseUrl(supabaseUrl)) {
    error(`Invalid Supabase URL format: ${supabaseUrl}`);
    info('Expected format: https://your-project-ref.supabase.co');
  } else {
    success('Supabase URL format is valid');
  }

  if (!validateSupabaseKey(supabaseKey)) {
    error('Invalid Supabase anon key format (key too short)');
    info('Make sure you copied the full anon/public key from Supabase dashboard');
  } else {
    success('Supabase anon key format is valid');
  }

  if (hasErrors) {
    log(
      `\n${colors.red}${colors.bright}Verification failed due to invalid credentials.${colors.reset}`,
    );
    process.exit(1);
  }

  // Step 4: Test connection
  header('Step 4: Connection Test');

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    success('Supabase client created');
  } catch (err) {
    error(`Failed to create Supabase client: ${err.message}`);
    process.exit(1);
  }

  // Try a simple query to test connection
  try {
    const { error: connectionError } = await supabase.from('user_profiles').select('id').limit(0);

    // Note: We might get a permission error if not authenticated, but that's OK
    // It means the connection works
    if (
      connectionError &&
      !connectionError.message.includes('permission') &&
      !connectionError.message.includes('policy')
    ) {
      // Check if it's a "relation does not exist" error (table not found)
      if (connectionError.message.includes('does not exist')) {
        error('Connection successful, but tables not found. Please run database migrations.');
      } else {
        error(`Connection test failed: ${connectionError.message}`);
      }
    } else {
      success('Connection to Supabase successful');
    }
  } catch (err) {
    error(`Connection test failed: ${err.message}`);
    process.exit(1);
  }

  // Step 5: Check tables
  header('Step 5: Database Tables Check');

  let allTablesExist = true;

  for (const tableName of REQUIRED_TABLES) {
    const exists = await checkTableExists(supabase, tableName);
    if (exists) {
      success(`Table '${tableName}' exists`);
    } else {
      error(`Table '${tableName}' not found`);
      allTablesExist = false;
    }
  }

  if (!allTablesExist) {
    info('Run the SQL scripts in Supabase SQL Editor:');
    info('  1. supabase/schema.sql');
    info('  2. supabase/rls.sql');
  }

  // Step 6: Check RLS policies
  header('Step 6: Row Level Security Check');

  for (const tableName of REQUIRED_TABLES) {
    const rlsEnabled = await checkRLSEnabled(supabase, tableName);
    if (rlsEnabled) {
      success(`RLS enabled on '${tableName}'`);
    } else {
      error(`RLS not enabled on '${tableName}'`);
      info('Run supabase/rls.sql to enable RLS policies');
    }
  }

  // Step 7: Check storage bucket
  header('Step 7: Storage Bucket Check');

  const bucketExists = await checkStorageBucket(supabase, STORAGE_BUCKET);
  if (bucketExists) {
    success(`Storage bucket '${STORAGE_BUCKET}' exists`);
  } else {
    error(`Storage bucket '${STORAGE_BUCKET}' not found`);
    info('Create the bucket in Supabase Dashboard → Storage → New bucket');
    info(`Name: ${STORAGE_BUCKET}, Public: true`);
  }

  // Summary
  header('Summary');

  if (hasErrors) {
    log(`\n${colors.red}${colors.bright}❌ Verification FAILED${colors.reset}`);
    log(`${colors.yellow}Please fix the issues above and run this script again.${colors.reset}\n`);
    process.exit(1);
  } else {
    log(`\n${colors.green}${colors.bright}✅ All checks PASSED${colors.reset}`);
    log(`${colors.green}Your Supabase setup is ready!${colors.reset}\n`);
    info('You can now run: npm run dev');
    process.exit(0);
  }
}

// Run verification
verifySetup().catch((err) => {
  error(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
