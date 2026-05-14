import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

function truncateText(value, max = 46) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}...`;
}

export function QRScanner({ onScanSuccess, className = "", initialCameraOn = true }) {
  const [cameraOn, setCameraOn] = useState(initialCameraOn);
  const [scanStatus, setScanStatus] = useState("Chưa kết nối camera");
  const [flashOn, setFlashOn] = useState(false);
  
  // State mới cho người dùng PC chọn Camera
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const scannerRef = useRef(null);
  const readerIdRef = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const fileInputRef = useRef(null);
  const lastScanRef = useRef({ text: null, at: 0 });
  const onScanSuccessRef = useRef(onScanSuccess);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Lấy danh sách Camera (Rất quan trọng cho Laptop/PC)
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Ưu tiên chọn camera sau, nếu không có thì lấy camera đầu tiên tìm thấy
          const backCam = devices.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("sau"));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("Không lấy được danh sách camera:", err);
      });
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn("Lỗi khi dừng camera", err);
      }
    }
  };

  const startScanner = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(readerIdRef.current, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
    }

    setScanStatus("Đang kết nối camera...");
    try {
      const config = { fps: 10, qrbox: { width: 240, height: 240 } };
      
      // Nếu có ID camera cụ thể (từ dropdown) thì dùng ID, nếu không mới dùng facingMode
      const cameraConfig = selectedCameraId 
        ? { deviceId: { exact: selectedCameraId } } 
        : { facingMode: "environment" };

      await scannerRef.current.start(
        cameraConfig,
        config,
        (decodedText) => {
          const now = Date.now();
          const last = lastScanRef.current;
          if (last.text === decodedText && now - last.at < 2500) return;
          lastScanRef.current = { text: decodedText, at: now };

          try {
            onScanSuccessRef.current?.(decodedText);
          } catch {}
          setScanStatus(`✅ Đã quét: ${truncateText(decodedText)}`);
        },
        () => {} // Bỏ qua callback lỗi để tránh spam console
      );
    } catch (err) {
      console.error(err);
      setScanStatus("⚠️ Không thể truy cập camera. Vui lòng cấp quyền!");
    }
  };

  // Quản lý vòng đời Bật/Tắt Camera
  useEffect(() => {
    if (cameraOn && selectedCameraId) {
      startScanner();
    } else if (!cameraOn) {
      stopScanner().then(() => setScanStatus("Đã tắt camera"));
    }

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, selectedCameraId]);

  const toggleCamera = () => setCameraOn((prev) => !prev);

  const onPickFromLibrary = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Bắt buộc phải stop video stream thì mới quét ảnh tĩnh được
      await stopScanner();
      setScanStatus("Đang phân tích ảnh...");

      // Cần dùng instance mới để quét ảnh tĩnh
      const fileScanner = new Html5Qrcode(readerIdRef.current);
      const decodedText = await fileScanner.scanFile(file, true);
      
      setScanStatus(`✅ Đã tìm thấy mã: ${truncateText(decodedText)}`);
      onScanSuccessRef.current?.(decodedText);
    } catch (err) {
      console.error(err);
      setScanStatus("⚠️ Không tìm thấy QR Code trong ảnh");
    } finally {
      if (event.target) event.target.value = "";
      
      // Nếu trước đó đang bật camera, thì 2 giây sau mở camera lại
      if (cameraOn) {
        setTimeout(() => {
          startScanner();
        }, 2000);
      }
    }
  };

  const onToggleFlash = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !scanner.isScanning) {
      setScanStatus("⚠️ Hãy mở camera trước khi bật flash");
      return;
    }

    try {
      const next = !flashOn;
      await scanner.applyVideoConstraints({ advanced: [{ torch: next }] });
      setFlashOn(next);
      setScanStatus(next ? "Đã bật flash" : "Đã tắt flash");
    } catch {
      setScanStatus("⚠️ Trình duyệt/Thiết bị không hỗ trợ flash");
    }
  };

  return (
    <div className={`rounded-3xl bg-black/60 p-8 text-white backdrop-blur-sm md:p-10 ${className}`} style={{ fontFamily: "Inter, Nunito, ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mb-6 text-center">
        <p className="text-xl font-bold tracking-wide">QUÉT MÃ QR</p>
        <p className="mt-2 text-sm text-white/80">Vui lòng đặt mã vào giữa khung</p>
        <p className="mt-2 text-xs font-medium text-emerald-400">{scanStatus}</p>
      </div>

      {/* Dropdown chọn Camera cho PC */}
      {cameras.length > 1 && (
        <div className="mx-auto mb-4 max-w-[360px]">
          <select
            className="w-full rounded-xl bg-white/10 p-2.5 text-sm text-white outline-none ring-1 ring-white/30 backdrop-blur-md focus:ring-emerald-500"
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            disabled={!cameraOn}
          >
            {cameras.map((cam, idx) => (
              <option key={cam.id} value={cam.id} className="text-black">
                {cam.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl bg-black shadow-2xl">
        <div id={readerIdRef.current} className="absolute inset-0" />

        <div className="pointer-events-none absolute left-4 top-4 h-10 w-10 border-l-4 border-t-4 border-white" />
        <div className="pointer-events-none absolute right-4 top-4 h-10 w-10 border-r-4 border-t-4 border-white" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 border-b-4 border-l-4 border-white" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-10 w-10 border-b-4 border-r-4 border-white" />

        {!cameraOn ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <span className="text-sm font-semibold text-white/90">Camera đang tắt</span>
          </div>
        ) : null}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

      <div className="mt-8 flex flex-row items-start justify-center gap-6 md:gap-8">
        
        {/* Nút Bật/Tắt Camera */}
        <button type="button" onClick={toggleCamera} className="group flex flex-col items-center gap-2">
          <span className={`flex h-14 w-14 items-center justify-center rounded-full ring-1 transition ${cameraOn ? "bg-emerald-500/20 ring-emerald-400 group-hover:bg-emerald-500/30" : "bg-red-500/20 ring-red-400 group-hover:bg-red-500/30"}`}>
            <svg viewBox="0 0 24 24" className={`h-6 w-6 ${cameraOn ? "text-emerald-400" : "text-red-400"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {cameraOn ? (
                <>
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </>
              ) : (
                <>
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </>
              )}
            </svg>
          </span>
          <span className="text-xs font-semibold text-white/90">{cameraOn ? "Tắt Camera" : "Bật Camera"}</span>
        </button>

        {/* Nút Thư Viện */}
        <button type="button" onClick={onPickFromLibrary} className="group flex flex-col items-center gap-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 transition group-hover:bg-white/25">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </span>
          <span className="text-xs font-semibold text-white/90">Mở thư viện</span>
        </button>

        {/* Nút Flash */}
        <button type="button" onClick={onToggleFlash} className="group flex flex-col items-center gap-2">
          <span className={`flex h-14 w-14 items-center justify-center rounded-full ring-1 transition ${flashOn ? "bg-yellow-400/25 ring-yellow-300/70" : "bg-white/15 ring-white/30 group-hover:bg-white/25"}`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M13 2 6 13h5l-1 9 8-12h-5z" />
            </svg>
          </span>
          <span className="text-xs font-semibold text-white/90">Bật Flash</span>
        </button>
      </div>

      <style>{`
        #${readerIdRef.current} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1rem !important;
        }
        #${readerIdRef.current} > div {
          border: 0 !important;
        }
      `}</style>
    </div>
  );
}