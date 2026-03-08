import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, updateDoc, increment, serverTimestamp, type Firestore, type DocumentReference, type Unsubscribe } from "firebase/firestore";
import debounce from "debounce";
import { ReplaySubject, BehaviorSubject, type Observable } from "rxjs";
import pRetry, { AbortError } from "p-retry";

interface LikeCounterConfig {
  collection?: string;
  doc: string;
  updateDebounceTime?: number;
  firebaseConfig?: any;
  firestore?: Firestore;
}

export class LikeCounter {
  private db?: Firestore;
  private docRef?: DocumentReference;
  private pendingCount: number = 0;
  private debouncedSync: any;
  private likesSubject = new ReplaySubject<number>(1);
  private syncingSubject = new BehaviorSubject<boolean>(false);
  private _currentLikes: number = 0;
  private unsubscribe?: Unsubscribe;
  private initPromise: Promise<void>;

  constructor(config: LikeCounterConfig) {
    const { updateDebounceTime = 500 } = config;

    // Create the debounced sync method
    this.debouncedSync = debounce(this.syncToFirestore.bind(this), updateDebounceTime);

    // Ensure we sync when the user leaves the page
    this.setupExitListeners();

    // Start initialization asynchronously
    this.initPromise = this.init(config);
  }

  private async init(config: LikeCounterConfig) {
    const { collection = "general", doc: docId, firebaseConfig, firestore } = config;

    if (firestore) {
      this.db = firestore;
    } else {
      let finalConfig = firebaseConfig;
      if (!finalConfig) {
        // Lazy load the default config only if not provided
        const { DEFAULT_FIREBASE_CONFIG } = await import("./default-config");
        finalConfig = DEFAULT_FIREBASE_CONFIG;
      }
      
      const app: FirebaseApp = getApps().length === 0
        ? initializeApp(finalConfig)
        : getApp();
      this.db = getFirestore(app);
    }

    this.docRef = doc(this.db!, collection, docId);

    // Set up real-time sync from Firestore
    this.setupFirestoreSubscription();
  }

  /**
   * Returns an Observable stream of the current like count.
   * This includes real-time updates from Firestore AND immediate local increments.
   * It will not emit until the first value is received from Firestore or a local increment occurs.
   */
  get likes$(): Observable<number> {
    return this.likesSubject.asObservable();
  }

  /**
   * Returns an Observable stream of the synchronization status.
   * Emits true when a sync is pending (debouncing) or in progress (including retries), and false when idle.
   */
  get syncing$(): Observable<boolean> {
    return this.syncingSubject.asObservable();
  }

  /**
   * Returns the current value of the likes.
   */
  get currentLikes(): number {
    return this._currentLikes;
  }

  /**
   * Increments the like count. 
   * Updates the local stream immediately (optimistic UI) and debounces the Firestore sync.
   */
  incrementLike(count: number = 1) {
    this.pendingCount += count;
    // Signal syncing immediately to cover the debounce period
    this.syncingSubject.next(true);
    // Optimistically update the local stream
    this._currentLikes += count;
    this.likesSubject.next(this._currentLikes);
    this.debouncedSync();
  }

  /**
   * Cleans up subscriptions and listeners.
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private async setupFirestoreSubscription() {
    // Wait for initialization to complete to have docRef
    await this.initPromise;

    if (!this.docRef) return;

    this.unsubscribe = onSnapshot(this.docRef, (docSnap) => {
      if (docSnap.exists()) {
        const serverLikes = docSnap.data().likes || 0;
        
        // If the server value plus our pending increments doesn't match our current value,
        // it means the server has updated (likely from another client).
        if (serverLikes + this.pendingCount !== this._currentLikes) {
            this._currentLikes = serverLikes + this.pendingCount;
            this.likesSubject.next(this._currentLikes);
        }
      } else {
        // Handle case where doc doesn't exist yet
        if (this._currentLikes === 0 && this.pendingCount === 0) {
          this.likesSubject.next(0);
        }
      }
    }, (error) => {
      console.error("Firestore subscription error:", error);
    });
  }

  private async syncToFirestore() {
    // Wait for initialization to complete to have docRef
    await this.initPromise;

    if (this.pendingCount <= 0) {
      this.syncingSubject.next(false);
      return;
    }

    if (!this.docRef) return;

    const countToSync = this.pendingCount;
    this.pendingCount = 0; // Reset pending count before the async call to avoid double counting
    this.syncingSubject.next(true);

    try {
      await pRetry(async () => {
        try {
          // Use updateDoc to restrict writes to pre-existing documents only
          await updateDoc(this.docRef!, {
            likes: increment(countToSync),
            lastUpdate: serverTimestamp()
          });
        } catch (error: any) {
          // If it's a permission-denied error, it's likely our rate limit rule
          // In this case we want to retry. For other errors, we abort.
          if (error.code !== "permission-denied") {
            throw new AbortError(error);
          }
          throw error;
        }
      }, {
        retries: 5,
        minTimeout: 500, // Matches our 500ms rate limit
        factor: 1.5
      });
    } catch (error) {
      console.error("Failed to sync likes to Firestore after retries:", error);
      // If sync fails completely, add back the pending count to be retried
      this.pendingCount += countToSync;
    } finally {
      // If more increments happened during the sync, or the sync failed, 
      // pendingCount will be > 0. We keep syncing true and ensure another sync is scheduled.
      if (this.pendingCount > 0) {
        this.syncingSubject.next(true);
        this.debouncedSync();
      } else {
        this.syncingSubject.next(false);
      }
    }
  }

  private setupExitListeners() {
    const handleExit = () => {
      if (this.pendingCount > 0) {
        this.syncToFirestore();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleExit);
      window.addEventListener("pagehide", handleExit);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          handleExit();
        }
      });
    }
  }
}
