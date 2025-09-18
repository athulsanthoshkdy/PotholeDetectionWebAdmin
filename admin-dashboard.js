// Admin Dashboard JavaScript with User Management and Error Handling
class AdminDashboard {
    constructor() {
        this.currentTab = 'overview';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredData = [];
        this.potholeData = [];
        this.users = [];
        this.map = null;
        this.markers = [];
        this.charts = {};
        this.realtimeListener = null;
        this.usersRealtimeListener = null;
        this.currentUser = null;
        this.userRole = null;

        // Wait for Firebase to initialize
        this.initializationAttempts = 0;
        this.maxInitAttempts = 10;
        this.waitForFirebaseAndInit();
    }

    async waitForFirebaseAndInit() {
        if (window.firebaseAdminService && window.firebaseAdminService.auth) {
            console.log('Firebase service available, initializing...');
            await this.init();
        } else if (this.initializationAttempts < this.maxInitAttempts) {
            this.initializationAttempts++;
            console.log(`Waiting for Firebase... attempt ${this.initializationAttempts}`);
            setTimeout(() => this.waitForFirebaseAndInit(), 1000);
        } else {
            console.error('Firebase failed to initialize after maximum attempts');
            alert('Failed to connect to Firebase. Please refresh the page and try again.');
        }
    }

    async init() {
        try {
            this.setupEventListeners();
            this.setupAuthListener();
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    setupAuthListener() {
        try {
            window.firebaseAdminService.onAuthStateChanged(async (user) => {
                try {
                    if (user) {
                        this.currentUser = user;

                        // Update last active
                        await window.firebaseAdminService.updateLastActive(user.uid);

                        // Get user role
                        this.userRole = await window.firebaseAdminService.getUserRole(user.uid);

                        if (this.userRole === 'admin') {
                            // User is admin - show dashboard
                            this.showDashboard();
                        } else {
                            // User is not admin - show access denied
                            this.showAccessDenied();
                        }
                    } else {
                        // User is signed out
                        this.showLoginScreen();
                        this.clearDashboardData();
                    }
                } catch (error) {
                    console.error('Error in auth state change:', error);
                    this.showLoginScreen();
                }
            });
        } catch (error) {
            console.error('Error setting up auth listener:', error);
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        this.safeToggleElement('loginScreen', true);
        this.safeToggleElement('dashboard', false);
        this.safeToggleElement('accessDenied', false);
    }

    showDashboard() {
        this.safeToggleElement('loginScreen', false);
        this.safeToggleElement('dashboard', true);
        this.safeToggleElement('accessDenied', false);

        // Update header with user info
        const displayName = this.currentUser.displayName || this.currentUser.email;
        this.safeSetTextContent('adminNameDisplay', displayName);

        this.loadDashboard();
    }

    showAccessDenied() {
        this.safeToggleElement('loginScreen', false);
        this.safeToggleElement('dashboard', false);
        this.safeToggleElement('accessDenied', true);

        // Update access denied screen with user info
        this.safeSetTextContent('userEmailDisplay', this.currentUser.email);
    }

    setupEventListeners() {
        try {
            // Auth form switching
            this.safeAddEventListener('showRegister', 'click', (e) => {
                e.preventDefault();
                this.switchToRegister();
            });

            this.safeAddEventListener('showLogin', 'click', (e) => {
                e.preventDefault();
                this.switchToLogin();
            });

            // Login form
            this.safeAddEventListener('loginForm', 'submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });

            // Registration form
            this.safeAddEventListener('registerForm', 'submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });

            // Logout buttons
            this.safeAddEventListener('logoutBtn', 'click', () => {
                this.handleLogout();
            });

            this.safeAddEventListener('logoutDenied', 'click', () => {
                this.handleLogout();
            });

            // Navigation tabs
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = e.target.dataset.tab;
                    if (tab) {
                        this.switchTab(tab);
                    }
                });
            });

            // Export buttons
            this.safeAddEventListener('exportCSV', 'click', () => {
                this.exportData('csv');
            });

            this.safeAddEventListener('exportJSON', 'click', () => {
                this.exportData('json');
            });

            // Search and filters
            this.safeAddEventListener('searchInput', 'input', (e) => {
                this.filterData(e.target.value);
            });

            this.safeAddEventListener('sortSelect', 'change', (e) => {
                this.sortData(e.target.value);
            });

            // User management search
            this.safeAddEventListener('userSearchInput', 'input', (e) => {
                this.filterUsers(e.target.value);
            });

            this.safeAddEventListener('roleFilter', 'change', (e) => {
                this.filterUsersByRole(e.target.value);
            });

            // Map filters
            this.safeAddEventListener('confidenceFilter', 'input', (e) => {
                this.safeSetTextContent('confidenceValue', e.target.value + '%');
                this.updateMapMarkers();
            });

            this.safeAddEventListener('mapDateFilter', 'change', () => {
                this.updateMapMarkers();
            });

            this.safeAddEventListener('resetMapFilters', 'click', () => {
                this.safeSetValue('confidenceFilter', 0);
                this.safeSetTextContent('confidenceValue', '0%');
                this.safeSetValue('mapDateFilter', '');
                this.updateMapMarkers();
            });

            // Pagination
            this.safeAddEventListener('prevPage', 'click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.updateTable();
                }
            });

            this.safeAddEventListener('nextPage', 'click', () => {
                const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.updateTable();
                }
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    // Utility methods for safe DOM manipulation
    safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with id '${elementId}' not found for event listener`);
        }
    }

    safeToggleElement(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            if (show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        } else {
            console.warn(`Element with id '${elementId}' not found for toggle`);
        }
    }

    safeSetTextContent(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        } else {
            console.warn(`Element with id '${elementId}' not found for text content`);
        }
    }

    safeSetValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        } else {
            console.warn(`Element with id '${elementId}' not found for value`);
        }
    }

    safeGetValue(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            return element.value;
        } else {
            console.warn(`Element with id '${elementId}' not found for getting value`);
            return '';
        }
    }

    switchToRegister() {
        this.safeToggleElement('loginForm', false);
        this.safeToggleElement('registerForm', true);
        this.safeSetTextContent('authTitle', 'Create Account');
    }

    switchToLogin() {
        this.safeToggleElement('registerForm', false);
        this.safeToggleElement('loginForm', true);
        this.safeSetTextContent('authTitle', 'Admin Dashboard');
    }

    async handleLogin() {
        const email = this.safeGetValue('loginEmail');
        const password = this.safeGetValue('loginPassword');

        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }

        try {
            this.showLoading();
            await window.firebaseAdminService.loginUser(email, password);
            // Auth state change will handle UI updates
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed: ';

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage += 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Too many failed attempts. Please try again later';
                    break;
                default:
                    errorMessage += error.message;
            }

            alert(errorMessage);
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister() {
        const name = this.safeGetValue('registerName');
        const email = this.safeGetValue('registerEmail');
        const password = this.safeGetValue('registerPassword');
        const confirmPassword = this.safeGetValue('confirmPassword');

        if (!name || !email || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        try {
            this.showLoading();
            await window.firebaseAdminService.registerUser(name, email, password);

            // Show success message
            alert('Account created successfully! You have been registered as a regular user. Contact an administrator to get admin access.');

            // Auth state change will handle UI updates
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Registration failed: ';

            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'An account with this email already exists';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Password is too weak';
                    break;
                default:
                    errorMessage += error.message;
            }

            alert(errorMessage);
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        try {
            await window.firebaseAdminService.logoutUser();
            this.clearDashboardData();
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out: ' + error.message);
        }
    }

    async loadDashboard() {
        try {
            this.showLoading();

            await this.loadPotholeData();
            await this.loadUserData();

            this.updateStats();
            this.loadCharts();
            this.loadRecentDetections();
            this.updateTable();
            this.updateUsersTable();

            this.setupRealtimeListeners();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            alert('Error loading dashboard data: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async loadPotholeData() {
        try {
            this.potholeData = await window.firebaseAdminService.getAllPotholes();
            this.filteredData = [...this.potholeData];
            console.log('Loaded potholes:', this.potholeData.length);
        } catch (error) {
            console.error('Error loading pothole data:', error);
            this.potholeData = [];
            this.filteredData = [];
        }
    }

    async loadUserData() {
        try {
            this.users = await window.firebaseAdminService.getAllUsers();
            console.log('Loaded users:', this.users.length);
        } catch (error) {
            console.error('Error loading user data:', error);
            this.users = [];
        }
    }

    setupRealtimeListeners() {
        try {
            // Potholes realtime listener
            if (this.realtimeListener) {
                this.realtimeListener();
            }

            this.realtimeListener = window.firebaseAdminService.getPotholesRealtime((potholes) => {
                console.log('Real-time pothole update received:', potholes.length);
                this.potholeData = potholes;
                this.filteredData = [...this.potholeData];

                this.updateStats();
                this.loadRecentDetections();
                this.updateTable();

                if (this.currentTab === 'overview') {
                    this.updateCharts();
                }

                if (this.currentTab === 'map' && this.map) {
                    this.updateMapMarkers();
                }
            });

            // Users realtime listener
            if (this.usersRealtimeListener) {
                this.usersRealtimeListener();
            }

            this.usersRealtimeListener = window.firebaseAdminService.getUsersRealtime((users) => {
                console.log('Real-time user update received:', users.length);
                this.users = users;

                this.updateStats();
                this.updateUsersTable();
            });
        } catch (error) {
            console.error('Error setting up realtime listeners:', error);
        }
    }

    clearDashboardData() {
        this.potholeData = [];
        this.filteredData = [];
        this.users = [];
        this.currentUser = null;
        this.userRole = null;

        if (this.realtimeListener) {
            this.realtimeListener();
            this.realtimeListener = null;
        }

        if (this.usersRealtimeListener) {
            this.usersRealtimeListener();
            this.usersRealtimeListener = null;
        }

        // Clear form fields
        this.safeSetValue('loginEmail', '');
        this.safeSetValue('loginPassword', '');
        this.safeSetValue('registerName', '');
        this.safeSetValue('registerEmail', '');
        this.safeSetValue('registerPassword', '');
        this.safeSetValue('confirmPassword', '');
    }

    switchTab(tabName) {
        try {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const activeTab = document.getElementById(tabName);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            this.currentTab = tabName;

            if (tabName === 'map') {
                setTimeout(() => this.initMap(), 100);
            } else if (tabName === 'analytics') {
                setTimeout(() => this.loadAnalyticsCharts(), 100);
            }
        } catch (error) {
            console.error('Error switching tab:', error);
        }
    }

    async updateStats() {
        try {
            const stats = await window.firebaseAdminService.getStatistics();

            this.safeSetTextContent('totalPotholes', stats.totalPotholes);
            this.safeSetTextContent('activeUsers', stats.activeUsers);
            this.safeSetTextContent('todayDetections', stats.todayDetections);
            this.safeSetTextContent('avgConfidence', stats.avgConfidence + '%');

            // User management stats
            this.safeSetTextContent('totalRegisteredUsers', stats.totalRegisteredUsers);
            this.safeSetTextContent('totalAdmins', stats.totalAdmins);
            this.safeSetTextContent('totalRegularUsers', stats.totalRegularUsers);
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    // User Management Methods
    updateUsersTable() {
        try {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) {
                console.warn('Users table body not found');
                return;
            }

            if (this.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #757575;">No users found.</td></tr>';
                return;
            }

            tbody.innerHTML = this.users.map(user => {
                const joinDate = new Date(user.createdAt).toLocaleDateString();
                const lastActive = user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never';
                const roleClass = user.role === 'admin' ? 'status-admin' : 'status-user';
                const roleIcon = user.role === 'admin' ? 'fas fa-crown' : 'fas fa-user';

                return `
                    <tr>
                        <td>${user.name || 'N/A'}</td>
                        <td>${user.email}</td>
                        <td>
                            <span class="role-badge ${roleClass}">
                                <i class="${roleIcon}"></i>
                                ${user.role === 'admin' ? 'Administrator' : 'Regular User'}
                            </span>
                        </td>
                        <td>${joinDate}</td>
                        <td>${lastActive}</td>
                        <td>
                            ${user.uid !== this.currentUser.uid ? `
                                <button class="action-btn ${user.role === 'admin' ? 'btn-demote' : 'btn-promote'}" 
                                        onclick="app.toggleUserRole('${user.uid}', '${user.role}')">
                                    ${user.role === 'admin' ? 'Demote' : 'Promote'}
                                </button>
                            ` : '<span class="current-user">You</span>'}
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error updating users table:', error);
        }
    }

    async toggleUserRole(uid, currentRole) {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        const action = newRole === 'admin' ? 'promote' : 'demote';

        if (confirm(`Are you sure you want to ${action} this user to ${newRole}?`)) {
            try {
                this.showLoading();
                await window.firebaseAdminService.updateUserRole(uid, newRole);
                alert(`User role updated successfully to ${newRole}`);
            } catch (error) {
                console.error('Error updating user role:', error);
                alert('Error updating user role: ' + error.message);
            } finally {
                this.hideLoading();
            }
        }
    }

    filterUsers(searchTerm) {
        const filteredUsers = this.users.filter(user => {
            const searchText = `${user.name || ''} ${user.email} ${user.role}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
        });

        this.displayFilteredUsers(filteredUsers);
    }

    filterUsersByRole(roleFilter) {
        let filteredUsers = this.users;

        if (roleFilter !== 'all') {
            filteredUsers = this.users.filter(user => user.role === roleFilter);
        }

        this.displayFilteredUsers(filteredUsers);
    }

    displayFilteredUsers(users) {
        try {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #757575;">No users match the filter criteria.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(user => {
                const joinDate = new Date(user.createdAt).toLocaleDateString();
                const lastActive = user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never';
                const roleClass = user.role === 'admin' ? 'status-admin' : 'status-user';
                const roleIcon = user.role === 'admin' ? 'fas fa-crown' : 'fas fa-user';

                return `
                    <tr>
                        <td>${user.name || 'N/A'}</td>
                        <td>${user.email}</td>
                        <td>
                            <span class="role-badge ${roleClass}">
                                <i class="${roleIcon}"></i>
                                ${user.role === 'admin' ? 'Administrator' : 'Regular User'}
                            </span>
                        </td>
                        <td>${joinDate}</td>
                        <td>${lastActive}</td>
                        <td>
                            ${user.uid !== this.currentUser.uid ? `
                                <button class="action-btn ${user.role === 'admin' ? 'btn-demote' : 'btn-promote'}" 
                                        onclick="app.toggleUserRole('${user.uid}', '${user.role}')">
                                    ${user.role === 'admin' ? 'Demote' : 'Promote'}
                                </button>
                            ` : '<span class="current-user">You</span>'}
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error displaying filtered users:', error);
        }
    }

    // Chart and visualization methods
    loadCharts() {
        try {
            this.loadDailyChart();
            this.loadConfidenceChart();
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    }

    updateCharts() {
        try {
            if (this.charts.daily) {
                this.charts.daily.destroy();
            }
            if (this.charts.confidence) {
                this.charts.confidence.destroy();
            }
            this.loadCharts();
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    loadDailyChart() {
        try {
            const canvas = document.getElementById('dailyChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            const days = [];
            const detections = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));

                const dayDetections = this.potholeData.filter(p => {
                    const potholeDate = new Date(p.timestamp);
                    return potholeDate.toISOString().split('T')[0] === dateStr;
                }).length;

                detections.push(dayDetections);
            }

            this.charts.daily = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Detections',
                        data: detections,
                        borderColor: '#1976D2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading daily chart:', error);
        }
    }

    loadConfidenceChart() {
        try {
            const canvas = document.getElementById('confidenceChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            const high = this.potholeData.filter(p => p.confidence >= 80).length;
            const medium = this.potholeData.filter(p => p.confidence >= 60 && p.confidence < 80).length;
            const low = this.potholeData.filter(p => p.confidence < 60).length;

            this.charts.confidence = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['High (80%+)', 'Medium (60-79%)', 'Low (<60%)'],
                    datasets: [{
                        data: [high, medium, low],
                        backgroundColor: ['#4CAF50', '#FF9800', '#F44336']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        } catch (error) {
            console.error('Error loading confidence chart:', error);
        }
    }

    loadAnalyticsCharts() {
        try {
            this.loadTrendChart();
            this.loadHotspotChart();
            this.loadUserChart();
            this.loadSpeedChart();
        } catch (error) {
            console.error('Error loading analytics charts:', error);
        }
    }

    loadTrendChart() {
        try {
            const canvas = document.getElementById('trendChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            const months = [];
            const trendData = [];

            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                months.push(date.toLocaleDateString('en-US', { month: 'short' }));

                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                const monthDetections = this.potholeData.filter(p => {
                    const potholeDate = new Date(p.timestamp);
                    return potholeDate >= monthStart && potholeDate <= monthEnd;
                }).length;

                trendData.push(monthDetections);
            }

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Monthly Detections',
                        data: trendData,
                        backgroundColor: '#1976D2',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        } catch (error) {
            console.error('Error loading trend chart:', error);
        }
    }

    loadHotspotChart() {
        try {
            const canvas = document.getElementById('hotspotChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            const locationGroups = {};

            this.potholeData.forEach(pothole => {
                const latGroup = Math.round(pothole.latitude * 100) / 100;
                const lngGroup = Math.round(pothole.longitude * 100) / 100;
                const locationKey = `${latGroup},${lngGroup}`;

                if (!locationGroups[locationKey]) {
                    locationGroups[locationKey] = { count: 0, lat: latGroup, lng: lngGroup };
                }
                locationGroups[locationKey].count++;
            });

            const sortedLocations = Object.values(locationGroups)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            const labels = sortedLocations.map((loc, index) => `Area ${index + 1}`);
            const data = sortedLocations.map(loc => loc.count);

            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#1976D2', '#FF5722', '#4CAF50', '#FF9800', '#9C27B0']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        } catch (error) {
            console.error('Error loading hotspot chart:', error);
        }
    }

    loadUserChart() {
        try {
            const canvas = document.getElementById('userChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            const userCounts = {};

            this.potholeData.forEach(pothole => {
                const userId = pothole.user_id || 'Unknown';
                if (!userCounts[userId]) {
                    userCounts[userId] = 0;
                }
                userCounts[userId]++;
            });

            const sortedUsers = Object.entries(userCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);

            const userNames = sortedUsers.map(([userId]) => {
                const user = this.users.find(u => u.id === userId || u.uid === userId);
                return user ? (user.name || user.email || userId) : `User ${userId.slice(0, 6)}`;
            });

            const userDetections = sortedUsers.map(([,count]) => count);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: userNames,
                    datasets: [{
                        label: 'Detections by User',
                        data: userDetections,
                        backgroundColor: '#FF5722'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y'
                }
            });
        } catch (error) {
            console.error('Error loading user chart:', error);
        }
    }

    loadSpeedChart() {
        try {
            const canvas = document.getElementById('speedChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            const speedRanges = ['0-20 km/h', '21-40 km/h', '41-60 km/h', '60+ km/h'];
            const speedData = [
                this.potholeData.filter(p => p.speed <= 20).length,
                this.potholeData.filter(p => p.speed > 20 && p.speed <= 40).length,
                this.potholeData.filter(p => p.speed > 40 && p.speed <= 60).length,
                this.potholeData.filter(p => p.speed > 60).length
            ];

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: speedRanges,
                    datasets: [{
                        label: 'Detections by Speed',
                        data: speedData,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        } catch (error) {
            console.error('Error loading speed chart:', error);
        }
    }

    loadRecentDetections() {
        try {
            const container = document.getElementById('recentDetections');
            if (!container) return;

            if (this.potholeData.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #757575; padding: 2rem;">No pothole detections found. Start detecting with the mobile app!</p>';
                return;
            }

            const recent = this.potholeData
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 5);

            container.innerHTML = recent.map(pothole => {
                const user = this.users.find(u => u.id === pothole.user_id || u.uid === pothole.user_id);
                const date = new Date(pothole.timestamp);
                const confidenceClass = this.getConfidenceClass(pothole.confidence);

                return `
                    <div class="detection-item">
                        <div class="detection-info">
                            <div class="detection-id">${pothole.id}</div>
                            <div class="detection-details">
                                ${user ? (user.name || user.email) : 'Unknown User'} • 
                                ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                            </div>
                        </div>
                        <div class="confidence-badge ${confidenceClass}">
                            ${pothole.confidence}%
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading recent detections:', error);
        }
    }

    // Map functionality
    initMap() {
        try {
            if (this.map) return;

            const mapContainer = document.getElementById('mapContainer');
            if (!mapContainer) return;

            if (typeof google === 'undefined') {
                mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #757575;">Map requires Google Maps API key. Please configure in HTML file.</div>';
                return;
            }

            let center = { lat: 40.7580, lng: -73.9855 };
            if (this.potholeData.length > 0) {
                center = {
                    lat: this.potholeData[0].latitude,
                    lng: this.potholeData[0].longitude
                };
            }

            this.map = new google.maps.Map(mapContainer, {
                zoom: 12,
                center: center
            });

            this.updateMapMarkers();
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    updateMapMarkers() {
        try {
            if (!this.map) return;

            this.markers.forEach(marker => marker.setMap(null));
            this.markers = [];

            const minConfidence = parseInt(this.safeGetValue('confidenceFilter') || '0');
            const dateFilter = this.safeGetValue('mapDateFilter');

            let filteredPotholes = this.potholeData;

            if (minConfidence > 0) {
                filteredPotholes = filteredPotholes.filter(p => p.confidence >= minConfidence);
            }

            if (dateFilter) {
                filteredPotholes = filteredPotholes.filter(p => {
                    const potholeDate = new Date(p.timestamp).toISOString().split('T')[0];
                    return potholeDate === dateFilter;
                });
            }

            filteredPotholes.forEach(pothole => {
                const marker = new google.maps.Marker({
                    position: { lat: pothole.latitude, lng: pothole.longitude },
                    map: this.map,
                    title: `${pothole.id} - Confidence: ${pothole.confidence}%`
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: this.createMarkerContent(pothole)
                });

                marker.addListener('click', () => {
                    infoWindow.open(this.map, marker);
                });

                this.markers.push(marker);
            });
        } catch (error) {
            console.error('Error updating map markers:', error);
        }
    }

    createMarkerContent(pothole) {
        const user = this.users.find(u => u.id === pothole.user_id || u.uid === pothole.user_id);
        const date = new Date(pothole.timestamp);

        return `
            <div style="padding: 8px; max-width: 200px;">
                <h4 style="margin: 0 0 8px 0;">${pothole.id}</h4>
                <p style="margin: 0; font-size: 12px;">
                    <strong>Confidence:</strong> ${pothole.confidence}%<br>
                    <strong>Speed:</strong> ${pothole.speed} km/h<br>
                    <strong>User:</strong> ${user ? (user.name || user.email) : 'Unknown'}<br>
                    <strong>Time:</strong> ${date.toLocaleString()}<br>
                    <strong>Coordinates:</strong> ${pothole.latitude.toFixed(4)}, ${pothole.longitude.toFixed(4)}
                </p>
            </div>
        `;
    }

    // Data management methods
    filterData(searchTerm) {
        this.filteredData = this.potholeData.filter(pothole => {
            const user = this.users.find(u => u.id === pothole.user_id || u.uid === pothole.user_id);
            const userName = user ? (user.name || user.email) : 'Unknown';
            const searchText = `${pothole.id} ${userName} ${pothole.latitude} ${pothole.longitude}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
        });

        this.currentPage = 1;
        this.updateTable();
    }

    sortData(sortBy) {
        this.filteredData.sort((a, b) => {
            if (sortBy === 'timestamp') {
                return new Date(b.timestamp) - new Date(a.timestamp);
            } else if (sortBy === 'confidence') {
                return b.confidence - a.confidence;
            } else if (sortBy === 'user_id') {
                return a.user_id.localeCompare(b.user_id);
            }
            return 0;
        });

        this.updateTable();
    }

    updateTable() {
        try {
            const tbody = document.getElementById('potholeTableBody');
            const pageInfo = document.getElementById('pageInfo');
            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');

            if (!tbody) return;

            if (this.filteredData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #757575;">No pothole data found. Start detecting with the mobile app!</td></tr>';
                if (pageInfo) pageInfo.textContent = 'Page 0 of 0';
                return;
            }

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageData = this.filteredData.slice(startIndex, endIndex);

            tbody.innerHTML = pageData.map(pothole => {
                const user = this.users.find(u => u.id === pothole.user_id || u.uid === pothole.user_id);
                const date = new Date(pothole.timestamp);
                const confidenceClass = this.getConfidenceClass(pothole.confidence);
                const userName = user ? (user.name || user.email) : 'Unknown';

                return `
                    <tr>
                        <td>${pothole.id}</td>
                        <td>${date.toLocaleString()}</td>
                        <td>
                            <a href="#" class="location-link" onclick="app.viewLocation(${pothole.latitude}, ${pothole.longitude})">
                                ${pothole.latitude.toFixed(4)}, ${pothole.longitude.toFixed(4)}
                            </a>
                        </td>
                        <td>
                            <span class="confidence-badge ${confidenceClass}">
                                ${pothole.confidence}%
                            </span>
                        </td>
                        <td>${pothole.speed} km/h</td>
                        <td>${userName}</td>
                        <td>
                            <button class="action-btn btn-view" onclick="app.viewPothole('${pothole.id}')">
                                View
                            </button>
                            <button class="action-btn btn-delete" onclick="app.deletePothole('${pothole.id}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
            if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
            if (prevBtn) prevBtn.disabled = this.currentPage === 1;
            if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
        } catch (error) {
            console.error('Error updating table:', error);
        }
    }

    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'confidence-high';
        if (confidence >= 60) return 'confidence-medium';
        return 'confidence-low';
    }

    viewLocation(lat, lng) {
        this.switchTab('map');
        setTimeout(() => {
            if (this.map) {
                this.map.setCenter({ lat, lng });
                this.map.setZoom(15);
            }
        }, 100);
    }

    viewPothole(id) {
        const pothole = this.potholeData.find(p => p.id === id);
        if (pothole) {
            const user = this.users.find(u => u.id === pothole.user_id || u.uid === pothole.user_id);
            const userName = user ? (user.name || user.email) : 'Unknown';
            const accelData = pothole.accelerometer_data || {};

            alert(`Pothole Details:\n\nID: ${pothole.id}\nConfidence: ${pothole.confidence}%\nSpeed: ${pothole.speed} km/h\nUser: ${userName}\nTime: ${new Date(pothole.timestamp).toLocaleString()}\nLocation: ${pothole.latitude.toFixed(6)}, ${pothole.longitude.toFixed(6)}\nAccelerometer: X=${accelData.x}, Y=${accelData.y}, Z=${accelData.z}`);
        }
    }

    async deletePothole(id) {
        if (confirm('Are you sure you want to delete this pothole detection?')) {
            try {
                this.showLoading();
                await window.firebaseAdminService.deletePothole(id);
                alert('Pothole deleted successfully');
            } catch (error) {
                console.error('Delete error:', error);
                alert('Error deleting pothole: ' + error.message);
            } finally {
                this.hideLoading();
            }
        }
    }

    exportData(format) {
        if (this.filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        const data = this.filteredData.map(pothole => {
            const user = this.users.find(u => u.id === pothole.user_id || u.uid === pothole.user_id);
            const accelData = pothole.accelerometer_data || {};

            return {
                id: pothole.id,
                timestamp: pothole.timestamp,
                latitude: pothole.latitude,
                longitude: pothole.longitude,
                confidence: pothole.confidence,
                speed: pothole.speed,
                user_name: user ? (user.name || 'Unknown') : 'Unknown',
                user_email: user ? (user.email || 'Unknown') : 'Unknown',
                user_id: pothole.user_id,
                accelerometer_x: accelData.x || 0,
                accelerometer_y: accelData.y || 0,
                accelerometer_z: accelData.z || 0
            };
        });

        if (format === 'csv') {
            this.downloadCSV(data);
        } else {
            this.downloadJSON(data);
        }
    }

    downloadCSV(data) {
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');

        this.downloadFile(csvContent, 'pothole_data.csv', 'text/csv');
    }

    downloadJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, 'pothole_data.json', 'application/json');
    }

    downloadFile(content, filename, type) {
        try {
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    }

    showLoading() {
        this.safeToggleElement('loadingSpinner', true);
    }

    hideLoading() {
        this.safeToggleElement('loadingSpinner', false);
    }
}

// Initialize the dashboard when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dashboard...');
    app = new AdminDashboard();
});