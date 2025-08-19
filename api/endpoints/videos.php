<?php
/**
 * Videos API Endpoints for VideoHub
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Video.php';
require_once __DIR__ . '/../middleware/auth.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Initialize video object
$video = new Video($db);

// Initialize authentication middleware
$authMiddleware = new AuthMiddleware($db);

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (isset($path_parts[4]) && is_numeric($path_parts[4])) {
                // Get specific video
                $video->id = $path_parts[4];
                if ($video->readOne()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id' => $video->id,
                            'title' => $video->title,
                            'description' => $video->description,
                            'creator_id' => $video->creator_id,
                            'creator_name' => $video->creator_name,
                            'price' => $video->price,
                            'category' => $video->category,
                            'duration' => $video->duration,
                            'upload_date' => $video->upload_date,
                            'views' => $video->views,
                            'likes' => $video->likes,
                            'status' => $video->status,
                            'thumbnail' => $video->thumbnail,
                            'earnings' => $video->earnings,
                            'tags' => $video->tags,
                            'file_size' => $video->file_size,
                            'quality' => $video->quality
                        ]
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Video not found'
                    ]);
                }
            } else {
                // Get all videos with filters
                $filters = [];
                
                if (isset($_GET['uploader_id'])) {
                    $filters['uploader_id'] = $_GET['uploader_id'];
                }
                
                if (isset($_GET['category'])) {
                    $filters['category'] = $_GET['category'];
                }
                

                
                if (isset($_GET['search'])) {
                    $filters['search'] = $_GET['search'];
                }
                
                if (isset($_GET['limit'])) {
                    $filters['limit'] = (int)$_GET['limit'];
                }
                
                if (isset($_GET['offset'])) {
                    $filters['offset'] = (int)$_GET['offset'];
                }

                $stmt = $video->read($filters);
                $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Format videos data to match existing database structure
                $formattedVideos = [];
                foreach ($videos as $videoData) {
                    $formattedVideos[] = [
                        'id' => (int)$videoData['id'],
                        'title' => $videoData['title'],
                        'description' => $videoData['description'],
                        'creatorId' => (int)($videoData['uploader_id'] ?? 0),
                        'creatorName' => $videoData['creator_name'] ?? $videoData['youtube_channel_title'] ?? 'Unknown Creator',
                        'price' => (float)$videoData['price'],
                        'category' => $videoData['category'],
                        'duration' => '00:00', // Not available in current DB
                        'uploadDate' => date('Y-m-d', strtotime($videoData['created_at'])),
                        'views' => (int)$videoData['views'],
                        'likes' => (int)($videoData['youtube_likes'] ?? 0),
                        'status' => $videoData['status'] ?? 'pending', // Use actual status from database
                        'thumbnail' => $videoData['youtube_thumbnail'] ?? 'https://via.placeholder.com/300x169/4f46e5/ffffff?text=Video',
                        'youtube_id' => $videoData['youtube_id'] ?? '', // Add YouTube ID for video player
                        'earnings' => 0, // Calculate separately if needed
                        'tags' => [], // Not available in current DB structure
                        'fileSize' => 'N/A',
                        'quality' => '720p'
                    ];
                }

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => ['videos' => $formattedVideos]
                ]);
            }
            break;

        case 'POST':
            if (isset($path_parts[3]) && $path_parts[3] === 'view' && isset($path_parts[4])) {
                // Increment view count
                $video->id = $path_parts[4];
                if ($video->incrementViews()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'View count updated'
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Unable to update view count'
                    ]);
                }
            } elseif (isset($path_parts[3]) && $path_parts[3] === 'like' && isset($path_parts[4])) {
                // Increment like count
                $video->id = $path_parts[4];
                if ($video->incrementLikes()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Like count updated'
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Unable to update like count'
                    ]);
                }
            } else {
                // Create new video
                $data = json_decode(file_get_contents("php://input"), true);
                
                if (!empty($data['title']) && !empty($data['uploader_id'])) {
                    $video->title = $data['title'];
                    $video->description = $data['description'] ?? '';
                    $video->user_id = $data['uploader_id'];
                    $video->price = $data['price'] ?? 0;
                    $video->category = $data['category'] ?? '';
                    $video->youtube_id = $data['youtube_id'] ?? ''; // Add YouTube ID field
                    $video->thumbnail = $data['thumbnail'] ?? '';
                    $video->status = $data['status'] ?? 'pending';
                    
                    if ($video->create()) {
                        http_response_code(201);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Video created successfully',
                            'data' => [
                                'id' => $video->id
                            ]
                        ]);
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Unable to create video'
                        ]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Missing required fields: title, creator_id'
                    ]);
                }
            }
            break;

        case 'PUT':
            // Update video - handle both path formats: /api/endpoints/videos.php/123 and /api/endpoints/videos.php?id=123
            $videoId = null;
            
            // Try to get video ID from path
            if (isset($path_parts[4]) && is_numeric($path_parts[4])) {
                $videoId = $path_parts[4];
            } elseif (isset($path_parts[3]) && is_numeric($path_parts[3])) {
                $videoId = $path_parts[3];
            }
            
            // Also check for ID in query parameters or request body
            if (!$videoId) {
                $data = json_decode(file_get_contents("php://input"), true);
                $videoId = $_GET['id'] ?? $data['id'] ?? null;
            }
            
            // Extract video ID from end of path if it's in format /123
            if (!$videoId && preg_match('/\/(\d+)$/', $_SERVER['REQUEST_URI'], $matches)) {
                $videoId = $matches[1];
            }
            
            if ($videoId && is_numeric($videoId)) {
                $data = json_decode(file_get_contents("php://input"), true);
                
                $video->id = $videoId;
                
                // Handle status-only updates (for approve/reject functionality)
                if (isset($data['status']) && !isset($data['title'])) {
                    // Status-only update - just update the status
                    $video->status = $data['status'];
                    
                    if ($video->updateStatus()) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Video status updated successfully',
                            'data' => [
                                'id' => $video->id,
                                'status' => $video->status
                            ]
                        ]);
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Unable to update video status'
                        ]);
                    }
                } elseif (!empty($data['title'])) {
                    // Full video update
                    $video->title = $data['title'];
                    $video->description = $data['description'] ?? '';
                    $video->price = $data['price'] ?? 0;
                    $video->category = $data['category'] ?? '';
                    $video->thumbnail = $data['thumbnail'] ?? '';
                    $video->status = $data['status'] ?? 'published';
                    
                    if ($video->update()) {
                        // Get the video data to check if it has a YouTube ID
                        $video->readOne();
                        $youtubeId = $video->youtube_id ?? null;
                        
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Video updated successfully',
                            'data' => [
                                'id' => $video->id,
                                'youtube_id' => $youtubeId,
                                'title' => $video->title,
                                'description' => $video->description
                            ]
                        ]);
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Unable to update video'
                        ]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Missing required field: title'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Video ID is required'
                ]);
            }
            break;

        case 'DELETE':
            // Delete video
            if (isset($path_parts[1]) && is_numeric($path_parts[1])) {
                $video->id = $path_parts[1];
                
                if ($video->delete()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Video deleted successfully'
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Unable to delete video'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Video ID is required'
                ]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>