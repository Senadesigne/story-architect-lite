
const fs = require('fs');
const path = require('path');

// Mock dotenv behavior roughly if module not found, or try to require it
// We will try to find where dotenv is installed
const serverNodeModules = path.join(__dirname, '../server/node_modules');

try {
    // Try to load dotenv from server's node_modules
    require(path.join(serverNodeModules, 'dotenv')).config({ path: path.join(__dirname, '../server/.env') });
} catch (e) {
    console.log('⚠️  Could not load dotenv from server modules, parsing manually for check...');
    const envContent = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value;
        }
    });
}

console.log('--- ENV CHECK REPORT ---');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? `"${process.env.FIREBASE_PROJECT_ID}"` : 'UNDEFINED');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? (process.env.DATABASE_URL.includes('postgresql') ? 'Present (Hidden)' : process.env.DATABASE_URL) : 'UNDEFINED');
console.log('GOOGLE_SERVICE_ACCOUNT_JSON (First 20 chars):', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? process.env.GOOGLE_SERVICE_ACCOUNT_JSON.substring(0, 20) : 'UNDEFINED');

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('"')) {
    console.error('❌ DATABASE_URL has extra quotes! Remove them.');
} else {
    console.log('✅ DATABASE_URL looks clean (no extra quotes).');
}

if (!process.env.FIREBASE_PROJECT_ID) {
    console.error('❌ FIREBASE_PROJECT_ID is missing!');
}

try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        console.log('✅ GOOGLE_SERVICE_ACCOUNT_JSON parses correctly.');
    }
} catch (e) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON failed to JSON.parse in simulation:', e.message);
}
