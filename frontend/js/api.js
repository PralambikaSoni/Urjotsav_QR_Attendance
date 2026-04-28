const API_BASE = window.location.protocol === "file:" ? "http://localhost:8000/api" : "/api";

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
    
    const fetchOptions = { method, headers, body: requestBody };
    if (method === "GET") {
        fetchOptions.cache = "no-store";
    }
    const res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    if (!res.ok) {
        if (res.status === 401 && !endpoint.includes('login')) {
            logout();
            return;
        }
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || "API request failed");
    }
    return res.json();
}
