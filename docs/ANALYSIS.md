# Phân tích triển khai và chiến lược tương thích

## Mốc gốc

Đã đọc toàn bộ hai tệp trên nhánh main của `NgDuonq/firstsimulationweb.html`: `index.html` và `README.md`. Mốc mã gốc: `3286bb5b7c12eda3d1ea851b7df4e7ee77b792a8`. Ba tệp đính kèm trong ngữ cảnh là bản trang cá nhân cũ hơn, không phải nguồn của mô phỏng nên không ghi đè lên chúng.

Bản gốc dùng Three.js r128, OrbitControls, một scene, PerspectiveCamera, ánh sáng, WebGLRenderer và một vòng requestAnimationFrame. Ba nhóm hình học gồm đường tròn, lò xo ngang, con lắc đơn. Hàm updatePhysics vừa tăng simTime vừa cập nhật hình học, vectơ, vệt sóng, bảng số và năng lượng. Bộ điều khiển thao tác qua các DOM id và slider. README gốc mô tả mục đích trong hai dòng.

## Khả năng giữ lại

Giữ ngôn ngữ Việt, nền tối, đường tròn lượng giác và phép chiếu, lò xo xoắn/vật chuyển động ngang, dây/quả lắc đơn, x/v/a, bảng số tức thời, năng lượng, tốc độ, phát/dừng, đặt t = 0, bước tiến và camera. Bổ sung bước lùi, tua trực tiếp, nguồn dữ liệu và các chế độ mới. Không có chức năng không liên quan trong repo bị bỏ đi; không thêm framework hoặc dịch vụ máy chủ.

## Vấn đề xác định từ mã gốc

| Vấn đề | Tác động | Cách xử lý |
| --- | --- | --- |
| Con lắc lấy x từ lò xo rồi dùng asin(x/ℓ), nhưng ω là tham số chung tự chọn | Không tuân theo ω₀ = √(g/ℓ); khi biên độ lớn còn bị cắt sin | Cho con lắc tham số riêng; dùng li độ cung trong mô hình góc nhỏ và nghiệm phi tuyến riêng |
| Một đường tròn chỉ biểu diễn x | Khó quan sát độ lệch pha v, a | Ba vectơ chuẩn hóa, hai bố trí, hình chiếu và góc pha |
| Bán kính A thay đổi trực tiếp; chưa phân biệt đơn vị các đại lượng | Dễ hiểu nhầm độ dài của v, a theo mét | Bán kính chuẩn hóa 1; ghi riêng A, Aω, Aω² cùng đơn vị |
| Vệt sóng dịch một mẫu mỗi khung hình | Tốc độ sóng phụ thuộc FPS; không thể tua nhất quán | Tính x(t − τ) trực tiếp |
| Tạo nhiều Vector3/mảng và setFromPoints lò xo mỗi lần cập nhật | Cấp phát thừa, tăng áp lực thu gom rác | Bộ đệm Float32Array và DynamicDrawUsage dùng lại |
| Tạo lại vòng tròn nhưng không dispose geometry/material cũ | Rò rỉ tài nguyên khi kéo slider | SVG dùng lại node; tài nguyên Three.js được giữ và giải phóng theo vòng đời |
| preserveDrawingBuffer và bóng 2048 được bật dù không phục vụ việc học | Tốn tài nguyên | Dùng renderer thường, ánh sáng gọn, pixel ratio tối đa 2 |
| Canvas toàn màn hình và panel phủ cố định | Khó dùng ở màn hình nhỏ, nội dung dễ che cảnh | Bố cục grid/flex đáp ứng, panel có thể thu gọn |
| Khởi tạo WebGL lỗi làm toàn bộ logic không chạy | Trình duyệt không có GPU không sử dụng được | Phát hiện WebGL trước, chuyển sang Canvas 2D cùng mô hình |
| Năng lượng luôn giả sử m = 1 kg | Không áp dụng được cho hệ đứng và con lắc riêng | Mỗi nguồn có khối lượng/thế năng đúng; chỉ hệ mẫu dùng m tương đương 1 kg và ghi rõ |

## Trình tự nâng cấp

1. Tách hàm vật lý thuần và đồng hồ để có thể kiểm thử độc lập.
2. Thêm đường tròn x–v–a SVG tái sử dụng, màu và lệch pha cố định.
3. Thêm đồ thị phân tích theo t, con trỏ và tua thời gian.
4. Thêm lò xo đứng cùng quy ước chiều dương, lực, chiều dài và năng lượng.
5. Tổ chức lại scene để dùng lại hình học; thêm thước, mốc và dự phòng.
6. Tích hợp panel công thức, thông số, nguồn dữ liệu và hai chế độ tần số.
7. Rà bố cục đáp ứng, vòng đời, đầu vào và các điểm có thể gây hồi quy.
8. Chạy kiểm tra toán học, hình học CPU và tương tác trình duyệt; cập nhật tài liệu.

SVG phục vụ sơ đồ pha chính xác ở không gian 2D; Three.js tiếp tục phục vụ các hệ cơ học. Cách này giữ pipeline 3D cũ ở phần hữu ích, đồng thời đọc nhãn/pha không bị lệch do xoay camera.

## Các nguy cơ hồi quy đã xử lý

- Đổi bố trí hoặc nguồn dữ liệu không đặt lại đồng hồ.
- Phát/dừng, bước và tốc độ không có đồng hồ phụ trong từng hệ.
- Chế độ so sánh suy ra tham số tương thích và công khai chúng; quay lại chế độ vật lý trả về đúng tham số riêng.
- Mọi miền biên được kiểm tra hữu hạn và tránh chiều dài lò xo không hợp lệ.
- Không cộng thế năng trọng trường lần nữa vào U = ½ky².
- Mô hình con lắc phi tuyến không hiển thị ba vectơ cosin như một đẳng thức.
- Giới hạn biên độ được tính từ thông số mới mỗi lần nhập, tránh giữ một trần A đã cũ.
- Ô số giữ văn bản đang gõ; không chặn việc gõ số thập phân như 0,5 vì tự thay ký tự 0 bằng cận dưới.
- Back/Forward cache không bị hủy scene; thời gian khung hình được đặt lại khi phục hồi trang.

Giới hạn kiểm thử GPU và các cơ hội cải tiến được nêu trong README và VALIDATION.md.
