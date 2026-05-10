import os
import requests
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1" if SUPABASE_URL else None

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env file.")
    exit(1)

def create_admin(username, password):
    hashed_password = generate_password_hash(password)
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    payload = {
        'username': username,
        'password': hashed_password
    }
    
    response = requests.post(
        f"{SUPABASE_REST_URL}/admins",
        headers=headers,
        json=payload
    )
    
    if response.status_code in [201, 200]:
        print(f"Admin '{username}' created successfully!")
    else:
        print(f"Error creating admin: {response.text}")

if __name__ == '__main__':
    create_admin('sathiofficial', 'sathi/admin')
