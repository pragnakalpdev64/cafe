/** Runs on `git commit` (see .husky/pre-commit), only against staged files. */
const config = {
  "*.{ts,tsx,mjs,mts}": ["prettier --write", "eslint --fix --max-warnings=0"],
  "*.css": "prettier --write",
  // validate the whole schema, not the file path lint-staged would append
  "prisma/schema.prisma": () => "prisma validate",
};

export default config;
