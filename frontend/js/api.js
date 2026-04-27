const API_BASE = "http://localhost:8000/api"; // Defaulting to full path for rapid dev testing

function getToken() { return localStorage.getItem("urjotsav_token"); }
function setToken(token) { localStorage.setItem("urjotsav_token", token); }
function logout() { localStorage.removeItem("urjotsav_token"); window.location.reload(); }

async function apiCall(endpoint, method="GET", body=null) {
    const headers = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    
    let requestBody = null;
    if (body) {
        if (endpoint.includes('login')) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            requestBody = new URLSearchParams(body).toString();
        } else {
            headers["Content-Type"] = "application/json";
            requestBody = JSON.stringify(body);
        }
    }
    
    const res = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: requestBody });
    if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || "API request failed");
    }
    return res.json();
}
