# Configuration file for the Complaint Management System

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
    DEBUG = False
    
    # CORS
    CORS_HEADERS = 'Content-Type'
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL', 'YOUR_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'YOUR_SUPABASE_KEY')
    
    # Database
    DATABASE_NAME = 'complaints'
    
    # API Configuration
    API_TITLE = 'Complaint Management System API'
    API_VERSION = '1.0.0'


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
