import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

const workflowPath = new URL('../.github/workflows/pages.yml', import.meta.url);

async function loadWorkflow() {
  return YAML.parse(await readFile(workflowPath, 'utf8'));
}

test('GitHub Pages workflow follows the safe deployment contract', async () => {
  const workflow = await loadWorkflow();
  const { build, deploy } = workflow.jobs;

  assert.deepEqual(workflow.on.push.branches, ['master']);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(workflow.concurrency, {
    group: 'pages-${{ github.ref }}',
    'cancel-in-progress': false,
  });

  assert.equal(build['runs-on'], 'ubuntu-latest');
  assert.ok(!Object.hasOwn(build, 'permissions'));
  assert.deepEqual(build.steps, [
    { uses: 'actions/checkout@v5' },
    {
      uses: 'actions/setup-node@v6',
      with: { 'node-version': 24, cache: 'npm' },
    },
    { uses: 'actions/configure-pages@v5' },
    { run: 'npm ci' },
    { run: 'npm test' },
    {
      uses: 'actions/upload-pages-artifact@v4',
      with: { path: './public' },
    },
  ]);

  assert.deepEqual(deploy.needs, 'build');
  assert.equal(deploy['runs-on'], 'ubuntu-latest');
  assert.equal(deploy.if, "github.ref == 'refs/heads/master'");
  assert.deepEqual(deploy.permissions, { pages: 'write', 'id-token': 'write' });
  assert.deepEqual(deploy.environment, {
    name: 'github-pages',
    url: '${{ steps.deployment.outputs.page_url }}',
  });
  assert.deepEqual(deploy.steps, [
    {
      name: 'Deploy to GitHub Pages',
      id: 'deployment',
      uses: 'actions/deploy-pages@v4',
    },
  ]);
});
