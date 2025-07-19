import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Directories
# No local directories needed - everything is S3-only

# AWS Configuration
S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_DEFAULT_REGION = os.getenv('AWS_DEFAULT_REGION')

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# CORS Configuration
CORS_ORIGINS = ["*"]

# S3 Results Map
S3_RESULTS_MAP_PATH = "/tmp/s3_results_map.json"
if os.path.exists(S3_RESULTS_MAP_PATH):
    with open(S3_RESULTS_MAP_PATH, "r") as f:
        S3_RESULTS_MAP = json.load(f)
else:
    S3_RESULTS_MAP = {}

def save_s3_results_map():
    """Save the S3 results mapping to file"""
    with open(S3_RESULTS_MAP_PATH, "w") as f:
        json.dump(S3_RESULTS_MAP, f) 