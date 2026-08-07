/**
 * Quy ước đặt tên cho báo cáo tải về.
 *
 * Tên file luôn có dạng:
 *   "<yyyyMMdd HH-mm-ss> Kết quả kiểm tra XML130 <phần nhận diện>"
 *
 * Tiền tố thời điểm đứng trước để thư mục Downloads tự xếp theo thứ tự kiểm tra;
 * giờ dùng dấu gạch thay dấu hai chấm vì Windows cấm ký tự ":" trong tên file.
 *
 * Phần nhận diện tùy đường vào:
 * - tự chọn file XML  → tên file XML;
 * - kiểm tra một hồ sơ → tên bệnh nhân kèm ngày khám;
 * - kiểm tra cả lô     → để trống, vì bản thân thời điểm đã là thứ phân biệt.
 *
 * Trách nhiệm duy nhất (SRP): ghép chuỗi tên, không biết gì về nội dung báo cáo.
 */
export class ReportNaming {
    /** Tiêu đề in bên trong tài liệu (có khoảng trắng cho dễ đọc). */
    private static readonly TITLE = 'Kết quả kiểm tra XML 130'
    /** Phần cố định trong tên file — viết liền "XML130" như cách gọi trong nghiệp vụ. */
    private static readonly FILE_TITLE = 'Kết quả kiểm tra XML130'

    /** Tiêu đề hiển thị trong file: "Kết quả kiểm tra XML 130 - Nguyễn Văn A 30-07-2026". */
    static title(subject: string): string {
        return subject === '' ? ReportNaming.TITLE : `${ReportNaming.TITLE} - ${subject}`
    }

    /** Gốc tên file tải về (chưa có phần đuôi .docx/.xlsx/.pdf). */
    static fileBase(when: Date, subject: string): string {
        const parts = [ReportNaming.stamp(when), ReportNaming.FILE_TITLE]
        if (subject !== '') parts.push(subject)
        return parts.join(' ')
    }

    /** Thời điểm kiểm tra dạng "20260731 10-20-30". */
    static stamp(when: Date): string {
        const pad = (value: number): string => String(value).padStart(2, '0')
        const day = `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}`
        const time = `${pad(when.getHours())}-${pad(when.getMinutes())}-${pad(when.getSeconds())}`
        return `${day} ${time}`
    }

    /** Nhận diện theo file XML người dùng tự chọn — bỏ đuôi .xml cho tên gọn. */
    static fromXmlFile(fileName: string): string {
        return fileName.replace(/\.xml$/i, '').trim()
    }

    /**
     * Nhận diện theo bệnh nhân: "Nguyễn Văn A 30-07-2026". Ngày khám của HIS ở dạng
     * dd/MM/yyyy nên phải đổi dấu "/" — ký tự này không đặt được trong tên file.
     * Thiếu thông tin nào thì bỏ phần đó chứ không chèn chỗ trống.
     */
    static fromPatient(name: string, examDate: string): string {
        return [name.trim(), examDate.trim().replace(/[/\\]/g, '-')].filter((part) => part !== '').join(' ')
    }
}
