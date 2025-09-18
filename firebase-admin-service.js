// Firebase Admin Service for User Management and Authentication

class FirebaseAdminService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.firestore = null;
        this.currentUser = null;
        this.initialized = false;
        this.initializationPromise = null;

        // Wait for Firebase modules to load
        if (window.Firebase) {
            this.init();
        } else {
            window.addEventListener('firebaseLoaded', () => {
                this.init();
            });
        }
    }

    init() {
        try {
            if (this.initialized) return;

            console.log('Initializing Firebase Admin Service...');

            
            const firebaseConfig = {
                // Firebase configuration - Replace with your actual config

            };

            this.app = window.Firebase.initializeApp(firebaseConfig);
            this.auth = window.Firebase.getAuth(this.app);
            this.firestore = window.Firebase.getFirestore(this.app);

            this.initialized = true;
            console.log('Firebase initialized successfully');

        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.initialized = false;
            throw error;
        }
    }

    // Authentication Methods
    async loginUser(email, password) {
        try {
            if (!this.initialized) {
                throw new Error('Firebase not initialized');
            }

            const userCredential = await window.Firebase.signInWithEmailAndPassword(this.auth, email, password);
            this.currentUser = userCredential.user;

            // Check if user has admin role
            const userRole = await this.getUserRole(userCredential.user.uid);

            return {
                user: userCredential.user,
                role: userRole
            };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async registerUser(name, email, password) {
        try {
            if (!this.initialized) {
                throw new Error('Firebase not initialized');
            }

            const userCredential = await window.Firebase.createUserWithEmailAndPassword(this.auth, email, password);

            // Update user profile with name
            await window.Firebase.updateProfile(userCredential.user, {
                displayName: name
            });

            // Create user profile in Firestore
            await window.Firebase.setDoc(
                window.Firebase.doc(this.firestore, 'users', userCredential.user.uid),
                {
                    name: name,
                    email: email,
                    role: 'user', // Default role
                    createdAt: new Date().toISOString(),
                    lastActive: new Date().toISOString(),
                    isActive: true
                }
            );

            this.currentUser = userCredential.user;

            return {
                user: userCredential.user,
                role: 'user'
            };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logoutUser() {
        try {
            if (!this.initialized) {
                throw new Error('Firebase not initialized');
            }

            await window.Firebase.signOut(this.auth);
            this.currentUser = null;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    async getUserRole(uid) {
        try {
            if (!this.initialized) {
                console.warn('Firebase not initialized, returning default role');
                return 'user';
            }

            const userDoc = await window.Firebase.getDoc(
                window.Firebase.doc(this.firestore, 'users', uid)
            );

            if (userDoc.exists()) {
                const userData = userDoc.data();
                return userData.role || 'user';
            }

            return 'user';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'user';
        }
    }

    async updateUserRole(uid, newRole) {
        try {
            if (!this.initialized) {
                throw new Error('Firebase not initialized');
            }

            await window.Firebase.updateDoc(
                window.Firebase.doc(this.firestore, 'users', uid),
                {
                    role: newRole,
                    updatedAt: new Date().toISOString()
                }
            );

            console.log(`User ${uid} role updated to ${newRole}`);
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }

    onAuthStateChanged(callback) {
        if (!this.initialized) {
            console.warn('Firebase not initialized for auth state listener');
            return () => {}; // Return empty unsubscribe function
        }

        return window.Firebase.onAuthStateChanged(this.auth, callback);
    }

    // Data Fetching Methods
    async getAllPotholes() {
        try {
            if (!this.initialized) {
                throw new Error('Firebase not initialized');
            }

            const potholesRef = window.Firebase.collection(this.firestore, 'potholes');
            const q = window.Firebase.query(
                potholesRef, 
                window.Firebase.orderBy('timestamp', 'desc')
            );
            const querySnapshot = await window.Firebase.getDocs(q);

            const potholes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                potholes.push({
                    id: doc.id,
                    ...data,
                    timestamp: this.normalizeTimestamp(data.timestamp)
                });
            });

            return potholes;
        } catch (error) {
            console.error('Error fetching potholes:', error);
            // If we can't fetch, return empty array to prevent crashes
            return [];
        }
    }

    getPotholesRealtime(callback) {
        try {
            if (!this.initialized) {
                console.warn('Firebase not initialized for realtime listener');
                callback([]);
                return () => {}; // Return empty unsubscribe function
            }

            const potholesRef = window.Firebase.collection(this.firestore, 'potholes');
            const q = window.Firebase.query(
                potholesRef, 
                window.Firebase.orderBy('timestamp', 'desc')
            );

            return window.Firebase.onSnapshot(q, 
                (querySnapshot) => {
                    const potholes = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        potholes.push({
                            id: doc.id,
                            ...data,
                            timestamp: this.normalizeTimestamp(data.timestamp)
                        });
                    });
                    callback(potholes);
                }, 
                (error) => {
                    console.error('Realtime listener error:', error);
                    callback([]); // Return empty array on error
                }
            );
        } catch (error) {
            console.error('Error setting up realtime listener:', error);
            callback([]);
            return () => {}; // Return empty unsubscribe function
        }
    }

    async getAllUsers() {
        try {
            if (!this.initialized) {
                throw new Error('Firebase not initialized');
            }

            const usersRef = window.Firebase.collection(this.firestore, 'users');
            const q = window.Firebase.query(
                usersRef, 
                window.Firebase.orderBy('createdAt', 'desc')
            );
            const querySnapshot = await window.Firebase.getDocs(q);

            const users = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    id: doc.id,
                    ...data
                });
            });

            return users;
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    getUsersRealtime(callback) {
        try {
            if (!this.initialized) {
                console.warn('Firebase not initialized for users realtime listener');
                callback([]);
                return () => {}; // Return empty unsubscribe function
            }

            const usersRef = window.Firebase.collection(this.firestore, 'users');
            const q = window.Firebase.query(
                usersRef, 
                window.Firebase.orderBy('createdAt', 'desc')
            );

            return window.Firebase.onSnapshot(q, 
                (querySnapshot) => {
                    const users = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        users.push({
                            uid: doc.id,
                            id: doc.id,
                            ...data
                        });
                    });
                    callback(users);
                },
                (error) => {
                    console.error('Users realtime listener error:', error);
                    callback([]);
                }
            );
        } catch (error) {
            console.error('Error setting up users realtime listener:', error);
            callback([]);
            return () => {};
        }
    }

    async deletePothole(potholeId) {
        try {
            if (!this.initialized) {
                throw new Error('Firebase not initialized');
            }

            await window.Firebase.deleteDoc(
                window.Firebase.doc(this.firestore, 'potholes', potholeId)
            );
        } catch (error) {
            console.error('Error deleting pothole:', error);
            throw error;
        }
    }

    async getStatistics() {
        try {
            const [potholes, users] = await Promise.all([
                this.getAllPotholes(),
                this.getAllUsers()
            ]);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayDetections = potholes.filter(p => {
                const potholeDate = new Date(p.timestamp);
                return potholeDate >= today;
            });

            const avgConfidence = potholes.length > 0
                ? Math.round(potholes.reduce((sum, p) => sum + (p.confidence || 0), 0) / potholes.length)
                : 0;

            const adminCount = users.filter(u => u.role === 'admin').length;
            const userCount = users.filter(u => u.role === 'user').length;

            return {
                totalPotholes: potholes.length,
                activeUsers: users.length,
                todayDetections: todayDetections.length,
                avgConfidence: avgConfidence,
                totalRegisteredUsers: users.length,
                totalAdmins: adminCount,
                totalRegularUsers: userCount
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                totalPotholes: 0,
                activeUsers: 0,
                todayDetections: 0,
                avgConfidence: 0,
                totalRegisteredUsers: 0,
                totalAdmins: 0,
                totalRegularUsers: 0
            };
        }
    }

    // Update user's last active timestamp
    async updateLastActive(uid) {
        try {
            if (!this.initialized) {
                console.warn('Firebase not initialized, skipping last active update');
                return;
            }

            await window.Firebase.updateDoc(
                window.Firebase.doc(this.firestore, 'users', uid),
                {
                    lastActive: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('Error updating last active:', error);
            // Don't throw error for non-critical operation
        }
    }

    // Utility Methods
    normalizeTimestamp(timestamp) {
        if (!timestamp) {
            return new Date().toISOString();
        }

        if (typeof timestamp === 'number') {
            return new Date(timestamp).toISOString();
        }

        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            // Firestore Timestamp object
            return timestamp.toDate().toISOString();
        }

        if (typeof timestamp === 'string') {
            return timestamp;
        }

        return new Date().toISOString();
    }

    // Health check method
    isReady() {
        return this.initialized && this.auth && this.firestore;
    }

    getConnectionStatus() {
        return {
            initialized: this.initialized,
            hasAuth: !!this.auth,
            hasFirestore: !!this.firestore,
            currentUser: !!this.currentUser
        };
    }
}

// Create global instance
console.log('Creating Firebase Admin Service instance...');
window.firebaseAdminService = new FirebaseAdminService();