let metricsData = {};
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }
    switchTab('tab-dashboard');
    initAdmin();
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('text-white', 'border-indigo-500', 'border-l-4', 'bg-gray-800'));
    
    document.getElementById(tabId).classList.remove('hidden');
    const navBtn = document.getElementById(tabId.replace('tab', 'nav'));
    if(navBtn) navBtn.classList.add('text-white', 'border-indigo-500', 'border-l-4', 'bg-gray-800');
}

// Global logout for admin panel
window.logout = () => {
    localStorage.removeItem("urjotsav_token");
    window.location.href = "login.html";
};

async function initAdmin() {
    try {
        metricsData = await apiCall("/users/analytics");
        document.getElementById("loading").classList.add("hidden");
        
        renderKPIs();
        renderTables();
        renderCharts();
    } catch(err) {
        console.error(err);
        document.getElementById("loading").innerHTML = "<p class='text-red-500'>Failed to load data. Are you logged in?</p>";
    }
}

function renderKPIs() {
    const s = metricsData.summary || {};
    document.getElementById("kpi-cards").innerHTML = `
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Students</p><p class="text-3xl font-black text-gray-800">${s.total_students || 0}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Faculty</p><p class="text-3xl font-black text-indigo-600">${s.total_faculty || 0}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Events</p><p class="text-3xl font-black text-emerald-600">${s.total_events || 0}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Daily Scans</p><p class="text-3xl font-black text-blue-600">${s.total_attendance || 0}</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Global Avg %</p><p class="text-3xl font-black text-amber-500">${s.avg_attendance_percent || 0}%</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Winners Logged</p><p class="text-3xl font-black text-purple-600">${s.total_winners || 0}</p>
        </div>
    `;
    
    document.getElementById("dash-realtime-logs").innerHTML = (metricsData.recent_logs || []).map(l => {
        const dateObj = new Date(l.timestamp.endsWith('Z') ? l.timestamp : l.timestamp + 'Z');
        const stTime = dateObj.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
        return `<div class="border-b border-gray-100 pb-2"><p class="text-xs text-gray-400 font-mono">${stTime}</p><p class="text-sm font-bold text-gray-800">${l.action}</p><p class="text-xs text-gray-600">${l.details || 'System log'}</p></div>`;
    }).join("");
}

function renderTables() {
    // Students
    document.getElementById("table-students").innerHTML = (metricsData.students || []).map(s => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap font-medium text-gray-900">${s.full_name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-600 font-mono">${s.enrollment_number || '-'}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-500">${s.year || '-'} ${s.branch || '-'} ${s.section || ''}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-500">${s.activity || '-'}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-indigo-600">${s.attendance_count || 0} event(s)</td>
        </tr>
    `).join("");

    // Faculty
    document.getElementById("table-faculty").innerHTML = (metricsData.faculties || []).map(f => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap font-medium text-gray-900">${f.full_name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">${f.username}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-teal-600">${f.events_coordinated} Events</td>
        </tr>
    `).join("");

    // Events
    document.getElementById("table-events").innerHTML = (metricsData.events || []).map(e => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap font-bold text-gray-900">${e.name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">${e.faculty_name}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-blue-600">${e.attendance_count}</td>
            <td class="px-4 py-3 whitespace-nowrap text-purple-600 font-bold">${e.winners ? e.winners.length : 0}</td>
        </tr>
    `).join("");

    // Logs
    document.getElementById("table-logs").innerHTML = (metricsData.recent_logs || []).map(l => {
        const dateObj = new Date(l.timestamp.endsWith('Z') ? l.timestamp : l.timestamp + 'Z');
        const stTime = dateObj.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap">${stTime}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-red-500">${l.action}</td>
            <td class="px-4 py-3 whitespace-nowrap">User ${l.user_id || 'System'}</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-xs">${l.details || '-'}</td>
        </tr>
        `;
    }).join("");
}

function filterStudents() {
    const term = document.getElementById("search-student").value.toLowerCase();
    const rows = document.querySelectorAll("#table-students tr");
    rows.forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(term) ? "" : "none";
    });
}

function renderCharts() {
    const c = metricsData.charts || {};
    
    // Bar Chart
    if(charts.bar) charts.bar.destroy();
    charts.bar = new Chart(document.getElementById("chart-main-bar"), {
        type: 'bar',
        data: {
            labels: Object.keys(c.domains || {}),
            datasets: [{
                label: 'Participation by Domain',
                data: Object.values(c.domains || {}),
                backgroundColor: '#4f46e5',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Activity Bar Chart
    if(charts.activity) charts.activity.destroy();
    charts.activity = new Chart(document.getElementById("chart-activity-bar"), {
        type: 'bar',
        data: {
            labels: Object.keys(c.activities || {}).map(a => a || 'None'),
            datasets: [{
                label: 'Commitment',
                data: Object.values(c.activities || {}),
                backgroundColor: '#059669',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Branch Pie
    if(charts.branch) charts.branch.destroy();
    charts.branch = new Chart(document.getElementById("chart-branch-pie"), {
        type: 'doughnut',
        data: {
            labels: Object.keys(c.domains || {}),
            datasets: [{ data: Object.values(c.domains || {}), backgroundColor: ['#ef4444', '#f97316', '#8b5cf6', '#0ea5e9'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Year Pie
    if(charts.year) charts.year.destroy();
    charts.year = new Chart(document.getElementById("chart-year-pie"), {
        type: 'pie',
        data: {
            labels: Object.keys(c.years || {}),
            datasets: [{ data: Object.values(c.years || {}), backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Faculty creation logic
document.getElementById("create-faculty-form")?.addEventListener("submit", async(e) => {
    e.preventDefault();
    try {
        await apiCall("/users/faculty", "POST", {
            full_name: document.getElementById("fac-name").value,
            username: document.getElementById("fac-user").value,
            password: document.getElementById("fac-pass").value,
            role: "faculty"
        });
        document.getElementById("faculty-modal").classList.add("hidden");
        document.getElementById("create-faculty-form").reset();
        initAdmin(); // reload
    } catch(err) {
        alert("Action restricted: " + err.message);
    }
});
