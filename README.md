# Dự án Upload File với NestJS và Nginx

Dự án này cung cấp một API đơn giản để upload nhiều file cùng lúc (bao gồm ảnh, video và các loại file khác) sử dụng NestJS làm backend và Nginx làm reverse proxy. File được lưu trữ trên server và đường dẫn URL được trả về cho client.

## Cài đặt

1. **Clone dự án:**
   ```bash
   git clone https://github.com/quockhanh2004/upload_file_server.git
   cd upload_file_server
   ```

2. **Cài đặt dependencies:**

   ```bash
   npm install
   ```

3. **Cấu hình môi trường:**

   - Tạo file `.env` trong thư mục gốc của dự án.
   - Định nghĩa biến môi trường `DOMAIN` với domain của server. Ví dụ:
     ```
     DOMAIN=yourdomain.com
     ```
     Hoặc cho môi trường local:
     ```
     DOMAIN=localhost:3000
     ```

4. **Build dự án:**

   ```bash
   npm run build
   ```

5. **Chạy dự án:**

   ```bash
   npm run start:prod
   ```

6. **Cấu hình Nginx:**

   - Cấu hình Nginx để trỏ tới ứng dụng NestJS đang chạy trên cổng 3001.
   - Ví dụ cấu hình Nginx:

     ```nginx
     server {
         listen 80;
         server_name yourdomain.com;

         location /files/ {
             alias /path/to/your/project/uploads/; # Thay đổi đường dẫn này
         }

         location / {
             proxy_pass http://localhost:3001;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         }
     }
     ```

   - **Lưu ý:** Thay ` /path/to/your/project/uploads/` bằng đường dẫn tuyệt đối đến thư mục `uploads` trong dự án của bạn.

## Sử dụng

Gửi một POST request đến `/files` với các file được đính kèm trong field `files`.

Ví dụ sử dụng `curl`:

```bash
curl -X POST -F "files=@/path/to/your/file1.jpg" -F "files=@/path/to/your/file2.png" -F "files=@/path/to/your/file3.txt" http://yourdomain.com/files
```

API sẽ trả về một JSON array chứa các URL của file đã upload.

```json
[
  { "url": "http://yourdomain.com/files/images/hashed_name1.jpg" },
  { "url": "http://yourdomain.com/files/images/hashed_name2.png" },
  { "url": "http://yourdomain.com/files/file3.txt" }
]
```

## Các tính năng

- **Hỗ trợ upload nhiều file:** Cho phép upload nhiều file cùng lúc.
- **Hỗ trợ nhiều loại file:** Hỗ trợ upload ảnh, video và các loại file khác.
- **Phân loại file:** Ảnh được lưu trong thư mục `images`, video được lưu trong thư mục `videos`. Các file khác được lưu trữ ở thư mục gốc `uploads`.
- **Tạo tên file duy nhất cho ảnh và video:** Sử dụng SHA256 hash để tạo tên file duy nhất cho ảnh và video, tránh trùng lặp. Các loại file khác giữ nguyên tên gốc.
- **Nén ảnh:** Ảnh lớn hơn 1.5MB sẽ được nén lại với chất lượng 95.
- **Symlink:** Sử dụng symlink để liên kết thư mục `uploads` trong dự án với thư mục `drive_files` trên server, giúp dễ dàng quản lý file.

## Công nghệ sử dụng

- NestJS
- Nginx
- Sharp (cho việc resize ảnh)

## License

[MIT](LICENSE)

```

```
