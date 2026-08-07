# Giai đoạn 1: build & publish (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY AIValidation.Api/*.csproj AIValidation.Api/
RUN dotnet restore AIValidation.Api/AIValidation.Api.csproj
COPY AIValidation.Api/ AIValidation.Api/
RUN dotnet publish AIValidation.Api/AIValidation.Api.csproj -c Release -o /app --no-restore

# Giai đoạn 2: runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./

# Kestrel nghe HTTP 8080 (Service ClusterIP proxy vào đây). TLS do LB/nginx phía trước lo.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Thư mục lưu file upload — mount PersistentVolume vào đây (xem k8s manifest)
# để không mất file khi pod restart.
RUN mkdir -p /app/Storage
VOLUME /app/Storage

ENTRYPOINT ["dotnet", "AIValidation.Api.dll"]
