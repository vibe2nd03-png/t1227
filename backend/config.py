import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    CLIMATE_API_KEY: str = os.getenv("CLIMATE_API_KEY", "")
    CLIMATE_API_BASE_URL: str = os.getenv("CLIMATE_API_BASE_URL", "https://climate.gg.go.kr/ols/data/api")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Supabase 설정
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")  # service_role 키 권장

settings = Settings()
