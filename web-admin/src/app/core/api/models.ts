// ===== Kiểu dữ liệu khớp CHÍNH XÁC với backend AIValidation.Api =====

/** Bao response thành công của backend cho auth/admin. */
export interface ApiEnvelope<T> {
  message: string;
  data: T;
}

// --- Auth ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export interface MeResponse {
  id: string;
  email: string;
  fullName: string;
  emailConfirmed: boolean;
  roles: string[];
  permissions: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface ForgotPasswordResult {
  token: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// --- Users (admin) ---
export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  emailConfirmed: boolean;
  isLockedOut: boolean;
  createdAt: string;
  roles: string[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  roles?: string[];
}

export interface UpdateUserRequest {
  fullName?: string;
  isActive?: boolean;
}

export interface AssignRolesRequest {
  roles: string[];
}

// --- Roles & Permissions (admin) ---
export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
  permissions?: string[];
}

export interface UpdateRoleRequest {
  description?: string | null;
}

export interface AssignPermissionsRequest {
  permissions: string[];
}

export interface PermissionDto {
  code: string;
  displayName: string;
  group: string;
}

export interface PermissionGroupDto {
  group: string;
  permissions: PermissionDto[];
}

// --- Documents (RAG) ---
export interface DocumentDto {
  id: number;
  title: string;
  docType: string;
  docNumber?: string | null;
  issuedBy?: string | null;
  sourceFileName?: string | null;
  isActive: boolean;
  createdAt: string;
  /** Ngày có hiệu lực (nếu biết — thường có khi nạp từ văn bản đã tải vbpl.vn). */
  effectiveDate?: string | null;
  /** Ngày hết hiệu lực (null = còn hiệu lực). Văn bản hết hạn bị RAG tự loại. */
  expiryDate?: string | null;
  chunkCount: number;
}

/** Chi tiết văn bản: metadata + toàn văn nội dung đã trích xuất. */
export interface DocumentDetailDto extends DocumentDto {
  content: string;
}

// --- Cấu hình AI (admin) ---
export interface LlmConfigDto {
  mode: 'online' | 'offline';
  hasOnlineApiKey: boolean;
  onlineModel?: string | null;
  onlineFallbackModels?: string[] | null;
  offlineBaseUrl?: string | null;
  offlineModel?: string | null;
  offlineTimeoutSeconds?: number | null;
  effective: {
    provider: string;
    model: string;
    fallbackModels: string[];
    timeoutSeconds: number;
    isConfigured: boolean;
  };
}

export interface LlmConfigUpdate {
  mode: 'online' | 'offline';
  onlineModel?: string | null;
  onlineFallbackModels?: string[] | null;
  offlineBaseUrl?: string | null;
  offlineModel?: string | null;
  offlineTimeoutSeconds?: number | null;
}

export interface LlmTestResult {
  ok: boolean;
  message: string;
}

// --- Cấu hình extension (hình hài robot + hệ sinh hoạt) ---

/** Ba hình hài robot khớp RobotRendererId của extension. */
export type RobotRendererId = 'svg' | 'svgAnim' | 'three';

/** Một mốc ghi đè thời gian của stage (theo id). */
export interface RobotStageThreshold {
  id: string;
  atMs: number;
}

/** Ghi đè ngưỡng thời gian ba nhóm stage. */
export interface RobotLifeThresholds {
  waitEscalation: RobotStageThreshold[];
  seasons: RobotStageThreshold[];
  aging: RobotStageThreshold[];
  /** Bật chế độ ngẫu nhiên cho leo thang chờ AI (đổi hoạt động ngẫu nhiên theo thời gian). */
  waitEscalationRandom: boolean;
}

/** Diện mạo robot 3D (màu/cỡ/logo) — chỉ áp cho hình hài "three". */
export interface RobotAppearanceDto {
  /** Màu thương hiệu hex #RRGGBB, hoặc null = xanh VNPT mặc định. */
  color: string | null;
  /** Cỡ robot theo phần trăm (40–200; 100 = mặc định). */
  scale: number;
  /** Hiện logo trên ngực robot hay không. */
  showLogo: boolean;
  /** Logo tuỳ chỉnh dạng data URL (data:image/...), hoặc null = logo VNPT mặc định. */
  logoDataUrl: string | null;
}

/** Cấu hình extension (GET/PUT /api/admin/extension-config). */
export interface ExtensionConfigDto {
  robotRenderer: RobotRendererId;
  life: RobotLifeThresholds;
  appearance: RobotAppearanceDto;
}

// --- Audit (admin) ---
export interface AuditLogDto {
  id: string;
  action: string;
  userId?: string | null;
  userName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  detail?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AuditPageDto {
  total: number;
  page: number;
  pageSize: number;
  items: AuditLogDto[];
}

// --- Catalog ---
export interface CatalogSourceDto {
  id: number;
  catalogType: string;
  displayName: string;
  fileName: string;
  facilityCode?: string | null;
  rowCount: number;
  importedAt: string;
  isActive: boolean;
  mappedCodeCount: number;
  /** Danh mục đã có bản toàn văn trong kho tri thức chưa (trợ lý hỏi–đáp tra được). */
  inKnowledgeBase: boolean;
}

/** Một dòng trong danh mục HIS. */
export interface CatalogItemDto {
  id: number;
  catalogType: string;
  facilityCode?: string | null;
  code?: string | null;
  hisCode?: string | null;
  name: string;
  unit?: string | null;
  priceBhyt?: number | null;
  priceHospital?: number | null;
  isSuspended: boolean;
  isOutsideBhyt: boolean;
  isActive: boolean;
  metadata?: Record<string, string> | null;
}

export interface CatalogItemsPageDto {
  count: number;
  items: CatalogItemDto[];
}

/**
 * Một đơn vị (cơ sở KCB) trong cây tổ chức: Sở Y tế → Trung tâm Y tế huyện →
 * Trạm Y tế xã. Cây này quyết định hồ sơ XML 130 của một cơ sở được đối chiếu
 * bằng danh mục HIS nào.
 */
export interface FacilityDto {
  id: number;
  /** Mã cơ sở KCB, vd "58028" — trùng MACSKCB trong file XML 130. */
  code: string;
  name: string;
  parentId?: number | null;
  /** Cho phép mượn danh mục của đơn vị cấp trên khi đơn vị này chưa tự nạp. */
  inheritCatalogFromParent: boolean;
  note?: string | null;
  isActive: boolean;
  /** Số LOẠI danh mục đơn vị tự nạp (không tính phần mượn của cấp trên). */
  ownCatalogCount: number;
  /** Đơn vị cấp dưới trực tiếp (chỉ có ở API dạng cây). */
  children: FacilityDto[];
}

/** Dữ liệu thêm/sửa một đơn vị. */
export interface FacilityRequest {
  code: string;
  name: string;
  parentId?: number | null;
  inheritCatalogFromParent: boolean;
  note?: string | null;
  isActive: boolean;
}

/** Danh mục thực tế một đơn vị đang dùng, theo từng loại. */
export interface FacilityCatalogScopeDto {
  facilityCode: string;
  /** Chuỗi ưu tiên: [chính nó, cha, ông...]. */
  chain: string[];
  catalogs: {
    catalogType: string;
    displayName: string;
    facilityCode: string;
    rowCount: number;
    /** true = đang mượn của đơn vị cấp trên. */
    inherited: boolean;
  }[];
}

/**
 * Hợp đồng bán dịch vụ cho MỘT cơ sở KCB. Khóa bản quyền của hợp đồng là thứ máy
 * trạm gửi lên để máy chủ biết "ai đang gọi" và "ai chịu tiền" — KHÔNG bao giờ
 * trả về đây, chỉ có phần đầu khóa để đối chiếu khi hỗ trợ khách hàng.
 */
export interface LicenseDto {
  id: number;
  facilityId: number;
  facilityCode: string;
  facilityName: string;
  /** Phần đầu khóa, vd "ZC-58028-K4M2QP". */
  keyPrefix: string;
  plan: string;
  /** Số hồ sơ đã bao trong giá gói; 0 = không giới hạn. */
  monthlyQuota: number;
  basePrice: number;
  /** Đơn giá mỗi hồ sơ vượt hạn mức. */
  overageUnitPrice: number;
  /** Khóa dùng được cho cả các đơn vị cấp dưới trong cây hay không. */
  coversSubtree: boolean;
  validFrom: string;
  validTo?: string | null;
  isActive: boolean;
  revokedAt?: string | null;
  note?: string | null;
  createdAt: string;
  createdBy?: string | null;
  /** Lần cuối khóa được dùng (cập nhật thưa, sai số tới 5 phút). */
  lastUsedAt?: string | null;
  /** Ngay lúc này khóa có dùng được không (gộp hiệu lực + thu hồi + bật/tắt). */
  usableNow: boolean;
  currentPeriodUnits: number;
  currentPeriodAskCount: number;
}

/** Kết quả cấp / cấp lại khóa — lần DUY NHẤT khóa gốc đi ra khỏi máy chủ. */
export interface IssuedLicenseDto {
  license: LicenseDto;
  key: string;
  message: string;
}

/** Dữ liệu cấp mới / sửa điều khoản hợp đồng. */
export interface LicenseRequest {
  facilityId: number;
  plan: string;
  monthlyQuota: number;
  basePrice: number;
  overageUnitPrice: number;
  coversSubtree: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  note?: string | null;
  isActive: boolean;
}

/** Bảng kê sản lượng một kỳ (yyyyMM). */
export interface BillingPeriodDto {
  period: number;
  lines: BillingLineDto[];
  totalUnits: number;
  totalAmount: number;
  /** Số hợp đồng đã chốt sổ trong kỳ này. */
  closedCount: number;
}

/** Một dòng bảng kê theo cơ sở KCB — tiền TẠM TÍNH theo bảng giá hiện hành. */
export interface BillingLineDto {
  licenseId: number;
  facilityCode: string;
  facilityName: string;
  plan: string;
  includedQuota: number;
  usedUnits: number;
  overageUnits: number;
  askCount: number;
  basePrice: number;
  overageUnitPrice: number;
  totalAmount: number;
  /** Đã có hóa đơn chốt cho kỳ này chưa. */
  closed: boolean;
}

/** Chi tiết sản lượng một hợp đồng trong kỳ — dùng khi khách hàng thắc mắc con số. */
export interface BillingDetailDto {
  period: number;
  line: BillingLineDto;
  byDay: { day: string; units: number; askCount: number }[];
  /** Sản lượng theo ĐƠN VỊ PHÁT SINH — hợp đồng phủ cả nhánh thì đây là các đơn vị con. */
  byFacility: { facilityCode: string; units: number; askCount: number }[];
  topStaff: { staffCode: string; units: number }[];
}

/** Hóa đơn đã chốt: con số của kỳ được đóng băng, sổ phát sinh thêm KHÔNG làm nó đổi. */
export interface InvoiceDto {
  id: number;
  licenseId: number;
  period: number;
  facilityCode: string;
  facilityName: string;
  plan: string;
  includedQuota: number;
  usedUnits: number;
  overageUnits: number;
  askCount: number;
  basePrice: number;
  overageUnitPrice: number;
  totalAmount: number;
  closedAt: string;
  closedBy?: string | null;
}

/** Kết quả chốt sổ một kỳ. */
export interface CloseResultDto {
  period: number;
  createdCount: number;
  /** Số hợp đồng bỏ qua vì đã chốt từ trước. */
  skippedCount: number;
  totalAmount: number;
  invoices: InvoiceDto[];
  message: string;
}
