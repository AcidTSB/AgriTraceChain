import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../hooks/useAuth';

export function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    pushEnabled: true,
    smsEnabled: false,
    emailEnabled: true,
    inAppEnabled: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (user) {
          const res = await notificationService.getSettings();
          if (res && res.data) {
            setSettings(res.data);
          }
        }
      } catch (error) {
        console.error("Error fetching notification settings", error);
      }
    };
    fetchSettings();
  }, [user]);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('');
    try {
      await notificationService.updateSettings(settings);
      setSaveStatus('success');
    } catch (error) {
      console.error("Error saving settings", error);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const ToggleSwitch = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-slate-200'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
        <h3 className="text-lg font-bold text-slate-900">Cài đặt Thông báo (Notification Settings)</h3>
        <p className="text-sm text-slate-500 mt-1">Quản lý cách bạn nhận cảnh báo về lô hàng và hệ thống.</p>
      </div>
      
      <div className="px-6 py-2">
        <ToggleSwitch
          label="Push Notification"
          description="Nhận thông báo đẩy trên thiết bị (Mock)."
          checked={settings.pushEnabled}
          onChange={() => handleToggle('pushEnabled')}
        />
        
        <ToggleSwitch
          label="Tin nhắn SMS"
          description="Nhận cảnh báo qua tin nhắn điện thoại."
          checked={settings.smsEnabled}
          onChange={() => handleToggle('smsEnabled')}
        />
        
        <ToggleSwitch
          label="Email"
          description="Nhận báo cáo chi tiết qua địa chỉ email đăng ký."
          checked={settings.emailEnabled}
          onChange={() => handleToggle('emailEnabled')}
        />
        
        <ToggleSwitch
          label="Thông báo In-App"
          description="Hiển thị thông báo trên biểu tượng chuông trong ứng dụng."
          checked={settings.inAppEnabled}
          onChange={() => handleToggle('inAppEnabled')}
        />
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span className="text-sm">
          {saveStatus === 'success' && <span className="text-emerald-600 font-medium">Lưu thành công!</span>}
          {saveStatus === 'error' && <span className="text-red-600 font-medium">Lỗi khi lưu!</span>}
        </span>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>
  );
}
