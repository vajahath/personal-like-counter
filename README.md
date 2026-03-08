# @vajahath/personal-like-counter

A reactive, optimistic like counter utility for Firebase Firestore, powered by RxJS. This package handles real-time synchronization, debouncing, and automatic persistence with minimal configuration.

## Features

- **🚀 Optimistic UI**: Local increments are reflected immediately in the stream.
- **🔄 Real-time Sync**: Automatically stays in sync with Firestore updates from other clients.
- **🛡️ Rate Limiting & Retries**: Built-in 2 updates/sec rate limiting with automatic retries via `p-retry`.
- **📡 Sync Status**: Reactive `syncing$` observable to track background persistence.
- **📦 Lazy Loading**: Default Firebase configuration is only loaded if you don't provide your own.
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
  updateDebounceTime: 500, // default: 500ms
  // Optional: Provide your own config
  firebaseConfig: {
    apiKey: "...",
    projectId: "...",
    // ...
  }
});
```

### 2. Monitor Like Counts

The `likes$` observable provides a continuous stream of the current count. It reflects initial data, remote updates, and local optimistic increments.

```typescript
counter.likes$.subscribe(count => {
  console.log("Current likes:", count);
  // Update your UI counter
});
```

### 3. Track Sync Status

Use the `syncing$` observable to show a loading spinner or "Saving..." indicator. This covers the debounce period, network requests, and any automatic retries.

```typescript
counter.syncing$.subscribe(isSyncing => {
  if (isSyncing) {
    console.log("Saving to Firestore...");
  } else {
    console.log("All changes synced.");
  }
});
```

### 4. Increment Likes

Call `incrementLike()` to add to the count. The UI updates **instantly** through `likes$`.

```typescript
// Adds 1 by default
counter.incrementLike();

// Or add a specific amount
counter.incrementLike(5);
```

### 5. Browser Usage (CDN)

You can use the library directly in the browser via `esm.sh`. Ensure you include an `importmap` for the dependencies.

```html
<script type="importmap">
  {
    "imports": {
      "firebase/app": "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js",
      "firebase/firestore": "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js",
      "debounce": "https://esm.sh/debounce@3.0.0",
      "rxjs": "https://esm.sh/rxjs@7.8.1",
      "p-retry": "https://esm.sh/p-retry@7.1.1",
      "@vajahath/personal-like-counter": "https://esm.sh/@vajahath/personal-like-counter"
    }
  }
</script>

<script type="module">
  import { LikeCounter } from '@vajahath/personal-like-counter';
  const counter = new LikeCounter({ doc: 'demo-doc' });
  // ... rest of your logic
</script>
```

## API Reference

### Constructor Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `doc` | `string` | **Required**. The document ID in Firestore. |
| `collection` | `string` | The Firestore collection name. Default: `"general"`. |
| `updateDebounceTime` | `number` | Time in ms to wait before syncing. Default: `500`. |
| `firebaseConfig` | `object` | Your Firebase configuration. If omitted, a default is used. |
| `firestore` | `Firestore` | An existing Firestore instance (optional). |

### Properties

- **`likes$: Observable<number>`**: The stream of like counts.
- **`syncing$: Observable<boolean>`**: Emits `true` when a sync is pending or in progress.
- **`currentLikes: number`**: Synchronous getter for the last known count.

### Methods

- **`incrementLike(count?: number)`**: Increments the count. Default `1`.
- **`destroy()`**: Stops real-time listeners and cleans up resources.

## License

MIT &copy; Vajahath Hameed
