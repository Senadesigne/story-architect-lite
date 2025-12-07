
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../server/.env');

try {
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found at:', envPath);
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    let jsonLine = lines.find(line => line.startsWith('GOOGLE_SERVICE_ACCOUNT_JSON='));

    if (!jsonLine) {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON not found in .env');
        process.exit(1);
    }

    let jsonValue = jsonLine.split('GOOGLE_SERVICE_ACCOUNT_JSON=')[1].trim();

    // Check for surrounding quotes and warn/strip
    let hasSingleQuotes = false;
    let hasDoubleQuotes = false;

    if (jsonValue.startsWith("'") && jsonValue.endsWith("'")) {
        hasSingleQuotes = true;
        jsonValue = jsonValue.slice(1, -1);
    } else if (jsonValue.startsWith('"') && jsonValue.endsWith('"')) {
        hasDoubleQuotes = true;
        // Note: Standard dotenv might unescape newlines if double quoted, but here we just check raw JSON
        jsonValue = jsonValue.slice(1, -1);
    }

    console.log('🔍 Analyzing GOOGLE_SERVICE_ACCOUNT_JSON...');
    if (hasSingleQuotes) console.log('ℹ️  Value is wrapped in single quotes.');
    if (hasDoubleQuotes) console.log('ℹ️  Value is wrapped in double quotes.');

    try {
        JSON.parse(jsonValue);
        console.log('✅ JSON is valid!');
    } catch (e) {
        console.error('❌ JSON Parse Error:', e.message);
        const snippet = jsonValue.length > 50 ? jsonValue.substring(0, 50) + '...' : jsonValue;
        console.error('   Snippet of value:', snippet);
        console.error('   (Check for unescaped quotes, trailing commas, or newlines)');
    }

} catch (err) {
    console.error('Unexpected error:', err);
}
