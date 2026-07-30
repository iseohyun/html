const { execSync } = require('child_process');
const fs = require('fs');

console.log('====================================================');
console.log('🚀 Running Webpointer E2E Automation Test Suite...');
console.log('====================================================\n');

try {
  const output = execSync('cmd.exe /c "npx playwright test"', {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log(output);
  console.log('\n✅ ALL E2E TEST CASES PASSED SUCCESSFULLY!');
} catch (error) {
  console.error('\n❌ E2E TEST FAILURE DETECTED!');
  console.error(error.stdout || error.message);

  const reportPath = __dirname + '/test-results/report.json';
  if (fs.existsSync(reportPath)) {
    console.log('\n📋 Detailed Test Report Summary:');
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      report.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          spec.tests.forEach(test => {
            test.results.forEach(res => {
              if (res.status !== 'passed') {
                console.log(`❌ [FAIL] ${spec.title}`);
                if (res.error) console.log(`   Error: ${res.error.message}`);
              }
            });
          });
        });
      });
    } catch(e) {}
  }
  process.exit(1);
}
