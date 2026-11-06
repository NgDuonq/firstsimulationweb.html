# Phòng thí nghiệm dao động điều hòa

Mô phỏng tương tác bằng HTML, CSS, JavaScript và **Three.js r128**. Khám phá quan hệ pha giữa li độ, vận tốc, gia tốc; lò xo ngang; lò xo thẳng đứng và con lắc đơn. Giao diện và nội dung học tập bằng tiếng Việt.

Bản nâng cấp giữ hệ cơ học, vectơ, chỉ số tức thời, năng lượng, điều khiển phát/dừng/bước và camera của bản trước; tổ chức lại mã để tính vật lý độc lập với hiển thị. Không dùng framework, không cần backend, không có bước build.

## Chạy ứng dụng

Tải mã của nhánh `feature/shm-physics-lab`, giải nén và **mở `index.html`** bằng Chrome, Firefox, Edge hoặc Safari hiện đại. Giữ nguyên cấu trúc thư mục, đặc biệt thư mục `vendor/`.

Nếu dùng Git:

```bash
git clone --branch feature/shm-physics-lab https://github.com/NgDuonq/firstsimulationweb.html.git
cd firstsimulationweb.html
```

Sau đó mở `index.html`. Có thể dùng tiện ích Live Server hoặc bất kỳ máy chủ tệp tĩnh nào khi phát triển. Ứng dụng dùng script cổ điển nên không cần máy chủ để mở trực tiếp. Three.js và OrbitControls đã được lưu tại chỗ cùng giấy phép MIT; ứng dụng không cần tải CDN hay phông chữ ngoài.

Nếu thiết bị không tạo được WebGL, ứng dụng tự chuyển sang sơ đồ Canvas 2D dùng **cùng dữ liệu vật lý**; đường tròn SVG, đồ thị và các điều khiển vẫn hoạt động. Các nút camera 3D chỉ bật khi có WebGL.

## Khám phá

- **x–v–a & đường tròn:** ba vectơ quay chuẩn hóa; chọn “Chồng đường tròn” hoặc “Tách đường tròn”. Mỗi vectơ có màu, hình điểm và hình chiếu riêng. Trên màn hình hẹp, các hình tách được xếp dọc; chế độ chồng đưa bảng số xuống dưới.
- **Lò xo ngang:** vật, thanh dẫn, lò xo xoắn, vectơ x/v/a, hai biên và vệt sóng tùy chọn. Vệt sóng lấy x(t − τ) theo thời gian thật của mô hình, không tích lũy theo số khung hình.
- **Lò xo thẳng đứng:** điểm treo, lò xo, vật, thước đo L, chiều dài tự nhiên, cân bằng tĩnh, hai biên, vectơ động học và ba vectơ lực bật/tắt độc lập.
- **Con lắc đơn:** chọn gần đúng góc nhỏ hoặc mô hình phi tuyến. Li độ trong bảng và đồ thị là **li độ cung s = ℓα**, không phải tọa độ ngang của quả nặng.
- **So sánh tổng hợp:** cùng xem ba hệ cơ học. Trên màn hình hẹp các hệ được xếp dọc.

“Nguồn x–v–a / đồ thị” xác định hệ mà đường tròn, bảng số, năng lượng và đồ thị đang khảo sát. Nguồn này có thể chọn độc lập với cảnh cơ học, đặc biệt trong màn hình tổng hợp.

### Điều khiển thời gian

Một đồng hồ duy nhất cấp t cho mọi hệ. Phát/dừng không đổi thông số; “t = 0” chỉ đưa đồng hồ về đầu; bước tiến/lùi là **1/60 giây mô phỏng**, không phụ thuộc tốc độ phát. Thanh thời gian, ô nhập t và thao tác nhấp lên đồ thị đều dừng rồi đưa tất cả thành phần về cùng thời điểm.

Tốc độ phát: 0,1–2,5×. Miền thời gian trực tiếp: 0–86.400 giây. Khi tab bị ẩn, đồng hồ tạm ngừng tiến; quay lại không cộng dồn thời gian đã rời tab. Nút “Khôi phục mọi mặc định” khôi phục thông số của mọi hệ, thời gian, tốc độ, chế độ, công tắc, nguồn dữ liệu, camera và trạng thái đang phát.

Phím tắt khi không nhập liệu: **Space** phát/dừng, **← / →** lùi/tiến một bước, **R** đưa t về 0. Panel thông số và panel số liệu có thể thu gọn; trên điện thoại chúng được thu gọn ban đầu.

Đồ thị gồm ba hàng có cùng trục t và con trỏ thời gian; có chế độ chuẩn hóa, đơn vị SI riêng cho từng hàng, cửa sổ 1/2/4 chu kỳ, điểm cực trị, điểm qua 0 và điểm hiện tại. Đường cong được lấy mẫu lại từ mô hình tại thời điểm yêu cầu, không phụ thuộc lịch sử khung hình. Với A = 0, đường tròn chuẩn hóa được thay bằng giải thích và các đồ thị nằm tại 0.

## Mô hình vật lý

### Dao động điều hòa

θ = ωt + φ; x = A cos θ; v = −Aω sin θ = Aω cos(θ + π/2); a = −ω²x = Aω² cos(θ + π).

Vectơ v sớm pha π/2 so với x; a sớm pha π/2 so với v và ngược pha x. Bán kính cả ba đường tròn bằng 1; các hình chiếu biểu diễn x/A, v/(Aω), a/(Aω²). Biên độ vật lý A, Aω, Aω² được ghi riêng với đơn vị m, m/s, m/s².

Hệ mẫu dùng m tương đương = 1 kg, k = mω² để minh họa năng lượng; đây không phải khối lượng bị gán cho các hệ cơ học khác.

### Lò xo ngang

ω = √(k/m); T = 2π√(m/k); F = −kx; K = ½mv²; U = ½kx²; E = ½kA².

Chiều dương sang phải; x = 0 là vị trí cân bằng. Chiều dài tự nhiên cố định 0,8 m, L = 0,8 + x. Biên độ tối đa 0,6 m bảo đảm chiều dài dương. Hình học lò xo kết thúc đúng tại mặt gắn vật.

### Lò xo thẳng đứng

**y đo từ vị trí cân bằng tĩnh, chiều dương hướng xuống.**

| Đại lượng | Biểu thức |
| --- | --- |
| Độ dãn cân bằng | Δl₀ = mg/k |
| Tần số góc | ω = √(k/m) |
| Chu kỳ / tần số | T = 2π√(m/k), f = 1/T |
| Động học | y = A cos θ; v = −Aω sin θ; a = −ω²y |
| Chiều dài tức thời | L = l₀ + Δl₀ + y |
| Lực đàn hồi có dấu | Fₛ = −k(Δl₀ + y) |
| Trọng lực | Fɡ = mg |
| Hợp lực | Fₙₑₜ = Fɡ + Fₛ = −ky = ma |
| Động năng | K = ½mv² |
| Thế năng dao động hiệu dụng | U = ½ky² |
| Cơ năng dao động | E = ½kA² = K + U |

U là tổng biến thiên thế năng đàn hồi và trọng trường quanh cân bằng sau khi bỏ một hằng số; **không cộng thêm mg·y**. Ở y = 0, Fₛ và Fɡ triệt tiêu. Thay đổi g đổi Δl₀ và vị trí cân bằng, không đổi ω hay T của lò xo lý tưởng.

Lò xo lý tưởng có thể chịu kéo và nén. Biên độ được giới hạn theo A ≤ min(0,6; l₀ + mg/k − 0,12) để chiều dài luôn ≥ 0,12 m. Khi thay đổi m/k/g/l₀ làm miền này thu hẹp, A được giảm và có thông báo. Khi miền mở rộng, người dùng có thể tăng A trở lại. Các vectơ lực dùng cùng một thang cố định trong suốt một bộ thông số; vectơ v và a được chuẩn hóa riêng để dễ quan sát.

Mặc định: m = 0,5 kg; k = 20 N/m; g = 9,81 m/s²; l₀ = 0,6 m; A = 0,18 m; φ = 0. Khi đó Δl₀ = 0,24525 m, ω ≈ 6,32456 rad/s, T ≈ 0,99346 s, E = 0,324 J.

### Con lắc đơn

- **Góc nhỏ:** α = α₀ cos(√(g/ℓ)t + φ); s = ℓα. Giới hạn α₀ ≤ 0,20 rad (≈ 11,5°). Các công thức lực và năng lượng trên giao diện được ghi là gần đúng khi thích hợp.
- **Phi tuyến:** α″ = −(g/ℓ)sin α; v = ℓα̇; a tiếp tuyến = −g sin α. T = 4√(ℓ/g) K(sin(α₀/2)), trong đó K là tích phân elliptic đầy đủ. Ở đây φ biểu diễn vị trí theo phần chu kỳ, không phải pha của một hàm cosin.
- Chu kỳ phi tuyến được tính bằng trung bình cộng–nhân; nghiệm được tích phân RK4 một lần trên 4.096 đoạn mỗi chu kỳ theo biên độ, sau đó nội suy Hermite bậc 5. Không tích phân theo từng khung hình nên tua ngược và nhảy thời gian không gây trôi nghiệm.
- Năng lượng phi tuyến: K = ½mv², U = mgℓ(1 − cos α). Năng lượng góc nhỏ dùng thế năng bậc hai tương ứng với mô hình gần đúng.
- Vectơ a hiển thị là **gia tốc tiếp tuyến**; gia tốc hướng tâm v²/ℓ là thành phần khác. Quả nặng luôn nằm trên dây có chiều dài ℓ; tọa độ hình học dùng ℓ sin α và −ℓ cos α.
- Mô hình phi tuyến không dùng biểu diễn ba vectơ cosin vì độ lệch pha cố định x–v–a không còn đúng; ứng dụng giải thích điều này, còn đồ thị và số liệu tiếp tục hiển thị nghiệm phi tuyến.

### Hai chế độ tần số

**Vật lý:** lò xo ngang/đứng có ω = √(k/m) riêng; con lắc có tham số ℓ, g riêng, và chu kỳ phụ thuộc biên độ nếu dùng mô hình phi tuyến. Chỉ thời gian được đồng bộ.

**So sánh:** A, ω, φ mẫu xác định pha chung; ứng dụng công khai suy ra k_ngang = m_ngang ω², k_đứng = m_đứng ω² và ℓ_đơn = g_đơn/ω². Con lắc dùng góc nhỏ với α₀ ≤ 0,20 rad nên biên độ cung có thể nhỏ hơn A mẫu; lò xo đứng có thể giảm A để giữ chiều dài hợp lệ. Tần số và pha vẫn giống nhau. Giá trị hiệu dụng được hiển thị; thông số vật lý đã nhập được giữ nguyên khi quay lại chế độ Vật lý.

Khi chỉnh thông số, mô hình và toàn bộ đồ thị được tính lại tại **cùng t đang có**, không khởi động lại đồng hồ. Vì tham số mô hình thay đổi tức thời, pha và năng lượng có thể nhảy; đây không phải mô phỏng quá trình thay đổi lực/khối lượng chậm liên tục. Bảo toàn năng lượng áp dụng khi giữ nguyên bộ thông số.

## Miền thông số

| Hệ | Miền hỗ trợ |
| --- | --- |
| Mẫu | A: 0–0,6 m; ω: 0,5–8 rad/s |
| Lò xo ngang / đứng | m: 0,1–2 kg; k: 2–80 N/m; A: 0–0,6 m, có thêm giới hạn chiều dài cho hệ đứng |
| Lò xo đứng | g: 0–20 m/s²; l₀: 0,2–1,5 m |
| Con lắc đơn | m: 0,1–2 kg; ℓ: 0,3–3 m; g: 1–20 m/s²; α₀: 0,01–0,20 rad ở góc nhỏ hoặc 0,01–1,4 rad ở phi tuyến |
| Tất cả pha đầu | −π đến +π rad |

Trong chế độ So sánh, k và ℓ hiệu dụng được suy ra để tương thích với ω mẫu nên có thể nằm ngoài miền nhập độc lập ở bảng trên. Ứng dụng kiểm tra hữu hạn, giới hạn giá trị và luôn tách giá trị SI khỏi hệ số phóng đại hình học.

## Cấu trúc mã và tệp thay đổi

| Tệp | Vai trò / thay đổi |
| --- | --- |
| `index.html` | Cập nhật bố cục, điều hướng, điều khiển, bảng số, panel công thức và thanh thời gian |
| `README.md` | Cập nhật hướng dẫn chạy, mô hình, miền nhập và giới hạn kiểm thử |
| `style.css` | Thêm giao diện dashboard tối, đáp ứng, panel thu gọn, trạng thái và tiêu điểm bàn phím |
| `physics.js` | Thêm hàm vật lý thuần, kiểm tra tham số, nghiệm phi tuyến, thông số hiệu dụng và đồng hồ |
| `circles.js` | Thêm ba sơ đồ SVG, hình chiếu, góc pha và chuyển bố trí không đặt lại t |
| `charts.js` | Thêm đồ thị Canvas lấy mẫu theo thời gian, các mốc đặc biệt và nhấp để tua |
| `scene.js` | Tổ chức lại cảnh Three.js; thêm hệ đứng, thước, lực, các thang hình học và dự phòng 2D |
| `app.js` | Thêm bộ điều phối giao diện, một đồng hồ, nhập liệu, nguồn dữ liệu, công thức theo ngữ cảnh |
| `tests/physics.test.js` | Thêm kiểm thử phương trình, đạo hàm, năng lượng, miền biên và đồng hồ |
| `tests/scene.test.js` | Thêm kiểm thử hình học Three.js thật trên CPU, điểm gắn dây và bộ đệm |
| `vendor/three.min.js`, `vendor/OrbitControls.js` | Lưu tại chỗ đúng phiên bản Three.js r128 và OrbitControls vốn được bản cũ tải từ CDN |
| `vendor/THREE-LICENSE.txt` | Giấy phép MIT của Three.js / OrbitControls |
| `docs/ANALYSIS.md` | Phân tích mã gốc, chiến lược tương thích và các nguy cơ hồi quy |
| `docs/VALIDATION.md` | Kết quả kiểm tra, các bước hồi quy và hạn chế môi trường |
| `.gitignore` | Bỏ qua tệp preview, tệp đóng gói và dữ liệu tạm |

Renderer dùng bộ đệm đỉnh cấp phát một lần và cập nhật tại chỗ; không tạo mới geometry/material theo mỗi khung hình. Tài nguyên được giải phóng khi rời trang; trạng thái trang được giữ khi trình duyệt lưu vào bộ nhớ Back/Forward. Cảnh 3D ẩn ở bài x–v–a không được vẽ thừa.

## Kiểm tra

Cần Node.js 20 trở lên để chạy kiểm thử; ứng dụng trong trình duyệt không cần Node.

```bash
node --test tests/*.test.js
node --check physics.js
node --check app.js
node --check scene.js
node --check circles.js
node --check charts.js
```

17 kiểm thử tự động đã đạt. Đã đối chiếu bốn pha chuẩn trên giao diện, tua/tiến/lùi, công tắc, chế độ đồ thị, giới hạn A, thay g không đổi T, giữ thông số khi chuyển chế độ và khôi phục mặc định. Đã kiểm tra bố cục desktop và khung nhìn hẹp 390/820 px.

**Giới hạn xác minh:** trình duyệt kiểm thử không cung cấp WebGL. Đã kiểm tra đường dự phòng 2D và hình học/bộ đệm bằng thư viện Three.js thật trên CPU; chưa xác minh trực quan renderer GPU, OrbitControls và mất/khôi phục WebGL trên thiết bị có GPU. Không tuyên bố hiệu năng FPS trên phần cứng thực tế. Xem `docs/VALIDATION.md`.

## Hướng phát triển tiếp

- Kiểm tra renderer GPU và cảm ứng trên MacBook/Safari, Windows/Chrome và điện thoại thật.
- Thêm bài tập dự đoán pha, lưu bộ thông số và xuất dữ liệu CSV.
- Thêm đồ thị pha x–v và chế độ chồng các đường cong chuẩn hóa để bổ sung ba hàng đang có.
- Nếu thêm cản hoặc ngoại lực, dùng mô hình và phương pháp giải riêng; không áp công thức bảo toàn E hiện tại.

## Tài liệu tham khảo

- [Three.js r128 và giấy phép](https://github.com/mrdoob/three.js/tree/r128)
- [Three.js: BufferAttribute](https://threejs.org/docs/pages/BufferAttribute.html), [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html)
- [NIST DLMF §22.19: ứng dụng hàm elliptic cho con lắc](https://dlmf.nist.gov/22.19)
- [NIST DLMF §19.36: phương pháp tính tích phân elliptic](https://dlmf.nist.gov/19.36)
