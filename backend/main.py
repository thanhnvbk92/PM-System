import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    # Đọc cổng từ biến môi trường, mặc định là 8100
    api_port = int(os.getenv("API_PORT", 8100))
    print(f"Starting PM System Backend on port {api_port}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=api_port, reload=True)
