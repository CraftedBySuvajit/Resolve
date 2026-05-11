import os
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import string
import random
import secrets
from functools import wraps
import jwt

# Initialize Flask
app = Flask(__name__)
CORS(app)

# Load environment variables from .env
load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1" if SUPABASE_URL else None

ADMIN_USERNAME = os.getenv('ADMIN_USERNAME')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
ADMIN_TOKEN_TTL_SECONDS = int(os.getenv('ADMIN_TOKEN_TTL_SECONDS', '43200'))
USER_TOKEN_TTL_SECONDS = 43200
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here-change-in-production')

# In-memory stores removed for stateless JWT

active_admin_tokens = {}
active_user_tokens = {}

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY or '',
    'Authorization': f'Bearer {SUPABASE_KEY}' if SUPABASE_KEY else '',
    'Content-Type': 'application/json'
}


def supabase_request(method, path, params=None, payload=None, prefer_return=False):
    if not SUPABASE_REST_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase environment variables (SUPABASE_URL or SUPABASE_KEY) are missing. Please add them to your Vercel project settings.")

    headers = dict(SUPABASE_HEADERS)
    if prefer_return:
        headers['Prefer'] = 'return=representation'

    response = requests.request(
        method=method,
        url=f"{SUPABASE_REST_URL}/{path}",
        headers=headers,
        params=params,
        json=payload,
        timeout=30,
    )

    if response.status_code >= 400:
        raise RuntimeError(response.text)

    if response.text:
        return response.json()
    return []


def create_admin_token():
    payload = {
        'role': 'admin',
        'exp': datetime.now().timestamp() + ADMIN_TOKEN_TTL_SECONDS
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def is_valid_admin_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload.get('role') == 'admin'
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False


def create_user_token(user_id, name, email, phone):
    payload = {
        'id': user_id,
        'name': name,
        'email': email,
        'phone': phone,
        'exp': datetime.now().timestamp() + USER_TOKEN_TTL_SECONDS
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def require_admin_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'message': 'Unauthorized'}), 401

        token = auth_header.split(' ', 1)[1].strip()
        if not is_valid_admin_token(token):
            return jsonify({'message': 'Unauthorized'}), 401

        return fn(*args, **kwargs)

    return wrapper


def require_user_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'message': 'Unauthorized: Missing or invalid token'}), 401

        token = auth_header.split(' ', 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user = payload
            return fn(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Unauthorized: Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Unauthorized: Token invalid'}), 401

    return wrapper

# ============= UTILITY FUNCTIONS =============

def generate_token():
    """Generate a unique complaint token"""
    date_str = datetime.now().strftime("%Y%m%d")
    random_digits = ''.join(random.choices(string.digits, k=4))
    return f"TKN-{date_str}-{random_digits}"

# ============= PUBLIC API ENDPOINTS =============

@app.route('/', methods=['GET'])
@app.route('/api', methods=['GET'])
@app.route('/api/', methods=['GET'])
def api_info():
    """Base endpoint to avoid ambiguous 404s when users open API root."""
    return jsonify({
        'status': 'ok',
        'message': 'Complaint API is running',
        'endpoints': [
            'POST /api/register',
            'POST /api/login',
            'POST /api/complaints',
            'GET /api/complaints/track/<token>',
            'GET /api/complaints/me',
            'GET /api/complaints/all',
            'POST /api/admin/login',
            'GET /api/admin/complaints',
            'PUT /api/admin/complaints/<id>',
            'DELETE /api/admin/complaints/<id>',
            'GET /api/admin/stats',
            'GET /api/health'
        ]
    }), 200

@app.route('/api/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.json
        required_fields = ['name', 'email', 'password', 'phone']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Missing required fields: name, email, password, phone'}), 400
            
        # Check if email exists
        existing = supabase_request(method='GET', path='users', params={'email': f"eq.{data['email']}"})
        if existing:
            return jsonify({'message': 'Email already registered'}), 400
            
        user_data = {
            'name': data['name'],
            'email': data['email'],
            'phone': data['phone'],
            'password': generate_password_hash(data['password']),
            'created_at': datetime.now().isoformat()
        }
        
        response = supabase_request(method='POST', path='users', payload=user_data, prefer_return=True)
        if response:
            return jsonify({'message': 'Registration successful'}), 201
        return jsonify({'message': 'Error creating user'}), 500
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    """Login a user"""
    try:
        data = request.json
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        users = supabase_request(method='GET', path='users', params={'email': f"eq.{email}"})
        if not users:
            return jsonify({'message': 'Invalid email or password'}), 401
            
        user = users[0]
        if not check_password_hash(user['password'], password):
            return jsonify({'message': 'Invalid email or password'}), 401
            
        token = create_user_token(user['id'], user['name'], user['email'], user.get('phone', ''))
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'phone': user.get('phone', '')}
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/api/complaints', methods=['POST'])
@require_user_auth
def create_complaint():
    """Submit a new complaint"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['subject', 'description']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400

        # Generate unique token
        token = generate_token()
        
        # Prepare complaint data
        complaint = {
            'user_id': request.user['id'],
            'token': token,
            'name': request.user['name'],
            'email': request.user['email'],
            'phone': request.user.get('phone', ''),
            'subject': data['subject'],
            'description': data['description'],
            'status': 'pending',
            'reply': None,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

        # Insert into Supabase
        response = supabase_request(
            method='POST',
            path='complaints',
            payload=complaint,
            prefer_return=True,
        )

        if response:
            return jsonify({
                'message': 'Complaint submitted successfully',
                'token': token,
                'id': response[0]['id']
            }), 201
        else:
            return jsonify({'message': 'Error saving complaint'}), 500

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'message': f'Error: {str(e)}'}), 500


@app.route('/api/complaints/track/<token>', methods=['GET'])
def track_complaint(token):
    """Track a complaint by token"""
    try:
        response = supabase_request(
            method='GET',
            path='complaints',
            params={'select': '*', 'token': f'eq.{token}'},
        )

        if response and len(response) > 0:
            complaint = response[0]
            return jsonify(complaint), 200
        else:
            return jsonify({'message': 'Complaint not found'}), 404

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@app.route('/api/complaints/track', methods=['GET'])
def track_complaint_without_token():
    """Return clear validation message when token is missing in URL path."""
    return jsonify({'message': 'Token is required in path: /api/complaints/track/<token>'}), 400


@app.route('/api/complaints/me', methods=['GET'])
@require_user_auth
def get_my_complaints():
    """Get complaints for the logged in user"""
    try:
        response = supabase_request(
            method='GET',
            path='complaints',
            params={
                'select': '*',
                'user_id': f"eq.{request.user['id']}",
                'order': 'created_at.desc',
            },
        )
        return jsonify(response), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@app.route('/api/complaints/all', methods=['GET'])
def get_all_public_complaints():
    """Get all complaints for public view (universal stacking)"""
    try:
        response = supabase_request(
            method='GET',
            path='complaints',
            params={
                'select': '*',
                'order': 'created_at.desc',
            },
        )

        return jsonify(response), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ============= ADMIN API ENDPOINTS =============

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Authenticate admin and return access token"""
    try:
        data = request.json or {}
        admin_id = (data.get('adminId') or '').strip()
        admin_password = data.get('adminPassword') or ''

        # Query Supabase for admin
        response = supabase_request(
            method='GET',
            path='admins',
            params={'username': f'eq.{admin_id}'},
        )

        if not response:
            return jsonify({'message': 'Invalid credentials'}), 401

        admin = response[0]
        # Check password hash
        if not check_password_hash(admin['password'], admin_password):
            return jsonify({'message': 'Invalid credentials'}), 401

        token = create_admin_token()
        return jsonify({'message': 'Login successful', 'token': token}), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/api/admin/complaints', methods=['GET'])
@require_admin_auth
def get_all_complaints():
    """Get all complaints (admin only)"""
    try:
        response = supabase_request(
            method='GET',
            path='complaints',
            params={'select': '*', 'order': 'created_at.desc'},
        )
        return jsonify(response), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@app.route('/api/admin/complaints/<int:complaint_id>', methods=['PUT'])
@require_admin_auth
def update_complaint(complaint_id):
    """Update complaint status and reply (admin only)"""
    try:
        data = request.json
        # Prepare update data
        update_data = {
            'status': data.get('status'),
            'reply': data.get('reply'),
            'updated_at': datetime.now().isoformat()
        }

        # Update in Supabase
        response = supabase_request(
            method='PATCH',
            path='complaints',
            params={'id': f'eq.{complaint_id}'},
            payload=update_data,
            prefer_return=True,
        )

        if response:
            return jsonify({'message': 'Complaint updated successfully'}), 200
        else:
            return jsonify({'message': 'Error updating complaint'}), 500

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@app.route('/api/admin/complaints/<int:complaint_id>', methods=['DELETE'])
@require_admin_auth
def delete_complaint(complaint_id):
    """Delete a complaint (admin only)"""
    try:
        supabase_request(
            method='DELETE',
            path='complaints',
            params={'id': f'eq.{complaint_id}'},
        )
        return jsonify({'message': 'Complaint deleted successfully'}), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@app.route('/api/admin/stats', methods=['GET'])
@require_admin_auth
def get_stats():
    """Get complaint statistics (admin only)"""
    try:
        complaints = supabase_request(
            method='GET',
            path='complaints',
            params={'select': 'status'},
        )

        stats = {
            'total': len(complaints),
            'pending': len([c for c in complaints if c['status'] == 'pending']),
            'in_progress': len([c for c in complaints if c['status'] == 'in_progress']),
            'resolved': len([c for c in complaints if c['status'] == 'resolved'])
        }

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ============= HEALTH CHECK =============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'API is running'}), 200


# ============= ERROR HANDLERS =============

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'requested path is invalid', 'message': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500


# ============= MAIN =============

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
