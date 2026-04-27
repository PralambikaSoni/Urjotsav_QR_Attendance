let facultyData = {};
let qrRefreshInterval = null;
let currentActiveEventId = null;

document.addEventListener("DOMContentLoaded", () => {
    switchTab('tab-dashboard');
    initFaculty();
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active', 'border-l-4', 'border-emerald-400', 'bg-emerald-800'));
    
    document.getElementById(tabId).classList.remove('hidden');
    const navBtn = document.getElementById(tabId.replace('tab', 'nav'));
    if(navBtn) navBtn.classList.add('active', 'border-l-4', 'border-emerald-400', 'bg-emerald-800');
}

async function initFaculty() {
    try {
        facultyData = await apiCall("/events/faculty-analytics");
        document.getElementById("loading").classList.add("hidden");

        const jwtToken = getToken();
        if (jwtToken) {
            const payload = JSON.parse(atob(jwtToken.split('.')[1]));
            document.getElementById("faculty-name-display").innerText = payload.sub || "Coordinator Dashboard";
        }
        
        renderKPIs();
        renderEvents();
        renderAttendance();
        renderWinners();
        
        const evDrop = document.getElementById("win-event");
        if (evDrop) {
            evDrop.innerHTML = facultyData.events.map(e => `<option value="${e.id}">${e.name}</option>`).join("");
        }
    } catch(err) {
        console.error(err);
        document.getElementById("loading").innerHTML = "<p class='text-red-500 font-bold'>Error loading resources. Are you logged in?</p>";
    }
}

function renderKPIs() {
    const s = facultyData.summary;
    const allAtt = facultyData.events.reduce((acc, curr) => acc + curr.attendance_count, 0);
    const avgAtt = s.total_events > 0 ? ((allAtt / (s.total_events * 50)) * 100).toFixed(1) : 0; // rough estimation
    
    document.getElementById("kpi-cards").innerHTML = `
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Events Coordinated</p><p class="text-3xl font-black text-gray-800">${s.total_events || 0}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Participants Scanned</p><p class="text-3xl font-black text-emerald-600">${allAtt}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Sessions</p><p class="text-3xl font-black text-indigo-600">${s.total_events || 0}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Expected %</p><p class="text-3xl font-black text-purple-600">${avgAtt}%</p>
        </div>
    `;

    const allAttList = facultyData.events.flatMap(e => e.attendance.map(a => ({...a, event_name: e.name})))
                        .sort((a,b) => new Date(b.scanned_at) - new Date(a.scanned_at)).slice(0, 50);
                        
    document.getElementById("dash-realtime-logs").innerHTML = allAttList.map(a => {
        const dObj = new Date(a.scanned_at.endsWith('Z') ? a.scanned_at : a.scanned_at + 'Z');
        return `<div class="border-b border-gray-100 pb-2"><p class="text-xs text-gray-400 font-mono">${dObj.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p><p class="text-sm font-bold text-gray-800">${a.student_name} (${a.enrollment})</p><p class="text-xs text-emerald-600">Marked present for ${a.event_name}</p></div>`;
    }).join("");
}

function renderEvents() {
    document.getElementById("faculty-events-list").innerHTML = facultyData.events.map(e => {
        const dObj = new Date(e.created_at.endsWith('Z') ? e.created_at : e.created_at + 'Z');
        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-emerald-300 flex flex-col bg-white cursor-pointer transition mb-3" onclick="openQRPanel('${e.id}', '${e.name}')">
                <div class="flex justify-between items-center mb-2">
                    <p class="font-bold text-gray-800 text-lg">${e.name}</p>
                    <span class="text-[10px] bg-${e.is_active?'emerald':'gray'}-100 text-${e.is_active?'emerald':'gray'}-800 px-2 py-1 rounded-full font-bold uppercase tracking-wide border">${e.is_active?'Active':'Closed'}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">${e.description || 'No description provided'}</p>
                <div class="flex items-center gap-3 mt-auto">
                    <p class="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded shadow-sm">🕒 IST: ${dObj.toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
                    <p class="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded shadow-sm">👥 ${e.attendance_count} Scans</p>
                </div>
            </div>
        `;
    }).join("");
}

function openQRPanel(eventId, eventName) {
    document.getElementById('faculty-active-event-panel').classList.remove('hidden');
    document.getElementById('active-event-title').innerText = eventName;
    currentActiveEventId = eventId;
    endQRSession();
}

async function startQRSession() {
    if(!currentActiveEventId) return;
    
    document.getElementById('btn-start-qr').classList.add('hidden');
    document.getElementById('btn-stop-qr').classList.remove('hidden');
    document.getElementById('qr-timer-container').classList.remove('hidden');
    
    generateQR();
    qrRefreshInterval = setInterval(generateQR, 60000);
}

function endQRSession() {
    if(qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
        qrRefreshInterval = null;
    }
    document.getElementById('btn-start-qr').classList.remove('hidden');
    document.getElementById('btn-stop-qr').classList.add('hidden');
    document.getElementById('qr-timer-container').classList.add('hidden');
    
    const qrDisplay = document.getElementById("qrcode-display");
    qrDisplay.innerHTML = "<p class='text-gray-400 font-semibold text-center mt-10'>Session ended. Click 'Generate Secure QR' to reopen.</p>";
}

async function generateQR() {
    try {
        const data = await apiCall(`/events/${currentActiveEventId}/qr`);
        const qrDisplay = document.getElementById("qrcode-display");
        qrDisplay.innerHTML = "";
        new QRCode(qrDisplay, {
            text: data.qr_token,
            width: 256,
            height: 256,
            colorDark: "#059669",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        let timeLeft = 60;
        document.getElementById("qr-timer").innerText = timeLeft;
        const countdown = setInterval(() => {
            timeLeft--;
            const timerEl = document.getElementById("qr-timer");
            if(timerEl) timerEl.innerText = timeLeft;
            if(timeLeft <= 0 || !qrRefreshInterval) clearInterval(countdown);
        }, 1000);
        
    } catch(err) {
        console.error("QR Generation Loop Interrupted: " + err.message);
        const qrDisplay = document.getElementById("qrcode-display");
        qrDisplay.innerHTML = `<p class='text-red-500 font-bold text-center mt-10'>API Delay: Retrying QR token broadcast in 60s...</p>`;
    }
}

function renderAttendance() {
    const allAttList = facultyData.events.flatMap(e => e.attendance.map(a => ({...a, event_name: e.name})))
                        .sort((a,b) => new Date(b.scanned_at) - new Date(a.scanned_at));
                        
    document.getElementById("table-attendance").innerHTML = allAttList.map(a => {
        const dObj = new Date(a.scanned_at.endsWith('Z') ? a.scanned_at : a.scanned_at + 'Z');
        return `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-4 py-3 whitespace-nowrap font-bold text-gray-800">${a.event_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-700">${a.student_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">${a.enrollment}</td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-600">${dObj.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</td>
                <td class="px-4 py-3 whitespace-nowrap font-bold text-emerald-500">Present (Verified)</td>
            </tr>
        `;
    }).join("");
}

function renderWinners() {
    const wlist = facultyData.events.flatMap(e => (e.winners || []).map(w => ({...w, event_name: e.name})));
    document.getElementById("win-list").innerHTML = wlist.map(w => `
        <li class="p-4 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center shadow-sm">
            <div>
                <p class="font-bold text-indigo-700 text-lg">${w.position}</p>
                <p class="text-sm font-semibold text-gray-800">${w.name}</p>
            </div>
            <p class="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded shadow-sm font-bold border border-indigo-200">${w.event_name}</p>
        </li>
    `).join("");
}

document.getElementById("create-event-form")?.addEventListener("submit", async(e) => {
    e.preventDefault();
    try {
        await apiCall("/events/", "POST", {
            name: document.getElementById("ev-name").value,
            description: document.getElementById("ev-desc").value
        });
        document.getElementById("create-event-modal").classList.add("hidden");
        document.getElementById("create-event-form").reset();
        initFaculty();
    } catch(err) {
        alert("Failed to mark event: " + err.message);
    }
});

document.getElementById("form-winner")?.addEventListener("submit", async(e) => {
    e.preventDefault();
    const evId = document.getElementById("win-event").value;
    try {
        await apiCall(`/events/winners`, "POST", {
            event_id: parseInt(evId),
            student_id: parseInt(document.getElementById("win-student").value),
            position: document.getElementById("win-pos").value
        });
        document.getElementById("form-winner").reset();
        initFaculty();
    } catch(err) {
        alert("Failed to lock winner: " + err.message);
    }
});

window.logout = () => {
    localStorage.removeItem("urjotsav_token");
    window.location.href = "/login.html";
};
