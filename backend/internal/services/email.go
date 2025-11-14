package services

import (
	"fmt"
	"log"
	"os"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

// EmailService handles sending emails
type EmailService struct {
	apiKey     string
	fromEmail  string
	fromName   string
	frontendURL string
}

var Email *EmailService

// InitEmailService initializes the email service
func InitEmailService() {
	Email = &EmailService{
		apiKey:      os.Getenv("SENDGRID_API_KEY"),
		fromEmail:   os.Getenv("FROM_EMAIL"),
		fromName:    os.Getenv("FROM_NAME"),
		frontendURL: os.Getenv("FRONTEND_URL"),
	}

	// Set defaults if not provided
	if Email.fromEmail == "" {
		Email.fromEmail = "noreply@adzzatxperts.com"
	}
	if Email.fromName == "" {
		Email.fromName = "AdzzatXperts"
	}
	if Email.frontendURL == "" {
		Email.frontendURL = "http://localhost:3000"
	}

	// Check if SendGrid API key is configured
	if Email.apiKey == "" {
		log.Println("⚠️  SENDGRID_API_KEY not set - email service disabled (will log to console)")
	} else {
		log.Println("✓ Email service initialized with SendGrid")
	}
}

// SendPasswordResetEmail sends a password reset email
func (e *EmailService) SendPasswordResetEmail(toEmail, toName, resetToken string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", e.frontendURL, resetToken)

	subject := "Reset Your Password - AdzzatXperts"
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%%, #f97316 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%%, #f97316 100%%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi %s,</p>
            <p>We received a request to reset your password for your AdzzatXperts account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
                <a href="%s" class="button">Reset Password</a>
            </div>
            <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                    <li>This link expires in <strong>1 hour</strong></li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                </ul>
            </div>
            <p>Or copy and paste this URL into your browser:</p>
            <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px;">%s</p>
        </div>
        <div class="footer">
            <p>© 2024 AdzzatXperts. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
</body>
</html>
`, toName, resetURL, resetURL)

	plainTextContent := fmt.Sprintf(`
Hi %s,

We received a request to reset your password for your AdzzatXperts account.

Click the link below to reset your password:
%s

IMPORTANT:
- This link expires in 1 hour
- If you didn't request this, please ignore this email
- Never share this link with anyone

© 2024 AdzzatXperts. All rights reserved.
This is an automated email, please do not reply.
`, toName, resetURL)

	return e.sendEmail(toEmail, toName, subject, plainTextContent, htmlContent)
}

// SendWelcomeEmail sends a welcome email to new users
func (e *EmailService) SendWelcomeEmail(toEmail, toName, role string) error {
	subject := "Welcome to AdzzatXperts!"
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%%, #f97316 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%%, #f97316 100%%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to AdzzatXperts!</h1>
        </div>
        <div class="content">
            <p>Hi %s,</p>
            <p>Thank you for joining AdzzatXperts as a <strong>%s</strong>!</p>
            <p>You can now log in to your account and start using our platform.</p>
            <div style="text-align: center;">
                <a href="%s" class="button">Go to Dashboard</a>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, role, e.frontendURL)

	plainTextContent := fmt.Sprintf(`
Hi %s,

Thank you for joining AdzzatXperts as a %s!

You can now log in to your account and start using our platform.

Visit: %s

© 2024 AdzzatXperts. All rights reserved.
`, toName, role, e.frontendURL)

	return e.sendEmail(toEmail, toName, subject, plainTextContent, htmlContent)
}

// sendEmail is the core email sending function
func (e *EmailService) sendEmail(toEmail, toName, subject, plainTextContent, htmlContent string) error {
	// If no API key, log to console (development mode)
	if e.apiKey == "" {
		log.Printf("📧 [EMAIL - DEV MODE] To: %s <%s>\nSubject: %s\n%s\n", toName, toEmail, subject, plainTextContent)
		return nil
	}

	from := mail.NewEmail(e.fromName, e.fromEmail)
	to := mail.NewEmail(toName, toEmail)
	message := mail.NewSingleEmail(from, subject, to, plainTextContent, htmlContent)

	client := sendgrid.NewSendClient(e.apiKey)
	response, err := client.Send(message)
	if err != nil {
		log.Printf("Error sending email to %s: %v", toEmail, err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	if response.StatusCode >= 400 {
		log.Printf("SendGrid error (status %d): %s", response.StatusCode, response.Body)
		return fmt.Errorf("sendgrid returned status %d", response.StatusCode)
	}

	log.Printf("✓ Email sent successfully to %s (status: %d)", toEmail, response.StatusCode)
	return nil
}
