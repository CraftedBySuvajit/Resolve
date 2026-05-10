import sys
import os

# Add the project root to the python path so it can find 'backend'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
