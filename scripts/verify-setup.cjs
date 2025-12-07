
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runDiagnosis() {
    console.log('🩺 Starting Diagnostic Check...');

    // 1. Load .env manually
    const envPath = path.join(__dirname, '../server/.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file missing!');
        process.exit(1);
    }

    // Parse .env manually to avoid library dependency issues in this standalone script
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[key] = value;
        }
    });

    // 2. Check Database Connection
    console.log('\n--- Database Check ---');
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL missing from .env');
    } else {
        console.log(`ℹ️  Connecting to: ${dbUrl.replace(/:([^:@]+)@/, ':****@')}`);
        const pool = new Pool({
            connectionString: dbUrl,
            connectionTimeoutMillis: 5000
        });
        try {
            const client = await pool.connect();
            const res = await client.query('SELECT NOW()');
            console.log('✅ Database Connection Successful!', res.rows[0]);
            client.release();
        } catch (err) {
            console.error('❌ Database Connection FAILED:', err.message);
            if (err.message.includes('password')) console.error('   Hint: Check your database password.');
            if (err.message.includes('ECONNREFUSED')) console.error('   Hint: Is the database server running?');
        } finally {
            await pool.end();
        }
    }

    // 3. Check Google Credentials JSON
    console.log('\n--- Google Credentials Check ---');
    if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON missing from .env');
    } else {
        try {
            const json = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
            console.log('✅ JSON Format Valid');
            console.log(`ℹ️  Project ID: ${json.project_id}`);
            console.log(`ℹ️  Client Email: ${json.client_email}`);
        } catch (e) {
            console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON is Invalid JSON:', e.message);
        }
    }
}

runDiagnosis().catch(console.error);
