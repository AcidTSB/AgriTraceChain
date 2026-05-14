import { Card } from "../../components/ui/Card";
import { useTranslation } from "react-i18next";

const faqs = [
  {
    q: "VERIFIED (ĐÃ XÁC MINH) nghĩa là gì?",
    a: "Các bản ghi trên dòng thời gian đã vượt qua kiểm tra toàn vẹn (xác thực chữ ký/chuỗi băm) và không có dấu hiệu bị giả mạo.",
  },
  {
    q: "Tại sao tôi thấy ít chi tiết hơn trên trang truy xuất công khai?",
    a: "Chế độ xem công khai được lọc để bảo vệ hoạt động nội bộ, nhưng vẫn chứng minh được sự tin cậy và trình tự quy trình.",
  },
  {
    q: "Nếu trạng thái là COMPROMISED (BỊ XÂM PHẠM) thì sao?",
    a: "Ít nhất một kiểm tra toàn vẹn đã thất bại. Bạn nên coi lô hàng này là đáng ngờ cho đến khi quá trình rà soát nội bộ hoàn tất.",
  },
  {
    q: "Bất kỳ ai cũng có thể xem dòng thời gian nội bộ không?",
    a: "Không. Chi tiết nội bộ dựa trên vai trò (Nông dân, Kiểm định viên, Quản trị viên) và yêu cầu quyền truy cập đã được xác thực.",
  },
];

export function FaqPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 md:px-6 md:py-14">
      <div>
        <p className="font-body text-sm font-semibold uppercase tracking-wide text-primary">{t("common.faq")}</p>
        <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
          {t("public.faqTitle")}
        </h1>
      </div>

      <div className="space-y-3">
        {faqs.map((item) => (
          <Card key={item.q}>
            <h2 className="font-headline text-lg font-semibold text-on-surface">{item.q}</h2>
            <p className="mt-2 font-body text-sm leading-6 text-on-surface-variant">{item.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
