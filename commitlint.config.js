/**
 * Pull request titles (squash merge commits) follow Conventional Commits.
 * Checked in CI only (.github/workflows/pr-title.yml); there are no local hooks.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Package names and tool names start lower case; allow sentence case too.
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 72],
  },
};
