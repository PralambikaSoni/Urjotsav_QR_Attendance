import requests
r = requests.post("http://localhost:8000/api/auth/login", data={"username": "Pralambika_Soni_", "password": "12"})
if r.status_code == 200:
    tok = r.json()["access_token"]
    res = requests.post("http://localhost:8000/api/attendance/mark", headers={"Authorization": f"Bearer {tok}"}, json={"token": "fake_qr_here"})
    print("STATUS:", res.status_code)
    print("BODY:", res.text)
else:
    print("LOGIN FAILED!", r.status_code, r.text)
