import { Firestore } from "firebase/firestore";
import { Observable } from "rxjs";

//#region src/index.d.ts
interface LikeCounterConfig {
  collection?: string;
  doc: string;
  updateDebounceTime?: number;
  firebaseConfig?: any;
  firestore?: Firestore;
}
declare class LikeCounter {
  private db?;
  private docRef?;
  private pendingCount;
  private debouncedSync;
  private likesSubject;
  private syncingSubject;
  private _currentLikes;
  private unsubscribe?;
  private initPromise;
  constructor(config: LikeCounterConfig);
  private init;
  /**
   * Returns a promise that resolves when the counter is fully initialized.
   */
  ready(): Promise<void>;
  /**
   * Returns an Observable stream of the current like count.
   * This includes real-time updates from Firestore AND immediate local increments.
   * It will not emit until the first value is received from Firestore or a local increment occurs.
   */
  get likes$(): Observable<number>;
  /**
   * Returns an Observable stream of the synchronization status.
   * Emits true when a sync is pending (debouncing) or in progress (including retries), and false when idle.
   */
  get syncing$(): Observable<boolean>;
  /**
   * Returns the current value of the likes.
   */
  get currentLikes(): number;
  /**
   * Increments the like count.
   * Updates the local stream immediately (optimistic UI) and debounces the Firestore sync.
   */
  incrementLike(count?: number): void;
  /**
   * Cleans up subscriptions and listeners.
   */
  destroy(): void;
  private setupFirestoreSubscription;
  private syncToFirestore;
  private setupExitListeners;
}
//#endregion
export { LikeCounter };