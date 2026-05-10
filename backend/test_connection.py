"""
Test Supabase Connection
This script verifies that your Supabase connection is working correctly.
"""

import os
import sys
from dotenv import load_dotenv
import requests

load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://sqczmoskzhbxlnsnlavn.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'sb_publishable_0UGYjHYW1dFzgHzF39h4BA_L_TupW5A')

print("=" * 70)
print("SUPABASE CONNECTION TEST")
print("=" * 70)

print(f"\n📌 Supabase URL: {SUPABASE_URL}")
print(f"📌 API Key: {SUPABASE_KEY[:20]}...")

try:
    print("\n⏳ Connecting to Supabase...")
    print("📊 Testing table access...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/complaints",
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}'
        },
        params={'select': '*', 'limit': '5'},
        timeout=30,
    )
    if response.status_code >= 400:
        raise RuntimeError(response.text)
    print("✅ Connection successful!\n")
    data = response.json()
    
    if data:
        print(f"✅ Successfully accessed 'complaints' table!")
        print(f"📈 Found {len(data)} records\n")
        
        print("Sample Data:")
        for i, complaint in enumerate(data[:3], 1):
            print(f"  {i}. Token: {complaint.get('token')} | Status: {complaint.get('status')}")
    else:
        print("✅ Table exists but is empty (no records yet)\n")

    # Get table structure
    print("\n📋 Database Status: CONNECTED ✅")
    print("=" * 70)
    print("\nNext Steps:")
    print("1. ✅ Connection established")
    print("2. ✅ Database schema created")
    print("3. ✅ Ready to use!")
    print("\nYou can now:")
    print("  • Start the backend: python app.py")
    print("  • Open the frontend: frontend/index.html")
    print("  • Submit complaints and track them")
    print("\n" + "=" * 70)

except Exception as e:
    print(f"\n❌ Connection failed!")
    print(f"Error: {str(e)}")
    if 'PGRST205' in str(e):
        print("\nHint: The table does not exist in the configured project.")
        print("Check SUPABASE_URL in .env and run the schema SQL in that same project.")
    print("\nTroubleshooting:")
    print("1. Verify Supabase URL is correct")
    print("2. Verify API Key is correct")
    print("3. Check internet connection")
    print("4. Ensure 'complaints' table exists in Supabase")
    print("5. Check Supabase project is active")
    sys.exit(1)
