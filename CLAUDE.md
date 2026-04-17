# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GoodPharma MR** — a React Native mobile app for Medical Representatives (field sales agents in pharma). It connects to a .NET backend (`GoodPharma.API`) over REST. Key MR workflows: attendance punch-in/out, doctor visits (check-in/check-out), Daily Call Reports (DCR), Monthly Tour Plans (MTP), product catalog, tasks, and live GPS tracking while on duty.

## Commands

```bash
# Start Metro bundler
npm start

# Run on Android emulator or connected device
npm run android

# Run on iOS simulator
npm run ios

# Lint
npm run lint

# Tests
npm test

# Run a single test file
npx jest __tests__/App.test.tsx
```

Node >= 22.11.0 is required.

## Environment Configuration

Copy `.env.development` and adjust for your environment. Variables are consumed via `react-native-dotenv` and typed in [src/types/env.d.ts](src/types/env.d.ts):

```
API_BASE_URL=http://<your-machine-ip>:<port>
API_PREFIX=/api/v1
API_TIMEOUT=30000
APP_NAME=GoodPharma MR
```

On Android the axios instance automatically replaces `localhost` with `10.0.2.2` for emulator compatibility ([src/services/api/axiosInstance.ts](src/services/api/axiosInstance.ts)).

## Architecture

### Navigation

Two-level navigation: `AppNavigator` → checks `auth.isAuthenticated` → routes to either `AuthNavigator` or `MainNavigator`.

`MainNavigator` is a **bottom tab navigator** with 4 visible tabs (Home, Tour Plan, Products, Profile/More) and 4 **hidden tabs** (Attendance, Visits, DCR, Doctors) that are accessible only via Dashboard quick-action buttons — they have `tabBarButton: () => null`. Each tab owns its own stack navigator. All route names are defined in [src/constants/routes.ts](src/constants/routes.ts) and all param types in [src/types/navigation.types.ts](src/types/navigation.types.ts).

### State Management

Redux Toolkit + `redux-persist`. The store shape:

| Slice | Persisted |
|-------|-----------|
| `auth` | Yes — token, refreshToken, user, isAuthenticated |
| `user` | Yes (root whitelist) |
| `doctor`, `visit`, `dcr`, `task`, `attendance`, `tourPlan` | No — always fetched fresh |

Use `useAppSelector` / `useAppDispatch` from [src/store/hooks.ts](src/store/hooks.ts), never the raw `useSelector`/`useDispatch`.

### API Layer

All HTTP calls go through the singleton `axiosInstance` ([src/services/api/axiosInstance.ts](src/services/api/axiosInstance.ts)), which:
- Attaches `Authorization: Bearer <token>` on every request
- Handles 401 by attempting a token refresh (via `/auth/refresh-token`), retrying the original request once, then dispatching `logout()` on failure

Per-domain API modules live in [src/services/api/](src/services/api/) and are re-exported from [src/services/api/index.ts](src/services/api/index.ts). All endpoint paths are centralised in [src/config/api.config.ts](src/config/api.config.ts).

### Live Location Tracking

`useLocationTracker(isPunchedIn)` ([src/hooks/useLocationTracker.ts](src/hooks/useLocationTracker.ts)) sends GPS pings every 5 minutes to `/live-tracking/update`.

- **Android**: starts a foreground service (via `@voximplant/react-native-foreground-service`) to keep the JS thread alive while the app is backgrounded, then uses `setInterval`.
- **iOS**: uses `Geolocation.watchPosition` with `allowsBackgroundLocationUpdates: true`; pings are throttled to one per 5 minutes. Tracking errors are silently swallowed — never surfaced to the user.

## Backend (.NET API)

The backend solution is at:
```
D:\EterniRo\Projects\Field-Force Automation\Repos\ServiceSln\
```

| Layer | Path | Purpose |
|-------|------|---------|
| Controllers | `GoodPharma.API\Controllers\` | HTTP endpoints — one file per domain |
| Services | `GoodPharma.Application\Services\` | Business logic |
| Interfaces | `GoodPharma.Application\Interfaces\` | Service contracts (`I<Name>Service.cs`) |
| Repositories | `GoodPharma.Infrastructure\Data\Repositories\` | Data access |
| DTOs | `GoodPharma.Application\DTOs\` | Request/response shapes |

**When a feature requires new or modified data, make the corresponding change in both repos:**
- Add/update/delete the API endpoint in the backend (`ServiceSln`)
- Update the frontend service call, Redux thunk, and TypeScript types to match

Always verify that the HTTP method, URL path, request body shape, and response envelope are identical on both sides before considering a change complete. A mismatch between frontend expectations and backend contract is a runtime bug even if both sides compile cleanly.

**When adding or changing an API endpoint:**
1. Add/update the controller in `GoodPharma.API\Controllers\`
2. Add/update the interface in `GoodPharma.Application\Interfaces\`
3. Implement in `GoodPharma.Application\Services\`
4. Register the new endpoint path in the mobile app's [src/config/api.config.ts](src/config/api.config.ts) under `ENDPOINTS`
5. Add/update the corresponding API module in [src/services/api/](src/services/api/)

### Patches

`patch-package` runs on `postinstall`. Patches are stored in [patches/](patches/). If you upgrade a patched package, re-run `npx patch-package <package-name>` to regenerate the patch.
