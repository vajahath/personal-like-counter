import { getApp, getApps, initializeApp } from "firebase/app";
import { doc, getFirestore, increment, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import debounce from "debounce";
import { BehaviorSubject, ReplaySubject } from "rxjs";
import pRetry, { AbortError } from "p-retry";

//#region src/index.ts
var LikeCounter = class {
	db;
	docRef;
	pendingCount = 0;
	debouncedSync;
	likesSubject = new ReplaySubject(1);
	syncingSubject = new BehaviorSubject(false);
	_currentLikes = 0;
	unsubscribe;
	initPromise;
	constructor(config) {
		const { updateDebounceTime = 500 } = config;
		this.debouncedSync = debounce(this.syncToFirestore.bind(this), updateDebounceTime);
		this.setupExitListeners();
		this.initPromise = this.init(config);
	}
	async init(config) {
		const { collection = "general", doc: docId, firebaseConfig, firestore } = config;
		if (firestore) this.db = firestore;
		else {
			let finalConfig = firebaseConfig;
			if (!finalConfig) {
				const { DEFAULT_FIREBASE_CONFIG } = await import("./default-config-DO-VAu9L.mjs");
				finalConfig = DEFAULT_FIREBASE_CONFIG;
			}
			this.db = getFirestore(getApps().length === 0 ? initializeApp(finalConfig) : getApp());
		}
		this.docRef = doc(this.db, collection, docId);
		this.setupFirestoreSubscription();
	}
	/**
	* Returns an Observable stream of the current like count.
	* This includes real-time updates from Firestore AND immediate local increments.
	* It will not emit until the first value is received from Firestore or a local increment occurs.
	*/
	get likes$() {
		return this.likesSubject.asObservable();
	}
	/**
	* Returns an Observable stream of the synchronization status.
	* Emits true when a sync is pending (debouncing) or in progress (including retries), and false when idle.
	*/
	get syncing$() {
		return this.syncingSubject.asObservable();
	}
	/**
	* Returns the current value of the likes.
	*/
	get currentLikes() {
		return this._currentLikes;
	}
	/**
	* Increments the like count. 
	* Updates the local stream immediately (optimistic UI) and debounces the Firestore sync.
	*/
	incrementLike(count = 1) {
		this.pendingCount += count;
		this.syncingSubject.next(true);
		this._currentLikes += count;
		this.likesSubject.next(this._currentLikes);
		this.debouncedSync();
	}
	/**
	* Cleans up subscriptions and listeners.
	*/
	destroy() {
		if (this.unsubscribe) this.unsubscribe();
	}
	async setupFirestoreSubscription() {
		await this.initPromise;
		if (!this.docRef) return;
		this.unsubscribe = onSnapshot(this.docRef, (docSnap) => {
			if (docSnap.exists()) {
				const serverLikes = docSnap.data().likes || 0;
				if (serverLikes + this.pendingCount !== this._currentLikes) {
					this._currentLikes = serverLikes + this.pendingCount;
					this.likesSubject.next(this._currentLikes);
				}
			} else if (this._currentLikes === 0 && this.pendingCount === 0) this.likesSubject.next(0);
		}, (error) => {
			console.error("Firestore subscription error:", error);
		});
	}
	async syncToFirestore() {
		await this.initPromise;
		if (this.pendingCount <= 0) {
			this.syncingSubject.next(false);
			return;
		}
		if (!this.docRef) return;
		const countToSync = this.pendingCount;
		this.pendingCount = 0;
		this.syncingSubject.next(true);
		try {
			await pRetry(async () => {
				try {
					await updateDoc(this.docRef, {
						likes: increment(countToSync),
						lastUpdate: serverTimestamp()
					});
				} catch (error) {
					if (error.code !== "permission-denied") throw new AbortError(error);
					throw error;
				}
			}, {
				retries: 5,
				minTimeout: 500,
				factor: 1.5
			});
		} catch (error) {
			console.error("Failed to sync likes to Firestore after retries:", error);
			this.pendingCount += countToSync;
		} finally {
			if (this.pendingCount > 0) {
				this.syncingSubject.next(true);
				this.debouncedSync();
			} else this.syncingSubject.next(false);
		}
	}
	setupExitListeners() {
		const handleExit = () => {
			if (this.pendingCount > 0) this.syncToFirestore();
		};
		if (typeof window !== "undefined") {
			window.addEventListener("beforeunload", handleExit);
			window.addEventListener("pagehide", handleExit);
		}
		if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") handleExit();
		});
	}
};

//#endregion
export { LikeCounter };