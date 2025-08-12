<?php
/**
 * Email Service for VideoHub
 * Handles email sending functionality using SMTP
 */

require_once __DIR__ . '/../config/email.php';

class EmailService {
    private $smtp_host;
    private $smtp_port;
    private $smtp_username;
    private $smtp_password;
    private $smtp_from_email;
    private $smtp_from_name;
    private $smtp_encryption;
    
    public function __construct() {
        $this->smtp_host = SMTP_HOST;
        $this->smtp_port = SMTP_PORT;
        $this->smtp_username = SMTP_USERNAME;
        $this->smtp_password = SMTP_PASSWORD;
        $this->smtp_from_email = SMTP_FROM_EMAIL;
        $this->smtp_from_name = SMTP_FROM_NAME;
        $this->smtp_encryption = SMTP_ENCRYPTION;
    }
    
    /**
     * Send email verification
     */
    public function sendVerificationEmail($email, $name, $token) {
        $subject = VERIFICATION_EMAIL_SUBJECT;
        $verificationUrl = APP_URL . "/auth/email-verification.html?token=" . $token . "&email=" . urlencode($email);
        
        $body = $this->getVerificationEmailTemplate($name, $verificationUrl);
        
        return $this->sendEmailSMTP($email, $name, $subject, $body);
    }
    
    /**
     * Send password reset email
     */
    public function sendPasswordResetEmail($email, $name, $token) {
        $subject = PASSWORD_RESET_EMAIL_SUBJECT;
        $resetUrl = APP_URL . "/auth/set-password.html?token=" . $token . "&email=" . urlencode($email);
        
        $body = $this->getPasswordResetEmailTemplate($name, $resetUrl);
        
        return $this->sendEmail($email, $name, $subject, $body);
    }
    
    /**
     * Send email using SMTP
     */
    private function sendEmail($to_email, $to_name, $subject, $body) {
        try {
            // Email headers
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=UTF-8',
                'From: ' . $this->smtp_from_name . ' <' . $this->smtp_from_email . '>',
                'Reply-To: ' . $this->smtp_from_email,
                'X-Mailer: PHP/' . phpversion()
            ];
            
            // Use PHPMailer-like functionality with built-in mail function
            // For production, consider using PHPMailer library
            $success = mail(
                $to_email,
                $subject,
                $body,
                implode("\r\n", $headers)
            );
            
            if ($success) {
                error_log("Email sent successfully to: " . $to_email);
                return true;
            } else {
                error_log("Failed to send email to: " . $to_email);
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Email sending error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send email using SMTP with socket connection
     */
    public function sendEmailSMTP($to_email, $to_name, $subject, $body) {
        try {
            // Create socket connection
            $errno = 0;
            $errstr = '';
            $socket = fsockopen($this->smtp_host, $this->smtp_port, $errno, $errstr, 30);
            if (!$socket) {
                throw new Exception("Could not connect to SMTP server: $errstr ($errno)");
            }
            
            // Read initial response
            $this->readSMTPResponse($socket);
            
            // EHLO command
            fwrite($socket, "EHLO " . gethostname() . "\r\n");
            $this->readSMTPResponse($socket);
            
            // STARTTLS if using TLS
            if ($this->smtp_encryption === 'tls') {
                fwrite($socket, "STARTTLS\r\n");
                $this->readSMTPResponse($socket);
                
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new Exception("Failed to enable TLS encryption");
                }
                
                // Send EHLO again after TLS
                fwrite($socket, "EHLO " . gethostname() . "\r\n");
                $this->readSMTPResponse($socket);
            }
            
            // Authentication
            fwrite($socket, "AUTH LOGIN\r\n");
            $this->readSMTPResponse($socket);
            
            fwrite($socket, base64_encode($this->smtp_username) . "\r\n");
            $this->readSMTPResponse($socket);
            
            fwrite($socket, base64_encode($this->smtp_password) . "\r\n");
            $this->readSMTPResponse($socket);
            
            // MAIL FROM
            fwrite($socket, "MAIL FROM: <" . $this->smtp_from_email . ">\r\n");
            $this->readSMTPResponse($socket);
            
            // RCPT TO
            fwrite($socket, "RCPT TO: <" . $to_email . ">\r\n");
            $this->readSMTPResponse($socket);
            
            // DATA
            fwrite($socket, "DATA\r\n");
            $this->readSMTPResponse($socket);
            
            // Email content
            $email_content = "From: " . $this->smtp_from_name . " <" . $this->smtp_from_email . ">\r\n";
            $email_content .= "To: " . $to_name . " <" . $to_email . ">\r\n";
            $email_content .= "Subject: " . $subject . "\r\n";
            $email_content .= "MIME-Version: 1.0\r\n";
            $email_content .= "Content-Type: text/html; charset=UTF-8\r\n";
            $email_content .= "\r\n";
            $email_content .= $body . "\r\n";
            $email_content .= ".\r\n";
            
            fwrite($socket, $email_content);
            $this->readSMTPResponse($socket);
            
            // QUIT
            fwrite($socket, "QUIT\r\n");
            $this->readSMTPResponse($socket);
            
            fclose($socket);
            
            error_log("Email sent successfully via SMTP to: " . $to_email);
            return true;
            
        } catch (Exception $e) {
            error_log("SMTP Email sending error: " . $e->getMessage());
            if (isset($socket) && is_resource($socket)) {
                fclose($socket);
            }
            return false;
        }
    }
    
    /**
     * Read SMTP response
     */
    private function readSMTPResponse($socket) {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') {
                break;
            }
        }
        
        $code = intval(substr($response, 0, 3));
        if ($code >= 400) {
            throw new Exception("SMTP Error: " . $response);
        }
        
        return $response;
    }
    
    /**
     * Get verification email template
     */
    private function getVerificationEmailTemplate($name, $verificationUrl) {
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - VideoHub</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f8f9fa; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>VideoHub</h1>
            <p>Email Verification Required</p>
        </div>
        <div class="content">
            <h2>Hello ' . htmlspecialchars($name) . ',</h2>
            <p>Thank you for registering with VideoHub! To complete your registration, please verify your email address by clicking the button below:</p>
            
            <p style="text-align: center;">
                <a href="' . htmlspecialchars($verificationUrl) . '" class="button">Verify Email Address</a>
            </p>
            
            <p>If the button above doesn\'t work, you can copy and paste the following URL into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
                ' . htmlspecialchars($verificationUrl) . '
            </p>
            
            <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn\'t create an account with VideoHub, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 VideoHub. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
</body>
</html>';
    }
    
    /**
     * Get password reset email template
     */
    private function getPasswordResetEmailTemplate($name, $resetUrl) {
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - VideoHub</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f8f9fa; }
        .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>VideoHub</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <h2>Hello ' . htmlspecialchars($name) . ',</h2>
            <p>We received a request to reset your password for your VideoHub account. Click the button below to set a new password:</p>
            
            <p style="text-align: center;">
                <a href="' . htmlspecialchars($resetUrl) . '" class="button">Reset Password</a>
            </p>
            
            <p>If the button above doesn\'t work, you can copy and paste the following URL into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
                ' . htmlspecialchars($resetUrl) . '
            </p>
            
            <p><strong>Important:</strong> This reset link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn\'t request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 VideoHub. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
</body>
</html>';
    }
}
?>