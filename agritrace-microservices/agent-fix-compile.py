import os
import re
from pathlib import Path

BASE_DIR = Path(r"d:\Coding\Java\AgriTraceChain\agritrace-microservices\user-service")

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("🤖 AI Agent đang càn quét 2 lỗi Compile cuối cùng...")

# 1. Fix FacilityRepository.java (Đổi Optional thành List)
repo_path = BASE_DIR / "src/main/java/com/agritrace/user/repository/FacilityRepository.java"
if repo_path.exists():
    c = read_file(repo_path)
    c = c.replace("java.util.Optional<Facility> findByOwnerId", "java.util.List<Facility> findByOwnerId")
    write_file(repo_path, c)
    print("  ✅ Đã fix: Đổi kiểu trả về của findByOwnerId thành List<Facility>")

# 2. Fix UserServiceImpl.java (Xóa lời gọi .walletAddress trong Builder)
service_path = BASE_DIR / "src/main/java/com/agritrace/user/service/impl/UserServiceImpl.java"
if service_path.exists():
    c = read_file(service_path)
    # Dùng regex để tìm và xóa đoạn .walletAddress(...) 
    c = re.sub(r'\.walletAddress\s*\([^)]*\)', '', c)
    write_file(service_path, c)
    print("  ✅ Đã fix: Gỡ bỏ .walletAddress() trong UserBuilder")

print("🎉 Hoàn tất! Hãy chạy lại lệnh mvn clean package -DskipTests")