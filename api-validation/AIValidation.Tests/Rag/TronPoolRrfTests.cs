using AIValidation.Api.Services.Rag;
using Xunit;

namespace AIValidation.Tests.Rag;

/// <summary>
/// Test cách trộn pool ứng viên từ 4 tầng truy hồi.
///
/// Bối cảnh: pool từng được xếp theo ĐIỂM THÔ của từng tầng, mà ba tầng dùng ba thang đo
/// không so sánh được (cosine 0,54–0,59 kể cả đoạn không liên quan; ts_rank ~0,07; độ hiếm
/// ILIKE 1/(1+n) ~0,03). Khi nâng số hit vector từ 15 lên 30, tầng vector chiếm sạch 20 chỗ
/// mà reranker LLM chấm được, đoạn chứa câu trả lời ở tầng từ khóa không bao giờ được nhìn
/// tới — hỏi "Liệt kê ICD 10 bệnh đái tháo đường" quay ra "không tìm thấy căn cứ".
/// RRF chỉ dùng THỨ HẠNG nên bệnh này không tái phát. Các test dưới khóa lại điều đó.
/// </summary>
public class TronPoolRrfTests
{
    private static Dictionary<long, RetrievedChunk> Kho(params long[] ids)
    {
        var kho = new Dictionary<long, RetrievedChunk>();
        foreach (var id in ids)
        {
            // Điểm thô cố tình để 0: RRF không được phép đọc tới nó
            kho[id] = new RetrievedChunk(1, "Văn bản " + id, null, (int)id, "Nội dung đoạn " + id, 0);
        }
        return kho;
    }

    private static List<long> Day(long from, int count) =>
        Enumerable.Range(0, count).Select(i => from + i).ToList();

    [Fact]
    public void MoiTangDeuCoMatTrongCuaSo20ChoDauTienCuaReranker()
    {
        // 30 đoạn ngữ nghĩa — đúng bằng số hit vector thật, tức là đủ lấp kín cửa sổ 20
        var nguNghia = Day(100, 30);
        var fullText = Day(200, 7);
        var tuKhoa = Day(300, 5);
        var kho = Kho([.. nguNghia, .. fullText, .. tuKhoa]);

        var pool = DocumentSearchService.TronPoolRrf(kho, [], nguNghia, fullText, tuKhoa);

        var cuaSo = pool.Take(20).Select(c => c.ChunkIndex).ToList();
        Assert.Contains(cuaSo, i => nguNghia.Contains(i));
        Assert.Contains(cuaSo, i => fullText.Contains(i));
        Assert.Contains(cuaSo, i => tuKhoa.Contains(i));
        // Cụ thể hơn: cả 7 đoạn full-text và cả 5 đoạn từ khóa đều phải lọt, vì hạng
        // của chúng trong tầng mình còn cao hơn phần đuôi của tầng ngữ nghĩa.
        Assert.Equal(7, cuaSo.Count(i => fullText.Contains(i)));
        Assert.Equal(5, cuaSo.Count(i => tuKhoa.Contains(i)));
    }

    [Fact]
    public void DoanDuocNhieuTangCungTraVe_NoiLenTruoc()
    {
        // 42 đứng hạng 3 ở hai tầng; 10 đứng hạng 1 nhưng chỉ ở một tầng
        var kho = Kho(10, 11, 42);
        var pool = DocumentSearchService.TronPoolRrf(kho, [], [10, 11, 42], [40, 41, 42], []);

        Assert.Equal(42, pool[0].ChunkIndex);
    }

    [Fact]
    public void KhopNguyenCum_XepTruocDoanDungDauTangNguNghia()
    {
        var kho = Kho(7, 9);
        var pool = DocumentSearchService.TronPoolRrf(kho, [9], [7], [], []);

        Assert.Equal(9, pool[0].ChunkIndex);
    }

    [Fact]
    public void IdLapLaiTrongCungMotTang_ChiTinhLanDauTien()
    {
        // Tầng từ khóa hay trả trùng: một đoạn khớp nhiều biến thể của cùng một từ.
        // Nếu cộng dồn thì đoạn đó tự bơm điểm cho mình và vượt cả đoạn hạng 1 tầng khác.
        var kho = Kho(5, 6);
        var pool = DocumentSearchService.TronPoolRrf(kho, [], [5], [], [6, 6, 6, 6, 6]);

        Assert.Equal(2, pool.Count);
        Assert.Equal(pool[0].Score, pool[1].Score, 6);
    }

    [Fact]
    public void IdKhongConTrongKho_BiBoQuaChuKhongNem()
    {
        var kho = Kho(1);

        var pool = DocumentSearchService.TronPoolRrf(kho, [], [1, 999], [], []);

        Assert.Single(pool);
        Assert.Equal(1, pool[0].ChunkIndex);
    }

    [Fact]
    public void ScoreDuocGhiDeBangDiemRrf_KhongConDiemThoCuaTang()
    {
        var kho = Kho(1);

        var pool = DocumentSearchService.TronPoolRrf(kho, [], [1], [], []);

        // 1/(60 + 1)
        Assert.Equal(1.0 / 61, pool[0].Score, 9);
    }

    [Fact]
    public void PoolTrong_KhiMoiTangDeuTrong()
    {
        Assert.Empty(DocumentSearchService.TronPoolRrf(Kho(1, 2), [], [], [], []));
    }

    [Fact]
    public void ThuTuNoiBoTungTangDuocGiuNguyen()
    {
        var kho = Kho(1, 2, 3);
        var pool = DocumentSearchService.TronPoolRrf(kho, [], [3, 2, 1], [], []);

        Assert.Equal([3, 2, 1], pool.Select(c => c.ChunkIndex));
    }
}
