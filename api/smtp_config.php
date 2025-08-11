
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

/*
 * SMTP Configuration for Email Functionality
 * 
 * To use this email system, you need to set up environment variables:
 * 
 * For Gmail (recommended for production):
 * 1. Enable 2-factor authentication on your Gmail account
 * 2. Generate an "App Password" for this application
 * 3. Set these environment variables in Replit Secrets:
 *    - SMTP_HOST: smtp.gmail.com
 *    - SMTP_USERNAME: your-gmail@gmail.com
 *    - SMTP_PASSWORD: your-app-password (16 characters)
 *    - SMTP_PORT: 587
 *    - SMTP_FROM_EMAIL: your-gmail@gmail.com
 * 
 * For other providers:
 * - Outlook/Hotmail: smtp-mail.outlook.com, port 587
 * - Yahoo: smtp.mail.yahoo.com, port 587
 * - SendGrid: smtp.sendgrid.net, port 587
 * - Mailgun: smtp.mailgun.org, port 587
 */

// Default SMTP settings (fallback for development)
define('DEFAULT_SMTP_HOST', 'smtp.gmail.com');
define('DEFAULT_SMTP_PORT', 587);
define('DEFAULT_SMTP_USERNAME', 'phpdevgmicro@gmail.com');
define('DEFAULT_SMTP_PASSWORD', 'N2DFZECX67YGBHRO');
define('DEFAULT_SMTP_FROM_EMAIL', 'phpdevgmicro@gmail.com');
define('DEFAULT_SMTP_FROM_NAME', 'Video Platform');

// Additional SMTP settings for better reliability
define('DEFAULT_SMTP_SECURE', 'tls');
define('DEFAULT_SMTP_AUTH', true);
define('DEFAULT_SMTP_TIMEOUT', 30);

// Test SMTP configuration
function testSMTPConnection() {
    $mail = new PHPMailer(true);
    
    try {
        $mail->isSMTP();
        $mail->Host = getenv('SMTP_HOST') ?: DEFAULT_SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = getenv('SMTP_USERNAME') ?: DEFAULT_SMTP_USERNAME;
        $mail->Password = getenv('SMTP_PASSWORD') ?: DEFAULT_SMTP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = getenv('SMTP_PORT') ?: DEFAULT_SMTP_PORT;
        
        // Test connection
        $mail->smtpConnect();
        $mail->smtpClose();
        
        return ['success' => true, 'message' => 'SMTP connection successful'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'SMTP connection failed: ' . $e->getMessage()];
    }
}
?>
