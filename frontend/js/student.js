let studentMetrics = {};
let activeUser = {};
let html5QrcodeScanner = null;

document.addEventListener("DOMContentLoaded", () => {
    switchTab('tab-dashboard');
    initStudent();
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active', 'border-l-4', 'border-blue-400', 'bg-blue-800'));
    
    document.getElementById(tabId).classList.remove('hidden');
    const navBtn = document.getElementById(tabId.replace('tab', 'nav'));
    if(navBtn) navBtn.classList.add('active', 'border-l-4', 'border-blue-400', 'bg-blue-800');
    
    // Auto hook scanner UI
    if(tabId === 'tab-scanner') {
        initScannerUI();
    } else if(html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
}

async function initStudent() {
    try {
        activeUser = await apiCall("/users/me");
        studentMetrics = await apiCall("/users/student-analytics");
        
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("student-container").classList.remove("hidden");
        
        document.getElementById("student-name-display").innerText = activeUser.full_name;
        
        renderDashboard();
        renderHistory();
        renderEvents();
        renderAchievements();
        renderProfile();
        
    } catch(err) {
        console.error(err);
        document.getElementById("loading").innerHTML = "<p class='text-red-500 font-bold'>Error loading student data. Please log in.</p>";
    }
}

function renderDashboard() {
    const s = studentMetrics.summary;
    document.getElementById("dash-name").innerText = activeUser.full_name.split(' ')[0];
    
    document.getElementById("pb-text").innerText = `${s.percentage}%`;
    document.getElementById("pb-fill").style.width = `${s.percentage}%`;
    
    document.getElementById("kpi-cards").innerHTML = `
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Overall %</p>
            <p class="text-3xl font-black ${s.percentage >= 75 ? 'text-green-500' : 'text-red-500'}">${s.percentage}%</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Present</p>
            <p class="text-3xl font-black text-blue-600">${s.attended}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Absent</p>
            <p class="text-3xl font-black text-gray-800">${s.absent}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Global Events</p>
            <p class="text-3xl font-black text-indigo-500">${s.total_events_system}</p>
        </div>
    `;
}

function renderHistory() {
    const history = studentMetrics.attendance.sort((a,b) => new Date(b.scanned_at) - new Date(a.scanned_at));
    document.getElementById("table-history").innerHTML = history.map(h => {
        const dObj = new Date(h.scanned_at.endsWith('Z') ? h.scanned_at : h.scanned_at + 'Z');
        return `
            <tr class="hover:bg-gray-50 border-b border-gray-100">
                <td class="px-4 py-3 whitespace-nowrap font-bold text-gray-800">${h.event_name}</td>
                <td class="px-4 py-3 whitespace-nowrap font-bold text-green-500">Present</td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">${dObj.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</td>
            </tr>
        `;
    }).join("");
    
    if (history.length === 0) document.getElementById("table-history").innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500 font-semibold">No attendance marked yet. Visit the Scanner tab!</td></tr>`;
}

function filterHistory() {
    const term = document.getElementById("hist-search").value.toLowerCase();
    const rows = document.querySelectorAll("#table-history tr");
    rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(term) ? "" : "none");
}

function renderEvents() {
    const events = studentMetrics.events;
    document.getElementById("table-events").innerHTML = events.map(e => `
        <tr class="hover:bg-gray-50 border-b border-gray-100">
            <td class="px-4 py-4">
                <p class="font-bold text-gray-800 text-lg">${e.name}</p>
                <p class="text-xs text-gray-500">${e.description || 'General event'}</p>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                ${e.is_attended 
                  ? `<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">✅ Attended</span>` 
                  : `<span class="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border">Pending</span>`
                }
            </td>
        </tr>
    `).join("");
    
    if (events.length === 0) document.getElementById("table-events").innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-500 font-semibold">No active events found globally.</td></tr>`;
}

function renderAchievements() {
    const ach = studentMetrics.achievements;
    if (ach.length === 0) {
        document.getElementById("list-achievements").innerHTML = "<p class='text-gray-500'>No achievements logged on your profile yet. Participate and win to see podiums here!</p>";
        return;
    }
    
    document.getElementById("list-achievements").innerHTML = ach.map(a => `
        <li class="p-4 border border-amber-100 rounded-lg bg-yellow-50 flex justify-between shadow-sm items-center">
            <p class="font-bold text-amber-700 text-lg">${a.position}</p>
            <p class="font-bold text-gray-800">${a.event_name}</p>
        </li>
    `).join("");
}

function renderProfile() {
    document.getElementById("prof-name").innerText = activeUser.full_name || '-';
    document.getElementById("prof-roll").innerText = activeUser.enrollment_number || '-';
    document.getElementById("prof-branch").innerText = activeUser.branch || '-';
    document.getElementById("prof-year").innerText = activeUser.year || '-';
    document.getElementById("prof-sem").innerText = activeUser.semester || '-';
    document.getElementById("prof-activity").innerText = activeUser.activity || '-';
    document.getElementById("prof-email").innerText = activeUser.email || '-';
    document.getElementById("prof-phone").innerText = activeUser.phone_number || '-';
}

// ---- Scanner Code ----
function initScannerUI() {
    if (html5QrcodeScanner) return;
    
    const statusEl = document.getElementById("scan-status");
    
    // We strictly use the integrated library scanner so Image fallbacks natively handle desktops with blocked cameras!
    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false
    );
    html5QrcodeScanner.render(onScanSuccess);
}

async function onScanSuccess(decodedText) {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear(); // Shutdown camera instantly cleanly on hit
        html5QrcodeScanner = null;
    }
    
    const statusEl = document.getElementById("scan-status");
    statusEl.classList.remove("hidden");
    statusEl.innerHTML = "Processing QR Token securely...";
    statusEl.className = "mt-6 w-full text-center px-4 py-3 rounded font-bold text-sm bg-yellow-100 text-yellow-800";
    
    try {
        const res = await apiCall("/attendance/mark", "POST", { token: decodedText });
        statusEl.innerHTML = `✅ Successfully Logged Presentation!<br><span class="text-xs">ID Track: ${res.attendance_id}</span>`;
        statusEl.className = "mt-6 w-full text-center px-4 py-3 rounded font-bold text-sm bg-green-100 text-green-800";
        initStudent(); // Reload data visually in background
    } catch(err) {
        statusEl.className = "mt-6 w-full text-center px-4 py-3 rounded font-bold text-sm bg-red-100 text-red-800";
        if (err.message.includes("Already marked")) {
            statusEl.innerHTML = "⚠️ Attendance already marked securely.";
        } else if (err.message.includes("expired") || err.message.includes("Invalid")) {
            statusEl.innerHTML = "❌ QR Token Expired (60s Limit)! Please scan the newest code.";
        } else {
            statusEl.innerHTML = `❌ Scan Error: ${err.message}`;
        }
    }
}

// Global logout
window.logout = () => {
    localStorage.removeItem("urjotsav_token");
    window.location.href = "/login.html";
};
