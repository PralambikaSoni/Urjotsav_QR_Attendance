let currentUser = null;
let currentEventId = null;
let qrRefreshInterval = null;
let qrCountdownInterval = null;
let html5QrcodeScanner = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }

    try {
        currentUser = await apiCall("/users/me");
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("user-display").innerText = `${currentUser.full_name} (${currentUser.role})`;
        
        if (currentUser.role === "admin") {
            if (!window.location.pathname.includes('admin.html') && !window.location.search.includes('force=true')) {
                window.location.href = "admin.html";
                return;
            }
            initFacultyDash();
        } else if (currentUser.role === "faculty") {
            if (!window.location.pathname.includes('faculty.html')) {
                window.location.href = "faculty.html";
                return;
            }
        } else if (currentUser.role === "student") {
            if (!window.location.pathname.includes('student.html')) {
                window.location.href = "student.html";
                return;
            }
        }
    } catch (e) {
        console.error(e);
        logout();
    }
});

// --- STUDENT LOGIC ---
async function initStudentDash() {
    document.getElementById("student-view").classList.remove("hidden");
    document.getElementById("student-name").innerText = currentUser.full_name;
    document.getElementById("student-enrollment").innerText = currentUser.enrollment_number || "N/A";
    document.getElementById("student-branch").innerText = currentUser.branch || "N/A";
    
    loadStudentHistory();
    initQRScanner();
}

async function loadStudentHistory() {
    const records = await apiCall("/attendance/me");
    const table = document.getElementById("student-history-body");
    table.innerHTML = records.map(record => {
        const dateObj = new Date(record.scanned_at.endsWith('Z') ? record.scanned_at : record.scanned_at + 'Z');
        const scannedDate = dateObj.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
        return `
            <tr>
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">${record.event.name}</td>
                <td class="px-3 py-4 text-sm text-gray-500">${scannedDate}</td>
            </tr>
        `;
    }).join("");
}

function initQRScanner() {
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrcodeScanner.start({ facingMode: "environment" }, config, async (decodedText) => {
        const statusEl = document.getElementById("scan-status");
        if (statusEl.innerText === "Processing..." || statusEl.classList.contains("text-green-600")) return; // Prevent spam

        statusEl.innerText = "Processing...";
        statusEl.className = "mt-4 text-sm font-bold text-center text-blue-600";
        
        try {
            const res = await apiCall("/attendance/mark", "POST", { token: decodedText });
            statusEl.innerText = "✅ " + res.message;
            statusEl.className = "mt-4 text-sm font-bold text-center text-green-600";
            loadStudentHistory(); // Refresh history
            
            // Resume scanning after 5s
            setTimeout(() => { statusEl.innerText = ""; }, 5000);
        } catch (err) {
            statusEl.innerText = "❌ " + err.message;
            statusEl.className = "mt-4 text-sm font-bold text-center text-red-600";
            setTimeout(() => { statusEl.innerText = ""; }, 5000);
        }
    }).catch(err => console.log("QR init error", err));
}

// --- FACULTY LOGIC ---
async function initFacultyDash() {
    document.getElementById("faculty-view").classList.remove("hidden");
    
    document.getElementById("create-event-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await apiCall("/events/", "POST", {
            name: document.getElementById("ev-name").value,
            description: document.getElementById("ev-desc").value
        });
        document.getElementById("create-event-modal").classList.add("hidden");
        loadFacultyEvents();
    });

    loadFacultyEvents();
}

async function loadFacultyEvents() {
    const events = await apiCall("/events/");
    document.getElementById("faculty-events-list").innerHTML = events.map(e => {
        const dateObj = new Date(e.created_at.endsWith('Z') ? e.created_at : e.created_at + 'Z');
        const dateStr = dateObj.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
        return `
            <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 flex justify-between items-center bg-white cursor-pointer shadow-sm" onclick="selectEvent('${e.id}', '${e.name}')">
                <div>
                    <p class="font-bold text-gray-800">${e.name}</p>
                    <p class="text-xs text-gray-500 mb-1">${e.description || 'No description'}</p>
                    <p class="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shadow-sm">🕒 Marked precisely at: ${dateStr}</p>
                </div>
                <span class="text-xs bg-${e.is_active?'green':'gray'}-100 text-${e.is_active?'green':'gray'}-800 px-2 py-1 rounded-full font-semibold border">${e.is_active?'Active':'Closed'}</span>
            </div>
        `;
    }).join("");
}

async function selectEvent(id, name) {
    currentEventId = id;
    document.getElementById("active-event-title").innerText = name;
    document.getElementById("faculty-active-event-panel").classList.remove("hidden");
    
    loadEventAttendance();
    startDynamicQR();
}

async function startDynamicQR() {
    if (qrRefreshInterval) clearInterval(qrRefreshInterval);
    if (qrCountdownInterval) clearInterval(qrCountdownInterval);
    
    const qrContainer = document.getElementById("qrcode-display");
    qrContainer.innerHTML = ""; // clear
    const qrcode = new QRCode(qrContainer, { width: 256, height: 256 });
    
    const fetchQR = async () => {
        try {
            const data = await apiCall(`/events/${currentEventId}/qr`);
            qrcode.makeCode(data.qr_token);
            
            let timeLeft = data.expires_in;
            document.getElementById("qr-timer").innerText = timeLeft;
            
            if (qrCountdownInterval) clearInterval(qrCountdownInterval);
            qrCountdownInterval = setInterval(() => {
                timeLeft--;
                document.getElementById("qr-timer").innerText = timeLeft;
                if(timeLeft <= 0) clearInterval(qrCountdownInterval);
            }, 1000);
            
        } catch(e) { alert("Failed to fetch QR"); }
    };
    
    await fetchQR();
    // Refresh 1 second before expiry (59 seconds)
    qrRefreshInterval = setInterval(fetchQR, 59000); 
    
    // Also auto-refresh attendance viewer
    const attInterval = setInterval(loadEventAttendance, 5000);
    window.currentAttInterval = attInterval;
    
    document.getElementById("qr-timer-container").classList.remove("hidden");
}

function endSession() {
    if (qrRefreshInterval) clearInterval(qrRefreshInterval);
    if (qrCountdownInterval) clearInterval(qrCountdownInterval);
    if (window.currentAttInterval) clearInterval(window.currentAttInterval);
    
    document.getElementById("qrcode-display").innerHTML = "<p class='font-bold text-red-600 p-8 text-center text-xl mb-4'>🔴 Session Closed</p>";
    document.getElementById("qr-timer-container").classList.add("hidden");
}

async function loadEventAttendance() {
    if (!currentEventId) return;
    try {
        const atts = await apiCall(`/attendance/event/${currentEventId}`);
        const tbody = document.getElementById("faculty-attendance-list");
        tbody.innerHTML = atts.map(a => `
            <tr>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-semibold">${a.student_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${a.enrollment_number} / ${a.branch}</td>
            </tr>
        `).join("");
    } catch(e) {}
}

// --- ADMIN LOGIC ---
async function initAdminDash() {
    document.getElementById("admin-view").classList.remove("hidden");
    
    try {
        const metrics = await apiCall("/users/analytics");
        const kpiHTML = `
            <div class="bg-white p-4 rounded-xl shadow border">
                <p class="text-gray-500 text-sm font-semibold">Total Participants</p>
                <p class="text-3xl font-bold text-gray-800">${metrics.total_participants}</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow border">
                <p class="text-gray-500 text-sm font-semibold">Present Users</p>
                <p class="text-3xl font-bold text-green-600">${metrics.present}</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow border">
                <p class="text-gray-500 text-sm font-semibold">Absent Users</p>
                <p class="text-3xl font-bold text-red-500">${metrics.absent}</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow border">
                <p class="text-gray-500 text-sm font-semibold">Coordinating Faculties</p>
                <p class="text-3xl font-bold text-teal-600">${metrics.faculties_count}</p>
            </div>
        `;
        document.getElementById("admin-kpi").innerHTML = kpiHTML;

        // Load Lists
        document.getElementById("domain-list").innerHTML = Object.entries(metrics.domains).map(([k,v])=>`<li class="flex justify-between items-center bg-gray-50 p-2 rounded"><span>${k||'Unknown'}</span><span class="font-bold text-gray-700">${v}</span></li>`).join("");
        document.getElementById("year-list").innerHTML = Object.entries(metrics.years).map(([k,v])=>`<li class="flex justify-between items-center bg-gray-50 p-2 rounded"><span>${k||'Unknown'}</span><span class="font-bold text-gray-700">${v}</span></li>`).join("");
        document.getElementById("activity-list").innerHTML = Object.entries(metrics.activities).map(([k,v])=>`<li class="flex justify-between items-center bg-gray-50 p-2 rounded"><span>${k||'Unknown'}</span><span class="font-bold text-gray-700">${v}</span></li>`).join("");

        // Load Users
        const users = await apiCall("/users/");
        const tbody = document.getElementById("admin-users-list");
        tbody.innerHTML = users.map(u => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs font-bold rounded-full bg-${u.role==='admin'?'red':(u.role==='faculty'?'teal':'blue')}-100 text-${u.role==='admin'?'red':(u.role==='faculty'?'teal':'blue')}-800 uppercase">${u.role}</span></td>
                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${u.full_name} <br><span class="text-xs text-gray-500 font-mono">${u.username}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${u.email||'N/A'} <br> ${u.phone_number||'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${u.enrollment_number||'N/A'} <br> ${u.branch||''} ${u.year||''} ${u.semester||''} ${u.section||''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${u.activity||'-'}</td>
            </tr>
        `).join("");

        // Setup Faculty creation interceptor
        document.getElementById("create-faculty-form").onsubmit = async (e) => {
            e.preventDefault();
            try {
                await apiCall("/users/faculty", "POST", {
                    full_name: document.getElementById("fac-name").value,
                    username: document.getElementById("fac-user").value,
                    password: document.getElementById("fac-pass").value,
                    role: "faculty"
                });
                document.getElementById("create-faculty-modal").classList.add("hidden");
                // Clear form
                document.getElementById("create-faculty-form").reset();
                initAdminDash(); // reload analytics and table
            } catch(err) { alert(err.message); }
        };
    } catch(err) {
        console.error("Admin dashboard load failed", err);
    }
}
