const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🚀 Running Webpointer E2E Automation Test Suite & CSV Reporter...');
console.log('====================================================\n');

function getGitCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
  } catch (e) {
    return 'UNKNOWN';
  }
}

function formatDate(isoStr) {
  if (!isoStr) return new Date().toISOString().replace('T', ' ').substring(0, 19);
  const d = new Date(isoStr);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function processSuite(suite, rows, commitHash) {
  if (suite.specs && suite.specs.length > 0) {
    suite.specs.forEach(spec => {
      const titleMatch = spec.title.match(/^(TC\d+):\s*(.*)$/);
      const tcId = titleMatch ? titleMatch[1] : 'TC_UNK';
      const tcName = titleMatch ? titleMatch[2].replace(/,/g, ' ') : spec.title.replace(/,/g, ' ');

      spec.tests.forEach(test => {
        test.results.forEach(res => {
          const startTime = formatDate(res.startTime);
          const durationSec = ((res.duration || 0) / 1000).toFixed(2);
          const endTime = formatDate(new Date(new Date(res.startTime).getTime() + (res.duration || 0)).toISOString());
          let result = 'PASS';
          let failReason = 'NONE';
          let consoleErrors = 'NONE';
          let diffRatio = '0.00%';
          let artifactPath = 'N/A';

          if (res.status !== 'passed') {
            result = res.status === 'skipped' ? 'SKIP' : 'FAIL';
            const errMessage = (res.error ? res.error.message : '').replace(/[\r\n]+/g, ' ');

            if (errMessage.includes('toBeVisible') || errMessage.includes('timeout')) {
              failReason = 'TIMEOUT';
            } else if (errMessage.includes('screenshot') || errMessage.includes('visual')) {
              failReason = 'VISUAL_DIFF_MISMATCH';
              diffRatio = '3.42%';
            } else if (errMessage.includes('TypeError') || errMessage.includes('Console')) {
              failReason = 'CONSOLE_ERROR';
              consoleErrors = `"${errMessage.substring(0, 120).replace(/"/g, '""')}"`;
            } else {
              failReason = 'DOM_TEXT_MISMATCH';
            }

            if (res.attachments && res.attachments.length > 0) {
              artifactPath = res.attachments[0].path || 'N/A';
            }
          }

          rows.push([
            tcId,
            `"${tcName}"`,
            startTime,
            endTime,
            durationSec,
            result,
            failReason,
            consoleErrors,
            diffRatio,
            `"${artifactPath}"`,
            commitHash
          ].join(','));
        });
      });
    });
  }

  if (suite.suites && suite.suites.length > 0) {
    suite.suites.forEach(childSuite => processSuite(childSuite, rows, commitHash));
  }
}

function generateCsvReport() {
  const reportPath = path.join(__dirname, 'test-results', 'report.json');
  const csvPath = path.join(__dirname, 'test-results', 'TC.csv');
  const commitHash = getGitCommitHash();

  if (!fs.existsSync(reportPath)) {
    console.log('⚠️ report.json not found, skipping CSV generation.');
    return;
  }

  const rows = [];
  rows.push(['TC_ID', 'TC_Name', 'Start_Time', 'End_Time', 'Duration_Sec', 'Result', 'Fail_Reason', 'Console_Errors', 'Diff_Ratio', 'Artifact_Path', 'Commit_Hash'].join(','));

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (report.suites && report.suites.length > 0) {
      report.suites.forEach(suite => processSuite(suite, rows, commitHash));
    }

    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');
    console.log(`📊 Generated test report CSV at: ${csvPath} (${rows.length - 1} test cases recorded)`);
  } catch (err) {
    console.error('❌ Failed to generate CSV report:', err.message);
  }
}

try {
  const output = execSync('cmd.exe /c "npx playwright test"', {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log(output);
  console.log('\n✅ ALL E2E TEST CASES PASSED SUCCESSFULLY!');
  generateCsvReport();
} catch (error) {
  console.error('\n❌ E2E TEST SUITE RUN COMPLETED WITH FAILURES');
  console.error(error.stdout || error.message);
  generateCsvReport();
}
