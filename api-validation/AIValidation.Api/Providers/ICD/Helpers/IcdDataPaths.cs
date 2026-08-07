namespace AIValidation.Api.Providers.ICD.Helpers;

/// <summary>
/// Xác định đường dẫn thư mục dữ liệu ICD (docs/analysis/03_Icd_data)
/// bằng cách đi ngược từ thư mục chạy lên tới gốc solution.
/// Dùng chung cho IcdProvider (đọc) và IcdSyncService (ghi khi đồng bộ).
/// </summary>
public static class IcdDataPaths
{
    /// <summary>Thư mục chứa các file dữ liệu ICD (icd_rows.json, icd_meta.json...).</summary>
    public static string DataDirectory { get; } = ResolveDataDirectory();

    /// <summary>Đường dẫn file danh mục ICD chính.</summary>
    public static string IcdRowsPath => Path.Combine(DataDirectory, "icd_rows.json");

    /// <summary>Đường dẫn file metadata (chứa version dùng để so sánh khi đồng bộ).</summary>
    public static string IcdMetaPath => Path.Combine(DataDirectory, "icd_meta.json");

    private static string ResolveDataDirectory()
    {
        // 1) Chạy từ source (dotnet run / F5): đi ngược lên gốc solution để đọc/ghi
        //    thẳng vào cây source — bản đồng bộ ICD được giữ trong git.
        var currentDir = new DirectoryInfo(AppContext.BaseDirectory);
        while (currentDir.Parent != null && !Directory.Exists(Path.Combine(currentDir.FullName, "AIValidation.Api", "docs")))
        {
            currentDir = currentDir.Parent;
        }
        if (currentDir.Parent != null)
        {
            return Path.Combine(currentDir.FullName, "AIValidation.Api", "docs", "analysis", "03_Icd_data");
        }

        // 2) Bản publish/container: KHÔNG có cây source — trước đây rơi xuống gốc ổ đĩa
        //    ("/AIValidation.Api/docs/..." không tồn tại) khiến IcdProvider nạp 0 mã,
        //    mọi mã ICD bị báo "không tồn tại", còn nút "Đồng bộ ICD" ghi file thất bại.
        //    Cách xử lý: dùng Storage/icd-data (PVC — sống sót khi pod khởi động lại,
        //    cùng chỗ với các cấu hình bền khác), lần đầu tự seed từ bản dữ liệu ship
        //    kèm image (csproj copy docs/analysis/03_Icd_data/** vào output).
        var seedDir = Path.Combine(AppContext.BaseDirectory, "docs", "analysis", "03_Icd_data");
        var storageDir = Path.Combine(AppContext.BaseDirectory, "Storage", "icd-data");
        try
        {
            Directory.CreateDirectory(storageDir);
            if (Directory.Exists(seedDir))
            {
                // Chỉ seed file còn thiếu — KHÔNG ghi đè bản mới hơn do "Đồng bộ ICD" đã tải về PVC
                foreach (var file in Directory.GetFiles(seedDir, "*.json"))
                {
                    var dest = Path.Combine(storageDir, Path.GetFileName(file));
                    if (!File.Exists(dest))
                    {
                        File.Copy(file, dest);
                    }
                }
            }
            return storageDir;
        }
        catch
        {
            // Không tạo/ghi được Storage (filesystem chỉ đọc?) — dùng thẳng bản seed trong image
            return seedDir;
        }
    }
}
