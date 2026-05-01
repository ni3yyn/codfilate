const https = require('https');
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.tokens.access_token;
const projectId = 'codfilatepromo';
const newEmail = 'codfilatedz@gmail.com';

async function request(method, url, body) {
    const urlObj = new URL(url);
    const options = {
        method: method,
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`Status: ${res.statusCode}, Body: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.log("Fetching policy for project: " + projectId);
        const policy = await request('POST', `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`, {
            options: { requestedPolicyVersion: 1 }
        });
        console.log("FULL POLICY:");
        console.log(JSON.stringify(policy, null, 2));
        
        console.log("Current Policy version: " + (policy.version || 1));
        
        if (!policy.bindings) policy.bindings = [];

        const rolesToAdd = ['roles/editor', 'roles/firebase.admin', 'roles/resourcemanager.projectIamAdmin'];
        const member = `user:${newEmail}`;

        rolesToAdd.forEach(role => {
            let binding = policy.bindings.find(b => b.role === role);
            if (!binding) {
                binding = { role: role, members: [] };
                policy.bindings.push(binding);
            }
            if (!binding.members.includes(member)) {
                binding.members.push(member);
                console.log("Adding " + member + " to " + role);
            } else {
                console.log(member + " is already in " + role);
            }
        });

        console.log("Updating policy...");
        await request('POST', `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:setIamPolicy`, { 
            policy: policy 
        });
        
        console.log("\n✅ SUCCESS! " + newEmail + " is now an Owner of " + projectId);
        console.log("You can now go to: https://console.firebase.google.com/");
        console.log("And log in with " + newEmail);
    } catch (e) {
        console.error("\n❌ Error: " + e.message);
        if (e.message.includes("401")) {
            console.log("\nHint: Your login session might have expired. Try running 'firebase projects:list' once to refresh it, then run this script again.");
        }
    }
}

run();
