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
let currentAdminUsers = []; // Store users for admin view
let currentEditingUserId = null;

// Loading Helper Functions
function showLoading() {
    const loader = document.getElementById('globalLoader');
    if(loader) loader.classList.remove('hidden');
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if(loader) loader.classList.add('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateUserUI();
    setupAdminModal();
    displayRecentTokens();
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

    // Profile
    document.getElementById('userProfileBtn').addEventListener('click', openUserProfileModal);
    document.getElementById('userProfileClose').addEventListener('click', closeUserProfileModal);
    
    // Auth Tabs
    document.getElementById('tabLogin').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tabRegister').addEventListener('click', () => switchAuthTab('register'));
    
    // Complaint Tabs
    document.getElementById('tabActiveComplaints').addEventListener('click', () => switchComplaintTab('active'));
    document.getElementById('tabResolvedComplaints').addEventListener('click', () => switchComplaintTab('resolved'));
    
    // Auth Forms
    document.getElementById('userLoginForm').addEventListener('submit', userLogin);
    document.getElementById('userRegisterForm').addEventListener('submit', userRegister);
    
    // Check saved user token
    const savedToken = localStorage.getItem('userToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
        currentUserToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateUserUI();
        loadMyComplaints();
    }

    // Check saved admin token
    const savedAdminToken = localStorage.getItem('adminToken');
    if (savedAdminToken) {
        currentAdminToken = savedAdminToken;
        showAdminDashboard();
        loadAdminComplaints();
        loadAdminUsers();
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

    let description = document.getElementById('description').value;
    const referenceToken = document.getElementById('referenceToken').value.trim();

    if (referenceToken) {
        description += `\n\n[Reference to Previous Complaint: ${referenceToken}]`;
    }

    const formData = {
        subject: document.getElementById('subject').value,
        description: description,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    showLoading();
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
                <strong>Your Complaint Token:</strong> <code style="background:#f0f0f0; padding:5px; border-radius:3px;">${data.token}</code> <button onclick="copyToken('${data.token}')" class="btn-copy">Copy</button><br>
                <small>Save this token to track your complaint.</small>`,
                'success'
            );
            document.getElementById('complaintForm').reset();
            await loadMyComplaints();
        } else {
            showMessage('Error submitting complaint: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error submitting complaint. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Track complaint by token
async function trackComplaint() {
    const token = document.getElementById('tokenInput').value.trim();

    if (!token) {
        alert('Please enter a complaint token');
        return;
    }

    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/track/${token}`);
        const data = await response.json();

        if (response.ok) {
            // Save to recent searches
            let recentTokens = JSON.parse(localStorage.getItem('recentTokens') || '[]');
            if (!recentTokens.includes(token)) {
                recentTokens.unshift(token);
                recentTokens = recentTokens.slice(0, 5); // Keep last 5
                localStorage.setItem('recentTokens', JSON.stringify(recentTokens));
            }
            displayRecentTokens();
            
            displayComplaintDetails(data);
        } else {
            alert('Complaint not found. Please check your token.');
            document.getElementById('complaintDetails').classList.add('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error tracking complaint. Please try again.');
    } finally {
        hideLoading();
    }
}

// Display recent tokens
function displayRecentTokens() {
    const recentTokens = JSON.parse(localStorage.getItem('recentTokens') || '[]');
    const container = document.getElementById('recentTokensContainer');
    if (!container) return;
    
    if (recentTokens.length > 0) {
        let html = '<div style="margin-top: 10px; font-size: 0.9em; color: var(--light-text);">Recent Searches: ';
        recentTokens.forEach(t => {
            html += `<span class="recent-token-badge" onclick="document.getElementById('tokenInput').value='${t}'; trackComplaint()" style="cursor:pointer; margin-right:5px; background:var(--border-color); padding:4px 8px; border-radius:12px; display:inline-block; margin-bottom:5px;">${t}</span>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } else {
        container.innerHTML = '';
    }
}

// Copy token globally
function copyToken(token) {
    navigator.clipboard.writeText(token).then(() => {
        alert('Token copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// Download PDF
function downloadComplaintPDF(elementId, token) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const opt = {
        margin:       0.5,
        filename:     `Complaint_${token}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0, 
            scrollX: 0,
            backgroundColor: '#ffffff'
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Setting explicit background color to prevent transparent/black rendering
    const originalBg = element.style.backgroundColor;
    element.style.backgroundColor = '#ffffff';

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.backgroundColor = originalBg;
    });
}

// Copy full complaint details
function copyComplaintDetails(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    // Format text nicely without the button text
    const clone = element.cloneNode(true);
    clone.querySelectorAll('button').forEach(btn => btn.remove());
    let textToCopy = clone.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Complaint details copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy details');
    });
}

// Display complaint details
function displayComplaintDetails(complaint) {
    const detailsHtml = `
        <div id="pdf-content-${complaint.token}" style="border: 2px solid #334155; padding: 40px; background: #ffffff; border-radius: 8px; font-family: Arial, sans-serif; position: relative;">
            
            <div style="text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #1e293b; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Official Complaint Record</h1>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Complaint Management System</p>
                <div style="position: absolute; top: 40px; right: 40px; text-align: right; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;"><strong>Token ID:</strong></p>
                    <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: bold;">${complaint.token}</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Complainant Name</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 16px;">${complaint.name || 'User'}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Contact Details</p>
                    <p style="margin: 0; color: #0f172a; font-size: 14px;">${complaint.email || 'N/A'}</p>
                    <p style="margin: 0; color: #0f172a; font-size: 14px;">${complaint.phone || 'N/A'}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Date Submitted</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">${new Date(complaint.created_at).toLocaleString()}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Current Status</p>
                    <p style="margin: 0; font-weight: bold; font-size: 14px; text-transform: uppercase; color: ${complaint.status === 'resolved' ? '#059669' : (complaint.status === 'pending' ? '#d97706' : '#2563eb')};">
                        ${complaint.status.replace('_', ' ')}
                    </p>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;">Subject</h3>
                <p style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 600;">${complaint.subject}</p>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;">Complaint Description</h3>
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${complaint.description}</p>
            </div>

            <div style="margin-bottom: 40px; background: ${complaint.reply ? '#f0fdf4' : '#fff1f2'}; padding: 20px; border-left: 4px solid ${complaint.reply ? '#10b981' : '#f43f5e'};">
                <h3 style="color: #334155; margin: 0 0 10px 0; font-size: 16px;">Official Response</h3>
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${complaint.reply || 'No official response has been provided yet.'}</p>
            </div>

            <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-top: 40px;">
                This document is electronically generated and is an official record of the Complaint Management System.
            </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="downloadComplaintPDF('pdf-content-${complaint.token}', '${complaint.token}')" class="btn-primary" style="flex: 1; text-align: center; min-width: 120px;">Download PDF</button>
            <button onclick="copyComplaintDetails('pdf-content-${complaint.token}')" class="btn-primary" style="flex: 1; background: var(--secondary-color); text-align: center; min-width: 120px;">Copy Details</button>
            <button onclick="document.getElementById('complaintDetails').classList.add('hidden')" class="btn-primary" style="flex: 1; background: #64748b; text-align: center; min-width: 120px;">Close</button>
        </div>
    `;

    document.getElementById('detailsContent').innerHTML = detailsHtml;
    document.getElementById('complaintDetails').classList.remove('hidden');
}



// Load my complaints
async function loadMyComplaints() {
    if (!currentUserToken) return;
    showLoading();
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
    } finally {
        hideLoading();
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
                    <div style="margin-top: 1rem; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size: 0.85rem; color: #999;">Token: ${complaint.token}</span>
                        <button onclick="copyToken('${complaint.token}'); event.stopPropagation();" class="btn-copy">Copy</button>
                    </div>
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
        <div id="pdf-user-${complaint.token}" style="border: 2px solid #334155; padding: 40px; background: #ffffff; border-radius: 8px; font-family: Arial, sans-serif; position: relative;">
            
            <div style="text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #1e293b; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Official Complaint Record</h1>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Complaint Management System</p>
                <div style="position: absolute; top: 40px; right: 40px; text-align: right; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;"><strong>Token ID:</strong></p>
                    <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: bold;">${complaint.token}</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Complainant Name</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 16px;">${complaint.name || 'User'}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Contact Details</p>
                    <p style="margin: 0; color: #0f172a; font-size: 14px;">${complaint.email || 'N/A'}</p>
                    <p style="margin: 0; color: #0f172a; font-size: 14px;">${complaint.phone || 'N/A'}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Date Submitted</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">${new Date(complaint.created_at).toLocaleString()}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Current Status</p>
                    <p style="margin: 0; font-weight: bold; font-size: 14px; text-transform: uppercase; color: ${complaint.status === 'resolved' ? '#059669' : (complaint.status === 'pending' ? '#d97706' : '#2563eb')};">
                        ${complaint.status.replace('_', ' ')}
                    </p>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;">Subject</h3>
                <p style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 600;">${complaint.subject}</p>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;">Complaint Description</h3>
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${complaint.description}</p>
            </div>

            <div style="margin-bottom: 40px; background: ${complaint.reply ? '#f0fdf4' : '#fff1f2'}; padding: 20px; border-left: 4px solid ${complaint.reply ? '#10b981' : '#f43f5e'};">
                <h3 style="color: #334155; margin: 0 0 10px 0; font-size: 16px;">Official Response</h3>
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${complaint.reply || 'No official response has been provided yet.'}</p>
            </div>

            <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-top: 40px;">
                This document is electronically generated and is an official record of the Complaint Management System.
            </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="downloadComplaintPDF('pdf-user-${complaint.token}', '${complaint.token}')" class="btn-primary" style="flex: 1; text-align: center; min-width: 120px;">Download PDF</button>
            <button onclick="copyComplaintDetails('pdf-user-${complaint.token}')" class="btn-primary" style="flex: 1; background: var(--secondary-color); text-align: center; min-width: 120px;">Copy Details</button>
            <button onclick="document.getElementById('viewModal').classList.remove('show')" class="btn-primary" style="flex: 1; background: #64748b; text-align: center; min-width: 120px;">Close</button>
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
    
    showLoading();
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
            await loadMyComplaints();
        } else {
            document.getElementById('userAuthMessage').innerHTML = `<span style="color:red">${data.message}</span>`;
        }
    } catch (err) {
        document.getElementById('userAuthMessage').innerHTML = `<span style="color:red">Error logging in</span>`;
    } finally {
        hideLoading();
    }
}

async function userRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    
    showLoading();
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
    } finally {
        hideLoading();
    }
}

function userLogout() {
    if(!confirm("Are you sure you want to logout?")) return;
    currentUserToken = null;
    currentUser = null;
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    updateUserUI();
}

function updateUserUI() {
    const welcome = document.getElementById('welcomeUser');
    const authBtn = document.getElementById('userAuthBtn');
    const userLogoutBtn = document.getElementById('userLogoutBtn');
    const profileBtn = document.getElementById('userProfileBtn');
    const myComplaints = document.getElementById('myComplaintsSection');
    const submitBtn = document.getElementById('submitComplaintBtn');
    const submitWarning = document.getElementById('submitAuthWarning');
    const publicSection = document.getElementById('publicSection');
    const adminBtn = document.getElementById('adminBtn');
    const howItWorks = document.getElementById('howItWorksSection');
    
    if (currentAdminToken) {
        // Admin logged in
        welcome.textContent = `Welcome, Admin`;
        welcome.classList.remove('hidden');
        authBtn.classList.add('hidden');
        userLogoutBtn.classList.add('hidden');
        if(profileBtn) profileBtn.classList.add('hidden');
        myComplaints.classList.add('hidden');
        publicSection.classList.add('hidden');
        if(adminBtn) adminBtn.classList.add('hidden');
        if(howItWorks) howItWorks.classList.add('hidden');
    } else if (currentUser) {
        // User logged in
        welcome.textContent = `Welcome, ${currentUser.name}`;
        welcome.classList.remove('hidden');
        authBtn.classList.add('hidden');
        userLogoutBtn.classList.remove('hidden');
        if(profileBtn) profileBtn.classList.remove('hidden');
        myComplaints.classList.remove('hidden');
        publicSection.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Complaint';
        submitWarning.classList.add('hidden');
        if(adminBtn) adminBtn.classList.add('hidden');
        if(howItWorks) howItWorks.classList.add('hidden');
    } else {
        // Guest
        welcome.classList.add('hidden');
        authBtn.classList.remove('hidden');
        userLogoutBtn.classList.add('hidden');
        if(profileBtn) profileBtn.classList.add('hidden');
        myComplaints.classList.add('hidden');
        publicSection.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Login to Submit Complaint';
        submitWarning.classList.remove('hidden');
        if(adminBtn) adminBtn.classList.remove('hidden');
        if(howItWorks) howItWorks.classList.remove('hidden');
    }
}

async function openUserProfileModal() {
    if (!currentUserToken) return;
    showLoading();
    try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${currentUserToken}` }
        });
        if (res.ok) {
            const user = await res.json();
            document.getElementById('userProfileContent').innerHTML = `
                <div class="detail-item">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">${user.name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${user.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${user.phone || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Member Since:</div>
                    <div class="detail-value">${new Date(user.created_at).toLocaleString()}</div>
                </div>
            `;
            document.getElementById('userProfileModal').classList.add('show');
        } else {
            alert('Failed to load profile data.');
        }
    } catch (err) {
        console.error(err);
        alert('Error loading profile');
    } finally {
        hideLoading();
    }
}

function closeUserProfileModal() {
    document.getElementById('userProfileModal').classList.remove('show');
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
    
    showLoading();
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
            hideLoading();
            return;
        }

        currentAdminToken = data.token;
        localStorage.setItem('adminToken', currentAdminToken);
        closeAdminModal();
        showAdminDashboard();
        await loadAdminComplaints();
        await loadAdminUsers();
    } catch (error) {
        console.error("Admin login error:", error);
        document.getElementById('adminMessage').textContent = 'Login failed: ' + error.message;
        document.getElementById('adminMessage').style.color = 'red';
    } finally {
        hideLoading();
    }
}

// Show admin dashboard
function showAdminDashboard() {
    document.querySelector('.main-container').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    updateUserUI();
}

// Admin logout
function adminLogout() {
    if(!confirm("Are you sure you want to exit the admin dashboard?")) return;
    currentAdminToken = null;
    localStorage.removeItem('adminToken');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.querySelector('.main-container').classList.remove('hidden');
    updateUserUI(); // Restore button visibility based on user login state
}

// Admin Tab Switching
let currentAdminTab = 'activeComplaints';

function switchAdminTab(tab) {
    currentAdminTab = tab;
    // Update button styles
    const buttons = document.querySelectorAll('.admin-tab-btn');
    buttons.forEach(btn => btn.style.border = 'none');
    if(event && event.currentTarget) {
        event.currentTarget.style.border = '2px solid white';
    }

    // Hide all sections
    document.getElementById('adminActiveComplaintsSection').classList.add('hidden');
    document.getElementById('adminResolvedComplaintsSection').classList.add('hidden');
    document.getElementById('adminUsersSection').classList.add('hidden');

    // Show active section
    if (tab === 'activeComplaints') {
        document.getElementById('adminActiveComplaintsSection').classList.remove('hidden');
    } else if (tab === 'resolvedComplaints') {
        document.getElementById('adminResolvedComplaintsSection').classList.remove('hidden');
    } else if (tab === 'users') {
        document.getElementById('adminUsersSection').classList.remove('hidden');
    }
}

// Load all complaints for admin
async function loadAdminComplaints() {
    showLoading();
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
        let activeHtml = '';
        let resolvedHtml = '';
        complaints.forEach(complaint => {
            const htmlRow = `
                <tr>
                    <td><strong>${complaint.token}</strong> <button onclick="copyToken('${complaint.token}')" class="btn-copy">Copy</button></td>
                    <td>${complaint.name}</td>
                    <td>${complaint.subject || ''}</td>
                    <td><span class="status-badge status-${complaint.status}">${complaint.status.replace('_', ' ').toUpperCase()}</span></td>
                    <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-view" onclick="openViewModal(${complaint.id})">View</button>
                            ${complaint.status !== 'resolved' ? `<button class="btn-edit" onclick="openEditModal(${complaint.id}, '${complaint.status}', '${complaint.reply || ''}')">Update</button>` : ''}
                            <button class="btn-delete" onclick="deleteComplaint(${complaint.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
            if (complaint.status === 'resolved') {
                resolvedHtml += htmlRow;
            } else {
                activeHtml += htmlRow;
            }
        });

        document.getElementById('adminActiveComplaintsTable').innerHTML = activeHtml;
        document.getElementById('adminResolvedComplaintsTable').innerHTML = resolvedHtml;
    } catch (error) {
        console.error('Error loading admin complaints:', error);
    } finally {
        hideLoading();
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
        <div id="pdf-admin-${complaint.token}" style="border: 2px solid #334155; padding: 40px; background: #ffffff; border-radius: 8px; font-family: Arial, sans-serif; position: relative;">
            
            <div style="text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #1e293b; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Official Complaint Record</h1>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Complaint Management System</p>
                <div style="position: absolute; top: 40px; right: 40px; text-align: right; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;"><strong>Token ID:</strong></p>
                    <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: bold;">${complaint.token}</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Complainant Name</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 16px;">${complaint.name}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Contact Details</p>
                    <p style="margin: 0; color: #0f172a; font-size: 14px;">${complaint.email}</p>
                    <p style="margin: 0; color: #0f172a; font-size: 14px;">${complaint.phone || 'N/A'}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Date Submitted</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">${new Date(complaint.created_at).toLocaleString()}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Current Status</p>
                    <p style="margin: 0; font-weight: bold; font-size: 14px; text-transform: uppercase; color: ${complaint.status === 'resolved' ? '#059669' : (complaint.status === 'pending' ? '#d97706' : '#2563eb')};">
                        ${complaint.status.replace('_', ' ')}
                    </p>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;">Subject</h3>
                <p style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 600;">${complaint.subject}</p>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;">Complaint Description</h3>
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${complaint.description}</p>
            </div>

            <div style="margin-bottom: 40px; background: ${complaint.reply ? '#f0fdf4' : '#fff1f2'}; padding: 20px; border-left: 4px solid ${complaint.reply ? '#10b981' : '#f43f5e'};">
                <h3 style="color: #334155; margin: 0 0 10px 0; font-size: 16px;">Official Response</h3>
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${complaint.reply || 'No official response has been provided yet.'}</p>
            </div>

            <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-top: 40px;">
                This document is electronically generated and is an official record of the Complaint Management System.
            </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="downloadComplaintPDF('pdf-admin-${complaint.token}', '${complaint.token}')" class="btn-primary" style="flex: 1; text-align: center; min-width: 120px;">Download PDF</button>
            <button onclick="copyComplaintDetails('pdf-admin-${complaint.token}')" class="btn-primary" style="flex: 1; background: var(--secondary-color); text-align: center; min-width: 120px;">Copy Details</button>
            <button onclick="closeViewModal()" class="btn-primary" style="flex: 1; background: #64748b; text-align: center; min-width: 120px;">Close</button>
            <button onclick="deleteComplaint(${complaint.id})" class="btn-primary" style="flex: 1; background: var(--danger-color); text-align: center; min-width: 120px;">Delete</button>
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

            if(!confirm("Are you sure you want to update this complaint?")) return;

            const updateData = {
                status: document.getElementById('editStatus').value,
                reply: document.getElementById('editReply').value
            };

            showLoading();
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
                    await loadAdminComplaints();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Error updating complaint');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating complaint');
            } finally {
                hideLoading();
            }
        });
    }
});

// Delete complaint
async function deleteComplaint(complaintId) {
    if (confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
        showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/complaints/${complaintId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentAdminToken}`
                }
            });

            if (response.ok) {
                alert('Complaint deleted successfully');
                closeViewModal();
                await loadAdminComplaints();
            } else {
                const data = await response.json();
                alert(data.message || 'Error deleting complaint');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting complaint');
        } finally {
            hideLoading();
        }
    }
}

// User Management Functions for Admin
async function loadAdminUsers() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            currentAdminUsers = users;
            let html = '';
            users.forEach(u => {
                html += `
                    <tr>
                        <td>${u.id}</td>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td>${u.phone || 'N/A'}</td>
                        <td>${new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn-primary" style="background: #ef4444; padding: 6px 16px; font-size: 0.85rem;" onclick="openEditUserModal(${u.id})">Action</button>
                        </td>
                    </tr>
                `;
            });
            document.getElementById('adminUsersTable').innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    } finally {
        hideLoading();
    }
}

function openEditUserModal(userId) {
    const user = currentAdminUsers.find(u => u.id === userId);
    if (!user) return;
    currentEditingUserId = userId;
    
    // Set display info
    document.getElementById('viewUserId').textContent = user.id;
    document.getElementById('viewUserJoined').textContent = new Date(user.created_at).toLocaleString();

    // Set editable info
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPhone').value = user.phone || '';
    
    document.getElementById('editUserModal').classList.add('show');
}

function closeEditUserModal() {
    document.getElementById('editUserModal').classList.remove('show');
    currentEditingUserId = null;
}

async function blockUser(userId) {
    if (!confirm("Are you sure you want to block this user? They will not be able to log in anymore.")) return;
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/block`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentAdminToken}` }
        });
        if (response.ok) {
            alert('User blocked successfully.');
            closeEditUserModal();
            await loadAdminUsers();
        } else {
            const data = await response.json();
            alert(data.message || 'Error blocking user');
        }
    } catch (error) {
        console.error(error);
        alert('Error blocking user');
    } finally {
        hideLoading();
    }
}

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentAdminToken}` }
        });
        if (response.ok) {
            alert('User deleted successfully.');
            closeEditUserModal();
            await loadAdminUsers();
        } else {
            const data = await response.json();
            alert(data.message || 'Error deleting user');
        }
    } catch (error) {
        console.error(error);
        alert('Error deleting user');
    } finally {
        hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Also add event listener for editUserForm
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!confirm("Are you sure you want to update this user?")) return;

            const updateData = {
                name: document.getElementById('editUserName').value,
                email: document.getElementById('editUserEmail').value,
                phone: document.getElementById('editUserPhone').value
            };

            showLoading();
            try {
                const response = await fetch(`${API_BASE_URL}/admin/users/${currentEditingUserId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentAdminToken}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    alert('User updated successfully');
                    closeEditUserModal();
                    await loadAdminUsers();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Error updating user');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating user');
            } finally {
                hideLoading();
            }
        });
    }
});

// Toggle password visibility
function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    const svg = iconElement.querySelector('svg');
    
    if (input.type === 'password') {
        input.type = 'text';
        // Eye-off icon (slash through eye)
        svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        input.type = 'password';
        // Eye icon
        svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}
