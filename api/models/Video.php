<?php
/**
 * Video Model for VideoHub
 */

class Video {
    private $conn;
    private $table_name = "videos";

    public $id;
    public $title;
    public $description;
    public $user_id;
    public $uploader_name;
    public $price;
    public $category;
    public $file_path;
    public $youtube_id;
    public $youtube_thumbnail;
    public $is_youtube_synced;
    public $youtube_channel_id;
    public $youtube_channel_title;
    public $youtube_views;
    public $youtube_likes;
    public $youtube_comments;
    public $views;
    public $likes;
    public $status;
    public $thumbnail;
    public $earnings;
    public $tags;
    public $file_size;
    public $quality;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get all videos with optional filters
    public function read($filters = []) {
        $query = "SELECT v.*, u.name as creator_name FROM " . $this->table_name . " v 
                  LEFT JOIN users u ON v.user_id = u.id";
        
        $conditions = [];
        $params = [];

        if (isset($filters['uploader_id']) && !empty($filters['uploader_id'])) {
            $conditions[] = "v.user_id = :uploader_id";
            $params[':uploader_id'] = $filters['uploader_id'];
        }

        if (isset($filters['category']) && !empty($filters['category'])) {
            $conditions[] = "v.category = :category";
            $params[':category'] = $filters['category'];
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $conditions[] = "(v.title LIKE :search OR v.description LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY v.created_at DESC";

        // Add pagination
        if (isset($filters['limit'])) {
            $offset = isset($filters['offset']) ? $filters['offset'] : 0;
            $query .= " LIMIT :offset, :limit";
            $params[':offset'] = $offset;
            $params[':limit'] = $filters['limit'];
        }

        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        
        $stmt->execute();
        return $stmt;
    }

    // Get single video by ID
    public function readOne() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 0,1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->title = $row['title'];
            $this->description = $row['description'];
            $this->creator_id = $row['user_id'];
            $this->price = $row['price'];
            $this->category = $row['category'];
            $this->upload_date = $row['created_at'] ?? null;
            $this->views = $row['views'];
            $this->likes = $row['youtube_likes'] ?? null;
            $this->status = $row['status'];
            $this->thumbnail = $row['thumbnail'];
            $this->earnings = null; // Not stored in this table
            $this->tags = null; // Not stored in this table
            $this->file_size = null; // Not stored in this table
            $this->quality = null; // Not stored in this table
            $this->created_at = $row['created_at'];
            $this->updated_at = null; // Not stored in this table
            $this->youtube_id = $row['youtube_id'] ?? null;
            return true;
        }

        return false;
    }

    // Create video (fixed to match actual database schema)
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET title=:title, description=:description, user_id=:user_id, 
                      price=:price, category=:category, youtube_id=:youtube_id,
                      thumbnail=:thumbnail, status=:status,
                      created_at=NOW()";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->price = htmlspecialchars(strip_tags($this->price));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->youtube_id = htmlspecialchars(strip_tags($this->youtube_id ?? ''));
        $this->thumbnail = htmlspecialchars(strip_tags($this->thumbnail ?? ''));
        $this->status = htmlspecialchars(strip_tags($this->status));

        // Bind values
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":youtube_id", $this->youtube_id);
        $stmt->bindParam(":thumbnail", $this->thumbnail);
        $stmt->bindParam(":status", $this->status);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    // Update video
    public function update() {
        $query = "UPDATE " . $this->table_name . " 
                  SET title=:title, description=:description, price=:price, 
                      category=:category, thumbnail=:thumbnail, status=:status
                  WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        // Sanitize - only sanitize non-null values
        $this->title = htmlspecialchars(strip_tags($this->title ?? ''));
        $this->description = htmlspecialchars(strip_tags($this->description ?? ''));
        $this->price = htmlspecialchars(strip_tags($this->price ?? ''));
        $this->category = htmlspecialchars(strip_tags($this->category ?? ''));
        $this->thumbnail = htmlspecialchars(strip_tags($this->thumbnail ?? ''));
        $this->status = htmlspecialchars(strip_tags($this->status ?? ''));
        $this->id = htmlspecialchars(strip_tags($this->id ?? ''));

        // Bind values
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":thumbnail", $this->thumbnail);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":id", $this->id);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Update video status only
    public function updateStatus() {
        $query = "UPDATE " . $this->table_name . " SET status = :status WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        // Clean data
        $this->status = htmlspecialchars(strip_tags($this->status ?? ''));
        $this->id = htmlspecialchars(strip_tags($this->id ?? ''));

        // Bind values
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":id", $this->id);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Delete video
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Get all videos with optional filters (alias for read method)
    public function readAll($filters = []) {
        $stmt = $this->read($filters);
        $videos = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $videos[] = $row;
        }
        
        return $videos;
    }
    
    // Get creator statistics
    public function getCreatorStats($creatorId = null) {
        if (!$creatorId) {
            $creatorId = 1; // Default creator for demo
        }
        
        $query = "SELECT 
                    COUNT(*) as totalVideos,
                    COALESCE(SUM(views), 0) as totalViews,
                    COALESCE(SUM(youtube_likes), 0) as totalLikes,
                    COALESCE(SUM(CAST(price AS DECIMAL(10,2))), 0) as totalEarnings
                  FROM " . $this->table_name . " 
                  WHERE user_id = :creator_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $creatorId);
        $stmt->execute();
        
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'totalVideos' => (int)$stats['totalVideos'],
            'totalViews' => (int)$stats['totalViews'],
            'totalLikes' => (int)$stats['totalLikes'],
            'totalEarnings' => (float)$stats['totalEarnings']
        ];
    }
    
    // Get creator earnings from purchases table
    public function getCreatorEarnings($creatorId = null) {
        if (!$creatorId) {
            $creatorId = 1; // Default creator for demo
        }
        
        $query = "SELECT 
                    p.id,
                    v.title as videoTitle,
                    CAST(p.amount AS DECIMAL(10,2)) as amount,
                    p.purchase_date as date,
                    COALESCE(p.status, 'completed') as status,
                    u.name as viewerName
                  FROM purchases p
                  JOIN videos v ON p.video_id = v.id
                  LEFT JOIN users u ON p.user_id_new = u.id
                  WHERE v.user_id = :creator_id
                  ORDER BY p.purchase_date DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':creator_id', $creatorId);
        $stmt->execute();
        
        $earnings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $earnings[] = [
                'id' => $row['id'],
                'creatorId' => $creatorId,
                'amount' => (float)$row['amount'],
                'date' => $row['date'],
                'videoTitle' => $row['videoTitle'],
                'viewerName' => $row['viewerName'] ?? 'Anonymous',
                'status' => $row['status']
            ];
        }
        
        return $earnings;
    }

    // Update views count
    public function incrementViews() {
        $query = "UPDATE " . $this->table_name . " SET views = views + 1 WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        return $stmt->execute();
    }

    // Update likes count
    public function incrementLikes() {
        $query = "UPDATE " . $this->table_name . " SET likes = likes + 1 WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        return $stmt->execute();
    }
}
?>