// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api';

// State Management
let currentAdminToken = null;
let currentUserToken = null;
let currentUser = null;
let currentEditingComplaintId = null;
let currentComplaints = []; // Store complaints for admin view
let currentUserComplaints = []; // Store user's complaints
let currentComplaintTab = 'active'; // 'active' or 'resolved'

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateUserUI();
    setupAdminModal();
});

// ============= EVENT LISTENERS =============
function setupEventListeners() {
    // Complaint Form
    document.getElementById('complaintForm').addEventListener('submit', submitComplaint);

    // Admin Login
    document.getElementById('adminLoginForm').addEventListener('submit', adminLogin);
    document.getElementById('adminBtn').addEventListener('click', openAdminModal);
    document.querySelector('.close').addEventListener('click', closeAdminModal);
    
    // User Auth
    document.getElementById('userAuthBtn').addEventListener('click', () => {
        document.getElementById('userAuthModal').classList.add('show');
    });
    document.getElementById('userAuthClose').addEventListener('click', () => {
        document.getElementById('userAuthModal').classList.remove('show');
    });
    document.getElementById('userLogoutBtn').addEventListener('click', userLogout);
    
    // Auth Tabs
    document.getElementById('tabLogin').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tabRegister').addEventListener('click', () => switchAuthTab('register'));
    
    // Complaint Tabs
    document.getElementById('tabActiveComplaints').addEventListener('click', () => switchComplaintTab('active'));
    document.getElementById('tabResolvedComplaints').addEventListener('click', () => switchComplaintTab('resolved'));
    
    // Auth Forms
    document.getElementById('userLoginForm').addEventListener('submit', userLogin);
    document.getElementById('userRegisterForm').addEventListener('submit', userRegister);
    
    // Check saved token
    const savedToken = localStorage.getItem('userToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
        currentUserToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateUserUI();
        loadMyComplaints();
    }
}

function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
        document.getElementById('userLoginForm').classList.remove('hidden');
        document.getElementById('userRegisterForm').classList.add('hidden');
    } else {
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('userRegisterForm').classList.remove('hidden');
        document.getElementById('userLoginForm').classList.add('hidden');
    }
    document.getElementById('userAuthMessage').textContent = '';
}

// ============= PUBLIC USER FUNCTIONS =============

// Submit new complaint
async function submitComplaint(e) {
    e.preventDefault();
    if (!currentUserToken) {
        alert("Please login to submit a complaint");
        return;
    }

    const formData = {
        subject: document.getElementById('subject').value,
        description: document.getElementById('description').value,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/complaints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserToken}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(
                `<strong>Success!</strong> Your complaint has been submitted.<br>
                <strong>Your Complaint Token:</strong> <code style="background:#f0f0f0; padding:5px; border-radius:3px;">${data.token}</code><br>
                <small>Save this token to track your complaint.</small>`,
                'success'
            );
            document.getElementById('complaintForm').reset();
            loadMyComplaints();
        } else {
            showMessage('Error submitting complaint: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error submitting complaint. Please try again.', 'error');
    }
}

// Track complaint by token
async function trackComplaint() {
    const token = document.getElementById('tokenInput').value.trim();

    if (!token) {
        alert('Please enter a complaint token');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/complaints/track/${token}`);
        const data = await response.json();

        if (response.ok) {
            displayComplaintDetails(data);
        } else {
            alert('Complaint not found. Please check your token.');
            document.getElementById('complaintDetails').classList.add('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error tracking complaint. Please try again.');
    }
}

// Display complaint details
function displayComplaintDetails(complaint) {
    const detailsHtml = `
        <div class="detail-item">
            <div class="detail-label">Token ID:</div>
            <div class="detail-value"><strong>${complaint.token}</strong></div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Name:</div>
            <div class="detail-value">${complaint.name}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${complaint.email}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${complaint.phone}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Subject:</div>
            <div class="detail-value">${complaint.subject}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
                <span class="status-badge status-${complaint.status}">${complaint.status.replace('_', ' ').toUpperCase()}</span>
            </div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Description:</div>
            <div class="detail-value">${complaint.description}</div>
        </div>
        ${complaint.reply ? `
        <div class="detail-item">
            <div class="detail-label">Reply:</div>
            <div class="detail-value">${complaint.reply}</div>
        </div>
        ` : ''}
        <div class="detail-item">
            <div class="detail-label">Submitted:</div>
            <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>
        </div>
    `;

    document.getElementById('detailsContent').innerHTML = detailsHtml;
    document.getElementById('complaintDetails').classList.remove('hidden');
}



// Load my complaints
async function loadMyComplaints() {
    if (!currentUserToken) return;
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/me`, {
            headers: {
                'Authorization': `Bearer ${currentUserToken}`
            }
        });
        const complaints = await response.json();
        currentUserComplaints = complaints; // Store globally
        renderUserComplaints();
    } catch (error) {
        console.error('Error loading my complaints:', error);
    }
}

function renderUserComplaints() {
    let html = '';
    const filteredComplaints = currentUserComplaints.filter(complaint => {
        if (currentComplaintTab === 'active') {
            return complaint.status === 'pending' || complaint.status === 'in_progress';
        } else {
            return complaint.status === 'resolved';
        }
    });

    if (!filteredComplaints || filteredComplaints.length === 0) {
        html = `<p style="text-align: center; color: var(--light-text);">No ${currentComplaintTab} complaints found.</p>`;
    } else {
        filteredComplaints.forEach(complaint => {
            html += `
                <div class="complaint-card" onclick="openUserComplaintModal('${complaint.token}')">
                    <h4>${(complaint.subject || '').toUpperCase()}</h4>
                    <p>${complaint.description.substring(0, 100)}...</p>
                    <span class="status-badge status-${complaint.status}">${complaint.status.replace('_', ' ').toUpperCase()}</span>
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #999;">Token: ${complaint.token}</p>
                </div>
            `;
        });
    }
    document.getElementById('myComplaintsList').innerHTML = html;
}

function openUserComplaintModal(token) {
    const complaint = currentUserComplaints.find(c => c.token === token);
    if (!complaint) return;

    const detailsHtml = `
        <div class="detail-item">
            <div class="detail-label">Token:</div>
            <div class="detail-value"><strong>${complaint.token}</strong></div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Subject:</div>
            <div class="detail-value">${complaint.subject}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
                <span class="status-badge status-${complaint.status}">${complaint.status.replace('_', ' ').toUpperCase()}</span>
            </div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Description:</div>
            <div class="detail-value">${complaint.description}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Reply:</div>
            <div class="detail-value">${complaint.reply || 'No reply yet'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Submitted:</div>
            <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>
        </div>
    `;

    document.getElementById('viewDetailsContent').innerHTML = detailsHtml;
    document.getElementById('viewModal').classList.add('show');
}

function switchComplaintTab(tab) {
    currentComplaintTab = tab;
    if (tab === 'active') {
        document.getElementById('tabActiveComplaints').classList.add('active');
        document.getElementById('tabResolvedComplaints').classList.remove('active');
    } else {
        document.getElementById('tabResolvedComplaints').classList.add('active');
        document.getElementById('tabActiveComplaints').classList.remove('active');
    }
    renderUserComplaints();
}

async function userLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUserToken = data.token;
            currentUser = data.user;
            localStorage.setItem('userToken', currentUserToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            document.getElementById('userAuthModal').classList.remove('show');
            updateUserUI();
            loadMyComplaints();
        } else {
            document.getElementById('userAuthMessage').innerHTML = `<span style="color:red">${data.message}</span>`;
        }
    } catch (err) {
        document.getElementById('userAuthMessage').innerHTML = `<span style="color:red">Error logging in</span>`;
    }
}

async function userRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        const res = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, email, password, phone})
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('userAuthMessage').innerHTML = `<span style="color:green">Registration successful! You can now login.</span>`;
            setTimeout(() => switchAuthTab('login'), 1500);
        } else {
            document.getElementById('userAuthMessage').innerHTML = `<span style="color:red">${data.message}</span>`;
        }
    } catch (err) {
        document.getElementById('userAuthMessage').innerHTML = `<span style="color:red">Error registering</span>`;
    }
}

function userLogout() {
    currentUserToken = null;
    currentUser = null;
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    updateUserUI();
}

function updateUserUI() {
    const welcome = document.getElementById('welcomeUser');
    const authBtn = document.getElementById('userAuthBtn');
    const logoutBtn = document.getElementById('userLogoutBtn');
    const myComplaints = document.getElementById('myComplaintsSection');
    const submitBtn = document.getElementById('submitComplaintBtn');
    const submitWarning = document.getElementById('submitAuthWarning');
    const publicSection = document.getElementById('publicSection');
    
    if (currentUser) {
        welcome.textContent = `Welcome, ${currentUser.name}`;
        welcome.classList.remove('hidden');
        authBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        myComplaints.classList.remove('hidden');
        publicSection.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Complaint';
        submitWarning.classList.add('hidden');
    } else {
        welcome.classList.add('hidden');
        authBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        myComplaints.classList.add('hidden');
        publicSection.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Login to Submit Complaint';
        submitWarning.classList.remove('hidden');
    }
}

function trackComplaint_fromCard(token) {
    document.getElementById('tokenInput').value = token;
    trackComplaint();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show message
function showMessage(message, type) {
    const msgEl = document.getElementById('successMessage');
    msgEl.innerHTML = message;
    msgEl.className = `message ${type}`;
    setTimeout(() => {
        msgEl.className = 'message';
    }, 5000);
}

// ============= ADMIN FUNCTIONS =============

// Setup Admin Modal
function setupAdminModal() {
    const modal = document.getElementById('adminModal');
    const span = document.querySelector('.close');

    span.onclick = closeAdminModal;

    window.onclick = function(event) {
        if (event.target === modal) {
            closeAdminModal();
        }
    }
}

// Open admin modal
function openAdminModal() {
    document.getElementById('adminModal').classList.add('show');
}

// Close admin modal
function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('show');
    document.getElementById('adminLoginForm').reset();
    document.getElementById('adminMessage').textContent = '';
}

// Admin Login
async function adminLogin(e) {
    e.preventDefault();

    const adminId = document.getElementById('adminId').value;
    const adminPassword = document.getElementById('adminPassword').value;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adminId, adminPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            document.getElementById('adminMessage').textContent = data.message || 'Invalid credentials';
            document.getElementById('adminMessage').style.color = 'red';
            return;
        }

        currentAdminToken = data.token;
        closeAdminModal();
        showAdminDashboard();
        loadAdminComplaints();
    } catch (error) {
        document.getElementById('adminMessage').textContent = 'Login failed. Try again.';
        document.getElementById('adminMessage').style.color = 'red';
    }
}

// Show admin dashboard
function showAdminDashboard() {
    document.querySelector('.main-container').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
}

// Admin logout
function adminLogout() {
    currentAdminToken = null;
    document.getElementById('adminDashboard').classList.add('hidden');
    document.querySelector('.main-container').classList.remove('hidden');
}

// Load all complaints for admin
async function loadAdminComplaints() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/complaints`, {
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        if (response.status === 401) {
            alert('Admin session expired. Please login again.');
            adminLogout();
            return;
        }

        const complaints = await response.json();
        currentComplaints = complaints; // Store globally

        // Update stats
        const stats = {
            total: complaints.length,
            pending: complaints.filter(c => c.status === 'pending').length,
            in_progress: complaints.filter(c => c.status === 'in_progress').length,
            resolved: complaints.filter(c => c.status === 'resolved').length
        };

        document.getElementById('totalComplaints').textContent = stats.total;
        document.getElementById('pendingComplaints').textContent = stats.pending;
        document.getElementById('inProgressComplaints').textContent = stats.in_progress;
        document.getElementById('resolvedComplaints').textContent = stats.resolved;

        // Build table
        let tableHtml = '';
        complaints.forEach(complaint => {
            tableHtml += `
                <tr>
                    <td><strong>${complaint.token}</strong></td>
                    <td>${complaint.name}</td>
                    <td>${complaint.subject || ''}</td>
                    <td><span class="status-badge status-${complaint.status}">${complaint.status.replace('_', ' ')}</span></td>
                    <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-view" onclick="openViewModal(${complaint.id})">View</button>
                            <button class="btn-edit" onclick="openEditModal(${complaint.id}, '${complaint.status}', '${complaint.reply || ''}')">Reply</button>
                            <button class="btn-delete" onclick="deleteComplaint(${complaint.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        document.getElementById('adminComplaintsTable').innerHTML = tableHtml;
    } catch (error) {
        console.error('Error loading admin complaints:', error);
    }
}

// Open edit/reply modal
function openEditModal(complaintId, currentStatus, currentReply) {
    currentEditingComplaintId = complaintId;
    document.getElementById('editStatus').value = currentStatus;
    document.getElementById('editReply').value = currentReply !== 'null' ? currentReply : '';
    document.getElementById('editModal').classList.add('show');
}

// Open view modal
function openViewModal(complaintId) {
    const complaint = currentComplaints.find(c => c.id === complaintId);
    if (!complaint) return;

    const detailsHtml = `
        <div class="detail-item">
            <div class="detail-label">Token:</div>
            <div class="detail-value"><strong>${complaint.token}</strong></div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Name:</div>
            <div class="detail-value">${complaint.name}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${complaint.email}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${complaint.phone}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Subject:</div>
            <div class="detail-value">${complaint.subject}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
                <span class="status-badge status-${complaint.status}">${complaint.status.replace('_', ' ').toUpperCase()}</span>
            </div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Description:</div>
            <div class="detail-value">${complaint.description}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Reply:</div>
            <div class="detail-value">${complaint.reply || 'No reply yet'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Submitted:</div>
            <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>
        </div>
    `;

    document.getElementById('viewDetailsContent').innerHTML = detailsHtml;
    document.getElementById('viewModal').classList.add('show');
}

// Close view modal
function closeViewModal() {
    document.getElementById('viewModal').classList.remove('show');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    currentEditingComplaintId = null;
}

// Submit complaint update
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editComplaintForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const updateData = {
                status: document.getElementById('editStatus').value,
                reply: document.getElementById('editReply').value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/admin/complaints/${currentEditingComplaintId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentAdminToken}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    alert('Complaint updated successfully');
                    closeEditModal();
                    loadAdminComplaints();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Error updating complaint');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating complaint');
            }
        });
    }
});

// Delete complaint
async function deleteComplaint(complaintId) {
    if (confirm('Are you sure you want to delete this complaint?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/complaints/${complaintId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentAdminToken}`
                }
            });

            if (response.ok) {
                alert('Complaint deleted successfully');
                loadAdminComplaints();
            } else {
                const data = await response.json();
                alert(data.message || 'Error deleting complaint');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting complaint');
        }
    }
}
