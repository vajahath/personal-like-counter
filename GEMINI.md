# GEMINI.md - Project Context & Instructions

This project is a reactive, optimistic like counter utility designed for integration with Firebase Firestore. It provides a robust, real-time synchronization layer using RxJS Observables.

## Project Overview

- **Name**: `@vajahath/personal-like-counter`
- **Purpose**: Manage like counts in Firestore with local optimistic updates and real-time server synchronization.
- **Architecture**: 
  - Centered around the `LikeCounter` class in `src/index.ts`.
  - Uses `ReplaySubject(1)` from RxJS to provide a continuous stream of the like count.
  - Implements **Optimistic UI**: Increments are pushed to the local stream immediately.
  - Implements **Debounced Writes**: Background synchronization to Firestore is batched to reduce database load.
  - **Real-time Sync**: Uses Firestore `onSnapshot` to listen for updates from other clients.
- **Tech Stack**: 
  - **Runtime/Package Manager**: Bun
  - **Language**: TypeScript
  - **Database**: Firebase Firestore
  - **Reactive Programming**: RxJS
  - **Build Tool**: `tsdown` (Rolldown-based)
  - **Testing**: `bun:test`

## Building and Running

- **Install Dependencies**: `bun install`
- **Build Library**: `bun run build` (Outputs to `dist/`)
- **Run Tests**: `bun run test`
- **Run Demo**: `bun run demo` (Builds, prepares the `demo/` folder, and serves it locally)
- **Type Checking**: `bun run typecheck`
- **Development Mode**: `bun run dev` (Watches for changes)

## Development Conventions

- **Reactive First**: Use the `likes$` observable for all UI updates.
- **Security & Integrity**: 
  - The library uses `updateDoc`, meaning documents **must exist** in Firestore before they can be used.
  - Firestore Security Rules (`firestore.rules`) strictly limit updates to the `likes` field and only allow **increments**.
- **Clean Architecture**: 
  - Logic for Firestore interaction, state management, and exit handling (syncing on tab close) is encapsulated within the `LikeCounter` class.
- **Testing**:
  - Unit tests are located in `tests/` and use Bun's built-in testing framework with comprehensive mocking of Firebase SDKs.

## CI/CD Workflows

- **CI**: Automated build, type check, and test suite execution on every push to `main`.
- **Release**: Automatically publishes the package to the **GitHub Package Registry** upon a new release.

## Key Files

- `src/index.ts`: The core library logic.
- `demo/index.html`: Interactive preview page using RxJS and Firebase CDNs.
- `firestore.rules`: Security policy for the Firestore database.
- `package.json`: Dependency management and build scripts.
- `.github/workflows/`: Automation for CI and deployment.
