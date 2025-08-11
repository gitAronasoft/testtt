<?php
/**
 * Video Controller for VideoShare Platform
 */

require_once __DIR__ . '/../config/database.php';

class VideoController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get all videos
     */
    public function getVideos($page = 1, $limit = 12, $creatorId = null) {
        try {
            
            $offset = ($page - 1) * $limit;
            
            $whereClause = "WHERE v.status = 'published'";
            $params = "";
            $types = "";
            
            if ($creatorId) {
                $whereClause .= " AND v.creator_id = ?";
                $params = $creatorId;
                $types = "i";
            }
            
            $sql = "SELECT v.*, u.name as creator_name 
                    FROM videos v 
                    JOIN users u ON v.creator_id = u.id 
                    $whereClause 
                    ORDER BY v.created_at DESC 
                    LIMIT ? OFFSET ?";
            
            $stmt = $this->db->prepare($sql);
            
            if ($creatorId) {
                $stmt->bind_param($types . "ii", $params, $limit, $offset);
            } else {
                $stmt->bind_param("ii", $limit, $offset);
            }
            
            if (!$stmt->execute()) {
                error_log("Video query execution failed: " . $this->db->getConnection()->error);
                return $this->sendError('Database query failed', 500);
            }
            
            $result = $stmt->get_result();
            if (!$result) {
                error_log("Video query result failed: " . $this->db->getConnection()->error);
                return $this->sendError('Database result failed', 500);
            }
            
            $videos = [];
            while ($row = $result->fetch_assoc()) {
                $videos[] = $row;
            }
            
            error_log("Videos found: " . count($videos));
            error_log("Query executed: " . $sql);
            error_log("Where clause: " . $whereClause);
            
            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM videos v $whereClause";
            if ($creatorId) {
                $countStmt = $this->db->prepare($countSql);
                $countStmt->bind_param("i", $creatorId);
                $countStmt->execute();
                $countResult = $countStmt->get_result();
            } else {
                $countResult = $this->db->query($countSql);
            }
            
            $total = $countResult->fetch_assoc()['total'];
            
            return $this->sendSuccess([
                'videos' => $videos,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get videos: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get single video
     */
    public function getVideo($id) {
        try {
            $stmt = $this->db->prepare("SELECT v.*, u.name as creator_name 
                                       FROM videos v 
                                       JOIN users u ON v.creator_id = u.id 
                                       WHERE v.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return $this->sendError('Video not found', 404);
            }
            
            $video = $result->fetch_assoc();
            
            return $this->sendSuccess(['video' => $video]);
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get video: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Create new video
     */
    public function createVideo($title, $description, $price, $creatorId) {
        try {
            // Validate input
            if (empty($title) || empty($price) || empty($creatorId)) {
                return $this->sendError('Title, price and creator ID are required', 400);
            }
            
            $status = 'published';
            $stmt = $this->db->prepare("INSERT INTO videos (title, description, price, creator_id, status) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssdis", $title, $description, $price, $creatorId, $status);
            
            if ($stmt->execute()) {
                $videoId = $this->db->lastInsertId();
                
                return $this->sendSuccess([
                    'video' => [
                        'id' => $videoId,
                        'title' => $title,
                        'description' => $description,
                        'price' => $price,
                        'creator_id' => $creatorId
                    ]
                ], 'Video created successfully');
            } else {
                return $this->sendError('Failed to create video', 500);
            }
            
        } catch (Exception $e) {
            return $this->sendError('Failed to create video: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update video
     */
    public function updateVideo($id, $title, $description, $price, $creatorId) {
        try {
            // Check if video exists and belongs to creator
            $stmt = $this->db->prepare("SELECT id FROM videos WHERE id = ? AND creator_id = ?");
            $stmt->bind_param("ii", $id, $creatorId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return $this->sendError('Video not found or access denied', 404);
            }
            
            $updateStmt = $this->db->prepare("UPDATE videos SET title = ?, description = ?, price = ? WHERE id = ?");
            $updateStmt->bind_param("ssdi", $title, $description, $price, $id);
            
            if ($updateStmt->execute()) {
                return $this->sendSuccess([], 'Video updated successfully');
            } else {
                return $this->sendError('Failed to update video', 500);
            }
            
        } catch (Exception $e) {
            return $this->sendError('Failed to update video: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete video
     */
    public function deleteVideo($id, $creatorId) {
        try {
            $stmt = $this->db->prepare("DELETE FROM videos WHERE id = ? AND creator_id = ?");
            $stmt->bind_param("ii", $id, $creatorId);
            
            if ($stmt->execute() && $stmt->affected_rows > 0) {
                return $this->sendSuccess([], 'Video deleted successfully');
            } else {
                return $this->sendError('Video not found or access denied', 404);
            }
            
        } catch (Exception $e) {
            return $this->sendError('Failed to delete video: ' . $e->getMessage(), 500);
        }
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
        return [
            'success' => false,
            'error' => $message,
            'code' => $code
        ];
    }
}
?>