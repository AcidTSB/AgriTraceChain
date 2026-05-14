import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

function HeroSection({ batchCode, setBatchCode, onSubmitCode, onNavigate }) {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-12 md:flex-row md:gap-16 md:px-8 md:py-24">
      <div className="flex flex-1 flex-col items-center space-y-6 text-center md:items-start md:space-y-8 md:text-left">
        <h1 className="font-headline text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl md:text-6xl">
          {t("public.landingTitle")}
        </h1>
        <p className="max-w-2xl font-body text-lg leading-relaxed text-on-surface-variant sm:text-xl">
          {t("public.landingDesc")}
        </p>

        <form className="mx-auto flex w-full max-w-md flex-col gap-4 pt-4 md:mx-0 md:flex-row" onSubmit={onSubmitCode}>
          <Input
            id="batch-code"
            placeholder={t("public.enterBatchCode")}
            value={batchCode}
            onChange={(event) => setBatchCode(event.target.value)}
            containerClassName="flex-1 w-full"
          />
          <Button type="submit" variant="primary" className="w-full md:w-auto">
            {t("public.viewTraceResult")}
          </Button>
        </form>

        <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-2 sm:flex-row sm:justify-center md:mx-0 md:justify-start">
          <Button variant="secondary" onClick={() => onNavigate("/scan-qr")} className="w-full sm:w-auto">
            {t("common.scanQr")}
          </Button>
          <Button variant="ghost" onClick={() => onNavigate("/trace-entry")} className="w-full sm:w-auto">
            {t("public.traceEntry")}
          </Button>
        </div>
      </div>
      <div className="relative mt-8 flex w-full max-w-md flex-1 items-center justify-center md:mt-0 md:max-w-none">
        <div className="absolute inset-0 rounded-full bg-primary-container/20 blur-3xl"></div>
        <img
          alt="Farmer checking crops"
          className="relative z-10 h-auto w-full rounded-xl object-cover shadow-[0px_12px_32px_rgba(17,28,45,0.06)]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIV_t-Exyw-K2iaEj2XztOdyrZqPjtQiFHai-9wsOWDQbbntjA7v69wNaXqNeX6Lv-1xL1HN3LLdcKrvLGWDdb-m7cHHBvuspuBSTMH-g7IgOSyGnDJnbNZF4ahEF1FqDSQdxzNJYCTTodofHEE7RcXcYraxjbAEvwaH2ijkChpwWZ91kOm7yhmy5zP8aY6dmgN4akqKwliXu2tUPj545O56W7EJhVGxubzNYjheFGM9ScOFOmFLCNItWQC1UecTft29JGi4m6NaZt"
        />
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="mt-8 bg-surface-container-low px-4 py-12 md:mt-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Quy trình 3 bước đơn giản</h2>
          <p className="mt-4 font-body text-base text-on-surface-variant sm:text-lg">Ứng dụng công nghệ để nâng tầm nông sản</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
          <div className="relative rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-[0px_4px_16px_rgba(17,28,45,0.04)] sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest">
              <span className="material-symbols-outlined text-2xl text-primary">add_circle</span>
            </div>
            <h3 className="mb-3 font-headline text-lg font-bold text-on-surface sm:text-xl">Tạo lô</h3>
            <p className="font-body text-sm leading-relaxed text-on-surface-variant sm:text-base">Đăng ký thông tin giống, diện tích và dự kiến thu hoạch lên hệ thống.</p>
          </div>
          <div className="relative rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-[0px_4px_16px_rgba(17,28,45,0.04)] sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest">
              <span className="material-symbols-outlined text-2xl text-primary">edit_document</span>
            </div>
            <h3 className="mb-3 font-headline text-lg font-bold text-on-surface sm:text-xl">Ghi nhật ký</h3>
            <p className="font-body text-sm leading-relaxed text-on-surface-variant sm:text-base">Cập nhật chi tiết các hoạt động canh tác, bón phân, phun thuốc theo thời gian thực.</p>
          </div>
          <div className="relative rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-[0px_4px_16px_rgba(17,28,45,0.04)] sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest">
              <span className="material-symbols-outlined text-2xl text-primary">qr_code_scanner</span>
            </div>
            <h3 className="mb-3 font-headline text-lg font-bold text-on-surface sm:text-xl">Quét QR</h3>
            <p className="font-body text-sm leading-relaxed text-on-surface-variant sm:text-base">Người tiêu dùng quét mã để xem toàn bộ hành trình sản phẩm một cách minh bạch.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-10 lg:space-y-12">
          <div className="text-center lg:text-left">
            <h2 className="mb-4 font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Bảo vệ giá trị nông sản</h2>
            <p className="font-body text-base text-on-surface-variant sm:text-lg">Hệ thống AgriTrace đảm bảo dữ liệu không thể bị thay đổi, mang lại sự tin cậy tuyệt đối cho người tiêu dùng.</p>
          </div>
          <div className="space-y-6 sm:space-y-8">
            <div className="flex gap-4">
              <div className="mt-1 shrink-0">
                <span className="material-symbols-outlined text-primary">lock</span>
              </div>
              <div>
                <h4 className="font-headline text-base font-bold text-on-surface sm:text-lg">Hash + Signature protection</h4>
                <p className="mt-1 font-body text-sm text-on-surface-variant sm:text-base">Dữ liệu được mã hóa và ký số, đảm bảo tính toàn vẹn của thông tin truy xuất.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 shrink-0">
                <span className="material-symbols-outlined text-primary">my_location</span>
              </div>
              <div>
                <h4 className="font-headline text-base font-bold text-on-surface sm:text-lg">Real-time tracking</h4>
                <p className="mt-1 font-body text-sm text-on-surface-variant sm:text-base">Theo dõi quá trình vận chuyển và trạng thái lô hàng theo thời gian thực.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 shrink-0">
                <span className="material-symbols-outlined text-primary">verified_user</span>
              </div>
              <div>
                <h4 className="font-headline text-base font-bold text-on-surface sm:text-lg">Independent Inspection</h4>
                <p className="mt-1 font-body text-sm text-on-surface-variant sm:text-base">Tích hợp dữ liệu kiểm định độc lập, tăng cường độ tin cậy cho sản phẩm.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-6 sm:p-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-container/20 blur-2xl"></div>
            <img
              alt="Fresh vegetables with tech overlay"
              className="relative z-10 h-auto w-full rounded-lg object-cover shadow-[0px_12px_32px_rgba(17,28,45,0.06)]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEmEC2khJO5DoxVqpTyN30VrxAzWMHutKSBgynzodj-qLGOSrYjvRTqJGGyIgiNbZ-_82XlxJctiqYdmW84XTYMaxcyvt4XU0UmQWOgsb3AwIkLzl4EGfsTA_u9iPfTag1B7zvp8K3cw2wAMYPR2Sd00xeBXxAwMnkFeN5uF8UxLLlTrERR7dtI0grB_k5p4vWXlTZ9mdenkeljNrsSwSWmPBwxCGnq4-tkPP8yK62QeFPqLPOqKdhGm0QxHc0RhOL_JFnM8Ousu5s"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [batchCode, setBatchCode] = useState("");

  const onSubmitCode = (event) => {
    event.preventDefault();
    const trimmed = batchCode.trim();
    if (!trimmed) {
      return;
    }
    navigate(`/trace/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="w-full overflow-hidden">
      <HeroSection
        batchCode={batchCode}
        setBatchCode={setBatchCode}
        onSubmitCode={onSubmitCode}
        onNavigate={navigate}
      />
      <HowItWorksSection />
      <FeaturesSection />
    </div>
  );
}