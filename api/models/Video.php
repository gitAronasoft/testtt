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
    public $uploader_id;
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
        $query = "SELECT * FROM " . $this->table_name;
        
        $conditions = [];
        $params = [];

        if (isset($filters['uploader_id']) && !empty($filters['uploader_id'])) {
            $conditions[] = "uploader_id = :uploader_id";
            $params[':uploader_id'] = $filters['uploader_id'];
        }

        if (isset($filters['category']) && !empty($filters['category'])) {
            $conditions[] = "category = :category";
            $params[':category'] = $filters['category'];
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $conditions[] = "(title LIKE :search OR description LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY created_at DESC";

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
            $this->creator_id = $row['creator_id'];
            $this->creator_name = $row['creator_name'];
            $this->price = $row['price'];
            $this->category = $row['category'];
            $this->duration = $row['duration'];
            $this->upload_date = $row['upload_date'];
            $this->views = $row['views'];
            $this->likes = $row['likes'];
            $this->status = $row['status'];
            $this->thumbnail = $row['thumbnail'];
            $this->earnings = $row['earnings'];
            $this->tags = $row['tags'];
            $this->file_size = $row['file_size'];
            $this->quality = $row['quality'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            return true;
        }

        return false;
    }

    // Create video
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET title=:title, description=:description, creator_id=:creator_id, 
                      price=:price, category=:category, duration=:duration, 
                      thumbnail=:thumbnail, tags=:tags, file_size=:file_size, 
                      quality=:quality, status=:status, upload_date=NOW(), 
                      created_at=NOW(), updated_at=NOW()";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->creator_id = htmlspecialchars(strip_tags($this->creator_id));
        $this->price = htmlspecialchars(strip_tags($this->price));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->duration = htmlspecialchars(strip_tags($this->duration));
        $this->thumbnail = htmlspecialchars(strip_tags($this->thumbnail));
        $this->tags = htmlspecialchars(strip_tags($this->tags));
        $this->file_size = htmlspecialchars(strip_tags($this->file_size));
        $this->quality = htmlspecialchars(strip_tags($this->quality));
        $this->status = htmlspecialchars(strip_tags($this->status));

        // Bind values
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":creator_id", $this->creator_id);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":duration", $this->duration);
        $stmt->bindParam(":thumbnail", $this->thumbnail);
        $stmt->bindParam(":tags", $this->tags);
        $stmt->bindParam(":file_size", $this->file_size);
        $stmt->bindParam(":quality", $this->quality);
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
                      category=:category, duration=:duration, thumbnail=:thumbnail, 
                      tags=:tags, file_size=:file_size, quality=:quality, 
                      status=:status, updated_at=NOW() 
                  WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->price = htmlspecialchars(strip_tags($this->price));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->duration = htmlspecialchars(strip_tags($this->duration));
        $this->thumbnail = htmlspecialchars(strip_tags($this->thumbnail));
        $this->tags = htmlspecialchars(strip_tags($this->tags));
        $this->file_size = htmlspecialchars(strip_tags($this->file_size));
        $this->quality = htmlspecialchars(strip_tags($this->quality));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->id = htmlspecialchars(strip_tags($this->id));

        // Bind values
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":duration", $this->duration);
        $stmt->bindParam(":thumbnail", $this->thumbnail);
        $stmt->bindParam(":tags", $this->tags);
        $stmt->bindParam(":file_size", $this->file_size);
        $stmt->bindParam(":quality", $this->quality);
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