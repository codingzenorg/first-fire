# Repository Guidelines

## Project Structure & Module Organization
The Vite entry point is `src/main.ts`. Game orchestration lives in `src/game/`, simulation and controls in `src/systems/`, procedural Three.js assets in `src/rendering/`, terrain in `src/world/`, and DOM presentation in `src/ui/`. Shared types and tuning values stay in `src/types.ts` and `src/config.ts`. Production output is generated in `dist/` and must not be edited.

## Build, Test, and Development Commands
- `npm install` - install Vite, TypeScript, and Three.js dependencies.
- `npm run dev` - start the local Vite development server.
- `npm run build` - type-check with `tsc` and create the production bundle.
- `npm run preview` - serve the built bundle for local verification.

## Coding Style & Naming Conventions
Use strict TypeScript, two-space indentation, semicolons, and double quotes. Classes and exported types use `PascalCase`; variables and methods use `camelCase`. Keep systems focused: input translates gestures into orders, simulation executes orders, and rendering modules create visual objects. Avoid embedding gameplay rules in UI code.

## Testing Guidelines
No automated test framework is configured yet. Every change must pass `npm run build` and be exercised in `npm run dev`. Verify selection, contextual right-click commands, resource collection, construction, training, combat, and both end states when touching shared gameplay behavior. Add tests as `*.test.ts` when a test runner is introduced.

## Commit & Pull Request Guidelines
History is minimal, so use concise imperative commits such as `Add barracks production queue`. Pull requests should summarize player-visible behavior, list verification performed, and include screenshots for visual changes. Link relevant issues and call out balancing or control changes explicitly.

## Agent Notes
Preserve the complete gather-build-train-fight loop. Prefer tuning constants and small system extensions over duplicating entity logic. Keep generated assets procedural unless an explicit asset pipeline is added.
