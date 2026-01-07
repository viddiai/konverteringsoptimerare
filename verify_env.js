const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

try {
    if (!fs.existsSync(envPath)) {
        console.log('ERROR: .env file does not exist');
        process.exit(1);
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    let found = false;
    let formatCorrect = false;

    for (const line of lines) {
        if (line.trim().startsWith('OPENAI_API_KEY')) {
            found = true;
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[1].trim();
                if (key.startsWith('sk-') && key.length > 20) {
                    formatCorrect = true;
                }
            }
        }
    }

    if (!found) {
        console.log('ERROR: OPENAI_API_KEY not found in .env');
    } else if (!formatCorrect) {
        console.log('ERROR: OPENAI_API_KEY found but format seems incorrect (should start with sk- and be long)');
    } else {
        console.log('OK: Key found and format looks correct');
    }

} catch (e) {
    console.error('ERROR reading file:', e);
}
