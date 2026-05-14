import os
import re
from pathlib import Path

BASE_DIR = Path(r"d:\Coding\Java\AgriTraceChain\agritrace-microservices")
services = ["user-service", "product-service", "trace-service", "media-service", "api-gateway"]

print("🤖 AI Agent đang càn quét và sửa lỗi Docker Build Context...")

# 1. Sửa docker-compose.yml
dc_path = BASE_DIR / "docker-compose.yml"
if dc_path.exists():
    content = dc_path.read_text(encoding='utf-8')
    for svc in services:
        # Mở rộng context ra thư mục gốc và trỏ lại file Dockerfile
        pattern = rf"context:\s*\./{svc}\s*\r?\n\s*dockerfile:\s*Dockerfile"
        replacement = rf"context: .\n      dockerfile: {svc}/Dockerfile"
        content = re.sub(pattern, replacement, content)
    dc_path.write_text(content, encoding='utf-8')
    print("  ✅ Đã fix: docker-compose.yml (Mở rộng context ra thư mục gốc)")

# 2. Sửa các file Dockerfile
for svc in services:
    df_path = BASE_DIR / svc / "Dockerfile"
    if df_path.exists():
        content = df_path.read_text(encoding='utf-8')
        # Sửa đường dẫn copy common-proto (bỏ ../ vì context đã là thư mục gốc)
        content = content.replace("COPY ../common-proto", "COPY common-proto")
        # Sửa đường dẫn copy source code cho đúng thư mục của service
        content = content.replace("COPY pom.xml .", f"COPY {svc}/pom.xml .")
        content = content.replace("COPY src ./src", f"COPY {svc}/src ./src")
        df_path.write_text(content, encoding='utf-8')
        print(f"  ✅ Đã fix: {svc}/Dockerfile")

print("🎉 Hoàn tất! Bồ hãy chạy lại lệnh: docker-compose build")