/**
 * Kênh liên lạc hai world cho màn hình Gửi bảo hiểm 4210 của VNPT-HIS
 * (vnpt-his.vncare.vn — JSP cũ, khác họ với HIS có màn hình Kiểm tra bảng kê):
 * - GuiBhxhSniffer (src/page, world MAIN) bắt tham số của lượt "Xuất XML KMH"
 *   mà chính người dùng vừa bấm;
 * - GuiBhxhStore (src/content, isolated world) giữ tham số đó cho ChatPanel.
 *
 * Vì sao phải bắt thay vì tự gọi: lượt xuất XML cần rất nhiều tham số phiên
 * (DS_MALK các bệnh nhân đang chọn, TU_NGAY/DEN_NGAY của bộ lọc hiện tại, HCODE
 * cơ sở đăng nhập, uuid JWT...). Mọi thứ đã có sẵn trong request của HIS —
 * extension dùng lại, KHÔNG gọi lại API tìm kiếm và KHÔNG tự đăng nhập.
 */

/** Sniffer phát sự kiện này mỗi khi HIS gửi request XUAT.XML (KMH 130). */
export const GUI_BHXH_EVENT = '__zcGuiBhxhExport__'

/**
 * Content script phát sự kiện này lúc khởi tạo để xin lại lần chụp gần nhất —
 * người dùng có thể đã bấm Xuất XML KMH TRƯỚC khi content script kịp lắng nghe.
 */
export const GUI_BHXH_REQUEST_EVENT = '__zcGuiBhxhExportRequest__'

/** URL RestService của VNPT-HIS — mọi nghiệp vụ JSP đều gọi về đây. */
export const GUI_BHXH_API_MARK = 'restservice'

/** Tên hàm nghiệp vụ xuất XML KMH trong body request. */
export const GUI_BHXH_FUNC_MARK = 'xuat.xml'

/** Đường dẫn màn hình Gửi bảo hiểm 4210 — nơi nút kiểm tra theo lô xuất hiện. */
export const GUI_BHXH_PAGE_MARK = 'ntu02d060_guibaohiem4210'

/**
 * Tham số một lượt "Xuất XML KMH" do người dùng bấm, bắt nguyên xi từ request.
 * Extension gọi lại RestService với đúng bộ tham số này để lấy file XML.
 */
export interface GuiBhxhExportCapture {
    /** Chuỗi JSON trong params[1] của request gốc (chứa DS_MALK, ngày, HCODE...). */
    paramsJson: string
    /** DS_MALK tách sẵn — danh sách mã liên kết bệnh nhân của lượt xuất. */
    maLkList: string[]
    /** HCODE — mã cơ sở KCB đang đăng nhập. */
    hcode: string
    /**
     * uuid (JWT) đính kèm request gốc — HIS dùng để xác thực lượt gọi trong phiên.
     * Gọi lại phải gửi nguyên giá trị này, rỗng nếu request gốc không có.
     */
    uuid: string
    /** Thời điểm bắt được (epoch ms). */
    at: number
}

/** Sniffer phát sự kiện này khi HIS gọi tải file XML Ký tổng (IdgStorageUpload). */
export const GUI_KYTONG_EVENT = '__zcGuiKyTongExport__'

/**
 * Content script phát sự kiện này lúc khởi tạo để xin lại lần chụp gần nhất —
 * người dùng có thể đã bấm Xuất XML Ký tổng TRƯỚC khi content script kịp lắng nghe.
 */
export const GUI_KYTONG_REQUEST_EVENT = '__zcGuiKyTongExportRequest__'

/**
 * API tải file XML Ký tổng đã ký số — xmlid nằm trên query string, JWT nằm ở
 * header Authorization. Response là JSON { code, message, results: "<XML>" }.
 */
export const GUI_KYTONG_API_MARK = 'idgstorageupload'

/** Đường dẫn màn hình Gửi danh sách hồ sơ BHXH 4210 — nơi có nút Xuất XML Ký tổng. */
export const GUI_KYTONG_PAGE_MARK = 'ntu02d061_guidshs_bhxh4210'

/**
 * Tham số một lượt "Xuất XML Ký tổng" do người dùng bấm, bắt nguyên xi từ request.
 * Extension gọi lại đúng liên kết này để lấy file XML đã ký.
 */
export interface GuiKyTongCapture {
    /** URL tải file đầy đủ (IdgStorageUpload?xmlid=...). */
    url: string
    /** JWT ở header Authorization của request gốc — rỗng nếu request không có. */
    auth: string
    /** Thời điểm bắt được (epoch ms). */
    at: number
}
