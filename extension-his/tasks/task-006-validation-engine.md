# Task 006 - Validation Engine

## Mục tiêu

Xây dựng Validation Engine cho Extension.

Validation Engine là trung tâm xử lý toàn bộ việc kiểm tra dữ liệu.

Module này nhận dữ liệu từ Form Analyzer và Change Tracker,
thực thi các Rule cục bộ,
sau đó trả về danh sách Validation Result.

Task này KHÔNG gọi Backend API.

Task này KHÔNG sử dụng AI.

Task này chỉ thực hiện Validation Local.

---

# User Story

Là nhân viên y tế,

Khi tôi thay đổi dữ liệu trên Form,

Hệ thống phải tự động kiểm tra các Rule,

và trả về các cảnh báo phù hợp.

---

# Kiến trúc

ValidationEngine

├── RuleRegistry

├── RuleExecutor

├── ValidationContext

└── ValidationResult

Mỗi Rule là một module độc lập.

ValidationEngine không chứa business rule.

ValidationEngine chỉ điều phối.

---

# Thư mục

Tạo:

src/content/validation/

ValidationEngine.ts

RuleRegistry.ts

ValidationContext.ts

ValidationResult.ts

rules/

RequiredRule.ts

DateCompareRule.ts

RegexRule.ts

ICDInactiveRule.ts

Rule.ts

---

# Rule Interface

Mỗi Rule phải implement cùng một interface.

Ví dụ:

id

name

priority

validate(context)

Mỗi Rule chỉ có một trách nhiệm.

Không phụ thuộc Rule khác.

---

# ValidationContext

Bao gồm:

Current Page

Current Field

Current Value

Form Values

Field Registry

Metadata

ValidationContext được truyền cho mọi Rule.

---

# ValidationResult

Bao gồm:

RuleId

Field

Level

Title

Message

Suggestion

CanExplain

Metadata

---

# RuleRegistry

Chịu trách nhiệm:

- đăng ký Rule
- bật/tắt Rule
- lấy danh sách Rule

Không thực hiện Validation.

---

# RuleExecutor

Thực thi toàn bộ Rule.

Có thể:

- chạy tất cả
- chạy theo Field
- chạy theo nhóm

---

# ValidationEngine

Public API

validateField()

validateForm()

validate()

ValidationEngine:

- lấy Rule
- chạy Rule
- gom ValidationResult
- trả kết quả

Không hiển thị UI.

Không gọi Notification.

---

# Rule cần tạo

## RequiredRule

Kiểm tra bắt buộc nhập.

Ví dụ:

Mã bệnh nhân

ICD

Ngày khám

---

## DateCompareRule

Ví dụ:

Ngày vào <= Ngày ra

Ngày sinh <= Ngày khám

Ngày cấp <= Ngày hiện tại

---

## RegexRule

Ví dụ:

Số BHYT

CCCD

Mã bệnh nhân

---

## ICDInactiveRule

Tạm thời sử dụng dữ liệu giả.

Ví dụ:

Danh sách ICD không còn sử dụng.

Chỉ hardcode một vài mã để demo.

Ví dụ:

J18.9

A00X

...

Sau này sẽ đọc từ Backend.

---

# Rule Configuration

Tạo thư mục

knowledge/

rules/

master-data/

documents/

Trong Task này chỉ cần:

knowledge/rules/

knowledge/master-data/

knowledge/documents/

Tạo dữ liệu mẫu.

Ví dụ:

required.json

date.json

icd.json

Không cần dữ liệu thật.

---

# Integration

ValidationEngine nhận dữ liệu từ:

Change Tracker

Sau khi validate:

trả ValidationResult

## Content Script Integration (content/index.ts)

NotificationManager sử dụng ValidationEngine result:

- Hook vào changeTracker.onFieldChange() callback
- Khi field change → trigger validationEngine.validate()
- Nếu kết quả có error → call notificationManager.notify()
- Nếu validation pass → call notificationManager.clearFieldError()

## Validation Logic Integration

Để tránh show notification không liên quan:

- Track field focus state (nếu user đã blur field)
- Debounce validation 300ms trên mỗi field (tránh multiple trigger khi typing)
- Khi blur → cancel pending validation timer (nhưng giữ notification visible)
- Chỉ show validation result nếu field vẫn focused

Note: Task này (006) chỉ implement ValidationEngine.
Integration logic ở content/index.ts là part of Task 005 (Notification UI).

Ví dụ:

Validation Result

Field: icdVao

Level: warning

Message:

ICD đã ngừng sử dụng.

---

# Performance

Không validate toàn bộ Form khi chỉ một Field thay đổi.

Ưu tiên validate Field vừa thay đổi.

Có thể validate toàn Form khi được gọi thủ công.

Không sử dụng polling.

Không sử dụng setInterval.

---

# Debug

Console:

[ValidationEngine]

Running validation...

[Rule]

RequiredRule

PASS

[Rule]

DateCompareRule

FAIL

...

---

# Deliverables

Tạo đầy đủ:

ValidationEngine

RuleRegistry

ValidationContext

ValidationResult

Rule Interface

RequiredRule

DateCompareRule

RegexRule

ICDInactiveRule

knowledge/

rules/

master-data/

documents/

---

# Acceptance Criteria

✓ Build thành công.

✓ Không lỗi TypeScript.

✓ Rule hoạt động độc lập.

✓ ValidationEngine hoạt động.

✓ Có thể validate theo Field.

✓ Có thể validate toàn Form.

✓ Console hiển thị ValidationResult.

✓ Không sửa NotificationManager.

✓ Không sửa AssistantBubble.

## Integration & Focus Tracking

✓ Focus state tracking implemented (Set<fieldId> để track focused fields).

✓ Debounce 300ms implementation:

- Mỗi field có timer riêng
- Mỗi field change reset timer
- Blur cancel pending timer

✓ Notification behavior:

- Chỉ show nếu field focused
- Auto-clear nếu validation pass (clearFieldError)
- Dismiss button để xóa thủ công
- Keep visible nếu field unfocused nhưng chưa pass

✓ Không duplicate notification cho cùng một error.

✓ Extend ValidationEngine không tạo ảnh hưởng tới performance.

---

# Không được làm

Không AI.

Không Backend API.

Không Popup.

Không gọi Server.

Không Highlight.

Không Sound.

Không Explain.

---

# Coding Rules

Tuân thủ SOLID.

Không hardcode business logic trong ValidationEngine.

Rule phải độc lập.

Code dễ đọc.

Không sửa module ngoài phạm vi Task.

---

# Hoàn thành Task

Sau khi hoàn thành:

- Review toàn bộ code.
- Build project.
- Tự sửa lỗi compile nếu có.
- Đảm bảo Extension vẫn hoạt động.
- Kiểm tra ValidationEngine.
- Kiểm tra Rule.
- Tóm tắt file tạo mới.
- Tóm tắt file sửa.
- Không thực hiện Task tiếp theo.

---

# Lỗi đã sửa (Fixes)

## 1. Notification không hiển thị

**Lỗi**: ValidationEngine phát hiện lỗi nhưng chỉ console.log, không gọi NotificationManager
**Fix**: Tích hợp NotificationManager vào content/index.ts

- Gọi `notificationManager.notify()` cho mỗi ValidationResult
- Hiển thị error/warning bubble, highlight field, play sound

**File sửa**: `src/content/index.ts`

## 2. Duplicate notification (Multiple submissions)

**Lỗi**: Khi nhập "123ab", validation trigger 5 lần (mỗi ký tự) → 5 notifications
**Fix**: Thêm debounce 300ms cho field changes

- Chỉ validate sau khi user dừng nhập 300ms
- Clear previous timeout khi field change lại
- Tránh duplicate validation

**File sửa**: `src/content/index.ts`

## 3. Debug log chưa đủ

**Lỗi**: RuleExecutor không log bao nhiêu rules được execute
**Fix**: Thêm log `[RuleExecutor] Running X rules for field: Y`

**File sửa**: `src/content/validation/RuleExecutor.ts`

---

# Task History (Latest Fixes)

## 4. ICD Validation - Dropdown không trigger validation

**Lỗi**: Khi chọn ICD từ dropdown, validation không trigger cho maBenhLyVao
**Nguyên nhân**:

1. FieldDiscovery loại bỏ hidden fields → maBenhLyVao không được discover
2. AssistantBubble chỉ mở notification trên first error → dropdown select không thấy notification
3. Hidden field không focus → focusedFields check skip validation

**Fix Applied**:

1. **FieldDiscovery.ts**: Cho phép hidden inputs trong field discovery
    - Sửa: Loại bỏ 'hidden' từ exclusion list
    - Lý do: Dropdown hidden fields (maBenhLyVao) cần được tracking

2. **content/index.ts**:
    - Detect maBenhLyVao change → redirect validation to maBenhLyVao
    - Skip focus check cho hidden fields (`['maBenhLyVao', 'maBenhLyRa', 'maBenhLyChuan']`)
    - Thêm debug logging để track validation flow

3. **AssistantBubble.ts**: Always open notification panel
    - Sửa: Mở panel trên EVERY notification, không chỉ first error
    - Trước: `if (errorCountBefore === 0)` → Sau: Luôn mở

4. **ICDInactiveRule.ts**:
    - Thêm support cho hidden dropdown fields: `'maBenhLyVao', 'maBenhLyRa', 'maBenhLyChuan'`
    - Thêm debug logging để track code validation

**Commits**:

- `be7150c`: Validate icdVao when textIcdVao changes
- `239f16a`: Reduce debounce from 500ms to 300ms
- `97cba64`: Skip textIcdVao validation (search fields)
- `b19d192`: Detect dropdown via maBenhLyVao change
- `983d919`: Validate maBenhLyVao directly
- `4e2dd39`: Skip focus check for hidden fields + debug logging
- `0049be8`: Allow hidden fields in discovery + Always open panel

**Files Sửa**:

- `src/content/analyzer/FieldDiscovery.ts`
- `src/content/index.ts`
- `src/content/notification/AssistantBubble.ts`
- `src/content/validation/rules/ICDInactiveRule.ts`

**Behavior Sau Fix**:

```
User selects ICD from dropdown
  → Fills maBenhLyVao, textIcdVao, icdVao
  → Detect maBenhLyVao change
  → maBenhLyVao discovered ✓
  → Validate maBenhLyVao
  → If inactive code → Warning
  → Panel always opens ✓
```

**Testing**:

- ✓ Direct typing vào icdVao: check OK
- ✓ Dropdown select inactive ICD (A00, B34.9, J18.9, I10X): warning shows ✓
- ✓ Typing search (no select): no validation
- ✓ Notification panel opens on every error ✓
