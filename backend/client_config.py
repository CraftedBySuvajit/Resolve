"""
Client Configuration and Helper Functions
For Supabase Integration
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SupabaseConfig:
    """Supabase configuration class"""
    
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL', 'YOUR_SUPABASE_URL')
        self.key = os.getenv('SUPABASE_KEY', 'YOUR_SUPABASE_KEY')
        self.table_name = 'complaints'
    
    def validate(self):
        """Validate configuration"""
        if self.url == 'YOUR_SUPABASE_URL' or self.key == 'YOUR_SUPABASE_KEY':
            raise ValueError(
                'Supabase credentials not configured. '
                'Please set SUPABASE_URL and SUPABASE_KEY in .env file'
            )
        return True
    
    def get_url(self):
        """Get Supabase URL"""
        return self.url
    
    def get_key(self):
        """Get Supabase API Key"""
        return self.key


class ComplaintHelper:
    """Helper functions for complaint management"""
    
    @staticmethod
    def format_complaint(complaint):
        """Format complaint for API response"""
        return {
            'id': complaint.get('id'),
            'token': complaint.get('token'),
            'name': complaint.get('name'),
            'email': complaint.get('email'),
            'phone': complaint.get('phone'),
            'category': complaint.get('category'),
            'description': complaint.get('description'),
            'status': complaint.get('status'),
            'reply': complaint.get('reply'),
            'created_at': complaint.get('created_at'),
            'updated_at': complaint.get('updated_at')
        }
    
    @staticmethod
    def validate_complaint(data):
        """Validate complaint data"""
        required_fields = ['name', 'email', 'phone', 'category', 'description']
        missing = [f for f in required_fields if f not in data or not data[f]]
        
        if missing:
            return False, f"Missing required fields: {', '.join(missing)}"
        
        if len(data.get('name', '')) < 2:
            return False, "Name must be at least 2 characters"
        
        if len(data.get('description', '')) < 10:
            return False, "Description must be at least 10 characters"
        
        return True, "Valid"
    
    @staticmethod
    def get_status_color(status):
        """Get color for status badge"""
        colors = {
            'pending': '#f59e0b',
            'in_progress': '#2563eb',
            'resolved': '#10b981'
        }
        return colors.get(status, '#64748b')


# Export configurations
supabase_config = SupabaseConfig()
complaint_helper = ComplaintHelper()
