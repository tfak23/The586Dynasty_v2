# The 586 Dynasty - Project Instructions

This document outlines key guidelines for developing and maintaining the 586 Dynasty app, a React Native/Expo mobile/web application for dynasty fantasy football management. It integrates with Sleeper API, Google Sheets, and Supabase for data handling. Follow these to avoid common pitfalls and ensure robustness.

## Deployment
- Do NOT modify `.github/workflows/deploy.yml` or the deployment pipeline
- GitHub Actions deploys automatically on push to main
- After code changes, commit and push to main — the workflow handles the rest
- Never deploy manually via `gh-pages` or any branch-based method

**## Local Setup and Environment**
- **Prerequisites**: Install Node.js (v18+), Yarn or npm, Expo CLI (`npm install -g expo-cli`), and Supabase CLI (`npm install -g supabase`).
- Clone the repo: `git clone https://github.com/tfak23/The586Dynasty_v2.git`
- Install dependencies: `yarn install` or `npm install`
- Copy `.env.example` to `.env` and fill in required variables (e.g., SUPABASE_URL, SUPABASE_ANON_KEY, SLEEPER_LEAGUE_ID, GOOGLE_SHEETS_ID). Do NOT commit `.env`.
- Start local development: `expo start` (or `yarn start`) — this runs the app in Expo Go for mobile or web mode.
- For Supabase local setup: Run `supabase start` to spin up a local instance, then apply migrations from the `supabase/migrations` folder using `supabase db push`.
- **Common issues**: Ensure environment variables are loaded correctly; restart the dev server if changes don't reflect.

**## Development Guidelines**
- **Branching strategy**: Work on feature branches (e.g., `git checkout -b feature/new-draft-filter`). Merge to main only after testing. Use pull requests for reviews if collaborating.
- **Code style**: Use TypeScript strictly (no `any` types where possible). Follow Prettier/ESLint configs in the repo — run `yarn lint` or `yarn format` before commits.
- **Folder structure**:
  - `app/`: Screens and routes.
  - `src/`: Components, hooks, utilities (e.g., draft board, free agents, cap projections, trade filters).
  - `scripts/`: Data processing or automation scripts (e.g., for draft picks or trade history).
  - `supabase/`: Database schemas, functions, and migrations (use PLpgSQL for stored procedures).
  - `assets/` and `public/`: Static files like logos and icons.
- **Commit messages**: Use conventional commits (e.g., "feat: add rookie draft filtering", "fix: resolve cap card display issue").
- **API integrations**:
  - Sleeper API: Fetch league data via endpoints like `/league/{id}/users`. Cache responses where possible to avoid rate limits.
  - Google Sheets: Use service account credentials in `.env` for read/write access. Scripts in `scripts/` handle data syncing.
  - Supabase: Enable Row Level Security (RLS) for all tables. Use edge functions for complex logic (e.g., bypassing RLS during onboarding).
- **Avoid hardcoding**: Use commissioner settings (e.g., rookieDraftRounds) instead of fixed values like 3.

**## Testing and Debugging**
- **Unit tests**: Add tests for components and hooks using Jest/React Native Testing Library. Run with `yarn test`.
- **E2E tests**: Use Detox or Appium for end-to-end if needed (not currently set up — consider adding).
- **Manual testing**: Test on iOS/Android simulators and web. Verify features like draft boards, free-agent lists, salary-cap projections, and trade filters.
- **Debugging tips**: Use Expo's dev tools for hot reloading. For Supabase issues, check logs with `supabase logs`. Monitor Sleeper API responses for errors.
- **CI checks**: GitHub Actions runs linting and tests on pushes/PRs — ensure they pass before merging.

**## Maintenance and Robustness**
- **Backups**: Regularly back up Supabase data via `supabase db dump`. Export Google Sheets periodically.
- **Version control**: Tag releases (e.g., `git tag v1.0.0`) for milestones. Use `git revert` or `git reset` cautiously for rollbacks, and always back up branches first.
- **Security**: Never expose API keys in code. Review RLS policies in Supabase to prevent unauthorized access.
- **Updates**: Keep dependencies up-to-date with `yarn upgrade` or `npm update`, but test thoroughly. Monitor Expo SDK versions for compatibility.
- **Monitoring**: After deployment, check the live site for issues. Use Supabase analytics for query performance.
- **Collaboration with AI (e.g., Claude)**: When requesting changes, provide specific commit SHAs for context. Always review and test generated code locally before committing. If issues arise, revert to a known good commit (e.g., via `git reset --hard <commit-sha>`).

**## Resources**
- Expo docs: https://docs.expo.dev/
- Supabase docs: https://supabase.com/docs
- Sleeper API: https://docs.sleeper.com/
- Google Sheets API: https://developers.google.com/sheets/api