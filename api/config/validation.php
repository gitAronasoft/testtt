
<?php
/**
 * Input Validation Helper
 */

class ValidationHelper {
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function validateRequired($value) {
        return !empty(trim($value));
    }
    
    public static function validateNumeric($value) {
        return is_numeric($value);
    }
    
    public static function validatePositiveInteger($value) {
        return is_numeric($value) && intval($value) > 0;
    }
    
    public static function sanitizeString($input) {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
    
    public static function validateVideoTitle($title) {
        $title = trim($title);
        return !empty($title) && strlen($title) <= 255;
    }
    
    public static function validatePrice($price) {
        return is_numeric($price) && floatval($price) >= 0;
    }
}
?>
