#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const path = require('path');

/**
 * Release the Daggerheart system to Foundry VTT using the Package Release API
 */
class DaggerheartReleaser {
    constructor() {
        this.packageId = 'daggerheart-unofficial';
        this.repoUrl = 'https://github.com/unofficial-daggerheart/daggerheart';
        this.manifestBaseUrl = 'https://raw.githubusercontent.com/unofficial-daggerheart/daggerheart';
    }

    /**
     * Update system.json with the new version and download URL
     */
    updateSystemJson(version) {
        const systemJsonPath = path.join(__dirname, '..', 'system.json');

        if (!fs.existsSync(systemJsonPath)) {
            throw new Error('system.json not found');
        }

        const systemData = JSON.parse(fs.readFileSync(systemJsonPath, 'utf8'));

        systemData.version = version;
        systemData.download = `${this.repoUrl}/archive/refs/tags/v${version}.zip`;

        fs.writeFileSync(systemJsonPath, JSON.stringify(systemData, null, 2));
        console.log(`✅ Updated system.json to version ${version}`);
    }

    /**
     * Make API request to Foundry VTT
     */
    async makeFoundryRequest(version, isDryRun = false) {
        const releaseData = {
            id: this.packageId,
            ...(isDryRun && { "dry-run": true }),
            release: {
                version: version,
                manifest: `${this.manifestBaseUrl}/v${version}/system.json`,
                notes: `${this.repoUrl}/releases/tag/v${version}`,
                compatibility: {
                    minimum: "13",
                    verified: "13",
                    maximum: ""
                }
            }
        };

        const postData = JSON.stringify(releaseData);

        const options = {
            hostname: 'foundryvtt.com',
            path: '/_api/packages/release_version/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.FOUNDRY_RELEASE_TOKEN,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve({
                            status: res.statusCode,
                            data: response,
                            headers: res.headers
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            data: data,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Validate version format
     */
    validateVersion(version) {
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(version)) {
            throw new Error(`Invalid version format: ${version}. Expected format: X.Y.Z`);
        }
    }

    /**
     * Check if required environment variables are set
     */
    validateEnvironment() {
        if (!process.env.FOUNDRY_RELEASE_TOKEN) {
            throw new Error('FOUNDRY_RELEASE_TOKEN environment variable is required');
        }

        if (!process.env.FOUNDRY_RELEASE_TOKEN.startsWith('fvttp_')) {
            throw new Error('FOUNDRY_RELEASE_TOKEN should start with "fvttp_"');
        }
    }

    /**
     * Main release function
     */
    async release(version, options = {}) {
        const { dryRun = false, updateJson = true } = options;

        try {
            console.log(`🚀 Starting ${dryRun ? 'dry run ' : ''}release for Daggerheart v${version}`);

            this.validateVersion(version);
            this.validateEnvironment();

            if (updateJson && !dryRun) {
                this.updateSystemJson(version);
            }

            // Always do a dry run first for validation
            if (!dryRun) {
                console.log('🔍 Running validation check...');
                const dryRunResult = await this.makeFoundryRequest(version, true);

                if (dryRunResult.status !== 200) {
                    console.error('❌ Dry run validation failed:', dryRunResult);
                    throw new Error(`Validation failed with status ${dryRunResult.status}`);
                }

                console.log('✅ Validation passed');
            }

            // Make the actual release request
            const result = await this.makeFoundryRequest(version, dryRun);

            if (result.status === 200) {
                if (dryRun) {
                    console.log('✅ Dry run completed successfully');
                    console.log('📝 Response:', result.data);
                } else {
                    console.log('🎉 Successfully released to Foundry VTT!');
                    console.log('📝 Response:', result.data);
                    console.log(`🔗 Package page: https://foundryvtt.com/packages/daggerheart-unofficial`);
                }
            } else if (result.status === 429) {
                const retryAfter = result.headers['retry-after'];
                throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
            } else {
                console.error('❌ Release failed:', result);
                throw new Error(`Release failed with status ${result.status}: ${JSON.stringify(result.data)}`);
            }

        } catch (error) {
            console.error('💥 Release error:', error.message);
            process.exit(1);
        }
    }
}

// CLI handling
function showUsage() {
    console.log(`
Usage: node scripts/release.js <version> [options]

Arguments:
  version     Version number (e.g., 2.11.2)

Options:
  --dry-run   Validate the release without publishing
  --no-update Don't update system.json file

Examples:
  node scripts/release.js 2.11.2
  node scripts/release.js 2.11.2 --dry-run
  node scripts/release.js 2.11.2 --no-update

Environment Variables:
  FOUNDRY_RELEASE_TOKEN   Your Foundry VTT package release token (required)
`);
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showUsage();
        process.exit(0);
    }

    const version = args[0];
    const isDryRun = args.includes('--dry-run');
    const updateJson = !args.includes('--no-update');

    if (!version) {
        console.error('❌ Version is required');
        showUsage();
        process.exit(1);
    }

    const releaser = new DaggerheartReleaser();
    releaser.release(version, { dryRun: isDryRun, updateJson });
}

module.exports = DaggerheartReleaser;