# @vajahath/personal-like-counter

A reactive, optimistic like counter utility for Firebase Firestore, powered by RxJS. This package handles real-time synchronization, debouncing, and automatic persistence with minimal configuration.

## Features

- **🚀 Optimistic UI**: Local increments are reflected immediately in the stream.
- **🔄 Real-time Sync**: Automatically stays in sync with Firestore updates from other clients.
- **🛡️ Debounced Writes**: Batches multiple rapid clicks into a single database update.
- **📡 RxJS Powered**: Exposes a clean Observable stream (`likes$`) for modern frontend integration.
- **💾 Auto-Persistence**: Ensures pending counts are synced even when the user leaves the page or hides the tab.

## Installation

```bash
bun add @vajahath/personal-like-counter rxjs
```

## Usage

### 1. Initialize the Counter

```typescript
import { LikeCounter } from "@vajahath/personal-like-counter";

const counter = new LikeCounter({
  doc: "my-post-id",
  collection: "likes", // default: "general"
  updateDebounceTime: 500, // default: 300ms
  firebaseConfig: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    // ... your Firebase config
  }
});
```

### 2. Subscribe to the Stream

The `likes$` observable provides a continuous stream of the current count. It handles both initial load and subsequent updates.

```typescript
counter.likes$.subscribe(count => {
  console.log("Current likes:", count);
  // Update your UI here
});
```

### 3. Increment Likes

Call `incrementLike()` to add to the count. The `likes$` stream will update **immediately** while the database sync happens in the background.

```typescript
// Adds 1 by default
counter.incrementLike();

// Or add a specific amount
counter.incrementLike(5);
```

### 4. Cleanup

When your component or page unmounts, call `destroy()` to stop the real-time Firestore subscription.

```typescript
counter.destroy();
```

## API Reference

| Option | Type | Description |
| :--- | :--- | :--- |
| `doc` | `string` | **Required**. The document ID in Firestore. |
| `collection` | `string` | The Firestore collection name. Default: `"general"`. |
| `updateDebounceTime` | `number` | Time in ms to wait before syncing to Firestore. Default: `300`. |
| `firebaseConfig` | `object` | Your Firebase configuration object. |
| `firestore` | `Firestore` | An existing Firestore instance (optional). |

## Development

- **Install dependencies**: `bun install`
- **Build**: `bun run build`
- **Test**: `bun run test`
- **Demo**: `bun run demo` (serves a local preview page)

## License

MIT
