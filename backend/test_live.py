import requests
import json
import random
import string

BASE_URL = 'https://resolve-s.vercel.app/api'

def run_test():
    print("1. Registering user on live site...")
    email = f"test_{''.join(random.choices(string.ascii_lowercase, k=5))}@example.com"
    reg_data = {
        "name": "Test User",
        "email": email,
        "password": "password123",
        "phone": "1234567890"
    }
    r = requests.post(f"{BASE_URL}/register", json=reg_data)
    print(f"Register status: {r.status_code}")
    if r.status_code != 201:
        print("Register failed:", r.text)
        return False
        
    print("2. Logging in on live site...")
    login_data = {"email": email, "password": "password123"}
    r = requests.post(f"{BASE_URL}/login", json=login_data)
    print(f"Login status: {r.status_code}")
    if r.status_code != 200:
        print("Login failed:", r.text)
        return False
        
    token = r.json()['token']
    print(f"Got token: {token[:10]}...")
    
    print("3. Submitting complaint on live site...")
    headers = {"Authorization": f"Bearer {token}"}
    complaint_data = {
        "name": "Test User",
        "email": email,
        "phone": "1234567890",
        "subject": "Billing Error",
        "description": "Double charged for the same service."
    }
    r = requests.post(f"{BASE_URL}/complaints", json=complaint_data, headers=headers)
    print(f"Submit complaint status: {r.status_code}")
    if r.status_code != 201:
        print("Submit complaint failed:", r.text)
        return False
        
    complaint_token = r.json()['token']
    print(f"Generated Complaint Token: {complaint_token}")
    
    print("4. Fetching my complaints on live site...")
    r = requests.get(f"{BASE_URL}/complaints/me", headers=headers)
    print(f"Get my complaints status: {r.status_code}")
    if r.status_code == 200:
        print(f"Found {len(r.json())} complaints.")
    else:
        print("Get my complaints failed:", r.text)
        return False
        
    print("LIVE TESTS PASSED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    run_test()
