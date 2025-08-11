<?php
/**
 * Stats Controller for VideoShare Platform
 */

require_once __DIR__ . '/../config/database.php';

class StatsController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get dashboard stats for creators
     */
    public function getCreatorStats($userId) {
        try {
            // Get video count
            $videoStmt = $this->db->prepare("SELECT COUNT(*) as total_videos FROM videos WHERE creator_id = ?");
            $videoStmt->bind_param("i", $userId);
            $videoStmt->execute();
            $videoResult = $videoStmt->get_result();
            $totalVideos = $videoResult->fetch_assoc()['total_videos'];
            
            // Get total earnings
            $earningsStmt = $this->db->prepare("
                SELECT COALESCE(SUM(p.amount), 0) as total_earnings
                FROM purchases p
                JOIN videos v ON p.video_id = v.id
                WHERE v.creator_id = ? AND p.status = 'completed'
            ");
            $earningsStmt->bind_param("i", $userId);
            $earningsStmt->execute();
            $earningsResult = $earningsStmt->get_result();
            $totalEarnings = $earningsResult->fetch_assoc()['total_earnings'];
            
            // Get total purchases/sales
            $salesStmt = $this->db->prepare("
                SELECT COUNT(*) as total_sales
                FROM purchases p
                JOIN videos v ON p.video_id = v.id
                WHERE v.creator_id = ? AND p.status = 'completed'
            ");
            $salesStmt->bind_param("i", $userId);
            $salesStmt->execute();
            $salesResult = $salesStmt->get_result();
            $totalSales = $salesResult->fetch_assoc()['total_sales'];
            
            // Get total views
            $viewsStmt = $this->db->prepare("SELECT COALESCE(SUM(view_count), 0) as total_views FROM videos WHERE creator_id = ?");
            $viewsStmt->bind_param("i", $userId);
            $viewsStmt->execute();
            $viewsResult = $viewsStmt->get_result();
            $totalViews = $viewsResult->fetch_assoc()['total_views'];
            
            // Get recent activity (last 5 purchases)
            $activityStmt = $this->db->prepare("
                SELECT 
                    p.created_at,
                    p.amount,
                    v.title,
                    u.name as buyer_name
                FROM purchases p
                JOIN videos v ON p.video_id = v.id
                JOIN users u ON p.user_id = u.id
                WHERE v.creator_id = ? AND p.status = 'completed'
                ORDER BY p.created_at DESC
                LIMIT 5
            ");
            $activityStmt->bind_param("i", $userId);
            $activityStmt->execute();
            $activityResult = $activityStmt->get_result();
            $recentActivity = [];
            while ($row = $activityResult->fetch_assoc()) {
                $recentActivity[] = $row;
            }
            
            return $this->sendSuccess([
                'total_videos' => $totalVideos,
                'total_earnings' => number_format($totalEarnings, 2),
                'total_sales' => $totalSales,
                'total_views' => $totalViews,
                'recent_activity' => $recentActivity,
                'monthly_earnings' => $this->getMonthlyEarnings($userId),
                'earnings_chart_data' => $this->getEarningsChartData($userId)
            ], 'Creator stats retrieved successfully');
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get creator stats: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get platform stats for homepage and admin
     */
    public function getPlatformStats() {
        try {
            // Get total creators
            $creatorsStmt = $this->db->prepare("SELECT COUNT(*) as total_creators FROM users WHERE role = 'creator'");
            $creatorsStmt->execute();
            $creatorsResult = $creatorsStmt->get_result();
            $totalCreators = $creatorsResult->fetch_assoc()['total_creators'];
            
            // Get total published videos
            $videosStmt = $this->db->prepare("SELECT COUNT(*) as total_videos FROM videos WHERE status = 'published'");
            $videosStmt->execute();
            $videosResult = $videosStmt->get_result();
            $totalVideos = $videosResult->fetch_assoc()['total_videos'];
            
            // Get total creator earnings
            $earningsStmt = $this->db->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_earnings
                FROM purchases
                WHERE status = 'completed'
            ");
            $earningsStmt->execute();
            $earningsResult = $earningsStmt->get_result();
            $totalEarnings = $earningsResult->fetch_assoc()['total_earnings'];
            
            return $this->sendSuccess([
                'total_creators' => $totalCreators,
                'total_videos' => $totalVideos,
                'total_earnings' => number_format($totalEarnings, 0)
            ], 'Platform stats retrieved successfully');
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get platform stats: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get viewer stats
     */
    public function getViewerStats($userId) {
        try {
            // Get purchased videos count
            $purchasedStmt = $this->db->prepare("SELECT COUNT(*) as purchased_videos FROM purchases WHERE user_id = ? AND status = 'completed'");
            $purchasedStmt->bind_param("i", $userId);
            $purchasedStmt->execute();
            $purchasedResult = $purchasedStmt->get_result();
            $purchasedVideos = $purchasedResult->fetch_assoc()['purchased_videos'];
            
            // Get total spent
            $spentStmt = $this->db->prepare("SELECT COALESCE(SUM(amount), 0) as total_spent FROM purchases WHERE user_id = ? AND status = 'completed'");
            $spentStmt->bind_param("i", $userId);
            $spentStmt->execute();
            $spentResult = $spentStmt->get_result();
            $totalSpent = $spentResult->fetch_assoc()['total_spent'];
            
            // Get watch time (simulated for now)
            $watchTime = $purchasedVideos * 25; // Assume 25 minutes per video
            
            return $this->sendSuccess([
                'purchased_videos' => $purchasedVideos,
                'total_spent' => number_format($totalSpent, 2),
                'watch_time' => $watchTime,
                'favorite_genre' => 'Technology' // TODO: Calculate from actual data
            ], 'Viewer stats retrieved successfully');
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get viewer stats: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get monthly earnings for creator
     */
    private function getMonthlyEarnings($userId) {
        $stmt = $this->db->prepare("
            SELECT COALESCE(SUM(p.amount), 0) as monthly_earnings
            FROM purchases p
            JOIN videos v ON p.video_id = v.id
            WHERE v.creator_id = ? 
            AND p.status = 'completed'
            AND MONTH(p.created_at) = MONTH(CURRENT_DATE())
            AND YEAR(p.created_at) = YEAR(CURRENT_DATE())
        ");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        return number_format($result->fetch_assoc()['monthly_earnings'], 2);
    }
    
    /**
     * Get earnings chart data for last 6 months
     */
    private function getEarningsChartData($userId) {
        $data = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = date('Y-m', strtotime("-$i months"));
            $stmt = $this->db->prepare("
                SELECT COALESCE(SUM(p.amount), 0) as earnings
                FROM purchases p
                JOIN videos v ON p.video_id = v.id
                WHERE v.creator_id = ? 
                AND p.status = 'completed'
                AND DATE_FORMAT(p.created_at, '%Y-%m') = ?
            ");
            $stmt->bind_param("is", $userId, $month);
            $stmt->execute();
            $result = $stmt->get_result();
            $earnings = $result->fetch_assoc()['earnings'];
            
            $data[] = [
                'month' => date('M Y', strtotime($month)),
                'earnings' => floatval($earnings)
            ];
        }
        return $data;
    }
    
    /**
     * Send success response
     */
    private function sendSuccess($data, $message = 'Success') {
        return [
            'success' => true,
            'message' => $message,
            'data' => $data
        ];
    }
    
    /**
     * Send error response
     */
    private function sendError($message, $code = 400) {
        http_response_code($code);
        return [
            'success' => false,
            'message' => $message
        ];
    }
}