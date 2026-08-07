/** Icon + lớp màu theo loại file, dùng cho danh sách danh mục / kho tri thức. */
export interface FileTypeIcon {
  icon: string;
  cls: string;
}

/**
 * Suy ra icon theo phần mở rộng tên file.
 * PDF / Excel / Word / văn bản thuần có màu riêng để nhận diện nhanh.
 */
export function fileTypeIcon(fileName?: string | null): FileTypeIcon {
  const ext = (fileName ?? '').toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf':
      return { icon: 'picture_as_pdf', cls: 'ft-pdf' };
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'csv':
      return { icon: 'table_chart', cls: 'ft-excel' };
    case 'doc':
    case 'docx':
    case 'rtf':
      return { icon: 'description', cls: 'ft-word' };
    case 'txt':
    case 'md':
      return { icon: 'article', cls: 'ft-text' };
    default:
      return { icon: 'insert_drive_file', cls: 'ft-default' };
  }
}
