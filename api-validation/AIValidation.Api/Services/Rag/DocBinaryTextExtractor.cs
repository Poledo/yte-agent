using System.Text;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Trích text từ file Word 97-2003 (.doc) KHÔNG cần thư viện ngoài — đọc trực tiếp
/// theo đặc tả công khai của Microsoft:
/// - [MS-CFB]: container OLE Compound File (FAT/miniFAT/directory);
/// - [MS-DOC]: FIB trong stream "WordDocument" trỏ tới CLX (piece table) trong
///   stream "0Table"/"1Table"; mỗi piece cho biết đoạn text nằm ở đâu và mã hóa
///   UTF-16 hay 8-bit (cp1252).
/// Đủ cho mục đích kho tri thức: lấy đúng phần văn bản, bỏ định dạng.
/// </summary>
internal static class DocBinaryTextExtractor
{
    private const uint EndOfChain = 0xFFFFFFFE;
    private const uint FreeSect = 0xFFFFFFFF;

    public static string Extract(byte[] data)
    {
        if (data.Length < 512
            || BitConverter.ToUInt64(data, 0) != 0xE11AB1A1E011CFD0UL)
        {
            throw new NotSupportedException("File .doc không đúng định dạng OLE Compound File.");
        }

        // ---- Header CFB ----
        var sectorSize = 1 << BitConverter.ToUInt16(data, 30);       // thường 512
        var dirStart = BitConverter.ToUInt32(data, 48);
        var miniFatStart = BitConverter.ToUInt32(data, 60);
        var difatStart = BitConverter.ToUInt32(data, 68);
        var difatCount = BitConverter.ToInt32(data, 72);

        // ---- DIFAT → danh sách sector FAT ----
        var fatSectors = new List<uint>();
        for (var i = 0; i < 109; i++)
        {
            var s = BitConverter.ToUInt32(data, 76 + i * 4);
            if (s < 0xFFFFFFFA)
            {
                fatSectors.Add(s);
            }
        }
        var difatSector = difatStart;
        for (var i = 0; i < difatCount && difatSector < 0xFFFFFFFA; i++)
        {
            var baseOffset = SectorOffset(difatSector, sectorSize);
            var perSector = sectorSize / 4 - 1;
            for (var j = 0; j < perSector; j++)
            {
                var s = BitConverter.ToUInt32(data, baseOffset + j * 4);
                if (s < 0xFFFFFFFA)
                {
                    fatSectors.Add(s);
                }
            }
            difatSector = BitConverter.ToUInt32(data, baseOffset + perSector * 4);
        }

        // ---- FAT ----
        var fat = new List<uint>();
        foreach (var s in fatSectors)
        {
            var baseOffset = SectorOffset(s, sectorSize);
            for (var j = 0; j < sectorSize / 4; j++)
            {
                fat.Add(BitConverter.ToUInt32(data, baseOffset + j * 4));
            }
        }

        // ---- Directory ----
        var dir = ReadChain(data, fat, dirStart, sectorSize);
        var entries = new List<(string Name, byte Type, uint Start, uint Size)>();
        for (var offset = 0; offset + 128 <= dir.Length; offset += 128)
        {
            var nameLen = BitConverter.ToUInt16(dir, offset + 64);
            if (nameLen < 2 || nameLen > 64)
            {
                continue;
            }
            var name = Encoding.Unicode.GetString(dir, offset, nameLen - 2);
            entries.Add((name, dir[offset + 66], BitConverter.ToUInt32(dir, offset + 116),
                BitConverter.ToUInt32(dir, offset + 120)));
        }

        var root = entries.FirstOrDefault(e => e.Type == 5);
        var miniStream = root.Size > 0 ? ReadChain(data, fat, root.Start, sectorSize) : Array.Empty<byte>();
        var miniFat = new List<uint>();
        if (miniFatStart < 0xFFFFFFFA)
        {
            var miniFatBytes = ReadChain(data, fat, miniFatStart, sectorSize);
            for (var j = 0; j + 4 <= miniFatBytes.Length; j += 4)
            {
                miniFat.Add(BitConverter.ToUInt32(miniFatBytes, j));
            }
        }

        byte[] GetStream(string name)
        {
            var entry = entries.FirstOrDefault(e => e.Type == 2 && e.Name == name);
            if (entry.Name != name)
            {
                throw new NotSupportedException($"File .doc thiếu stream \"{name}\".");
            }
            // Stream nhỏ (< 4096) nằm trong mini stream với sector 64 byte
            var bytes = entry.Size < 4096
                ? ReadMiniChain(miniStream, miniFat, entry.Start)
                : ReadChain(data, fat, entry.Start, sectorSize);
            return bytes.Length > entry.Size ? bytes[..(int)entry.Size] : bytes;
        }

        // ---- FIB (đầu stream WordDocument) ----
        var word = GetStream("WordDocument");
        if (word.Length < 0x01AA || BitConverter.ToUInt16(word, 0) != 0xA5EC)
        {
            throw new NotSupportedException("File .doc không có FIB hợp lệ (có thể là Word 6/95 quá cũ).");
        }
        var flags = BitConverter.ToUInt16(word, 10);
        var tableName = (flags & 0x0200) != 0 ? "1Table" : "0Table";
        var table = GetStream(tableName);

        var fcClx = BitConverter.ToInt32(word, 0x01A2);
        var lcbClx = BitConverter.ToInt32(word, 0x01A6);
        if (lcbClx <= 0 || fcClx < 0 || fcClx + lcbClx > table.Length)
        {
            throw new NotSupportedException("File .doc không có piece table (CLX) — không trích được text.");
        }

        // ---- CLX → PlcPcd ----
        var pos = fcClx;
        var end = fcClx + lcbClx;
        while (pos < end && table[pos] == 0x01)
        {
            var cb = BitConverter.ToUInt16(table, pos + 1);
            pos += 3 + cb;
        }
        if (pos >= end || table[pos] != 0x02)
        {
            throw new NotSupportedException("Piece table của file .doc không đúng cấu trúc.");
        }
        var lcbPlc = BitConverter.ToInt32(table, pos + 1);
        pos += 5;
        var pieceCount = (lcbPlc - 4) / 12;
        if (pieceCount <= 0)
        {
            throw new NotSupportedException("File .doc không có đoạn text nào.");
        }

        // ---- Ghép text từ từng piece ----
        var cp1252 = Encoding.GetEncoding(1252);
        var sb = new StringBuilder();
        for (var i = 0; i < pieceCount; i++)
        {
            var cpStart = BitConverter.ToInt32(table, pos + i * 4);
            var cpEnd = BitConverter.ToInt32(table, pos + (i + 1) * 4);
            var charCount = cpEnd - cpStart;
            if (charCount <= 0)
            {
                continue;
            }

            var pcdOffset = pos + (pieceCount + 1) * 4 + i * 8;
            var fcRaw = BitConverter.ToUInt32(table, pcdOffset + 2);
            var compressed = (fcRaw & 0x40000000) != 0;
            var fc = (int)(fcRaw & 0x3FFFFFFF);

            if (compressed)
            {
                var offset = fc / 2;
                if (offset + charCount > word.Length) continue;
                sb.Append(cp1252.GetString(word, offset, charCount));
            }
            else
            {
                if (fc + charCount * 2 > word.Length) continue;
                sb.Append(Encoding.Unicode.GetString(word, fc, charCount * 2));
            }
        }

        return CleanControlChars(sb.ToString());
    }

    /// <summary>Ký tự điều khiển của Word → xuống dòng/tab; bỏ dấu field và ký tự rác.</summary>
    private static string CleanControlChars(string raw)
    {
        var sb = new StringBuilder(raw.Length);
        foreach (var c in raw)
        {
            switch (c)
            {
                case '\r':
                case (char)0x0B: // ngắt dòng mềm
                case (char)0x0C: // ngắt trang
                    sb.Append('\n');
                    break;
                case (char)0x07: // dấu kết thúc ô/dòng bảng
                    sb.Append('\t');
                    break;
                case (char)0x13: // bắt đầu field
                case (char)0x14: // tách field
                case (char)0x15: // kết thúc field
                case (char)0x01: // ảnh/đối tượng nhúng
                case (char)0x08:
                    break;
                default:
                    if (c >= ' ' || c == '\n' || c == '\t')
                    {
                        sb.Append(c);
                    }
                    break;
            }
        }
        var text = System.Text.RegularExpressions.Regex.Replace(sb.ToString(), @"(\s*\n\s*){3,}", "\n\n");
        return text.Trim();
    }

    private static int SectorOffset(uint sector, int sectorSize) => (int)((sector + 1) * sectorSize);

    /// <summary>Nối các sector của một chain theo FAT.</summary>
    private static byte[] ReadChain(byte[] data, List<uint> fat, uint start, int sectorSize)
    {
        using var ms = new MemoryStream();
        var sector = start;
        var guard = 0;
        while (sector < 0xFFFFFFFA && sector != EndOfChain && sector != FreeSect)
        {
            if (++guard > 1_000_000)
            {
                throw new NotSupportedException("File .doc có chain sector lặp vô hạn (hỏng).");
            }
            var offset = SectorOffset(sector, sectorSize);
            if (offset + sectorSize > data.Length)
            {
                break;
            }
            ms.Write(data, offset, sectorSize);
            if (sector >= fat.Count)
            {
                break;
            }
            sector = fat[(int)sector];
        }
        return ms.ToArray();
    }

    /// <summary>Nối các mini-sector (64 byte, nằm trong mini stream) theo miniFAT.</summary>
    private static byte[] ReadMiniChain(byte[] miniStream, List<uint> miniFat, uint start)
    {
        const int miniSector = 64;
        using var ms = new MemoryStream();
        var sector = start;
        var guard = 0;
        while (sector < 0xFFFFFFFA)
        {
            if (++guard > 1_000_000)
            {
                throw new NotSupportedException("File .doc có mini-chain lặp vô hạn (hỏng).");
            }
            var offset = (int)sector * miniSector;
            if (offset + miniSector > miniStream.Length)
            {
                break;
            }
            ms.Write(miniStream, offset, miniSector);
            if (sector >= miniFat.Count)
            {
                break;
            }
            sector = miniFat[(int)sector];
        }
        return ms.ToArray();
    }
}
