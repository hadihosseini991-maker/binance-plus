// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardStats();
        this.setupDataTables();
        this.setupRealTimeUpdates();
        this.setupUserManagement();
        this.setupTransactionManagement();
    }

    setupEventListeners() {
        // Pagination
        this.setupPagination();
        
        // Search functionality
        this.setupSearch();
        
        // Filter controls
        this.setupFilters();
        
        // Bulk actions
        this.setupBulkActions();
        
        // Modal handlers
        this.setupAdminModals();
        
        // Export functionality
        this.setupExportButtons();
    }

    // Dashboard statistics
    loadDashboardStats() {
        if (!document.getElementById('admin-dashboard')) return;

        // Mock data - in production, fetch from API
        const stats = {
            totalUsers: 15420,
            activeUsers: 12350,
            newUsersToday: 245,
            totalTransactions: 89234,
            pendingTransactions: 123,
            totalDeposits: 2850000,
            totalWithdrawals: 1820000
        };

        // Update stats cards
        this.updateStatCard('totalUsers', stats.totalUsers);
        this.updateStatCard('activeUsers', stats.activeUsers);
        this.updateStatCard('newUsersToday', stats.newUsersToday);
        this.updateStatCard('totalTransactions', stats.totalTransactions);
        this.updateStatCard('pendingTransactions', stats.pendingTransactions);
        this.updateStatCard('totalDeposits', this.formatCurrency(stats.totalDeposits));
        this.updateStatCard('totalWithdrawals', this.formatCurrency(stats.totalWithdrawals));

        // Load charts
        this.loadDashboardCharts();
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    loadDashboardCharts() {
        this.loadUserGrowthChart();
        this.loadRevenueChart();
        this.loadTransactionChart();
    }

    loadUserGrowthChart() {
        const ctx = document.getElementById('userGrowthChart');
        if (!ctx) return;

        const data = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'New Users',
                data: [1200, 1900, 1500, 2500, 2200, 3000, 2800],
                borderColor: '#f0b90b',
                backgroundColor: 'rgba(240, 185, 11, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    loadRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const data = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [50000, 75000, 60000, 90000, 80000, 120000],
                backgroundColor: 'rgba(240, 185, 11, 0.8)',
                borderColor: '#f0b90b',
                borderWidth: 1
            }]
        };

        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    loadTransactionChart() {
        const ctx = document.getElementById('transactionChart');
        if (!ctx) return;

        const data = {
            labels: ['Deposits', 'Withdrawals', 'Investments', 'Transfers'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    '#26a17b',
                    '#f7931a',
                    '#627eea',
                    '#f3ba2f'
                ]
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Data tables setup
    setupDataTables() {
        // Users table
        this.setupUsersTable();
        
        // Transactions table
        this.setupTransactionsTable();
        
        // Investment plans table
        this.setupInvestmentPlansTable();
    }

    setupUsersTable() {
        const table = document.getElementById('usersTable');
        if (!table) return;

        // Add event listeners for user actions
        const actionButtons = table.querySelectorAll('.user-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const userId = e.target.dataset.userId;
                this.handleUserAction(action, userId);
            });
        });
    }

    setupTransactionsTable() {
        const table = document.getElementById('transactionsTable');
        if (!table) return;

        // Add event listeners for transaction actions
        const actionButtons = table.querySelectorAll('.transaction-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const transactionId = e.target.dataset.transactionId;
                this.handleTransactionAction(action, transactionId);
            });
        });
    }

    setupInvestmentPlansTable() {
        const table = document.getElementById('plansTable');
        if (!table) return;

        // Add event listeners for plan actions
        const actionButtons = table.querySelectorAll('.plan-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const planId = e.target.dataset.planId;
                this.handlePlanAction(action, planId);
            });
        });
    }

    // User management
    setupUserManagement() {
        // User status toggles
        const statusToggles = document.querySelectorAll('.user-status-toggle');
        statusToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const userId = e.target.dataset.userId;
                const isActive = e.target.checked;
                this.updateUserStatus(userId, isActive);
            });
        });

        // User edit modals
        const editButtons = document.querySelectorAll('.edit-user-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.openEditUserModal(userId);
            });
        });
    }

    async updateUserStatus(userId, isActive) {
        try {
            const response = await fetch(`/admin/users/${userId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isActive: isActive
                })
            });

            if (response.ok) {
                this.showNotification(`User ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
            } else {
                throw new Error('Failed to update user status');
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            this.showNotification('Failed to update user status', 'error');
            // Revert toggle
            const toggle = document.querySelector(`[data-user-id="${userId}"]`);
            if (toggle) {
                toggle.checked = !isActive;
            }
        }
    }

    async openEditUserModal(userId) {
        try {
            const response = await fetch(`/admin/users/${userId}`);
            const user = await response.json();

            // Populate modal with user data
            this.populateUserEditForm(user);
            
            // Show modal
            this.openModal('editUserModal');
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Failed to load user data', 'error');
        }
    }

    populateUserEditForm(user) {
        const form = document.getElementById('editUserForm');
        if (!form) return;

        form.querySelector('[name="userId"]').value = user._id;
        form.querySelector('[name="firstName"]').value = user.firstName;
        form.querySelector('[name="lastName"]').value = user.lastName;
        form.querySelector('[name="email"]').value = user.email;
        form.querySelector('[name="country"]').value = user.country;
        form.querySelector('[name="city"]').value = user.city;
        form.querySelector('[name="isActive"]').checked = user.isActive;
    }

    // Transaction management
    setupTransactionManagement() {
        // Transaction status updates
        const statusSelects = document.querySelectorAll('.transaction-status-select');
        statusSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const transactionId = e.target.dataset.transactionId;
                const newStatus = e.target.value;
                this.updateTransactionStatus(transactionId, newStatus);
            });
        });

        // Transaction details modals
        const detailButtons = document.querySelectorAll('.view-transaction-btn');
        detailButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const transactionId = e.target.dataset.transactionId;
                this.openTransactionDetails(transactionId);
            });
        });
    }

    async updateTransactionStatus(transactionId, newStatus) {
        try {
            const response = await fetch(`/admin/transactions/${transactionId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });

            if (response.ok) {
                this.showNotification(`Transaction status updated to ${newStatus}`, 'success');
                
                // Update row appearance
                const row = document.querySelector(`[data-transaction-id="${transactionId}"]`).closest('tr');
                if (row) {
                    row.className = `status-${newStatus}`;
                }
            } else {
                throw new Error('Failed to update transaction status');
            }
        } catch (error) {
            console.error('Error updating transaction status:', error);
            this.showNotification('Failed to update transaction status', 'error');
        }
    }

    async openTransactionDetails(transactionId) {
        try {
            const response = await fetch(`/admin/transactions/${transactionId}`);
            const transaction = await response.json();

            // Populate transaction details
            this.populateTransactionDetails(transaction);
            
            // Show modal
            this.openModal('transactionDetailsModal');
        } catch (error) {
            console.error('Error loading transaction details:', error);
            this.showNotification('Failed to load transaction details', 'error');
        }
    }

    populateTransactionDetails(transaction) {
        const modal = document.getElementById('transactionDetailsModal');
        if (!modal) return;

        modal.querySelector('.transaction-id').textContent = transaction._id;
        modal.querySelector('.transaction-type').textContent = transaction.type;
        modal.querySelector('.transaction-amount').textContent = this.formatCurrency(transaction.amount);
        modal.querySelector('.transaction-currency').textContent = transaction.currency;
        modal.querySelector('.transaction-status').textContent = transaction.status;
        modal.querySelector('.transaction-date').textContent = new Date(transaction.createdAt).toLocaleString();
        
        if (transaction.userId) {
            modal.querySelector('.transaction-user').textContent = `${transaction.userId.firstName} ${transaction.userId.lastName}`;
            modal.querySelector('.transaction-email').textContent = transaction.userId.email;
        }
    }

    // Pagination
    setupPagination() {
        const paginationLinks = document.querySelectorAll('.pagination-link');
        paginationLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                this.goToPage(page);
            });
        });
    }

    goToPage(page) {
        this.currentPage = page;
        this.updatePaginationUI();
        this.loadPageData();
    }

    updatePaginationUI() {
        const paginationLinks = document.querySelectorAll('.pagination-link');
        paginationLinks.forEach(link => {
            link.classList.remove('active');
            if (parseInt(link.dataset.page) === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    async loadPageData() {
        // Show loading state
        this.showLoading();

        try {
            // In production, fetch data from API
            const data = await this.fetchPageData();
            this.renderPageData(data);
        } catch (error) {
            console.error('Error loading page data:', error);
            this.showNotification('Failed to load data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async fetchPageData() {
        // Mock API call
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    items: [],
                    total: 0,
                    pages: 1
                });
            }, 500);
        });
    }

    renderPageData(data) {
        // Implementation depends on the specific page
        console.log('Rendering page data:', data);
    }

    // Search functionality
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');

        if (searchInput && searchButton) {
            const performSearch = this.debounce(() => {
                this.performSearch(searchInput.value);
            }, 300);

            searchInput.addEventListener('input', performSearch);
            searchButton.addEventListener('click', performSearch);
        }
    }

    async performSearch(query) {
        try {
            const response = await fetch(`/admin/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Search failed', 'error');
        }
    }

    displaySearchResults(results) {
        // Implementation depends on the search context
        console.log('Search results:', results);
    }

    // Filters
    setupFilters() {
        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => {
                this.applyFilters();
            });
        });

        const dateFilters = document.querySelectorAll('.date-filter');
        dateFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.applyFilters();
            });
        });
    }

    applyFilters() {
        const filters = this.getCurrentFilters();
        this.loadFilteredData(filters);
    }

    getCurrentFilters() {
        const filters = {};
        const filterSelects = document.querySelectorAll('.filter-select');
        
        filterSelects.forEach(select => {
            if (select.value) {
                filters[select.name] = select.value;
            }
        });

        return filters;
    }

    async loadFilteredData(filters) {
        try {
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`/admin/api/data?${queryString}`);
            const data = await response.json();
            this.renderFilteredData(data);
        } catch (error) {
            console.error('Filter error:', error);
            this.showNotification('Failed to apply filters', 'error');
        }
    }

    renderFilteredData(data) {
        // Implementation depends on the context
        console.log('Filtered data:', data);
    }

    // Bulk actions
    setupBulkActions() {
        const selectAllCheckbox = document.getElementById('selectAll');
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');
        const bulkActionSelect = document.getElementById('bulkAction');
        const applyBulkActionBtn = document.getElementById('applyBulkAction');

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                itemCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
                this.updateBulkActionUI();
            });
        }

        if (itemCheckboxes) {
            itemCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.updateBulkActionUI();
                });
            });
        }

        if (applyBulkActionBtn) {
            applyBulkActionBtn.addEventListener('click', () => {
                this.applyBulkAction();
            });
        }
    }

    updateBulkActionUI() {
        const selectedCount = document.querySelectorAll('.item-checkbox:checked').length;
        const bulkActionSection = document.getElementById('bulkActionSection');
        
        if (bulkActionSection) {
            if (selectedCount > 0) {
                bulkActionSection.style.display = 'block';
                bulkActionSection.querySelector('.selected-count').textContent = selectedCount;
            } else {
                bulkActionSection.style.display = 'none';
            }
        }
    }

    async applyBulkAction() {
        const selectedItems = Array.from(document.querySelectorAll('.item-checkbox:checked'))
            .map(checkbox => checkbox.value);
        
        const action = document.getElementById('bulkAction').value;

        if (selectedItems.length === 0 || !action) {
            this.showNotification('Please select items and an action', 'warning');
            return;
        }

        try {
            const response = await fetch('/admin/api/bulk-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    items: selectedItems
                })
            });

            if (response.ok) {
                this.showNotification('Bulk action completed successfully', 'success');
                this.reloadCurrentPage();
            } else {
                throw new Error('Bulk action failed');
            }
        } catch (error) {
            console.error('Bulk action error:', error);
            this.showNotification('Bulk action failed', 'error');
        }
    }

    // Export functionality
    setupExportButtons() {
        const exportButtons = document.querySelectorAll('.export-btn');
        exportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.format || 'csv';
                this.exportData(format);
            });
        });
    }

    async exportData(format) {
        try {
            const response = await fetch(`/admin/api/export?format=${format}`);
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification(`Data exported as ${format.toUpperCase()}`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed', 'error');
        }
    }

    // Real-time updates
    setupRealTimeUpdates() {
        // WebSocket connection for real-time updates
        this.setupWebSocket();
        
        // Periodic data refresh
        setInterval(() => {
            this.refreshData();
        }, 30000); // Every 30 seconds
    }

    setupWebSocket() {
        // In production, set up WebSocket connection for real-time updates
        console.log('Setting up WebSocket connection...');
    }

    refreshData() {
        if (document.getElementById('admin-dashboard')) {
            this.loadDashboardStats();
        }
        
        // Refresh current table data
        this.loadPageData();
    }

    // Modal handlers for admin
    setupAdminModals() {
        // Close modals
        const closeButtons = document.querySelectorAll('.modal-close, .btn-cancel');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Form submissions
        const forms = document.querySelectorAll('.admin-form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                this.handleAdminFormSubmit(e);
            });
        });
    }

    async handleAdminFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch(form.action, {
                method: form.method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification('Operation completed successfully', 'success');
                this.closeModal(form.closest('.modal'));
                this.reloadCurrentPage();
            } else {
                throw new Error('Operation failed');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification('Operation failed', 'error');
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    openModal(modalId) {
        const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    // Utility functions
    showLoading() {
        // Show loading overlay
        const loading = document.getElementById('loadingOverlay') || this.createLoadingOverlay();
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    createLoadingOverlay() {
        const loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        loading.className = 'loading-overlay';
        loading.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loading);
        return loading;
    }

    showNotification(message, type = 'info') {
        // Use the same notification system as main app
        if (window.binancePlus) {
            window.binancePlus.showNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    reloadCurrentPage() {
        window.location.reload();
    }

    // Handle various user actions
    handleUserAction(action, userId) {
        switch (action) {
            case 'view':
                this.viewUserDetails(userId);
                break;
            case 'edit':
                this.editUser(userId);
                break;
            case 'delete':
                this.deleteUser(userId);
                break;
            case 'suspend':
                this.suspendUser(userId);
                break;
            default:
                console.warn('Unknown user action:', action);
        }
    }

    handleTransactionAction(action, transactionId) {
        switch (action) {
            case 'view':
                this.viewTransactionDetails(transactionId);
                break;
            case 'approve':
                this.approveTransaction(transactionId);
                break;
            case 'reject':
                this.rejectTransaction(transactionId);
                break;
            case 'refund':
                this.refundTransaction(transactionId);
                break;
            default:
                console.warn('Unknown transaction action:', action);
        }
    }

    handlePlanAction(action, planId) {
        switch (action) {
            case 'edit':
                this.editInvestmentPlan(planId);
                break;
            case 'toggle':
                this.toggleInvestmentPlan(planId);
                break;
            case 'delete':
                this.deleteInvestmentPlan(planId);
                break;
            default:
                console.warn('Unknown plan action:', action);
        }
    }

    // Stub methods for various actions
    async viewUserDetails(userId) {
        console.log('View user details:', userId);
        // Implementation would open user details modal
    }

    async editUser(userId) {
        console.log('Edit user:', userId);
        // Implementation would open edit user modal
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                const response = await fetch(`/admin/users/${userId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.showNotification('User deleted successfully', 'success');
                    this.reloadCurrentPage();
                } else {
                    throw new Error('Failed to delete user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showNotification('Failed to delete user', 'error');
            }
        }
    }

    async suspendUser(userId) {
        // Implementation for suspending user
        console.log('Suspend user:', userId);
    }

    async viewTransactionDetails(transactionId) {
        console.log('View transaction details:', transactionId);
        // Implementation would open transaction details modal
    }

    async approveTransaction(transactionId) {
        try {
            const response = await fetch(`/admin/transactions/${transactionId}/approve`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showNotification('Transaction approved successfully', 'success');
                this.reloadCurrentPage();
            } else {
                throw new Error('Failed to approve transaction');
            }
        } catch (error) {
            console.error('Error approving transaction:', error);
            this.showNotification('Failed to approve transaction', 'error');
        }
    }

    async rejectTransaction(transactionId) {
        try {
            const response = await fetch(`/admin/transactions/${transactionId}/reject`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showNotification('Transaction rejected successfully', 'success');
                this.reloadCurrentPage();
            } else {
                throw new Error('Failed to reject transaction');
            }
        } catch (error) {
            console.error('Error rejecting transaction:', error);
            this.showNotification('Failed to reject transaction', 'error');
        }
    }

    async refundTransaction(transactionId) {
        // Implementation for refunding transaction
        console.log('Refund transaction:', transactionId);
    }

    async editInvestmentPlan(planId) {
        console.log('Edit investment plan:', planId);
        // Implementation would open edit plan modal
    }

    async toggleInvestmentPlan(planId) {
        try {
            const response = await fetch(`/admin/investment-plans/${planId}/toggle`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showNotification('Investment plan status updated', 'success');
                this.reloadCurrentPage();
            } else {
                throw new Error('Failed to update plan status');
            }
        } catch (error) {
            console.error('Error toggling investment plan:', error);
            this.showNotification('Failed to update plan status', 'error');
        }
    }

    async deleteInvestmentPlan(planId) {
        if (confirm('Are you sure you want to delete this investment plan? This action cannot be undone.')) {
            try {
                const response = await fetch(`/admin/investment-plans/${planId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.showNotification('Investment plan deleted successfully', 'success');
                    this.reloadCurrentPage();
                } else {
                    throw new Error('Failed to delete investment plan');
                }
            } catch (error) {
                console.error('Error deleting investment plan:', error);
                this.showNotification('Failed to delete investment plan', 'error');
            }
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.admin-dashboard')) {
        window.adminPanel = new AdminPanel();
    }
});