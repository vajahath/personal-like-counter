import { expect, test, mock, beforeEach, describe } from "bun:test";
import { firstValueFrom } from "rxjs";

// Mock firebase modules BEFORE importing LikeCounter
mock.module("firebase/app", () => ({
  initializeApp: mock(() => ({})),
  getApps: mock(() => []),
  getApp: mock(() => ({})),
}));

const mockUpdateDoc = mock(() => Promise.resolve());
const mockOnSnapshot = mock((ref, cb) => {
  // Simulate initial snapshot
  cb({
    exists: () => true,
    data: () => ({ likes: 10 })
  });
  return () => {}; // Unsubscribe function
});

mock.module("firebase/firestore", () => ({
  getFirestore: mock(() => ({})),
  doc: mock(() => ({})),
  increment: mock((n) => n),
  serverTimestamp: mock(() => "mock-timestamp"),
  updateDoc: mockUpdateDoc,
  onSnapshot: mockOnSnapshot,
}));

// Mock p-retry to execute immediately without retries by default
const mockPRetry = mock((fn: Function) => fn());
mock.module("p-retry", () => ({
  default: mockPRetry,
  AbortError: class AbortError extends Error {}
}));

// Mock debounce to execute immediately for easier testing
mock.module("debounce", () => ({
  default: (fn: Function) => fn,
}));

// Now import the class
import { LikeCounter } from "../src/index";

describe("LikeCounter", () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockOnSnapshot.mockClear();
    mockPRetry.mockClear();
  });

  test("should initialize with value from onSnapshot", async () => {
    const counter = new LikeCounter({ doc: "test-doc" });
    await counter.ready();
    const count = await firstValueFrom(counter.likes$);
    
    expect(count).toBe(10);
    expect(mockOnSnapshot).toHaveBeenCalled();
  });

  test("should optimistically increment like count and include lastUpdate", async () => {
    const counter = new LikeCounter({ doc: "test-doc" });
    await counter.ready();
    
    // Initial state check
    expect(counter.currentLikes).toBe(10);
    
    // Increment
    counter.incrementLike(1);
    
    // Local stream should update immediately
    expect(counter.currentLikes).toBe(11);
    
    // Wait for async syncToFirestore to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // p-retry should have been called
    expect(mockPRetry).toHaveBeenCalled();
    
    // Firestore should be called
    expect(mockUpdateDoc).toHaveBeenCalled();
    const callArgs = mockUpdateDoc.mock.calls[0][1];
    expect(callArgs.likes).toBe(1);
    expect(callArgs.lastUpdate).toBe("mock-timestamp");
  });

  test("should handle multiple local increments", async () => {
    const counter = new LikeCounter({ doc: "test-doc" });
    await counter.ready();
    
    counter.incrementLike(2);
    // Wait for first async syncToFirestore
    await new Promise(resolve => setTimeout(resolve, 0));
    
    counter.incrementLike(3);
    // Wait for second async syncToFirestore
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(counter.currentLikes).toBe(15);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
  });

  test("should track syncing status", async () => {
    const counter = new LikeCounter({ doc: "test-doc" });
    await counter.ready();
    
    // Initial status should be false
    let isSyncing = await firstValueFrom(counter.syncing$);
    expect(isSyncing).toBe(false);

    // Call sync manually or via increment
    counter.incrementLike(1);
    
    // Wait for async syncToFirestore to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    isSyncing = await firstValueFrom(counter.syncing$);
    expect(isSyncing).toBe(false);
  });
});
