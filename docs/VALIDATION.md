# Xác minh bản nâng cấp

Ngày kiểm tra: **06/11/2026**. Mã gốc được nâng cấp trên nhánh tính năng riêng; main không được ghi trực tiếp.

## Kiểm thử tự động

Lệnh: `node --test tests/*.test.js` với Node.js 24.22.1. Kết quả cuối: **17/17 đạt**, không có kiểm thử bị bỏ qua.

| Nhóm | Nội dung được xác minh |
| --- | --- |
| Pha điều hòa | Bốn pha 0, π/2, π, 3π/2; quan hệ pha cố định; a = −ω²x |
| Lò xo đứng | y = 0 thì Fₙₑₜ = 0; hai biên có v = 0, a hồi phục; T = 2π√(m/k) |
| Trọng trường | Thay g đổi độ dãn cân bằng nhưng không đổi ω, T, y(t) hoặc E khi giữ các tham số khác |
| Năng lượng | K + U = E cho lò xo, gần đúng góc nhỏ và con lắc phi tuyến |
| Miền nhập | Các tổ hợp cận m/k/g/l₀/A; số không hữu hạn; A = 0; L đứng ≥ 0,12 m và L ngang > 0 |
| Đồng hồ | Dừng, tua, bước tiến/lùi chính xác 1/60 s, độc lập tốc độ phát, chặn thời gian âm |
| Hai chế độ | Tần số riêng ở Vật lý; k = mω² và ℓ = g/ω² ở So sánh; không sửa thông số đã lưu |
| So sánh ở cận | 288 tổ hợp × 4 thời điểm, gồm A = 0, g_đứng = 0, l₀ nhỏ và tham số hiệu dụng ngoài miền nhập độc lập |
| Con lắc | Dây có độ dài không đổi; chu kỳ elliptic; tính tuần hoàn sau nhiều chu kỳ; dấu hồi phục |
| Đạo hàm | Đạo hàm số độc lập của li độ/vận tốc khớp v/a của các mô hình |
| Three.js thật trên CPU | Hình học và tọa độ hữu hạn; lò xo kết thúc tại đúng điểm gắn vật; bộ đệm dùng lại qua 100 lần cập nhật |
| Thang lực | Vectơ trọng lực có độ dài không đổi theo thời gian; Fₛ và Fɡ dùng chung thang và bằng nhau tại cân bằng |

Kiểm tra cú pháp: `node --check` cho physics.js, circles.js, charts.js, scene.js và app.js đều đạt.

## Kiểm tra giao diện trong trình duyệt

Thực hiện bằng thao tác lên giao diện, không sửa trực tiếp trạng thái nội bộ.

| Thao tác | Kết quả |
| --- | --- |
| Tạm dừng, nhập t ở bốn pha chuẩn, A = 0,35 m, ω = 2 rad/s, φ = 0 | Đúng bảng dưới |
| Đổi Chồng/Tách khi đã dừng ở t = 2,356 s | Giữ t, trạng thái dừng và pha |
| Tắt v, tắt góc, tắt đồ thị v | Đúng thành phần bị ẩn, các thành phần khác còn hoạt động |
| Đổi đơn vị SI và cửa sổ 4 chu kỳ | Đổi đúng trục/nhãn, vẫn đồng bộ số liệu |
| Đổi g của hệ đứng từ 9,81 về 1,62 | T giữ 0,993 s; Δl₀ đổi từ 0,24525 thành 0,0405 m |
| g = 0, l₀ = 0,2 m, yêu cầu A = 0,6 m rồi kết thúc nhập | A được giới hạn về 0,08 m |
| Tái mở hệ đứng khi Amax = 0,08; tăng l₀ lên 1 m; nhập A = 0,5 m | A = 0,5 được chấp nhận; không còn giữ trần cũ |
| Giảm l₀ từ 1 về 0,2 khi g = 0 | A giảm lại 0,08 m và thông báo giới hạn |
| Gõ từng ký tự `0.5` vào ô khối lượng | Văn bản nhập không bị thay giữa chừng; m cuối = 0,5 kg |
| Bước tiến rồi bước lùi từ 0 | 0,017 s rồi 0,000 s ở bảng làm tròn; toán học dùng 1/60 s |
| Đặt tốc độ 2,5× rồi bấm một bước | Bước vẫn 1/60 s, không nhân thêm 2,5 |
| Nhấp vào đồ thị | Dừng và đưa đồng hồ cùng mọi chỉ số đến thời điểm tương ứng |
| Chuyển con lắc sang phi tuyến, α₀ = 1,1 rad | T ≈ 2,376 s; E ≈ 3,216 J; giải thích thay thế đường tròn cosin |
| Vật lý → So sánh → Vật lý | Hiện tham số suy ra; giữ nguyên g/l₀/A vật lý đã nhập khi quay lại |
| Khôi phục mặc định | Đúng chế độ, nguồn, bố trí, tốc độ và các công tắc mặc định |
| Tạm dừng ở 1,5 s, sang trang khác rồi Back | Trở lại ở 1,500 s, vẫn dừng; cảnh không bị hủy khi được phục hồi từ bộ nhớ trang |
| Desktop và khung nhìn 390/820 px | Không có tràn ngang của trang; thanh điều hướng được cuộn riêng; panel thu gọn được; đường tròn và hệ tổng hợp xếp dọc khi cần |
| Console ở tab kiểm tra mới | Không có cảnh báo/lỗi từ ứng dụng hoặc thư viện; bỏ qua thông báo thuộc tiện ích trình duyệt |

| θ | x (m) | v (m/s) | a (m/s²) |
| --- | ---: | ---: | ---: |
| 0 | +0,350 | 0 | −1,400 |
| π/2 | 0 | −0,700 | 0 |
| π | −0,350 | 0 | +1,400 |
| 3π/2 | 0 | +0,700 | 0 |

## Rà soát chuyên sâu

Rà soát độc lập bằng GPT-6 Astra đã đọc các mô-đun và kiểm thử, không sửa mã trực tiếp. Các lỗi trần biên độ giữ giá trị cũ, vòng đời Back/Forward cache, công thức tạm trống sau đổi tham số và việc gõ số thập phân bị ngắt đã được sửa. Rà lại cuối không phát hiện lỗi vật lý trọng yếu trong các mô hình đã triển khai. Kiểm thử ở đường nối của bảng nghiệm phi tuyến cũng không phát hiện sai lệch đáng kể.

## Hạn chế và kiểm tra tiếp

- Trình duyệt kiểm thử không tạo được WebGL. Bản cũ dừng khởi tạo tại WebGLRenderer; bản nâng cấp chạy đường dự phòng Canvas 2D bình thường.
- Đã dùng đúng Three.js r128 để kiểm tra scene graph, BufferGeometry, ArrowHelper, điểm gắn vật và tái sử dụng bộ đệm trên CPU. Điều này **không thay thế** kiểm tra ảnh trên GPU.
- Chưa xác minh trực quan renderer 3D/OrbitControls, mất ngữ cảnh WebGL, Safari/iOS/Android trên thiết bị thật hoặc FPS trên laptop thực tế. Đây là bước QA tiếp theo được ưu tiên.
- Khung nhìn 390/820 px được kiểm tra bằng iframe có viewport thực tương ứng, không phải thiết bị cảm ứng thật. Cảnh tổng hợp ở khung hẹp đã xác nhận chuyển thành vùng xếp dọc cao 650 px và không làm trang tràn ngang.
- Mô hình phi tuyến là nghiệm số có độ chính xác hữu hạn. Không gọi đây là nghiệm giải tích chính xác tuyệt đối.
- Chưa có tắt dần, cưỡng bức, khối lượng lò xo, va chạm hoặc mô hình lò xo bị chùng. Lò xo lý tưởng có thể chịu cả kéo và nén như quy ước đã ghi.
- Thay đổi tham số là thay mô hình tức thời tại cùng t; không mô phỏng quá trình liên tục đổi độ cứng, khối lượng hay trọng trường.
