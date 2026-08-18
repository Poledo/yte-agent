using AIValidation.Api.Data;
using AIValidation.Api.Data.Seed;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>
/// Quét endpoint và đồng bộ bảng quyền lúc ứng dụng đã sẵn sàng.
///
/// Chạy ở <see cref="IHostedLifecycleService.StartedAsync"/> chứ KHÔNG phải
/// <c>StartAsync</c>: lúc StartAsync thì bảng định tuyến chưa dựng xong,
/// <c>EndpointDataSource</c> còn rỗng — quét ra 0 endpoint, bản đồ route rỗng và mọi
/// request sau đó đều rơi vào PermissionNotFound.
/// </summary>
public sealed class PermissionScannerHostedService : IHostedLifecycleService
{
    private readonly IPermissionScanner _scanner;
    private readonly IPermissionCache _cache;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RbacOptions _options;
    private readonly ILogger<PermissionScannerHostedService> _logger;

    public PermissionScannerHostedService(
        IPermissionScanner scanner,
        IPermissionCache cache,
        IServiceScopeFactory scopeFactory,
        IOptions<RbacOptions> options,
        ILogger<PermissionScannerHostedService> logger)
    {
        _scanner = scanner;
        _cache = cache;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task StartedAsync(CancellationToken cancellationToken)
    {
        try
        {
            var routeMap = _scanner.BuildRouteMap();
            _cache.SetRouteMap(routeMap);

            if (routeMap.Count == 0)
            {
                _logger.LogWarning(
                    "Bản đồ quyền theo route rỗng: không quét được endpoint nào. Mọi request /api sẽ bị từ chối với lý do PermissionNotFound.");
            }
            else
            {
                _logger.LogInformation("Nạp bản đồ quyền theo route: {Count} mục", routeMap.Count);
            }

            if (_options.AutoScanOnStartup)
            {
                await _scanner.SyncAsync(cancellationToken);

                // Dịch mã quyền cũ ngay sau khi bảng quyền có mã mới. Chạy ở đây chứ
                // không ở AuthSeeder vì lúc seeder chạy thì bộ quét chưa sinh mã nào.
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await LegacyPermissionMigrator.ApplyAsync(db, _logger, cancellationToken);

                _cache.InvalidateAll();
            }
        }
        catch (Exception ex)
        {
            // Không chặn khởi động: API vẫn phải lên để còn vào được màn hình quản trị
            // mà bấm quét lại bằng tay.
            _logger.LogError(ex, "Quét/đồng bộ bảng quyền thất bại");
        }
    }

    public Task StartingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StoppingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StoppedAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
