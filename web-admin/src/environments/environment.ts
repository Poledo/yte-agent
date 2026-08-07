// Cấu hình môi trường production
// apiBaseUrl rỗng = gọi API cùng origin (https://cbyts.vnpt.vn/api/...),
// ingress trên K8s chịu trách nhiệm định tuyến /api về backend.
export const environment = {
  production: true,
  apiBaseUrl: '',
};
