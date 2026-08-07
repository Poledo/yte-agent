/**
 * Đọc giá trị hiện tại của một element form từ DOM.
 *
 * Đây là NƠI DUY NHẤT định nghĩa cách lấy giá trị field, dùng chung cho
 * MetadataBuilder (lúc quét trang), EventBinder (khi có sự kiện change)
 * và FieldRegistry.refreshValues (trước khi kiểm tra) — tránh mỗi nơi
 * đọc một kiểu rồi lệch nhau.
 *
 * @param element - Element form cần đọc
 * @returns Giá trị hiện tại (chuỗi, số, boolean) hoặc null nếu không phải field nhập liệu
 */
export function readElementValue(element: HTMLElement): string | number | boolean | null {
    if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox') {
            return element.checked
        }
        if (element.type === 'number') {
            return element.value ? parseFloat(element.value) : null
        }
        return element.value
    }

    if (element instanceof HTMLTextAreaElement) {
        return element.value
    }

    if (element instanceof HTMLSelectElement) {
        return element.value
    }

    return null
}
