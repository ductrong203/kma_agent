import React, { useState, useEffect } from "react";
import {
  FiTrendingUp,
  FiUsers,
  FiZap,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    tokenUsedNow: 0,
    tokenUsedMonth: 0,
    activeUsers: 0,
    requestChange: 0,
    tokenChange: 0,
    userChange: 0,
  });

  const [topUsers, setTopUsers] = useState([]);
  const [tokenUsage, setTokenUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");

        const response = await fetch("/api/admin/dashboard/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        const data = await response.json();
        const dashboardData = data.data;

        setStats({
          totalRequests: dashboardData.total_requests_today,
          tokenUsedNow: dashboardData.tokens_used_today,
          tokenUsedMonth: dashboardData.tokens_used_month,
          activeUsers: dashboardData.total_users,
          requestChange: dashboardData.request_change_percent,
          tokenChange: dashboardData.tokens_change_percent,
          userChange: dashboardData.user_change_percent,
        });

        // Format top users for today
        const topUsersFormatted = dashboardData.top_users_today.map((user) => ({
          name: user.username,
          requests: user.requests,
          tokens: user.tokens,
        }));
        setTopUsers(topUsersFormatted);

        // Format top users for tokens this month
        const tokenUsageFormatted = dashboardData.top_users_month.map(
          (user) => ({
            name: user.username,
            tokens: user.tokens,
          }),
        );
        setTokenUsage(tokenUsageFormatted);

        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000);

    return () => clearInterval(interval);
  }, []);

  // StatCard Component
  const StatCard = ({ icon: Icon, title, value, unit, change, positive }) => (
    <div className="dashboard-stat-card">
      <div className="stat-icon-container">
        <Icon className="stat-icon" />
      </div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <div className="stat-value-row">
          <span className="stat-value">
            {value.toLocaleString()}
            {unit && <span className="stat-unit">{unit}</span>}
          </span>
          {change !== undefined && (
            <span
              className={`stat-change ${positive ? "positive" : "negative"}`}
            >
              {positive ? <FiArrowUp /> : <FiArrowDown />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Layout: Bảng điều khiển */}
      <h1 className="dashboard-title">Bảng điều khiển</h1>

      {/* Loading State */}
      {loading && (
        <div className="dashboard-loading">
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="dashboard-error">
          <p>⚠️ Lỗi: {error}</p>
        </div>
      )}

      {/* Statistics Cards Grid */}
      {!loading && (
        <>
          <div className="dashboard-stats-grid">
            <StatCard
              icon={FiTrendingUp}
              title="Tổng số yêu cầu hôm nay"
              value={stats.totalRequests}
              unit=""
              change={stats.requestChange}
              positive={stats.requestChange >= 0}
            />
            <StatCard
              icon={FiZap}
              title="Token đã sử dụng hôm nay"
              value={stats.tokenUsedNow}
              unit=""
              change={stats.tokenChange}
              positive={stats.tokenChange >= 0}
            />
            <StatCard
              icon={FiZap}
              title="Token đã sử dụng tháng này"
              value={stats.tokenUsedMonth}
              unit=""
            />
            <StatCard
              icon={FiUsers}
              title="Số người dùng"
              value={stats.activeUsers}
              unit=""
              change={stats.userChange}
              positive={stats.userChange >= 0}
            />
          </div>

          {/* Tables Row */}
          <div className="dashboard-tables-row">
            {/* Top Users Table */}
            <div className="dashboard-table-card">
              <h3>Người dùng hoạt động nhất hôm nay</h3>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Tên người dùng</th>
                    <th>Số yêu cầu</th>
                    <th>Token đã dùng</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.length > 0 ? (
                    topUsers.map((user, idx) => (
                      <tr key={idx}>
                        <td>{user.name}</td>
                        <td>{user.requests}</td>
                        <td>{user.tokens.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        style={{ textAlign: "center", color: "#9ca3af" }}
                      >
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Token Usage Table */}
            <div className="dashboard-table-card">
              <h3>Người dùng sử dụng nhiều token nhất tháng này</h3>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Tên người dùng</th>
                    <th>Token đã dùng</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenUsage.length > 0 ? (
                    tokenUsage.map((user, idx) => (
                      <tr key={idx}>
                        <td>{user.name}</td>
                        <td>{user.tokens.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        style={{ textAlign: "center", color: "#9ca3af" }}
                      >
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
