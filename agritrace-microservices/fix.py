import os
from pathlib import Path

BASE_DIR = Path(r"d:\Coding\Java\AgriTraceChain\agritrace-microservices")
src_file = BASE_DIR / "product-service/src/main/java/com/agritrace/product/service/QRCodeService.java"
dst_dir = BASE_DIR / "media-service/src/main/java/com/agritrace/media/service"
dst_file = dst_dir / "QRCodeService.java"

print("🤖 AI Agent đang điều chuyển QRCodeService về đúng nhà Media Service...")

if src_file.exists():
    # 1. Đọc nội dung file cũ
    content = src_file.read_text(encoding='utf-8')
    
    # 2. Đổi địa chỉ package từ product sang media
    content = content.replace("package com.agritrace.product.service;", "package com.agritrace.media.service;")
    
    # 3. Chuyển sang nhà mới
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst_file.write_text(content, encoding='utf-8')
    print("  ✅ Đã copy và sửa package cho QRCodeService.java bên media-service!")
    
    # 4. Xóa file cũ bên product để tránh lộn xộn
    src_file.unlink()
    print("  ✅ Đã xóa file gốc bên product-service.")
elif dst_file.exists():
    print("  ℹ️ File đã nằm sẵn bên media-service rồi!")
else:
    print("  ⚠️ Không tìm thấy QRCodeService.java ở bên product-service! Bạn kiểm tra lại đường dẫn nhé.")

print("🎉 Hoàn tất! Bồ hãy chạy lại lệnh: docker-compose build")