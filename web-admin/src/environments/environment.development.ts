// Cấu hình môi trường phát triển
// apiBaseUrl trỏ tới Backend AIValidation.Api chạy bằng IIS Express (HTTPS 44350).
// Chạy backend bằng `dotnet run` thay vì IIS Express thì đổi thành
// http://localhost:5075. Lần đầu dùng HTTPS phải tin chứng chỉ tự ký:
// dotnet dev-certs https --trust
export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:44350',
};
