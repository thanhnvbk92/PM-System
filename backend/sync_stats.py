import sys
import os
import io
from datetime import datetime

# Đảm bảo in được tiếng Việt trên console Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Thêm thư mục hiện tại vào path để import được app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.clickhouse import get_clickhouse_client

def sync_dashboard_stats():
    client = get_clickhouse_client()
    if not client:
        print("❌ Không thể kết nối tới ClickHouse. Vui lòng kiểm tra cấu hình.")
        return

    print(f"[{datetime.now()}] Bắt đầu đồng bộ lại dữ liệu Dashboard...")

    try:
        # 1. Kiểm tra số lượng trước khi đồng bộ
        count_results = client.execute("SELECT count() FROM pcb_results")[0][0]
        print(f"📊 Số lượng log gốc (pcb_results): {count_results:,}")

        # 2. Xóa dữ liệu cũ trong bảng thống kê
        print("🧹 Đang xóa dữ liệu cũ trong bảng pcb_stats_hourly...")
        client.execute("TRUNCATE TABLE pcb_stats_hourly")

        # 3. Tính toán lại toàn bộ từ bảng gốc
        # Lưu ý: Sử dụng countState và sumState để khớp với kiểu dữ liệu AggregateFunction
        print("⚙️ Đang tính toán và nạp lại dữ liệu (việc này có thể mất vài phút nếu dữ liệu lớn)...")
        sync_query = """
        INSERT INTO pcb_stats_hourly
        SELECT 
            toStartOfHour(start_time) as hour,
            buyer_id,
            line_id,
            station_id,
            channel_id,
            result,
            countState(toUInt8(1)) as total_count,
            sumState(assumeNotNull(test_time)) as total_test_time
        FROM pcb_results
        GROUP BY hour, buyer_id, line_id, station_id, channel_id, result
        """
        client.execute(sync_query)

        # 4. Kiểm tra lại kết quả
        count_stats = client.execute("SELECT countMerge(total_count) FROM pcb_stats_hourly")[0][0]
        print(f"✅ Đồng bộ hoàn tất!")
        print(f"📈 Số lượng log trên Dashboard sau đồng bộ: {count_stats:,}")
        
        if count_results == count_stats:
            print("✨ Dữ liệu đã khớp hoàn toàn 100%.")
        else:
            print(f"⚠️ Có sự chênh lệch nhỏ ({abs(count_results - count_stats):,}). Điều này có thể do dữ liệu mới đang được nạp vào liên tục.")

    except Exception as e:
        print(f"❌ Lỗi trong quá trình đồng bộ: {e}")

if __name__ == "__main__":
    sync_dashboard_stats()
