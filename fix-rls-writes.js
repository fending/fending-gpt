#!/usr/bin/env node

/**
 * Script to fix RLS write operations across all API routes
 * This script updates files to use createServiceRoleClient for write operations
 * while keeping createClient for read operations
 */

const fs = require('fs');
const path = require('path');

// List of files that need to be fixed
const filesToFix = [
  'src/app/api/session/start/route.ts',
  'src/app/api/session/end/route.ts',
  'src/app/api/session/cleanup/route.ts',
  'src/app/api/session/queue-status/route.ts',
  'src/app/api/session/queue-update/route.ts',
  'src/lib/background/scheduler.ts'
];

function updateFile(filePath) {
  console.log(`Updating ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update import statement
  content = content.replace(
    /import { createClient } from '@\/lib\/supabase\/server'/g,
    "import { createClient, createServiceRoleClient } from '@/lib/supabase/server'"
  );
  
  // Add service role client initialization after createClient
  content = content.replace(
    /(const supabase = (?:await )?createClient\(\))/g,
    '$1\n    const serviceSupabase = createServiceRoleClient()'
  );
  
  // Replace write operations to use service role client
  content = content.replace(
    /await supabase\s*\.from\(['"`]chat_sessions['"`]\)\s*\.(?:insert|update|delete)/g,
    'await serviceSupabase.from(\'chat_sessions\').${operation}'
  );
  
  // More specific replacements for common patterns
  content = content.replace(
    /await supabase\s*\n\s*\.from\(['"`]chat_sessions['"`]\)\s*\n\s*\.update/g,
    'await serviceSupabase\n      .from(\'chat_sessions\')\n      .update'
  );
  
  content = content.replace(
    /await supabase\s*\n\s*\.from\(['"`]chat_sessions['"`]\)\s*\n\s*\.insert/g,
    'await serviceSupabase\n      .from(\'chat_sessions\')\n      .insert'
  );
  
  // Write the updated content back
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${filePath}`);
}

// Process all files
filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    updateFile(fullPath);
  } else {
    console.warn(`⚠️  File not found: ${fullPath}`);
  }
});

console.log('\n🎉 All files updated! Please review the changes manually.');
console.log('Note: This script makes basic replacements. You may need to manually fix:');
console.log('- Complex multiline write operations');
console.log('- Error handling updates');
console.log('- Variable names that need updating');