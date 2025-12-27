import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    CLIMATE_API_KEY: str = os.getenv("CLIMATE_API_KEY", "")
    CLIMATE_API_BASE_URL: str = os.getenv("CLIMATE_API_BASE_URL", "https://climate.gg.go.kr/ols/data/api")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()
