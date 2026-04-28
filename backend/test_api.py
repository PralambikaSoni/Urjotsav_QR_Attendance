import requests

def run_tests():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Create fake student
    print("1. Registering fake student...")
    res = requests.post(f"{base_url}/api/auth/register", json={
        "username": "fakestudent2",
        "email": "fakestudent2@test.com",
        "full_name": "Fake Student 2",
        "password": "password123",
        "role": "student",
        "enrollment_number": "ENR12345",
        "branch": "CS"
    })
    if res.status_code not in (200, 201, 400):
        print("Registration failed:", res.json())
        
    # 2. Login fake student
    print("2. Logging in fake student...")
    res = requests.post(f"{base_url}/api/auth/login", data={
        "username": "fakestudent2",
        "password": "password123"
    })
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("Student token obtained.")

    # 3. Create fake faculty
    print("3. Registering fake faculty...")
    res = requests.post(f"{base_url}/api/auth/register", json={
        "username": "fakefaculty2",
        "email": "fakefaculty2@test.com",
        "full_name": "Fake Faculty 2",
        "password": "password123",
        "role": "faculty"
    })
    
    # 4. Login fake faculty
    print("4. Logging in fake faculty...")
    res = requests.post(f"{base_url}/api/auth/login", data={
        "username": "fakefaculty2",
        "password": "password123"
    })
    faculty_token = res.json()["access_token"]
    faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
    print("Faculty token obtained.")
    
    # 5. Faculty creates an event
    print("5. Faculty creates an event...")
    res = requests.post(f"{base_url}/api/events/", json={
        "name": "Fake Test Event 2",
        "description": "For testing purposes",
        "is_active": True
    }, headers=faculty_headers)
    event_id = res.json()["id"]
    print(f"Event created with ID: {event_id}")

    # 6. Faculty generates QR for the event
    print("6. Faculty generates QR token...")
    res = requests.get(f"{base_url}/api/events/{event_id}/qr", headers=faculty_headers)
    qr_token = res.json()["qr_token"]
    print("QR Token obtained.")

    # 7. Faculty tries to mark attendance (SHOULD FAIL)
    print("7. Faculty tries to mark attendance...")
    res = requests.post(f"{base_url}/api/attendance/mark", json={"token": qr_token}, headers=faculty_headers)
    print("Faculty marking response:", res.status_code, res.json())
    if res.status_code != 403:
        print("ERROR: Faculty should not be able to mark attendance!")
        
    # 8. Student tries to mark attendance (SHOULD SUCCEED)
    print("8. Student tries to mark attendance...")
    res = requests.post(f"{base_url}/api/attendance/mark", json={"token": qr_token}, headers=student_headers)
    print("Student marking response:", res.status_code, res.json())
    if res.status_code not in (200, 201):
        print("ERROR: Student failed to mark attendance!")
        
    # 9. Student tries to mark attendance again (SHOULD FAIL)
    print("9. Student tries to mark attendance again...")
    res = requests.post(f"{base_url}/api/attendance/mark", json={"token": qr_token}, headers=student_headers)
    print("Student marking response:", res.status_code, res.json())
    if res.status_code != 400:
        print("ERROR: Student was able to mark attendance twice!")
        
    print("Test Complete.")

if __name__ == "__main__":
    run_tests()
