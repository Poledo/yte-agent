# Validation Reaction (Phản ứng theo kết quả kiểm tra)

Nguồn tín hiệu: `ChatPanel` gọi `robot.notifyResult(result)` sau mỗi lượt kiểm tra.
Kiểu `RobotResult` (khai báo ở `RobotMascot.ts`):

| RobotResult | Khi nào | Trạng thái | Biểu cảm/gesture |
|---|---|---|---|
| `success` | 1 hồ sơ hợp lệ | Happy | cười + thumbsUp |
| `allValid` | lô nhiều hồ sơ, tất cả hợp lệ | Celebrate | nhảy + confetti |
| `warning` | thiếu hồ sơ / chưa đủ dữ liệu | Confused | gãi đầu |
| `localError` | lỗi kiểm tra tại chỗ (thiếu trường) | PointError | mặt buồn + chỉ tay |
| `aiError` | rủi ro xuất toán (AI cảnh báo) | Sad | buồn, ngồi thụp |

## Ánh xạ nghiệp vụ → RobotResult (trong ChatPanel)

- `checkOne`: `resultFor(xuatToanRisk===true, found===false || hosoCount===0)`
  → risk→`aiError`, thiếu→`warning`, còn lại→`success`.
- `checkBatch` (done): `riskCount>0 ? aiError : hosoCount>0 ? allValid : warning`.
- `handleAdmissionCheck`: giống `checkOne`.

## Vì sao "đang suy nghĩ tắt" không đè kết quả

`notifyThinking(false)` chỉ chuyển về Listening **nếu** đang ở Thinking. Sau
`notifyResult`, trạng thái đã là Happy/Sad/… nên guard bỏ qua — kết quả được giữ
đến khi `autoReturn` đưa robot về Idle. Xem
[15_RobotBrain/EmotionTransition.md](../15_RobotBrain/EmotionTransition.md).
